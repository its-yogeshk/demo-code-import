import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationSaveDTO,NotificationsSaveDTO, NotificationType, NotificationDTO ,ISaveDeliveryBoyNotification,ISaveUsersNotification,} from './notifications.model';
import { ResponseMessage } from '../utils/app.model';
import { UtilService } from '../utils/util.service';
@Injectable()
export class NotificationService {
	constructor(
		@InjectModel('Notification') private readonly notificationModel: Model<any>,
		private readonly utilService: UtilService
	) {
	}

	public async getAllNotification(page: number, limit: number): Promise<Array<NotificationDTO>> {
		const skip = page * limit;
		return await this.notificationModel.find({ isRead: false }, 'title notifyType isRead description orderID orderId deliveryBoyId deliveryBoyName createdAt').limit(limit).skip(skip).sort({ createdAt: -1 });
	}

	public async countAllnotification(): Promise<number> {
		return await this.notificationModel.countDocuments({});
	}

	public async readNotification(notifyId): Promise<number> {
		return await this.notificationModel.updateOne({ _id: notifyId }, { isRead: true });
	}

	public async countUnread(): Promise<number> {
		return await this.notificationModel.countDocuments({ isRead: false });
	}

	public async createForOrderPlaced(notificationData: NotificationSaveDTO,orderID:string): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.USER_NOTIFY_ORDER_PLACED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.USER_NOTIFY_ORDER_PLACED_DESC,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.ORDER_PLACED;
		return await this.notificationModel.create(notificationData);
	}
	public async sufficientPlaced(notificationData: NotificationsSaveDTO): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.SUBSCRIPTION_ORDER,
		);
		notificationData.description = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.INSUFFICIENT_BALANCE,
		);
		notificationData.notifyType = NotificationType.INSUFFICIENT_BALANCE;
		return await this.notificationModel.create(notificationData);
	}
	public async createForOrderCancel(notificationData: NotificationSaveDTO,orderID:string): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessageByKey(
			ResponseMessage.USER_NOTIFY_ORDER_CANCELLED_DESC,
		);
		
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.ORDER_CANCELLED;
		return await this.notificationModel.create(notificationData);
	}

	public async createForAcceptedByBoy(notificationData: NotificationSaveDTO,orderID:number): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_ACCEPTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_ACCEPTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		
		notificationData.notifyType = NotificationType.ORDER_ACCEPTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}
	public async poscreateForAcceptedByBoy(notificationData: NotificationSaveDTO,orderID:number): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_ACCEPTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_ACCEPTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		
		notificationData.notifyType = NotificationType.POS_ORDER_ACCEPTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}
	public async createdForAcceptedByBoy(notificationData: NotificationSaveDTO,orderID:number,): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_ACCEPTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_ACCEPTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.SUBSCRIPTION_ORDER_ACCEPTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}

	public async createForRejectedByBoy(notificationData: NotificationSaveDTO,orderID:number): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_REJECTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_ORDER_REJECTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.ORDER_REJECTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}
	public async poscreateForRejectedByBoy(notificationData: NotificationSaveDTO,orderID:number): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_REJECTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_POS_ORDER_REJECTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.POS_ORDER_REJECTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}
	public async createdForRejectedByBoy(notificationData: NotificationSaveDTO,orderID:number,): Promise<NotificationDTO> {
		notificationData.title = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_REJECTED_TITLE,
		);
		notificationData.description = await this.utilService.getTranslatedMessage(
			ResponseMessage.DELIVERY_BOY_NOTIFY_SUBSCRIPTION_ORDER_REJECTED_DES,
		);
		notificationData.description = notificationData.description.replace('${orderID}', orderID.toString());
		notificationData.notifyType = NotificationType.SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY;
		return await this.notificationModel.create(notificationData);
	}
	public async createForProductOutOfStock(productOutOfStockData: NotificationSaveDTO): Promise<NotificationDTO> {
		return await this.notificationModel.create(productOutOfStockData);

	}

	public async deleteNotificationByordrId(orderId:string): Promise<any> {
		return await this.notificationModel.remove({ orderId: orderId })
	}
	async saveDeliveryBoyNotification(notification: ISaveDeliveryBoyNotification) {
		return await this.notificationModel.create(notification);
	}
	
	async saveUsersNotification(notification: ISaveUsersNotification[]): Promise<any> {
		return await this.notificationModel.insertMany(notification);
	}
	
	async saveUserNotification(notification: ISaveUsersNotification): Promise<any> {
		return await this.notificationModel.create(notification);
	}
	async getNotification(userId: string, role: string, page: number, limit: number,): Promise<Array<NotificationDTO>> {
		const skip = page * limit;
		if (role == "USER") {
			return await this.notificationModel.find({ userId: userId, }).limit(limit).skip(skip).sort({ createdAt: -1 });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.find({ deliveryBoyId: userId, }).limit(limit).skip(skip).sort({ createdAt: -1 });
		}

	}
	public async totalcountByUserId(userId: string, role: string): Promise<number> {
		if (role == "USER") {
			return await this.notificationModel.countDocuments({ userId: userId });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.countDocuments({ deliveryBoyId: userId });
		}

	}
	public async readIndividualUnReadNotification(id: string, userId: string, role: string): Promise<Array<any>> {

		if (role == "USER") {
			return await this.notificationModel.findByIdAndUpdate({ _id: id, userId: userId }, { isRead: true }, { new: true });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.findByIdAndUpdate({ _id: id, deliveryBoyId: userId }, { isRead: true }, { new: true });
		}

	}
	async getAllUnreadNotification(userId: string, role: string, page: number, limit: number,): Promise<Array<NotificationDTO>> {
		const skip = page * limit;
		if (role == "USER") {
			return await this.notificationModel.find({ userId: userId, isRead: false }).limit(limit).skip(skip).sort({ createdAt: -1 });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.find({ deliveryBoyId: userId, isRead: false }).limit(limit).skip(skip).sort({ createdAt: -1 });
		}

	}
	public async countUnreadByUserId(userId: string, role: string): Promise<number> {
		if (role == "USER") {
			return await this.notificationModel.countDocuments({ userId: userId, isRead: false });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.countDocuments({ deliveryBoyId: userId, isRead: false });
		}

	}
	public async deleteNotification(notificationId: string): Promise<Array<unknown>> {
		return await this.notificationModel.findByIdAndDelete({ _id: notificationId });

	}
	public async deleteAllNotification(userId: string, role: string): Promise<any> {
		if (role == "USER") {
			return await this.notificationModel.deleteMany({ userId: userId });
		}
		else if (role == "DELIVERY_BOY") {
			return await this.notificationModel.deleteMany({ deliveryBoyId: userId });
		}


	}
	

}
