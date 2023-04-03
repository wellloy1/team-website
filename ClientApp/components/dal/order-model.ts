export class OrderModel
{
    id = ""
    Created = null //UTC + TZ
    Currency = ""
    Status = ""

    AccountEmail = ""
    AccountPhone = ""

    ShipAddress = ""
    ShipCity = ""
    ShipCountry = ""
    ShipState = ""
    ShipZip = ""
    ShipFirstName = ""
    ShipLastName = ""

    BillAddress = ""
    BillCity = ""
    BillCountry = ""
    BillState = ""
    BillZip = ""
    BillFirstName = ""
    BillLastName = ""

    ShipmentMethod = null //ShipmentModel
    PaymentHistory = null //Array

    items = [] //OrderItemModel

    Totals = []

    AccessToken = ""

    Cancelable = false
    Canceled = false
}

export class PaymentMethod
{
    id: string
    title: string
}

export class PaymentHistoryItem 
{
    Amount: number
    Kind: string
    PaymentMethod: PaymentMethod
    Status: string
    TimeStamp: any
}
