import { GroupShippingListItemModel } from './groupshipping-list-item-model'

export class GroupShippingListModel
{
    pfirst: boolean
    plast: boolean
    pnumber: number
    psize: number = 20
    ptoken: string
    search: string
    tz: number
    totalElements: number
    totalPages: number

    items: GroupShippingListItemModel[]

    StoreID: string
}
