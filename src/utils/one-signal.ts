import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
export interface ICreateNotification {
	contents: unknown;
	headings?: unknown;

	/**
	 * @description
	 * A custom map of data that is passed back to your app. Same as using Additional Data within the dashboard. Can use up to 2048 bytes of data.
	 * Example: {"abc": 123, "foo": "bar", "event_performed": true, "amount": 12.1}
	 */
	data?: unknown;

	/**
     * @description
     * sent to app platforms.
      Including iOS, Android, macOS, Windows, ChromeApps, etc
     */
	app_url?: string;

	/**
	 * @description Use this if you have client side Android Oreo Channels you have already defined in your app with code.
	 */
	existing_android_channel_id?: string;

	/**
	 * @description
	 * Delivery priority through the push server (example GCM/FCM). Pass 10 for high priority or any other integer for normal priority. Defaults to normal priority for Android and high for iOS.
	 * For Android 6.0+ devices setting priority to high will wake the device out of doze mode.
	 */
	priority?: number;

	/**
     * @description Specific playerids to send your notification to.
     *  _Does not require API Auth Key.
     *   Do not combine with other targeting parameters.
     * Not compatible with any other targeting parameters.
     * Example: ["1dd608f2-c6a1-11e3-851d-000c2940e62c"]
     Limit of 2,000 entries per REST API call
     */
	include_player_ids?: string[];

	filters?: any[];
}
export interface IBaseNotification extends ICreateNotification {
	contents: string;
	headings: string;
}

@Injectable()
export class OneSignal {
	private readonly appId: string = process.env.ONE_SIGNAL_APP_ID_USER;
	private readonly secretKey: string = process.env.ONE_SIGNAL_SECRET_KEY_USER;
	private readonly deliveryAppId: string = process.env.ONE_SIGNAL_APP_ID_DELIVERY;
	private readonly deliverySecretKey: string = process.env.ONE_SIGNAL_SECRET_KEY_DELIVERY;

	private readonly uri = 'https://onesignal.com';
	private client: AxiosInstance = axios.create({
		baseURL: this.uri,
		headers: {
			authorization: `Basic ${this.secretKey}`,
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
	private deliveryClient: AxiosInstance = axios.create({
		baseURL: this.uri,
		headers: {
			authorization: `Basic ${this.deliverySecretKey}`,
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
	constructor() {
		this.setInterceptors();
	}

	private setInterceptors() {
		// adds app_id
		this.client.interceptors.request.use(config => {
			if (Object.keys(config.data).length) {
				config.data = { app_id: this.appId, ...config.data };
			}
			return AxiosLogger.requestLogger(config);
		}, AxiosLogger.errorLogger);
		this.client.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);

		this.deliveryClient.interceptors.request.use(config => {
			if (Object.keys(config.data).length) {
				config.data = { app_id: this.deliveryAppId, ...config.data };
			}
			return AxiosLogger.requestLogger(config);
		}, AxiosLogger.errorLogger);
		this.deliveryClient.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);
	}

	private prepareNotification(notification: IBaseNotification): ICreateNotification {
		const { contents, headings, ...options } = notification;
		const finalNotification: ICreateNotification = {
			contents: { en: contents },
			headings: { en: headings },
			...options,
			priority: options.priority ? options.priority : 10,
		};
		return finalNotification;
	}

	async sendNotificationToPlayerIDs(notification: IBaseNotification, playerIDs: string[]) {
		const path = `/api/v1/notifications`;
		const {data}  = await this.client.post(
			path,
			this.prepareNotification({
				...notification,
				include_player_ids: playerIDs,
			}),
		);
        //console.log("data",data);
		return data;
	}

	/**
	 * @description reference https://documentation.onesignal.com/reference/create-notification#formatting-filters
	 */
	async sendNotificationByFilters(notification: IBaseNotification, filters: any[]) {
		const path = `/api/v1/notifications`;
		const { data } = await this.client.post(path, this.prepareNotification({ ...notification, filters }));
		return data;
	}

	async sendDeliveryBoyNotificationToPlayerIDs(notification: IBaseNotification, playerIDs: string[]) {
		const path = `/api/v1/notifications`;
		const { data } = await this.deliveryClient.post(
			path,
			this.prepareNotification({
				...notification,
				include_player_ids: playerIDs,
			}),
		);
		return data;
	}
}
