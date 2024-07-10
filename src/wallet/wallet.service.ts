import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentType } from '../utils/app.model';
import { UserService } from '../users/users.service';
import {
  WalletDTO,
  WalletSaveDTO,
  WalletStatus,
  WalletTransactionType,
} from './wallet.model';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel('Wallet') private readonly walletModel: Model<any>,
    private userService: UserService,
  ) {}

  public async walletHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Array<WalletDTO>> {
    const skip = (page - 1) * limit;
    return await this.walletModel
      .find({ userId: userId, walletStatus: WalletStatus.SUCCESS })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  public async countWalletHistory(userId: string): Promise<number> {
    return await this.walletModel.countDocuments({
      userId: userId,
      walletStatus: WalletStatus.SUCCESS,
    });
  }

  public async cancelOrder(walletData: WalletSaveDTO): Promise<WalletDTO> {
    walletData.isCredited = true;
    walletData.transactionType = WalletTransactionType.ORDER_CANCELLED;
    const wallet = await this.walletModel.create(walletData);
    return wallet;
  }

  public async orderModified(walletData: WalletSaveDTO): Promise<WalletDTO> {
    walletData.isCredited = true;
    walletData.transactionType = WalletTransactionType.ORDER_MODIFIED;
    const wallet = await this.walletModel.create(walletData);
    return wallet;
  }

  public async madeOrder(walletData: WalletSaveDTO): Promise<WalletDTO> {
    walletData.isCredited = false;
    walletData.transactionType = WalletTransactionType.ORDER_PAYMENT;
    const wallet = await this.walletModel.create(walletData);
    return wallet;
  }

  public async topUpWallet(walletData: WalletSaveDTO): Promise<WalletDTO> {
    if (
      walletData.paymentType &&
      walletData.paymentType !== PaymentType.RAZORPAY
    )
      walletData.isCredited = true;
    else walletData.isCredited = false;

    if (!walletData.transactionType)
      walletData.transactionType = WalletTransactionType.WALLET_TOPUP;

    return await this.walletModel.create(walletData);
  }

  public async onSuccessWalletPayment(userId: string, amount: number) {
    const wallet: WalletSaveDTO = {
      userId: userId,
      amount: amount,
      transactionType: WalletTransactionType.WALLET_TOPUP,
      paymentType: PaymentType.STRIPE,
    };

    await Promise.all([
      this.topUpWallet(wallet),
      this.userService.updateWallet(userId, amount),
    ]);
  }

  public async updateWallet(
    id: string,
    walletData: WalletSaveDTO,
  ): Promise<WalletDTO> {
    return await this.walletModel.findByIdAndUpdate(id, walletData, {
      new: true,
    });
  }

  public async getWalletData(
    userId: string,
    walletId: string,
  ): Promise<WalletDTO> {
    const filter = { transactionType: WalletTransactionType.WALLET_TOPUP };

    userId && (filter['userId'] = userId);
    walletId && (filter['_id'] = walletId);

    return await this.walletModel.findOne(filter);
  }
  public async createWallet(loyaltyWalletData: WalletSaveDTO): Promise<any> {
    return await this.walletModel.create(loyaltyWalletData);
  }
  public async walletDetails(userId: string): Promise<Array<WalletDTO>> {
    const wallets = await this.walletModel
      .find({ userId: userId })
      .sort({ createdAt: -1 });
    return wallets;
  }
}
