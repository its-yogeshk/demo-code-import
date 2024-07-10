import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltySchema } from './loyalty.model';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Loyalty', schema: LoyaltySchema }]),
    forwardRef(() => UsersModule),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService, MongooseModule],
})
export class LoyaltyModule {}
