import {
  Controller,
  Get,
  UseGuards,
  Query,
  Post,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiUseTags,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersDTO } from '../users/users.model';
import { NotificationService } from './notifications.service';
import { UtilService } from '../utils/util.service';
import {
  CommonResponseModel,
  ResponseErrorMessage,
  ResponseSuccessMessage,
  ResponseBadRequestMessage,
  ResponseMessage,
  AdminQuery,
} from '../utils/app.model';
import { GetUser } from '../utils/jwt.strategy';
import {
  ResponseNotificationListDTO,
  readNotificationDTO,
  AdminNotificationDTO,
} from './notifications.model';

import { notificationEvents } from '../utils/event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('notifications')
@ApiUseTags('Notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private utilService: UtilService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('/admin/list')
  @ApiOperation({ title: 'Get all notification' })
  @ApiResponse({
    status: 200,
    description: 'Return list of notification',
    type: ResponseNotificationListDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getAllNotification(
    @GetUser() user: UsersDTO,
    @Query() adminQuery: AdminQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      if (adminQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getAdminPagination(adminQuery);
      const notifications = await Promise.all([
        this.notificationService.getAllNotification(
          pagination.page - 1,
          pagination.limit,
        ),
        this.notificationService.countAllnotification(),
      ]);
      return this.utilService.successResponseData(notifications[0], {
        total: notifications[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/admin/latest')
  @ApiOperation({ title: 'Get last 5 notifications' })
  @ApiResponse({
    status: 200,
    description: 'Return list of unread notification',
    type: ResponseNotificationListDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getLastNotifications(
    @GetUser() user: UsersDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const notifications = await Promise.all([
        this.notificationService.getAllNotification(0, 5),
        this.notificationService.countUnread(),
      ]);
      return this.utilService.successResponseData(notifications[0], {
        unread: notifications[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  //
  @Post('/admin/send')
  @ApiOperation({ title: 'Send notification to all users' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request message',
    type: ResponseBadRequestMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async sendNotificationToAllUsers(
    @GetUser() user: UsersDTO,
    @Body() notificationData: AdminNotificationDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      await this.eventEmitter.emitAsync(
        notificationEvents.SEND_NOTIFICATION_TO_ALL_USERS,
        notificationData,
      );
      return this.utilService.successResponseMsg(
        ResponseMessage.PUSH_NOTIFICATION_SENT,
      );
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Post('/admin/read')
  @ApiOperation({ title: 'Read notification' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request message',
    type: ResponseBadRequestMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async readNotification(
    @GetUser() user: UsersDTO,
    @Body() notificationData: readNotificationDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateAdminRole(user);
    try {
      const response = await this.notificationService.readNotification(
        notificationData.notificationId,
      );
      if (response)
        return this.utilService.successResponseData({ status: true });
      else this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  @Get('/user/list')
  @ApiOperation({ title: 'Get all notifications' })
  @ApiResponse({
    status: 200,
    description: 'Return list of all notification',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getallNotifications(
    @GetUser() user: UsersDTO,
    @Query() adminQuery: AdminQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryUserRole(user);
    try {
      if (adminQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getUserPagination(adminQuery);
      const allnotifications = await Promise.all([
        this.notificationService.getNotification(
          user._id,
          user.role,
          pagination.page - 1,
          pagination.limit,
        ),
        this.notificationService.totalcountByUserId(user._id, user.role),
      ]);
      return this.utilService.successResponseData(allnotifications[0], {
        total: allnotifications[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
  // read individual notification

  @Get('user/read/:notificationId')
  @ApiOperation({ title: 'Get read individual notification' })
  @ApiResponse({
    status: 200,
    description: 'Return list of read individual notification',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getIndividivalUnreadNotifications(
    @GetUser() user: UsersDTO,
    @Param('notificationId') notificationId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryUserRole(user);
    try {
      const readnotifications = await Promise.all([
        this.notificationService.readIndividualUnReadNotification(
          notificationId,
          user._id,
          user.role,
        ),
      ]);
      return this.utilService.successResponseData(readnotifications[0]);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
  // number of unread notifications count

  @Get('/user/list/count')
  @ApiOperation({ title: 'Get unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Return list of unread notification',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async getUnreadNotificationsCount(
    @GetUser() user: UsersDTO,
    @Query() adminQuery: AdminQuery,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryUserRole(user);
    try {
      if (adminQuery.page == 0)
        this.utilService.badRequest(ResponseMessage.SOMETHING_WENT_WRONG);
      const pagination = this.utilService.getUserPagination(adminQuery);
      const unreadnotifications = await Promise.all([
        this.notificationService.getAllUnreadNotification(
          user._id,
          user.role,
          pagination.page,
          pagination.limit,
        ),
        this.notificationService.countUnreadByUserId(user._id, user.role),
      ]);
      return this.utilService.successResponseData({
        totalunreadnotification: unreadnotifications[1],
      });
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // Delete notifications

  @Delete('/user/delete/:notificationId')
  @ApiOperation({ title: 'delete notifications' })
  @ApiResponse({
    status: 200,
    description: 'Return list of deleted notification',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async deleteNotification(
    @GetUser() user: UsersDTO,
    @Param('notificationId') notificationId: string,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryUserRole(user);
    try {
      await Promise.all([
        this.notificationService.deleteNotification(notificationId),
      ]);
      const msg = await this.utilService.getTranslatedMessage(
        ResponseMessage.NOTIFICATION_DELETED_SUCCESSFULLY,
      );
      return this.utilService.successResponseMsg(msg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }

  // Delet All Notifications

  @Delete('/user/delete-all')
  @ApiOperation({ title: 'delete  all notifications' })
  @ApiResponse({
    status: 200,
    description: 'Return list of deleted notification',
    type: ResponseSuccessMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Unauthorized or Not found',
    type: ResponseErrorMessage,
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  public async deleteAllNotification(
    @GetUser() user: UsersDTO,
  ): Promise<CommonResponseModel> {
    this.utilService.validateDeliveryUserRole(user);
    try {
      await Promise.all([
        this.notificationService.deleteAllNotification(user._id, user.role),
      ]);
      const msg = await this.utilService.getTranslatedMessage(
        ResponseMessage.NOTIFICATIONS_DELETED_SUCCESSFULLY,
      );
      return this.utilService.successResponseMsg(msg);
    } catch (e) {
      this.utilService.errorResponse(e);
    }
  }
}
