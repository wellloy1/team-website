export class PurchaseOrderListModel
{
    pfirst: boolean
    plast: boolean
    pnumber: number
    psize: number = 10
    ptoken: string
    search: string
    tz: number
    totalElements: number
    totalPages: number
    items: PurchaseOrderListItemModel[]
}


export class PurchaseOrderListItemModel
{
    PurchaseOrderID: string = ""
    IssuerUserID: string = ""
    Created: string | null = "" //Date
    OrderCount: number = 0
    TotalAmount: number = 0
    Currency: string = "" 

    approved: boolean = false
}
