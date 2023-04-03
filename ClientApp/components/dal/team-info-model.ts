import { ColorModel } from './color-model'

export class TeamInfoModel
{
    Colors: ColorModel[] | null = []
    TeamNames: string[] = []
    Sports: any = {} //Sports

    NotTeamName1: boolean | null = null
    NotTeamName2: boolean | null = null
    NotTeamName3: boolean | null = null
    NotTeamName4: boolean | null = null
    NotColor1: boolean | null = null
    NotColor2: boolean | null = null
    NotColor3: boolean | null = null
} 
