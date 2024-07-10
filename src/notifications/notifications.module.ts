import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notifications.controller';
import { NotificationSchema } from './notifications.model';
import { NotificationService } from './notifications.service';
import { PushService } from '../utils/push.service';
import { NotificationListener } from "./notifications.listeners";
import { NotificationsContent } from "./notifications-content";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Notification', schema: NotificationSchema }])
	],
	controllers: [NotificationController],
	providers: [NotificationService, PushService, NotificationListener,
		NotificationsContent,],
	exports: [NotificationService, MongooseModule]
})

export class NotificationsModule {
}
