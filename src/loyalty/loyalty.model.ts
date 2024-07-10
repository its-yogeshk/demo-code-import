import * as mongoose from 'mongoose';
import { ApiModelProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export enum LoyaltyType {
  NEW_REGISTRATION_BONUS = 'NEW_REGISTRATION_BONUS',
  ADMIN_EXTRA_BONUS = 'ADMIN_EXTRA_BONUS',
  NEW_REFERRAL_BONUS = 'NEW_REFERRAL_BONUS',
  LOYALTY_TO_WALLET_TOPUP = 'LOYALTY_TO_WALLET_TOPUP',
  BONUS_ON_ORDER = 'BONUS_ON_ORDER',
  LOYALTY_ON_ORDER = 'LOYALTY_ON_ORDER',
  LOYALTY_USED_ON_ORDER_PAYMENT = 'LOYALTY_USED_ON_ORDER_PAYMENT',
  NEW_REGISTRATION_BONUS_POINT = 'NEW_REGISTRATION_BONUS_POINT',
}

export const LoyaltySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Types.ObjectId, ref: 'Order' },
    orderID: { type: Number },
    point: { type: Number, default: 0 },
    loyaltyType: { type: LoyaltyType },
    description: { type: String },
    isCredited: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);
export interface LoyaltyDTO {
  userId: string;
  point: number;
  loyaltyType: LoyaltyType;
  isCredited: boolean;
  description?: string;
  orderId?: string;
  orderID?: string;
}

export class ResponseLoyaltyHistory {
  @IsString()
  @ApiModelProperty()
  response_code: string;

  @ApiModelProperty({ isArray: true })
  response_data: LoyaltyDTO;

  @ApiModelProperty()
  @IsNumber()
  total: number;
}

export class LoyaltyCreateDTO {
  @IsString()
  @ApiModelProperty()
  userId: string;

  @IsNumber()
  @ApiModelProperty()
  point: number;

  @IsString()
  @ApiModelProperty()
  description: string;

  loyaltyType?: LoyaltyType;
  isCredited?: boolean;
  orderId?: string;
  orderID?: number;
}
