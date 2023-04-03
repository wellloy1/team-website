export class CartRosterListModel
{
    pfirst: boolean = true
    plast: boolean = true
    pnumber: number
    psize: number = 10
    ptoken: string
    search: string
    tz: number
    totalElements: number = 0
    totalPages: number = 0
    
    items: CartRosterItemModel[]

    id: string
    oid: string
}

export class CartRosterItemModel
{
    id = '' //order line item id
    quantity = 0
    price = null //ProductPriceModel
    item = null //ProductConfigurationModel
}
