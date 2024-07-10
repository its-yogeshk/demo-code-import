import { Document, Model } from "mongoose";

export enum LoggerOf {
    CRON_SUBSCRIPTION = "CRON ON SUBSCRIPTION",
    CRON_SUB_ORDER = "CRON ON SUB ORDER"
};

export interface ILogManager {
    day: number,
    month: number,
    year: number,
    date: Date,
    total: number,
    successful?: number,
    failed?: number,
    activeSubscriptions?: Array<string>,
    failedSubscriptions?: Array<{ id: string, reason: string }>,
    logOf: LoggerOf,
    isRerun?: boolean,
    rerunLogId?: string,
    startedAt: number,
    finishedAt?: number
};

export interface ILogManagerDocument extends ILogManager, Document {};
export interface ILogManagerModel extends Model<ILogManagerDocument> {};