import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './users.controller';
import { UserSchema } from './users.model';
import { UserService } from './users.service';
import { AuthService } from '../utils/auth.service';
import { EmailService } from '../utils/email.service';
import { OtpService } from '../utils/otp.service';
import { OrderModule } from '../order/order.module';
import { SettingService } from '../settings/settings.service';
import { SettingModule } from '../settings/settings.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    OrderModule,
    SettingModule,
    LoyaltyModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    AuthService,
    EmailService,
    OtpService,
    SettingService,
  ],
  exports: [UserService, MongooseModule],
})
export class UsersModule {}
