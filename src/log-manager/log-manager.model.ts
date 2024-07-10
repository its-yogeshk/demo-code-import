import { Schema, SchemaType } from "mongoose";
import { LoggerOf } from "./log-manager.types";

export const LoggerModel = 'Log';

const FailedListSchema = new Schema({
    id: String,
    reason: String
}, {
    id: false,
    versionKey: false,
    timestamps: false
});

export const LoggerSchema = new Schema({
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    date: { type: Date, required: true, default: new Date() },
    total: Number,
    successful: Number,
    failed: Number,
    activeSubscriptions: [String],
    failedSubscriptions: [{ type: FailedListSchema }],
    logOf: { type: String, required: true, enum: Object.values(LoggerOf)},
    isRerun: { type: Boolean, default: false },
    rerunLogId: { type: Schema.Types.ObjectId, ref: LoggerModel},
    startedAt: { type: Number, required: true },
    finishedAt: Number
},{ timestamps: true});

LoggerSchema.index({ day: -1, month: -1, year: -1, date: -1, logOf: 1 });