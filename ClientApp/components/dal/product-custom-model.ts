import { ProductManufacturerModel } from './product-manufacturer-model'

export class ProductCustomModel
{
    ProductID: string = ""
    ProductManufacturers: ProductManufacturerModel[] = new Array()
    Title: string = ""
    Price: number = 0 //int
    Currency: string = ""
    Description: string = ""
}