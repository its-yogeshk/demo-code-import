import * as mongoose from 'mongoose';
import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
import {
  PaymentStatusType,
  PaymentType,
  USER_PLATFORM,
} from '../utils/app.model';

export enum WalletTransactionType {
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ORDER_MODIFIED = 'ORDER_MODIFIED',
  WALLET_TOPUP = 'WALLET_TOPUP',
  WALLET_DEBIT = 'WALLET_DEBIT',
  WALLET_TOPUP_BY_GIFT_CARD = 'WALLET_TOPUP_BY_GIFT_CARD',
  WALLET_TOPUP_BY_LOYALTY = 'WALLET_TOPUP_BY_LOYALTY',
}

export enum WalletStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
}

const RazorpaySchema = new mongoose.Schema(
  {
    payment_id: { type: String },
    transactionStatus: { type: String },
    transactionId: { type: String },
    currency: { type: String },
    paymentStatus: { type: String, enum: Object.values(PaymentStatusType) },
    transactionDate: { type: String },
    transactionAmount: { type: Number },
  },
  {
    versionKey: false,
    timestamps: false,
    _id: false,
  },
);

export const WalletSchema = new mongoose.Schema(
  {
    userId: { type: String },
    amount: { type: Number, default: 0 },
    transactionType: { type: WalletTransactionType },
    description: { type: String },
    isCredited: { type: Boolean, default: true },
    orderId: { type: String },
    orderID: { type: Number },
    paymentType: { type: PaymentType },
    razorPayDetails: { type: RazorpaySchema },
    walletStatus: {
      type: String,
      enum: Object.values(WalletStatus),
      default: WalletStatus.SUCCESS,
    },
  },
  {
    timestamps: true,
  },
);

class RazorPayTopUp {
  payment_id: string;
  transactionStatus?: string;
  transactionId?: string;
  currency?: string;
  paymentStatus?: PaymentStatusType;
  transactionDate?: string;
  transactionAmount?: number;
}

export class WalletSaveDTO {
  userId: string;
  amount: number;
  transactionType?: WalletTransactionType;
  description?: string;
  isCredited?: boolean;
  orderId?: string;
  orderID?: number;
  paymentType?: PaymentType;

  @ValidateIf(data => {
    if (data.isCredited === true && data.paymentType === PaymentType.RAZORPAY)
      return true;
    else return false;
  })
  razorPayDetails?: RazorPayTopUp;
  walletStatus?: WalletStatus;
}

export class WalletDTO {
  @ApiModelProperty()
  amount: number;

  @ApiModelProperty()
  transactionType?: string;

  @ApiModelProperty()
  description: string;

  @ApiModelProperty()
  isCredit: boolean;

  @ApiModelProperty()
  orderId: string;

  @ApiModelProperty()
  orderID: number;

  @ApiModelProperty()
  userId: string;

  @ApiModelProperty()
  createdAt: number;

  _id?: string;
  paymentType?: PaymentType;
  razorPayDetails?: RazorPayTopUp;
}

export class ResponseWalletHistory {
  @IsString()
  @ApiModelProperty()
  response_code: string;

  @ApiModelProperty({ isArray: true })
  response_data: WalletDTO;

  @ApiModelProperty()
  @IsNumber()
  total: number;
}

export class WalletTopupDTO {
  @ApiModelProperty()
  @IsNumber()
  amount: number;

  @ApiModelProperty({ type: PaymentType, enum: Object.values(PaymentType) })
  @IsString()
  paymentType: string;

  @ApiModelProperty({ enum: Object.values(USER_PLATFORM) })
  @IsNotEmpty()
  userFrom: USER_PLATFORM;

  @ValidateIf(data => {
    if (data.paymentType === PaymentType.RAZORPAY) return true;
    else return false;
  })
  @ApiModelPropertyOptional()
  @IsString()
  generatedId?: string;

  @ValidateIf(data => {
    if (data.paymentType === PaymentType.RAZORPAY) return true;
    else return false;
  })
  @ApiModelPropertyOptional()
  @IsString()
  paymentId?: string;

  @ValidateIf(data => {
    if (data.paymentType === PaymentType.RAZORPAY) return true;
    else return false;
  })
  @ApiModelPropertyOptional()
  @IsString()
  signature?: string;

  @ValidateIf(data => {
    if (data.paymentType === PaymentType.RAZORPAY) return true;
    else return false;
  })
  @ApiModelPropertyOptional()
  @IsString()
  walletId?: string;
}

export class WalletTopupResponse {
  @IsString()
  @ApiModelProperty()
  sessionId: string;

  @IsString()
  @ApiModelProperty()
  userId: string;
}
export class ResponseWalletTopupData {
  @IsString()
  @ApiModelProperty()
  response_code: string;

  @ApiModelProperty()
  response_data: WalletTopupResponse;
}

export class WalletUpdateDTO {
  @IsNotEmpty()
  @ApiModelProperty()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiModelProperty()
  amount: number;

  @IsNotEmpty()
  @IsBoolean()
  @ApiModelProperty()
  isCredited: boolean;
}

export class WalletAmount {
  @ApiModelProperty()
  @IsNumber()
  amount: number;
}
export class WalletLoyaltyDTO {
  @ApiModelProperty()
  @IsNumber()
  loyaltyPoint: number;
}
