import { Injectable } from '@nestjs/common';
import { AdminNotificationDTO } from './notifications.model';
import { UtilService } from '../utils/util.service';
import { ResponseMessage } from '../utils/app.model';
import { IBaseNotification } from '../utils/one-signal';
import { ChatDTO } from '../chat/chat.model';
import { OrderStatusType } from '../order/order.model';
@Injectable()
export class NotificationsContent {
  constructor(private readonly utilService: UtilService) {}

  async prepareUsersNotification(
    payload: AdminNotificationDTO,
  ): Promise<IBaseNotification> {
    const headings = payload.title;
    const contents = payload.body;
    return {
      headings,
      contents,
    };
  }

  async getContentDeliveryBoyAssigned(
    orderID: number,
  ): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_ASSIGNED_TITLE,
    );

    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_ASSIGNED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());

    return {
      headings,
      contents,
    };
  }
  async getposContentDeliveryBoyAssigned(
    orderID: number,
  ): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_ASSIGNED_TITLE,
    );

    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_ASSIGNED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());

    return {
      headings,
      contents,
    };
  }
  async getsubContentDeliveryBoyAssigned(
    orderID: number,
  ): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_ASSIGNED_TITLE,
    );

    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_ASSIGNED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());

    return {
      headings,
      contents,
    };
  }

  async getChatNotificationContent(
    chatData: ChatDTO,
  ): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.NEW_MESSAGE,
    );
    const contents = `${chatData.message}`;
    return {
      headings,
      contents,
    };
  }
  async insufficientbalane(): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.SUBSCRIPTION_ORDER,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.INSUFFICIENT_BALANCE,
    );

    return {
      headings,
      contents,
    };
  }
  async getOrderCancelContent(orderID: number): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_TITLE,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());
    return {
      headings,
      contents,
    };
  }
  async getsubOrderCancelContent(orderID: number): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CANCELLED_TITLE,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CANCELLED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());
    return {
      headings,
      contents,
    };
  }
  async getOrderUpadteContent(orderID: number): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_MODIFIED_TITLE,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_MODIFIED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());
    return {
      headings,
      contents,
    };
  }
  async getOrderCreatedContent(orderID: number): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_PLACED_TITLE,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_ORDER_PLACED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());
    return {
      headings,
      contents,
    };
  }
  async getsubOrderCreatedContent(orderID: number): Promise<IBaseNotification> {
    const headings = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_PLACED_TITLE,
    );
    let contents = await this.utilService.getTranslatedMessageByKey(
      ResponseMessage.USER_NOTIFY_SUBSCRITION_ORDER_PLACED_DESC,
    );
    contents = contents.replace('${orderID}', orderID.toString());
    return {
      headings,
      contents,
    };
  }

  async getOrderStatusContent(
    orderID: number,
    orderStatus: string,
  ): Promise<IBaseNotification> {
    let headings = '',
      contents = '';
    if (orderStatus === OrderStatusType.READY_TO_PICKUP) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_READY_TO_PICKUP_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_READY_TO_PICKUP_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.OUT_FOR_DELIVERY) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_OUT_OF_DELIVERY_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_OUT_OF_DELIVERY_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.DELIVERED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_DELIVERED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_DELIVERED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.CONFIRMED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_CONFIRMED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_CONFIRMED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.CANCELLED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    }

    return {
      headings,
      contents,
    };
  }
  async getsubscriptionOrderStatusContent(
    orderID: number,
    orderStatus: string,
  ): Promise<IBaseNotification> {
    let headings = '',
      contents = '';
    if (orderStatus === OrderStatusType.READY_TO_PICKUP) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_SUBSCRIPTION_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_ORDER_SUBSCRIPTION_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.OUT_FOR_DELIVERY) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_OUT_OF_DELIVERY_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_OUT_OF_DELIVERY_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.DELIVERED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_DELIVERED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_DELIVERED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.CONFIRMED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CONFIRMED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CONFIRMED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    } else if (orderStatus === OrderStatusType.CANCELLED) {
      headings = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CANCELLED_TITLE,
      );
      contents = await this.utilService.getTranslatedMessageByKey(
        ResponseMessage.USER_NOTIFY_SUBSCRIPTION_ORDER_CANCELLED_DESC,
      );
      contents = contents.replace('${orderID}', orderID.toString());
    }

    return {
      headings,
      contents,
    };
  }
}
