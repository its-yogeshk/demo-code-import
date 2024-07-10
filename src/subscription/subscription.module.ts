import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionSchema } from './subscription.model';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatusModule } from '../subscription-status/subscription-status.module'
import { UsersModule } from '../users/users.module';
@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Subscription', schema: SubscriptionSchema }]),
		SubscriptionStatusModule,
		UsersModule
	],
	controllers: [SubscriptionController],
	providers: [SubscriptionService],
	exports: [SubscriptionService, MongooseModule]
})

export class SubscriptionModule {
}

