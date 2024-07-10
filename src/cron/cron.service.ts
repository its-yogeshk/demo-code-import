import { Injectable, Logger } from '@nestjs/common';
import { UtilService } from '../utils/util.service';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription/subscription.service';
import { SettingService } from '../settings/settings.service';
import { OrderService } from '../order/order.service';
import { WalletService } from '../wallet/wallet.service';
import { SequenceService } from '../sequence/sequence.service';
import { NotificationService } from '../notifications/notifications.service';
import { PushService } from '../utils/push.service';
import { AppGateway } from '../app.gateway';
import { UserService } from '../users/users.service';
import {
  SubscriptionSchedule,
  SubscriptionStatus,
} from '../subscription/subscription.model';
import {
  PaymentStatusType,
  OrderStatusType,
  TransactionStatusType,
} from '../order/order.model';
import { ShippingMethod } from '../settings/settings.model';
import { PaymentType } from '../utils/app.model';
import {
  NotificationsSaveDTO,
  NotificationType,
  INotificationUser,
} from '../notifications/notifications.model';
import { WalletSaveDTO } from '../wallet/wallet.model';
import { SubscriptionStatusService } from '../subscription-status/subscription-status.service';
import { LogManagerService } from '../log-manager/log-manager.service';
import { ILogManager, LoggerOf } from '../log-manager/log-manager.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  notificationEvents,
  UserNotification,
  UsersNotification,
} from '../utils/event';

let timeZone: string;
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name, true);
  private fullDate: Date;
  private date: number;
  private month: number;
  private year: number;
  constructor(
    private utilService: UtilService,
    private subscriptionService: SubscriptionService,
    private settingService: SettingService,
    private orderService: OrderService,
    private walletService: WalletService,
    private sequenceService: SequenceService,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
    private notificationService: NotificationService,
    private pushService: PushService,
    private socketService: AppGateway,
    private subscriptionStatusService: SubscriptionStatusService,
    private logManager: LogManagerService,
  ) {
    timeZone = this.utilService.getTimeZone();
    this.setDate();
  }

  private setDate() {
    const {
      fullDate,
      date,
      month,
      year,
    } = this.utilService.getTimeByTimeZone();
    this.fullDate = fullDate;
    this.date = date;
    this.month = month;
    this.year = year;
  }

  // SERVICE TO CHECK PAUSE
  public checkPause(element) {
    const timeZonePauseStartDate = this.utilService.getTimeByTimeZone(
      element.pauseStartDate,
    );
    const timeZoneEndDate = this.utilService.getTimeByTimeZone(
      element.pauseEndDate,
    );

    let pauseStartDate = timeZonePauseStartDate.fullDate;
    const pauseEndDate = timeZoneEndDate.fullDate;

    pauseStartDate.setHours(0, 0, 0, 0);
    pauseStartDate = new Date(pauseStartDate);

    let today = this.utilService.getTimeByTimeZone(element.pauseEndDate)
      .fullDate;
    today.setHours(0, 10, 0, 0);
    today = new Date(today);

    if (
      new Date(pauseStartDate).getTime() <= today.getTime() &&
      pauseEndDate.getTime() >= today.getTime()
    )
      element.subscriptionTodayStatus = 'INACTIVE';
    else element.subscriptionTodayStatus = 'PENDING';

    return element;
  }

  // Update Subscriptions Todays Status
  public updateTodayStatus(subscription, logId: string) {
    if (subscription.status === SubscriptionStatus.PAUSE) {
      const pauseRes = this.checkPause(subscription);
      if (pauseRes.subscriptionTodayStatus === 'INACTIVE') {
        const subscriptionStatusData = {
          status: 'PAUSE',
          description: 'Pause by user',
          userId: subscription.userId,
          subscriptionId: subscription._id,
        };
        this.subscriptionStatusService.createSubscriptionStatus(
          subscriptionStatusData,
        );
        this.logManager.appendToFailedList(logId, {
          id: subscription._id,
          reason: `Subscription is paused by User`,
        });
      } else {
        this.logManager.appendToSuccessList(logId, subscription._id);
      }
      subscription.subscriptionTodayStatus = pauseRes.subscriptionTodayStatus;
    } else {
      this.logManager.appendToSuccessList(logId, subscription._id);
      subscription.subscriptionTodayStatus = 'PENDING';
    }

    return subscription;
  }

  // SERVICE TO CREATE ORDER
  public async serviceSubscriptionOrderCreate(
    subscriptionData: any,
    settings,
    updateLog: (data: {
      successId?: string;
      failedData?: { id: string; reason: string };
    }) => void,
  ) {
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
      orderFrom: subscriptionData.orderFrom,
      cart: [],
      isSubscriptionOrder: true,
      subscriptionId: null,
    };
    const userData = await this.userService.getUserInfo(
      subscriptionData.userId,
    );

    if (!userData) {
      updateLog({
        failedData: { id: subscriptionData._id, reason: 'User not found' },
      });
      this.logger.error(
        `User: ${subscriptionData.userId} of Subscription: ${
          subscriptionData._id
        } not found to place its scheduled order`,
      );
      return;
    }

    const subscriptionProduct = subscriptionData.products[0];

    if (userData.walletAmount >= subscriptionProduct.subscriptionTotal) {
      order.address = subscriptionData.address;
      order.user = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        mobileNumber: userData.mobileNumber,
        email: userData.email,
        countryCode: userData.countryCode,
        countryName: userData.countryName,
      };
      const cart = {
        productImages: subscriptionProduct.productImages,
        productId: subscriptionProduct.productId,
        productName: subscriptionProduct.productName,
        unit: subscriptionProduct.unit,
        price: subscriptionProduct.subScriptionAmount,
        quantity: subscriptionProduct.quantity,
        productTotal: subscriptionProduct.subscriptionTotal,
        imageUrl: subscriptionProduct.imageUrl,
        filePath: subscriptionProduct.filePath,
        dealAmount: 0,
        dealTotalAmount: 0,
        isDealAvailable: false,
        categoryId: subscriptionProduct.categoryId,
        subCategoryId: subscriptionProduct.subCategoryId,
        categoryName: subscriptionProduct.categoryName
          ? subscriptionProduct.categoryName
          : null,
        subCategoryName: subscriptionProduct.subCategoryName
          ? subscriptionProduct.subCategoryName
          : null,
        sku: subscriptionProduct.sku ? subscriptionProduct.sku : null,
      };

      order.cart = [cart];
      order.userId = userData._id;
      order.deliveryAddress = order.address._id;

      order.paymentStatus = PaymentStatusType.SUCCESS;
      order.orderStatus = OrderStatusType.PENDING;
      order.shippingMethod = ShippingMethod.DELIVERY;
      order.paymentType = PaymentType.WALLET;
      order.totalProduct = subscriptionData.products.length;
      order.product = {
        title: subscriptionData.products[0].productName,
        imageUrl: subscriptionProduct.productImages[0].imageUrl,
      };
      const taxInfo = {
        taxName: settings.taxName,
        amount: '0',
      };

      order.taxInfo = taxInfo;
      order.invoiceToken = await this.utilService.getUUID();
      const sequence = await this.sequenceService.getSequence();
      order.orderID = sequence
        ? sequence.sequenceNo
        : Math.floor(900000 * Math.random()) + 100000;

      order.subTotal = subscriptionProduct.subscriptionTotal;
      order.tax = 0;
      order.usedWalletAmount = order.subTotal;
      order.grandTotal = 0;
      order.isWalletUsed = true;
      order.deliveryCharges = 0;
      order.transactionDetails.transactionDate = Date.now();
      order.transactionDetails.transactionAmount = order.subTotal;
      order.transactionDetails.transactionStatus =
        TransactionStatusType.SUCCESS;
      order.currencyCode = settings.currencyCode;
      order.currencySymbol = settings.currencySymbol;
      order.subscriptionId = subscriptionData._id;

      const orderRes = await this.orderService.createOrder(order);
      if (!orderRes) {
        updateLog({
          failedData: {
            id: subscriptionData._id,
            reason: 'Unable to place order to DB',
          },
        });
        this.logger.error(
          `Unable to place order to DB of Subscription: ${
            subscriptionData._id
          }`,
        );
        return;
      }

      const walletPayment: WalletSaveDTO = {
        userId: userData._id,
        orderId: orderRes._id,
        orderID: orderRes.orderID,
        amount: orderRes.usedWalletAmount,
      };

      const notification: INotificationUser = {
        userId: userData._id,
        orderId: orderRes._id,
        orderID: orderRes.orderID,
        notifyType: NotificationType.SUBSCRIPTION_ORDER_PLACED,
        subscriptionId: orderRes.subscriptionId,
      };

      const subscriptionStatusData = {
        status: 'COMPLETED',
        description: 'order created',
        userId: subscriptionData.userId,
        subscriptionId: subscriptionData._id,
      };

      subscriptionData.subscriptionTodayStatus = 'COMPLETED';

      const [Status] = await Promise.all([
        this.subscriptionStatusService.createSubscriptionStatus(
          subscriptionStatusData,
        ),
        this.walletService.madeOrder(walletPayment),
        this.userService.updateWallet(userData._id, -orderRes.usedWalletAmount),
        //this.notificationService.createForOrderPlaced(notification),
        this.subscriptionService.updateSubscription(
          subscriptionData._id,
          subscriptionData,
        ),
      ]);

      updateLog({ successId: subscriptionData._id });
      this.logger.log(`Order Place for Subscription: ${subscriptionData._id}`);

      if (Status)
        await this.orderService.orderDetailUpdate(orderRes._id, {
          subscriptionStatusId: Status._id,
        });

      if (userData.playerId) {
        //const title = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_NOTIFY_ORDER_PLACED_TITLE);
        //let desc = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_NOTIFY_ORDER_PLACED_DESC);
        //desc = desc.replace('${orderID}', orderRes.orderID);
        //this.pushService.sendNotificationToUser(userData.playerId, title, desc);
        this.eventEmitter.emitAsync(
          notificationEvents.SUBSCRIPTION_ORDER_CREATED,
          new UserNotification(notification),
        );
      }
      // this.emailService.sendEmailForPlacedOrder(orderRes, userCart);
      this.socketService.sendOrderStatusNotificationToAdmin(notification);
    } else {
      const notification: NotificationsSaveDTO = {
        subscriptionId: subscriptionData._id,
        userId: subscriptionData.userId,
      };
      const subscriptionStatusData = {
        status: 'FAILED',
        description: 'INSUFFICIENT BALANCE',
        userId: subscriptionData.userId,
        subscriptionId: subscriptionData._id,
      };

      this.subscriptionStatusService.createSubscriptionStatus(
        subscriptionStatusData,
      );
      if (userData.playerId) {
        this.eventEmitter.emitAsync(
          notificationEvents.INSUFFICEIENT_BALANCE,
          new UsersNotification(notification),
        );
      }

      this.notificationService.sufficientPlaced(notification);
      this.socketService.sendOrderStatusNotificationToAdmin(notification);

      //subscriptionData.subscriptionTodayStatus = "COMPLETED";
      //this.subscriptionService.updateSubscription(subscriptionData._id, subscriptionData);

      updateLog({
        failedData: {
          id: subscriptionData._id,
          reason: 'Insufficient Wallet Amount',
        },
      });
      this.logger.log(
        `User: ${subscriptionData.userId} of Subscription: ${
          subscriptionData._id
        } has insufficient wallet amount to place its scheduled order`,
      );
    }
  }

  // (CRON JOB FUNCTION) TO CREATE ORDER
  public async cronJobOrderCreate() {
    this.logger.log(`${this.cronJobOrderCreate.name} Initiated`);
    this.setDate();
    const LogData: ILogManager = {
      day: this.date,
      month: this.month,
      year: this.year,
      date: this.fullDate,
      total: 0,
      logOf: LoggerOf.CRON_SUB_ORDER,
      startedAt: new Date().getTime(),
    };

    const NewLog = await this.logManager.create(LogData);
    this.logger.log(`Log Created: Cron for order create Initiated`);

    const [settings, activeSubscriptionList] = await Promise.all([
      this.settingService.getDeliveryTaxSettings(),
      this.subscriptionService.getAllActiveSubscription(),
    ]);

    if (!activeSubscriptionList.length) {
      LogData.successful = 0;
      LogData.failed = 0;
      LogData.finishedAt = new Date().getTime();

      this.logManager.update(NewLog._id, LogData);
      this.logger.log(`Log Updated: Active Subscription List Empty`);
      return;
    }

    this.logManager.update(NewLog._id, {
      total: activeSubscriptionList.length,
    });

    let counter = 0;

    function incrementCounter(data: {
      successId?: string;
      failedData?: { id: string; reason: string };
    }) {
      counter++;

      const { successId, failedData } = data;

      if (successId) {
        this.logManager.appendToSuccessList(NewLog._id, successId);
      }

      if (failedData) {
        this.logManager.appendToFailedList(NewLog._id, failedData);
      }

      if (counter === activeSubscriptionList.length) {
        this.logManager.update(NewLog._id, {
          finishedAt: new Date().getTime(),
        });
        this.logger.log(`LogUpdated: Cron Order Place Completed`);
      }
    }

    const bIncrementCounter = incrementCounter.bind(this);

    for (const subscription of activeSubscriptionList) {
      await this.serviceSubscriptionOrderCreate(
        subscription,
        settings,
        bIncrementCounter,
      );
    }
  }

  // (CRON JOB FUNCTION) IT WILL UPDATE STATUS FOR TODAY ORDER
  public async cronScheduleJobForSubscription() {
    this.logger.log(`${this.cronScheduleJobForSubscription.name} Initiated`);
    this.setDate();
    const LogData: ILogManager = {
      day: this.date,
      month: this.month,
      year: this.year,
      date: this.fullDate,
      total: 0,
      logOf: LoggerOf.CRON_SUBSCRIPTION,
      startedAt: new Date().getTime(),
    };

    const NewLog = await this.logManager.create(LogData);
    this.logger.log(`Log Created: Cron for today status Initiated`);

    const SubscriptionList = await this.subscriptionService.getAllSubscription();

    if (!SubscriptionList.length) {
      LogData.successful = 0;
      LogData.failed = 0;
      LogData.finishedAt = new Date().getTime();

      this.logManager.update(NewLog._id, LogData);
      this.logger.log(`Log Updated: Subscription List Empty`);
      return;
    }

    const SubList = JSON.parse(JSON.stringify(SubscriptionList));

    this.logManager.update(NewLog._id, { total: SubList.length });

    for (let subscription of SubList) {
      const SubscriptionStartTime = this.utilService.getTimeByTimeZone(
        subscription.subscriptionStartDate,
      ).timestamp;
      const CurrentTime = this.utilService.getTimeByTimeZone().timestamp;

      if (SubscriptionStartTime <= CurrentTime) {
        const PassedTime = CurrentTime - SubscriptionStartTime;
        const PassedDays = Math.ceil(PassedTime / (1000 * 60 * 60 * 24));

        if (
          subscription.schedule === SubscriptionSchedule.DAILY ||
          (subscription.schedule === SubscriptionSchedule.ALTERNATE &&
            PassedDays % 2 == 0) ||
          (subscription.schedule === SubscriptionSchedule.EVERY_3_DAY &&
            PassedDays % 3 == 0) ||
          (subscription.schedule === SubscriptionSchedule.WEEKLY &&
            PassedDays % 7 == 0) ||
          (subscription.schedule === SubscriptionSchedule.MONTHLY &&
            PassedDays % 30 == 0)
        ) {
          subscription = this.updateTodayStatus(subscription, NewLog._id);
        } else {
          this.logManager.appendToFailedList(NewLog._id, {
            id: subscription._id,
            reason: `Does not fall under ${subscription.schedule} schedule`,
          });
        }

        await this.subscriptionService.updateSubscription(
          subscription._id,
          subscription,
        );
      } else {
        this.logManager.appendToFailedList(NewLog._id, {
          id: subscription._id,
          reason: `Subscription not started yet`,
        });
      }
    }

    this.logManager.update(NewLog._id, { finishedAt: new Date().getTime() });
    this.logger.log(`Log Updated: Cron for update status Complete`);
  }

  // ##################   CRON STARTER ####################
  // mins, hrs
  @Cron('00 01 * * *', {
    name: 'Prepare Subscriptions',
    timeZone: timeZone,
  })
  runEveryMidNight() {
    this.logger.debug('Prepare Subscription Cron Initialized');
    this.cronScheduleJobForSubscription();
  }

  @Cron('00 06 * * *', {
    name: 'Subscription Orders',
    timeZone: timeZone,
  })
  async runEveryMorning() {
    this.logger.debug('Place Subscriptions Order Cron Initialized');
    this.cronJobOrderCreate();
  }
}
