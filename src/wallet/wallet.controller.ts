import { Controller, UseGuards, Get, Query, Body, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiImplicitQuery,
  ApiOperation,
  ApiResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { UsersDTO } from '../users/users.model';
import {
  CaptureMethodRazorPay,
  CommonResponseModel,
  PaymentStatusType,
  PaymentType,
  ResponseBadRequestMessage,
  ResponseErrorMessage,
  ResponseMessage,
  ResponseSuccessMessage,
  UserQuery,
  USER_PLATFORM,
} from '../utils/app.model';
import { WalletService } from './wallet.service';
import {
  ResponseWalletHistory,
  ResponseWalletTopupData,
  WalletAmount,
  WalletLoyaltyDTO,
  WalletSaveDTO,
  WalletStatus,
  WalletTopupDTO,
  WalletTransactionType,
  WalletUpdateDTO,
} from './wallet.model';
import { UtilService } from '../utils/util.service';
import { GetUser } from '../utils/jwt.strategy';
import { PAYMENT_TYPE } from '../order/order.model';
import { SettingService } from '../settings/settings.service';
import { StripeService } from '../utils/stripe.service';
import { UserService } from '../users/users.service';
import { RazorPayService } from '../utils/razorpay.service';
import { LoyaltyType } from '../loyalty/loyalty.model';
import { LoyaltyService } from '../loyalty/loyalty.service';
@Controller('wallets')
@ApiUseTags('Wallets')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private utilService: UtilService,
    private settingService: SettingService,
    private stripeService: StripeService,
    private userService: UserService,
    private razorpayService: RazorPayService,
    private loyaltyService: LoyaltyService,
  ) {}

  @Get('/history')
  @ApiImplicitQuery({
    name: 'page',
    description: 'page',
    required: false,
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'limit',
    description: 'limit',
    required: false,
    type: Number,
  })
  @ApiOperation({ title: 'Get wallet transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Return list wallet transaction',
    type: ResponseWalletHistory,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async walletHistory(
    @GetUser() user: UsersDTO,
    @Query() userQuery: UserQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      if (userQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      const pagination = this.utilService.getUserPagination(userQuery);
      const wallets = await Promise.all([
        this.walletService.walletHistory(
          user._id,
          pagination.page,
          pagination.limit,
        ),
        this.walletService.countWalletHistory(user._id),
      ]);

      return this.utilService.successResponseData(wallets[0], {
        total: wallets[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Post('/get/razorpay/id')
  @ApiOperation({ title: 'Get Razor Pay Id to initiate payment' })
  @ApiOperation({ title: 'Add money to wallet' })
  @ApiResponse({
    status: 200,
    description: 'Return sessionId',
    type: ResponseWalletTopupData,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async generateRazorPayId(
    @GetUser() user: UsersDTO,
    @Body() body: WalletAmount,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      const settings = await this.settingService.getDeliveryTaxSettings();
      const amount = Math.round(
        Number(Number(Number(body.amount).toFixed(2)) * 100),
      );

      const razorpayInitiate = await this.razorpayService.createOrderPayment({
        amount,
        currency: settings.currencyCode || 'INR',
        payment_capture: CaptureMethodRazorPay.AUTOMATIC,
      });

      const walletData: WalletSaveDTO = {
        userId: user._id,
        amount: Number(amount / 100),
        isCredited: false,
        paymentType: PaymentType.RAZORPAY,
        razorPayDetails: {
          payment_id: razorpayInitiate.id,
          paymentStatus: PaymentStatusType.PENDING,
        },
        walletStatus: WalletStatus.PENDING,
      };

      const createDoc = await this.walletService.topUpWallet(walletData);
      if (!createDoc)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      return this.utilService.successResponseData({
        generatedId: razorpayInitiate.id,
        walletId: createDoc._id,
      });
    } catch (e) {
      if (e && e.error) this.utilService.badRequest(e.error.description);
      this.utilService.errorResponse(e);
    }
  }

  @Post('/add/money')
  @ApiOperation({ title: 'Add money to wallet' })
  @ApiResponse({
    status: 200,
    description: 'Return sessionId',
    type: ResponseWalletTopupData,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async addMoneyToWallet(
    @GetUser() user: UsersDTO,
    @Body() walletData: WalletTopupDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      const settings = await this.settingService.getDeliveryTaxSettings();
      const amount = Math.round(
        Number(Number(Number(walletData.amount).toFixed(2)) * 100),
      );

      if (walletData.paymentType === PaymentType.STRIPE) {
        if (walletData.userFrom === USER_PLATFORM.WEB_APP) {
          const obj = {
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: settings.currencyCode || 'INR',
                  product_data: {
                    name: 'Wallet TopUp',
                  },
                  unit_amount: amount,
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            client_reference_id: user._id.toString(),
            metadata: {
              PAYMENT_TYPE: PAYMENT_TYPE.WALLET,
              USER_PLATFORM: USER_PLATFORM.WEB_APP,
            },
            success_url:
              process.env.NODE_ENV === 'production'
                ? process.env.WEB_URL_PRODUCTION + '/wallet-payment-successful'
                : process.env.WEB_URL_STAGING + '/wallet-payment-successful',
            cancel_url:
              process.env.NODE_ENV === 'production'
                ? process.env.WEB_URL_PRODUCTION + '/home'
                : process.env.WEB_URL_STAGING + '/home',
          };
          const session = await this.stripeService.createCheckoutSession(obj);
          if (!session.id)
            this.utilService.badRequest(ResponseMessage.ORDER_PAYMENT_ERROR);

          return this.utilService.successResponseData({
            userId: user._id,
            sessionId: session.id,
          });
        }

        if (walletData.userFrom === USER_PLATFORM.USER_APP) {
          const object = {
            amount: amount,
            currency: settings.currencyCode || 'INR',
            description: 'Wallet TopUp',
            metadata: {
              PAYMENT_TYPE: PAYMENT_TYPE.WALLET,
              userId: user._id.toString(),
              USER_PLATFORM: USER_PLATFORM.USER_APP,
            },
            shipping: {
              name: user.firstName + ' ' + user.lastName,
              address: {
                line1: '510 Townsend St',
                postal_code: '98140',
                city: 'San Francisco',
                state: 'CA',
                country: 'US',
              },
            },
          };
          const paymentIntent = await this.stripeService.createPaymentIntents(
            object,
          );
          if (!paymentIntent.id)
            this.utilService.badRequest(ResponseMessage.ORDER_PAYMENT_ERROR);

          return this.utilService.successResponseData({
            userId: user._id.toString(),
            client_secret: paymentIntent.client_secret,
          });
        }
      }

      if (walletData.paymentType === PaymentType.RAZORPAY) {
        if (
          !walletData.generatedId ||
          !walletData.paymentId ||
          !walletData.signature
        )
          this.utilService.badRequest(ResponseMessage.INSUFFICIENT_DATA);

        const walletDoc = await this.walletService.getWalletData(
          user._id,
          walletData.walletId,
        );
        if (!walletDoc || !walletDoc.razorPayDetails.payment_id)
          this.utilService.badRequest(ResponseMessage.ID_NOT_FOUND);
        if (walletDoc.amount !== walletData.amount)
          this.utilService.badRequest(ResponseMessage.INVALID_AMOUNT);

        const signature = await this.razorpayService.verifyPaymentSignature(
          walletDoc.razorPayDetails.payment_id,
          walletData.paymentId,
        );
        if (signature !== walletData.signature)
          this.utilService.badRequest(ResponseMessage.INVALID_SIGNATURE);

        const payment = await this.razorpayService.getPaymentDetail(
          walletData.paymentId,
        );
        if (!payment)
          this.utilService.badRequest(
            ResponseMessage.PAYMENT_DETAILS_NOT_FOUND,
          );

        const data: WalletSaveDTO = {
          userId: user._id,
          amount: Number(payment.amount / 100),
          isCredited: true,
          razorPayDetails: {
            payment_id: payment.order_id,
            transactionStatus: payment.status,
            transactionId: payment.id,
            currency: payment.currency,
            paymentStatus: PaymentStatusType.SUCCESS,
            transactionDate: new Date().toISOString(),
            transactionAmount: Number(payment.amount / 100),
          },
          walletStatus: WalletStatus.SUCCESS,
        };

        const update = await Promise.all([
          this.walletService.updateWallet(walletData.walletId, data),
          this.userService.updateWallet(user._id, Number(payment.amount / 100)),
        ]);

        if (!update.length)
          this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

        return this.utilService.successResponseMsg(
          ResponseMessage.WALLET_TOP_UP_SUCCESS,
        );
      }
    } catch (e) {
      if (e && e.error) this.utilService.badRequest(e.error.description);
      this.utilService.errorResponse(e);
    }
  }

  @Post('/update/user-wallet/by-admin')
  @ApiOperation({ title: 'Update USER wallet by ADMIN' })
  @ApiResponse({
    status: 200,
    description: 'Success Message Response',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request message',
    type: ResponseBadRequestMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async updateUserWalletByAdmin(
    @GetUser() user: UsersDTO,
    @Body() updateData: WalletUpdateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);

    try {
      const walletData = await this.userService.getUserWalletAmount(
        updateData.userId,
      );

      if (!user) this.utilService.badRequest(ResponseMessage.USER_NOT_FOUND);
      if (
        updateData.isCredited === false &&
        walletData.walletAmount < updateData.amount
      )
        this.utilService.badRequest(ResponseMessage.WALLET_INSUFFICIENT_AMOUNT);

      const amount =
        updateData.isCredited === true ? updateData.amount : -updateData.amount;

      const wallet: WalletSaveDTO = {
        userId: updateData.userId,
        amount: updateData.amount,
        transactionType:
          updateData.isCredited === true
            ? WalletTransactionType.WALLET_TOPUP
            : WalletTransactionType.WALLET_DEBIT,
        isCredited: updateData.isCredited,
      };

      await Promise.all([
        this.walletService.topUpWallet(wallet),
        this.userService.updateWallet(updateData.userId, amount),
      ]);

      return this.utilService.successResponseMsg(
        ResponseMessage.WALLET_TOP_UP_SUCCESS,
      );
    } catch (error) {
      this.utilService.errorResponse(error);
    }
  }
  @Post('/top-up/by-loyalty')
  @ApiOperation({ title: 'Add loyalty points to wallet' })
  @ApiResponse({
    status: 200,
    description: 'Return sessionId',
    type: ResponseWalletTopupData,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async addLoyaltytoWallet(
    @GetUser() user: UsersDTO,
    @Body() walletData: WalletLoyaltyDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      const promise = await Promise.all([
        this.userService.getLoyalty(user._id),
        this.settingService.getLoyaltyPointMonetaryValue(),
      ]);
      const loyalty = promise[0];
      const setting = promise[1];
      let walletEqvAmount;
      if (walletData.loyaltyPoint != null && walletData.loyaltyPoint > 0) {
        if (loyalty.totalLoyaltyPoints >= walletData.loyaltyPoint) {
          walletEqvAmount = Number(
            (
              walletData.loyaltyPoint / setting.loyaltyPointMonetaryValue
            ).toFixed(2),
          );

          const loyaltyWalletData = {
            userId: user._id,
            transactionType: WalletTransactionType.WALLET_TOPUP_BY_LOYALTY,
            description: 'Loyalty to wallet',
            amount: walletEqvAmount,
            isCredited: true,
          };
          const loyaltyData = {
            userId: user._id,
            point: walletData.loyaltyPoint,
            description: 'Loyalty to wallet',
            loyaltyType: LoyaltyType.LOYALTY_TO_WALLET_TOPUP,
            isCredited: false,
          };

          await Promise.all([
            this.userService.updateWallet(user._id, walletEqvAmount),
            this.userService.updateLoyalty(user._id, -walletData.loyaltyPoint),
            this.walletService.createWallet(loyaltyWalletData),
            this.loyaltyService.createLoyalty(loyaltyData),
          ]);

          return this.utilService.successResponseMsg(
            ResponseMessage.WALLET_TOP_UP,
          );
        } else {
          this.utilService.badRequest(
            ResponseMessage.INSUFFICIENT_LOYALTY_POINTS,
          );
        }
      } else {
        this.utilService.badRequest(
          ResponseMessage.INSUFFICIENT_LOYALTY_POINTS,
        );
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
}
