// import { PlayerInfoModel } from './player-info-model'
// import { SizeInfoModel } from './size-info-model'

export class StoreAdministratorsModel
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

    StoreID: string
    StoreTitle: string
    StoreDescription: string

    Administrators: StoreAdministratorModel[]
    Invitations: StoreAdministratorInvitationModel[]
}

export class StoreAdministratorModel
{
    UserID: string
    AdministratorSince: object //TimeStampModel
    InvitationEmail: string
}

export class StoreAdministratorInvitationModel
{
    InvitedBy: string
    InvitedTime: object //TimeStampModel
    email: string
}
