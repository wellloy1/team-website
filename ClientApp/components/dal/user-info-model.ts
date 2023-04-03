export class UserInfoModel
{
    isAuth: boolean = false
    isBotAuth: boolean = false

    isMergedNew: boolean = false

    isAlmighty: boolean = false
    isAdmin: boolean = false
    isPrinter: boolean = false
    isDesigner: boolean = false
    isDesignerAdmin: boolean = false
    isCustomerService: boolean = false
    isPartner: boolean = false
    

    id_token: string = ""
    access_token: string = ""
    expires_at: number

    profile: any = null

    orgUser: boolean | null = false
    orgUserSelected: boolean | null = false
    orgAllowPo: boolean | null = false
    orgSubdomain: string = ""
    orgId: string = ""
    orgName: string = ""

    customstoreUrl: string = ""
} 

export const UserInfoModelFirstloadList = ['orgUser', 'orgUserSelected', 'orgAllowPo', 'orgSubdomain', 'orgId', 'orgName', 'customstoreUrl']

export class UserModel 
{
    UserID: string | undefined
    Name: string | undefined
    Email: string | undefined
    Organization: OrganizationInfoModel | undefined
}

export class OrganizationInfoModel
{
    OrganizationID: string | undefined
    OrganizationName: string | undefined

}
