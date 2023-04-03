import { ProductConfigurationModel } from './product-configuration-model'

export class ProductConfigurationListModel
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
    
    items: ProductConfigurationModel[]
}
