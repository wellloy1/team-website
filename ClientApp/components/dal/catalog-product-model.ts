import { ProductPriceModel } from '../dal/product-price-model'

export class CatalogProductModel
{
    name: string
    title: string
    price: ProductPriceModel
    currency: string
    image: string
}


export class CategoryItem
{
    name: string
}