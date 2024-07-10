import { Module } from '@nestjs/common';
import { LogManagerService } from './log-manager.service';
import { LogManagerController } from './log-manager.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModel, LoggerSchema } from './log-manager.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LoggerModel, schema: LoggerSchema }])
  ],
  providers: [LogManagerService],
  controllers: [LogManagerController],
  exports: [LogManagerService, MongooseModule]
})
export class LogManagerModule {}
