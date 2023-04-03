import { GroupShippingModel } from '../dal/group-shipping-model'
import { CatalogProductModel } from '../dal/catalog-product-model'

export class StoreConfigurationModel
{
    sid: string = "" //StoreID
    userid: string = "" //UserID
    isbranded: boolean = false //Bool
    isowner: boolean = false //Bool
    isdefault: boolean = false //Bool
    created: string | null= null //Date
    updated: string | null = null //Date
    title: string = "" //Title

    isgroup: boolean = false //Bool
    shipping: any = null //GroupShippingModel
    groupdeadline: any = null //Date {}
    groupmin: string = "" //NumberString

    items: CatalogProductModel[] = []

    RecentProducts: []
}
