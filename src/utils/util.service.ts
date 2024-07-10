import {
  Injectable,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as geoLib from 'geolib';
import * as uuid from 'uuid/v1';
import {
  UserRoles,
  ResponseMessage,
  AdminQuery,
  AdminSettings,
  UserQuery,
  UserSettings,
  PaginationQuery,
} from './app.model';
import { Promise } from 'mongoose';
let language = 'en';
const languageList = [];
@Injectable()
export class UtilService {
  private TIME_ZONE = 'Asia/Kolkata';
  constructor() {
    this.setTimeZone();
  }

  private setTimeZone() {
    if (!process.env.TIME_ZONE)
      // console.log(
      //   'TIMEZONE NOT SET. SOME FEATURES MAY BREAK OR NOT WORK PROPERLY',
      // );
      this.TIME_ZONE = process.env.TIME_ZONE;
  }

  getTimeZone(): string {
    return this.TIME_ZONE;
  }

  public validateUserRole(user) {
    if (user.role !== UserRoles.USER) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }
  public validateSuperAdminRole(user) {
    if (!user.isSuperAdmin) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }
  public validateAdminRole(user) {
    if (user.role !== UserRoles.ADMIN) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }

  public validateDeliveryBoyRole(user) {
    if (user.role !== UserRoles.DELIVERY_BOY) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }

  public validateAllRole(user) {
    if (
      !(
        user.role === UserRoles.USER ||
        user.role === UserRoles.DELIVERY_BOY ||
        user.role === UserRoles.ADMIN
      )
    ) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }
  public validateDeliveryUserRole(user) {
    if (
      !(user.role === UserRoles.USER || user.role === UserRoles.DELIVERY_BOY)
    ) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }

  public validateAdminAndUserAllRole(user) {
    if (!(user.role === UserRoles.USER || user.role === UserRoles.ADMIN)) {
      const msg = this.getTranslatedMessage('NOT_FOUND');
      throw new NotFoundException(msg);
    }
  }

  public async successResponseData(responseData, extra?) {
    if (!extra) return await this.res(HttpStatus.OK, responseData);
    const res = await this.res(HttpStatus.OK, responseData);
    for (const key in extra) res[key] = extra[key];
    return res;
  }

  public async successResponseMsg(key) {
    return await this.res(HttpStatus.OK, '', key);
  }

  public async badRequestResponseData(responseData?, extra?) {
    if (!extra) return await this.res(HttpStatus.BAD_REQUEST, responseData);
    const res = await this.res(HttpStatus.BAD_REQUEST, responseData);
    for (const key in extra) res[key] = extra[key];
    return res;
  }

  public async resetContentResponseMsg(key?) {
    return await this.res(HttpStatus.RESET_CONTENT, '', key);
  }

  public async processingResponseMsg(key?) {
    key = key || 'PAYMENT_PROCESSING';
    return await this.res(HttpStatus.PROCESSING, '', key);
  }
  public async paymentRequiredResponseMsg(key?) {
    key = key || 'PAYMENT_REQUIRED';
    return await this.res(HttpStatus.PAYMENT_REQUIRED, '', key);
  }

  public errorResponse(e) {
    // console.log(e);
    if (e.kind === 'ObjectId' && e.path === '_id') {
      throw new NotFoundException('NOT_FOUND');
    }
    if (e.message && e.message.statusCode == HttpStatus.BAD_REQUEST) {
      throw new BadRequestException(e.message);
    }
    if (e.message && e.message.statusCode == HttpStatus.NOT_FOUND) {
      throw new NotFoundException(e.message.message);
    }
    throw new InternalServerErrorException(e.message);
  }

  public unauthorized() {
    const msg = this.getTranslatedMessage('UNAUTHORIZED');
    throw new UnauthorizedException(msg);
  }

  public badRequest(key?) {
    const msg = this.getTranslatedMessage(key);
    throw new BadRequestException(msg);
  }

  public pageNotFound() {
    const msg = this.getTranslatedMessage('NOT_FOUND');
    throw new NotFoundException(msg);
  }

  public async notFoundResponseMsg(key?) {
    key = key || 'NOT_FOUND';
    return await this.res(HttpStatus.NOT_FOUND, '', key);
  }

  public async notFoundResponse(responseData, key?) {
    return await this.res(HttpStatus.NOT_FOUND, responseData);
  }

  public async internalErrorResponseKey(key?) {
    key = key || 'INTERNAL_SERVER_ERR';
    return await this.res(HttpStatus.INTERNAL_SERVER_ERROR, '', key);
  }

  public async resetContentResponseKey(key) {
    return await this.res(HttpStatus.RESET_CONTENT, '', key);
  }

  public async resetContentResponseData(responseData) {
    return await this.res(HttpStatus.RESET_CONTENT, responseData);
  }

  public getTranslatedMessage(key) {
    let message = '';
    if (languageList && languageList[language] && languageList[language][key]) {
      message = languageList[language][key];
    } else {
      message = languageList['en'][key];
    }
    return message ? message : key;
  }
  public async getTranslatedMessageByKey(key) {
    let message = '';
    if (languageList && languageList[language] && languageList[language][key]) {
      message = languageList[language][key];
    } else {
      message = languageList['en'][key];
    }
    message = message || key;
    return message;
  }

  private async res(responseCode, responseData?, key?) {
    let message = '';
    if (responseData) {
      message = responseData;
    } else {
      if (
        languageList &&
        languageList[language] &&
        languageList[language][key]
      ) {
        message = languageList[language][key];
      } else {
        message = languageList['en'][key];
      }
    }

    message = message || key;
    return {
      response_code: responseCode,
      response_data: message,
    };
  }

  public async response(responseCode, responseData) {
    return {
      response_code: responseCode,
      response_data: responseData,
    };
  }

  public setLanguage(lang: string) {
    language = lang;
  }

  public getLanguage() {
    return language;
  }

  public setLanguageList(list) {
    list.forEach(l => {
      languageList[l.languageCode] = l.backendJson;
    });
  }

  public getLanguageData(code) {
    return languageList[code];
  }

  public async getUUID() {
    return uuid();
  }

  public async getArrayOfWeekdays() {
    return Promise.all([
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_SUNDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_MONDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_TUESDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_WEDNESDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_THURSDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_FRIDAY),
      this.getTranslatedMessageByKey(ResponseMessage.DAYS_SATURDAY),
    ]);
  }

  public async getXminutesAheadTime(minutes: number) {
    const d1 = new Date();
    const d2 = new Date(d1);
    d2.setMinutes(d1.getMinutes() + minutes);
    return d2.getTime();
  }

  public convertToDecimal(value) {
    return Number(value).toFixed(2);
  }

  public convertToNumber(input: string): number {
    const number = Number(input);
    if (!isNaN(number)) {
      return number;
    } else return 0;
  }

  // Calculates the Distance Between two Co-ordinates
  public calculateDistance(userLocation, storeLocation): number {
    const preciseDistance = geoLib.getPreciseDistance(
      storeLocation,
      userLocation,
    );
    return preciseDistance / 1000;
  }

  // Return List of Time Interval of Half an Hour
  public async timeSlotsDropdown() {
    const timeInterval = 30;
    const timeSlots = [];
    let startTime = 0;
    const maxTime = 24 * 60;

    for (let i = 0; startTime < maxTime; i++) {
      timeSlots[i] = {
        time: this.minutesConversion(startTime),
        minutes: startTime,
      };
      startTime += timeInterval;
    }
    return timeSlots;
  }

  public statusMessage(status, message) {
    return {
      status: status,
      data: message,
    };
  }

  public minutesConversion(m: number): string {
    if (process.env.TIME_SLOT_FORMAT_24HR === 'false') {
      let a = 'AM';
      let h = (m / 60) ^ 0;
      if (h >= 12) a = 'PM';
      if (h > 12) h = h - 12;
      return `0${h}`.slice(-2) + ':' + ('0' + (m % 60)).slice(-2) + ' ' + a;
    } else {
      let h = (m / 60) ^ 0;
      if (h > 24) h = h - 24;
      return `0${h}`.slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
    }
  }

  public deliveryTimeSlotsValidation(deliveryTimeSlots) {
    for (let i = 0; i < 7; i++) {
      deliveryTimeSlots[i].timings.sort((a, b) => a.openTime > b.openTime);
      const selectedDate = deliveryTimeSlots[i].date;
      const timings = deliveryTimeSlots[i].timings;
      for (let j = 0; j < timings.length; j++) {
        if (timings[j].openTime < 0 || timings[j].openTime > 1410)
          return this.statusMessage(
            false,
            'Open time should be in range of 0 - 1410 for ' + selectedDate,
          );

        if (timings[j].closeTime < 0 || timings[j].closeTime > 1410)
          return this.statusMessage(
            false,
            'Close time should be in range of 0 - 1410 for ' + selectedDate,
          );

        if (timings[j].openTime === timings[j].closeTime)
          return this.statusMessage(
            false,
            'Open and close time must not be same ' +
              this.minutesConversion(timings[j].openTime) +
              ' for ' +
              selectedDate,
          );

        if (timings[j].openTime % 30 !== 0)
          return this.statusMessage(
            false,
            'Invalid time ' +
              this.minutesConversion(timings[j].openTime) +
              ', must be in 30 minutes format' +
              ' for ' +
              selectedDate,
          );
        if (timings[j].closeTime % 30 !== 0)
          return this.statusMessage(
            false,
            'Invalid time ' +
              this.minutesConversion(timings[j].closeTime) +
              ', must be in 30 minutes format' +
              ' for ' +
              selectedDate,
          );

        if (timings[j].openTime > timings[j].closeTime)
          return this.statusMessage(
            false,
            this.minutesConversion(timings[j].closeTime) +
              ' must be greater than ' +
              this.minutesConversion(timings[j].openTime) +
              ' for ' +
              selectedDate,
          );

        if (j !== 0 && timings[j - 1].closeTime > timings[j].openTime)
          return this.statusMessage(
            false,
            this.minutesConversion(timings[j - 1].closeTime) +
              ' is overlapping with slot ' +
              this.minutesConversion(timings[j].openTime) +
              ' for ' +
              selectedDate +
              ', please add non overlapping time slots.',
          );

        timings[j].slot =
          this.minutesConversion(timings[j].openTime) +
          ' - ' +
          this.minutesConversion(timings[j].closeTime);
      }
    }
    return { status: true, data: deliveryTimeSlots };
  }

  public getAdminPagination(query: AdminQuery) {
    return {
      page: Number(query.page) || AdminSettings.DEFAULT_PAGE_NUMBER,
      limit: Number(query.limit) || AdminSettings.DEFAULT_PAGE_LIMIT,
      q: query.q,
    };
  }

  public getUserPagination(query: UserQuery) {
    return {
      page: Number(query.page) || UserSettings.DEFAULT_PAGE_NUMBER,
      limit: Number(query.limit) || UserSettings.DEFAULT_PAGE_LIMIT,
    };
  }

  public categoryModeGraph = async (data, category) => {
    for (const item of data) {
      const findCategoryTitle = await category.find(
        data => data._id == item._id.category,
      );
      if (findCategoryTitle) {
        item._id = findCategoryTitle.title;
      }
    }
    return data;
  };
  public salesGraph = (data, type) => {
    const labelArray = [];
    const dataArray = [];
    if (type === 'DAILY') {
      data.sort((a, b) => (a._id.date > b._id.date ? 1 : -1));
      for (let i = 0; i < data.length; i++) {
        const label =
          data[i]._id.date + '/' + data[i]._id.month + '/' + data[i]._id.year;
        const totalDepoits = data[i].data;
        labelArray.push(label);
        dataArray.push(totalDepoits);
        if (data.length == labelArray.length) {
          const dailyGraph = {
            label: labelArray,
            total: dataArray,
          };
          return dailyGraph;
        }
      }
    } else {
      data.sort((a, b) => (a._id.month > b._id.month ? 1 : -1));
      let month;
      for (let i = 0; i < data.length; i++) {
        const month1 = data[i]._id.month;
        const totalDepoits = data[i].data;
        switch (month1) {
          case 1:
            month = 'January';
            break;
          case 2:
            month = 'February';
            break;
          case 3:
            month = 'March';
            break;
          case 4:
            month = 'April';
            break;
          case 5:
            month = 'May';
            break;
          case 6:
            month = 'June';
            break;
          case 7:
            month = 'July';
            break;
          case 8:
            month = 'August';
            break;
          case 9:
            month = 'September';
            break;
          case 10:
            month = 'October';
            break;
          case 11:
            month = 'November';
            break;
          case 12:
            month = 'December';
        }
        labelArray.push(month);
        dataArray.push(totalDepoits);
        if (data.length == labelArray.length) {
          const graph = {
            label: labelArray,
            total: dataArray,
          };
          return graph;
        }
      }
    }
  };
  public userGraph = (data, type) => {
    const labelArray = [];
    const dataArray = [];
    if (type === 'DAILY') {
      data.sort((a, b) => (a._id.date > b._id.date ? 1 : -1));
      for (let i = 0; i < data.length; i++) {
        const label =
          data[i]._id.date + '/' + data[i]._id.month + '/' + data[i]._id.year;
        const totalCount = data[i].count;
        labelArray.push(label);
        dataArray.push(totalCount);
        if (data.length == labelArray.length) {
          const dailyGraph = {
            label: labelArray,
            total: dataArray,
          };
          return dailyGraph;
        }
      }
    } else {
      data.sort((a, b) => (a._id.month > b._id.month ? 1 : -1));
      let month;
      for (let i = 0; i < data.length; i++) {
        const month1 = data[i]._id.month;
        const totalCount = data[i].count;
        switch (month1) {
          case 1:
            month = 'January';
            break;
          case 2:
            month = 'February';
            break;
          case 3:
            month = 'March';
            break;
          case 4:
            month = 'April';
            break;
          case 5:
            month = 'May';
            break;
          case 6:
            month = 'June';
            break;
          case 7:
            month = 'July';
            break;
          case 8:
            month = 'August';
            break;
          case 9:
            month = 'September';
            break;
          case 10:
            month = 'October';
            break;
          case 11:
            month = 'November';
            break;
          case 12:
            month = 'December';
        }
        labelArray.push(month);
        dataArray.push(totalCount);
        if (data.length == labelArray.length) {
          const graph = {
            label: labelArray,
            total: dataArray,
          };
          return graph;
        }
      }
    }
  };

  public getTimeByTimeZone = function(
    newDate: string | number | Date = new Date(),
  ) {
    const DateString = new Date(newDate).toLocaleString('en-US', {
      timeZone: this.TIME_ZONE,
    });
    const $Date = new Date(DateString);

    return {
      fullDate: $Date,
      dayCode: $Date.getDay(),
      hrs: $Date.getHours(),
      minutes: $Date.getMinutes(),
      timestamp: $Date.getTime(),
      date: $Date.getDate(),
      month: $Date.getMonth() + 1,
      year: $Date.getFullYear(),
    };
  };
  public getUserQuery(query: UserQuery) {
    return {
      page: Number(query.page) || UserSettings.DEFAULT_PAGE_NUMBER,
      limit: Number(query.limit) || UserSettings.DEFAULT_PAGE_LIMIT,
    };
  }
  public getPaginationQuery(query: PaginationQuery) {
    return {
      page: Number(query.page) || UserSettings.DEFAULT_PAGE_NUMBER,
      limit: Number(query.limit) || UserSettings.DEFAULT_PAGE_LIMIT,
    };
  }

  public generateUniqueCode() {
    let text = '';
    const possible =
      'A1B2C3D4E5F1G4HIJ6KL7MNOPQ4RST4UV8WXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 8; i++)
      text += possible.charAt(Math.floor(Math.random() * 8));
    return text;
  }
}
