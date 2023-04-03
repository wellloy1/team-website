export class ProductConfigurationModel 
{
    CustomizationType: string  = ""
    ParentChangedFlag: boolean | null = null //bool
    ParentProductConfigurationID: string | null = null
    ProductConfigurationID: string = ""
    Product = null //: ProductCustomModel
    
    ProductPointOfView: any
    ProductPointOfViewCount: any
    ProductViews: ProductViewModel[]

    DesignOptionSetList = null //: DesignOptionSetModel[]
    DesignOptionSetListWizardState:any = null 

    Player: any = null
    Team: any = null
    SizesSelected = [] //: SizeInfoModel[]
    ColorsPalette: any = null
    lid: string = "" //order|cart lineitem
    AllowPhotos: boolean | null = null //bool
    Photos: string[] = [] //ids

    HasDimensions: boolean | null = null //bool
    DrawDimensions: boolean | null = null //bool
    HasChanges: boolean | null = null //bool

    CanCustomize: boolean | null = null //bool
    CanAddToStore: boolean | null = null //bool
    CanQuickCustomize: boolean | null = null //bool

    CustomizeCount: number | null = null //integer

    Store = null //StoreConfigurationModel
    IsBranded: boolean | null = null //bool

    SportsList: any = null //array
    CatalogCategory: any = null //object

    Quantity: string
    Price: object //ProductPriceModel
    QtyStep: number | null


    SizesLoсkedFlag: any

    RecentProducts: []
}


export class ProductViewModel
{
    ImageUrl: string = ""
    ImageUrl3DFrames: string = ""
    Selected: boolean | null = null //bool
}
