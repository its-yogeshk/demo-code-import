import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppGateway } from '../app.gateway';
import { OrderStatusType } from '../order/order.model';
import { UsersDTO } from '../users/users.model';
import { UserService } from '../users/users.service';
import { OrderService } from '../order/order.service';
import { ShippingMethod } from '../settings/settings.model';
import {
  ChatNofitication,
  DeliveryAssociatesNotification,
  notificationEvents,
  UserNotification,
} from '../utils/event';
import { IBaseNotification, OneSignal } from '../utils/one-signal';
import { NotificationsContent } from './notifications-content';
import {
  AdminNotificationDTO,
  INotificationDeliveryBoy,
  INotificationUser,
  ISaveDeliveryBoyNotification,
  ISaveUsersNotification,
  NotificationType,
} from './notifications.model';
import { NotificationService } from './notifications.service';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);
  constructor(
    private readonly userService: UserService,
    private readonly notificationContent: NotificationsContent,
    private readonly onseSignal: OneSignal,
    private readonly notificationService: NotificationService,
    private readonly usersService: UserService,
    private readonly orderService: OrderService,
    private readonly notificationContents: NotificationsContent,
    private socketService: AppGateway,
  ) {}

  private async deliveryBoySendAndSaveNotification(
    deliveryBoy: UsersDTO,
    notification: IBaseNotification,
    data: INotificationDeliveryBoy,
  ) {
    const inAppNotification: ISaveDeliveryBoyNotification = {
      isRead: false,
      deliveryBoyId: data.deliveryBoyId,
      title: notification.headings,
      description: notification.contents,
      notifyType: data.notifyType,
      orderId: data.orderId,
      orderID: data.orderID,
      subscriptionId: data.subscriptionId,
      isSubscriptionOrder: data.isSubscriptionOrder,
    };

    const requests = [
      await this.notificationService.saveDeliveryBoyNotification(
        inAppNotification,
      ),
    ];

    if (deliveryBoy.playerId) {
      this.logger.log(`Delivery Boy has playerid `);
      const responseData = await this.onseSignal.sendDeliveryBoyNotificationToPlayerIDs(
        notification,
        [deliveryBoy.playerId],
      );
      if (responseData.errors) {
        this.logger.warn(`Failed to send Notification to Delivery Boy`);
        return;
      } else {
        this.logger.log(`Successfully Sent Notification to Delivery Boy`);
      }

      requests.push(responseData);
      await Promise.race(requests);
    } else {
      this.logger.warn('Delivery Boy has no playerId');
      return;
    }
  }

  //Send Notifications to all users
  private async sendUsersNotification(
    notification: IBaseNotification,
    chunks: string[][],
  ) {
    const response = [];
    for (const chunk of chunks) {
      response.push(
        await this.onseSignal.sendNotificationToPlayerIDs(notification, chunk),
      );
    }
    response.map(response => {
      if (response.errors) {
        this.logger.warn(`Failed to send Notification to Users `);
      } else {
        this.logger.log(`Successfully Sent Notification to Users`);
      }
    });
  }

  //Save Notifications of all users
  private async saveUsersNotification(
    notification: IBaseNotification,
    userIDs: string[],
  ) {
    const saveNotification: ISaveUsersNotification[] = userIDs.map(id => {
      return {
        userId: id,
        isRead: false,
        title: notification.headings,
        description: notification.contents,
        notifyType: NotificationType.PUSH_NOTIFICATION_BY_ADMIN,
      };
    });

    const response = await this.notificationService.saveUsersNotification(
      saveNotification,
    );
    if (response) {
      this.logger.log('Users Notifications added to Database');
    } else {
      this.logger.error('Failed to Store Users Notifications');
      return;
    }
  }

  private async saveUserNotification(
    notification: IBaseNotification,
    data: INotificationUser,
  ) {
    const inAppNotification: ISaveUsersNotification = {
      isRead: false,
      userId: data.userId,
      isSubscriptionOrder: data.isSubscriptionOrder,
      title: notification.headings,
      description: notification.contents,
      notifyType: data.notifyType,
      orderId: data.orderId,
      orderID: data.orderID,
      subscriptionId: data.subscriptionId,
    };
    await this.notificationService.saveUserNotification(inAppNotification);
  }

  private async sendUserNotification(
    user: UsersDTO,
    notification: IBaseNotification,
  ) {
    if (user.playerId) {
      this.logger.log(`User has playerid `);
      const responseData = await this.onseSignal.sendNotificationToPlayerIDs(
        notification,
        [user.playerId],
      );

      if (responseData.errors) {
        this.logger.warn(`Failed to send Notification to User`);
        return;
      } else {
        this.logger.log(`Successfully Sent Notification to User`);
      }
    } else {
      this.logger.warn('User has no playerId');
      return;
    }
  }
  @OnEvent(notificationEvents.INSUFFICEIENT_BALANCE, { async: true })
  async insufficentbalance(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Cancelled Notification');

      const notification = await this.notificationContent.insufficientbalane();
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCancelledNotification.name,
      );
    }
  }

  @OnEvent(notificationEvents.DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION, {
    async: true,
  })
  async deliverBoyAssignedNotification(
    payload: DeliveryAssociatesNotification,
  ) {
    try {
      const { data } = payload;
      const deliveryBoy = await this.userService.getDeliveryBoy({
        _id: data.deliveryBoyId,
      });
      const order = await this.orderService.getOrderDetail(data.orderId);

      if (!deliveryBoy) {
        this.logger.warn('Delivery Boy not found');
        return;
      }
      this.logger.log('Sending Delivery Boy Assigned Notification');
      if (order.isSubscriptionOrder == false) {
        if (order.orderFrom == 'POS') {
          const notification = await this.notificationContent.getposContentDeliveryBoyAssigned(
            data.orderID,
          );
          this.deliveryBoySendAndSaveNotification(
            deliveryBoy,
            notification,
            data,
          );
        } else {
          const notification = await this.notificationContent.getContentDeliveryBoyAssigned(
            data.orderID,
          );
          this.deliveryBoySendAndSaveNotification(
            deliveryBoy,
            notification,
            data,
          );
        }
      } else {
        const notification = await this.notificationContent.getsubContentDeliveryBoyAssigned(
          data.orderID,
        );
        this.deliveryBoySendAndSaveNotification(
          deliveryBoy,
          notification,
          data,
        );
      }
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.deliverBoyAssignedNotification.name,
      );
    }
  }
  @OnEvent(notificationEvents.SUBSCRIPTION_FAILED, { async: true })
  async subNotificationToAllUsers(notificationData: AdminNotificationDTO) {
    try {
      this.logger.log('subscription fail notification to all users');
      const maxLmit = 2000;

      const users = await this.usersService.getAllUsersForNotification();
      console.log(users);
      if (!users.length) {
        this.logger.warn('Users not found');
        return;
      }

      const playerIDs = users.map(user => user.playerId);
      if (!playerIDs.length) {
        this.logger.warn('Users has no playerId');
        return;
      }

      this.logger.log('Fetched users has playerId');

      const userIDs = users.map(user => user._id);

      const chunks = Array(Math.ceil(playerIDs.length / maxLmit))
        .fill(1)
        .map(_ => playerIDs.splice(0, maxLmit));

      const notification = await this.notificationContents.prepareUsersNotification(
        notificationData,
      );

      this.sendUsersNotification(notification, chunks);
      this.saveUsersNotification(notification, userIDs);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.sendNotificationToAllUsers.name,
      );
    }
  }
  @OnEvent(notificationEvents.SEND_NOTIFICATION_TO_ALL_USERS, { async: true })
  async sendNotificationToAllUsers(notificationData: AdminNotificationDTO) {
    try {
      this.logger.log('Sending notification to all users');
      const maxLmit = 2000;

      const users = await this.usersService.getAllUsersForNotification();
      console.log(users);
      if (!users.length) {
        this.logger.warn('Users not found');
        return;
      }

      const playerIDs = users.map(user => user.playerId);
      if (!playerIDs.length) {
        this.logger.warn('Users has no playerId');
        return;
      }

      this.logger.log('Fetched users has playerId');

      const userIDs = users.map(user => user._id);

      const chunks = Array(Math.ceil(playerIDs.length / maxLmit))
        .fill(1)
        .map(_ => playerIDs.splice(0, maxLmit));

      const notification = await this.notificationContents.prepareUsersNotification(
        notificationData,
      );

      this.sendUsersNotification(notification, chunks);
      this.saveUsersNotification(notification, userIDs);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.sendNotificationToAllUsers.name,
      );
    }
  }

  @OnEvent(notificationEvents.CHAT_NOTIFICATION_STORE_TO_USER, { async: true })
  async chatNotificationStoreToUser(payload: ChatNofitication) {
    try {
      this.logger.log('Sending chat Notification');
      const { chatData } = payload;
      const user = await this.userService.getUserById(chatData.userId);

      if (!user) {
        this.logger.warn(`User not found`);
        return;
      }

      if (!user.playerId) {
        this.logger.warn('User playerId not found');
        return;
      }
      const notification = await this.notificationContent.getChatNotificationContent(
        chatData,
      );
      const response = await this.onseSignal.sendNotificationToPlayerIDs(
        notification,
        [user.playerId],
      );

      if (response.errors) {
        this.logger.warn(`Failed to send Notification to Users`);
      } else {
        this.logger.log(`Successfully Sent Notification to Users`);
      }
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.chatNotificationStoreToUser.name,
      );
    }
  }

  // @OnEvent(notificationEvents.CHAT_NOTIFICATION_USER_TO_STORE, { async: true })
  // async chatNotificationUserToStore(payload: ChatNofitication) {
  // 	try {
  // 		this.logger.log('Sending chat Notification');
  // 		const { chatData } = payload;
  // 		// const store = await this.userService.getUserById(chatData.storeId);

  // 		// if (!store) {
  // 		// 	this.logger.warn(`Store not found`);
  // 		// 	return;
  // 		// }

  // 		// if (!store.playerId) {
  // 		// 	this.logger.warn('Store playerId not found');
  // 		// 	return;
  // 		// }

  // 		const notification = await this.notificationContent.getChatNotificationContent(chatData);
  // 		this.socketService.sendOrderStatusNotificationToAdmin(notification);
  // 		// const response = await this.onseSignal.sendNotificationToPlayerIDs(notification, [
  // 		// 	store.playerId,
  // 		// ]);

  // 		// if (response.errors) {
  // 		// 	this.logger.warn(`Failed to send Notification to Store`);
  // 		// } else {
  // 		// 	this.logger.log(`Successfully Sent Notification to Store`);
  // 		// }
  // 	} catch (error) {
  // 		this.logger.error(error.stack, null, this.chatNotificationStoreToUser.name);
  // 	}
  // }

  @OnEvent(notificationEvents.ORDER_CANCELLED_BY_USER, { async: true })
  async userOrderCancelledNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Cancelled Notification');

      const notification = await this.notificationContent.getOrderCancelContent(
        data.orderID,
      );
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCancelledNotification.name,
      );
    }
  }
  @OnEvent(notificationEvents.SUBSCRIPTION_ORDER_CANCELLED_BY_USER, {
    async: true,
  })
  async usersubOrderCancelledNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Cancelled Notification');

      const notification = await this.notificationContent.getsubOrderCancelContent(
        data.orderID,
      );
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCancelledNotification.name,
      );
    }
  }
  @OnEvent(notificationEvents.ORDER_UPDATED, { async: true })
  async userOrderUpdatedNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Upadted Notification');
      const notification = await this.notificationContent.getOrderUpadteContent(
        data.orderID,
      );
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCreatedNotification.name,
      );
    }
  }

  @OnEvent(notificationEvents.ORDER_CREATED, { async: true })
  async userOrderCreatedNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Created Notification');
      const notification = await this.notificationContent.getOrderCreatedContent(
        data.orderID,
      );
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCreatedNotification.name,
      );
    }
  }
  @OnEvent(notificationEvents.SUBSCRIPTION_ORDER_CREATED, { async: true })
  async usersOrderCreatedNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }
      this.logger.log('Sending User Order Created Notification');
      const notification = await this.notificationContent.getsubOrderCreatedContent(
        data.orderID,
      );
      this.saveUserNotification(notification, data);
      this.sendUserNotification(user, notification);
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.userOrderCreatedNotification.name,
      );
    }
  }

  @OnEvent(notificationEvents.DELIVERY_BOY_STATUS_UPDATE_NOTIFICATION, {
    async: true,
  })
  async deliverBoyStatusUpdateNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);
      const order = await this.orderService.getOrderDetail(data.orderId);

      if (!user) {
        this.logger.warn('User not found');
        return;
      }

      this.logger.log(
        'Sending Notification: User Order Status Updated by Delivery Boy',
      );

      if (!data.orderStatus) {
        this.logger.warn(
          'Failed to send Notifiacation: Order Status not available',
        );
        return;
      }

      if (order.isSubscriptionOrder == false) {
        const notification = await this.notificationContent.getOrderStatusContent(
          data.orderID,
          data.orderStatus,
        );
        if (data.orderStatus === OrderStatusType.OUT_FOR_DELIVERY) {
          data.notifyType = NotificationType.ORDER_OUT_FOR_DELIVERY;
        } else if (data.orderStatus === OrderStatusType.DELIVERED) {
          data.notifyType = NotificationType.ORDER_DELIVERED;
        } else {
          this.logger.warn(
            'Failed to send Notifiacation: Invalid Order Status',
          );
          return;
        }
        this.saveUserNotification(notification, data);
        this.sendUserNotification(user, notification);
      } else {
        const notification = await this.notificationContent.getsubscriptionOrderStatusContent(
          data.orderID,
          data.orderStatus,
        );
        if (data.orderStatus === OrderStatusType.OUT_FOR_DELIVERY) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY;
        } else if (data.orderStatus === OrderStatusType.DELIVERED) {
          data.notifyType = NotificationType.SUBSCRIPTION_ORDER_DELIVERED;
        } else {
          this.logger.warn(
            'Failed to send Notifiacation: Invalid Order Status',
          );
          return;
        }
        this.saveUserNotification(notification, data);
        this.sendUserNotification(user, notification);
      }
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.deliverBoyStatusUpdateNotification.name,
      );
    }
  }

  @OnEvent(notificationEvents.ADMIN_STATUS_UPDATE_NOTIFICATION, { async: true })
  async adminStatusUpdateNotification(payload: UserNotification) {
    try {
      const { data } = payload;
      const user = await this.userService.getUserById(data.userId);
      const order = await this.orderService.getOrderDetail(data.orderId);
      if (!user) {
        this.logger.warn('User not found');
        return;
      }

      this.logger.log(
        'Sending Notification: User Order Status Updated by Admin',
      );

      if (!data.orderStatus) {
        this.logger.warn(
          'Failed to send Notifiacation: Order Status not available',
        );
        return;
      }

      if (order.isSubscriptionOrder == false) {
        const notification = await this.notificationContent.getOrderStatusContent(
          data.orderID,
          data.orderStatus,
        );
        if (
          data.orderStatus === OrderStatusType.DELIVERED &&
          order.shippingMethod === ShippingMethod.PICK_UP
        ) {
          data.notifyType = NotificationType.ORDER_DELIVERED_BY_ADMIN;
        } else if (
          data.orderStatus === OrderStatusType.OUT_FOR_DELIVERY &&
          order.shippingMethod === ShippingMethod.DELIVERY &&
          order.isOrderAssigned &&
          order.isAcceptedByDeliveryBoy
        ) {
          data.notifyType = NotificationType.ORDER_OUT_FOR_DELIVERY_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.CONFIRMED) {
          data.notifyType = NotificationType.ORDER_CONFIRMED_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.READY_TO_PICKUP) {
          data.notifyType = NotificationType.ORDER_READY_TO_PICKUP_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.CANCELLED) {
          data.notifyType = NotificationType.ORDER_CANCELLED_BY_ADMIN;
        } else {
          this.logger.warn(
            'Failed to send Notifiacation: Invalid Order Status',
          );
          return;
        }
        this.saveUserNotification(notification, data);
        this.sendUserNotification(user, notification);
      } else {
        const notification = await this.notificationContent.getsubscriptionOrderStatusContent(
          data.orderID,
          data.orderStatus,
        );
        if (
          data.orderStatus === OrderStatusType.DELIVERED &&
          order.shippingMethod === ShippingMethod.PICK_UP
        ) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_DELIVERED_BY_ADMIN;
        } else if (
          data.orderStatus === OrderStatusType.OUT_FOR_DELIVERY &&
          order.shippingMethod === ShippingMethod.DELIVERY &&
          order.isOrderAssigned &&
          order.isAcceptedByDeliveryBoy
        ) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.CONFIRMED) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_CONFIRMED_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.READY_TO_PICKUP) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_READY_TO_PICKUP_BY_ADMIN;
        } else if (data.orderStatus === OrderStatusType.CANCELLED) {
          data.notifyType =
            NotificationType.SUBSCRIPTION_ORDER_CANCELLED_BY_ADMIN;
        } else {
          this.logger.warn(
            'Failed to send Notifiacation: Invalid Order Status',
          );
          return;
        }
        this.saveUserNotification(notification, data);
        this.sendUserNotification(user, notification);
      }
    } catch (error) {
      this.logger.error(
        error.stack,
        null,
        this.adminStatusUpdateNotification.name,
      );
    }
  }

  @OnEvent(notificationEvents.SEND_TEST, { async: true })
  async testNotification() {
    const notification: IBaseNotification = {
      contents: 'English Message',
      headings: 'test',
    };
    const ids = ['5b6c0e5e-006e-4c95-a6ea-246f1f254a9a'];
    const chat = {
      message: 'hi',
      sentBy: 'VENDOR',
      userId: '6155a7eee94ffe003a0e0001',
      vendorId: '60c1e4d910272ce973cd0e46',
      userName: 'Atish',
      orderId: '617bd715549c1b003aa4e86c',
      createdAt: '2021-10-29T11:32:08.428Z',
      updatedAt: '2021-10-29T11:32:08.428Z',
    };

    try {
      const data = await this.onseSignal.sendNotificationToPlayerIDs(
        notification,
        ids,
      );
      //console.log(data);
    } catch (error) {
      this.logger.error(error);
      //	console.log(error);
    }
  }
}
