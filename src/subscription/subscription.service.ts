import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../users/users.service';
import { SubscriptionSchedule, SubscriptionStatus, } from './subscription.model';

@Injectable()
export class SubscriptionService {
	constructor(
		@InjectModel('Subscription') private readonly subscriptionModel: Model<any>,
		private userService: UserService
	) { }

	public async getSubscriptionById(subscriptionId: string): Promise<any> {
		return await this.subscriptionModel.findById(subscriptionId);
	}

	public async getSubscriptionsByUserId(userId: string, page: number, limit: number): Promise<Array<any>> {
		let skip = page * limit;
		return await this.subscriptionModel.find({ userId: userId }).limit(limit).skip(skip).sort({ createdAt: - 1 });
	}

	public async createSubscription(subscriptionData: any): Promise<any> {
		return await this.subscriptionModel.create(subscriptionData);
	}

	public async deleteSubscription(subscriptionId: string): Promise<any> {
		return await this.subscriptionModel.findByIdAndRemove(subscriptionId);
	}

	public async updateSubscription(subscriptionId: string, subscriptionData: any): Promise<any> {
		return await this.subscriptionModel.findByIdAndUpdate(subscriptionId, subscriptionData, {new: true});
	}

	public async pauseSubscription(subscriptionId: string): Promise<any> {
		return await this.subscriptionModel.findByIdAndUpdate(subscriptionId, { $set: { status: SubscriptionStatus.PAUSE } })
	}

	public async startSubscription(subscriptionId: string): Promise<any> {
		return await this.subscriptionModel.findByIdAndUpdate(subscriptionId, { $set: { status: SubscriptionStatus.ACTIVE } })
	}

	public async getAllActiveSubscription(): Promise<Array<any>> {
		return await this.subscriptionModel.find({subscriptionTodayStatus : "PENDING", status: { $in: [ SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSE]}});
	}

	public async getAllSubscription() {
		return await this.subscriptionModel.find({status: { $in: [ SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSE] }});
	}
	
	public async getSubscribedUserList(page: number, limit: number,): Promise<Array<any>> {
		const skip = (page - 1) * limit;
		let filter = {};

		const match = {
			$match: filter
		};

		const sort = {
			$sort: { createdAt: -1 }
		};

		const skipAgg = {
			$skip: skip
		};

		const limitAgg = {
			$limit: limit
		};

		const group = {
			$group: {
				_id: "$userId",
				subscriptionCount: { $sum: 1 }
			}
		};

		const project = {
			$project: {
				_id: 0,
				user: "$_id",
				subscriptionCount: 1
			}
		}

		const Query = [match, sort, group, skipAgg, limitAgg, project];
		const PaginationQuery = [match, group];

		const [userList, paginationList] = await Promise.all([
			this.subscriptionModel.aggregate(Query),
			this.subscriptionModel.aggregate(PaginationQuery),
		]);

		const List = await this.userService.populateUser(userList);
		const Total = paginationList.length;

		return [ List, Total ];
	};

	public async getUserSubscriptionsList(userId: string, page: number, limit: number, status?: SubscriptionStatus, schedule?: SubscriptionSchedule): Promise<Array<any>> {
		const skip = (page-1) * limit;
		let filter = { userId };

		if(status) filter['status'] = status;
		if(schedule) filter['schedule'] = schedule;

		return await Promise.all([
			this.subscriptionModel.find(filter).skip(skip).limit(limit),
			this.subscriptionModel.countDocuments(filter)
		]);
	}

	// test will remove later
	public async testGet(): Promise<any> {
		let orders = await this.subscriptionModel.find({});
		return orders
	}

	public async testUpdate(data): Promise<any> {
		let orders = await this.subscriptionModel.updateOne({_id: data._id}, data , {new: true});
		return orders
	}
}