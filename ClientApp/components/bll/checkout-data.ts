import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { Currency } from '../utils/CommonUtils'
import { CheckoutModel } from '../dal/checkout-model'
import { NetBase } from './net-base'
import { CustomElement, sleep } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { DialogPopupButtonModel } from '../dal/dialog-popup-model'
import { DialogPopupModel } from '../dal/dialog-popup-model'
import { loadScript, PayPalScriptOptions, PayPalNamespace } from "@paypal/paypal-js"
const ALLOW_SAVEDATA_ADMIN = false
const STRIPE_API_VERSION = "2022-08-01"
const PAYNOW_TIMEOUT = 10 * 60 * 1000 //ms
const PAYNOW_UPDATE_TIMEOUT = 10 * 60 * 1000 //ms
const paymethod_PAYPAL = "PayPal"           // - payment gateway


@CustomElement
export class CheckoutData extends NetBase
{
    static get is() { return 'teamatical-checkout-data' }

    static get template() 
    {
        return html`<app-localstorage-document key="checkout-cache" data="{{cache}}"></app-localstorage-document>`
        // <app-localstorage-document key="checkout-session" data="{{session}}" session-only></app-localstorage-document>
    }

    static get properties()
    {
        return {
            model: { type: Object, notify: true }, //checkout_model
            postData: { type: String },

            //pay
            apiPubkey: { type: String },
            apiGateway: { type: String },
            orgCountry: { type: String },
            orgSubdomain: { type: String },
            orgConnectedId: { type: String },
            stripeLoaded: { type: Boolean },
            stripeReady: { type: Boolean, notify: true },
            paypalLoaded: { type: Boolean },
            paypalReady: { type: Boolean, notify: true },
            paymentRequest: { type: Object },

            //input
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            cart: { type: Array },
            userInfo: { type: Object },
            cache: { type: Object, value: {} },
            
            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            loadingDebounce: { type: Boolean, notify: true, readOnly: true,  },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            success: { type: Boolean, notify: true, readOnly: true, },
            summary: { type: Object, notify: true },

            _hidePaymentRequestMethod: { type: Boolean, value: true },
            cartCheckout: { type: Array, computed: '_computeCartCheckout(model.ItemGroupID, cart, cart.*)' },
            countryProfile: { type: Object, notify: true, computed: '_compute_countryProfile(model.ShipCountry.id)' },
            countryBillProfile: { type: Object, notify: true, computed: '_compute_countryProfile(model.BillCountry.id)' },
            countryOrderProfile: { type: Object, notify: true, computed: '_compute_countryProfile(model.result.order.ShipCountryCode)' },
            countryOrderBillProfile: { type: Object, notify: true, computed: '_compute_countryProfile(model.result.order.BillCountryCode)' },
        }
    }

    static get observers()
    {
        return [
            '_modelChanged(model.*, cache, cart, userInfo, visible)',
            '_loadPayPalElements(apiGateway, model.Currency, model.PaymentIntentToken, visible)',
            '_stripeChanged(apiPubkey, orgConnectedId, stripeLoaded)',
            '_paypalChanged(apiPubkey, orgConnectedId, paypalLoaded)',
            '_returnUrlHandler(visible, stripeReady, queryParams.gid, queryParams.orderid, queryParams.access_token, queryParams.return_url, queryParams.payment_intent, queryParams.payment_intent_client_secret, queryParams.payment_event_id, queryParams.redirect_status)',
        ]
    }
    _log(v) { console.log(v) }


    // session: any
    postData: string
    model: CheckoutModel
    cache: any
    paypalLoaded: boolean
    apiGateway: string
    apiPubkey: string
    _first: any
    cartCheckout: any
    _modelUpdating: any
    _modelOld: any
    _hidePaymentRequestMethod: any 
    _setFailure: any
    _setLoading: any 
    _setLoadingDebounce: any 
    _setSaving: any 
    _setSuccess: any 
    _submitFormDebouncer: any 
    _modelDebouncer: Debouncer
    orgCountry: string
    orgSubdomain: string
    orgConnectedId: string
    stripe: any
    paypal: PayPalNamespace | null
    stripeLoaded: any
    stripeReady: boolean
    paypalReady: boolean
    paymentRequest: any

    queryParams: any
    websiteUrl: any
    cart: any
    userInfo: any

    visible: any
    loading: any
    saving: any
    failure: any
    success: any
    summary: any



    connectedCallback()
    {
        this._first = true
        super.connectedCallback()
    }

    reset()
    {
        // clear input data
        this._modelApplyRequest(this._modelInitRequest(true))
        this.setPaymentIntentQueryParams(this.model.PaymentIntentID, this.model.PaymentIntentToken)
    }
    
    setPaymentIntentQueryParams(paymentIntentID, paymentIntentToken)
    {
        // this._suppressUrlHandler = true
        // var props = {}
        // props['queryParams.payment_intent'] = paymentIntentID
        // props['queryParams.payment_intent_client_secret'] = paymentIntentToken
        // this.setProperties(props)

        // var qp = this.queryParams
        // window.history.replaceState({}, '', StringUtil.urlquery(document.location.pathname, qp))

        // this._suppressUrlHandler = false
    }


    refresh()
    {
        this.reset()
        this._first = true
        this._setLoadingDebounce(true)
        this._modelDebouncer = Debouncer.debounce(this._modelDebouncer, timeOut.after(100), () =>
        {
            this._setLoadingDebounce(false)
            if (this.loading) { return }
            // console.log('refresh - _sendRequest get')
            this._sendRequest('get')
        })
    }

    cleanPrivateInfoInCache()
    {
        if (!this.cache) { return }

        this.cache = {}

        this.async(() => { this.refresh() }, 1)
    }

    getStripe()
    {
        if (!this.stripe && this.apiPubkey)
        {
            var Stripe = window['Stripe']
            let stripeOpt = { apiVersion: STRIPE_API_VERSION, stripeAccount: undefined as string | undefined }
            if (this.orgConnectedId)
            {
                stripeOpt.stripeAccount = this.orgConnectedId
            }
            else
            {
                delete stripeOpt.stripeAccount
            }
            this.stripe = Stripe ? Stripe(this.apiPubkey, stripeOpt) : null
        }
        return this.stripe
    }

    getPayPal()
    {
        return this.paypal
    }

    async _loadPayPalElements(apiGateway, modelCurrency, modelPaymentIntentToken, visible)
    {
        // if (this.paypalLoaded || apiGateway != paymethod_PAYPAL || !visible || !modelCurrency || !modelPaymentIntentToken) { return }
        if (this.paypalLoaded || apiGateway != paymethod_PAYPAL || !visible || !modelCurrency) { return }

        try 
        {
            const payd = this._getPayData()
            var pp_locale = StringUtil.replaceAll(this.language ? this.language : this.defaultLanguage, "-", "_")
            var pp_opts: PayPalScriptOptions = { 
                "client-id":        this.apiPubkey, // test
                "debug":            this._dev,
                "currency":         payd.currency ? payd.currency.toUpperCase() : "USD",
                "components":       "buttons,hosted-fields", //buttons,marks,messages,funding-eligibility,hosted-fields
                // "disable-funding":  "paylater", //card,credit,paylater,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sepa,sofort,venmo
                //"disable-card":     "", //visa,mastercard,amex,discover,jcb,elo,hiper
                "enable-funding":   "venmo", //default: none //venmo, paylater
                "integration-date": "2022-09-08",
                "locale":           pp_locale,
                "intent":           "capture", //default: capture, authorize, subscription, tokenize
                // "vault":            false, //default: false
                // "commit":           true, //default: true
                //"merchant-id":      "XXX",
                // "data-page-type":   "checkout",
                // "data-client-token": "",
                // "data-partner-attribution-id": this.orgConnectedId,
                // data-sdk-integration-source="integrationbuilder"
            }
            if (this._dev)
            {
                pp_opts["buyer-country"] = this.orgCountry //US, CA, GB, DE, FR //Note: Buyer country is valid only in sandbox and you should not pass it in production.
            }
            this.paypal = await loadScript(pp_opts)
            console.log(`%c PayPal - v${this.paypal?.version} `, 'color: white; background-color: #009CDE', pp_opts)
            this.paypalLoaded = true
        } 
        catch (error) 
        {
            console.error("failed to load the PayPal JS SDK script", error)
        }
    }

    model_StripePayerInfo(payerInfo, clean?)
    {
        if (payerInfo == null) { return }

        //clean for model change event fires
        if (clean)
        {
            this.set('model.AccountEmail', '', true)
            this.set('model.AccountPhone', '', true)
        }

        if (payerInfo.payerPhone) { this.set('model.AccountPhone', payerInfo.payerPhone, true) }
        if (payerInfo.payerEmail) { this.set('model.AccountEmail', payerInfo.payerEmail, true) }
    }

    model_StripeShippingAddress(shippingAddress, clean?)
    {
        // console.log(shippingAddress, clean)
        if (shippingAddress == null) { return }

        //clean for model change event fires
        // console.log(shippingAddress)
        var Type = this.model.isgroup ? 'Bill' : 'Ship'
        if (clean)
        {
            this.set('model.AccountPhone', '', true)

            this.set('model.' + Type + 'Address', '', true)
            this.set('model.' + Type + 'Address2', '', true)
            this.set('model.' + Type + 'Address3', '', true)
            this.set('model.' + Type + 'City', '', true)
            this.set('model.' + Type + 'Country', null, true)
            this.set('model.' + Type + 'State', '', true)
            this.set('model.' + Type + 'Zip', '', true)
            this.set('model.' + Type + 'FirstName', '', true)
            this.set('model.' + Type + 'LastName', '', true)
            this.set('model.' + Type + 'Company', '', true)
            this.set('model.' + Type + 'TaxID', '', true)
            this.set('model.' + Type + 'EORI', '', true)

            this.set('model.' + 'BillIsCompany', false, true)
            this.set('model.' + 'IsCompany', false, true)
            this.set('model.' + 'IsResidential', false, true)
        }


        if (shippingAddress.phone)
        {
            this.set('model.AccountPhone', shippingAddress.phone, true)
        }

        var typeCountryList = this.model[(Type == 'Bill' ? Type : '') + 'CountryList'] //BillCountryList | CountryList
        var ci = typeCountryList.filter((i) =>
        {
            // console.log(i.id + ' ~ ' + shippingAddress.country)
            return i.id == shippingAddress.country
        })
        //TODO: test - need to remove after
        if (ci.length < 1) { ci = [typeCountryList[0]] }
        


        if (Array.isArray(shippingAddress.addressLine)) 
        {
            this.set('model.' + Type + 'Address', shippingAddress.addressLine.shift(), true)
            if (shippingAddress.addressLine.length > 0)
            {
                this.set('model.' + Type + 'Address2', shippingAddress.addressLine.shift(), true)
            }
            if (shippingAddress.addressLine.length > 0)
            {
                this.set('model.' + Type + 'Address3', shippingAddress.addressLine.join(', '), true) //concat all others
            }
        }

        this.set('model.' + Type + 'City', shippingAddress.city, true)
        this.set('model.' + Type + 'Country', ci.length > 0 ? ci[0] : null, true)
        this.set('model.' + Type + 'State', shippingAddress.region, true)
        this.set('model.' + Type + 'Zip', shippingAddress.postalCode, true)
        var names = shippingAddress.recipient.split(' ')
        var firstname = names.shift()
        var lastname = names.join(' ')
        this.set('model.' + Type + 'FirstName', firstname, true)
        this.set('model.' + Type + 'LastName', lastname, true)

        //????
        if (shippingAddress.organization)
        {
            this.set('model.' + Type + 'Company', shippingAddress.organization, true)
            // this.set('model.' + Type + 'TaxID', '', true)
            // this.set('model.' + Type + 'EORI', '', true)
        }

        // shippingAddress ...
        //   dependentLocality: ""
        //   organization: ""
        //   sortingCode: ""



        //check validation
        var isvalid = true
        if (Array.isArray(this.model.result.notvalid) && this.model.result.notvalid.length > 0)
        {
            const notvalid = this.model.result.notvalid as any
            for (var i in notvalid)
            {
                // console.log(notvalid[i])
                if (notvalid[i] && notvalid[i].Key.indexOf(Type) >= 0)
                {
                    isvalid = false
                    break
                }
            }
        }
        return isvalid
    }

    model_StripeShippingOption(shippingOption, clean?)
    {
        if (shippingOption == null) { return }

        var sm = !this.model.ShipmentMethodList ? [] : this.model.ShipmentMethodList.filter((i) =>
        {
            return i.id == shippingOption.id
        })
        // console.log(sm)
        var r = sm.length > 0
        if (r)
        {
            this.set('model.ShipmentMethod', sm[0], true)
        }
        return r
    }

    placeOrder(stripeElements)
    {
        // this._placeOrder({ card: cardForm })
        this._placeOrder(stripeElements)
    }

    _submitFormLastTime: any
    _placeOrder(paymentMethod)
    {
        if (this.loading || this._modelDebouncer?.isActive()) { return }

        this._setLoading(true) //set to loading to disable all buttons
        this._submitFormDebouncer = Debouncer.debounce(this._submitFormDebouncer, timeOut.after(350), () =>
        {
            this._sendRequest('place-order', paymentMethod)
        })
    }

    set(path, val, notify?)
    {
        let internal = (path && path.indexOf('model') >= 0) && notify !== true
        if (internal) { this._modelUpdating = true }
        super.set(path, val)
        if (internal) { this.async(() => { this._modelUpdating = false }) }
        // if (internal) { this._modelUpdating = false }
    }

    hidePaymentRequestMethod()
    {
        this._hidePaymentRequestMethod = true

        if (this.model && Array.isArray(this.model.PaymentMethodList))
        {
            var c = false
            this.model.PaymentMethodList = this.model.PaymentMethodList.filter((i) =>
            {
                var b = (i.id == "PR")
                if (b)
                {
                    c = true
                    // console.log(i)
                }
                return !b
            })
            if (c)
            {
                this.model.PaymentMethod = (this.model.PaymentMethodList.length > 0 ? this.model.PaymentMethodList[0] : null)
                this.notifyPath('model.PaymentMethodList')
                // console.log(this.model.PaymentMethodList)
            }
        }
    }

    _stripeChanged(apiPubkey, orgConnectedId, stripeLoaded)
    {
        if (!apiPubkey || stripeLoaded !== true) { return }
        this.stripeReady = true
    }

    _paypalChanged(apiPubkey, orgConnectedId, paypalLoaded)
    {
        if (!apiPubkey || paypalLoaded !== true) { return }
        this.paypalReady = true
    }

    _recepientName(first, last)
    {
        var name = ''
        if (first)
        {
            name = first
        }
        if (name && last)
        {
            name = name + ' ' + last
        }
        return name
    }

    getPayRequest()
    {
        //2021-08-09: AE, AT, AU, BE, BG, BR, CA, CH, CI, CR, CY, CZ, DE, DK, DO, EE, ES, FI, FR, GB, GI, GR, GT, HK, HU, ID, IE, IN, IT, JP, LI, LT, LU, LV, MT, MX, MY, NL, NO, NZ, PE, PH, PL, PT, RO, SE, SG, SI, SK, SN, TH, TT, US, UY
        const payd = this._getPayData()
        if (!payd.complete) { return null } //shp

        const opt: any = {
            country: payd.country,
            currency: payd.currency,
            total: payd.total,
            displayItems: payd.displayItems,
        }

        if (true) //!this.model.isgroup)
        {
            // opt.disableWallets = ['googlePay']
            opt.requestPayerName = true
            opt.requestPayerPhone = true
            opt.requestPayerEmail = true
            opt.requestShipping = true //shp
            opt.shippingOptions = payd.shippingOptions
        }

        // console.log(payd.total)
        // if (this._dev) console.log('getPayRequest', opt)

        if (this.paymentRequest) 
        {
            delete opt.country
            delete opt.requestShipping
            delete opt.requestPayerName
            delete opt.requestPayerPhone
            delete opt.requestPayerEmail
            if (this.paymentRequest.__shipmentHandler)
            {
                this.paymentRequest.__shipmentHandler(opt)
            }
            else
            {
                // console.log(this.paymentRequest, opt)
                try { this.paymentRequest.update(opt) } catch { }
            }
            return this.paymentRequest 
            //EXIT -----------------------------------------------
        }

        try
        {
            var stripe = this.getStripe()

            var shipmentHandler = async (ev, opt) => 
            {
                // console.log(ev, opt)
                this.paymentRequest.__shipmentHandler = null

                await ev.updateWith({
                    status: 'success',
                    // currency: opt.currency,
                    total: opt.total,
                    displayItems: opt.displayItems,
                    shippingOptions: opt.shippingOptions,
                })
            }

            this.paymentRequest = stripe.paymentRequest(opt) //here when I call this, it crashes with..
        

            this.paymentRequest.on('paymentmethod', async (ev) => 
            {
                // if (this._dev) console.log('paymentmethod', ev)
                if (!ev || !(this.model?.PaymentMethod?.id == "SP"))
                {
                    //error - no such payment method impl.
                    if (ev) { await ev.complete('fail') }
                    return //EXIT !!!
                }


                var modelBefore = JSON.parse(JSON.stringify(this.model))
                //apply data by tokenized data
                this._modelUpdating = true
                this.model_StripePayerInfo(ev)
                this.model_StripeShippingAddress(ev.shippingAddress)
                this.model_StripeShippingOption(ev.shippingOption)
                this._modelUpdating = false

                this.model.IgnoreSuggestionValidation = true //To avoid dialog we cannot show on G-A-M Pay

                var waschanged = this._modelHasChanges(this.model, modelBefore)
                if (waschanged) 
                { 
                    this._sendRequest('update', ev.paymentMethod.id)
                    var startWait = new Date()
                    while(this.loading)
                    {
                        await sleep(100)
                        if (new Date().getTime() > (startWait.getTime() + PAYNOW_UPDATE_TIMEOUT))
                        {
                            await ev.complete('fail')
                            return
                        }
                    }
                    this._sendRequest('place-order', ev.paymentMethod.id)
                } 
                else 
                { 
                    this._sendRequest('place-order', ev.paymentMethod.id)
                }

                var startWait = new Date()
                while(this.loading)
                {
                    await sleep(100)
                    if (new Date().getTime() > (startWait.getTime() + PAYNOW_TIMEOUT))
                    {
                        await ev.complete('fail')
                        return
                    }
                }

                //check if success ->
                if (this.model?.result?.cardError)
                {
                    await ev.complete('fail')
                }
                else
                {
                    ev.complete('success')
                }
            })
            
            this.paymentRequest.on('shippingaddresschange', async (ev) =>
            {
                // if (this._dev) console.log('shippingaddresschange', ev)
                const isvalid = this.model_StripeShippingAddress(ev.shippingAddress, true)
                this.paymentRequest.__shipmentUpdateCounter = (this.paymentRequest.__shipmentUpdateCounter ? this.paymentRequest.__shipmentUpdateCounter : 0) + 1
                this.set('model._forceUpdate', this.paymentRequest.__shipmentUpdateCounter, true)

                if (!this.model.ShipCountry || !isvalid)
                {
                    await ev.updateWith({ status: 'invalid_shipping_address' })
                }
                else 
                {
                    // console.log('update shipping amount here ....')
                    this.paymentRequest.__shipmentHandler = (opt) => shipmentHandler(ev, opt)
                }
            })

            this.paymentRequest.on('shippingoptionchange', (ev) =>
            {
                if (this._dev) console.log('shippingoptionchange', ev)
                const isvalid = this.model_StripeShippingOption(ev.shippingOption, true)
                this.paymentRequest.__shipmentUpdateCounter = (this.paymentRequest.__shipmentUpdateCounter ? this.paymentRequest.__shipmentUpdateCounter : 0) + 1
                this.set('model._forceUpdate', this.paymentRequest.__shipmentUpdateCounter, true)

                if (isvalid)
                {
                    // console.log('update shipping amount here ....')
                    this.paymentRequest.__shipmentHandler = (opt) => shipmentHandler(ev, opt)
                }
            })

            // The customer can dismiss the payment interface in some browsers even after they authorize the payment. 
            // This means that you might receive a cancel event on your PaymentRequest object after receiving a paymentmethod event. 
            // If you’re using the cancel event as a hook for canceling the customer’s order, make sure you also refund the payment that you just created.
            this.paymentRequest.on('cancel', (ev) =>
            {
                if (this._dev) console.log('paymentRequest - cancel', ev)
                // this.paymentRequest.__shipmentHandler = null
            })
        }
        catch(ex)
        {
            if (ex?.name == "IntegrationError")
            {

            }
            console.error(ex)
        }

        return this.paymentRequest
    }

    _sendRequest(api_action, paymentMethod?)
    {
        if (this.websiteUrl === undefined) { return }

        var m: any = null
        if (api_action == 'get')
        {
            m = this._modelInitRequest()
            if (this.postData)
            {
                m.PostData = this.postData
                this.postData = ''
            }
        }
        else if (api_action == 'place-order' || api_action == 'update')
        {
            m = Object.assign({}, this.model)
            m.PaymentIntentResult = null
            m.OrderID = null
        }
        else
        {
            m = this.model
        }

        var body = this._modelBuildRequest(m)
        var rq = {
            url: this.websiteUrl + '/api/v1.0/checkout/' + api_action,
            body: body,
            action: api_action,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this),
            paymentMethod: paymentMethod,
        }

        this._setLoading(true)
        this._setFailure(false)
        this._setSuccess(null)
        this.set('summary', null)
        this.set('model.result.errorMessage', '')
        this.set('model.result.cardError', '')
        this.set('model.result.shipmentMethodError', '')
        this.set('model.result.notvalid', [])

        if (api_action == 'place-order') 
        { 
            this._setSaving(true) 
            // if (this._dev) console.log('_setSaving', true)
        }

        var cancelable = (api_action != 'place-order')
        this._getResource(rq, 1, cancelable)
    }

    async _onRequestResponse(e, rq)
    {
        var r = e['response']
        var api_action = rq.action
        if (r)
        {
            this._onRequestResponseDialogs(r['summary'], r['errorid'], r['_devErrorDetails'])

            if (r['success'] === true)
            {
                this._onRequestResponse_DetailsAndSummary(r, rq)

                if (api_action == 'place-order' || api_action == 'place-order-update')
                {
                    this._modelSaveLocal(this.model)
                    var gid = this.model.ItemGroupID
                    var model = r['result']

                    if (model?.result?.order?.PaymentRedirectModel)
                    {
                        //2c2p redirection
                        var m = await import('../bll/payment-gateway-2c2p')
                        var PaymentGateway2C2P = m.PaymentGateway2C2P
                        PaymentGateway2C2P.Redirect(model.result.order.PaymentRedirectModel)
                        return  //EXIT to avoid stopping loading animation
                    }
                    else
                    {
                        //Stripe or other in-page payment
                        if (model?.result?.order?.PaymentIntentToken)
                        {
                            try
                            {
                                let stripe = this.getStripe()
                                var loc = document.location
                                var qpars = {} //StringUtil.parsequery(loc.search)
                                qpars = Object.assign(qpars, { 
                                    return_url: 1, 
                                    gid: gid,
                                    orderid: model?.result?.order?.id, 
                                    access_token: model?.result?.order?.AccessToken,
                                    payment_event_id: model?.result?.order?.PaymentEventID,
                                    sqtoken: model?.result?.sqtoken, //restore session on redirects
                                })
                                var return_url = StringUtil.urlquery(`${loc.protocol}//${loc.host}${loc.pathname}`, qpars)
                                // const { error_fetch } = await rq.paymentMetho.fetchUpdates() //do we need this first???
                                var o = model?.result?.order
                                var billing_details = {
                                    name: `${o.BillFirstName} ${o.BillLastName}`,
                                    email: o.AccountEmail,
                                    phone: o.AccountPhone,
                                    address: {
                                        line1 : o.BillAddress,
                                        line2: `${o.BillAddress2}\n${o.BillAddress3}`,
                                        city: o.BillCity,
                                        state: o.BillState,
                                        country: o.BillCountryCode,
                                        postal_code: o.BillZip,
                                    }
                                }
                                
                                const { paymentIntent, error } = await stripe.confirmPayment({
                                    elements: rq.paymentMethod,
                                    confirmParams: { 
                                        return_url: return_url, 
                                        payment_method_data: {
                                            billing_details: billing_details
                                        },
                                    },
                                    redirect: 'if_required', // Uncomment below if you only want redirect for redirect-based payments
                                })

                                // console.log(paymentIntent, error)
                                if (paymentIntent && !error)
                                {
                                    //show order
                                    this.reset()
                                    this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone - to avoid update req
                                    this.set('model.result.order', model?.result?.order)

                                    //send paymentIntent to server...
                                    this.model.OrderID = model?.result?.order?.id
                                    this.model.PaymentEventID = model?.result?.order?.PaymentEventID
                                    this.model.PaymentIntentID = model?.result?.order?.PaymentIntentID
                                    this.model.PaymentIntentToken = model?.result?.order?.PaymentIntentToken
                                    this.model.PaymentIntentResult = JSON.stringify(paymentIntent)
                                }
                                else if (error)
                                {
                                    // Inform the user for quick response than wait for server api answer
                                    // this.set('model.result.cardError', error?.message) //!DISABLED due to server need to filter messages from Stripe

                                    //send paymentIntentERROR to server...
                                    this.model.OrderID = model?.result?.order?.id
                                    this.model.PaymentEventID = model?.result?.order?.PaymentEventID
                                    this.model.PaymentIntentID = model?.result?.order?.PaymentIntentID
                                    this.model.PaymentIntentToken = model?.result?.order?.PaymentIntentToken
                                    this.model.PaymentIntentResult = JSON.stringify(error)
                                }

                                this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone - to avoid update req
                                //it can be as fire-and-forget but we wait for better user experience
                                this._sendRequest('place-order-update', rq.paymentMethod)
                                
                                return //EXIT to avoid stopping loading animation
                            }
                            catch (ex)
                            {
                                //fatal error - some unknown issue
                                console.error(ex)
                            }
                        }
    
                        if (model?.result?.order)
                        {
                            var res_order = model?.result?.order
                            var qreturn_url = this.queryParams?.return_url

                            //show order
                            this.reset()
                            this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone - to avoid update req
                            this.set('model.result.order', res_order) //push state changing

                            //clear cart disabled, will be updated directly
                            this.dispatchEvent(new CustomEvent('api-cart-clear', { bubbles: true, composed: true, detail: { gid: gid } }))
                            this.dispatchEvent(new CustomEvent('api-checkout-done', { bubbles: true, composed: true, detail: { model: res_order } }))

                            this._setSuccess(true)
                            this._setSaving(false)

                            // moved to checkout on push state
                            // if (qreturn_url) 
                            // {
                            //     var qpar = Object.assign({}, {
                            //         orderid: res_order?.id,
                            //         access_token: res_order?.AccessToken,
                            //     })
                            //     this._gotoCheckout(qpar)
                            // }
                        }
                        else
                        {
                            this._onRequestResponse_DetailsAndSummary(r, rq)
                            var checkout = r['result']
                            if (api_action == 'place-order')
                            {
                                if (checkout?.PaymentIntentID) { checkout.PaymentIntentID = null } //ORDER sync to failed PaymentIntent -> create new for new TRY
                                if (checkout?.PaymentIntentToken) { checkout.PaymentIntentToken = null } //ORDER sync to failed PaymentIntent -> create new for new TRY
                                if (checkout?.OrderID) { checkout.OrderID = null } //ORDER sync to failed PaymentIntent -> create new for new TRY
                            }
                            this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone - to avoid update req
                            if (checkout) { this._modelApplyRequest(checkout, true) }

                            //set url to avoid recreation of PaymentIntent
                            this.setPaymentIntentQueryParams(this.model.PaymentIntentID, this.model.PaymentIntentToken)
                            if (api_action == 'place-order-update')
                            {
                                this._setSaving(false)
                                this._setSuccess(false)
                            }
                        }
                    }
                }
                else //'get' OR 'update'
                {
                    var checkout = r['result']
                    if (checkout?.result?.gotoCart)
                    {
                        this._gotoCart()
                    }
                    else if (checkout?.result?.order)
                    {
                        let order = checkout.result.order
                        this.reset()
                        this.set('model.result.order', order)
                    }
                    else
                    {
                        this._modelApplyRequest(checkout, true)
                        if (api_action == 'get')
                        {
                            //save for changes comparison
                            this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone

                            //set url to avoid recreation of PaymentIntent
                            this.setPaymentIntentQueryParams(this.model.PaymentIntentID, this.model.PaymentIntentToken)

                            this.dispatchEvent(new CustomEvent('api-checkout-loaded', { bubbles: true, composed: true, detail: { model: checkout } }))
                        }
                    }
                    this._setSuccess(true)
                }
            }
            else if (r['success'] === false)
            {
                this._onRequestResponse_DetailsAndSummary(r, rq)

                var checkout = r['result']
                if (checkout) { this._modelApplyRequest(checkout, true) }

                if (!(Array.isArray(r['details']) && r.details.length > 0))
                {
                    this._setSuccess(false)
                }
            }
            else if (r['error'])
            {
                this._setFailure(true)
            }
        }

        this._setLoading(false)
        if (!r || r['success'] === false || r['error']) 
        { 
            this._setSaving(false) 
        }
    }

    _suppressUrlHandler: boolean = false
    async _returnUrlHandler(visible, stripeReady, gid, orderid, access_token, return_url, payment_intent, payment_intent_client_secret, payment_event_id, redirect_status)
    {
        if (!visible || this._suppressUrlHandler) { return }
        var redirection = (orderid && payment_event_id && payment_intent_client_secret && return_url) //redirect_status?
        const t = redirection ? 100 : 250
        this._setLoadingDebounce(true)
        this._modelDebouncer = Debouncer.debounce(this._modelDebouncer, timeOut.after(t), async () => 
        {
            this._setLoadingDebounce(false)
            // console.log('_returnUrlHandler', gid, return_url, payment_intent, payment_intent_client_secret, orderid, payment_event_id, redirect_status, stripeReady, visible)

            if (gid && !return_url)
            {
                this.reset()
                this._first = true
                this.set('model.ItemGroupID', gid)
                this.set('model.PaymentIntentID', payment_intent)
                this.set('model.PaymentIntentToken', payment_intent_client_secret)
                // console.log('gid - _sendRequest get')
                this._sendRequest('get')
                return //EXIT!!!
            }
            else if (orderid && !return_url)
            {
                this.set('model.OrderID', orderid)
                this.set('model.AccessToken', access_token)
                // console.log('orderid - _sendRequest get')
                this._sendRequest('get')
                return //EXIT!!!
            }

            if (!orderid || !payment_event_id || !payment_intent_client_secret || !stripeReady || !return_url || !gid) { return }

            this._setSaving(true)
            this._setLoading(true)
            this._setFailure(false)
            this._setSuccess(true)
            
            // Retrieve the PaymentIntent - https://stripe.com/docs/payments/payment-methods#payment-notification
            // var error: object | null = null
            const { paymentIntent } = await this.getStripe().retrievePaymentIntent(payment_intent_client_secret)
            //redirect_status: "succeeded" | "failed"
            // switch(paymentIntent?.status)
            // {
            //     case 'succeeded':   //'Success! Payment received.'
            //     case 'processing':  //"Payment processing. We'll update you when payment is received."
            //         break
            //     case 'requires_payment_method': //'Payment failed. Please try another payment method.'
            //     default:            //'Something went wrong.'
            //         // Redirect your user back to your payment page to attempt collecting payment again
            //         error = { failed: 1 }
            //         break
            // }
            
            //send paymentIntent to server...
            this.model.ItemGroupID = gid
            this.model.OrderID = orderid
            this.model.AccessToken = access_token
            this.model.PaymentEventID = payment_event_id
            this.model.PaymentIntentID = payment_intent
            this.model.PaymentIntentToken = payment_intent_client_secret
            this.model.PaymentIntentResult = JSON.stringify(paymentIntent)
            this._modelOld = JSON.parse(JSON.stringify(this.model)) //clone - to avoid update req
            this._sendRequest('place-order-update') //, rq.paymentMethod)
        })
    }

    _onRequestResponse_DetailsAndSummary(r, rq)
    {
        if (r['summary'])
        {
            this.summary = r.summary //Type | Message | Key
            this.set('model.result.errorMessage', this.summary?.Message)

            if (this.summary?.Key == 'checkout_payment_fail')
            {
                this.set('model.result.cardError', this.summary?.Message)
            }

        }

        if (Array.isArray(r['details']) && r.details.length > 0)
        {
            //validation has been failed
            var dialog_suggestion = r.details.filter((i) => { return i.Key == 'IgnoreSuggestionValidation' })
            var dialog_invalid = r.details.filter((i) => { return i.Key == 'InvalidAddressDialog' })
            var isdialog_suggestion = dialog_suggestion && dialog_suggestion.length > 0
            var isdialog_invalid = dialog_invalid && dialog_invalid.length > 0
            if (isdialog_suggestion || isdialog_invalid)
            {
                let barr:any[] = []
                if (isdialog_suggestion)
                {
                    barr.push({
                        title: this.localize('checkout-address-suggestion-correct-btn'),
                        ontap: (e) => 
                        {
                            this.set('model.UseSuggestionValidation', true)
                            this._placeOrder(rq.paymentMethod)
                        }
                    })
                }
                
                barr.push({
                    // class: 'highlight',
                    title: this.localize('checkout-address-suggestion-wrong-btn'),
                    ontap: (e) => 
                    {
                        // do nothing
                    }
                })
                barr.push({
                    class: 'error',
                    title: this.localize('checkout-address-suggestion-useanyways-btn'),
                    ontap: (e) => 
                    {
                        this.set('model.IgnoreSuggestionValidation', true)
                        this._placeOrder(rq.paymentMethod)
                    }
                })
                
                let msg = ''
                if (isdialog_suggestion) { msg = dialog_suggestion[0].Message }
                if (isdialog_invalid) { msg = dialog_invalid[0].Message }
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        nowrap: true,
                        widthauto: true,
                        message: msg,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }

            var notvalid = r.details.filter((i) =>
            {
                var b = (i.Key == 'payment_error')
                if (b)
                {
                    this.set('model.result.cardError', i.Message)
                }
                var b2 = (i.Key == 'ShipmentMethod')
                if (b2)
                {
                    this.set('model.result.shipmentMethodError', i.Message)
                }
                return !b || !b2
            })
            this.set('model.result.notvalid', notvalid)
        }

        if (r?.success && !r?.details)
        {
            this.set('model.result.shipmentMethodError', '')
        }
    }

    _onRequestError(e, rq)
    {
        if (rq?.action == 'place-order-update')
        {
            //do nothing
        }
        else
        {
            this._setFailure(true)
        }
        this._setLoading(false)
        this._setSaving(false)
    }

    _onRequestResponseDialogs(summary, errorid, devErrorDetails)
    {
        if (!summary || !summary.Key) { return }

        switch(summary?.Key)
        {
            //do nothing - checkout-data should show dialog
            case 'checkout_validation_fail':
            case 'checkout_payment_fail':
                //do nothing
                break 

            default:
            // case "cart_desync":
            // case "empty_cart":
            // case 'has_disabled_product':
            // case 'bad_cart':
                var barr = [
                    {
                        title: this.localize('checkout-back2cart-btn'),
                        ontap: (e) => 
                        {
                            this._gotoCart()
                        }
                    } as DialogPopupButtonModel
                ]

                if (summary?.Key == "cart_desync")
                {
                    barr.unshift({
                        class: 'error',
                        title: this.localize('checkout-ok-btn'),
                        ontap: (e) => 
                        {
                            //do nothing (stay and continue)
                        }
                    } as DialogPopupButtonModel)
                }
    
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: summary.Message,
                        message: summary.Message,
                        buttons: barr,
                        errorid: errorid,
                        devErrorDetails: devErrorDetails,
                    }
                }))
                break
        }
    }

    _modelInitRequest(reset?)
    {
        // console.log('_modelInitRequest')
        var m = (this.model === undefined || reset) ? new CheckoutModel() : this.model
        m.Timezone = new Date().getTimezoneOffset()
        m.geoip = false
        
        //some issue with blocked email
        // if (this.userInfo?.isAuth)
        // {
        //     m.AccountEmail = (this.userInfo.profile?.email ? this.userInfo.profile.email : "")
        // }


        //restore data from local cache
        if (this.cache)
        {
            m.ccExpYearList = this.cache['ccExpYearList'] || null
            m.ccExpMonthList = this.cache['ccExpMonthList'] || null
            m.CountryList = this.cache['CountryList'] || null
            m.BillCountryList = this.cache['BillCountryList'] || null
            
            
            if (ALLOW_SAVEDATA_ADMIN && this.userInfo?.isAdmin && this.cache && Object.keys(this.cache).length > 0)
            {
                m.AccountPhone = this.cache['AccountPhone'] || ''
                m.AccountEmail = this.cache['AccountEmail'] || m.AccountEmail

                m.IsCompany = this.cache['IsCompany'] == undefined ? false : this.cache['IsCompany']
                m.IsResidential = this.cache['IsResidential'] == undefined ? false : this.cache['IsResidential']

                var ship = this.cache['ShipAddress'] || null
                if (ship)
                {
                    m.ShipFirstName = ship['ShipFirstName'] || ''
                    m.ShipLastName = ship['ShipLastName'] || ''
                    m.ShipCountry = ship['ShipCountry'] || ''
                    m.ShipState = ship['ShipState'] || ''
                    m.ShipCity = ship['ShipCity'] || ''
                    m.ShipZip = ship['ShipZip'] || ''
                    m.ShipAddress = ship['ShipAddress'] || ''
                    m.ShipAddress2 = ship['ShipAddress2'] || ''
                    m.ShipAddress3 = ship['ShipAddress3'] || ''
                    m.ShipCompany = ship['ShipCompany'] || ''
                    m.ShipTaxID = ship['ShipTaxID'] || ''
                    m.ShipEORI = ship['ShipEORI'] || ''
                }
                var bill = this.cache['BillAddress'] || null
                if (bill)
                {
                    m.BillFirstName = bill['BillFirstName'] || ''
                    m.BillLastName = bill['BillLastName'] || ''
                    m.BillCountry = bill['BillCountry'] || ''
                    m.BillState = bill['BillState'] || ''
                    m.BillCity = bill['BillCity'] || ''
                    m.BillZip = bill['BillZip'] || ''
                    m.BillAddress = bill['BillAddress'] || ''
                    m.BillAddress2 = bill['BillAddress2'] || ''
                    m.BillAddress3 = bill['BillAddress3'] || ''
                    m.BillCompany = bill['BillCompany'] || ''
                    m.BillTaxID = bill['BillTaxID'] || ''
                    m.BillEORI = bill['BillEORI'] || ''
                }
            }
        }

        return m
    }

    _modelSaveLocal(model)
    {
        if (ALLOW_SAVEDATA_ADMIN && this.userInfo?.isAdmin) 
        {
            this.set('cache.AccountPhone', model.AccountPhone)
            this.set('cache.AccountEmail', model.AccountEmail)

            this.set('cache.IsCompany', model.IsCompany)
            this.set('cache.IsResidential', model.IsResidential)

            this.set('cache.ShipAddress', {
                ShipFirstName: model.ShipFirstName,
                ShipLastName: model.ShipLastName,
                ShipCountry: model.ShipCountry,
                ShipState: model.ShipState,
                ShipCity: model.ShipCity,
                ShipZip: model.ShipZip,
                ShipAddress: model.ShipAddress,
                ShipAddress2: model.ShipAddress2,
                ShipAddress3: model.ShipAddress3,
                ShipCompany: model.ShipCompany,
                ShipTaxID: model.ShipTaxID,
                ShipEORI: model.ShipEORI,
            })
            this.set('cache.BillAddress', {
                BillFirstName: model.BillFirstName,
                BillLastName: model.BillLastName,
                BillCountry: model.BillCountry,
                BillState: model.BillState,
                BillCity: model.BillCity,
                BillZip: model.BillZip,
                BillAddress: model.BillAddress,
                BillAddress2: model.BillAddress2,
                BillAddress3: model.BillAddress3,
                BillCompany: model.BillCompany,
                BillTaxID: model.BillTaxID,
                BillEORI: model.BillEORI,
            })
        }
    }

    _modelApplyRequest(obj, isreq?)
    {
        var model = this._modelInitRequest()

        if (isreq)
        {
            model = Object.assign(model, obj)

            if (model.Cart)
            {
                // console.log(model.Cart)
                this._modelUpdating = true
                this.dispatchEvent(new CustomEvent('api-cart-group-set', { bubbles: true, composed: true, detail: { cart: model.Cart } }))
                this._modelUpdating = false
            }
        }
        else
        {
            model = Object.assign(model, obj)
        }

        //patch data here
        if (this._hidePaymentRequestMethod && Array.isArray(model.PaymentMethodList))
        {
            model.PaymentMethodList = model.PaymentMethodList.filter((i) => { return !(i.id == "PR") })
        }

        if (this.orgSubdomain == 'decathlon-fr') 
        {
            model.hasBillingAddress = false //force it
        }

        // if (model && model.Cart && model.Cart.stores && model.Cart.stores.length)
        // {
        //     //for images use first roster record
        //     model.Cart.stores[0].items[0].item.Player = undefined
        //     model.Cart.stores[0].items[0].item.SizesSelected = undefined
        //     model.Cart.stores[0].items[0].item.Roster = { ID: '1IEAUI5RCBZGUEHWAWZ4QVOTJ1B', Title: 'My Roster 1 (10)' }
        //     model.Cart.stores[0].items[0].item.RosterList = [{ ID: '1IEAUI5RCBZGUEHWAWZ4QVOTJ1B', Title: 'My Roster 1 (10)' }]
        // }


        //////////////////////////
        //store data to local cache
        if (this.cache && model.ccExpYearList) { this.set('cache.ccExpYearList', model.ccExpYearList) }
        if (this.cache && model.ccExpMonthList) { this.set('cache.ccExpMonthList', model.ccExpMonthList) }
        if (this.cache && model.CountryList) { this.set('cache.CountryList', model.CountryList) }
        if (this.cache && model.BillCountryList) { this.set('cache.BillCountryList', model.BillCountryList) }
        

        //update obj -> this.model
        this.set('model', Object.assign(new CheckoutModel(), model), false)
    }

    _modelBuildRequest(model)
    {
        var m = JSON.parse(JSON.stringify(model))

        //don't send list data back to server ...
        m.ccExpYearList = null
        m.ccExpMonthList = null
        m.CountryList = null
        m.BillCountryList = null
        m.ShipmentMethodList = null
        m.ValidationRules = null
        m.PaymentMethodList = null
        if (!Array.isArray(m.Totals) || m.Totals.length < 1)
        {
            //dont send cart back due it was failful
            m.Cart = null
        }

        if (m.IsCompany && m.ShipCountry?.id)
        {
            var cp = this._compute_countryProfile(m.ShipCountry.id)
            if (!cp.ShipTaxID) 
            {
                m.ShipTaxID = null
            }
            if (!cp.ShipEORI) 
            {
                m.ShipEORI = null 
            }
        }
        else
        {
            m.ShipCompany = null
            m.ShipTaxID = null
            m.ShipEORI = null
        }

        if (m.BillIsCompany && m.BillCountry?.id)
        {
            var cp = this._compute_countryProfile(m.BillCountry.id)
            if (!cp.ShipTaxID) 
            {
                m.BillTaxID = null
            }
            if (!cp.ShipEORI) 
            {
                m.BillEORI = null 
            }
        }
        else
        {
            m.BillCompany = null
            m.BillTaxID = null
            m.BillEORI = null
        }
        
        //don't send result to server - UI porposes only
        m.result = undefined

        return m
    }

    _modelChanged(modelP, cache, cart, userInfo, visible)
    {
        if (!cache || userInfo === undefined || visible !== true || this.saving || this._modelUpdating === true) 
        { 
            // if (this.visible && this.saving && this._dev) { console.warn('model-changed', modelP, ' but blocked due placing order' ) }
            return //EXIT !!!
        }
        var t = 2800
        const t_short = 250
        if (this.model && this._modelOld)
        {
            t = (JSON.stringify(this.model.ShipmentMethod) == JSON.stringify(this._modelOld.ShipmentMethod)) ? t : t_short
            t = (JSON.stringify(this.model.ShipCountry) == JSON.stringify(this._modelOld.ShipCountry)) ? t : t_short
            t = (JSON.stringify(this.model.PaymentMethod) == JSON.stringify(this._modelOld.PaymentMethod)) ? t : t_short
            t = (modelP?.path == "model.AllowAutoFillAddress") ? t_short : t
        }
        if (this._first)
        {
            t = 17
            this._modelApplyRequest(this._modelInitRequest())
        }
        // // if (this._placingOrder) { t = 17 }
        // this.parseQuery()


        var changed = this._modelHasChanges(this.model, this._modelOld)
        if (changed) 
        {
            this._modelOld = JSON.parse(JSON.stringify(this.model)) //save for changes comparison
            if (!this.model?.result?.order)
            {
                if (this.loading) { this._getResourceCancel() } //cancel recent request if any
                this._setLoadingDebounce(true)
                this._modelDebouncer = Debouncer.debounce(this._modelDebouncer, timeOut.after(t), () =>
                {
                    this._setLoadingDebounce(false)
                    if (this._first) 
                    { 
                        this._first = false 
                    }

                    this._sendRequest('update')
                })
            }
        }
    }

    _modelHasChanges(model, modelOld)
    {
        var changed = false
        var reqModel = JSON.parse(JSON.stringify(model)) //clone
        var oldModel = modelOld
        if (oldModel)
        {
            //fields not to send requests....
            reqModel.result = oldModel.result
            reqModel.PaymentIntentID = oldModel.PaymentIntentID
            reqModel.PaymentIntentToken = oldModel.PaymentIntentToken
            reqModel.PaymentIntentResult = oldModel.PaymentIntentResult
            reqModel.PaymentEventID = oldModel.PaymentEventID
            reqModel.Currency = oldModel.Currency
            


            reqModel.UseSuggestionValidation = oldModel.UseSuggestionValidation
            reqModel.IgnoreSuggestionValidation = oldModel.IgnoreSuggestionValidation
            reqModel.HasAutoFillAddress = oldModel.HasAutoFillAddress
            // reqModel.AllowAutoFillAddress = oldModel.AllowAutoFillAddress

            reqModel.Currency = oldModel.Currency
            reqModel.Cart = oldModel.Cart
            reqModel.Timezone = oldModel.Timezone
            // reqModel.AccountEmail = oldModel.AccountEmail //comment makes call - update
            // reqModel.AccountPhone = oldModel.AccountPhone  //comment makes call - update

            //TODO: need to be SYNCED with model_StripeShippingAddress
            // reqModel.ShipAddress = oldModel.ShipAddress //comment makes call - update
            // reqModel.ShipAddress2 = oldModel.ShipAddress2 //comment makes call - update
            // reqModel.ShipAddress3 = oldModel.ShipAddress3 //comment makes call - update
            // reqModel.ShipCity = oldModel.ShipCity //comment makes call - update
            // reqModel.ShipCountry = oldModel.ShipCountry //comment makes call - update
            // reqModel.ShipState = oldModel.ShipState //comment makes call - update
            // reqModel.ShipZip = oldModel.ShipZip //comment makes call - update
            // reqModel.ShipFirstName = oldModel.ShipFirstName //comment makes call - update
            // reqModel.ShipLastName = oldModel.ShipLastName //comment makes call - update
            // reqModel.ShipCompany = oldModel.ShipCompany
            // reqModel.ShipTaxID = oldModel.ShipTaxID
            // reqModel.ShipEORI = oldModel.ShipEORI

            reqModel.ItemGroupID = oldModel.ItemGroupID
            reqModel.isgroup = oldModel.isgroup
            reqModel.shipping = oldModel.shipping
            reqModel.groupdeadline = oldModel.groupdeadline


            reqModel.hasBillingAddress = oldModel.hasBillingAddress
            // reqModel.BillAddress = oldModel.BillAddress
            // reqModel.BillAddress2 = oldModel.BillAddress2
            // reqModel.BillAddress3 = oldModel.BillAddress3
            // reqModel.BillCity = oldModel.BillCity
            // reqModel.BillCountry = oldModel.BillCountry
            // reqModel.BillState = oldModel.BillState
            // reqModel.BillZip = oldModel.BillZip
            // reqModel.BillFirstName = oldModel.BillFirstName
            // reqModel.BillLastName = oldModel.BillLastName
            // reqModel.BillCompany = oldModel.BillCompany
            // reqModel.BillTaxID = oldModel.BillTaxID
            // reqModel.BillEORI = oldModel.BillEORI

            // reqModel.IsCompany = oldModel.IsCompany
            // reqModel.BillIsCompany = oldModel.BillIsCompany
            // reqModel.IsResidential = oldModel.IsResidential

            reqModel.ccName = oldModel.ccName
            reqModel.ccNumber = oldModel.ccNumber
            reqModel.ccCVV = oldModel.ccCVV
            reqModel.ccExpMonth = oldModel.ccExpMonth
            reqModel.ccExpYear = oldModel.ccExpYear

            reqModel.CountryList = oldModel.CountryList
            reqModel.BillCountryList = oldModel.BillCountryList
            // reqModel.ShipmentMethod = oldModel.ShipmentMethod //comment makes call - update
            reqModel.ShipmentMethodList = oldModel.ShipmentMethodList
            // reqModel.PaymentMethod = oldModel.PaymentMethod //comment makes call - update
            reqModel.PaymentMethodList = oldModel.PaymentMethodList
            //reqModel.PurchaseOrderToken = oldModel.PurchaseOrderToken //comment makes call - update
            reqModel.PurchaseOrderDescription = oldModel.PurchaseOrderDescription
            

            reqModel.ccExpYearList = oldModel.ccExpYearList
            reqModel.ccExpMonthList = oldModel.ccExpMonthList
            reqModel.Totals = oldModel.Totals
            reqModel.State = oldModel.State
            reqModel.OrderID = oldModel.OrderID
            reqModel.PostData = oldModel.PostData
            reqModel.ValidationRules = oldModel.ValidationRules
            
            reqModel.geoip = oldModel.geoip
            reqModel.Sandbox = oldModel.Sandbox
            reqModel.DeliveryDetailsOnly = oldModel.DeliveryDetailsOnly
            reqModel.DeliveryDetails = oldModel.DeliveryDetails

            changed = (JSON.stringify(reqModel) !== JSON.stringify(oldModel))
            // if (changed) { console.log('checkout - changed', changed, reqModel, oldModel) }
        }
        else
        {
            changed = true
            // console.log('checkout - changed', changed, reqModel, oldModel)
        }
        return changed
    }

    _getPayData():PayDataEntity
    {
        var complete = true
        const country = (this.model.hasBillingAddress ? this.model.BillCountry : this.model.ShipCountry) as any
        const displayItems: any = []
        const shippingOptions: any = []

        //amount | label | pending
        var cart = this.cartCheckout
        if (Array.isArray(cart))
        {
            for (var i in cart)
            {
                var entry = cart[i]
                // var amount = (entry && entry.price ? entry.price.FinalAmount : 0)
                //might be we have to do the same way as checkout form does...
                var amount = (entry && entry.price ? entry.price.SalePriceFinal * entry.quantity : 0)

                displayItems.push({
                    amount: amount,
                    label: this._getEntryTitle(entry),
                })
            }
        }

        //disable initial shipping options to avoid desync between form and paynow
        if (Array.isArray(this.model.ShipmentMethodList) && (!this.model.isgroup || this.model.BillState || this.model.BillZip))
        {
            const lst = this.model.ShipmentMethodList
            for (var i in lst)
            {
                shippingOptions.push({
                    id: lst[i].id,
                    label: lst[i] && lst[i].title? lst[i].title : '',
                    detail: lst[i].desc,
                    amount: lst[i].amount,
                })
            }
        }


        var total: any = null
        var shipment: any = null
        if (Array.isArray(this.model.Totals))
        {
            total = this.model.Totals[this.model.Totals.length - 1]
            for (var i in this.model.Totals)
            {
                var ti = this.model.Totals[i]
                // console.log(ti.id)
                //cf.totals.woshipment_total | cf.totals.shipment | cf.totals.total
                if (ti.id == 'cf.totals.total') //if shipment requesting
                {
                    total = ti
                }
                else if (ti.id != 'cf.totals.woshipment_total' && ti.id != 'cf.totals.subtotal')
                {
                    const cti = {
                        label: ti && ti.title ? ti.title : '',
                        amount: ti.amount,
                    }
                    displayItems.push(cti)
                }
            }

            // if (!total || !shipment) { complete = false } //no need  if shippment requesting
            if (!total) 
            {
                complete = false
            }
            else
            {
                total = {
                    label: total && total.title ? total.title : '',
                    amount: total.amount,
                }
            }
        }
        else
        {
            complete = false
        }

        // if (!this.model.AccountEmail)
        // {
        //     //email is required - if shippment requesting
        //     complete = false
        // }

        var sellerName = this.localize('app-title')
        // if (this.model?.SellerName) { sellerName = this.model.SellerName }
        

        return {
            complete: complete,
            sellerName: sellerName,
            payintID: this.model?.PaymentIntentID,
            clientSecret: this.model?.PaymentIntentToken,
            hash: JSON.stringify(this.model.Totals),
            lang: this.language.substr(0, 2),
            country: (country ? country.id : "us"),
            currency: this.model.Currency.toLowerCase(),
            total: total,
            displayItems: displayItems,
            shippingOptions: shippingOptions,
        } as PayDataEntity
    }

    _getEntryTitle(entry)
    {
        var t = entry && entry.item && entry.item.Product && entry.item.Product.Title ? entry.item.Product.Title : ''
        var qty = parseInt(entry.quantity, 10)
        if (entry.item.Roster && entry.item.Roster.title)
        {
            t += ' - ' + entry.item.Roster.title
        }
        else
        {
            t += ' ' + StringUtil.formatSizes(entry.item.SizesSelected)
        }
        if (qty > 1)
        {
            t += '  x ' + qty
        }
        return t
    }

    _computeCartCheckout(itemGrupID, cart, cartP)
    {
        if (Array.isArray(cart) && cart.length > 0)
        {
            var itemgroup = cart.find((e, i, a) =>
            {
                if (e.gid == itemGrupID) { return true }
                return false
            })
            return (itemgroup ? itemgroup.items : [])
        }
        return []
    }

    _compute_countryProfile(shipCountryID)
    {
        return CheckoutData._compute_countryProfile(shipCountryID)
    }
    
    static _compute_countryProfile(shipCountryID)
    {
        var pr = CheckoutData._countriesProfile(shipCountryID)
        if (pr) 
        { 
            pr.ID = shipCountryID

            if (pr.SuburbOnly || pr.SuburbOnlyWithInput)
            {
                pr.ShipZip = "checkout-suburb-only"
            }
            else if (pr.Suburb)
            {
                pr.ShipZip = "checkout-suburb"
            }

            // ZipNonMondatory
            // ShipAddress2Mondatory
            // StateIsMondatory
        }
        return pr
    }

    _loadingChanged(v)
    {
        if (v === true)
        {
            this.dispatchEvent(new CustomEvent('api-checkout-loading', { bubbles: true, composed: true, detail: {} }))
        }
    }

    _savingChanged(v)
    {
        if (v === true)
        {
            this.dispatchEvent(new CustomEvent('api-checkout-placeorder', { bubbles: true, composed: true, detail: {} }))
        }
    }

    static _countriesProfile(cn2)
    {
        //Residential Address: email mondatory 
        //Non-Residential Address: company mondatory 
        //Residential Address: email mondatory 
        //Non-Residential Address: company mondatory 
        // var stripe_contries = {
        //     "AE": true, "AT": true, "AU": true, "BE": true, "BR": true, "CA": true, "CH": true, "CR": true, "CZ": true, "DE": true, "DK": true, "EE": true, "ES": true, "FI": true, "FR": true, "GB": true, "GR": true, 
        //     "HK": true, "IE": true, "IN": true, "IT": true, "JP": true, "LT": true, "LU": true, "LV": true, "MX": true, "MY": true, "NL": true, "NO": true, "NZ": true, "PE": true, "PH": true, "PL": true, "PT": true, 
        //     "RO": true, "SE": true, "SG": true, "SI": true, "SK": true, "US": true,
        // }
        var DEFAULT = { 
            ShipZip: "checkout-postalcode", 
            ShipState: "checkout-province", 
            ShipTaxID: true, 
            ShipEORI: false, 
            StateIsMondatory: false, 
            Suburb: false, 
            SuburbOnly: false, 
            SuburbOnlyWithInput: false, 
            ShipAddress2Mondatory: false, 
            ZipNonMondatory: false,
        }
        var countries = {
            "US": Object.assign({}, DEFAULT, { ShipZip: "checkout-zipcode", ShipState: "checkout-state", StateIsMondatory: true }), //"United States",
            "CA": Object.assign({}, DEFAULT, { ShipState: "checkout-state" }), //"Canada",
            "MX": Object.assign({}, DEFAULT, { ShipState: "checkout-state" }), //"Mexico",
            "AU": Object.assign({}, DEFAULT, { ShipState: "checkout-state" }), //"Australia",
            "TH": Object.assign({}, DEFAULT, { }), //"Thailand",

            "AT": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Austria",
            "AM": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Armenia",
            "AZ": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Azerbaijan",
            "BE": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Belgium",
            "BG": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Bulgaria",
            "HR": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Croatia",
            "CY": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Cyprus",
            "CZ": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Czech Republic",
            "DK": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Denmark",
            "EE": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Estonia",
            "FI": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Finland",
            "FR": Object.assign({}, DEFAULT, { ShipEORI: true }), //"France",
            "DE": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Germany", //DHL-provice
            "GR": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Greece",
            "HU": Object.assign({}, DEFAULT, { ShipEORI: true, Suburb: true }), //"Hungary",
            "IE": Object.assign({}, DEFAULT, { ShipEORI: true, SuburbOnly: true, ZipNonMondatory: true, ShipAddress2Mondatory: true }), //"Ireland",
            "IT": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Italy",
            "LV": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Latvia",
            "LT": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Lithuania",
            "LU": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Luxembourg",
            "MT": Object.assign({}, DEFAULT, { ShipEORI: true, SuburbOnly: true, ZipNonMondatory: true }), //"Malta",
            "NL": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Netherlands",
            "PL": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Poland",
            "PT": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Portugal",
            "RO": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Romania",
            "SK": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Slovakia",
            "SI": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Slovenia",
            "ES": Object.assign({}, DEFAULT, { ShipEORI: true, ShipAddress2Mondatory: true }), //"Spain", //DHL-provice
            "SE": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Sweden",
            "AL": Object.assign({}, DEFAULT, { ShipEORI: true, SuburbOnly: true, ZipNonMondatory: true }), //"Albania",
            "BY": Object.assign({}, DEFAULT, { ShipEORI: true, SuburbOnlyWithInput: true }), //"Belarus",
            "BA": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Bosnia and Herzegovina",
            "IS": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Iceland",
            "XK": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Kosovo",
            "LI": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Liechtenstein",
            "MD": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Moldova",
            "MC": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Monaco",
            "ME": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Montenegro",
            "MK": Object.assign({}, DEFAULT, { ShipEORI: true }), //"North Macedonia",
            "NO": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Norway",
            "RU": Object.assign({}, DEFAULT, { ShipEORI: true, StateIsMondatory: true }), //"Russia",
            "SM": Object.assign({}, DEFAULT, { ShipEORI: true }), //"San Marino",
            "RS": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Serbia",
            "CH": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Switzerland",
            "UA": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Ukraine",
            "GE": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Georgia",
            "GB": Object.assign({}, DEFAULT, { ShipEORI: true }), //"United Kingdom",
            "VA": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Vatican City",
            "AD": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Andorra",
            "KZ": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Kazakhstan",
            "TR": Object.assign({}, DEFAULT, { ShipEORI: true }), //"Turkey"
        }

        return countries[cn2] || countries["US"] //DEFAULT
    }
}

class PayDataEntity 
{
    complete: boolean
    sellerName: string
    payintID: string
    clientSecret: string
    hash: string
    lang: string
    country: string
    currency: string
    total: { label: string, amount: number } //| null
    displayItems: []
    shippingOptions: []
}