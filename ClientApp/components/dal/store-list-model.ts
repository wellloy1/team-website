import { StoreListItemModel } from './store-list-item-model'

export class StoreListModel
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
    items: StoreListItemModel[]
}
