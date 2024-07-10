import { Injectable } from '@nestjs/common';
const Excel = require('exceljs');
const appRoot = require('app-root-path');
const fs = require('fs');
import { UploadService } from './upload.service';
import { UserService } from '../users/users.service';
import { ImportProductDTO } from '../products/products.model';
import { UtilService } from './util.service';
import { ResponseMessage } from './app.model';

@Injectable()
export class ExcelService {
	constructor(
		private uploadService: UploadService,
		private utilService: UtilService
	) {

	}

	public async getHeaders() {
		let columns = [
			{ header: 'Product Id', key: '_id', width: 32 },
			{ header: 'Product Name', key: 'title', width: 32 },
			{ header: 'Product Description', key: 'description', width: 48 },
			{ header: 'Search Keywords', key: 'keyWords', width: 48 },
			{ header: 'Category Id', key: 'categoryId', width: 32 },
			{ header: 'Sub-category Id', key: 'subCategoryId', width: 32 },
			{ header: 'Image Url-1', key: 'imageUrl1', width: 48 },
			{ header: 'Image Url-2', key: 'imageUrl2', width: 48 },
			{ header: 'Image Url-3', key: 'imageUrl3', width: 48 },
			{ header: 'Image Url-4', key: 'imageUrl4', width: 48 },
			{ header: 'Image Url-5', key: 'imageUrl5', width: 48 },
			{ header: 'Image Url-6', key: 'imageUrl6', width: 48 },
			{ header: 'Image Url-7', key: 'imageUrl7', width: 48 },
			{ header: 'Image Url-8', key: 'imageUrl8', width: 48 },
			{ header: 'Unit-1', key: 'unit1', width: 16 },
			{ header: 'Price-1', key: 'price1', width: 16 },
			{ header: 'Product Stock-1', key: 'productStock1', width: 16 },
			{ header: 'Enable-1', key: 'enable1', width: 16 },
			{ header: 'Unit-2', key: 'unit2', width: 16 },
			{ header: 'Price-2', key: 'price2', width: 16 },
			{ header: 'Product Stock-2', key: 'productStock2', width: 16 },
			{ header: 'Enable-2', key: 'enable2', width: 16 },
			{ header: 'Unit-3', key: 'unit3', width: 16 },
			{ header: 'Price-3', key: 'price3', width: 16 },
			{ header: 'Product Stock-3', key: 'productStock3', width: 16 },
			{ header: 'Enable-3', key: 'enable3', width: 16 },
			{ header: 'Unit-4', key: 'unit4', width: 16 },
			{ header: 'Price-4', key: 'price4', width: 16 },
			{ header: 'Product Stock-4', key: 'productStock4', width: 16 },
			{ header: 'Enable-4', key: 'enable4', width: 16 },
			{ header: 'Unit-5', key: 'unit5', width: 16 },
			{ header: 'Price-5', key: 'price5', width: 16 },
			{ header: 'Product Stock-5', key: 'productStock5', width: 16 },
			{ header: 'Enable-5', key: 'enable5', width: 16 },
		];
		return columns;
	}

	public async getCategoryHeaders() {
		let columns = [
			{ header: 'Category Id', key: 'id', width: 32 },
			{ header: 'Category Name', key: 'title', width: 32 },
			{ header: '', key: '', width: 32 },
			{ header: 'Sub-category Id', key: 'subCategoryId', width: 32 },
			{ header: 'Sub-category Name', key: 'subCategoryName', width: 32 }
		];
		return columns;
	}
	public async getOrderHeaders() {
		const columns = [
			{ header: 'Order No', key: 'orderID', width: 10 },
			{ header: 'customer Name', key: 'Name', width: 16 },
			{ header: 'Phone', key: 'mobileNumber', width: 16 },
			{ header: 'Address', key: 'address', width: 32 },
			{ header: 'pin code', key: 'pincode', width: 10 },
			{ header: 'Category', key: 'categoryName', width: 30 },
			{ header: 'Sub-Category', key: 'subCategoryName', width: 30 },
			{ header: 'Product Name', key: 'productName', width: 24 },
			{ header: 'STOCK KEEPING UNIT', key: 'sku', width: 18 },
			{ header: 'Order Date', key: 'createdAt', width: 12 },
			{ header: 'Variant Name', key: 'variantName', width: 12 },
			{ header: 'Subscription Order Count', key: 'subscriptionCount', width: 24 },
			{ header: 'Manaul Order Count', key: 'manaualOrder', width: 24 },
			{ header: 'Total Order Count', key: 'totalOrder', width: 24 },
			{ header: 'Total price', key: 'productTotal', width: 16 },
			{ header: 'Payment Type', key: 'paymentType', width: 16 },
			{ header: 'Payment Status', key: 'paymentStatus', width: 16 },
			{ header: 'Delivery time', key: 'deliveryTime', width: 20 },
		];
		return columns;
	}

	public async exportProducts(products, categories, categoriesWithNoSubCat, userId, userService: UserService) {
		var workbook = new Excel.Workbook();
		//Products
		let sheet = workbook.addWorksheet("Products");
		sheet.columns = await this.getHeaders();
		(await products).map(async p => {
			let obj = {
				_id: p._id.toString(),
				title: p.title,
				description: p.description,
				keyWords: p.keyWords,
				categoryId: p.categoryId,
				subCategoryId: p.subCategoryId,
			}
			var i = 1;
			if (p.productImages.length > 0) {
				for (let q of p.productImages) {
					obj['imageUrl' + i] = q.imageUrl;
					i++;
				}
			} else {
				obj['imageUrl' + 1] = p.imageUrl;
			}
			i = 1;
			for (let q of p.variant) {
				obj['unit' + i] = q.unit;
				obj['price' + i] = q.price;
				obj['productStock' + i] = q.productStock;
				obj['enable' + i] = q.enable;
				i++;
			};
			await sheet.addRow(obj);
		});

		// Categories
		let catSheet = workbook.addWorksheet("Categories");
		catSheet.columns = await this.getCategoryHeaders();
		await catSheet.addRow();
		let tempArr = [];
		for (var i = 0, l = categories.length; i < l; i++) {
			let cat = categories[i];
			if (tempArr[cat.categoryId]) tempArr[cat.categoryId].list.push({ id: cat._id, title: cat.title });
			else tempArr[cat.categoryId] = { id: cat.categoryId, title: cat.categoryName, list: [{ id: cat._id, title: cat.title }] }
		}

		for (var j = 0, l = categoriesWithNoSubCat.length; j < l; j++) {
			let cat = categoriesWithNoSubCat[j];
			tempArr[cat._id] = { id: cat._id.toString(), title: cat.title, list: [{ id: "", title: "" }] };
		}
		for (var key in tempArr) {
			let obj = tempArr[key];
			await obj.list.forEach(async (ele, index) => {
				if (index == 0) await catSheet.addRow({ id: obj.id, title: obj.title, subCategoryId: ele.id.toString(), subCategoryName: ele.title });
				else await catSheet.addRow({ subCategoryId: ele.id.toString(), subCategoryName: ele.title });
			});
			await catSheet.addRow();
		}
		const fileName = 'products_exports.xlsx';
		await workbook.xlsx.writeFile(fileName);
		let path = appRoot.path + "/" + fileName;
		let base64 = await fs.readFileSync(path, { encoding: 'base64' });
		let uploadedFile = await this.uploadService.uploadBase64(base64, fileName);

		let obj = { url: uploadedFile.url, status: "Completed", publicId: uploadedFile.key }
		await userService.updateMyInfo(userId, { productExportedFile: obj });
		await fs.unlinkSync(path);
		return true;
	}

	public async createImportTemplate(categories, categoriesWithNoSubCat) {
		var workbook = new Excel.Workbook();
		//Products
		let sheet = workbook.addWorksheet("Products");
		sheet.columns = await this.getHeaders();

		// Categories
		let catSheet = workbook.addWorksheet("Categories");
		catSheet.columns = await this.getCategoryHeaders();
		await catSheet.addRow();
		let tempArr = [];
		for (var i = 0, l = categories.length; i < l; i++) {
			let cat = categories[i];
			if (tempArr[cat.categoryId]) tempArr[cat.categoryId].list.push({ id: cat._id, title: cat.title });
			else tempArr[cat.categoryId] = { id: cat.categoryId, title: cat.categoryName, list: [{ id: cat._id, title: cat.title }] }
		}
		for (var j = 0, l = categoriesWithNoSubCat.length; j < l; j++) {
			let cat = categoriesWithNoSubCat[j];
			tempArr[cat._id] = { id: cat._id.toString(), title: cat.title, list: [{ id: "", title: "" }] };
		}
		for (var key in tempArr) {
			let obj = tempArr[key];
			await obj.list.forEach(async (ele, index) => {
				if (index == 0) await catSheet.addRow({ id: obj.id, title: obj.title, subCategoryId: ele.id.toString(), subCategoryName: ele.title });
				else await catSheet.addRow({ subCategoryId: ele.id.toString(), subCategoryName: ele.title });
			});
			await catSheet.addRow();
		}
		const fileName = 'products_imports.xlsx';
		await workbook.xlsx.writeFile(fileName);
		let path = appRoot.path + "/" + fileName;
		let base64 = await fs.readFileSync(path, { encoding: 'base64' });
		let uploadedFile = await this.uploadService.uploadBase64(base64, fileName);

		let obj = { url: uploadedFile.url, publicId: uploadedFile.key }
		await fs.unlinkSync(path);
		return obj;
	}

	public async importProducts(file, categories, categoriesWithNoSubCat) {
		try {
			var workbook = new Excel.Workbook();
			await workbook.xlsx.load(file.buffer);
			let ws = workbook.getWorksheet("Products");
			let newProducts = [];
			let existProducts: Array<ImportProductDTO> = [];

			let tempArr = [];
			for (var i = 0, l = categories.length; i < l; i++) {
				let cat = categories[i];
				if (tempArr[cat.categoryId]) tempArr[cat.categoryId].list.push({ id: cat._id, title: cat.title });
				else tempArr[cat.categoryId] = { id: cat.categoryId, title: cat.categoryName, list: [{ id: cat._id, title: cat.title }] }
			}
			for (var j = 0, l = categoriesWithNoSubCat.length; j < l; j++) {
				let cat = categoriesWithNoSubCat[j];
				tempArr[cat._id] = { id: cat._id.toString(), title: cat.title, list: [{ id: "", title: "" }] };
			}
			await ws.eachRow((row, rowNumber) => {
				if (rowNumber == 1) return;
				let id = row.getCell(1).value;
				let catId = row.getCell(5).value;
				let subCatId = row.getCell(6).value;
				let subCatName = null;

				if (subCatId && tempArr[catId]) {
					subCatName = tempArr[catId].list.filter(p => p.id == subCatId);
					subCatId = subCatName[0] ? subCatName[0].id : null;
					subCatName = subCatName[0] ? subCatName[0].title : null;
				} else if (tempArr[catId]) {
					subCatName = null;
					subCatId = null;
				} else {
					this.utilService.badRequest("INVALID CATEGORY ID - " + catId);
				}
				let data = {
					title: row.getCell(2).value,
					description: row.getCell(3).value,
					keyWords: row.getCell(4).value,
					categoryId: catId,
					categoryName: tempArr[catId] ? tempArr[catId].title : '',
					subCategoryId: subCatId,
					subCategoryName: subCatName,
					productImages: [],
					variant: []
				}
				// if (data.imageUrl == "" || data.imageUrl == null) this.utilService.badRequest(ResponseMessage.IMAGE_URL_MUST);
				let index = 7;

				while (index != 15) {
					if (row.getCell(index).value !== null) {
						data.productImages.push({
							imageUrl: typeof (row.getCell(index).value) === 'object' ? row.getCell(index).value.text.toString() : row.getCell(index).value.toString(),
						})
					}
					index += 1;
				}
				while (row.getCell(index).value != null) {
					data.variant.push({
						unit: row.getCell(index).value,
						price: row.getCell(index + 1).value ? row.getCell(index + 1).value : 0,
						productStock: row.getCell(index + 2).value ? row.getCell(index + 2).value : 0,
						enable: row.getCell(index + 3).value != null ? Boolean(row.getCell(index + 3).value) : true,
					});
					index += 4;
				}
				if (row.getCell(1).value) existProducts[id] = data;
				else newProducts.push(data);
			});
			return { existProducts, newProducts };
		} catch (e) {
			console.log(e);
			this.utilService.errorResponse(e);
		}
	}
	public async exportOrderList({ ordersList  }: { ordersList: Array<any>}) {
		var workbook = new Excel.Workbook();
		let sheet = workbook.addWorksheet("orders");
		sheet.columns = await this.getOrderHeaders();
		(await ordersList).map(async p => {
			let obj = {
				orderID: p.orderID,
				Name: p.Name,
				mobileNumber: p.mobileNumber,
				address: p.address,
				pincode: p.pincode,
				categoryName: p.categoryName,
				subCategoryName: p.subCategoryName,
				productName: p.productName,
				sku: p.sku,
				createdAt: p.createdAt,
				variantName: p.variantName,
				subscriptionCount: p.subscriptionCount,
				manaualOrder: p.manaualOrder,
				totalOrder: p.totalOrder,
				productTotal: p.productTotal,
				paymentType: p.paymentType,
				paymentStatus: p.paymentStatus,
				deliveryTime: p.deliveryTime

			}
			await sheet.addRow(obj);
		});

		const fileName = 'orders_export.xlsx';
		await workbook.xlsx.writeFile(fileName);
		let path = appRoot.path + "/" + fileName;
		let base64 = await fs.readFileSync(path, { encoding: 'base64' });
		let uploadedFile = await this.uploadService.uploadBase64(base64, fileName);
		console.log('uploadedFile', uploadedFile)
		let obj = { url: uploadedFile.url, status: "Completed", publicId: uploadedFile.key }
		await fs.unlinkSync(path);
		return obj;
	}
}