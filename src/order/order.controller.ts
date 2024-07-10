import {
  Body,
  Controller,
  Query,
  Get,
  Param,
  Post,
  UseGuards,
  Put,
  Res,
  Req,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiUseTags,
  ApiResponse,
  ApiOperation,
  ApiImplicitQuery,
} from '@nestjs/swagger';
import { UsersDTO } from '../users/users.model';
import {
  OrderPosPaymentUpdateDTO,
  OrderAddItemDTO,
  OrderUpdateDTO,
  OrderPosDTO,
  OrderStatusDTO,
  AssignOrderDTO,
  OrderStatusType,
  OrderFilterQuery,
  OrderCreateDTO,
  DBStatusUpdateDTO,
  ResponseOrderDTOPagination,
  ResponseDataOfOrder,
  ResponseOrderAdminListDTO,
  ResponseOrderForAdmin,
  ResponseOrderDetailsOrderId,
  ResponseStatusList,
  ResponseChardOrderDTO,
  ResponseDeiveryBoyPagination,
  ResponseDeliveredOrderPagination,
  PaymentStatusType,
  ResponseAdminOrderDetailsOrderId,
  OrderStartEndDTO,
  ResponseSalesTable,
  OrderGraphsDTO,
  TransactionStatusType,
  PAYMENT_TYPE,
  ExportFilter,
} from './order.model';
import {
  ResponseMessage,
  AdminSettings,
  CommonResponseModel,
  ResponseErrorMessage,
  ResponseBadRequestMessage,
  ResponseSuccessMessage,
  UserQuery,
  USER_PLATFORM,
  CaptureMethodRazorPay,
  PaymentType,
} from '../utils/app.model';
import { UtilService } from '../utils/util.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletSaveDTO, WalletTransactionType } from '../wallet/wallet.model';
import { AppGateway } from '../app.gateway';
import { ProductService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { AddressService } from '../address/address.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DeliveryAssociatesNotification,
  notificationEvents,
  UserNotification,
  DeliveryAssociatessNotification,
} from '../utils/event';
import { SettingService } from '../settings/settings.service';
import { SequenceService } from '../sequence/sequence.service';
import { UserService } from '../users/users.service';
import { ShippingMethod } from '../settings/settings.model';
import {
  INotificationDeliveryBoy,
  INotificationUser,
  NotificationSaveDTO,
  NotificationssSaveDTO,
  INotificationsDeliveryBoy,
  NotificationType,
} from '../notifications/notifications.model';
import { NotificationService } from '../notifications/notifications.service';
import { PushService } from '../utils/push.service';
import { StripeService } from '../utils/stripe.service';
import { CategoryService } from '../categories/categories.service';
import { GetUser } from '../utils/jwt.strategy';
import { EmailService } from '../utils/email.service';
import { BusinessService } from '../business/business.service';
import { ProductOutOfStockService } from '../product-out-of-stock/product-out-of-stock.service';
import { DeliveryBoyRatingsService } from '../delivery-boy-ratings/delivery-boy-ratings.service';
import { CouponService } from '../coupons/coupons.service';
import { CouponType } from '../coupons/coupons.model';
import { ExcelService } from '../utils/excel.service';
import { RazorPayService } from '../utils/razorpay.service';
import { DealService } from '../deals/deals.service';

const moment = require('moment');
const ObjectID = require('mongodb').ObjectID;

@Controller('orders')
@ApiUseTags('Orders')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private utilService: UtilService,
    private cartService: CartService,
    private walletService: WalletService,
    private addressService: AddressService,
    private settingService: SettingService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private sequenceService: SequenceService,
    private userService: UserService,
    private notificationService: NotificationService,
    private pushService: PushService,
    private stripeService: StripeService,
    private emailService: EmailService,
    private socketService: AppGateway,
    private businessService: BusinessService,
    private productOutOfStockService: ProductOutOfStockService,
    private deliveryBoyRatingsService: DeliveryBoyRatingsService,
    private couponService: CouponService,
    private excelService: ExcelService,
    private razorPayService: RazorPayService,
    private eventEmitter: EventEmitter2,
    private dealService: DealService,
  ) {}

  // ########################################################### USER ###########################################################
  @Get('/list')
  @ApiOperation({ title: 'Get all order for user' })
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
  @ApiResponse({
    status: 200,
    description: 'Return list of order for user',
    type: ResponseOrderDTOPagination,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async GetOrderListForUser(
    @GetUser() user: UsersDTO,
    @Query() userQuery: UserQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    let isSubscriptionOrder;
    try {
      if (userQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getUserPagination(userQuery);
      if (userQuery.type === 'PURCHASES') isSubscriptionOrder = false;
      if (userQuery.type === 'SUBSCRIPTIONS') isSubscriptionOrder = true;
      const orders = await Promise.all([
        this.orderService.getAllOrderForUser(
          isSubscriptionOrder,
          user._id,
          pagination.page,
          pagination.limit,
        ),
        this.orderService.countAllOrderForUser(isSubscriptionOrder, user._id),
      ]);
      return this.utilService.successResponseData(orders[0], {
        total: orders[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/detail/:orderId')
  @ApiOperation({ title: 'Get order detail by orderId for user' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async getOrderDetailForUser(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      let order = await this.orderService.getOrderDetailForUser(
        user._id,
        orderId,
      );
      if (!order) this.utilService.pageNotFound();
      if (!order.isSubscriptionOrder) {
        let cart = await this.cartService.getCartById(order.cartId);
        const ratings = await this.cartService.findProductsById(
          user._id,
          cart.productIds,
        );
        cart = JSON.parse(JSON.stringify(cart));
        order = JSON.parse(JSON.stringify(order));
        order.cart.map(p => {
          const pro = ratings.find(r => r.productId == p.productId);
          if (pro) {
            p.isRated = pro.isRated;
            p.rating = pro.rating;
          }
        });
        delete order.cartId;
      }
      return this.utilService.successResponseData({ order: order });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/razorpay')
  @ApiOperation({ title: 'Get razorPay Payment OrderId' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async getOrderIdFromRazorPay(
    @GetUser() user: UsersDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      const userCart = await this.cartService.getCartByUserId(user._id);
      if (!userCart)
        this.utilService.badRequest(ResponseMessage.CART_ITEM_NOT_FOUND);

      const settings = await this.settingService.getDeliveryTaxSettings();
      const amount = Math.round(
        Number(Number(userCart.grandTotal.toFixed(2)) * 100),
      );

      const orderPayment = await this.razorPayService.createOrderPayment({
        amount: amount,
        currency: settings.currencyCode || 'INR',
        payment_capture: CaptureMethodRazorPay.AUTOMATIC,
      });

      userCart.paymentRazorOrderId = orderPayment.id;

      const cart = await this.cartService.updateCart(userCart._id, userCart);
      if (!cart)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      return this.utilService.successResponseData({
        paymentRazorOrderId: orderPayment.id,
      });
    } catch (e) {
      if (e && e.error) this.utilService.badRequest(e.error.description);
      this.utilService.errorResponse(e);
    }
  }

  @Post('/create')
  @ApiOperation({ title: 'Create order' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async placeOrder(
    @GetUser() userData: UsersDTO,
    @Body() orderData: OrderCreateDTO,
  ) {
    this.utilService.validateUserRole(userData);

    const AllowedPaymentType = [
      PaymentType.STRIPE,
      PaymentType.RAZORPAY,
      PaymentType.COD,
    ];
    try {
      if (!AllowedPaymentType.includes(orderData.paymentType))
        orderData.paymentType = PaymentType.COD;

      const userCart = await this.cartService.getCartByUserId(userData._id);
      // console.log("userCart", userCart)
      if (!userCart)
        this.utilService.badRequest(ResponseMessage.CART_ITEM_NOT_FOUND);

      if (
        userCart.shippingMethod === ShippingMethod.DELIVERY &&
        !userCart.deliveryAddress
      )
        this.utilService.badRequest(ResponseMessage.ADDRESS_NOT_FOUND);

      const settings = await this.settingService.getDeliveryTaxSettings();

      // coupon validation
      if (userCart.couponCode) {
        const coupon = await this.couponService.getCouponDetailByCode(
          userCart.couponCode,
        );
        if (!coupon)
          this.utilService.badRequest(ResponseMessage.COUPON_NOT_FOUND);
        const currentDate = Date.now();
        if (coupon.startDate < currentDate && coupon.expiryDate > currentDate) {
          let check;
        } else this.utilService.badRequest(ResponseMessage.COUPON_EXPIRED);
      }

      if (
        userCart.shippingMethod === ShippingMethod.DELIVERY &&
        settings &&
        userCart.subTotal < settings.minimumOrderAmountToPlaceOrder
      ) {
        const resMsg = await this.utilService.getTranslatedMessageByKey(
          ResponseMessage.ORDER_MINIMUM_AMOUNT_PLACE_ORDER,
        );
        this.utilService.badRequest(
          `${resMsg}` + settings.minimumOrderAmountToPlaceOrder,
        );
      }
      const products = await this.productService.getProductByIds(
        userCart.productIds,
      );

      for (const item of userCart.products) {
        // console.log('dealId', item.dealId)
        if (item.isDealAvailable) {
          const checkDeal = await this.dealService.getDealByIds(item.dealId);
          // console.log('checkDeal', checkDeal)
          if (checkDeal === null)
            this.utilService.badRequest(ResponseMessage.DEAL_IS_DISABLED);
          if (!checkDeal.status)
            this.utilService.badRequest(ResponseMessage.DEAL_IS_DISABLED);
          if (checkDeal.dealPercent !== item.dealPercent)
            this.utilService.badRequest(ResponseMessage.DEAL_IS_DISABLED);
        }
      }

      const cartVerifyData = await this.cartService.verifyCart(
        products,
        userCart,
      );

      if (cartVerifyData.cartArr.length > 0)
        this.utilService.badRequest(cartVerifyData.cartArr);

      if (userCart.walletAmount > 0) {
        if (userData.walletAmount < userCart.walletAmount)
          this.utilService.badRequest(
            ResponseMessage.WALLET_INSUFFICIENT_AMOUNT,
          );
      }

      const order = {
        subTotal: 0,
        tax: 0,
        taxInfo: {
          taxName: '',
          amount: '',
        },
        product: {
          title: '',
          imageUrl: '',
        },
        totalProduct: 0,
        grandTotal: 0,
        deliveryCharges: 0,
        deliveryAddress: '',
        deliveryInstruction: '',
        couponCode: 0,
        couponAmount: 0,
        transactionDetails: {
          transactionStatus: '',
          receiptUrl: '',
          transactionId: '',
          currency: '',
          paymentCount: 0,
          paymentMethod: '',
          transactionDate: 0,
          transactionAmount: 0,
          paymentRazorOrderId: null,
        },
        address: null,
        storeAddress: null,
        user: null,
        userId: '',
        paymentType: '',
        shippingMethod: '',
        orderStatus: '',
        paymentStatus: PaymentStatusType.PENDING,
        cartId: '',
        orderID: 0,
        deliveryDate: '',
        deliveryTime: '',
        isWalletUsed: false,
        usedWalletAmount: 0,
        amountRefunded: 0,
        currencySymbol: '',
        currencyCode: '',
        invoiceToken: '',
        orderFrom: orderData.orderFrom,
        cart: [],
      };

      if (!orderData.deliverySlotId)
        this.utilService.badRequest(ResponseMessage.DELIEVRY_SLOT_NOT_SELECTED);

      const deliveryTimeSlots = await this.settingService.getDeliveryTimeSlots();
      const availableSlots = await this.settingService.getAvailableTimeSlot(
        deliveryTimeSlots['deliveryTimeSlots'],
      );
      const openSlots = [];
      availableSlots.map(day => {
        day.timings.map(time => {
          openSlots[time._id] = { date: day.date, slot: time.slot };
        });
      });

      const selectedTimeslot = openSlots[orderData.deliverySlotId];
      if (!selectedTimeslot)
        this.utilService.badRequest(
          ResponseMessage.DELIEVRY_SLOT_NOT_AVAILABLE,
        );

      order.deliveryDate = selectedTimeslot.date;
      order.deliveryTime = selectedTimeslot.slot;
      order.deliveryInstruction = orderData.deliveryInstruction
        ? orderData.deliveryInstruction
        : '';
      order.shippingMethod = userCart.shippingMethod;
      order.subTotal = userCart.subTotal;
      order.tax = userCart.tax;
      order.grandTotal = userCart.grandTotal;
      order.deliveryCharges = userCart.deliveryCharges;
      order.currencyCode = settings.currencyCode;
      order.currencySymbol = settings.currencySymbol;
      order.transactionDetails = {
        transactionStatus: null,
        receiptUrl: null,
        transactionId: null,
        currency: null,
        paymentCount: 0,
        paymentMethod: null,
        transactionDate: Date.now(),
        transactionAmount: order.grandTotal,
        paymentRazorOrderId: null,
      };
      order.couponCode = userCart.couponCode;
      order.couponAmount = userCart.couponAmount;

      if (userCart.walletAmount) {
        order.usedWalletAmount = userCart.walletAmount;
        order.isWalletUsed = true;
        if (order.grandTotal === 0) {
          order.paymentStatus = PaymentStatusType.SUCCESS;
        }
      }

      //RAZORPAY
      if (
        orderData.paymentType === PaymentType.RAZORPAY &&
        order.grandTotal > 0
      ) {
        if (!orderData.razorPayDetails)
          this.utilService.badRequest(
            ResponseMessage.RAZORPAY_DETAILS_REQUIRED,
          );

        const { razorPayDetails } = orderData;

        const signature = await this.razorPayService.verifyPaymentSignature(
          userCart.paymentRazorOrderId,
          razorPayDetails.paymentId,
        );
        if (signature !== razorPayDetails.signature)
          this.utilService.badRequest(
            ResponseMessage.RAZORPAY_SIGNATURE_NOT_VERIFIED,
          );

        const payment = await this.razorPayService.getPaymentDetail(
          razorPayDetails.paymentId,
        );

        order.transactionDetails.transactionStatus = payment.status;
        order.transactionDetails.transactionId = payment.id;
        order.transactionDetails.currency = payment.currency;
        order.transactionDetails.paymentRazorOrderId = payment.order_id;
        order.paymentStatus = PaymentStatusType.SUCCESS;
      }

      if (userCart.shippingMethod === ShippingMethod.DELIVERY) {
        order.deliveryAddress = userCart.deliveryAddress;
        const userAdress = await this.addressService.getAddressDetail(
          userData._id,
          userCart.deliveryAddress,
        );
        if (userAdress) {
          order.address = {
            address: userAdress.address,
            flatNo: userAdress.flatNo,
            postalCode: userAdress.postalCode,
            addressType: userAdress.addressType,
            apartmentName: userAdress.apartmentName,
            landmark: userAdress.landmark,
            location: userAdress.location,
          };
        }
      } else if (userCart.shippingMethod === ShippingMethod.PICK_UP) {
        const businessInfo = await this.businessService.getBussinessDetailForUser();
        if (businessInfo) {
          order.storeAddress = {
            address: businessInfo.address,
            location: settings.location,
          };
        }
      }

      order.user = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        mobileNumber: userData.mobileNumber,
        email: userData.email,
        countryCode: userData.countryCode,
        countryName: userData.countryName,
      };

      order.userId = userData._id;
      order.paymentType = orderData.paymentType;
      order.orderStatus = OrderStatusType.PENDING;
      order.cartId = userCart._id;
      order.totalProduct = userCart.products.length;
      order.product = {
        title: userCart.products[0].productName,
        imageUrl: userCart.products[0].imageUrl,
      };
      // FOR GRAPH
      order.cart = userCart.products;
      order.taxInfo = userCart.taxInfo;
      order.invoiceToken = await this.utilService.getUUID();
      const sequence = await this.sequenceService.getSequence();
      order.orderID = sequence
        ? sequence.sequenceNo
        : Math.floor(900000 * Math.random()) + 100000;
      const orderRes = await this.orderService.createOrder(order);

      if (!orderRes)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      // STRIPE
      let session: any, paymentIntent: any;
      if (
        orderData.paymentType === PaymentType.STRIPE &&
        order.grandTotal > 0
      ) {
        const amount = Math.round(
          Number(Number(order.grandTotal.toFixed(2)) * 100),
        );

        if (orderData.orderFrom === USER_PLATFORM.WEB_APP) {
          const obj = {
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: settings.currencyCode || 'INR',
                  product_data: {
                    name: 'Grocery Item',
                  },
                  unit_amount: amount,
                },
                quantity: 1,
              },
            ],
            client_reference_id: orderRes._id.toString(),
            metadata: {
              PAYMENT_TYPE: PAYMENT_TYPE.ORDER,
              USER_PLATFORM: USER_PLATFORM.WEB_APP,
            },
            mode: 'payment',
            success_url:
              process.env.NODE_ENV === 'production'
                ? process.env.WEB_URL_PRODUCTION + '/thank-you'
                : process.env.WEB_URL_STAGING + '/thank-you',
            cancel_url:
              process.env.NODE_ENV === 'production'
                ? process.env.WEB_URL_PRODUCTION + '/home'
                : process.env.WEB_URL_STAGING + '/home',
          };
          session = await this.stripeService.createCheckoutSession(obj);
          if (!session.id)
            this.utilService.badRequest(ResponseMessage.ORDER_PAYMENT_ERROR);
        }

        if (orderData.orderFrom === USER_PLATFORM.USER_APP) {
          const object = {
            amount: amount,
            currency: settings.currencyCode || 'INR',
            description: 'Grocer Item',
            metadata: {
              PAYMENT_TYPE: PAYMENT_TYPE.ORDER,
              orderId: orderRes._id.toString(),
              USER_PLATFORM: USER_PLATFORM.USER_APP,
            },
            shipping: {
              name: userData.firstName + ' ' + userData.lastName,
              address: {
                line1:
                  (orderRes.cart[0] &&
                    orderRes.cart[0].address &&
                    orderRes.cart[0].address.houseInfo + orderRes.cart[0] &&
                    orderRes.cart[0].address &&
                    orderRes.cart[0].address.address) ||
                  '510 Townsend St',
                postal_code:
                  (orderRes.cart[0] &&
                    orderRes.cart[0].address &&
                    orderRes.cart[0].address.postalCode) ||
                  '98140',
                city: 'San Francisco',
                state: 'CA',
                country: 'US',
              },
            },
          };
          paymentIntent = await this.stripeService.createPaymentIntents(object);
          if (!paymentIntent.id)
            this.utilService.badRequest(ResponseMessage.ORDER_PAYMENT_ERROR);
        }
      }

      if (cartVerifyData && cartVerifyData.productArr.length) {
        for (const prods of cartVerifyData.productArr) {
          this.productService.updateProductStock(prods._id, prods.variant);
        }
      }
      if (
        cartVerifyData.productOutOfStock &&
        cartVerifyData.productOutOfStock.length
      ) {
        await Promise.all([
          this.notificationService.createForProductOutOfStock(
            cartVerifyData.productOutOfStock,
          ),
          this.productOutOfStockService.createProductStock(
            cartVerifyData.productOutOfStock,
          ),
        ]);
      }
      // console.log('orderRes', orderRes);
      if (orderRes.usedWalletAmount > 0) {
        const walletPayment: WalletSaveDTO = {
          userId: userData._id,
          orderId: orderRes._id,
          orderID: orderRes.orderID,
          amount: orderRes.usedWalletAmount,
        };

        if (walletPayment.amount > 0)
          this.walletService.madeOrder(walletPayment);
      }

      await Promise.all([
        this.userService.updateWallet(userData._id, -orderRes.usedWalletAmount),
        this.cartService.cartOrderUnlink(userCart._id),
      ]);

      this.socketService.sendProductOutOfStocksNotificationToAdmin(
        cartVerifyData.productOutOfStock,
      );

      if (order.paymentType === PaymentType.STRIPE) {
        if (orderData.orderFrom === USER_PLATFORM.WEB_APP) {
          return this.utilService.successResponseData({
            id: orderRes._id,
            sessionId: session && session.id,
          });
        }

        if (orderData.orderFrom === USER_PLATFORM.USER_APP) {
          return this.utilService.successResponseData({
            id: orderRes._id,
            client_secret: paymentIntent && paymentIntent.client_secret,
            userId: userData._id,
          });
        }
      }

      //
      const notification: INotificationUser = {
        userId: userData._id,
        orderId: orderRes._id,
        orderID: orderRes.orderID,
        notifyType: NotificationType.ORDER_PLACED,
      };

      if (userData && userData.playerId) {
        this.eventEmitter.emitAsync(
          notificationEvents.ORDER_CREATED,
          new UserNotification(notification),
        );
      }

      this.emailService.sendEmailForPlacedOrder(orderRes, userCart);
      this.socketService.sendOrderStatusNotificationToAdmin(notification);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_PLACED);
    } catch (e) {
      if (e && e.type && e.type === 'StripeInvalidRequestError')
        this.utilService.badRequest(e.raw.message);
      else this.utilService.errorResponse(e);
    }
  }

  @Put('/cancel/:orderId')
  @ApiOperation({ title: 'Cancel order' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async orderCancelledByUser(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);

    const OnlinePayment = [PaymentType.RAZORPAY, PaymentType.STRIPE];

    let amountRefund = 0;
    try {
      const order = await this.orderService.getOrderDetailForCancel(
        user._id,
        orderId,
      );
      if (!order) this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      if (order.orderStatus === OrderStatusType.DELIVERED)
        this.utilService.badRequest(ResponseMessage.ORDER_ALREADY_DELIVERED);

      if (
        (order.paymentType === PaymentType.COD &&
          order.isWalletUsed &&
          order.usedWalletAmount) ||
        order.paymentType === PaymentType.WALLET
      )
        amountRefund = order.usedWalletAmount;
      else if (
        order.paymentStatus === PaymentStatusType.SUCCESS &&
        OnlinePayment.includes(order.paymentType)
      )
        amountRefund = order.grandTotal + order.usedWalletAmount;
      else if (
        order.paymentStatus === PaymentStatusType.FAILED &&
        order.isWalletUsed &&
        order.usedWalletAmount
      )
        amountRefund = order.usedWalletAmount;

      if (order.paymentStatus === PaymentStatusType.PENDING) {
        if (order.isWalletUsed && order.usedWalletAmount)
          amountRefund = order.usedWalletAmount;
        order.orderStatus = OrderStatusType.CANCELLED;
        order.paymentStatus = PaymentStatusType.FAILED;
        order.amountRefunded = amountRefund;
        order.transactionDetails.transactionStatus =
          TransactionStatusType.FAILED;
        this.orderService.orderDetailUpdate(order._id, order);
      } else {
        this.orderService.orderCancelByUser(user._id, orderId, amountRefund);
      }

      const userCart = await this.cartService.getCartById(order.cartId);
      const products = await this.productService.getProductByIds(
        userCart.productIds,
      );

      for (const prods of userCart.products) {
        const productIndex = await products.findIndex(
          val => val._id.toString() == prods.productId.toString(),
        );
        const varientIndex = await products[productIndex].variant.findIndex(
          val => val.unit == prods.unit,
        );
        if (products[productIndex].variant[varientIndex].productStock === 0) {
          await this.productOutOfStockService.deleteOutOfStock(
            products[productIndex]._id,
          );
        }
        products[productIndex].variant[varientIndex].productStock +=
          prods.quantity;
        await this.productService.updateProductStock(
          products[productIndex]._id,
          products[productIndex].variant[varientIndex],
        );
      }

      if (amountRefund > 0) {
        const wallet: WalletSaveDTO = {
          userId: user._id,
          amount: amountRefund,
          transactionType: WalletTransactionType.ORDER_CANCELLED,
          orderId: order._id,
          orderID: order.orderID,
        };

        this.walletService.cancelOrder(wallet);
      }
      await this.userService.updateWallet(user._id, amountRefund);
      await this.userService.descreaseOrderPurchased(user._id);
      if (order.isSubscriptionOrder == false) {
        const notification: INotificationUser = {
          userId: user._id,
          orderId: order._id,
          orderID: order.orderID,
          isSubscriptionOrder: order.isSubscriptionOrder,
          notifyType: NotificationType.ORDER_CANCELLED,
        };

        this.eventEmitter.emitAsync(
          notificationEvents.ORDER_CANCELLED_BY_USER,
          new UserNotification(notification),
        );
        this.socketService.sendOrderStatusNotificationToAdmin(notification);
        return this.utilService.successResponseMsg(
          ResponseMessage.ORDER_CANCELLED,
        );
      } else {
        const notification: INotificationUser = {
          userId: user._id,
          orderId: order._id,
          orderID: order.orderID,
          isSubscriptionOrder: order.isSubscriptionOrder,
          subscriptionId: order.subscriptionId,
          notifyType: NotificationType.SUBSCRIPTION_ORDER_CANCELLED,
        };

        this.eventEmitter.emitAsync(
          notificationEvents.SUBSCRIPTION_ORDER_CANCELLED_BY_USER,
          new UserNotification(notification),
        );
        this.socketService.sendOrderStatusNotificationToAdmin(notification);
        return this.utilService.successResponseMsg(
          ResponseMessage.SUBSCRIPTION_ORDER_CANCELLED,
        );
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // ########################################################### DELIVERY BOY ###########################################################
  @Get('/delivery-boy/assigned/list')
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
  @ApiOperation({ title: 'Get all assigned order for delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Return list of assigned order for delivery boy',
    type: ResponseDeiveryBoyPagination,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async assignedOrderListForDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Query() userQuery: UserQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    try {
      if (userQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getUserPagination(userQuery);
      const orders = await Promise.all([
        this.orderService.getAllAssginedOrderForDeliveryBoy(
          user._id,
          pagination.page,
          pagination.limit,
        ),
        this.orderService.countAllAssginedOrderForDeliveryBoy(user._id),
      ]);
      return this.utilService.successResponseData(orders[0], {
        total: orders[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/delivery-boy/delivered/list')
  @ApiOperation({ title: 'Get all delivered order for delivery boy' })
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
  @ApiResponse({
    status: 200,
    description: 'Return list of delivered order for delivery boy',
    type: ResponseDeliveredOrderPagination,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async deliveredOrderListForDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Query() userQuery: UserQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    try {
      if (userQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getUserPagination(userQuery);
      const orders = await Promise.all([
        this.orderService.getAllDeliveredOrderForDeliveryBoy(
          user._id,
          pagination.page,
          pagination.limit,
        ),
        this.orderService.countAllDeliveredOrderForDeliveryBoy(user._id),
      ]);
      return this.utilService.successResponseData(orders[0], {
        total: orders[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/delivery-boy/detail/:orderId')
  @ApiOperation({ title: 'Get order detail by orderId for delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Return order detail by orderId',
    type: ResponseDataOfOrder,
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
  public async getOrderDetailForDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    let cart;
    try {
      let order = await this.orderService.getOrderDetailForBoy(
        user._id,
        orderId,
      );
      if (!order) this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      order = JSON.parse(JSON.stringify(order));
      if (order.cartId) cart = await this.cartService.getCartById(order.cartId);
      if (order.isSubscriptionOrder === true)
        cart = await this.orderService.generateCartDataForSubscriptionOrder(
          order,
        );
      if (order.orderFrom === 'POS')
        cart = await this.orderService.generateCartDataForSubscriptionOrder(
          order,
        );
      delete order.cartId;

      // Deleting duplicate keys same as cart data
      [
        'cart',
        'couponAmount',
        'isWalletUsed',
        'usedWalletAmount',
        'subTotal',
        'tax',
        'taxInfo',
        'deliveryCharges',
      ].forEach(prop => delete order[prop]);
      return this.utilService.successResponseData({ order: order, cart: cart });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/delivery-boy/accept/:orderId')
  @ApiOperation({ title: 'Accept order by delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async orderAcceptByDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    try {
      const orderDetail = await this.orderService.getOrderDetail(orderId);
      if (!orderDetail)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      if (orderDetail.assignedToId != user._id)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      if (orderDetail.isAcceptedByDeliveryBoy)
        this.utilService.badRequest(
          ResponseMessage.DELIVERY_BOY_ALREADY_ACCEPTED_ORDER,
        );

      const orderAccept = await this.orderService.orderAcceptByDelivery(
        orderId,
      );
      if (orderDetail.isSubscriptionOrder == false) {
        if (orderDetail.orderFrom == 'POS') {
          if (orderAccept) {
            const notification: NotificationssSaveDTO = {
              notifyType: NotificationType.ORDER_ACCEPTED_BY_DELIVERY_BOY,
              orderId: orderDetail._id,
              orderID: orderDetail.orderID,
              orderFrom: orderDetail.orderFrom,
              deliveryBoyId: user._id,
              deliveryBoyName: user.firstName + ' ' + user.lastName,
              isSubscriptionOrder: orderDetail.isSubscriptionOrder,
              subscriptionId: orderDetail.subscriptionId,
            };
            this.socketService.sendOrderStatusNotificationToAdmin(notification);
            this.notificationService.poscreateForAcceptedByBoy(
              notification,
              orderDetail.orderID,
            );
            return this.utilService.successResponseMsg(
              ResponseMessage.POS_ORDER_ACCEPTED_BY_DELIVERY_BOY,
            );
          } else
            this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
        } else {
          if (orderAccept) {
            const notification: NotificationSaveDTO = {
              notifyType: NotificationType.ORDER_ACCEPTED_BY_DELIVERY_BOY,
              orderId: orderDetail._id,
              orderID: orderDetail.orderID,

              deliveryBoyId: user._id,
              deliveryBoyName: user.firstName + ' ' + user.lastName,
              isSubscriptionOrder: orderDetail.isSubscriptionOrder,
              subscriptionId: orderDetail.subscriptionId,
            };
            this.socketService.sendOrderStatusNotificationToAdmin(notification);
            this.notificationService.createForAcceptedByBoy(
              notification,
              orderDetail.orderID,
            );
            return this.utilService.successResponseMsg(
              ResponseMessage.ORDER_ACCEPTED_BY_DELIVERY_BOY,
            );
          } else
            this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
        }
      } else {
        if (orderAccept) {
          const notification: NotificationSaveDTO = {
            notifyType:
              NotificationType.SUBSCRIPTION_ORDER_ACCEPTED_BY_DELIVERY_BOY,
            orderId: orderDetail._id,
            orderID: orderDetail.orderID,

            deliveryBoyId: user._id,
            deliveryBoyName: user.firstName + ' ' + user.lastName,
            isSubscriptionOrder: orderDetail.isSubscriptionOrder,
            subscriptionId: orderDetail.subscriptionId,
          };
          this.socketService.sendOrderStatusNotificationToAdmin(notification);
          this.notificationService.createdForAcceptedByBoy(
            notification,
            orderDetail.orderID,
          );
          const msg = await this.utilService.getTranslatedMessage(
            ResponseMessage.SUBSCRIPTION_ORDER_ACCEPTED_BY_DELIVERY_BOY,
          );
          return this.utilService.successResponseMsg(msg);
        } else
          this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/delivery-boy/reject/:orderId')
  @ApiOperation({ title: 'Reject order by delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async orderRejectedByDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    try {
      const orderDetail = await this.orderService.getOrderDetail(orderId);
      if (!orderDetail)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      if (orderDetail.assignedToId != user._id)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      if (orderDetail.isAcceptedByDeliveryBoy)
        this.utilService.badRequest(
          ResponseMessage.DELIVERY_BOY_ALREADY_ACCEPTED_ORDER,
        );

      const orderRejected = await this.orderService.orderRejectedByDelivery(
        orderId,
        user._id,
        user.firstName,
      );
      if (orderDetail.isSubscriptionOrder == false) {
        if (orderDetail.orderFrom == 'POS') {
          if (orderRejected) {
            const notification: NotificationssSaveDTO = {
              notifyType: NotificationType.POS_ORDER_REJECTED_BY_DELIVERY_BOY,
              orderId: orderDetail._id,
              orderID: orderDetail.orderID,
              orderFrom: orderDetail.orderFrom,
              deliveryBoyId: user._id,
              deliveryBoyName: user.firstName + ' ' + user.lastName,
              isSubscriptionOrder: orderDetail.isSubscriptionOrder,
              subscriptionId: orderDetail.subscriptionId,
            };
            this.socketService.sendOrderStatusNotificationToAdmin(notification);
            this.notificationService.poscreateForRejectedByBoy(
              notification,
              orderDetail.orderID,
            );
            return this.utilService.successResponseMsg(
              ResponseMessage.POS_ORDER_REJECTED_BY_DELIVERY_BOY,
            );
          }
        } else {
          if (orderRejected) {
            const notification: NotificationSaveDTO = {
              notifyType: NotificationType.ORDER_REJECTED_BY_DELIVERY_BOY,
              orderId: orderDetail._id,
              orderID: orderDetail.orderID,

              deliveryBoyId: user._id,
              deliveryBoyName: user.firstName + ' ' + user.lastName,
              isSubscriptionOrder: orderDetail.isSubscriptionOrder,
              subscriptionId: orderDetail.subscriptionId,
            };
            this.socketService.sendOrderStatusNotificationToAdmin(notification);
            this.notificationService.createForRejectedByBoy(
              notification,
              orderDetail.orderID,
            );
            return this.utilService.successResponseMsg(
              ResponseMessage.ORDER_REJECTED_BY_DELIVERY_BOY,
            );
          }
        }
      } else {
        if (orderRejected) {
          const notification: NotificationSaveDTO = {
            notifyType:
              NotificationType.SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY,
            orderId: orderDetail._id,
            orderID: orderDetail.orderID,

            deliveryBoyId: user._id,
            subscriptionId: orderDetail.subscriptionId,
            isSubscriptionOrder: orderDetail.isSubscriptionOrder,
            deliveryBoyName: user.firstName + ' ' + user.lastName,
          };
          this.socketService.sendOrderStatusNotificationToAdmin(notification);
          this.notificationService.createdForRejectedByBoy(
            notification,
            orderDetail.orderID,
          );
          const msg = await this.utilService.getTranslatedMessage(
            ResponseMessage.SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY,
          );
          return this.utilService.successResponseMsg(msg);

          //return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY);
        }
      }
      this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/delivery-boy/status-update/:orderId')
  @ApiOperation({ title: 'Update order status by delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async orderStatusUpdateByDeliveryBoy(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() statusUpdate: DBStatusUpdateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryBoyRole(user);
    try {
      //
      let orderStatusTime = {},
        orderStatusUpdate;
      const orderDetail = await this.orderService.getOrderDetail(orderId);
      if (!orderDetail)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      if (orderDetail.assignedToId != user._id)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      orderStatusTime = { orderStatus: statusUpdate.status, time: Date.now() };
      if (statusUpdate.status === OrderStatusType.DELIVERED) {
        orderStatusUpdate = await this.orderService.orderDeliveredStatusUpdate(
          orderId,
          statusUpdate.status,
          orderStatusTime,
          PaymentStatusType.SUCCESS,
        );
      } else {
        orderStatusUpdate = await this.orderService.orderStatusUpdate(
          orderId,
          statusUpdate.status,
          orderStatusTime,
        );
      }
      if (orderStatusUpdate) {
        const userDetail = await this.userService.getUserById(
          orderDetail.userId,
        );
        if (userDetail) {
          if (statusUpdate.status === OrderStatusType.DELIVERED) {
            const orders = await Promise.all([
              this.cartService.getCartById(orderStatusUpdate.cartId),
              this.businessService.getBusinessDetail(),
            ]);
            this.userService.updateOrderDelivered(user._id);
            this.userService.increaseOrderPurchased(orderDetail.userId);
            this.emailService.sendEmailOrderDelivered(
              orderDetail,
              orders[0],
              orders[1],
            );
          }

          const notification: INotificationUser = {
            userId: userDetail._id,
            orderId: orderDetail._id,
            orderID: orderDetail.orderID,
            orderStatus: statusUpdate.status,
            isSubscriptionOrder: orderDetail.isSubscriptionOrder,
            subscriptionId: orderDetail.subscriptionId,
          };

          if (userDetail && userDetail.playerId)
            this.eventEmitter.emitAsync(
              notificationEvents.DELIVERY_BOY_STATUS_UPDATE_NOTIFICATION,
              new UserNotification(notification),
            );
        }
        if (orderDetail.isSubscriptionOrder == false) {
          const products = await this.cartService.getCartByIdOnlyProducts(
            orderDetail.cartId,
          );

          products.productIds.map(
            async c =>
              await this.cartService.addProductInOrdersForRating({
                userId: userDetail._id,
                productId: c,
              }),
          );
          return this.utilService.successResponseMsg(
            ResponseMessage.ORDER_STATUS_UPDATED,
          );
        } else {
          // console.log("bye")
          const msg = await this.utilService.getTranslatedMessage(
            ResponseMessage.SUBSCRIPTION_ORDER_STATUS_UPDATED,
          );
          return this.utilService.successResponseMsg(msg);
        }
      }

      this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // ########################################################### ADMIN ###########################################################
  @Get('/admin/list')
  @ApiOperation({ title: 'Get all order' })
  @ApiImplicitQuery({
    name: 'orderStatus',
    description: 'Get order details By Order status',
    required: false,
    type: String,
  })
  @ApiImplicitQuery({
    name: 'assignedToId',
    description: 'Get order details By Delivery-Boy Id',
    required: false,
    type: String,
  })
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
  @ApiImplicitQuery({
    name: 'type',
    description: 'subscription or purchase ',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Return list of order ',
    type: ResponseOrderForAdmin,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async index(
    @GetUser() user: UsersDTO,
    @Query() query: OrderFilterQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const orderFilter = {};

      if (query.fromDate && query.toDate) {
        const FROM_DATE = new Date(query.fromDate).setHours(0, 0, 0, 0);
        const TO_DATE = new Date(query.toDate).setHours(23, 59, 59, 999);

        orderFilter['createdAt'] = { $gt: FROM_DATE, $lt: TO_DATE };
      }
      if (query.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const page = Number(query.page) || AdminSettings.DEFAULT_PAGE_NUMBER;
      const limit = Number(query.limit) || AdminSettings.DEFAULT_PAGE_LIMIT;

      if (query.type === 'PURCHASES') {
        orderFilter['orderFrom'] = { $ne: 'POS' };
        orderFilter['isSubscriptionOrder'] = { $nin: [true] };
      }
      if (query.type === 'SUBSCRIPTIONS') {
        orderFilter['orderFrom'] = { $ne: 'POS' };
        orderFilter['isSubscriptionOrder'] = true;
      }

      if (query.orderStatus) orderFilter['orderStatus'] = query.orderStatus;
      if (query.assignedToId) orderFilter['assignedToId'] = query.assignedToId;
      if (query.q) {
        const isNum = /^\d+$/.test(query.q);
        orderFilter['$or'] = [
          { 'user.email': { $regex: query.q, $options: 'i' } },
          { 'user.mobileNumber': { $regex: query.q, $options: 'i' } },
        ];
        if (isNum) orderFilter['$or'].push({ orderID: Number(query.q) });
      }
      // console.log("orderFilter", JSON.stringify(orderFilter))
      const orders = await Promise.all([
        this.orderService.getAllOrder(orderFilter, page - 1, limit),
        this.orderService.countAllOrder(orderFilter),
      ]);
      return this.utilService.successResponseData(orders[0], {
        total: orders[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/detail/:orderId')
  @ApiOperation({ title: 'Get order detail by orderId' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseAdminOrderDetailsOrderId,
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
  public async getOrderDetails(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ) {
    this.utilService.validateAdminRole(user);
    try {
      const order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();

      if (order.isSubscriptionOrder)
        return this.utilService.successResponseData({ order: order });

      const cart = await this.cartService.getCartById(order.cartId);
      const deliveryBoyRating = await this.deliveryBoyRatingsService.getDeliveryBoyRating(
        orderId,
      );
      delete order.cartId;
      return this.utilService.successResponseData({
        order: order,
        cart: cart,
        deliveryBoyRating: deliveryBoyRating,
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Delete('/admin/delete/:orderId')
  @ApiOperation({ title: 'Get order detail by orderId' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async getOrderDelete(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ) {
    this.utilService.validateAdminRole(user);
    try {
      const order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      const deleteAll = await Promise.all([
        this.cartService.deleteCartById(order.cartId),
        this.orderService.deleteOrder(orderId),
        this.notificationService.deleteNotificationByordrId(orderId),
      ]);
      if (deleteAll)
        return this.utilService.successResponseMsg(
          ResponseMessage.ORDER_DELETED,
        );
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/status-update/:orderId')
  @ApiOperation({ title: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async updateOrderStatus(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderData: OrderStatusDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);

    const OnlinePayment = [PaymentType.RAZORPAY, PaymentType.STRIPE];
    try {
      let orderStatusTime = {};
      const order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      if (
        !(
          orderData.status == OrderStatusType.CONFIRMED ||
          orderData.status == OrderStatusType.CANCELLED ||
          orderData.status == OrderStatusType.DELIVERED ||
          orderData.status == OrderStatusType.READY_TO_PICKUP ||
          (orderData.status == OrderStatusType.DELIVERED &&
            order.shippingMethod === ShippingMethod.PICK_UP) ||
          (orderData.status == OrderStatusType.OUT_FOR_DELIVERY &&
            order.shippingMethod === ShippingMethod.DELIVERY &&
            order.isOrderAssigned &&
            order.isAcceptedByDeliveryBoy)
        )
      )
        this.utilService.badRequest(ResponseMessage.ORDER_STATUS_INVALID);

      orderStatusTime = { orderStatus: orderData.status, time: Date.now() };

      if (orderData.status == OrderStatusType.DELIVERED) {
        await this.orderService.orderDeliveredStatusUpdate(
          order._id,
          orderData.status,
          orderStatusTime,
          PaymentStatusType.SUCCESS,
        );
      } else if (
        orderData.status == OrderStatusType.OUT_FOR_DELIVERY &&
        order.shippingMethod === ShippingMethod.DELIVERY &&
        order.isOrderAssigned &&
        order.isAcceptedByDeliveryBoy
      ) {
        await this.orderService.orderStatusUpdate(
          order._id,
          orderData.status,
          orderStatusTime,
        );
      } else if (orderData.status == OrderStatusType.CONFIRMED) {
        await this.orderService.orderStatusUpdate(
          order._id,
          orderData.status,
          orderStatusTime,
        );
      } else if (orderData.status == OrderStatusType.READY_TO_PICKUP) {
        await this.orderService.orderStatusUpdate(
          order._id,
          orderData.status,
          orderStatusTime,
        );
      } else if (orderData.status == OrderStatusType.CANCELLED) {
        let amountRefund = order.grandTotal;
        if (
          order.paymentType === PaymentType.COD &&
          order.isWalletUsed &&
          order.usedWalletAmount
        )
          amountRefund = order.usedWalletAmount;
        else if (
          order.paymentStatus === PaymentStatusType.SUCCESS &&
          OnlinePayment.includes(order.paymentType)
        )
          amountRefund = order.grandTotal + order.usedWalletAmount;
        else if (
          order.paymentStatus === PaymentStatusType.FAILED &&
          order.isWalletUsed &&
          order.usedWalletAmount
        )
          amountRefund = order.usedWalletAmount;
        if (order.paymentStatus === PaymentStatusType.PENDING) {
          order.orderStatus = OrderStatusType.CANCELLED;
          order.paymentStatus = PaymentStatusType.FAILED;
          order.amountRefunded = amountRefund;
          order.transactionDetails.transactionStatus =
            TransactionStatusType.FAILED;
          const response = await this.orderService.orderDetailUpdate(
            order._id,
            order,
          );
        } else {
          await this.orderService.orderCancelByAdmin(orderId, amountRefund);
        }
        if (amountRefund !== 0) {
          const wallet: WalletSaveDTO = {
            userId: order.userId,
            amount: amountRefund,
            transactionType: WalletTransactionType.ORDER_CANCELLED,
            orderId: order._id,
            orderID: order.orderID,
          };
          await Promise.all([
            this.walletService.cancelOrder(wallet),
            this.userService.updateWallet(order.userId, amountRefund),
          ]);
        }
        if (!order.isSubscriptionOrder) {
          const userCart = await this.cartService.getCartById(order.cartId);
          if (userCart != undefined && userCart != null) {
            const products = await this.productService.getProductByIds(
              userCart.productIds,
            );
            if (
              userCart != null &&
              userCart != undefined &&
              products != null &&
              products != undefined
            ) {
              for (const prods of userCart.products) {
                const productIndex = await products.findIndex(
                  val => val._id.toString() == prods.productId.toString(),
                );
                const varientIndex = await products[
                  productIndex
                ].variant.findIndex(val => val.unit == prods.unit);
                if (
                  products[productIndex].variant[varientIndex].productStock ===
                  0
                ) {
                  await this.productOutOfStockService.deleteOutOfStock(
                    products[productIndex]._id,
                  );
                }
                products[productIndex].variant[varientIndex].productStock +=
                  prods.quantity;
                await this.productService.updateProductStock(
                  products[productIndex]._id,
                  products[productIndex].variant[varientIndex],
                );
              }
            }
          }
        }
        this.userService.descreaseOrderPurchased(order.userId);
      }
      if (order.userId) {
        const userDetail = await this.userService.getUserById(order.userId);
        if (userDetail && userDetail.playerId) {
          const notification: INotificationUser = {
            userId: userDetail._id,
            orderId: order._id,
            orderID: order.orderID,
            orderStatus: orderData.status,
            subscriptionId: order.subscriptionId,
            isSubscriptionOrder: order.isSubscriptionOrder,
          };
          this.eventEmitter.emitAsync(
            notificationEvents.ADMIN_STATUS_UPDATE_NOTIFICATION,
            new UserNotification(notification),
          );
        }
        if (order.isSubscriptionOrder == false) {
          const products = await this.cartService.getCartByIdOnlyProducts(
            order.cartId,
          );
          products.productIds.map(
            async c =>
              await this.cartService.addProductInOrdersForRating({
                userId: userDetail._id,
                productId: c,
              }),
          );
          return this.utilService.successResponseMsg(
            ResponseMessage.ORDER_UPDATED,
          );
        } else {
          const msg = await this.utilService.getTranslatedMessage(
            ResponseMessage.SUBSCRIPTION_ORDER_UPDATED,
          );
          return this.utilService.successResponseMsg(msg);
        }
      } else
        return this.utilService.successResponseMsg(
          ResponseMessage.ORDER_UPDATED,
        );
    } catch (e) {
      // console.log(e)
      this.utilService.errorResponse(e);
    }
  }
  @Put('/admin/assign/delivery-boy/:orderId')
  @ApiOperation({ title: 'Order assign to delivery boy' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
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
  public async assignOrder(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() assignData: AssignOrderDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const orderDetail = await this.orderService.getOrderDetail(orderId);
      if (!orderDetail)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);
      if (orderDetail.shippingMethod === ShippingMethod.PICK_UP)
        this.utilService.badRequest(ResponseMessage.THIS_IS_PICK_UP_ORDER);
      if (orderDetail.orderStatus === OrderStatusType.READY_TO_PICKUP) {
        if (orderDetail.isOrderAssigned)
          this.utilService.badRequest(ResponseMessage.ORDER_ALREADY_ASSIGNED);

        const boyDetail = await this.userService.getUserById(
          assignData.deliveryBoyId,
        );
        if (!boyDetail)
          this.utilService.badRequest(ResponseMessage.DELIVERY_BOY_NOT_FOUND);

        const assignedToName = `${boyDetail.firstName} ${boyDetail.lastName}`;
        const assignOrderUpdate = {
          isOrderAssigned: true,
          isAcceptedByDeliveryBoy: false,
          assignedToId: boyDetail._id,
          assignedToName: assignedToName,
        };
        const deliveryBoyNotification = {
          deliveryBoyId: boyDetail._id,
          orderId: orderDetail._id,
          orderID: orderDetail.orderID,
          user: orderDetail.user,
          address: orderDetail.address,
          deliveryDate: orderDetail.deliveryDate,
          deliveryTime: orderDetail.deliveryTime,
        };
        this.socketService.newOrderForDeliveryBoy(deliveryBoyNotification);
        const updatedOrder = await this.orderService.orderAssignToDelivery(
          orderId,
          assignOrderUpdate,
        );
        if (orderDetail.isSubscriptionOrder == false) {
          if (updatedOrder.orderFrom == 'POS') {
            const deliveryBoyNotification: INotificationsDeliveryBoy = {
              deliveryBoyId: boyDetail._id,
              orderId: updatedOrder._id,
              orderID: updatedOrder.orderID,
              orderFrom: updatedOrder.orderFrom,
              notifyType: NotificationType.POS_ORDER_ASSIGNED_TO_DELIVERY_BOY,
            };

            if (updatedOrder.isOrderAssigned) {
              this.eventEmitter.emitAsync(
                notificationEvents.DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION,
                new DeliveryAssociatessNotification(deliveryBoyNotification),
              );

              return this.utilService.successResponseMsg(
                ResponseMessage.POS_ORDER_ASSIGNED_TO_DELIVERY_BOY,
              );
            } else {
              this.utilService.badRequest(
                ResponseMessage.ORDER_FAILED_TO_ASSIGN,
              );
            }
          } else {
            const deliveryBoyNotification: INotificationDeliveryBoy = {
              deliveryBoyId: boyDetail._id,
              orderId: updatedOrder._id,
              orderID: updatedOrder.orderID,
              subscriptionId: updatedOrder.subscriptionId,
              notifyType: NotificationType.ORDER_ASSIGNED_TO_DELIVERY_BOY,
            };

            if (updatedOrder.isOrderAssigned) {
              this.eventEmitter.emitAsync(
                notificationEvents.DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION,
                new DeliveryAssociatesNotification(deliveryBoyNotification),
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.ORDER_ASSIGNED_TO_DELIVERY_BOY,
              );
            } else {
              this.utilService.badRequest(
                ResponseMessage.ORDER_FAILED_TO_ASSIGN,
              );
            }
          }
        } else {
          const deliveryBoyNotification: INotificationDeliveryBoy = {
            deliveryBoyId: boyDetail._id,
            orderId: updatedOrder._id,
            orderID: updatedOrder.orderID,
            isSubscriptionOrder: updatedOrder.isSubscriptionOrder,
            subscriptionId: updatedOrder.subscriptionId,
            notifyType:
              NotificationType.SUBSCRIPTION_ORDER_ASSIGNED_TO_DELIVERY_BOY,
          };

          if (updatedOrder.isOrderAssigned) {
            this.eventEmitter.emitAsync(
              notificationEvents.DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION,
              new DeliveryAssociatesNotification(deliveryBoyNotification),
            );
            const msg = await this.utilService.getTranslatedMessage(
              ResponseMessage.SUBSCRIPTION_ORDER_ASSIGNED_TO_DELIVERY_BOY,
            );
            return this.utilService.successResponseMsg(msg);
            //return this.utilService.successResponseMsg(ResponseMessage.ORDER_ASSIGNED_TO_DELIVERY_BOY);
          } else {
            this.utilService.badRequest(ResponseMessage.ORDER_FAILED_TO_ASSIGN);
          }
        }
      } else {
        this.utilService.badRequest(
          ResponseMessage.ORDER_IS_NOT_READY_TO_PICKUP,
        );
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/order-status-type/list')
  @ApiOperation({ title: 'Get all order status type for dropdown' })
  @ApiResponse({
    status: 200,
    description: 'Return list of order status type',
    type: ResponseStatusList,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getOrderStatusTypeList(
    @GetUser() user: UsersDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const orderStatusTypeList = await this.orderService.getOrderStatusTypeList();
      return this.utilService.successResponseData(orderStatusTypeList);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/charts')
  @ApiOperation({ title: 'Get chart data for graph' })
  @ApiResponse({
    status: 200,
    description: 'Return chart data',
    type: ResponseChardOrderDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async oderGraph(
    @GetUser() user: UsersDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const list = await Promise.all([
        this.orderService.getOrdersPriceInLast7Days(),
        this.orderService.getTotalOrderAmdSum(),
        this.productService.countAllProduct(),
        this.categoryService.countAllCategory(null),
      ]);
      const chartData = list[0];
      const labels = chartData.map(c => {
        return c._id.date + '-' + c._id.month + '-' + c._id.year;
      });
      const data = chartData.map(c => c.data);
      const result = {
        graph: { labels: labels, data: data },
        totalOrder: list[1].totalOrder,
        totalPrice: list[1].totalPrice,
        totalProduct: list[2],
        totalCategory: list[3],
      };
      return this.utilService.successResponseData(result);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // NOT USED
  @Get('/admin/invoice/:orderId')
  @ApiOperation({ title: 'Get pdf invoice' })
  @ApiResponse({ status: 200, description: 'Return pdf invoice' })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  public async invoiceDownload(
    @GetUser() user: UsersDTO,
    @Res() res,
    @Param('orderId') orderId: string,
    @Query('token') token: string,
  ) {
    try {
      const order = await this.orderService.getOrderDetailByToken(
        orderId,
        token,
      );
      if (!order) this.utilService.pageNotFound();
      const cartBusiness = await Promise.all([
        this.cartService.getCartById(order.cartId),
        this.businessService.getBusinessDetail(),
      ]);
      const cart = cartBusiness[0];
      const business = cartBusiness[1];
      delete order.cartId;
      return res.sendFile(
        await this.emailService.createInvoice(order, cart, business),
      );
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Post('/admin/sales-table')
  @ApiOperation({ title: 'Get table data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSalesTable,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async orderTable(
    @GetUser() user: UsersDTO,
    @Body() orderStartEndDTO: OrderStartEndDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let totalRevenueWithTax = 0,
        totalRevenueWithoutTax = 0,
        totalOrders = 0,
        avgOrderWithTax = 0,
        avgOrderWithoutTax = 0,
        avgTotalOrders = 0,
        registerUser = 0,
        avgRegisterUser = 0,
        purchaseUser = 0,
        avgPurchaseUser = 0;
      let startDate, endDate;
      if (orderStartEndDTO.startDate === null) {
        const date = new Date();
        const today = date.setHours(0, 0, 0, 0);
        const thirtyDaysBack = new Date(today - 30 * 24 * 60 * 60 * 1000);
        startDate = thirtyDaysBack;
        endDate = new Date();
      } else {
        startDate = new Date(orderStartEndDTO.startDate);
        endDate = new Date(orderStartEndDTO.endDate);
      }
      const startDateFormated = moment(startDate, 'DD/MM/YYYY');
      const endDateFormated = moment(endDate, 'DD/MM/YYYY');
      const noOfDays = endDateFormated.diff(startDateFormated, 'days');
      const list = await Promise.all([
        this.orderService.totalSalesByFilter(startDate, endDate),
        this.categoryService.countActiveCategory(),
        this.productService.countAllProduct(),
        this.userService.countUserByFilter(startDate, endDate),
        this.orderService.totalPuchaseUserFilter(startDate, endDate),
      ]);

      // REVENUE SECTION
      const revenue = list[0];
      if (revenue.length) {
        totalRevenueWithTax = Number(
          this.utilService.convertToDecimal(revenue[0].totalSalesWithTax),
        );
        totalRevenueWithoutTax = Number(
          this.utilService.convertToDecimal(
            revenue[0].totalSalesWithTax - revenue[0].totalTax,
          ),
        );
        totalOrders = revenue[0].count;

        avgOrderWithTax = Number(
          this.utilService.convertToDecimal(
            revenue[0].totalSalesWithTax / noOfDays,
          ),
        );
        avgOrderWithoutTax = Number(
          this.utilService.convertToDecimal(
            (revenue[0].totalSalesWithTax - revenue[0].totalTax) / noOfDays,
          ),
        );
        avgTotalOrders = Number(
          this.utilService.convertToDecimal(revenue[0].count / noOfDays),
        );
      }

      // USER REGISTRATION SECTION
      const userRegistered = list[3];
      if (userRegistered) {
        registerUser = userRegistered;
        avgRegisterUser = Number(
          this.utilService.convertToDecimal(userRegistered / noOfDays),
        );
      }

      // USER PURCHASE SECTION
      const userPurchase = list[4];
      if (userPurchase) {
        purchaseUser = userPurchase;
        avgPurchaseUser = Number(
          this.utilService.convertToDecimal(userPurchase / noOfDays),
        );
      }

      const tableData = {
        totalRevenueWithTax,
        totalRevenueWithoutTax,
        totalOrders,

        avgOrderWithTax,
        avgOrderWithoutTax,
        avgTotalOrders,

        categoriesCount: list[1],
        productsCount: list[2],

        registerUser,
        avgRegisterUser,

        purchaseUser,
        avgPurchaseUser,
      };

      return this.utilService.successResponseData(tableData);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // GRAPH SECTION
  // category-mode-graph graph
  @Post('/admin/category-mode-graph')
  @ApiOperation({ title: 'Get category mode graph data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async categoryModeGraph(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      const query = {};
      if (orderGraphsDTO.graphType === 'TODAY') {
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YESTERDAY') {
        startDate = date.setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000;
        endDate = date.setHours(0, 0, 0, -999);
      }
      if (orderGraphsDTO.graphType === 'WEEK-TO-DATE') {
        const dayCode = date.getDay();
        if (dayCode) {
          startDate =
            date.setHours(0, 0, 0, 0) - (dayCode - 1) * 24 * 60 * 60 * 1000;
        } else {
          startDate = date.setHours(0, 0, 0, 0) - 6 * 24 * 60 * 60 * 1000;
        }
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTH-TO-DATE') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YEAR-TO-DATE') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      let orderAgg = await this.orderService.categoryModeGraph(
        startDate,
        endDate,
      );
      if (orderAgg && orderAgg.length) {
        orderAgg = JSON.parse(JSON.stringify(orderAgg));
        const IDS = orderAgg.map(data => {
          return data._id.category;
        });
        const category = await this.categoryService.getCategoryTitle(IDS);
        orderAgg = await this.utilService.categoryModeGraph(orderAgg, category);
      }
      return this.utilService.successResponseData(orderAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // product-mode-graph graph
  @Post('/admin/product-mode-graph')
  @ApiOperation({ title: 'Get product mode graph data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async productModeGraph(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      if (orderGraphsDTO.graphType === 'TODAY') {
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YESTERDAY') {
        startDate = date.setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000;
        endDate = date.setHours(0, 0, 0, -999);
      }
      if (orderGraphsDTO.graphType === 'WEEK-TO-DATE') {
        const dayCode = date.getDay();
        if (dayCode) {
          startDate =
            date.setHours(0, 0, 0, 0) - (dayCode - 1) * 24 * 60 * 60 * 1000;
        } else {
          startDate = date.setHours(0, 0, 0, 0) - 6 * 24 * 60 * 60 * 1000;
        }
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTH-TO-DATE') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YEAR-TO-DATE') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      const orderAgg = await this.orderService.productModeGraph(
        startDate,
        endDate,
        orderGraphsDTO.categoryId,
      );
      return this.utilService.successResponseData(orderAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // product-mode-table graph
  @Post('/admin/table-mode/top-product')
  @ApiOperation({ title: 'Get product mode table data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async productModeTable(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      if (orderGraphsDTO.graphType === 'TODAY') {
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YESTERDAY') {
        startDate = date.setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000;
        endDate = date.setHours(0, 0, 0, -999);
      }
      if (orderGraphsDTO.graphType === 'WEEK-TO-DATE') {
        const dayCode = date.getDay();
        if (dayCode) {
          startDate =
            date.setHours(0, 0, 0, 0) - (dayCode - 1) * 24 * 60 * 60 * 1000;
        } else {
          startDate = date.setHours(0, 0, 0, 0) - 6 * 24 * 60 * 60 * 1000;
        }
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTH-TO-DATE') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YEAR-TO-DATE') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      const orderAgg = await this.orderService.productModeTable(
        startDate,
        endDate,
      );
      return this.utilService.successResponseData(orderAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // Sales  graph
  @Post('/admin/sales-graph')
  @ApiOperation({ title: 'Get sales graph data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales  data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async salesGraph(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      if (orderGraphsDTO.graphType === 'DAILY') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTHLY') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      let orderAgg = await this.orderService.salesGraph(
        startDate,
        endDate,
        orderGraphsDTO.graphType,
      );
      if (orderAgg && orderAgg.length) {
        orderAgg = this.utilService.salesGraph(
          orderAgg,
          orderGraphsDTO.graphType,
        );
      }
      return this.utilService.successResponseData(orderAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // product-mode-graph graph
  @Post('/admin/payment-mode-graph')
  @ApiOperation({ title: 'Get product mode graph data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async paymentModeGraph(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      if (orderGraphsDTO.graphType === 'TODAY') {
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YESTERDAY') {
        startDate = date.setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000;
        endDate = date.setHours(0, 0, 0, -999);
      }
      if (orderGraphsDTO.graphType === 'WEEK-TO-DATE') {
        const dayCode = date.getDay();
        if (dayCode) {
          startDate =
            date.setHours(0, 0, 0, 0) - (dayCode - 1) * 24 * 60 * 60 * 1000;
        } else {
          startDate = date.setHours(0, 0, 0, 0) - 6 * 24 * 60 * 60 * 1000;
        }
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTH-TO-DATE') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'YEAR-TO-DATE') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      const orderAgg = await this.orderService.paymentModeGraph(
        startDate,
        endDate,
      );
      return this.utilService.successResponseData(orderAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // User registration
  @Post('/admin/user-graph')
  @ApiOperation({ title: 'Get registered user graph data' })
  @ApiResponse({
    status: 200,
    description: 'Return sales  data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async userRegisteredGraph(
    @GetUser() user: UsersDTO,
    @Body() orderGraphsDTO: OrderGraphsDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const date = new Date();
      let startDate, endDate;
      if (orderGraphsDTO.graphType === 'DAILY') {
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      if (orderGraphsDTO.graphType === 'MONTHLY') {
        date.setMonth(0);
        date.setDate(1);
        startDate = date.setHours(0, 0, 0, 0);
        endDate = new Date();
      }
      let userAgg = await this.userService.userGraph(
        startDate,
        endDate,
        orderGraphsDTO.graphType,
      );
      if (userAgg && userAgg.length) {
        userAgg = this.utilService.userGraph(userAgg, orderGraphsDTO.graphType);
      }
      return this.utilService.successResponseData(userAgg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/user-journey/:userId')
  @ApiOperation({ title: 'Get user-journey Details' })
  @ApiResponse({ status: 200, description: 'Return sales', type: String })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async orderUserJourney(
    @GetUser() user: UsersDTO,
    @Param('userId') userId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const list = await Promise.all([
        this.orderService.getUserJourneyDetail(userId),
        this.walletService.walletDetails(userId),
      ]);
      const res = {
        UserJourneyDetails: list[0],
        wallet: list[1],
      };
      return this.utilService.successResponseData(res);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // DATA FETCH FUNCTION TO SCRIPT
  dataFetch = async function(pageArr) {
    for (const item of pageArr) {
      let order = await this.orderService.orderScriptToUpdate(
        {},
        item.skip,
        item.limit,
      );
      if (order.length) {
        order = JSON.parse(JSON.stringify(order[0]));
        let cart = await this.cartService.getCartById(order.cartId);
        if (cart) {
          cart = JSON.parse(JSON.stringify(cart));
          if (cart.products.length) {
            for (const cartItem of cart.products) {
              const product = await this.productService.getProductDetail(
                cartItem.productId,
              );
              if (product) {
                (cartItem.categoryId = product.categoryId
                  ? product.categoryId.toString()
                  : null),
                  (cartItem.subCategoryId = product.subCategoryId
                    ? product.subCategoryId.toString()
                    : null);
              }
            }
          }
          await this.cartService.updateCart(order.cartId, cart);
        }
        order.cart = cart.products;
        await this.orderService.orderScriptToUpdateDetail(order._id, order);
        // console.log("ORDER ID UPDATED", order.orderID);
      }
    }
  };

  // SCRIPT TO UPDATE CART AND ORDER
  @Get('/admin/cart-order-update-script')
  @ApiOperation({ title: 'Cart order update script' })
  @ApiResponse({
    status: 200,
    description: 'Return sales table data',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  public async scriptToUpdate(): Promise<CommonResponseModel> {
    try {
      const count = await this.orderService.countAllOrder({});
      const pageCreation = function(count: any) {
        const limit = 1,
          arr = [];
        const noOfPage = Math.ceil(count / limit);
        for (let i = 1; i <= noOfPage; i++) {
          const p = (Number(i) - 1) * limit;
          arr.push({ skip: p, limit: limit });
        }
        return arr;
      };

      if (count) {
        const pageArr = pageCreation(count);
        if (pageArr && pageArr.length) {
          this.dataFetch(pageArr).then(function(d) {
            let check;
          }); // console.log("All Data fetched and updated")
        }
      }
      return this.utilService.successResponseData({
        message: 'Script started',
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  //webhook from Stripe to update payment status in db
  @Post('/webhook/stripe')
  public async webhookStripe(@Req() request: any) {
    try {
      const sig = request.headers['stripe-signature'];
      const event = await this.stripeService.webhookVerify(
        request.rawBody,
        sig,
      );

      if (event.data.object.metadata.PAYMENT_TYPE == PAYMENT_TYPE.ORDER) {
        if (
          event.data.object.metadata.USER_PLATFORM === USER_PLATFORM.WEB_APP
        ) {
          const amountTotal = event.data.object.amount_total / 100;

          switch (event.type) {
            case 'checkout.session.completed' ||
              'checkout.session.async_payment_succeeded':
              this.orderService.onSuccessPayment(
                event.data.object.client_reference_id,
                amountTotal,
                event.data.object,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_SUCCESS,
              );
            case 'checkout.session.async_payment_failed':
              this.orderService.onFailurePayment(
                event.data.object.client_reference_id,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_FAIL,
              );
            default:
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_PROCESSING,
              );
          }
        }

        if (
          event.data.object.metadata.USER_PLATFORM === USER_PLATFORM.USER_APP
        ) {
          const amountTotal = event.data.object.amount / 100;

          switch (event.type) {
            case 'payment_intent.succeeded':
              this.orderService.onSuccessPayment(
                event.data.object.metadata.orderId,
                amountTotal,
                event.data.object,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_SUCCESS,
              );
            case 'payment_intent.payment_failed':
              this.orderService.onFailurePayment(
                event.data.object.metadata.orderId,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_FAIL,
              );
            default:
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_PROCESSING,
              );
          }
        }
      }

      if (event.data.object.metadata.PAYMENT_TYPE == PAYMENT_TYPE.WALLET) {
        if (
          event.data.object.metadata.USER_PLATFORM === USER_PLATFORM.WEB_APP
        ) {
          const amountTotal = event.data.object.amount_total / 100;

          switch (event.type) {
            case 'checkout.session.completed' ||
              'checkout.session.async_payment_succeeded':
              this.walletService.onSuccessWalletPayment(
                event.data.object.client_reference_id,
                amountTotal,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_SUCCESS,
              );
            case 'checkout.session.async_payment_failed':
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_FAIL,
              );
            default:
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_PROCESSING,
              );
          }
        }

        if (
          event.data.object.metadata.USER_PLATFORM === USER_PLATFORM.USER_APP
        ) {
          const amountTotal = event.data.object.amount / 100;

          switch (event.type) {
            case 'payment_intent.succeeded':
              this.walletService.onSuccessWalletPayment(
                event.data.object.metadata.userId,
                amountTotal,
              );
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_SUCCESS,
              );
            case 'payment_intent.payment_failed':
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_FAIL,
              );
            default:
              return this.utilService.successResponseMsg(
                ResponseMessage.TRANSACTION_PROCESSING,
              );
          }
        }
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Post('/admin/pos-order')
  @ApiOperation({ title: 'Cart order update script' })
  @ApiResponse({
    status: 200,
    description: 'Return pos order success response',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async orderByPos(
    @GetUser() user: UsersDTO,
    @Body() posOrderData: OrderPosDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      posOrderData = JSON.parse(JSON.stringify(posOrderData));
      const productIds = posOrderData.cart.map(function(data) {
        return data['productId'];
      });
      posOrderData['products'] = productIds;
      const products = await this.productService.getProductByIds(productIds);
      const cartVerifyData = await this.cartService.verifyPosCart(
        products,
        posOrderData,
      );

      if (cartVerifyData.cartArr.length > 0)
        this.utilService.badRequest(cartVerifyData.cartArr);

      const settings = await this.settingService.getDeliveryTaxSettings();
      const order = {
        subTotal: 0,
        tax: 0,
        product: {
          title: '',
          imageUrl: '',
        },
        totalProduct: 0,
        grandTotal: 0,
        deliveryCharges: 0,
        deliveryInstruction: '',
        couponCode: 0,
        couponAmount: 0,
        transactionDetails: {
          transactionStatus: '',
          receiptUrl: '',
          transactionId: '',
          currency: '',
          paymentCount: 0,
          paymentMethod: '',
          transactionDate: 0,
          transactionAmount: 0,
        },
        address: null,
        user: null,
        userId: '',
        paymentType: '',
        orderStatus: OrderStatusType.CONFIRMED,
        paymentStatus: PaymentStatusType.PENDING,
        cartId: '',
        orderID: 0,
        deliveryDate: '',
        deliveryTime: '',
        isWalletUsed: false,
        usedWalletAmount: 0,
        amountRefunded: 0,
        currencySymbol: '',
        currencyCode: '',
        invoiceToken: '',
        orderType: '',
        orderFrom: posOrderData.channel,
        cart: [],
        cashCollected: false,
      };
      if (posOrderData.deliverySlotId) {
        const deliveryTimeSlots = await this.settingService.getDeliveryTimeSlots();
        const availableSlots = await this.settingService.getAvailableTimeSlot(
          deliveryTimeSlots['deliveryTimeSlots'],
        );
        const openSlots = [];
        availableSlots.map(day => {
          day.timings.map(time => {
            openSlots[time._id] = { date: day.date, slot: time.slot };
          });
        });

        const selectedTimeslot = openSlots[posOrderData.deliverySlotId];
        if (!selectedTimeslot)
          this.utilService.badRequest(
            ResponseMessage.DELIEVRY_SLOT_NOT_AVAILABLE,
          );

        order.deliveryDate = selectedTimeslot.date;
        order.deliveryTime = selectedTimeslot.slot;
      }

      order.subTotal = posOrderData.subTotal;
      order.tax = posOrderData.tax;
      order.grandTotal = posOrderData.grandTotal;
      order.deliveryCharges = posOrderData.deliveryCharges;
      order.currencyCode = settings.currencyCode;
      order.currencySymbol = settings.currencySymbol;
      order.orderType = posOrderData.orderType;
      order.transactionDetails = {
        transactionStatus: null,
        receiptUrl: null,
        transactionId: null,
        currency: null,
        paymentCount: 0,
        paymentMethod: null,
        transactionDate: Date.now(),
        transactionAmount: null,
      };
      order.couponCode = null;
      order.couponAmount = 0;

      if (posOrderData.deliveryAddress) {
        order.address = {
          address: posOrderData.deliveryAddress,
          flatNo: '',
          postalCode: '',
          addressType: '',
          apartmentName: '',
          landmark: '',
          location: '',
        };
      }

      order.user = {
        firstName: posOrderData.customerName,
        lastName: '',
        mobileNumber: posOrderData.customerMobileNumber,
        email: posOrderData.customerEmail,
        countryCode: '',
        countryName: '',
      };

      order.userId = null;
      order.paymentType = posOrderData.paymentType;
      order.cashCollected = posOrderData.cashCollected;
      if (posOrderData.cashCollected) {
        order.orderStatus = OrderStatusType.DELIVERED;
        order.paymentStatus = PaymentStatusType.SUCCESS;
      }
      order.cartId = null;
      order.totalProduct = posOrderData.cart.length;
      order.product = {
        title: posOrderData.cart[0]['productTitle'],
        imageUrl: posOrderData.cart[0]['imageUrl'],
      };
      // FOR GRAPH
      for (const item of posOrderData.cart) {
        item['_id'] = new ObjectID();
      }
      order.cart = posOrderData.cart;
      order.invoiceToken = await this.utilService.getUUID();
      const sequence = await this.sequenceService.getSequence();
      order.orderID = sequence
        ? sequence.sequenceNo
        : Math.floor(900000 * Math.random()) + 100000;

      const orderRes = await this.orderService.createOrder(order);
      if (orderRes)
        return this.utilService.successResponseMsg(
          ResponseMessage.ORDER_PLACED,
        );
      else this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/pos-list')
  @ApiOperation({ title: 'Get all pos order' })
  @ApiImplicitQuery({
    name: 'orderStatus',
    description: 'Get order details By Order status',
    required: false,
    type: String,
  })
  @ApiImplicitQuery({
    name: 'assignedToId',
    description: 'Get order details By Delivery-Boy Id',
    required: false,
    type: String,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Return list of order ',
    type: ResponseOrderForAdmin,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async posOder(
    @GetUser() user: UsersDTO,
    @Query() query: OrderFilterQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      if (query.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const page = Number(query.page) || AdminSettings.DEFAULT_PAGE_NUMBER;
      const limit = Number(query.limit) || AdminSettings.DEFAULT_PAGE_LIMIT;
      const orderFilter = { orderFrom: 'POS' };

      if (query.fromDate && query.toDate) {
        const FROM_DATE = new Date(query.fromDate).setHours(0, 0, 0, 0);
        const TO_DATE = new Date(query.toDate).setHours(23, 59, 59, 999);

        orderFilter['createdAt'] = { $gt: FROM_DATE, $lt: TO_DATE };
      }

      if (query.orderStatus) orderFilter['orderStatus'] = query.orderStatus;
      if (query.assignedToId) orderFilter['assignedToId'] = query.assignedToId;
      if (query.q) {
        const isNum = /^\d+$/.test(query.q);
        orderFilter['$or'] = [
          { 'user.email': { $regex: query.q, $options: 'i' } },
          { 'user.mobileNumber': { $regex: query.q, $options: 'i' } },
        ];
        if (isNum) orderFilter['$or'].push({ orderID: Number(query.q) });
      }
      const orders = await Promise.all([
        this.orderService.getAllOrder(orderFilter, page - 1, limit),
        this.orderService.countAllOrder(orderFilter),
      ]);
      return this.utilService.successResponseData(orders[0], {
        total: orders[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/pos-payment-update/:orderId')
  @ApiOperation({ title: 'POS Order payment status update' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async posOrderPaymentUpdate(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderPosPaymentUpdateDTO: OrderPosPaymentUpdateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));
      if (orderPosPaymentUpdateDTO.cashCollected) {
        order.cashCollected = orderPosPaymentUpdateDTO.cashCollected;
        order.orderStatus = OrderStatusType.DELIVERED;
        order.paymentStatus = PaymentStatusType.SUCCESS;
      }
      await this.orderService.orderDetailUpdate(order._id, order);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_UPDATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/update/:orderId')
  @ApiOperation({ title: 'Order update' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderUpdate(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderUpdateDTO: OrderUpdateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));
      let amountRefund;
      if (order.cart.length) {
        const cartIndex = order.cart.findIndex(
          data => data._id === orderUpdateDTO.product['_id'],
        );
        if (cartIndex !== -1) {
          const settings = await this.settingService.getDeliveryTaxSettings();
          if (order.paymentType !== PaymentType.COD) {
            amountRefund =
              order.cart[cartIndex]['productTotal'] -
              orderUpdateDTO.productTotal;
            if (order.cart[cartIndex]['isOrderModified'])
              order.cart[cartIndex][
                'amountRefundedOrderModified'
              ] += amountRefund;
            else
              order.cart[cartIndex][
                'amountRefundedOrderModified'
              ] = amountRefund;
            order.amountRefundedOrderModified =
              order.amountRefundedOrderModified + amountRefund;
          }
          if (!order.cart[cartIndex]['isOrderModified']) {
            order.cart[cartIndex]['originalUnit'] =
              order.cart[cartIndex]['unit'];
            order.cart[cartIndex]['originalPrice'] =
              order.cart[cartIndex]['price'];
            order.cart[cartIndex]['originalQuantity'] =
              order.cart[cartIndex]['quantity'];
            order.cart[cartIndex]['originalProductTotal'] =
              order.cart[cartIndex]['productTotal'];
          }
          order.subTotal =
            order.subTotal - order.cart[cartIndex]['productTotal'];
          order.cart[cartIndex]['unit'] = orderUpdateDTO.modifiedVolume;
          order.cart[cartIndex]['price'] = orderUpdateDTO.modifiedPrice;
          order.cart[cartIndex]['quantity'] = orderUpdateDTO.modifiedQuantity;
          order.cart[cartIndex]['dealAmount'] =
            orderUpdateDTO.modifiedDealAmount;
          order.cart[cartIndex]['productTotal'] = orderUpdateDTO.productTotal;
          order.cart[cartIndex]['isOrderModified'] = true;
          order.subTotal = Number(
            (order.subTotal + order.cart[cartIndex]['productTotal']).toFixed(2),
          );
          order.tax = Number(
            ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
          );
          order.usedWalletAmount = order.usedWalletAmount || 0;
          let couponDiscount = 0;
          if (order.couponCode) {
            const coupon = await this.couponService.findCouponByCode(
              order.couponCode,
            );
            if (coupon) {
              if (coupon.couponType === CouponType.PERCENTAGE)
                couponDiscount = Number(
                  (order.subTotal * (coupon.offerValue / 100)).toFixed(2),
                );
              else if (coupon.couponType === CouponType.AMOUNT)
                couponDiscount = Number(coupon.offerValue);
            }
          }
          order.couponAmount = couponDiscount;
          order.grandTotal = Number(
            (
              order.subTotal +
              order.deliveryCharges +
              order.tax -
              order.couponAmount -
              order.usedWalletAmount
            ).toFixed(2),
          );
        } else this.utilService.pageNotFound();
      }
      order.isOrderModified = true;
      //// console.log(JSON.stringify(order));
      await this.orderService.orderDetailUpdate(order._id, order);
      const userDetail = await this.userService.getUserById(order.userId);
      const notification: INotificationUser = {
        userId: userDetail._id,
        orderId: order._id,
        orderID: order.orderID,
        notifyType: NotificationType.ORDER_UPDATED,
      };

      if (userDetail && userDetail.playerId) {
        this.eventEmitter.emitAsync(
          notificationEvents.ORDER_UPDATED,
          new UserNotification(notification),
        );
      } //"OrderUpdate"

      this.socketService.sendOrderStatusNotificationToAdmin(notification);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_UPDATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Delete('/admin/item-delete/:orderId/:itemId')
  @ApiOperation({ title: 'Order item delete' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderCartItemDelete(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      // console.log("orderId", orderId)
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));
      let amountRefund;
      if (order.cart.length) {
        const cartIndex = order.cart.findIndex(
          data => data._id.toString() === itemId,
        );
        // console.log("cartIndex", cartIndex)
        if (cartIndex !== -1) {
          const settings = await this.settingService.getDeliveryTaxSettings();
          if (order.paymentType !== PaymentType.COD) {
            order.amountRefundedOrderModified =
              order.amountRefundedOrderModified +
              order.cart[cartIndex]['productTotal'];
          }
          order.subTotal = Number(
            (order.subTotal - order.cart[cartIndex]['productTotal']).toFixed(2),
          );
          order.itemCancellList.push(order.cart[cartIndex]);
          order.cart.splice(cartIndex, 1);
          order.tax = Number(
            ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
          );

          order.usedWalletAmount = order.usedWalletAmount || 0;
          let couponDiscount = 0;
          if (order.couponCode) {
            const coupon = await this.couponService.findCouponByCode(
              order.couponCode,
            );
            if (coupon) {
              if (coupon.couponType === CouponType.PERCENTAGE)
                couponDiscount = Number(
                  (order.subTotal * (coupon.offerValue / 100)).toFixed(2),
                );
              else if (coupon.couponType === CouponType.AMOUNT)
                couponDiscount = Number(coupon.offerValue);
            }
          }
          order.couponAmount = couponDiscount;

          order.grandTotal = Number(
            (
              order.subTotal +
              order.deliveryCharges +
              order.tax -
              order.couponAmount -
              order.usedWalletAmount
            ).toFixed(2),
          );
          order.isOrderModified = true;
        } else this.utilService.pageNotFound();
      }

      if (order.cart.length === 0) {
        // console.log("cancel")
        order.orderStatus = OrderStatusType.CANCELLED;
        if (order.paymentType === PaymentType.COD) {
          // console.log("cancel IF")
          if (order.usedWalletAmount) {
            // console.log("cancel if wallet")
            const amountRefund = order.usedWalletAmount;
            if (amountRefund !== 0) {
              const wallet: WalletSaveDTO = {
                userId: order.userId,
                amount: amountRefund,
                transactionType: WalletTransactionType.ORDER_CANCELLED,
                orderId: order._id,
                orderID: order.orderID,
              };
              const placed = await Promise.all([
                this.walletService.cancelOrder(wallet),
                this.userService.updateWallet(order.userId, amountRefund),
              ]);
            }
            order.amountRefunded = amountRefund;
          }
        } else {
          // console.log("cancel else")
          const amountRefund = order.amountRefundedOrderModified;
          if (amountRefund !== 0) {
            const wallet: WalletSaveDTO = {
              userId: order.userId,
              amount: amountRefund,
              transactionType: WalletTransactionType.ORDER_CANCELLED,
              orderId: order._id,
              orderID: order.orderID,
            };
            const placed = await Promise.all([
              this.walletService.cancelOrder(wallet),
              this.userService.updateWallet(order.userId, amountRefund),
            ]);
          }
          order.amountRefunded = amountRefund;
        }
      }
      order.isOrderModified = true;
      order.isProductDeleted = true;
      // console.log("orderUpdateDTO", JSON.stringify(order));
      await this.orderService.orderDetailUpdate(order._id, order);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_DELETED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/add-item/:orderId')
  @ApiOperation({ title: 'Order add item in cart' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderAddItem(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderData: OrderAddItemDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));

      const product = await this.productService.getProductDetail(
        orderData.productId,
      );
      if (!product)
        this.utilService.badRequest(ResponseMessage.PRODUCT_NOT_FOUND);
      const productPrice = this.cartService.calculateProductPrice(product, {
        unit: orderData.variant['unit'],
        quantity: orderData.quantity,
      });

      if (!productPrice)
        this.utilService.badRequest(ResponseMessage.PRODUCT_NOT_FOUND);

      const settings = await this.settingService.getDeliveryTaxSettings();
      productPrice['_id'] = new ObjectID();

      order.cart.push(productPrice);
      order.subTotal = Number(
        (order.subTotal + productPrice['productTotal']).toFixed(2),
      );
      order.tax = Number(
        ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
      );

      order.usedWalletAmount = order.usedWalletAmount || 0;
      let couponDiscount = 0;
      if (order.couponCode) {
        const coupon = await this.couponService.findCouponByCode(
          order.couponCode,
        );
        if (coupon) {
          if (coupon.couponType === CouponType.PERCENTAGE)
            couponDiscount = Number(
              (order.subTotal * (coupon.offerValue / 100)).toFixed(2),
            );
          else if (coupon.couponType === CouponType.AMOUNT)
            couponDiscount = Number(coupon.offerValue);
        }
      }
      order.couponAmount = couponDiscount;
      order.grandTotal = Number(
        (
          order.subTotal +
          order.deliveryCharges +
          order.tax -
          order.couponAmount -
          order.usedWalletAmount
        ).toFixed(2),
      );
      order.isOrderModified = true;

      if (order.paymentType !== PaymentType.COD) {
        order.amountRefundedOrderModified =
          order.amountRefundedOrderModified - productPrice.productTotal;
      }
      order.isOrderModified = true;
      await this.orderService.orderDetailUpdate(order._id, order);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_UPDATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/pos/add-item/:orderId')
  @ApiOperation({ title: 'Order pos add item in cart' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderPosAddItem(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderData: OrderAddItemDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));

      const product = await this.productService.getProductDetail(
        orderData.productId,
      );
      if (!product)
        this.utilService.badRequest(ResponseMessage.PRODUCT_NOT_FOUND);
      const settings = await this.settingService.getDeliveryTaxSettings();

      const productPrice = this.cartService.calculatePosProductPrice(product, {
        unit: orderData.variant['unit'],
        quantity: orderData.quantity,
      });

      if (!productPrice)
        this.utilService.badRequest(ResponseMessage.PRODUCT_NOT_FOUND);

      productPrice['isOrderModified'] = true;
      productPrice['isOrderAdded'] = true;
      productPrice['_id'] = new ObjectID();

      order.cart.push(productPrice);
      order.subTotal = Number(
        (order.subTotal + productPrice['productTotal']).toFixed(2),
      );
      order.tax = Number(
        ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
      );

      order.grandTotal = Number(
        (order.subTotal + order.deliveryCharges + order.tax).toFixed(2),
      );
      order.isOrderModified = true;
      // console.log("order", JSON.stringify(order));

      await this.orderService.orderDetailUpdate(order._id, order);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_UPDATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Delete('/admin/pos/item-delete/:orderId/:itemId')
  @ApiOperation({ title: 'Order pos item delete' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderPosCartItemDelete(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));

      const settings = await this.settingService.getDeliveryTaxSettings();
      if (order.cart.length) {
        const cartIndex = order.cart.findIndex(
          data => data._id.toString() === itemId,
        );
        // console.log("cartIndex", cartIndex)
        if (cartIndex !== -1) {
          order.subTotal = Number(
            (order.subTotal - order.cart[cartIndex]['productTotal']).toFixed(2),
          );
          order.cart.splice(cartIndex, 1);
          order.tax = Number(
            ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
          );

          order.grandTotal = Number(
            (order.subTotal + order.deliveryCharges + order.tax).toFixed(2),
          );
          order.isOrderModified = true;

          await this.orderService.orderDetailUpdate(order._id, order);

          return this.utilService.successResponseMsg(
            ResponseMessage.ORDER_DELETED,
          );
        } else this.utilService.pageNotFound();
      }
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Put('/admin/pos/update/:orderId')
  @ApiOperation({ title: 'Order pos update' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async posOrderUpdate(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
    @Body() orderUpdateDTO: OrderUpdateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      let order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();
      order = JSON.parse(JSON.stringify(order));
      const settings = await this.settingService.getDeliveryTaxSettings();
      if (order.cart.length) {
        const cartIndex = order.cart.findIndex(
          data => data._id === orderUpdateDTO.posOrderProduct['_id'],
        );
        // console.log(cartIndex)
        if (cartIndex !== -1) {
          if (!order.cart[cartIndex]['isOrderModified']) {
            order.cart[cartIndex]['originalUnit'] =
              order.cart[cartIndex]['unit'];
            order.cart[cartIndex]['originalPrice'] =
              order.cart[cartIndex]['price'];
            order.cart[cartIndex]['originalQuantity'] =
              order.cart[cartIndex]['quantity'];
            order.cart[cartIndex]['originalProductTotal'] =
              order.cart[cartIndex]['productTotal'];
          }

          const amountRefund = order.cart[cartIndex]['productTotal'];
          order.cart[cartIndex]['unit'] = orderUpdateDTO.modifiedVolume;
          order.cart[cartIndex]['productPrice'] = orderUpdateDTO.modifiedPrice;
          order.cart[cartIndex]['quantity'] = orderUpdateDTO.modifiedQuantity;
          order.cart[cartIndex]['dealAmount'] =
            orderUpdateDTO.modifiedDealAmount;
          order.cart[cartIndex]['productTotal'] = orderUpdateDTO.productTotal;
          order.cart[cartIndex]['isOrderModified'] = true;

          order.subTotal = Number(
            (
              order.subTotal -
              amountRefund +
              order.cart[cartIndex]['productTotal']
            ).toFixed(2),
          );
          order.tax = Number(
            ((order.subTotal * settings.taxAmount) / 100).toFixed(2),
          );

          order.grandTotal = Number(
            (order.subTotal + order.deliveryCharges + order.tax).toFixed(2),
          );
          order.isOrderModified = true;
        } else this.utilService.pageNotFound();
      }
      //// console.log("order", JSON.stringify(order));

      await this.orderService.orderDetailUpdate(order._id, order);
      return this.utilService.successResponseMsg(ResponseMessage.ORDER_UPDATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/cut-off/:orderId')
  @ApiOperation({ title: 'Get cut-off amount' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async getCutOffAmount(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const order = await this.orderService.getOrderDetail(orderId);
      if (!order) this.utilService.pageNotFound();

      const data = await Promise.all([
        this.settingService.getMaxWalletAmountUsed(),
        this.userService.getUserInfo(order.userId),
      ]);

      const maxWalletAmountUsed = data[0] ? data[0] : 0;
      const walletAmount = data[1] ? data[1].walletAmount : 0;
      order.amountRefundedOrderModified =
        order.amountRefundedOrderModified || 0;

      // console.log({ maxWalletAmountUsed })
      // console.log({ walletAmount })
      // console.log(order.amountRefundedOrderModified)

      const cutOffAmount =
        maxWalletAmountUsed + walletAmount + order.amountRefundedOrderModified;
      return this.utilService.successResponseData({ cutOffAmount });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/notify-mail/:orderId')
  @ApiOperation({ title: 'Order notify mail sent' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseDataOfOrder,
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
  public async orderUpdateNotifyMailAndPush(
    @GetUser() user: UsersDTO,
    @Param('orderId') orderId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const orderDetail = await this.orderService.getOrderDetail(orderId);
      if (!orderDetail)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      const orders = await Promise.all([
        this.cartService.getCartById(orderDetail.cartId),
        this.businessService.getBusinessDetail(),
        this.userService.getUserById(orderDetail.userId),
      ]);

      const userDetail = orders[2];
      if (user.playerId) {
        const title = await this.utilService.getTranslatedMessageByKey(
          ResponseMessage.USER_NOTIFY_ORDER_MODIFIED_TITLE,
        );
        let desc = await this.utilService.getTranslatedMessageByKey(
          ResponseMessage.USER_NOTIFY_ORDER_MODIFIED_DESC,
        );
        desc = desc.replace('${orderID}', orderDetail.orderID);
        this.pushService.sendNotificationToUser(user.playerId, title, desc);
      }

      this.emailService.sendEmailOrderDelivered(
        orderDetail,
        orders[0],
        orders[1],
      );
      return this.utilService.successResponseMsg(ResponseMessage.MAIL_SENT);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
  @Get('/admin/exports')
  @ApiOperation({ title: 'Export all orders as xlsx file' })
  @ApiResponse({
    status: 200,
    description: 'Export all products as xlsx file',
    type: String,
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
  public async excelExports(
    @GetUser() user: UsersDTO,
    @Query() exportFilter: ExportFilter,
  ) {
    this.utilService.validateAdminRole(user);
    try {
      const count = await this.orderService.countAllOrder({});
      if (!count) this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      const order = await this.orderService.getOrderForExport(exportFilter);
      if (!order && order.length)
        this.utilService.badRequest(ResponseMessage.ORDER_NOT_FOUND);

      const productList = [];
      for (const item of order) {
        for (const items of item.cart) {
          const manaualOrder = item.isSubscriptionOrder ? 0 : items.quantity;
          const subscriptionCount = item.isSubscriptionOrder
            ? items.quantity
            : 0;
          const obj = {
            orderID: item.orderID,
            Name: item.user.firstName,
            mobileNumber: item.user.mobileNumber,
            address: item.address ? item.address.address : null,
            pincode: item.address ? item.address.postalCode : null,
            categoryName: items.categoryName,
            subCategoryName: items.subCategoryName,
            productName: items.productName,
            sku: items.sku,
            createdAt: item.createdAt,
            variantName: items.unit,
            productTotal: items.productTotal,
            paymentType: item.paymentType,
            paymentStatus: item.paymentStatus,
            deliveryTime: item.deliveryTime,
            subscriptionCount: subscriptionCount,
            manaualOrder: manaualOrder,
            totalOrder: subscriptionCount + manaualOrder,
          };
          productList.push(obj);
        }
      }
      const exportedRes = await this.excelService.exportOrderList({
        ordersList: productList,
      });
      return this.utilService.successResponseData(exportedRes);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // Not used can remove later
  @Get('/test-api/update/sku')
  @ApiOperation({ title: 'Update data' })
  @ApiResponse({
    status: 200,
    description: 'Export all products as xlsx file',
    type: String,
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
  public async testUpdate(@GetUser() user: UsersDTO) {
    try {
      const promise = await Promise.all([
        this.orderService.testGet(),
        this.productService.getTestAllProd(),
      ]);
      const orders = promise[0];
      const products = promise[1];

      if (orders.length) {
        for (const item of orders) {
          for (const cart of item.cart) {
            const findProduct = products.find(
              d => d._id.toString() === cart.productId.toString(),
            );
            if (findProduct) {
              cart.categoryName = findProduct.categoryName;
              cart.subCategoryName = findProduct.subCategoryName;
              cart.sku = findProduct.sku;
            }
          }
          await this.orderService.testUpdate(item);

          // console.log("item:-", JSON.stringify(item))
        }
      }

      // update cart
      // let promise = await  Promise.all([
      // 	this.cartService.testGet(),
      // 	this.productService.getTestAllProd()
      // ])
      // let carts = promise[0];
      // let products = promise[1];

      // if(carts.length){
      // 	for(let item of carts){
      // 		for(let cart of item.products){
      // 			let findProduct = products.find( d => d._id.toString() === cart.productId.toString())
      // 			if(findProduct){
      // 				cart.categoryName = findProduct.categoryName;
      // 				cart.subCategoryName = findProduct.subCategoryName;
      // 				cart.sku = findProduct.sku;
      // 			}
      // 		}
      // 		await this.cartService.testUpdate(item),

      // 		console.log("item:-", JSON.stringify(item))

      // 	}
      // }
      return this.utilService.successResponseData({ message: 'success' });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
}
