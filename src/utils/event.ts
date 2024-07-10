import { ChatDTO } from '../chat/chat.model';
import { INotificationDeliveryBoy, INotificationUser,NotificationsSaveDTO,INotificationsDeliveryBoy} from '../notifications/notifications.model';

export enum notificationEvents {
	SEND_TEST = 'SEND_TEST',
	SUBSCRIPTION_ORDER_CREATED='SUBSCRIPTION_ORDER_CREATED',
	ORDER_UPDATED='ORDER_UPDATED',
	INSUFFICEIENT_BALANCE='INSUFFICEIENT_BALANCE',
	DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION = '[DELIVERY_BOY] DELIVERY_BOY_ORDER_ASSIGNED_NOTIFICATION',
	SEND_NOTIFICATION_TO_ALL_USERS = '[USER] SEND_NOTIFICATION_TO_ALL_USERS',
	SUBSCRIPTION_FAILED='SUBSCRIPTION_FAILED',
	CHAT_NOTIFICATION_STORE_TO_USER = '[USER] CHAT_NOTIFICATION_STORE_TO_USER',
	CHAT_NOTIFICATION_USER_TO_STORE = '[USER] CHAT_NOTIFICATION_USER_TO_STORE',
	ORDER_CANCELLED_BY_USER = '[USER] ORDER_CANCELLED_BY_USER',
	SUBSCRIPTION_ORDER_CANCELLED_BY_USER='SUBSCRIPTION_ORDER_CANCELLED_BY_USER',
	ORDER_CREATED = '[USER] ORDER_CREATED',
	DELIVERY_BOY_POS_ORDER_ASSIGNED_NOTIFICATION='DELIVERY_BOY_POS_ORDER_ASSIGNED_NOTIFICATION',
	DELIVERY_BOY_STATUS_UPDATE_NOTIFICATION ='[USER] DELIVERY_BOY_STATUS_UPDATE_NOTIFICATION',
	ADMIN_STATUS_UPDATE_NOTIFICATION ='[USER] ADMIN_STATUS_UPDATE_NOTIFICATION'
}

export class DeliveryAssociatesNotification {
	constructor(public data: INotificationDeliveryBoy) {}
}
export class DeliveryAssociatessNotification {
	constructor(public data: INotificationsDeliveryBoy) {}
}

export class ChatNofitication {
	constructor(public chatData: ChatDTO) {}
}

export class UserNotification{
	constructor(public data: INotificationUser) {}
}
export class UsersNotification{
	constructor(public data: NotificationsSaveDTO) {}
}