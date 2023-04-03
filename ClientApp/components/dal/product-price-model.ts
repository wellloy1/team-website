export class ProductPriceModel
{
    Quantity: number | undefined
    SizeSurcharge: number | undefined

    SalePrice: number | undefined
    SalePriceFinal: number | undefined

    ListPrice: number | undefined
    FinalAmount: number | undefined

    AppliedDiscounts: string[]
    DiscountOffers: string[]
}
