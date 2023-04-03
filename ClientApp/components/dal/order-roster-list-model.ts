export class OrderRosterListModel
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
    
    items: OrderRosterItemModel[]

    id: string
    oid: string
}

export class OrderRosterItemModel
{
    id = '' //order line item id
    oid = '' //order id
    quantity = 0
    price = null //ProductPriceModel
    item = null //ProductConfigurationModel

    // constructor(item)
    // {
    //     this.item = item ? item : null //ProductConfigurationModel
    // }
}
