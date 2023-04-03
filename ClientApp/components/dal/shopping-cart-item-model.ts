import { ProductConfigurationModel } from './product-configuration-model'

export class ShoppingCartItemModel
{
    id: string = ""
    quantity: number = 0
    qty_old: number = 0
    item: ProductConfigurationModel | null = null //ProductConfigurationModel

    //UI
    added: boolean = false
    animIndex: number = 0

    constructor(item?)
    {
        this.item = (item ? item : null)

    }
}
