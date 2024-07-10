import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserCreateDTO,
  UsersDTO,
  UsersUpdateDTO,
  UserStatusDTO,
  AdminUserDTO,
  AdminDTO,
  AdminDeliveryDTO,
  ExportedFileDTO,
  referredUsersResponseDTO,
  UserCreateMobileDTO,
} from './users.model';
import { ResponseMessage, UserRoles, UserSearchType } from '../utils/app.model';
import { AuthService } from '../utils/auth.service';
import { UtilService } from '../utils/util.service';
import { LoyaltyType } from '../loyalty/loyalty.model';
import { SettingService } from '../settings/settings.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OrderStatusType } from '../order/order.model';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('Order') private readonly orderModel: Model<any>,

    private authService: AuthService,
    private utilService: UtilService,
    private loyaltyService: LoyaltyService,
    private settingService: SettingService,
  ) {}

  public async createUser(userData: AdminDeliveryDTO): Promise<UsersDTO> {
    if (userData.email) userData.email = userData.email.toLowerCase();
    const { salt, hashedPassword } = await this.authService.hashPassword(
      userData.password,
    );
    userData.salt = salt;
    userData.password = hashedPassword;

    userData.emailVerificationId = await this.utilService.getUUID();
    userData.emailVerificationExpiry = await this.utilService.getXminutesAheadTime(
      120,
    );

    const user = await this.userModel.create(userData);
    return user;
  }

  public async createdUser(userData: UserCreateMobileDTO): Promise<UsersDTO> {
    if (userData.email) userData.email = userData.email.toLowerCase();
    const { salt, hashedPassword } = await this.authService.hashPassword(
      userData.password,
    );

    userData.salt = salt;
    userData.password = hashedPassword;
    userData.referralCode = await this.utilService.generateUniqueCode();
    userData.emailVerificationId = await this.utilService.getUUID();
    userData.emailVerificationExpiry = await this.utilService.getXminutesAheadTime(
      120,
    );

    const user = await this.userModel.create(userData);
    return user;
  }

  public async updateuser(userData: AdminDeliveryDTO): Promise<UsersDTO> {
    if (userData.email) userData.email = userData.email.toLowerCase();
    const { salt, hashedPassword } = await this.authService.hashPassword(
      userData.password,
    );
    userData.salt = salt;
    userData.password = hashedPassword;
    userData.emailVerificationId = await this.utilService.getUUID();
    userData.emailVerificationExpiry = await this.utilService.getXminutesAheadTime(
      120,
    );

    const user = await this.userModel.findOneAndUpdate(
      { mobileNumber: userData.mobileNumber },
      userData,
    );

    return user;
  }

  public async regenerateVerificationCode(userId: string): Promise<UsersDTO> {
    const emailVerificationId = await this.utilService.getUUID();
    const emailVerificationExpiry = await this.utilService.getXminutesAheadTime(
      120,
    );

    const user = await this.userModel.findOneAndUpdate(
      { _id: userId },
      {
        emailVerificationId: emailVerificationId,
        emailVerificationExpiry: emailVerificationExpiry,
      },
      { new: true },
    );
    return user;
  }

  public async getUserByEmail(email: string): Promise<UsersDTO> {
    const user = await this.userModel.findOne({ email: email });
    return user;
  }

  public async updatePlayerId(
    userId: string,
    playerId: string,
  ): Promise<UsersDTO> {
    const user = await this.userModel.updateOne(
      { _id: userId },
      { playerId: playerId },
    );
    return user;
  }

  public async getUserInfo(userId: string): Promise<UsersDTO> {
    const user = await this.userModel.findById(
      userId,
      'firstName lastName email referralCode totalLoyaltyPoints imageUrl imageId filePath mobileNumber countryCode countryName language walletAmount orderDelivered',
    );

    return user;
  }

  public async getExportedFileInfo(userId: string): Promise<ExportedFileDTO> {
    const user = await this.userModel.findById(userId, 'productExportedFile');
    return user;
  }

  public async updateMyInfo(
    userId: string,
    userData: UsersUpdateDTO,
  ): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(userId, userData);
    return user;
  }

  public async updateOTP(userId: string, otp: number): Promise<UsersDTO> {
    const otpVerificationExpiry = await this.utilService.getXminutesAheadTime(
      10,
    );
    const user = await this.userModel.findByIdAndUpdate(userId, {
      otp: otp,
      otpVerificationExpiry: otpVerificationExpiry,
    });
    return user;
  }

  public async setOTPVerification(
    userId: string,
    otpVerificationId: string,
  ): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(userId, {
      otpVerificationId: otpVerificationId,
    });
    return user;
  }

  public async getAllUser(
    page: number,
    limit: number,
    search?: string,
  ): Promise<Array<AdminUserDTO>> {
    const skip = (page - 1) * limit;
    let filter = { role: UserRoles.USER };
    if (search) filter = await this.updateUserSearchQuery(search, filter);

    return (await this.userModel
      .find(
        filter,
        'firstName lastName email mobileNumber orderPurchased walletAmount totalLoyaltyPoints countryCode countryName emailVerified language status createdAt',
      )
      .limit(limit)
      .skip(skip)
      .lean()) as any;
  }

  public async countAllUser(search?: string): Promise<number> {
    let filter = { role: UserRoles.USER };
    if (search) filter = await this.updateUserSearchQuery(search, filter);

    return await this.userModel.countDocuments(filter);
  }

  public async getUserById(userId: string): Promise<UsersDTO> {
    const user = await this.userModel.findById(userId);
    return user;
  }
  public async getReferralCodeById(userId: string): Promise<any> {
    const user = await this.userModel.findOne({ _id: userId }, 'referralCode');

    return user;
  }

  public async getReferredUsers(
    referralCode: string,
  ): Promise<Array<referredUsersResponseDTO>> {
    const referredUsers = await this.userModel.find(
      { referredBy: referralCode },
      '_id firstName lastName mobileNumber createdAt',
    );
    return referredUsers;
  }

  public async updateUserStatus(
    userId: string,
    userStatusData: UserStatusDTO,
  ): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      userStatusData,
      { new: true },
    );
    return user;
  }

  public async updatePassword(
    userId: string,
    salt: string,
    password: string,
  ): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(userId, {
      salt: salt,
      password: password,
    });
    return user;
  }

  public async setEmailVerified(userId: string): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(userId, {
      emailVerified: true,
    });
    return user;
  }

  public async setMobileVerified(mobileNumber: string): Promise<UsersDTO> {
    const user = await this.userModel.findOneAndUpdate(
      { mobileNumber: mobileNumber },
      { mobileNumberVerified: true },
    );
    return user;
  }

  public async setMobileOTP(
    mobileNumber: string,
    otp: string,
    newMobileNumber?: string,
  ): Promise<UsersDTO> {
    const updateData = { otp: otp };
    if (newMobileNumber) updateData['newMobileNumber'] = newMobileNumber;
    const user = await this.userModel.findOneAndUpdate(
      { mobileNumber: mobileNumber },
      updateData,
    );
    return user;
  }

  public async updateMobileNumber(userId: string, mobileNumber): Promise<any> {
    const user = await this.userModel.findByIdAndUpdate(userId, {
      mobileNumber: mobileNumber,
    });
    return user;
  }
  public async findUserByEmailOrMobile(
    email: string,
    mobileNumber: string,
  ): Promise<UsersDTO> {
    if (email) email = email.toLowerCase();
    const user = await this.userModel.findOne({
      $or: [{ email: email }, { mobileNumber: mobileNumber }],
    });
    return user;
  }

  public async findUserByMobile(mobileNumber: string): Promise<UsersDTO> {
    return await this.userModel.findOne({ mobileNumber: mobileNumber });
  }

  public async getAllDeliveryBoy(
    page: number,
    limit: number,
    search: string,
  ): Promise<Array<AdminUserDTO>> {
    const skip = page * limit;
    let filter = { role: UserRoles.DELIVERY_BOY };
    if (search) filter = await this.updateUserSearchQuery(search, filter);

    return await this.userModel
      .find(
        filter,
        'firstName lastName email mobileNumber countryCode countryName emailVerified language status orderDelivered createdAt',
      )
      .limit(limit)
      .skip(skip);
  }

  public async countAllDeliveryBoy(search: string): Promise<number> {
    let filter = { role: UserRoles.DELIVERY_BOY };

    if (search) filter = await this.updateUserSearchQuery(search, filter);

    return this.userModel.countDocuments(filter);
  }

  public async updateMyLanguage(
    userId: string,
    language: string,
  ): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { language: language },
      { new: true },
    );
    return user;
  }

  public async updateWallet(
    userId: string,
    walletAmount: number,
  ): Promise<UsersDTO> {
    const user = await this.userModel.updateOne(
      { _id: userId },
      { $inc: { walletAmount: walletAmount } },
    );
    return user;
  }

  public async increaseOrderDelivered(userId: string): Promise<any> {
    return await this.userModel.updateOne(
      { _id: userId },
      { $inc: { orderDelivered: 1 } },
    );
  }

  public async increaseOrderPurchased(userId: string): Promise<any> {
    return await this.userModel.updateOne(
      { _id: userId },
      { $inc: { orderPurchased: 1 } },
    );
  }

  public async descreaseOrderPurchased(userId: string): Promise<any> {
    return await this.userModel.updateOne(
      { _id: userId },
      { $inc: { orderPurchased: -1 } },
    );
  }

  public async countUserByFilter(startDate, endDate): Promise<number> {
    startDate = startDate.setHours(0, 0, 0, 0);
    // console.log('startDate', startDate);
    const filter = {
      role: UserRoles.USER,
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    return await this.userModel.countDocuments(filter);
  }

  public async userGraph(startDate, endDate, type): Promise<any> {
    const query = {
      createdAt: { $gt: new Date(startDate), $lt: new Date(endDate) },
    };
    // console.log('user Mode Graph query', query);
    let result;
    if (type === 'DAILY') {
      result = await this.userModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              date: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]);
    } else {
      result = await this.userModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]);
    }

    return result;
  }

  public async deleteUserById(userId: string): Promise<UsersDTO> {
    const user = await this.userModel.findByIdAndRemove(userId);
    return user;
  }

  public async getAllAdmin(
    page: number,
    limit: number,
    search: string,
  ): Promise<Array<AdminUserDTO>> {
    const skip = page * limit;
    const filter = { role: UserRoles.ADMIN, isSuperAdmin: false };
    if (search) filter['firstName'] = { $regex: search, $options: 'i' };
    const users = (await this.userModel
      .find(
        filter,
        'firstName lastName email mobileNumber emailVerified language status isSuperAdmin',
      )
      .limit(limit)
      .skip(skip)
      .lean()) as any;
    return users;
  }

  public async countAllAdmin(search: string): Promise<number> {
    const filter = { role: UserRoles.ADMIN, isSuperAdmin: false };
    if (search) filter['firstName'] = { $regex: search, $options: 'i' };
    const count = await this.userModel.countDocuments(filter);
    return count;
  }

  public async populateUser(list: Array<any>): Promise<any> {
    return await this.userModel.populate(list, {
      path: 'user',
      select: { _id: 1, firstName: 1, lastName: 1 },
    });
  }

  public async getUserWalletAmount(userId: string): Promise<UsersDTO> {
    return await this.userModel.findById(userId, 'walletAmount');
  }

  public async getUserSearchQueryType(queryString: string): Promise<string> {
    if (queryString.includes('@')) return UserSearchType.EMAIL;
    else if (!isNaN(Number(queryString))) return UserSearchType.NUMBER;
    else return UserSearchType.STRING;
  }

  public async updateUserSearchQuery(queryString: string, filter: any) {
    const searchType = await this.getUserSearchQueryType(queryString);

    switch (searchType) {
      case UserSearchType.EMAIL:
        filter['email'] = { $regex: queryString, $options: 'i' };
        break;
      case UserSearchType.NUMBER:
        filter['mobileNumber'] = { $regex: queryString, $options: 'i' };
        break;
      case UserSearchType.STRING:
        filter['$or'] = [
          { firstName: { $regex: queryString, $options: 'i' } },
          { lastName: { $regex: queryString, $options: 'i' } },
        ];
        break;
      default:
        break;
    }
    return filter;
  }
  async getDeliveryBoy(query: any): Promise<UsersDTO> {
    const filter = { ...query, role: UserRoles.DELIVERY_BOY };
    const user = await this.userModel.findOne(filter);
    return user;
  }
  async getAllUsersForNotification(): Promise<UsersDTO[]> {
    const filter = { role: UserRoles.USER, playerId: { $ne: null } };
    const users = await this.userModel.find(filter, '_id playerId');
    return users;
  }
  public async removeUserById(userId: string): Promise<UsersDTO> {
    return await this.userModel.updateOne(
      { _id: userId },
      { $set: { isDeleted: true } },
    );
  }
  public async updateLoyalty(
    userId: string,
    LoyalityData: number,
  ): Promise<any> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { totalLoyaltyPoints: LoyalityData } },

      { new: true },
    );

    return user;
  }
  public async getLoyalty(userId: string): Promise<any> {
    const user = await this.userModel.findOne(
      { _id: userId },
      'totalLoyaltyPoints',
    );

    return user;
  }

  public async getreferralCode(userId: string): Promise<any> {
    const user = await this.userModel.findOne({ _id: userId }, 'referralCode');
    return user;
  }
  public async getreferralCodeDetail(referralCode: string): Promise<any> {
    const user = await this.userModel.find(
      { referredBy: referralCode },
      'firstName lastName mobileNumber createdAt',
    );
    return user;
  }
  public async getUserByReferralCode(referralCode) {
    const user = await this.userModel.findOne({ referralCode: referralCode });
    return user;
  }
  async addLoyalityByReferral(user: any) {
    const [referredUser, setting] = await Promise.all([
      this.getUserByReferralCode(user.referredBy),
      this.settingService.getLoyaltySetting(),
    ]);
    if (user.isNewUser) {
      const bonusToUser = {
        userId: user._id,
        isCredited: true,
        point: setting.bonusToReferralAccount,
        description: 'New signup bonus',
        loyaltyType: LoyaltyType.NEW_REGISTRATION_BONUS,
      };
      const bonusToReferredUser = {
        userId: referredUser._id,
        isCredited: true,
        point: setting.bonusToReferralByAccount,
        description: 'New referral bonus',
        loyaltyType: LoyaltyType.NEW_REFERRAL_BONUS,
      };

      const bonustoregistration = {
        userId: user._id,
        isCredited: true,
        point: setting.loyaltyPointOnNewRegistration,
        description: 'New registration  bonus',
        loyaltyType: LoyaltyType.NEW_REGISTRATION_BONUS_POINT,
      };

      await Promise.all([
        this.loyaltyService.createLoyalty(bonusToUser),
        this.loyaltyService.newregLoyalty(bonustoregistration),
        this.updateLoyalty(bonusToUser.userId, bonusToUser.point),
        this.loyaltyService.createLoyalty(bonusToReferredUser),
        this.updateLoyalty(
          bonusToReferredUser.userId,
          bonusToReferredUser.point,
        ),
        this.userModel.updateOne(
          { _id: user._id },
          { isNewUser: false, walletAmount: 0 },
        ),
      ]);
      return bonusToUser.point;
    }
  }
  public async updateOrderDelivered(userId: string): Promise<UsersDTO> {
    const orderFilter = {
      assignedToId: userId,
      orderStatus: OrderStatusType.DELIVERED,
      isOrderAssigned: true,
      isAcceptedByDeliveryBoy: true,
    };

    const total = await this.orderModel.countDocuments(orderFilter);

    return await this.userModel.findByIdAndUpdate(
      { _id: userId },
      { orderDelivered: total },
    );
  }
}
