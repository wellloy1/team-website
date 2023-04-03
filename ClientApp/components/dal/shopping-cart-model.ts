import { ShoppingCartItemModel } from './shopping-cart-item-model'
import { TotalModel } from './total-model'

export class ShoppingCartModel
{
    gid: string | null 
    title: string | null 

    Currency: string = ''

    hideprices: boolean

    Totals: TotalModel[] = new Array() 
    items: ShoppingCartItemModel[] = new Array() //ShoppingCartItemModel
}
