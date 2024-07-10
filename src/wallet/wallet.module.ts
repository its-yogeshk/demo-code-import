import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RazorPayService } from '../utils/razorpay.service';
import { UsersModule } from '../users/users.module';
import { WalletController } from './wallet.controller';
import { WalletSchema } from './wallet.model';
import { WalletService } from './wallet.service';
import { StripeService } from '../utils/stripe.service';
import { UtilService } from '../utils/util.service';
import { SettingModule } from '../settings/settings.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Wallet', schema: WalletSchema }]),
    forwardRef(() => UsersModule),
    forwardRef(() => SettingModule),
    LoyaltyModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    RazorPayService,
    StripeService,
    UtilService,
    LoyaltyService,
  ],
  exports: [WalletService, MongooseModule],
})
export class WalletModule {}
