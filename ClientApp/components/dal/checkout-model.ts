import { ShoppingCartModel } from './shopping-cart-model'

export class CheckoutModel
{
    //TODO: copoune

    ItemGroupID: string | null = null
    Cart: CheckoutShoppingCartModel | null = null
    Timezone = 0
    AccountEmail = ""
    AccountPhone = ""

    ShipAddress = ""
    ShipAddress2 = ""
    ShipAddress3 = ""
    ShipCity = ""
    ShipCountry = null
    ShipState = ""
    ShipZip = ""
    ShipFirstName = ""
    ShipLastName = ""
    ShipCompany = ""
    ShipTaxID = ""
    ShipEORI = ""


    hasBillingAddress = false
    BillAddress = ""
    BillAddress2 = ""
    BillAddress3 = ""
    BillCity = ""
    BillCountry = null
    BillState = ""
    BillZip = ""
    BillFirstName = ""
    BillLastName = ""
    BillCompany = ""
    BillTaxID = ""
    BillEORI = ""

    IsCompany = false
    IsResidential = false
    UseSuggestionValidation = false
    IgnoreSuggestionValidation = false
    HasAutoFillAddress = false
    AllowAutoFillAddress = false


    CountryList = null
    BillCountryList = null
    ShipmentMethod: ShipmentMethodModel | null = null
    ShipmentMethodList: ShipmentMethodModel[] | null = null
    PaymentMethod: PaymentMethodModel | null = null
    PaymentMethodList: PaymentMethodModel[] | null = null

    geoip: boolean | undefined = false

    //cc
    ccName = ""
    ccNumber = ""
    ccCVV = ""
    ccExpMonth = null
    ccExpYear = null
    ccExpYearList = null
    ccExpMonthList = null

    Currency = ""
    Totals:TotalModel[] | null = null
    ValidationRules = null //FieldValidationRuleModel

    //group shipping
    isgroup = null //bool
    groupdeadline = null //DateTime
    shipping = null //GroupShipping

    // Sandbox
    State = ""

    OrderID: string | null = null
    AccessToken: string | null = null

    PurchaseOrderToken: string | null = null
    PurchaseOrderDescription: string | null = null
    
    PaymentIntentID: string | null = null
    PaymentIntentToken: string | null = null
    PaymentIntentResult: string | null = null
    PaymentEventID: string | null = null
    PaymentIntentByRedirect: boolean | null = null

    PostData = null //2c2p

    //UI
    result = {
        order: null,
        sqtoken: null, 
        errorMessage: "",
        cardError: "",
        notvalid: [],
    }

}

export class CheckoutShoppingCartModel
{
    ShoppingCartCount: number | null
    stores: ShoppingCartModel[] | null
}

export class ShipmentMethodModel
{
    id: string
    title: string
    desc: string
    amount: number
}

export class TotalModel
{
    id: string
    title: string
    desc: string
    amount: number
}

export class PaymentMethodModel
{
    id: string
    title: string
}