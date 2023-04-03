
export class RosterListModel
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
    items: RosterListItemModel[]
}

export class RosterListItemModel
{
    RosterID: string = "" //StoreID
    RosterTitle: string = "" //Title
    Created: string | null = null//Date
    IsDefault: boolean = false //Bool
}
