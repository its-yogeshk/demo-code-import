import * as mongoose from 'mongoose';
import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsBase64,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ImageDTO, UserQuery, USER_PLATFORM } from '../utils/app.model';
import { Type } from 'class-transformer';

export enum SubscriptionSchedule {
  DAILY = 'DAILY',
  ALTERNATE = 'ALTERNATE',
  EVERY_3_DAY = 'EVERY_3_DAY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum SubscriptionPaymentType {
  PREPAID = 'PREPAID',
  DAILY = 'DAILY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSE = 'PAUSE',
  CANCELLED = 'CANCELLED',
}

const Product = {
  productId: { type: String },
  productName: { type: String },
  variantId: { type: String },
  productDescription: { type: String },
  unit: { type: String },
  quantity: { type: Number },
  productTotal: { type: Number },
  imageUrl: { type: String },
  filePath: { type: String },
  productImages: { type: Array },
  categoryId: { type: String },
  subCategoryId: { type: String },
  subScriptionAmount: { type: Number },
  subscriptionTotal: { type: Number },
  categoryName: { type: String },
  subCategoryName: { type: String },
  sku: { type: String },
};

export const SubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String },
    products: [Product],
    status: { type: SubscriptionStatus },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    pauseStartDate: { type: Date },
    pauseEndDate: { type: Date },
    schedule: { type: SubscriptionSchedule },
    paymentType: { type: SubscriptionPaymentType },
    address: { type: Object },
    subscriptionTodayStatus: { type: String },
    orderFrom: { type: String },
    grandTotal: { type: Number },
  },
  {
    timestamps: true,
  },
);

export class SubscriptionUpdateDTO {
  @ApiModelProperty()
  quantity?: number;

  @ApiModelProperty()
  address?: string;

  @ApiModelProperty()
  schedule?: string;

  @ApiModelProperty()
  subscriptionStartDate?: number;
  @ApiModelProperty()
  subscriptionEndDate?: number;
}

export class SubscriptionPauseUpdateDTO {
  @ApiModelProperty()
  pauseStartDate?: string;

  @ApiModelProperty()
  pauseEndDate?: string;

  @ApiModelProperty()
  status?: string;
}

class ProductDTO {
  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiModelProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @ApiModelPropertyOptional()
  productTotal?: number;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiModelProperty()
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiModelProperty()
  @IsNumber()
  @Min(1)
  subScriptionAmount: number;

  @ApiModelProperty()
  @IsNumber()
  @Min(1)
  subscriptionTotal: number;

  categoryName?: string;
  subCategoryName?: string;
  sku?: string;
}

export class NewSubscriptionDTO {
  @ApiModelProperty({ type: ProductDTO, isArray: true })
  @Type(() => ProductDTO)
  @ValidateNested()
  products: ProductDTO[];

  @ApiModelProperty()
  @IsNotEmpty()
  subscriptionStartDate: number;

  @ApiModelProperty({ enum: Object.values(SubscriptionSchedule) })
  @IsNotEmpty()
  schedule: SubscriptionSchedule;

  @ApiModelProperty()
  @IsNotEmpty()
  address: string | object;

  @ApiModelProperty({ enum: Object.values(USER_PLATFORM) })
  @IsString()
  @IsNotEmpty()
  orderFrom: string;

  @ApiModelProperty()
  @IsNumber()
  @Min(1)
  grandTotal: number;

  userId?: string;
  status?: SubscriptionStatus;
  paymentType?: SubscriptionPaymentType;
  subscriptionEndDate?: string;
  locationName?: string;
}

export class UserSubscriptionFilterQuery extends UserQuery {
  @ApiModelPropertyOptional({ type: SubscriptionSchedule })
  schedule?: SubscriptionSchedule;

  @ApiModelPropertyOptional({ type: SubscriptionStatus })
  status?: SubscriptionStatus;
}
