import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LoggerModel } from './log-manager.model';
import { ILogManager, ILogManagerDocument, ILogManagerModel } from './log-manager.types';

@Injectable()
export class LogManagerService {

    constructor(
        @InjectModel(LoggerModel) private readonly loggerModel: ILogManagerModel,
    ) {};

    async create(data: ILogManager): Promise<ILogManagerDocument> {
        return await this.loggerModel.create(data);
    };

    async update(id: string, updateData: Partial<ILogManager>): Promise<ILogManagerDocument> {
        return await this.loggerModel.findByIdAndUpdate(id, updateData, { new: true });
    };

    async appendToSuccessList(id: string, successId: string) {
        await this.loggerModel.findByIdAndUpdate(id, { $push: { activeSubscriptions: successId }, $inc: { successful: 1 }});
    };

    async appendToFailedList(id: string, failedData: { id: string, reason: string }) {
        await this.loggerModel.findByIdAndUpdate(id, { $push: { failedSubscriptions: failedData }, $inc: { failed: 1 }});
    };
};
