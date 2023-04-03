
export class RosterModel
{
    RosterID: string = "" 
    RosterTitle: string = ""
    Created: string | null = null//Date
    IsDefault: boolean = false //Bool
    Items: RosterItemModel[] = []
}

export class RosterItemModel
{
    PlayerYear: string = "" 
    PlayerName: string = "" 
    PlayerNumber: string = ""
    Sizes: RosterSizeModel[] =  []
}

export class RosterSizeModel
{
    SizeCategory: string = "" 
    SizeCategoryName: string = "" 
    Value: string = "" 
}