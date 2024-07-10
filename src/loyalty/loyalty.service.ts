import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../users/users.service';
// import { AdminSettingService } from '../admin-setting/admin-setting.service';
import { ResponseMessage } from '../utils/app.model';
import { UtilService } from '../utils/util.service';
import { LoyaltyDTO, LoyaltyCreateDTO, LoyaltyType } from './loyalty.model';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectModel('Loyalty') private readonly loyaltyModel: Model<any>,
    private readonly utilService: UtilService,
    // private readonly adminSetting: AdminSettingService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
  public async loyaltyHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Array<LoyaltyDTO>> {
    const skip = (page - 1) * limit;
    const loyalty = await this.loyaltyModel
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    return loyalty;
  }

  public async countLoyaltyHistory(userId: string): Promise<number> {
    return await this.loyaltyModel.countDocuments({ userId: userId });
  }
  public async createLoyalty(loyaltyData: LoyaltyCreateDTO): Promise<any> {
    const loyalty = await this.loyaltyModel.create(loyaltyData);

    return loyalty;
  }
  public async newregLoyalty(bonustoregistration: LoyaltyCreateDTO) {
    const loyalty = await this.loyaltyModel.create(bonustoregistration);
    if (loyalty) {
      this.userService.updateLoyalty(loyalty.userId, loyalty.point);
    }
  }
  public async getLoyalty(userId: string): Promise<any> {
    const user = await this.loyaltyModel
      .find({ userId: userId })
      .sort({ createdAt: -1 });
    return user;
  }

  public async madeLoyaltyOrder(loyaltyData: LoyaltyDTO): Promise<LoyaltyDTO> {
    const wallet = await this.loyaltyModel.create(loyaltyData);
    return wallet;
  }
  public async createdLoyalty(loyaltyData: LoyaltyCreateDTO): Promise<any> {
    const loyalty = await this.loyaltyModel.create(loyaltyData);

    if (loyalty) {
      await this.userService.updateLoyalty(loyalty.userId, loyalty.point);
    }

    return loyalty;
  }
}
