export class PlayerInfoModel
{
    PlayerYear: string = ""
    PlayerNumber: string = ""
    PlayerName: string = ""
    PlayerActivity: object | null = null 
    PlayerCaptain: object | null = null
    
    NotPlayerYear: boolean | null = null
    NotPlayerNumber: boolean | null = null
    NotPlayerName: boolean | null = null
    NotPlayerActivity: boolean | null = null
    NotPlayerCaptain: boolean | null = null
}
