import { Controller } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';

@Controller('subscription-status')
@ApiUseTags('Subscription-status')
export class SubscriptionStatusController {}
