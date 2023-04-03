export class OrderItemModel
{
    id = '' //order line item id
    oid = '' //order id
    quantity = 0
    price = null //ProductPriceModel
    item = null //ProductConfigurationModel

    constructor(item)
    {
        this.item = item ? item : null //ProductConfigurationModel
    }
}
