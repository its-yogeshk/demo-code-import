import * as mongoose from 'mongoose';
import { ApiModelProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsUrl,
  IsString,
  IsBoolean,
} from 'class-validator';

export enum NotificationType {
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  POS_ORDER_ASSIGNED_TO_DELIVERY_BOY = 'POS_ORDER_ASSIGNED_TO_DELIVERY_BOY',
  POS_ORDER_ACCEPTED_BY_DELIVERY_BOY = 'POS_ORDER_ACCEPTED_BY_DELIVERY_BOY',
  SUBSCRIPTION_ORDER_CANCELLED = 'SUBSCRIPTION_ORDER_CANCELLED',
  SUBSCRIPTION_ORDER_PLACED = 'SUBSCRIPTION_ORDER_PLACED',
  SUBSCRIPTION_ORDER_ACCEPTED_BY_DELIVERY_BOY = 'SUBSCRIPTION_ORDER_ACCEPTED_BY_DELIVERY_BOY',
  SUBSCRIPTION_ORDER_CONFIRMED_BY_ADMIN = 'SUBSCRIPTION_ORDER_CONFIRMED_BY_ADMIN',
  SUBSCRIPTION_ORDER_CANCELLED_BY_ADMIN = 'SUBSCRIPTION_ORDER_CANCELLED_BY_ADMIN',
  SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY = 'SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY',
  ORDER_ACCEPTED_BY_DELIVERY_BOY = 'ORDER_ACCEPTED_BY_DELIVERY_BOY',
  ORDER_REJECTED_BY_DELIVERY_BOY = 'ORDER_REJECTED_BY_DELIVERY_BOY',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  DELIVERY_BOY = 'DELIVERY_BOY',
  POS_ORDER_REJECTED_BY_DELIVERY_BOY = 'POS_ORDER_REJECTED_BY_DELIVERY_BOY',
  PUSH_NOTIFICATION_BY_ADMIN = 'PUSH_NOTIFICATION_BY_ADMIN',
  ORDER_ASSIGNED_TO_DELIVERY_BOY = 'ORDER_ASSIGNED_TO_DELIVERY_BOY',
  SUBSCRIPTION_ORDER_ASSIGNED_TO_DELIVERY_BOY = 'SUBSCRIPTION_ORDER_ASSIGNED_TO_DELIVERY_BOY',
  SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY = 'SUBSCRIPTION_ORDER_REJECTED_BY_DELIVERY_BOY',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  SUBSCRIPTION_ORDER_DELIVERED = 'SUBSCRIPTION_ORDER_DELIVERED',
  ORDER_OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ORDER_CONFIRMED_BY_ADMIN = 'ORDER_CONFIRMED_BY_ADMIN',
  ORDER_CANCELLED_BY_ADMIN = 'ORDER_CANCELLED_BY_ADMIN',
  ORDER_READY_TO_PICKUP_BY_ADMIN = 'ORDER_READY_TO_PICKUP_BY_ADMIN',
  SUBSCRIPTION_ORDER_READY_TO_PICKUP_BY_ADMIN = 'SUBSCRIPTION_ORDER_READY_TO_PICKUP_BY_ADMIN',
  ORDER_DELIVERED_BY_ADMIN = 'ORDER_DELIVERED_BY_ADMIN',
  ORDER_OUT_FOR_DELIVERY_BY_ADMIN = 'ORDER_OUT_FOR_DELIVERY_BY_ADMIN',
  SUBSCRIPTION_ORDER_DELIVERED_BY_ADMIN = 'SUBSCRIPTION_ORDER_DELIVERED_BY_ADMIN',
  SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY_BY_ADMIN = 'SUBSCRIPTION_ORDER_OUT_FOR_DELIVERY_BY_ADMIN',
}

export const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String },
    notifyType: { type: NotificationType },
    isRead: { type: Boolean, default: false },
    description: { type: String },
    orderID: { type: Number },
    orderId: { type: String },
    orderFrom: { type: String },
    userId: { type: String },
    deliveryBoyId: { type: String },
    deliveryBoyName: { type: String },
    productId: { type: String },
    unit: { type: String },
    subscriptionId: { type: String },
    isSubscriptionOrder: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export class NotificationSaveDTO {
  title?: string;
  description?: string;
  notifyType?: NotificationType;
  orderId: string;
  orderID: number;

  deliveryBoyId?: string;
  userId?: string;
  deliveryBoyName?: string;
  productId?: string;
  unit?: string;
  isSubscriptionOrder?: boolean;
  subscriptionId?: string;
}
export class NotificationssSaveDTO {
  title?: string;
  description?: string;
  notifyType?: NotificationType;
  orderId: string;
  orderID: number;
  orderFrom: string;
  deliveryBoyId?: string;
  userId?: string;
  deliveryBoyName?: string;
  productId?: string;
  unit?: string;
  isSubscriptionOrder?: boolean;
  subscriptionId?: string;
}
export class NotificationsSaveDTO {
  title?: string;
  description?: string;
  notifyType?: NotificationType;
  userId?: string;
  isSubscriptionOrder?: boolean;
  subscriptionId?: string;
}
export class NotificationDTO {
  @ApiModelProperty()
  title: string;

  @ApiModelProperty()
  description: string;

  @ApiModelProperty()
  notifyType: NotificationType;

  @ApiModelProperty()
  orderId: string;

  @ApiModelProperty()
  orderID: number;

  @ApiModelProperty()
  deliveryBoyId: string;

  @ApiModelProperty()
  deliveryBoyName: string;

  @ApiModelProperty()
  isRead: boolean;

  productId: string;
  unit: string;
  subscriptionId?: string;
  isSubscriptionOrder?: boolean;
}
export class ResponseNotificationListDTO {
  @ApiModelProperty()
  @IsString()
  response_code: string;

  @ApiModelProperty({ isArray: true })
  response_data: NotificationDTO;
}

export class SendNotificationDTO {
  @ApiModelProperty()
  title: string;

  @ApiModelProperty()
  body: string;
}
export class readNotificationDTO {
  @ApiModelProperty()
  notificationId: string;
}
export class AdminNotificationDTO {
  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  body: string;
}
export interface ISaveDeliveryBoyNotification {
  _id?: string;
  isRead: boolean;
  title?: string;
  description: string;
  jobID?: string;
  notifyType: string;
  deliveryBoyId: string;
  page?: string;
  orderId?: string;
  orderID?: number;
  subscriptionId?: string;
  isSubscriptionOrder?: boolean;
}
export interface ISaveUsersNotification {
  _id?: string;
  isRead: boolean;
  title: string;
  description: string;
  notifyType: string;
  userId: string;
  page?: string;
  orderId?: string;
  orderID?: number;
  subscriptionId?: string;
  isSubscriptionOrder?: boolean;
}
export interface INotificationDeliveryBoy {
  deliveryBoyId: string;
  orderId: string;
  orderID: number;
  notifyType: NotificationType;
  subscriptionId?: string;
  isSubscriptionOrder?: boolean;
}
export interface INotificationsDeliveryBoy {
  deliveryBoyId: string;
  orderId: string;
  orderID: number;
  orderFrom: string;
  notifyType: NotificationType;
  subscriptionId?: string;
  isSubscriptionOrder?: boolean;
}
export interface INotificationUser {
  userId: string;
  subscriptionId?: string;
  orderId: string;
  orderID: number;
  notifyType?: NotificationType;
  orderStatus?: string;
  isSubscriptionOrder?: boolean;
}
