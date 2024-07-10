import {
  Controller,
  UseGuards,
  Get,
  Query,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiImplicitQuery,
  ApiOperation,
  ApiResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { UsersDTO } from '../users/users.model';
import {
  CommonResponseModel,
  PaginationQuery,
  ResponseErrorMessage,
  ResponseMessage,
} from '../utils/app.model';
import { UtilService } from '../utils/util.service';
import { GetUser } from '../utils/jwt.strategy';
import { LoyaltyService } from './loyalty.service';
import {
  ResponseLoyaltyHistory,
  LoyaltyCreateDTO,
  LoyaltyType,
} from './loyalty.model';

@Controller('loyalty')
@ApiUseTags('loyalty')
export class LoyaltyController {
  constructor(
    private loyaltyService: LoyaltyService,
    private utilService: UtilService,
  ) {}
  @Get('/transaction')
  @ApiImplicitQuery({
    name: 'page',
    description: 'page',
    required: false,
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'limit',
    description: 'limit',
    required: false,
    type: Number,
  })
  @ApiOperation({ title: 'Get loyalty transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Return list loyalty transaction',
    type: ResponseLoyaltyHistory,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async walletHistory(
    @GetUser() user: UsersDTO,
    @Query() userQuery: PaginationQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateUserRole(user);
    try {
      if (userQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      const pagination = this.utilService.getPaginationQuery(userQuery);

      const loyalties = await Promise.all([
        this.loyaltyService.loyaltyHistory(
          user._id,
          pagination.page,
          pagination.limit,
        ),
        this.loyaltyService.countLoyaltyHistory(user._id),
      ]);
      return this.utilService.successResponseData(loyalties[0], {
        total: loyalties[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/history/:userId')
  @ApiOperation({ title: 'Get loyalty history' })
  @ApiResponse({ status: 200, description: 'Return user info', type: String })
  @ApiResponse({
    status: 400,
    description: 'Bad request message',
    type: String,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async GetLoyaltyPoint(
    @GetUser() user: UsersDTO,
    @Param('userId') userId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const loyalty = await this.loyaltyService.getLoyalty(userId);
      return this.utilService.successResponseData(loyalty);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
  @Post('/admin/add-loyalty')
  @ApiOperation({ title: 'Loyalty add by admin' })
  @ApiResponse({
    status: 200,
    description: 'Return list loyalty transaction',
    type: ResponseLoyaltyHistory,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async createLoyalty(
    @GetUser() user: UsersDTO,
    @Body() loyaltyData: LoyaltyCreateDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      loyaltyData.loyaltyType = LoyaltyType.ADMIN_EXTRA_BONUS;
      loyaltyData.isCredited = true;
      const loyalty = await this.loyaltyService.createdLoyalty(loyaltyData);

      if (!loyalty)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);

      return this.utilService.successResponseMsg(ResponseMessage.CREATED);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
}
