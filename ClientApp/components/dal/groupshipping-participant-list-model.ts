import { PlayerInfoModel } from './player-info-model'
import { SizeInfoModel } from './size-info-model'

export class GroupShippingParticipantListModel
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

    participants: GroupShippingParticipantListPersonModel[]

    GroupShippingID: string
}

export class GroupShippingParticipantListPersonModel
{
    BillFirstName: string
    BillLastName: string

    items: GroupShippingParticipantListPersonItemModel[]
}

export class GroupShippingParticipantListPersonItemModel
{
    OrderID: string
    ProductTitle: string
    ImageUrl: string
    ImageUrlSwap: string
    Quanity: number
    Player: PlayerInfoModel
    Sizes: SizeInfoModel
}
