import { Injectable } from '@nestjs/common';
const ejs = require('ejs');
const appRoot = require('app-root-path');
var pdf = require('html-pdf')
const fs = require('fs');
const sgMail = require('@sendgrid/mail');
import { UtilService } from './util.service';
import { ResponseMessage } from './app.model';
var SibApiV3Sdk = require('sib-api-v3-sdk');
var defaultClient = SibApiV3Sdk.ApiClient.instance;
const request = require('request');
import { createTransport } from "nodemailer";

@Injectable()
export class EmailService {
	constructor(private utilService: UtilService) {
		if (process.env.USE_SENDINBLUE_EMAIL == 'false') {
			if (process.env.SENDGRID_KEY && process.env.SENDGRID_FROM) sgMail.setApiKey(process.env.SENDGRID_KEY);
			else console.log("SENDGRID_KEY or SENDGRID_FROM is not set.");
		} else {
			if (process.env.SENDINBLUE_USER && process.env.SENDINBLUE_PASSWORD && process.env.SENDINBLUE_HOST_NAME) {
			}
			else console.log(`SENDINBLUE_USER, SENDINBLUE_PASSWORD or SENDINBLUE_HOST_NAME is not set.`);
		}
	}

	public async sendEmail(email: string, subject: string, text?: string, html?: string, attachment?): Promise<any> {
		if (email) {
			let response;
			if (process.env.USE_SENDINBLUE_EMAIL === 'true') {
				let msg = {
					to: email,
					from: process.env.SENDINBLUE_USER,
					subject: subject
				};
				if (text) msg['text'] = text;
				if (html) msg['html'] = html;
				if (attachment) {
					msg['attachments'] = [{
						content: attachment,
						filename: "invoice.pdf",
						type: "application/pdf",
						disposition: "attachment"
					}];
				}
				const transporter = createTransport({
					host: process.env.SENDINBLUE_HOST_NAME,
					port: 587,
					secure: false,
					auth: {
						user: process.env.SENDINBLUE_USER,
						pass: process.env.SENDINBLUE_PASSWORD,
					},
				});
				response = await transporter.sendMail(msg)
				console.log("email response from sendinblue", response)
			}
			else {
				let msg = {
					to: email,
					from: process.env.SENDGRID_FROM,
					subject: subject
				};
				if (text) msg['text'] = text;
				if (html) msg['html'] = html;
				if (attachment) {
					msg['attachments'] = [{
						content: attachment,
						filename: "invoice.pdf",
						type: "application/pdf",
						disposition: "attachment"
					}];
				}
				response = await sgMail.send(msg);
				console.log("email response from sendgrid", response)
			}
			return response;
		}
	}

	public async emailVerifyTemplate(html, verifyButton, emailverificationId: string, email: string) {
		let url: string = process.env.NODE_ENV === 'production' ? process.env.API_URL_PRODUCTION : process.env.API_URL_STAGING;
		url += `/users/verify-email?verificationId=${emailverificationId}&email=${email}`;
		const htmlData: string = `<p>${html}</p><br><a href="${url}" target="_blank">${verifyButton}</a>`;
		return htmlData;
	}

	public async sendEmailForForgotPassword(firstName: string, email: string, otp: number): Promise<any> {
		const subject = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_FORGOT_PASSWORD_EMAIL_SUBJECT);
		let html = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_FORGOT_PASSWORD_EMAIL_BODY);
		html = html.replace('${firstName}', firstName);
		html = html.replace('${OTP}', `${otp}`);
		return await this.sendEmail(email, subject, null, html);
	}

	public async sendEmailForVerification(firstName: string, email: string, emailVerificationId: string): Promise<any> {
		const subject = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_EMAIL_VERIFY_SUBJECT);
		const verifyButton = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_EMAIL_VERIFY_BUTTON);
		let html = await this.utilService.getTranslatedMessageByKey(ResponseMessage.USER_EMAIL_VERIFY_BODY);
		html = html.replace('${firstName}', firstName);
		const mailBody = await this.emailVerifyTemplate(html, verifyButton, emailVerificationId, email);
		const emailRes = await this.sendEmail(email, subject, null, mailBody);
		return emailRes;
	}

	public async invoiceTemplate(order, cart, business) {
		try {
			var newDate = new Date(order.createdAt);
			var formattedDate = newDate.getDate() + '-' + newDate.getMonth() + '-' + newDate.getFullYear();
			const text = {
				invoice: 'Invoice',
				date: 'Date',
				payment: 'Payment',
				billTo: 'Bill to',
				sl: 'Sl.',
				item: 'Item',
				qty: 'Qty',
				price: 'Price',
				discount: 'Discount',
				bundeloffer: 'Bundle Offer',
				total: 'Total',
				subTotal: 'Sub Total',
				deliveryCharge: 'Delivery Charges',
				tax: 'Tax',
				couponDiscount: 'Coupon Discount',
				wallet: 'Wallet',
				grandTotal: 'Grand Total',
				buy: 'Buy',
				get: 'Get',
				true: true,
				offerQuantity: "offerQuantity",
				dash: "-",
				space: " "
			}
			const info = {
				storeName: business.storeName,
				storeAddress: business.address,
				storePhone: business.phoneNumber,
				storeEmail: business.email,
				invoiceTitle: "Invoice",
				orderId: order.orderID,
				deliveryDate: formattedDate,
				paymentType: order.paymentType,
				userName: `${order.user.firstName} ${order.user.lastName}`,
				userAddress: order.address.address,
				userMobile: order.user.mobileNumber,
				userEmail: order.user.email,
				products: cart.products,
				subTotal: this.utilService.convertToDecimal(order.subTotal),
				deliveryCharges: this.utilService.convertToDecimal(order.deliveryCharges),
				tax: this.utilService.convertToDecimal(order.tax),
				couponDiscount: this.utilService.convertToDecimal(order.couponAmount ? order.couponAmount : 0),
				walletAmount: this.utilService.convertToDecimal(order.usedWalletAmount),
				isWalletUsed: order.isWalletUsed,
				grandTotal: this.utilService.convertToDecimal(order.grandTotal),
				currency: order.currencySymbol,
				text: text
			};
			console.log(info);
			const templatePath = `${appRoot.path}/components/order_invoice.ejs`;
			const templateHtml = await fs.readFileSync(templatePath, 'utf-8');
			const htmlBody = await ejs.render(templateHtml, info);
			return htmlBody;
		} catch (e) {
			console.log(e);
		}
	}

	public async createInvoice(order, carts, business) {
		const htmlBodyPDF = await this.invoiceTemplate(order, carts, business);
		const prom = new Promise(function (resolve, reject) {
			var options = { "format": "Letter", "base": `file://${appRoot.path}/` };
			pdf.create(htmlBodyPDF, options).toFile("invoice.pdf", function (err, pdfRes) {
				if (err) {
					console.log("invoicePdfGenerate: " + err);
					reject(err);
				} else resolve(pdfRes.filename);
			});
		})
		return prom;
	}

	public async printinvoiceTemplate(order, cart, business) {
		try {
			var newDate = new Date(order.createdAt);
			var formattedDate = newDate.getDate() + '-' + newDate.getMonth() + '-' + newDate.getFullYear();
			const text = {
				invoice: 'Invoice',
				date: 'Date',
				payment: 'Payment',
				billTo: 'Bill to',
				sl: 'Sl.',
				item: 'Item',
				qty: 'Qty',
				price: 'Price',
				discount: 'Discount',
				bundeloffer: 'Bundle Offer',
				total: 'Total',
				subTotal: 'Sub Total',
				deliveryCharge: 'Delivery Charges',
				tax: 'Tax',
				couponDiscount: 'Coupon Discount',
				wallet: 'Wallet',
				grandTotal: 'Grand Total',
				buy: 'Buy',
				get: 'Get',
				true: true,
				offerQuantity: "offerQuantity",
				dash: "-",
				space: " ",
				shelfNumber: "Shelf Number",
				codeNumber: "Code Number",
				orderStatus: "Order Status",
				paymentStaus: "Payment Staus",


			}
			const info = {
				storeName: business.storeName,
				storeAddress: business.address,
				storePhone: business.phoneNumber,
				storeEmail: business.email,
				invoiceTitle: "Invoice",
				orderId: order.orderID,
				deliveryDate: formattedDate,
				paymentType: order.paymentType,
				userName: `${order.user.firstName} ${order.user.lastName}`,
				userAddress: order.address.address,
				userMobile: order.user.mobileNumber,
				userEmail: order.user.email,
				products: cart.products,
				subTotal: this.utilService.convertToDecimal(order.subTotal),
				deliveryCharges: this.utilService.convertToDecimal(order.deliveryCharges),
				tax: this.utilService.convertToDecimal(order.tax),
				couponDiscount: this.utilService.convertToDecimal(order.couponAmount ? order.couponAmount : 0),
				walletAmount: this.utilService.convertToDecimal(order.usedWalletAmount),
				isWalletUsed: order.isWalletUsed,
				grandTotal: this.utilService.convertToDecimal(order.grandTotal),
				currency: order.currencySymbol,
				paymentstatus: order.paymentStatus,
				orderStatus: order.orderStatus,
				text: text,
				isOrderModified: order.isOrderModified,
			    amountRefundedOrderModified: "Item updated " + order.currencySymbol + order.amountRefundedOrderModified
			};
			// console.log(info);
			const templatePath = `${appRoot.path}/components/orderprint_invoice.ejs`;
			const templateHtml = await fs.readFileSync(templatePath, 'utf-8');
			const htmlBody = await ejs.render(templateHtml, info);
			return htmlBody;
		} catch (e) {
			console.log(e);
		}
	}
	public async printInvoice(order, carts, business) {
		const htmlBodyPDF = await this.printinvoiceTemplate(order, carts, business);
		console.log(htmlBodyPDF);
		// const prom = new Promise(function (resolve, reject) {
		// 	var options = { "format": "Letter", "base": `file://${appRoot.path}/` };
		// 	pdf.create(htmlBodyPDF, options).toFile("invoice.pdf", function (err, pdfRes) {
		// 		if (err) {
		// 			console.log("invoicePdfGenerate: " + err);
		// 			reject(err);
		// 		} else resolve(htmlBodyPDF);
		// 	});
		// })
		return htmlBodyPDF;
	}

	async sendEmailOrder(order, cart, business?, isCompleted = false) {
		var newDate = new Date(order.createdAt);
		var formattedDate = newDate.getDate() + '-' + newDate.getMonth() + '-' + newDate.getFullYear();
		var url = process.env.API_URL_PRODUCTION;
		var baseUrl = url.replace(/^[^.]+\./g, "");
		var webName = baseUrl;
		var webUrl = "https://" + baseUrl;
		var logo = "https://" + baseUrl + "/assets/images/webapp.png";
		let subject = "Your order has been received!";
		if (baseUrl == "ionicfirebaseapp.com") logo = "https://grocery-web.ionicfirebaseapp.com/assets/images/webapp.png";
		let text = {
			thankYouMessage: 'Thank you for your purchase !',
			message: "We've received your order #" + order.orderID + ", and it is now being processed:",
			orderDetail: 'Order Detail',
			orderNumber: 'Order Number',
			orderDate: 'Order Date',
			paymentStatus: 'Payment Status',
			billTo: 'Bill To',
			product: 'Product',
			qty: 'Quantity/Size',
			price: 'Price',
			discount: 'Discount',
			subTotal: 'Sub Total',
			deliveryCharge: 'Delivery Charges',
			tax: 'Tax',
			couponDiscount: 'Coupon Discount',
			wallet: 'Used Wallet Amount',
			grandTotal: 'Grand Total',
		}
		let attachment = null;
		if (isCompleted) {
			text.thankYouMessage = "Thanks for shopping with us";
			text.message = "We have finished processing your order.";
			subject = "Your order is now complete";
			let pathToAttachment = await this.createInvoice(order, cart, business);
			attachment = await fs.readFileSync(pathToAttachment).toString("base64");
		}
		let info = {
			orderId: order.orderID,
			orderDate: formattedDate,
			paymentType: order.paymentType,
			userName: `${order.user.firstName} ${order.user.lastName}`,
			userAddress: order.address?.address,
			userMobile: order.user.mobileNumber,
			userEmail: order.user.email,
			products: cart.products,
			subTotal: this.utilService.convertToDecimal(order.subTotal),
			deliveryCharges: this.utilService.convertToDecimal(order.deliveryCharges),
			tax: this.utilService.convertToDecimal(order.tax),
			walletAmount: this.utilService.convertToDecimal(order.usedWalletAmount),
			couponDiscount: this.utilService.convertToDecimal(order.couponAmount ? order.couponAmount : 0),
			isWalletUsed: order.isWalletUsed,
			grandTotal: this.utilService.convertToDecimal(order.grandTotal),
			currency: order.currencySymbol,
			webName: webName,
			webUrl: webUrl,
			logo: logo,
			text: text,
			isOrderModified: order.isOrderModified,
			    amountRefundedOrderModified: "Item updated " + order.currencySymbol + order.amountRefundedOrderModified
		};
		try {
			const templatePath = `${appRoot.path}/components/order.ejs`;
			const templateHtml = await fs.readFileSync(templatePath, 'utf-8');
			const htmlBody = await ejs.render(templateHtml, info);
			return await this.sendEmail(order.user.email, subject, null, htmlBody, attachment);
		} catch (e) {
			console.log(e);
		}
	}
	public async sendEmailForPlacedOrder(order, cart) {
		this.sendEmailOrder(order, cart, null);
	}
	public async sendEmailOrderDelivered(order, cart, business) {
		this.sendEmailOrder(order, cart, business, true);
	}
}