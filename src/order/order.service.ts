import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationService } from '../notifications/notifications.service';
import {
  NotificationSaveDTO,
  NotificationType,
} from '../notifications/notifications.model';
import { UserService } from '../users/users.service';
import {
  GraphTotalCountDTO,
  OrderStatusType,
  PaymentStatusType,
  TransactionStatusType,
  ExportFilter,
} from './order.model';

import { ResponseMessage } from '../utils/app.model';
import { UtilService } from '../utils/util.service';
import { PushService } from '../utils/push.service';
import { EmailService } from '../utils/email.service';
import { AppGateway } from '../app.gateway';
import { WalletSaveDTO, WalletTransactionType } from '../wallet/wallet.model';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../products/products.service';
import { ProductOutOfStockService } from '../product-out-of-stock/product-out-of-stock.service';
import { WalletService } from '../wallet/wallet.service';

import { LoyaltyService } from '../loyalty/loyalty.service';
import { LoyaltyCreateDTO, LoyaltyType } from '../loyalty/loyalty.model';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Setting') private readonly settingModel: Model<any>,
    private userService: UserService,
    private notificationService: NotificationService,
    private utilService: UtilService,
    private pushService: PushService,
    private emailService: EmailService,
    private socketService: AppGateway,
    private cartService: CartService,
    private productService: ProductService,
    private productOutOfStockService: ProductOutOfStockService,
    private walletService: WalletService,
    private loyaltyService: LoyaltyService,
  ) {}

  // ########################################################### USER ###########################################################
  // Get all order for user
  public async getAllOrderForUser(
    isSubscriptionOrder,
    userId: string,
    page: number,
    limit: number,
  ): Promise<Array<any>> {
    let query;
    if (isSubscriptionOrder) query = { userId: userId, isSubscriptionOrder };
    else query = { userId: userId, isSubscriptionOrder: { $nin: [true] } };

    const skip = (page - 1) * limit;
    return await this.orderModel
      .find(
        query,
        'isSubscriptionOrder orderID orderStatus paymentStatus shippingMethod createdAt grandTotal usedWalletAmount product totalProduct orderStatusTime',
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  public async getAllOrderForUserSection(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Array<any>> {
    const skip = page * limit;
    return await this.orderModel
      .find(
        { userId: userId },
        'isSubscriptionOrder orderID orderStatus paymentStatus shippingMethod createdAt grandTotal usedWalletAmount product totalProduct',
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  // Count all order for user
  public async countAllOrderForUser(
    isSubscriptionOrder,
    userId: string,
  ): Promise<number> {
    let query;
    if (isSubscriptionOrder) query = { userId: userId, isSubscriptionOrder };
    else query = { userId: userId, isSubscriptionOrder: { $nin: [true] } };
    // console.log('query', query);
    return await this.orderModel.countDocuments(query);
  }

  // Get order detail by order id for user
  public async getOrderDetailForUser(
    userId: string,
    orderId: string,
  ): Promise<any> {
    return await this.orderModel.findOne(
      { _id: orderId, userId: userId },
      'isSubscriptionOrder cart cartId taxInfo grandTotal couponAmount deliveryInstruction deliveryCharges tax subTotal shippingMethod deliveryAddress storeAddress paymentType isOrderModified paymentStatus orderID orderStatus deliveryDate deliveryTime address user assignedToId assignedToName isDeliveryBoyRated createdAt usedWalletAmount',
    );
  }

  public async getOrderDetailForCancel(
    userId: string,
    orderId: string,
  ): Promise<any> {
    return await this.orderModel.findOne({ _id: orderId, userId: userId });
  }

  // Create order
  public async createOrder(orderData): Promise<any> {
    return await this.orderModel.create(orderData);
  }

  // Order cancel by user
  public async orderCancelByUser(
    userId: string,
    orderId: string,
    amountRefund: number,
  ): Promise<any> {
    const updateData = {
      orderStatus: OrderStatusType.CANCELLED,
      amountRefunded: amountRefund,
    };
    return await this.orderModel.updateOne(
      { _id: orderId, userId: userId },
      updateData,
      { new: true },
    );
  }

  //Order delivery boy rated by user
  public async updateOrderRatedByUser(
    userId: string,
    orderId: string,
  ): Promise<any> {
    const updateData = { isDeliveryBoyRated: true };
    return await this.orderModel.updateOne(
      { _id: orderId, userId: userId },
      updateData,
      { new: true },
    );
  }

  // ########################################################### DELIVERY BOY ###########################################################
  // Get all delivered order for delivery boy
  public async getAllDeliveredOrderForDeliveryBoy(
    deliveryBoyId: string,
    page: number,
    limit: number,
  ): Promise<Array<any>> {
    const orderFilter = {
      assignedToId: deliveryBoyId,
      orderStatus: OrderStatusType.DELIVERED,
    };
    const skip = (page - 1) * limit;
    return await this.orderModel
      .find(
        orderFilter,
        'orderID deliveryDate deliveryTime deliveryInstruction',
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  // count all delivered order for delivery boy
  public async countAllDeliveredOrderForDeliveryBoy(
    deliveryBoyId: string,
  ): Promise<number> {
    const orderFilter = {
      assignedToId: deliveryBoyId,
      orderStatus: OrderStatusType.DELIVERED,
    };
    return await this.orderModel.countDocuments(orderFilter);
  }

  // Get order detail by order id for delivery boy
  public async getOrderDetailForBoy(
    boyId: string,
    orderId: string,
  ): Promise<any> {
    return await this.orderModel.findOne(
      { _id: orderId, assignedToId: boyId, isOrderAssigned: true },
      'cartId paymentType orderID paymentStatus orderStatus orderStatusTime deliveryDate deliveryTime  orderFrom deliveryInstruction address user isSubscriptionOrder cart couponAmount isWalletUsed usedWalletAmount subTotal tax taxInfo deliveryCharges',
    );
  }

  // Get all assigned order for delivery boy
  public async getAllAssginedOrderForDeliveryBoy(
    deliveryBoyId: string,
    page: number,
    limit: number,
  ): Promise<Array<any>> {
    const orderFilter = {
      $or: [
        {
          assignedToId: deliveryBoyId,
          orderStatus: OrderStatusType.READY_TO_PICKUP,
        },
        {
          assignedToId: deliveryBoyId,
          orderStatus: OrderStatusType.OUT_FOR_DELIVERY,
        },
      ],
    };
    const skip = (page - 1) * limit;
    const orders = await this.orderModel
      .find(
        orderFilter,
        'orderId orderID deliveryDate deliveryTime user address isAcceptedByDeliveryBoy deliveryInstruction',
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    return orders;
  }

  // count all assigned order for delivery boy
  public async countAllAssginedOrderForDeliveryBoy(
    deliveryBoyId: string,
  ): Promise<number> {
    const orderFilter = {
      $or: [
        {
          assignedToId: deliveryBoyId,
          orderStatus: OrderStatusType.READY_TO_PICKUP,
        },
        {
          assignedToId: deliveryBoyId,
          orderStatus: OrderStatusType.OUT_FOR_DELIVERY,
        },
      ],
    };
    const orders = await this.orderModel.countDocuments(orderFilter);
    return orders;
  }

  // order accept by delivery boy
  public async orderAcceptByDelivery(orderId: string): Promise<any> {
    return await this.orderModel.findByIdAndUpdate(orderId, {
      isAcceptedByDeliveryBoy: true,
    });
  }

  // order reject by delivery boy
  public async orderRejectedByDelivery(
    orderId: string,
    deliveryBoyId: string,
    deliveryBoyName: string,
  ): Promise<any> {
    const updateData = {
      isAcceptedByDeliveryBoy: false,
      isOrderAssigned: false,
      assignedToId: null,
      assignedToName: null,
      $push: {
        rejectedByDeliveryBoy: {
          deliveryBoyId: deliveryBoyId,
          deliveryBoyName: deliveryBoyName,
        },
      },
    };
    const order = await this.orderModel.findByIdAndUpdate(orderId, updateData);
    return order;
  }

  // ########################################################### ADMIN ###########################################################
  // Get all order for admin
  public async getAllOrder(
    orderFilter,
    page: number,
    limit: number,
  ): Promise<Array<any>> {
    const skip = page * limit;
    return await this.orderModel
      .find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  // Count all order for admin
  public async countAllOrder(orderFilter): Promise<number> {
    return await this.orderModel.countDocuments(orderFilter);
  }

  // Get order detail by order id for admin
  public async getOrderDetail(orderId: string): Promise<any> {
    return await this.orderModel.findById(orderId);
  }

  // Get order detail by order id for admin
  public async getOrderDetailByToken(
    orderId: string,
    token: string,
  ): Promise<any> {
    return await this.orderModel.findOne({ _id: orderId, invoiceToken: token });
  }
  // Update order status
  public async orderStatusUpdate(
    orderId: string,
    orderStatus: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    orderStatusTime: {},
  ): Promise<any> {
    return await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        orderStatus: orderStatus,
        $push: { orderStatusTime: orderStatusTime },
      },
      { new: true },
    );
  }
  // Update order status
  public async orderDeliveredStatusUpdate(
    orderId: string,
    orderStatus: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    orderStatusTime: {},
    paymentStatus?: string,
  ): Promise<any> {
    const setting = await this.settingModel.findOne({}, 'loyalitysetting');
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: paymentStatus,
        orderStatus: orderStatus,
        $push: { orderStatusTime: orderStatusTime },
      },
      { new: true },
    );

    if (
      setting.loyalitysetting &&
      setting.loyalitysetting.isBonusOnNewOrder &&
      setting.loyalitysetting.loyaltyPercentageOnNewOrder > 0
    ) {
      const point = Number(
        (
          (order.subTotal *
            setting.loyalitysetting.loyaltyPercentageOnNewOrder) /
          100
        ).toFixed(2),
      );
      const loyaltyData: LoyaltyCreateDTO = {
        userId: order.userId,
        point: point,
        loyaltyType: LoyaltyType.BONUS_ON_ORDER,
        description: `Bonus on order ${order.orderID}`,
        isCredited: true,
        orderId: orderId,
        orderID: order.orderID,
      };
      this.loyaltyService.createdLoyalty(loyaltyData);

      order.rewardPoint = point;
    }
    if (
      setting.loyalitysetting &&
      setting.loyalitysetting.allowLoyaltyOnEveryOrder &&
      setting.loyalitysetting.loyaltyPointsForEachOrder > 0
    ) {
      const loyaltyData: LoyaltyCreateDTO = {
        userId: order.userId,
        point: setting.loyalitysetting.loyaltyPointsForEachOrder,
        loyaltyType: LoyaltyType.LOYALTY_ON_ORDER,
        description: `Loyalty bonus on order ${order.orderID}`,
        isCredited: true,
        orderId: orderId,
        orderID: order.orderID,
      };
      this.loyaltyService.createdLoyalty(loyaltyData);
    }
    return order;
  }

  // Order assign to delivery boy
  public async orderAssignToDelivery(
    orderId: string,
    orderAssignData,
  ): Promise<any> {
    return await this.orderModel.findByIdAndUpdate(orderId, orderAssignData, {
      new: true,
    });
  }

  // Get order status type list
  public async getOrderStatusTypeList() {
    const list = {};
    for (const key in OrderStatusType) {
      const val = OrderStatusType[key];
      list[val] = val;
    }
    return list;
  }
  // Order cancel by admin
  public async orderCancelByAdmin(
    orderId: string,
    amountRefund: number,
  ): Promise<any> {
    const updateData = {
      orderStatus: OrderStatusType.CANCELLED,
      amountRefunded: amountRefund,
    };
    return await this.orderModel.updateOne({ _id: orderId }, updateData, {
      new: true,
    });
  }

  // Get total order and it's sum
  public async getTotalOrderAmdSum(): Promise<GraphTotalCountDTO> {
    const orders = await this.orderModel.aggregate([
      { $match: { orderStatus: OrderStatusType.DELIVERED } },
      {
        $group: {
          _id: {},
          data: { $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] } },
          count: { $sum: 1 },
        },
      },
    ]);
    let totalOrder = 0,
      totalPrice = 0;
    if (orders && orders.length) {
      totalOrder = orders[0].count;
      totalPrice = orders[0].data;
    }
    return { totalOrder, totalPrice };
  }

  // Get all order total price of last seven days
  public async getOrdersPriceInLast7Days(): Promise<any> {
    const date = new Date();
    const today = date.setHours(0, 0, 0, 0);
    const sevenDaysBack = new Date(today - 6 * 24 * 60 * 60 * 1000);
    const result = await this.orderModel.aggregate([
      {
        $match: {
          orderStatus: OrderStatusType.DELIVERED,
          createdAt: { $gt: sevenDaysBack, $lt: date },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            date: { $dayOfMonth: '$createdAt' },
          },
          data: { $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] } },
        },
      },
    ]);
    return result;
  }

  // Get all order total price of last seven days
  public async totalSalesByFilter(startDate, endDate): Promise<any> {
    startDate = startDate.setHours(0, 0, 0, 0);
    const result = await this.orderModel.aggregate([
      {
        $match: {
          orderStatus: OrderStatusType.DELIVERED,
          createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: {},
          totalSalesWithTax: {
            $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] },
          },
          totalTax: { $sum: '$tax' },
          count: { $sum: 1 },
        },
      },
    ]);
    return result;
  }

  // Get all order total price of last seven days
  public async totalPuchaseUserFilter(startDate, endDate): Promise<any> {
    startDate = startDate.setHours(0, 0, 0, 0);
    const result = await this.orderModel.distinct('userId', {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    });
    return result.length;
  }
  public async categoryModeGraph(startDate, endDate): Promise<any> {
    const query = {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('categoryModeGraph query', query);
    const result = await this.orderModel.aggregate([
      { $match: query },
      { $unwind: '$cart' },
      {
        $group: {
          _id: { category: '$cart.categoryId' },
          count: { $sum: '$cart.quantity' },
          total: { $sum: '$cart.productTotal' },
        },
      },
    ]);
    return result;
  }
  public async productModeGraph(startDate, endDate, categoryId): Promise<any> {
    const query = {
      'cart.categoryId': categoryId,
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('productModeGraph query', query);
    const result = await this.orderModel.aggregate([
      { $match: query },
      { $unwind: '$cart' },
      {
        $group: {
          _id: { productName: '$cart.productName' },
          count: { $sum: '$cart.quantity' },
          total: { $sum: '$cart.productTotal' },
        },
      },
    ]);
    return result;
  }

  public async productModeTable(startDate, endDate): Promise<any> {
    const query = {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('productModeGraph query', query);
    const result = await this.orderModel.aggregate([
      { $match: query },
      { $unwind: '$cart' },
      {
        $group: {
          _id: { productName: '$cart.productName' },
          count: { $sum: '$cart.quantity' },
          total: { $sum: '$cart.productTotal' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    return result;
  }

  public async salesGraph(startDate, endDate, type): Promise<any> {
    const query = {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('productModeGraph query', query);
    let result;
    if (type === 'DAILY') {
      result = await this.orderModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              date: { $dayOfMonth: '$createdAt' },
            },
            data: { $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] } },
          },
        },
      ]);
    } else {
      result = await this.orderModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            data: { $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] } },
          },
        },
      ]);
    }

    return result;
  }

  public async paymentModeGraph(startDate, endDate): Promise<any> {
    const query = {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('paymentModeGraph query', query);
    const result = await this.orderModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: { paymentType: '$paymentType' },
          total: { $sum: { $sum: ['$grandTotal', '$usedWalletAmount'] } },
        },
      },
    ]);
    return result;
  }

  public async orderScriptToUpdate(
    orderFilter,
    skip: number,
    limit: number,
  ): Promise<Array<any>> {
    return await this.orderModel
      .find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  public async orderScriptToUpdateDetail(orderId, orderInfo): Promise<any> {
    const order = await this.orderModel.findByIdAndUpdate(orderId, orderInfo, {
      new: true,
    });
    return order;
  }

  public async orderDetailUpdate(orderId: string, orderData): Promise<any> {
    return await this.orderModel.findByIdAndUpdate(orderId, orderData, {
      new: true,
    });
  }

  public async deleteOrder(orderId: string): Promise<any> {
    return await this.orderModel.findByIdAndDelete(orderId);
  }

  public async generateCartDataForSubscriptionOrder(orderData) {
    // console.log({ orderData });
    const cart = {
      productIds: [],
      products: [],
      couponAmount: 0,
      walletAmount: 0,
      isOrderLinked: false,
      subTotal: 0,
      tax: 0,
      grandTotal: 0,
      deliveryCharges: 0,
      shippingMethod: '',
      taxInfo: {},
    };
    if (orderData.cart) {
      cart.products = orderData.cart;
      cart.productIds = orderData.cart.map(product => product.productId);
    }
    orderData.couponAmount && (cart.couponAmount = orderData.couponAmount);
    orderData.isWalletUsed === true &&
      orderData.usedWalletAmount &&
      (cart.walletAmount = orderData.usedWalletAmount);
    orderData.subTotal &&
      ((cart.subTotal = orderData.subTotal),
      (cart.grandTotal = orderData.subTotal));
    orderData.tax && (cart.tax = orderData.tax);
    orderData.taxInfo && (cart.taxInfo = orderData.taxInfo);
    orderData.deliveryCharges &&
      (cart.deliveryCharges = orderData.deliveryCharges);
    orderData.shippingMethod &&
      (cart.shippingMethod = orderData.shippingMethod);
    return cart;
  }

  public async onSuccessPayment(
    orderId: string,
    amountTotal: number,
    data: any,
  ) {
    let order = await this.getOrderDetail(orderId);
    if (!order) return;
    if (!order.transactionDetails) order.transactionDetails = {};
    const user = await this.userService.getUserById(order.userId);

    order.transactionDetails.transactionStatus = TransactionStatusType.SUCCESS;
    order.transactionDetails.transactionId = data.id;
    order.transactionDetails.paymentMethod =
      data.payment_method || data.payment_method_types[0];
    order.transactionDetails.currency = data.currency.toUpperCase();
    order.transactionDetails.transactionAmount = amountTotal;
    order.paymentStatus = PaymentStatusType.SUCCESS;
    order = await this.orderDetailUpdate(order._id, order);

    const notification: NotificationSaveDTO = {
      notifyType: NotificationType.ORDER_PLACED,
      orderId: order._id,
      orderID: order.orderID,
    };
    this.notificationService.createForOrderPlaced(notification, order.orderID);
    if (user && user.playerId) {
      const title = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_PLACED_TITLE,
      );
      let desc = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_PLACED_DESC,
      );
      desc = desc.replace('${orderID}', order.orderID);
      this.pushService.sendNotificationToUser(user.playerId, title, desc);
    }
    const userCart = await this.cartService.getCartById(order.cartId);
    this.emailService.sendEmailForPlacedOrder(order, userCart);
    this.socketService.sendOrderStatusNotificationToAdmin(notification);
  }

  public async onFailurePayment(orderId: string) {
    const order = await this.getOrderDetail(orderId);
    if (!order) return;
    if (!order.transactionDetails) order.transactionDetails = {};
    const user = await this.userService.getUserById(order.userId);

    let amountRefund = 0;
    if (order.isWalletUsed && order.usedWalletAmount)
      amountRefund = order.usedWalletAmount;
    order.amountRefunded = amountRefund;
    order.orderStatus = OrderStatusType.CANCELLED;
    order.paymentStatus = PaymentStatusType.FAILED;
    order.transactionDetails.transactionStatus = TransactionStatusType.FAILED;

    await this.orderDetailUpdate(order._id, order);

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

    if (amountRefund !== 0) {
      const wallet: WalletSaveDTO = {
        userId: user._id,
        amount: amountRefund,
        transactionType: WalletTransactionType.ORDER_CANCELLED,
        orderId: order._id,
        orderID: order.orderID,
      };
      this.walletService.cancelOrder(wallet);
    }

    const notification: NotificationSaveDTO = {
      notifyType: NotificationType.ORDER_CANCELLED,
      orderId: order._id,
      orderID: order.orderID,
    };

    await Promise.all([
      this.userService.updateWallet(user._id, amountRefund),
      this.notificationService.createForOrderCancel(
        notification,
        order.orderID,
      ),
    ]);

    const title = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_TITLE,
    );
    let desc = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_DESC,
    );
    desc = desc.replace('${orderID}', order.orderID);

    this.userService.descreaseOrderPurchased(user._id);
    this.pushService.sendNotificationToUser(user.playerId, title, desc);
    this.socketService.sendOrderStatusNotificationToAdmin(notification);
  }
  public async getOrderForExport(exportFilter: ExportFilter): Promise<any> {
    const filter = {};
    const FROM_DATE = new Date(exportFilter.fromDate).setHours(0, 0, 0, 0);
    const TO_DATE = new Date(exportFilter.toDate).setHours(23, 59, 59, 999);

    filter['createdAt'] = { $gt: FROM_DATE, $lt: TO_DATE };

    return await this.orderModel.find(
      filter,
      'createdAt orderID cart user address paymentType subCategoryId categoryId paymentStatus deliveryTime isSubscriptionOrder quantity',
    );
  }

  // test will remove later
  public async testGet(): Promise<any> {
    const orders = await this.orderModel.find({});
    return orders;
  }

  public async testUpdate(data): Promise<any> {
    const orders = await this.orderModel.updateOne({ _id: data._id }, data, {
      new: true,
    });
    return orders;
  }
  public async getUserJourneyDetail(userId: string) {
    const filter = { userId: userId };
    const order = await this.orderModel
      .find(
        filter,
        'orderID orderStatus createdAt orderFrom grandTotal subTotal tax couponCode usedWalletAmount paymentType',
      )
      .sort({ createdAt: -1 });
    return order;
  }
}
