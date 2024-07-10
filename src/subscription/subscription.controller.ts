import { Controller, UseGuards, Get, Query, Body, Post, Param, Put, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiImplicitQuery, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { UsersDTO } from '../users/users.model';
import { CommonResponseModel, ResponseBadRequestMessage, ResponseErrorMessage, ResponseMessage, ResponseSuccessMessage, UserQuery } from '../utils/app.model';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatus, SubscriptionUpdateDTO, SubscriptionPauseUpdateDTO, NewSubscriptionDTO, UserSubscriptionFilterQuery } from './subscription.model';
import { UtilService } from '../utils/util.service';
import { GetUser } from '../utils/jwt.strategy';
import { AddressService } from '../address/address.service'
import { ProductService } from '../products/products.service'
import { SubscriptionStatusService } from '../subscription-status/subscription-status.service'
@Controller('subscriptions')
@ApiUseTags('Subscriptions')
export class SubscriptionController {
	constructor(
		private subscriptionService: SubscriptionService,
		private utilService: UtilService,
		private addressService: AddressService,
		private productService: ProductService,
		private subscriptionStatusService: SubscriptionStatusService
	) {
	}


	@Get('/detail/:subscriptionId')
	@ApiOperation({ title: 'Get subscription details with status history' })
	@ApiResponse({ status: 200, description: 'Return list wallet transaction', type: String })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async subscriptionDetails(@GetUser() user: UsersDTO, @Param('subscriptionId') subscriptionId: string): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			const promise = await Promise.all([
				this.subscriptionService.getSubscriptionById(subscriptionId),
				this.subscriptionStatusService.getSubscriptionsStatusList(subscriptionId)
			]);

			const subscriptionData = promise[0];
			const subscriptionStatusData = promise[1];

			if (!subscriptionData) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);

			return this.utilService.successResponseData({subscription: subscriptionData, subscriptionStatus: subscriptionStatusData});
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Get('/list')
	@ApiOperation({ title: 'Get Subscription list' })
	@ApiResponse({ status: 200, description: 'Return list wallet transaction', type: String })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@ApiImplicitQuery({ name: "page", description: "page", required: false, type: Number })
	@ApiImplicitQuery({ name: "limit", description: "limit", required: false, type: Number })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async subscriptionList(@GetUser() user: UsersDTO, @Query() userQuery: UserQuery): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			if (userQuery.page == 0)
			this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
			const pagination = this.utilService.getUserPagination(userQuery);
			const subscriptionData = await this.subscriptionService.getSubscriptionsByUserId(user._id.toString(), pagination.page, pagination.limit);
			if (!subscriptionData) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);
			return this.utilService.successResponseData(subscriptionData);
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Get('/subscribed/users/list')
	@ApiOperation({ title: 'Get List of Users Opted for Subscription' })
	@ApiResponse({ status: 200, description: 'Successfully Returns List', type: String })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async subscribedUserList(@GetUser() user: UsersDTO, @Query() userQuery: UserQuery): Promise<CommonResponseModel> {
		this.utilService.validateAdminRole(user);

		const { page, limit } = this.utilService.getAdminPagination(userQuery);
		try {
			if (userQuery.page == 0)
			this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
			const [List, Total] = await this.subscriptionService.getSubscribedUserList(page, limit,);

			return this.utilService.successResponseData(List, { total: Total});
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	};

	@Get('/subscribed/user/subscription/list/:userId')
	@ApiOperation({ title: 'Get List of Subscriptions for particular user' })
	@ApiResponse({ status: 200, description: 'Successfully Returns List', type: String })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async userSubscriptionList(@GetUser() user: UsersDTO, @Param('userId') userId: string, @Query() filterQuery: UserSubscriptionFilterQuery): Promise<CommonResponseModel> {
		this.utilService.validateAdminRole(user);
		const { page, limit } = this.utilService.getAdminPagination(filterQuery);

		try {
			if (filterQuery.page == 0)
			this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
			const [List, total] = await this.subscriptionService.getUserSubscriptionsList(userId, page, limit, filterQuery.status, filterQuery.schedule);
			if (!List) this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

			return this.utilService.successResponseData(List, { total })

		} catch (error) {
			this.utilService.errorResponse(error);
		}
	}

	@Post('/add')
	@ApiOperation({ title: 'Add product to subscription' })
	@ApiResponse({ status: 200, description: 'Success message', type: ResponseSuccessMessage })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async addSubscription(@GetUser() user: UsersDTO, @Body() subscriptionData: NewSubscriptionDTO): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);

		let subProducts, unit, subscriptionTotal = 0, subScriptionAmount = 0;

		try {
			const address = await this.addressService.getAddressDetail(user._id, subscriptionData.address as string);
			if (!address) this.utilService.badRequest(ResponseMessage.ADDRESS_NOT_FOUND);

			const product = await this.productService.getProductDetail(subscriptionData.products[0].productId);
			if (!product) this.utilService.badRequest(ResponseMessage.PRODUCT_NOT_FOUND);

			const variant = product.variant.find(val => val.unit == subscriptionData.products[0]["unit"]);
			if(!variant) this.utilService.badRequest(ResponseMessage.VARIANT_NOT_FOUND);

			unit = variant['unit'];
			subScriptionAmount = variant['subScriptionAmount'];
			subscriptionTotal = Number((Number(subScriptionAmount) * Number(subscriptionData.products[0].quantity)).toFixed(2));

			subProducts = {
				productId: product._id.toString(),
				productName: product.title,
				productDescription: subscriptionData.products[0].productDescription,
				variantId: subscriptionData.products[0].variantId,
				unit: unit,
				quantity: subscriptionData.products[0].quantity,
				subscriptionTotal: subscriptionTotal,
				subScriptionAmount: subScriptionAmount,
				// eslint-disable-next-line prettier/prettier
				imageUrl: product.productImages?.length ? product.productImages[0].imageUrl : product.imageUrl,
				filePath: product.productImages?.length ? product.productImages[0].filePath : product.filePath,
				productImages: product.productImages?.length ? product.productImages : [],
				categoryId: product.categoryId ? product.categoryId.toString() : null,
				subCategoryId: product.subCategoryId ? product.subCategoryId.toString() : null,

				categoryName: product.categoryName ? product.categoryName : null,
                subCategoryName: product.subCategoryName ? product.subCategoryName : null,
				sku: product.sku ? product.sku : null

			};

			subscriptionData.products[0] = subProducts;
			subscriptionData.userId = user._id;
			subscriptionData.address = address;
			subscriptionData.status = SubscriptionStatus.ACTIVE;
			subscriptionData.grandTotal = subscriptionTotal;
			
			const subscription = await this.subscriptionService.createSubscription(subscriptionData);
			if (subscription) return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_SAVED);
			else this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Put('/:subscriptionId')
	@ApiOperation({ title: 'update subscription' })
	@ApiResponse({ status: 200, description: 'Success message', type: ResponseSuccessMessage })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async updateSubscription(@GetUser() user: UsersDTO, @Body() subscriptionData: SubscriptionUpdateDTO, @Param('subscriptionId') subscriptionId: string): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
			if (!subscription) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);

			if (subscriptionData.address) {
				const address = await this.addressService.getAddressDetail(user._id, subscriptionData.address);
				if (!address) this.utilService.badRequest(ResponseMessage.ADDRESS_NOT_FOUND);
				subscription.address = address;
			};

			if (subscriptionData.schedule) subscription.schedule = subscriptionData.schedule;
	
			if (subscriptionData.quantity) {
				subscription.products[0].quantity = subscriptionData.quantity;
				subscription.products[0].subscriptionTotal =  Number((Number(subscription.products[0].subScriptionAmount) * Number(subscriptionData.quantity)).toFixed(2))
			};
			subscription.subscriptionStartDate = subscriptionData.subscriptionStartDate;
			subscription.subscriptionEndDate = subscriptionData.subscriptionEndDate;
			await this.subscriptionService.updateSubscription(subscriptionId, subscription);

			return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_UPDATED);
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Put('/update-status-cancel/:subscriptionId')
	@ApiOperation({ title: 'Update status to cancel' })
	@ApiResponse({ status: 200, description: 'Success message', type: ResponseSuccessMessage })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async cancelSubscription(@GetUser() user: UsersDTO, @Param('subscriptionId') subscriptionId: string): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
			if (!subscription) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);
			subscription.status = SubscriptionStatus.CANCELLED;
			await this.subscriptionService.updateSubscription(subscriptionId, subscription);
			return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_CANCELLED);
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Put('/update-status-pause/:subscriptionId')
	@ApiOperation({ title: 'Update status to pause' })
	@ApiResponse({ status: 200, description: 'Success message', type: ResponseSuccessMessage })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async pauseSubscription(@GetUser() user: UsersDTO, @Body() subscriptionData: SubscriptionPauseUpdateDTO, @Param('subscriptionId') subscriptionId: string): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
			if (!subscription) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);
			subscription.pauseStartDate = subscriptionData.pauseStartDate;
			subscription.pauseEndDate = subscriptionData.pauseEndDate;
			subscription.status = SubscriptionStatus.PAUSE;

			await this.subscriptionService.updateSubscription(subscriptionId, subscription);
			return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_PAUSED);
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	@Put('/update-status-active/:subscriptionId')
	@ApiOperation({ title: 'Update status to active' })
	@ApiResponse({ status: 200, description: 'Success message', type: ResponseSuccessMessage })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	public async resumeSubscription(@GetUser() user: UsersDTO, @Param('subscriptionId') subscriptionId: string): Promise<CommonResponseModel> {
		this.utilService.validateUserRole(user);
		try {
			const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
			if (!subscription) this.utilService.badRequest(ResponseMessage.SUBSCRIPTION_NOT_FOUND);
			subscription.pauseStartDate = null;
			subscription.pauseEndDate = null;
			subscription.status = SubscriptionStatus.ACTIVE;
			await this.subscriptionService.updateSubscription(subscriptionId, subscription);
			return this.utilService.successResponseMsg(ResponseMessage.SUBSCRIPTION_RESUMED);
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}

	// Not used can remove later
	@Get('/test-api/update/sku')
	@ApiOperation({ title: 'Update data' })
	@ApiResponse({ status: 200, description: 'Export all products as xlsx file', type: String })
	@ApiResponse({ status: 400, description: 'Bad request message', type: ResponseBadRequestMessage })
	@ApiResponse({ status: 404, description: 'Unauthorized or Not found', type: ResponseErrorMessage })
	public async testUpdate(@GetUser() user: UsersDTO) {
		try {
			const promise = await  Promise.all([
				this.subscriptionService.testGet(),
				this.productService.getTestAllProd()
			])
			const subscriptions = promise[0];
			const products = promise[1];

			if(subscriptions.length){
				for(const item of subscriptions){
					for(const cart of item.products){
						const findProduct = products.find( d => d._id.toString() === cart.productId.toString())
						if(findProduct){
							cart.categoryName = findProduct.categoryName;
							cart.subCategoryName = findProduct.subCategoryName;
							cart.sku = findProduct.sku;
						}
					}
					await this.subscriptionService.testUpdate(item)
					//console.log("item:-", JSON.stringify(item))

				}
			}

			
			return this.utilService.successResponseData({message: "success"})
		} catch (e) {
			this.utilService.errorResponse(e);
		}
	}
}