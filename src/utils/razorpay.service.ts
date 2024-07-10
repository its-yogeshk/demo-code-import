import { Injectable } from '@nestjs/common';
import * as Razorpay from "razorpay";
import * as crypto from "crypto";

let instance: any;

@Injectable()
export class RazorPayService {
	constructor() {
		if (process.env.RAZOR_KEY_ID && process.env.RAZOR_SECRET_KEY) {
			instance = new Razorpay({
				key_id: process.env.RAZOR_KEY_ID,
				key_secret: process.env.RAZOR_SECRET_KEY
			});
		}
		else console.log("RAZOR_SECRET_KEY or RAZOR_KEY_ID not set.");
	}

	public async createOrderPayment(options) {
		return instance.orders.create(options);
	}

	public getOrderDetail(orderId: string) {
		return instance.orders.fetch(orderId)
	}

	public getPaymentDetail(paymentId: string) {
		return instance.payments.fetch(paymentId)
	}

	public async verifyPaymentSignature(orderId: string, paymentId: string) {
		let text: string = orderId + '|' + paymentId;

		let hash = crypto.createHmac('sha256', process.env.RAZOR_SECRET_KEY)
			.update(text)
			.digest('hex');

		return hash;
	}
}
