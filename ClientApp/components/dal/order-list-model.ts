import { OrderModel } from './order-model'

export class OrderListModel
{
    pfirst: boolean = true
    plast: boolean = true
    pnumber: number
    psize: number = 3
    ptoken: string
    search: string
    tz: number
    totalElements: number = 0
    totalPages: number = 0
    
    items: OrderModel[]
}
