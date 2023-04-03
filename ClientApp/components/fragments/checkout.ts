import '@polymer/iron-pages/iron-pages.js'
import '@polymer/iron-form/iron-form.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-collapse/iron-collapse.js'
import '@polymer/app-route/app-route.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import ResizeObserver from 'resize-observer-polyfill'
import { html } from '@polymer/polymer/polymer-element'
import { scroll } from '@polymer/app-layout/helpers/helpers'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { getComputedStyleValue } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { CheckoutData } from '../bll/checkout-data'
import '../bll/store-data'
import '../bll/checkout-data'
import '../bll/payment-gateway-2c2p'
import '../ui/ui-loader'
import '../ui/ui-validation-summary'
import '../ui/ui-select'
import '../ui/ui-order-item'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../ui/ui-date-time'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/checkbox-styles'
import '../shared-styles/tooltip-styles'
import view from './checkout.ts.html'
import style from './checkout.ts.css'
import { DECATHLON_FR } from '../teamatical-app/teamatical-app'
import { PayPalButtonsComponentOptions, PayPalHostedFieldsComponentOptions } from "@paypal/paypal-js"

const Teamatical: TeamaticalGlobals = window['Teamatical']
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const paymethod_PAYPAL = "PayPal"           // - payment gateway
const paymethod_2C2P = "2C2P"               // - payment gateway
const paymethod_STRIPE = "SP"               // - payment gateway
const paymethod_PAYMENTREQEST = "PR"        // - [obsolate]
const paymethod_PURCHASEORDER = "PO"        // - Purchase Order [credit]
const paymethod_TEST = "testPayment"        // - admin only [free]
const paymethod_FREE = "chargeFreePayment"  // - admin only [free]


@FragmentDynamic
export class Checkout extends FragmentBase
{
    static get is() { return 'teamatical-checkout' }
    
    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-checkbox-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            model: { type: Object, },
            postData: { type: String },
            apiGateway: { type: String },
            apiPubkey: { type: String },
            orgCountry: { type: String },
            orgSubdomain: { type: String },
            orgConnectedId: { type: String },
            route: { type: Object },
            routeData: { type: Object },
            routeActive: { type: Object },
            queryParams: { type: Object },
            websiteUrl: { type: String },
            userInfo: { type: Object, notify: true },
            summary: { type: Object },
            stripeLoaded: { type: Boolean, }, //stripe-loaded
            stripeReady: { type: Boolean },
            paypalReady: { type: Boolean },
            categories: { type: Array },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },


            visible: { type: Boolean, value: false, observer: '_visibleChanged' }, //If true, checkout is currently visible on the screen.
            loading: { type: Boolean, value: false, notify: true },
            loadingDebounce: { type: Boolean, value: false, notify: true },
            failure: { type: Boolean, value: false },
            offline: { type: Boolean, observer: '_offlineChanged' },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true, observer: '_savingChanged' },
            success: { type: Boolean },

            cart: { type: Array }, //An array containing the items in the cart.
            state: { type: String, value: 'init' }, //The state of the form. Valid values are: `init`, `success` and `error`.

            stripePaymentElement: { type: Boolean, notify: true },
            stripePaymentElementDelayed: { type: Boolean, notify: true, reflectToAttribute: true },
            _applePay: { type: Boolean, notify: true },
            _googlePay: { type: Boolean, notify: true },
            _showPayBtn: { type: Boolean, notify: true },
            _poPayM_delayed: { type: Boolean, notify: true },
            _poPayM_animated: { type: Boolean, notify: true },
            _ccPayM_delayed: { type: Boolean, notify: true, value: true },
            _ccPayM_animated: { type: Boolean, notify: true },
            _prPayM_delayed: { type: Boolean, notify: true, value: false },
            _prPayM_animated: { type: Boolean, notify: true },
            _prPayM_allowed: { type: Boolean, notify: true, value: false },
            _payAmount: { type: Number, computed: '_computePayAmount(model.Totals)' },
            _prPayM_ShowSection: { type: Boolean, computed: '_compute_prPayM_ShowSection(_prPayM_allowed, visible, state, failure, offline, saving, _ccPayM_delayed)' },
            disabledPayBtn: { type: Boolean, computed: '_compute_disabledPayBtn(loading, _prPayM_allowed, visible, state, failure, offline, saving, _ccPayM_delayed)' },
            isPlaceOrderForcedByAdmin: { type: Boolean, computed: '_compute_isPlaceOrderForcedByAdmin(userInfo.isAdmin, model.ItemGroupID, cart, cart.*)' },
            payNowTitle: { type: String },
            payNowBtn: { type: String, },

            _hasItems: { type: Boolean, computed: '_computeHasItem(cart.length)' },
            _emptyCart: { type: Boolean, computed: '_compute_emptyCart(cart.length, loading, model.Totals)' },
            _hasShipment: { type: Boolean, computed: '_computeHasShipment(model.ShipmentMethodList)' },
            modelTotalsVisible: { type: Array, computed: '_computeTotalsVisible(model.Totals)' },
            cartCheckout: { type: Array, computed: '_computeCartCheckout(model.ItemGroupID, cart, cart.*)' },

            focusFirstElements: { type: Object, value: () => { return { Bill: 'BillFirstName' } } },

            countryProfile: { type: Object },
            countryBillProfile: { type: Object },
            countryOrderProfile: { type: Object },
            countryOrderBillProfile: { type: Object },

            hidden_ShipTaxID: { type: Boolean, computed: '_compute_hidden_ShipTaxID(countryProfile.ShipTaxID)' },
            hidden_ShipEORI: { type: Boolean, computed: '_compute_hidden_ShipEORI(countryProfile.ShipEORI)' },

            hidden_BillAddress: { type: Boolean, computed: '_compute_hidden_BillAddress(model.hasBillingAddress)' },
            hidden_BillTaxID: { type: Boolean, computed: '_compute_hidden_BillTaxID(countryBillProfile.ShipTaxID)' }, 
            hidden_BillEORI: { type: Boolean, computed: '_compute_hidden_BillEORI(countryBillProfile.ShipEORI)' }, 
            hidden_BillAddressAnim: { type: Boolean, },

            disabled_Input: { type: Boolean, computed: '_compute_disabled_Input(saving)' },
            modelIsCompany: { type: Boolean },
            disabled_Input_ShipCompany: { type: Boolean, computed: '_compute_disabled_Input_ShipCompany(modelIsCompany)' },
            disabled_Input_ShipTaxID: { type: Boolean, computed: '_compute_disabled_Input_ShipTaxID(modelIsCompany)' },
            disabled_Input_ShipEORI: { type: Boolean, computed: '_compute_disabled_Input_ShipEORI(modelIsCompany)' },
            modelBillIsCompany: { type: Boolean },
            modelBillIsCompanyAnim: { type: Boolean },
            disabled_Input_BillCompany: { type: Boolean, computed: '_compute_disabled_Input_BillCompany(modelBillIsCompany)' },
            disabled_Input_BillTaxID: { type: Boolean, computed: '_compute_disabled_Input_BillTaxID(modelBillIsCompany)' },
            disabled_Input_BillEORI: { type: Boolean, computed: '_compute_disabled_Input_BillEORI(modelBillIsCompany)' },

            checkoutSuccessBackUrl: { type: String, computed: '_compute_checkoutSuccessBackUrl(model.result.order)' },
            shipAddressTitle: { type: String, computed: '_compute_shipAddressTitle(model.isgroup, orgSubdomain)' },
            hideHasBillingAddress: { type: String, computed: '_compute_hideHasBillingAddress(orgSubdomain)' },
            hideAllowAutoFillAddress: { type: String, computed: '_compute_hideAllowAutoFillAddress(model.HasAutoFillAddress)' },
            
            showSwitchCheckoutCode: { type: Boolean, computed: '_compute_showSwitchCheckoutCode(model.PaymentMethodList, userInfo.isAdmin)' },
            showPaymentMethodList: { type: Boolean, computed: '_compute_showPaymentMethodList(model.PaymentMethodList, userInfo.isAdmin)' },
            isPaymentListForcedByAdmin: { type: Boolean, computed: '_compute_isPaymentListForcedByAdmin(model.PaymentMethodList, userInfo.isAdmin)' },

            dis_placeorder_btn: { type: Boolean, computed: '_compute_dis_placeorder_btn(loading, loadingDebounce)' },
        }
    }

    static get observers()
    {
        return [
            '_updateState(routeActive, routeData)',
            '_updateStateSuccess(visible, success)',
            '_modelChanged(model.*)',
            '_cartChanged(cart.length)',
            '_modelReadOrder(model.result.order)',
            '_modelServerErrors(model.result.notvalid)',
            '_modelScrollToError(model.result.notvalid.*, model.result.cardError, model.result.shipmentMethodError)',
            '_modelServerValidationRules(model.ValidationRules)',
            '_payMethod_Observer(model.PaymentMethod)',
            '_ccFormWrapperObserver(visible, state, failure, offline, saving, _ccPayM_delayed, model.PaymentMethod.id, hidden_BillAddressAnim, modelBillIsCompanyAnim)',
            '_paypalCCLoadedChanged(visible, apiPubkey, paypalReady, _ccPayM_delayed, model.PaymentMethod.id, model.PaymentIntentToken)',
            '_stripeCCLoadedChanged(visible, apiPubkey, stripeReady, _ccPayM_delayed, model.PaymentIntentToken)',
            '_stripePRLoadedChanged(visible, apiPubkey, stripeReady, _prPayM_delayed, model.Totals)',
            '_stripePRwSChanged(visible, apiPubkey, stripeReady, model.Totals, model.AccountEmail)',
            '_stripePaymentElementDelayed(stripePaymentElement)',
            '_animationHasBillAddressChanged(model.hasBillingAddress, hidden_BillAddress)',
            '_delayedModelIsCompany(model.IsCompany)',
            '_delayedModelBillIsCompany(model.BillIsCompany)',
            '_animationBillCompanyChanged(model.BillIsCompany)',
        ]
    }

    _log() { 
        console.log(...arguments) 
    }

    //#region vars for ts
    _checkVisibilityDebouncer: any
    _debouncerAnonymousDialog: any
    __ccform: HTMLElement
    _ccform_debouncer: any
    _validState: any
    _validationRules_hash: any
    _lastPayEvent: any
    _applePay: boolean
    _googlePay: boolean
    _poPayM_delayed: any
    _poPayM_animated: any
    _ccPayM_delayed: any
    _ccPayM_animated: any
    _prPayM_delayed: any
    _prPayM_animated: any
    _prPayM_allowed: any
    __ccPayM_debouncer: any
    __ccPayM2_debouncer: any
    __prPayM2_debouncer: any
    __prPayM_debouncer: any
    __poPayM2_debouncer: any
    __poPayM_debouncer: any
    _paybutton_debouncer: any
    __payButtonWrapper: any
    _debouncer_cardFormBuild: Debouncer
    _hasItems: any
    model: any
    elements: any
    apiPubkey: any
    route: any
    routeData: any
    routeActive: any
    websiteUrl: any
    userInfo: any
    summary: any
    stripeLoaded: any
    stripeReady: any
    categories: any
    visible: any
    loading: any
    failure: any
    offline: any
    saving: any
    success: any
    cart: any
    payment: any
    state: any
    focusFirstElements: any
    paymentRequestButton: any
    payNowButtonWrapper: any
    _showPayBtn: boolean
    queryParams: any
    payNowBtn: string
    payNowTitle: string
    _ccFormWrapperResizeObserver: any
    stripePaymentElement: boolean
    stripePaymentElementDelayed: boolean
    _shiftKey: boolean
    _shiftKeyOnly: boolean

    //#endregion


    get orderItems() { return this.$['order-items'] }
    get stripe() { return this.checkoutData.getStripe() }
    get checkoutData() { return this.$.checkoutData as CheckoutData}
    get checkoutForm() { return this.$.checkoutForm }
    get formElements() { return this.$ }
    get payNowButtonPlaceholder() { return this.shadowRoot ? this.shadowRoot.querySelector('#pay-request-button') : null }
    get beforeCCFormElement() 
    { 
        //TODO: find before enabled input
        return this.$.PaymentMethod as HTMLElement 
    }
    get nextCCFormElement() 
    {
        //TODO: find next enabled input
        return this.$.submitBox as HTMLElement 
    }
    get ccFormPayPal()
    {
        var ccSec = this.shadowRoot ? this.shadowRoot.querySelector('#pay-cc-section') : null
        return ccSec ? ccSec.querySelector('#cc-form-element-paypal') as HTMLElement : null
    }
    get ccForm()
    {
        var ccSec = this.shadowRoot ? this.shadowRoot.querySelector('#pay-cc-section') : null
        return ccSec ? ccSec.querySelector('#cc-form-element') as HTMLElement : null
    }
    get ccFormWrapper()
    {
        if (!this.__ccform)
        {
            //stripe evil hack
            var div = document.createElement('div')
            div.id = 'pay-cc-section-wrapper'
            var container = document.body
            container.appendChild(div)
            // container.insertBefore(div, document.body.childNodes[0]) //make it before checkout form to get focus on blur
            this.__ccform = div as HTMLElement
            this._ccFormWrapperInterceptor()

            this._ccFormWrapperResizeObserver = new ResizeObserver(entries => 
            {
                this._ccFormWrapperInterceptor()
            })
            this._ccFormWrapperResizeObserver.observe(this.__ccform)
        }
        return this.__ccform
    }

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.payNowBtn = this.localize('checkout-paynow-btn-initial')
        

        //events
        window.addEventListener('resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
        document.addEventListener("keydown", (e) => this._onKeydown(e))

        this.set('_showPayBtn', false)
        this.async(() =>
        {
            this.set('_showPayBtn', true)
        },300)
        
        this.orderItems.addEventListener('dom-change', (e) =>
        {
            this.async(() =>
            {
                this._ccFormWrapperInterceptor()
            })
        })
    }

    disconnectedCallback()
    {
        if (this._ccFormWrapperResizeObserver && this.__ccform) { this._ccFormWrapperResizeObserver.unobserve(this.__ccform) }
        super.disconnectedCallback()
    }


    ready()
    {
        super.ready()

        this.async(() => { 
            this._ccFormWrapperInterceptor() 
        }, 17)
    }

    //#region Order methods

    showCancelledStatus(status)
    {
        return status == 'cancelled' || status == 'cancel requested'
    }

    //#endregion    

    formatTZ(tz)
    {
        if (tz === undefined) { return '' }

        var pad = (s, size) =>
        {
            while (s.length < (size || 2)) { s = "0" + s }
            return s
        }
        var h = Math.floor(tz / 60)
        var m = Math.abs(tz % 60)
        var v = h + ':' + pad(m.toString(), 2)
        // console.log(tz, v)
        return v
    }

    switchCheckoutCodeToggled(e)
    {
        // console.log(e.target.checked, e)
        var r = this.model.PaymentMethodList.filter(i => 
        {
            return i.id == paymethod_PURCHASEORDER
        })
    
        if (e.target.checked && r?.length > 0)
        {
            this.set('model.PaymentMethod', r[0])
        }
        else if (!e.target.checked || r?.length < 1)
        {
            r = this.model.PaymentMethodList.filter(i => 
            {
                return i.id != paymethod_PURCHASEORDER
            })
            if (r?.length > 0)
            {
                this.set('model.PaymentMethod', r[0])
            }
        }
    }

    _isNoModel(model, failure, offline)
    {
        return failure === true
        //return !model || failure === true
    }

    _isNotConn(item, failure, offline, loading)
    {
        return true
        // return (item !== undefined || !loading || offline === true || failure === true)
    }

    _offlineChanged(offline, old)
    {
        if (!offline && old !== undefined)
        {
            this._tryRefresh()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event

        if (!this.visible) { return }

        this._shiftKey = e.shiftKey
        this._shiftKeyOnly = e.shiftKey && !e.altKey && !e.ctrlKey 
        // var epath = e.path || e.composedPath()
        // for (var i in epath)
        // {
        //     if (epath[i].nodeName == 'PAPER-INPUT')
        //     {
        //         if (epath[i].invalid === true) { epath[i].invalid = false }
        //         break
        //     }
        // }

        if (this._debouncerAnonymousDialog)
        {
            // this._debouncerAnonymousDialog = Debouncer.debounce(this._debouncerAnonymousDialog, timeOut.after(1600), () => this._anonymousDialogHandler())
            this._debouncerAnonymousDialog.cancel()
            this._debouncerAnonymousDialog = null
        }

        if (this.state == 'init' && !this.loading && keyboardEventMatchesKeys(e, 'enter'))
        {
            this._submit(e)
        }
    }

    _onChange(e)
    {
        // var epath = e.path || e.composedPath()
        // for (var i in epath)
        // {
        //     if (epath[i].nodeName == 'UI-SELECT' || epath[i].nodeName == 'PAPER-INPUT')
        //     {
        //         if (epath[i].invalid === true) { epath[i].invalid = false }
        //         break
        //     }
        // }
    }

    _modelReadOrder(order)
    {
        if (!order) { return }

        this.state = 'success'
    }

    _pushState(state)
    {
        // console.log('_pushState: ', state)
        this._validState = state
        this.set('route.path', state)
        
        if (this.model?.result?.order?.id) 
        {
            var order = this.model.result.order
            var qpars = { orderid: order.id }
            if (order.AccessToken) { qpars['access_token'] = order.AccessToken}
            this.set('queryParams', qpars)
            var url = StringUtil.urlquery(document.location.pathname, qpars)
            window.history.replaceState(null, 'Order Placed', url)
        }

        scroll({ top: 0, behavior: 'silent' })
    }

    // Checks that the `:state` subroute is correct. That is, the state has been pushed
    // after receiving response from the server. e.g. Users can only go to `/checkout/success`
    // if the server responsed with a success message.
    _updateState(active, routeData)
    {
        if (active && routeData)
        {
            let state = routeData.state
            if (this._validState === state)
            {
                this.state = state
                this._validState = ''
                return
            }
        }
        // this.state = 'init'
    }

    _updateStateSuccess(visible, success)
    {
        // console.log(visible)
        // console.log(success)
        // if (visible === true && success === false)
        // {
        //     this.state = 'error'
        // }
    }

    _reset()
    {
        if (!this.checkoutForm) { return }

        this._modelClearServerErrors()

        if (this.payment?.clear) { this.payment.clear() } //	Clears the value(s) of the Stripe Element

        if (this.paymentRequestButton)
        {
            this.paymentRequestButton.unmount()
            this.paymentRequestButton.destroy()
            this.paymentRequestButton = null
        }
    }

    // Validates the form's inputs and adds the `aria-invalid` attribute to the inputs
    // that don't match the pattern specified in the markup.
    _validateForm(test?)
    {
        // if (this.model && this.model.PaymentMethod && this.model.PaymentMethod.id == "testPayment")
        // {
        //     return true //TODO: FOR TEST PURPOSES ONLY -> SERVER-SIDE VALIDATION BASED
        // }

        let form = this.checkoutForm
        let firstInvalid = false
        var piList = form.querySelectorAll('paper-input, ui-select, paper-checkbox')

        for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
        {
            if (pi.disabled || pi.hidden) { continue }

            // console.log(pi.id)

            if (pi.validate())
            {
                pi.invalid = false
                //pi.removeAttribute('aria-invalid')
            }
            else
            {
                if (!firstInvalid)
                {
                    firstInvalid = true

                    // console.log(pi.id)
                    // announce error message
                    if (pi.errorMessage)
                    {
                        //var ns = pi.nextElementSibling
                        // console.log(pi.errorMessage)
                        var em = pi.errorMessage
                        this.dispatchEvent(new CustomEvent('announce', {
                            bubbles: true, composed: true,
                            detail: pi.errorMessage
                        }))
                    }

                    this._focusAndScroll(pi)
                }
                pi.setAttribute('aria-invalid', 'true')
            }
        }

        if (this.model?.PaymentMethod?.id == paymethod_STRIPE
            && (!this._lastPayEvent || this._lastPayEvent.complete !== true || this._lastPayEvent.error_))
        {
            // console.log(this._lastPayEvent)
            // {
            //     "elementType": "payment",
            //     "collapsed": false,
            //     "empty": false,
            //     "complete": false,
            //     "value": {
            //         "type": "us_bank_account"
            //     }
            // }
            let pi: any = null
            if (this._lastPayEvent?.empty)
            {
                pi = this.ccForm
                this.set('model.result.cardError', this.localize('checkout-payment-empty'))
            }
            else if (!this._lastPayEvent?.error)
            {
                pi = this.ccForm
                this.set('model.result.cardError', this.localize('checkout-payment-incomplete'))
            }

            if (!firstInvalid && pi)
            {
                firstInvalid = true
                this._focusAndScroll(pi)
            }
        }

        if (!firstInvalid && this.model && this.model.PaymentMethod && this.model.PaymentMethod.id == paymethod_PAYMENTREQEST)
        {
            firstInvalid = true
            if (this.checkoutData.paymentRequest) 
            {
                this.checkoutData.paymentRequest.show()
            }
        }

        return !firstInvalid
    }

    _submit(e)
    {
        this._modelClearServerErrors()
        
        if (!this._validateForm()) { return }

        this.checkoutData.placeOrder(this.elements)
    }

    _modelChanged(m)
    {
        // console.log(m)
        if (m && m.path && m.path.indexOf('model.') >= 0)
        {
            var name = m.path.replace('model.', '')
            // console.log(name, this.formElements[name])
            var fen: any = this.formElements[name]
            if (fen)
            {
                fen.invalid = false
            }

            if ((name == 'PurchaseOrderToken' || name == 'PaymentMethod') && this.cart)
            {
                for (var storeinx in this.cart)
                {
                    for (var iteminx in this.cart[storeinx].items)
                    {
                        this.set(`cart.${storeinx}.items.${iteminx}.checkoutcodeinvalid`, false) // reset error flag
                    }

                }

            }
        }
    }

    _modelClearServerErrors()
    {
        //clean errors
        var piList = this.checkoutForm.querySelectorAll('paper-input, ui-select, paper-checkbox, teamatical-ui-validation-summary')
        for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
        {
            pi.invalid = false
        }
    }

    _modelScrollToError(notvalidP, cardError, shipmentMethodError)
    {
        // console.log(notvalidP, cardError, shipmentMethodError)
        var pi:any = null
        if (notvalidP && notvalidP.path == 'model.result.notvalid')
        {
            var notvalid = notvalidP.value
            if (notvalid?.length > 0)
            {
                pi = this.root ? this.root.querySelector("[id='" + notvalid[0].Key + "']") : null
            }
        }
        else if (cardError)
        {
            pi = this.$['cc-form-errors']
        }
        else if (shipmentMethodError)
        {
            pi = this.$.shipmentMethodError
        }

        if (pi) { this._focusAndScroll(pi) }
    }

    _modelServerErrors(notvalid)
    {
        if (!Array.isArray(notvalid) || notvalid.length < 1) { return }

        //rollout server errors
        for (var i in notvalid)
        {
            // console.log(notvalid[i])
            const name = notvalid[i].Key
            var fen: any = this.formElements[name]
            if (fen)
            {
                // console.log(name + ': ' + notvalid[i].Message)
                fen.errorMessage = notvalid[i].Message
                fen.invalid = true
            }
            else
            {
                console.warn(notvalid[i])
            }
        }
    }

    _modelServerValidationRules(validationRules)
    {
        var rules_hash = JSON.stringify(validationRules)
        if (this._validationRules_hash == rules_hash) { return }
        this._validationRules_hash = rules_hash

        const attrs = ['type', 'maxlength', 'required', 'pattern'] //minlength
        for (var i in validationRules)
        {
            const rule = validationRules[i]
            if (!rule || !rule.id || rule.id.indexOf('Bill') >= 0) { continue }

            const el = this.formElements[rule.id]
            if (el)
            {
                // console.log(rule)
                for (var j in attrs)
                {
                    var a = attrs[j]

                    if (rule[a])
                    {
                        el.setAttribute(a, rule[a])
                    }
                    else if (a != 'type')
                    {
                        el.removeAttribute(a)
                    }
                }
            }
            else
            {
                console.warn(validationRules[i])
            }
        }
    }

    _visibleChanged(visible, o)
    {
        if (!visible) 
        {
            if (this._debouncerAnonymousDialog)
            {
                this._debouncerAnonymousDialog.cancel()
                this._debouncerAnonymousDialog = null
            }
            return //EXIT
        }

        // Reset the UI states
        this._reset()
        this.state = 'init'
        this.set('model.result.order', null)

        this.success = null

        // Notify the page's title
        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                title: this.localize('checkout-title-document')
            }
        }))

        this._ccFormWrapperInterceptor()
        this._debouncerAnonymousDialog = Debouncer.debounce(this._debouncerAnonymousDialog, timeOut.after(1600), () => this._anonymousDialogHandler())
    }

    _anonymousDialogHandler()
    {
        if (!this._hasItems || this.model.result) { return }

        if ((!this.userInfo || !this.userInfo.isAuth))
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    announce: this.localize('checkout-anonymous-announce'),
                    message: this.localize('checkout-anonymous-message'),
                    buttons: [
                        {
                            title: this.localize('checkout-anonymous-notnow'),
                            ontap: (e) => 
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }
                            }
                        },
                        {
                            title: this.localize('checkout-anonymous-signin'),
                            ontap: (e) =>
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }

                                this.dispatchEvent(new CustomEvent('ui-user-auth', {
                                    bubbles: true, composed: true, detail: {
                                        signin: true
                                    }
                                }))
                            }
                        },
                    ],
                }
            }))
        }
        else if (this.userInfo && this.userInfo.isMergedNew) //cartWasMerged_and_hasNewItems
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    announce: this.localize('checkout-cartmerge-announce'),
                    message: this.localize('checkout-cartmerge-message'),
                    required: true,
                    buttons: [
                        {
                            title: this.localize('checkout-cartmerge-ok'),
                            ontap: (e) => 
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }

                                this.set('userInfo.isMergedNew', false)
                            }
                        },
                        {
                            title: this.localize('checkout-cartmerge-review'),
                            ontap: (e) =>
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }
                                this.set('userInfo.isMergedNew', false)
                                this._gotoCart()
                            }
                        },
                    ],
                }
            }))
        }
    }

    _savingChanged(s, o)
    {
        if (o === true && s === false)
        {
            if (this.success === true)
            {
                this._reset()
                this._pushState('success')
            }
            else if (this.success === false)
            {
                switch (this.summary?.Key)
                {
                    case "cart_desync":
                    case "cart_desync_seller":
                    case "empty_cart":
                        //do nothing - checkout-data should show dialog
                        break

                    default:
                        this._pushState('error')
                        break
                }
            }
        }
    }

    _toggleIsResidential(e)
    {
        //
    }

    _toggleIsCompany(e)
    {
        this._ccFormWrapperInterceptor()
    }

    _toggleBillIsCompany(e)
    {
        this._ccFormWrapperInterceptor()
    }

    _toggleBillingAddress(e)
    {
        // if (this.model.hasBillingAddress)
        // {
        //     var el:any = this.formElements[this.focusFirstElements.Bill]
        //     el.focus()
        // }

        this.async(() => {
            this._ccFormWrapperInterceptor()
        },17)
    }

    _toggleAllowAutoFillAddress(e)
    {
        if (e.target.checked)
        {
            this._modelClearServerErrors()
        }
    }

    _computeHasItem(cartLength)
    {
        return cartLength > 0
    }

    _compute_emptyCart(cartLength, loading, totals)
    {
        // console.log(cartLength, loading, totals)
        return cartLength < 1 || loading || totals == null
    }

    _cartChanged(cartLength)
    {
        this._ccFormWrapperInterceptor()
        if (cartLength < 1)
        {
            // this._pushState('error')
        }
    }

    _compute_isPlaceOrderForcedByAdmin(isAdmin, itemGrupID, cart, cartP)
    {
        if (!isAdmin || !Array.isArray(cart) || cart.length < 1) { return false }

        var itemgroup = cart.find((e, i, a) =>
        {
            if (e.gid == itemGrupID) { return true }
            return false
        })

        var force = false
        if (itemgroup && itemgroup.items)
        {
            for (var i in itemgroup.items)
            {
                // console.log(itemgroup.items[i])
                if (itemgroup.items[i].notAvailable || (itemgroup.items[i].quantity % itemgroup.items[i].qtyStep !== 0))
                {
                    force = true
                    break
                }
            }
        }
        return force
    }

    _computeCartCheckout(itemGrupID, cart, cartP)
    {
        if (!Array.isArray(cart) || cart.length < 1) { return [] }


        var itemgroup = cart.find((e, i, a) =>
        {
            if (e.gid == itemGrupID) { return true }
            return false
        })


        var arr = (itemgroup && Array.isArray(itemgroup.items) ? itemgroup.items : []).map(
            (entryi, index, array) => 
            {
                entryi.title_wcount = this.checkoutData._getEntryTitle(entryi)
                if (entryi.price)
                {
                    var cur = entryi.price.Currency
                    entryi.is_price_regular = !entryi.price.ListPrice
                    entryi.price_regular = this._formatPrice(entryi.price.SalePriceFinal * entryi.quantity, cur)
                    entryi.price_list = this._formatPrice(entryi.price.ListPrice * entryi.quantity, cur)
                    entryi.price_sale = this._formatPrice(entryi.price.SalePriceFinal * entryi.quantity, cur)
                }
                return entryi
            }
        )

        // console.log(arr)

        return arr
    }

    _computeHasShipment(list)
    {
        return Array.isArray(list) && list.length > 0
    }

    _compute_hidden_ShipTaxID(countryProfile_ShipTaxID)
    {
        return !countryProfile_ShipTaxID
    }

    _compute_hidden_ShipEORI(countryProfile_ShipEORI)
    {
        return !countryProfile_ShipEORI
    }

    _compute_hidden_BillAddress(hasBillingAddress)
    {
        return !hasBillingAddress
    }    

    _compute_hidden_BillCompany(isgroup, BillIsCompany, groupIsCompany)
    {
        return isgroup ? !groupIsCompany : !BillIsCompany
    }

    _compute_hidden_BillTaxID(countryBillProfile_TaxID)
    {
        return !countryBillProfile_TaxID
    }

    _compute_hidden_BillEORI(countryBillProfile_EORI)
    {
        return !countryBillProfile_EORI
    }

    _compute_disabled_Input_ShipCompany(isCompany)
    {
        return !isCompany
    }

    _compute_disabled_Input_ShipTaxID(isCompany)
    {
        return !isCompany
    }

    _compute_disabled_Input_ShipEORI(isCompany)
    {
        return !isCompany
    }
    
    _compute_disabled_Input_BillCompany(isBillCompany)
    {
        return !isBillCompany
    }

    _compute_disabled_Input_BillTaxID(isBillCompany)
    {
        return !isBillCompany
    }

    _compute_disabled_Input_BillEORI(isBillCompany)
    {
        return !isBillCompany
    }

    _compute_disabled_Input(saving)
    {
        return saving
    }

    _compute_dis_placeorder_btn(loading, loadingDebounce)
    {
        return  loading || loadingDebounce
    }

    _compute_checkoutSuccessBackUrl(resultOrder)
    {
        if (resultOrder && resultOrder?.items?.length > 0)
        {
            var olitem = resultOrder.items[0].item
            if (olitem?.Store?.sid)
            {
                return `/${['store', olitem.Store.sid].join('/')}`
            }
        }
        return '/'
    }

    _compute_isPaymentListForcedByAdmin(modelPaymentMethodList, isAdmin)
    {
        var showForce = false
        if (Array.isArray(modelPaymentMethodList))
        {
            var r = modelPaymentMethodList.filter((i) => 
            { 
                return i.id == paymethod_TEST || i.id == paymethod_FREE 
            })
            showForce = r?.length > 0 && isAdmin
        }
        return showForce
    }

    _compute_showPaymentMethodList(modelPaymentMethodList, isAdmin)
    {
        var showList = false
        if (Array.isArray(modelPaymentMethodList))
        {
            var paygateOrPO = modelPaymentMethodList.filter((i) => 
            { 
                return i.id == paymethod_PAYPAL || i.id == paymethod_STRIPE || i.id == paymethod_PURCHASEORDER 
            })

            showList = paygateOrPO?.length < 1 || (modelPaymentMethodList.length - paygateOrPO?.length) > 1
        }
        return showList
    }

    _compute_showSwitchCheckoutCode(modelPaymentMethodList, isAdmin)
    {
        var hasPO = false
        var showList = this._compute_showPaymentMethodList(modelPaymentMethodList, isAdmin)
        if (Array.isArray(modelPaymentMethodList))
        {
            var r = modelPaymentMethodList.filter(i => i.id == paymethod_PURCHASEORDER)
            hasPO = (r?.length > 0)
        }
        return !showList && hasPO && modelPaymentMethodList.length > 1
    }

    _compute_hideHasBillingAddress(orgSubdomain)
    {
        return orgSubdomain == DECATHLON_FR
    }

    _compute_hideAllowAutoFillAddress(hasAutoFillAddress)
    {
        return !(hasAutoFillAddress === true)
    }

    _compute_shipAddressTitle(isgroup, orgSubdomain)
    {
        var t = ''
        if (orgSubdomain == DECATHLON_FR)
        {
            t = this.localize('checkout-billing-title')
        }
        else if (isgroup)
        {
            t = this.localize('checkout-shipping-home-title')
        }
        else
        {
            t = this.localize('checkout-shipping-title')
        }
        return t
    }

    _payMethod_Observer(paymethod)
    {
        var cc = paymethod && (paymethod.id === paymethod_PAYPAL || paymethod.id === paymethod_STRIPE || paymethod.id === paymethod_2C2P)
        var pr = paymethod && paymethod.id === paymethod_PAYMENTREQEST
        var po = paymethod && paymethod.id === paymethod_PURCHASEORDER
        // console.log('_ccPayM_Observer ' + this._ccPayM_delayed + " | " + this._ccPayM_animated)

        ////////////////////////////////////
        if (cc === true)
        {
            this._ccPayM_delayed = cc

            if (this._ccPayM_animated !== cc) 
            {
                this.__ccPayM2_debouncer = Debouncer.debounce(this.__ccPayM2_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._ccPayM_animated = cc
                    }
                )
            }
        }
        else if (cc === false)
        {
            this._ccPayM_animated = cc

            if (this._ccPayM_delayed !== cc) 
            {
                this.__ccPayM_debouncer = Debouncer.debounce(this.__ccPayM_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._ccPayM_delayed = cc
                    }
                )
            }
        }

        ////////////////////////////////////
        if (pr === true)
        {
            this._prPayM_delayed = pr

            if (this._prPayM_animated !== pr) 
            {
                this.__prPayM2_debouncer = Debouncer.debounce(this.__prPayM2_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._prPayM_animated = pr
                    }
                )
            }
        }
        else if (pr === false)
        {
            this._prPayM_animated = pr

            if (this._prPayM_delayed !== pr) 
            { 
                this.__prPayM_debouncer = Debouncer.debounce(this.__prPayM_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._prPayM_delayed = pr
                    }
                )
            }
        }

        ////////////////////////////////////
        if (po === true)
        {
            this._poPayM_delayed = po

            if (this._poPayM_animated !== po) 
            {
                this.__poPayM2_debouncer = Debouncer.debounce(this.__poPayM2_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._poPayM_animated = po
                    }
                )
            }
        }
        else if (po === false)
        {
            this._poPayM_animated = po

            if (this._poPayM_delayed !== po) 
            {
                this.__poPayM_debouncer = Debouncer.debounce(this.__poPayM_debouncer,
                    timeOut.after(17),
                    () =>
                    {
                        this._poPayM_delayed = po
                    }
                )
            }
        }
    }

    _computePayAmount(totals)
    {
        if (Array.isArray(totals) && totals.length > 0)
        {
            return totals[totals.length - 1].amount
        }
        return 0
    }

    _compute_prPayM_ShowSection(prPayM_allowed, visible, state, failure, offline, saving, _ccPayM_delayed)
    {
        var show = _ccPayM_delayed && visible && !failure && !offline && !saving && (state == '' || state == 'init')
        return prPayM_allowed && show
    }

    _compute_disabledPayBtn(loading, prPayM_allowed, visible, state, failure, offline, saving, _ccPayM_delayed)
    {
        var show = _ccPayM_delayed && visible && !failure && !offline && !saving && (state == '' || state == 'init')
        // console.log(loading, prPayM_allowed)
        return loading || !(prPayM_allowed && show)
    }

    disableShipState(countryProfile_NoState)
    {
        return countryProfile_NoState
    }

    disableBillState(hidden_BillAddress, NoState)
    {
        // console.log('hidden_BillAddress', hidden_BillAddress, NoState)
        return hidden_BillAddress || NoState
    }

    _tryRefresh()
    {
        this._pushState('')
        this.checkoutData.refresh()
    }

    _tryReconnect(e)
    {
        if (this.summary)
        {
            switch (this.summary.Key)
            {
                default:
                case "cart_desync":
                case "empty_cart":
                    //goto shopping cart
                    this._gotoCart()
                    break
            }
        }
        else
        {
            this._pushState('')
            this._reloadWindowLocation()
        }
    }

    _ccFormWrapperObserver(visible, state, failure, offline, saving, _ccPayM_delayed, payMethodID, hidden_BillAddressAnim, modelBillIsCompanyAnim)
    {
        var show = _ccPayM_delayed && visible && !failure && !offline && !saving && (state == '' || state == 'init') && payMethodID == paymethod_STRIPE && !hidden_BillAddressAnim && !modelBillIsCompanyAnim
        // console.log(visible, state, failure, offline, saving, _ccPayM_delayed, payMethodID, hidden_BillAddressAnim, modelBillIsCompanyAnim, '=>', show)
        var el = this.ccFormWrapper
        if (el)
        {
            el.style.display = (show ? '' : 'none') //hide ccFormWrapper for all pages (because it is on over all pages in document root element)
            this.stripePaymentElement = show
        }
        this._ccFormWrapperInterceptor()
    }

    _ccFormWrapperInterceptor()
    {
        if (!this.visible) { return }

        if (this._ccform_debouncer) { window.cancelAnimationFrame(this._ccform_debouncer) }
        this._ccform_debouncer = window.requestAnimationFrame(() => 
        {
            if (!this.ccFormWrapper || !this.ccForm) { return }

            const body = document.body
            const docEl = document.documentElement
            const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop

            // console.log(getComputedStyleValue(this.ccForm, `display`))
            var r = this.ccForm.getBoundingClientRect()
            if (true)
            {
                this.ccFormWrapper.style.top = `${r.top + scrollTop}px`
                this.ccFormWrapper.style.left = `${r.left}px`
                this.ccFormWrapper.style.width = `${r.width - 16}px`
                // this.ccFormWrapper.style.height = `${r.height - 16}px`
                if (this.ccFormWrapper.children.length > 0)
                {
                    var rw = this.ccFormWrapper.children[0].getBoundingClientRect()
                    this.ccForm.style.height = `${rw.height}px`
                }
            }
        })
    }

    _paypalCCLoadedChanged(visible, apiPubkey, paypalReady, _ccPayM_delayed, modelPaymentMethodID, modelPaymentIntentToken)
    {
        if (visible !== true || !apiPubkey || paypalReady !== true || _ccPayM_delayed !== true || modelPaymentMethodID != paymethod_PAYPAL) { return } 

        var t = 17 //this._last_modelPaymentIntentToken == modelPaymentIntentToken ? 1900 : 17
        this._debouncer_cardFormBuild = Debouncer.debounce(this._debouncer_cardFormBuild, timeOut.after(t), async () =>
        {
            //this._last_modelPaymentIntentToken = modelPaymentIntentToken
            await this._cardPaypalFormBuild(this.ccFormPayPal) //use actual element
        })
        this._ccFormWrapperInterceptor()
    }

    _last_modelPaymentIntentToken: string
    _stripeCCLoadedChanged(visible, apiPubkey, stripeReady, _ccPayM_delayed, modelPaymentIntentToken)
    {
        // console.log('_stripeCCLoadedChanged', visible, apiPubkey, stripeReady, _ccPayM_delayed, modelPaymentIntentToken)
        if (visible !== true || !apiPubkey || stripeReady !== true || _ccPayM_delayed !== true) { return } 

        var t = this._last_modelPaymentIntentToken == modelPaymentIntentToken ? 1900 : 17
        this._debouncer_cardFormBuild = Debouncer.debounce(this._debouncer_cardFormBuild, timeOut.after(t), async () =>
        {
            this._last_modelPaymentIntentToken = modelPaymentIntentToken
            // console.log('await this._cardFormBuild(this.ccFormWrapper)')
            await this._cardFormBuild(this.ccFormWrapper)
        })
        this._ccFormWrapperInterceptor()
    }

    _stripePRLoadedChanged(visible, apiPubkey, stripeReady, _prPayM_delayed, totals)
    {
        if (visible !== true || !apiPubkey || stripeReady !== true || _prPayM_delayed !== true || !totals) { return }

        this.set('model.result.cardError', '') //clear card errors since pay methods was switched
        // no wrappers ...
        
        this._paymentRequestButtonBuild(null)

        this._ccFormWrapperInterceptor()
    }

    _stripePRwSChanged(visible, apiPubkey, stripeReady, totals, email)
    {
        if (visible !== true || !apiPubkey || stripeReady !== true || !totals) { return }

        this._paymentRequestButtonBuild(this.payNowButtonWrapper)
    }

    _debouncer_stripePaymentElementDelayed: Debouncer
    _stripePaymentElementDelayed(stripePaymentElement)
    {
        this._debouncer_stripePaymentElementDelayed = Debouncer.debounce(this._debouncer_stripePaymentElementDelayed, timeOut.after(370), async () =>
        {
            this.stripePaymentElementDelayed = true
        })
    }

    async _cardPaypalFormBuild(wrapper)
    {
        var paypal = this.checkoutData.getPayPal()
        if (!paypal?.HostedFields || !paypal?.Buttons || this.payment) { return }
        // || !paypal?.getFundingSources || !paypal?.Marks || !paypal?.Messages || 

        // if (this.elements && this.state != 'init')
        // {
        //     this.elements.close()
        //     delete this.payment
        //     delete this.elements
        //     return ///EXIT
        // }
        
        const payd = this.checkoutData._getPayData()
        console.log(payd)
       
        const opt_elem = 
        {
            style: 
            {
                color: "silver", //"gold" | "blue" | "silver" | "white" | "black";
                shape: "rect", //"rect" | "pill";
                layout: "vertical", //"vertical" | "horizontal";
            },

            // set up the transaction
            createOrder: (data, actions) => 
            {
                // pass in any options from the v2 orders create call:
                // https://developer.paypal.com/api/orders/v2/#orders-create-request-body
                const createOrderPayload = {
                    purchase_units: [
                        {
                            amount: {
                                value: "88.44"
                            }
                        }
                    ]
                }
                return actions.order.create(createOrderPayload)
            },

            // finalize the transaction
            onApprove: (data, actions) => 
            {
                const captureOrderHandler = (details) => 
                {
                    const payerName = details.payer.name.given_name
                    console.log('Transaction completed')
                }

                return actions.order.capture().then(captureOrderHandler)
            },

            // handle unrecoverable errors
            onError: (err) => 
            {
                console.error('An error prevented the buyer from checking out with PayPal')
            },

        } as PayPalButtonsComponentOptions
        var elements = this.elements = paypal.Buttons(opt_elem)
        var payment = this.payment = true
        try
        {
            await elements.render(wrapper)
        }
        catch(err)
        {
            console.error(err, 'PayPal Buttons failed to render')
        }
    }

    _paymentChangedFirst = false
    async _cardFormBuild(wrapper)
    {
        if (this.elements && this.state != 'init')
        {
            this.payment.unmount(wrapper)
            delete this.payment
            delete this.elements
            return ///EXIT
        }

        const payd = this.checkoutData._getPayData()
        if (payd.clientSecret)
        {
            //////////////////////////////// CARD FORM
            //TODO: need to be synced with CSS !!!!!!!
            var errCl = getComputedStyleValue(this,`--paper-input-container-invalid-color`)
            if (!errCl) { errCl = getComputedStyleValue(this,`--error-color`) }
            var textCol = getComputedStyleValue(this, `--paper-input-container-input-color`)
            // console.log(errCl, textCol)
            // var style = {
            //     'base': {
            //         color: textCol,
            //         // lineHeight: '24px',
            //         fontFamily: 'Roboto, Noto, sans-serif',
            //         fontSmoothing: 'antialiased',
            //         fontSize: '16px',
            //         '::placeholder': {
            //             color: '#757575'
            //         }
            //     },
            //     'invalid': {
            //         color: errCl,
            //         iconColor: errCl,
            //     },
            // }
            const appearance = {
                // theme: 'flat',
                // labels: 'floating',
                // variables: {
                //   fontFamily: 'Roboto, Noto, sans-serif',
                //   fontLineHeight: '1.1',
                //   borderRadius: '0px',
                //   spacingUnit: '2px',
                //   colorPrimary: textCol,
                //   colorBackground: '#ffffff',
                //   colorText: textCol,
                //   colorDanger: errCl,
                // },
                // rules: {
                // }
            }
            const opt_elem = {
                locale: payd.lang,
                clientSecret: payd.clientSecret,
                appearance: appearance,
            }
            const opt = {
                // business: {
                //     name: payd.sellerName,
                // },
                fields: {
                    billingDetails: {
                        name: 'never',
                        email: 'never',
                        phone: 'never',
                        address: {
                            line1 : 'never',
                            line2: 'never',
                            city: 'never',
                            state: 'never',
                            country: 'never',
                            postalCode: 'never',
                        }
                    },
                }
                // paymentMethodOrder
                // readOnly
                // terms
                // wallets
            }

            if (this.elements && this.state == 'init')
            {
                if (this.elements._commonOptions.clientSecret.clientSecret == opt_elem.clientSecret)
                {
                    const opt_elem_update = {
                        locale: opt_elem.locale,
                        appearance: opt_elem.appearance,
                    } // does not support update
                    this.elements.update(opt_elem_update)
                    const { error } = await this.elements.fetchUpdates()
                    if (error) 
                    { 
                        console.error(error) //something goes wrong
                        this._reloadWindowLocation()
                    }
                    if (this.payment) { this.payment.update(opt) }
                }
                else
                {
                    console.warn('payment intent changed!', this.elements._commonOptions.clientSecret.clientSecret, '=>', opt_elem.clientSecret)
                    this.payment.unmount(wrapper)
                    this.payment.destroy()
                    this.payment = null
                    this.elements = null
                    this._paymentChangedFirst = true
                }
            }
            
            if (!this.elements)
            {
                this.elements = this.stripe.elements(opt_elem)
                this.payment = this.elements.create('payment', opt) 
                // console.log('create pay-elements', payd, opt, opt_elem)

                // Handle real-time validation errors from the card Element.
                this.payment.on('ready', (event) =>
                {
                    this._ccFormWrapperInterceptor()
                })
                this.payment.on('change', (event) =>
                {
                    // console.log(event)
                    //brand|complete|empty|error|value.postalCode
                    // if (this.model && this.model.stripeToke)
                    // {
                    //     this.set('model.stripeToke', '') //clean token due changes in card form
                    // }
                    this._lastPayEvent = event
                    if (event.error)
                    {
                        this.set('model.result.cardError', event.error.message)
                    }
                    else if (!this._paymentChangedFirst)
                    {
                        this.set('model.result.cardError', '')
                    }
                    this._paymentChangedFirst = false
                })
                this.payment.on('focus', (e) => 
                {
                    // console.log('payel.focus', event)
                })
                this.payment.on('blur', (e) => 
                {
                    // console.log('payel.blur', e, this.nextCCFormElement, this.beforeCCFormElement)
                    //TODO: figure out down or up direction..
                    // if (this._shiftKeyOnly && this.beforeCCFormElement) { this.async(()=> {this.beforeCCFormElement.focus()}) } //make async due cannot preventDefault
                    // this.focus()
                    // console.log('0')
                    // this.async(()=> 
                    // { 
                    //     console.log('1')
                    //     if (this.nextCCFormElement) 
                    //     { 
                    //         console.log('2')
                    //         this.nextCCFormElement.focus() 
                    //     } 
                    // } , 17) //make async due cannot preventDefault
                    // return false
                })
                this.payment.mount(wrapper)
            }
        }
    }

    ccFormElementFocus(e) 
    {
        if (this.payment) 
        { 
            this.payment.focus() 
            e.preventDefault()
            e.stopPropagation()
            return false
        }
        // console.log('ccFormElementFocus', e.relatedTarget, e.currentTarget)
    }

    ccFormElementBlur(e) 
    {
        // console.log('ccFormElementBlur', e.relatedTarget, e.currentTarget)
    }

    _paynowTap(e)
    {
        if (this.checkoutData.paymentRequest) 
        {
            this.checkoutData.paymentRequest.show()
        }
    }

    _paymentRequestButtonBuildImpl(result, wrapper, paymentRequest)
    {
        // if (this._dev) console.warn('paymentRequest.canMakePayment', result)
        if (!result || !paymentRequest) 
        { 
            this.payNowBtn = this.localize('checkout-paynow-btn-unavailable')
            return //EXIT !!!
        }

        this._applePay = result.applePay
        this._googlePay = result.googlePay
        this._prPayM_allowed = true
        this.payNowBtn = this.localize('checkout-paynow-btn')
        
        if (result.applePay)
        {
            this.payNowTitle = this.localize('checkout-payrequest-applepay-title')
        }
        else if (result.googlePay)
        {
            this.payNowTitle = this.localize('checkout-payrequest-googlepay-title')
        }
        else
        {
            this.payNowTitle = this.localize('checkout-payrequest-etc-title')
        }


        
        //#region 
        // if (wrapper == null)
        // {
        //     //do nothing
        // }
        // else
        // {
        //     var style = {
        //         paymentRequestButton: {
        //             type: 'default', // | 'donate' | 'buy', // default: 'default'
        //             theme: 'light-outline', // 'dark' | 'light' | 'light-outline', // default: 'dark'
        //             height: '44px', // default: '40px', the width is always '100%'
        //         },
        //     }
        //     var opt = {
        //         paymentRequest: paymentRequest,
        //         classes: { base: 'pay-request' },
        //         style: style,
        //     }

        //     this._prPayM_allowed = true
        //     if (this.paymentRequestButton)
        //     {
        //         this.paymentRequestButton.update(opt)
        //     }
        //     else
        //     {
        //         this.paymentRequestButton = this.elements.create('paymentRequestButton', opt)
        //         this.paymentRequestButton.mount(wrapper)
        //     }
        // }
        //#endregion
    }

    _paymentRequestButtonBuild(wrapper)
    {
        return
        // this.payNowBtn = this.localize('checkout-paynow-btn-initial')
        // this.payNowTitle = this.localize('checkout-payrequest-title')

        // if (!Teamatical._browser.allowPayRequest) { return }

        // //////////////////////////////// BUTTON
        // var paymentRequest = this.checkoutData.getPayRequest()
        // if (!paymentRequest) 
        // { 
        //     this._prPayM_allowed = false
        //     this.payNowBtn = this.localize('checkout-paynow-btn-unavailable')
        //     return ///EXIT!!!
        // }

        // if (paymentRequest._canMakePaymentResult)
        // {
        //     this._paymentRequestButtonBuildImpl(paymentRequest._canMakePaymentResult, wrapper, paymentRequest)
        // }
        // else
        // {
        //     // Check the availability of the Payment Request API first.
        //     paymentRequest.canMakePayment().then((result) =>
        //     {
        //         paymentRequest._canMakePaymentResult = result
        //         this._paymentRequestButtonBuildImpl(result, wrapper, paymentRequest)

        //         if (!result)
        //         {
        //             this._prPayM_allowed = false
        //             this.checkoutData.hidePaymentRequestMethod()
        //         }
        //     })
        //     .catch((error) => 
        //     {
        //         this._prPayM_allowed = false
        //         this.payNowBtn = this.localize('checkout-paynow-btn-unavailable')
        //         this.checkoutData.hidePaymentRequestMethod()
        //         console.warn(error)
        //     })
        // }
    }

    _onScroll(e)
    {
        this._ccFormWrapperInterceptor()
    }

    _onResized(e)
    {
        this._ccFormWrapperInterceptor()
    }

    onHistoryPopstate(e)
    {
        e = e || window.event

        this.async(() =>
        {
            this._ccFormWrapperInterceptor()
        }, 17)
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

    hidden_BillAddress_onTransitionEnd(e)
    {
        this.hidden_BillAddressAnim = false
        this._ccFormWrapperInterceptor()
    }

    hidden_BillAddressAnim: boolean
    _debouncer_hidden_BillAddressAnim: Debouncer
    modelHasBillAddress_was: boolean
    hidden_BillAddress_was: boolean
    _animationHasBillAddressChanged(modelHasBillAddress, hidden_BillAddress)
    {
        // console.log('_animationHasBillAddressChanged', modelHasBillAddress, hidden_BillAddress)
        if (this.modelHasBillAddress_was == modelHasBillAddress && this.hidden_BillAddress_was == hidden_BillAddress) { return }
        this.modelHasBillAddress_was = modelHasBillAddress
        this.hidden_BillAddress_was = hidden_BillAddress
        
        this.hidden_BillAddressAnim = true
        this._debouncer_hidden_BillAddressAnim = Debouncer.debounce(this._debouncer_hidden_BillAddressAnim, timeOut.after(470), () =>
        {
            this.hidden_BillAddressAnim = false //reset timeout
        })
    }

    _debouncer_modelIsCompany: Debouncer
    modelIsCompany: boolean
    _delayedModelIsCompany(modelIsCompany)
    {
        this._debouncer_modelIsCompany = Debouncer.debounce(this._debouncer_modelIsCompany, timeOut.after(470), () =>
        {
            this.modelIsCompany = modelIsCompany
        })
    }

    _debouncer_modelBillIsCompany: Debouncer
    modelBillIsCompany: boolean
    _delayedModelBillIsCompany(modelBillIsCompany)
    {
        this._debouncer_modelBillIsCompany = Debouncer.debounce(this._debouncer_modelBillIsCompany, timeOut.after(470), () =>
        {
            this.modelBillIsCompany = modelBillIsCompany
        })
    }


    _debouncer_modelBillIsCompanyAnim: Debouncer
    modelBillIsCompany_was: boolean
    _animationBillCompanyChanged(modelBillIsCompany)
    {
        // console.log('_animationBillCompanyChanged', modelBillIsCompany)
        if (this.modelBillIsCompany_was == modelBillIsCompany) { return }
        this.modelBillIsCompany_was = modelBillIsCompany

        this.modelBillIsCompanyAnim = true
        this._debouncer_modelBillIsCompanyAnim = Debouncer.debounce(this._debouncer_modelBillIsCompanyAnim, timeOut.after(470), () =>
        {
            this.modelBillIsCompanyAnim = false //reset timeout
        })
    }

    modelBillIsCompanyAnim: boolean
    modelBillIsCompany_onTransitionEnd(e)
    {
        this.modelBillIsCompanyAnim = false
        this._ccFormWrapperInterceptor()
    }

    // _modelAssignment(model)
    // {
    //     console.log(model)
    // }

    _descShipmentMethod(desc)
    {
        return desc ? desc : ''
    }

    _iconShipmentMethod(express, pickup, group, noshipping)
    {
        if (noshipping)
        {
            return 'places:all-inclusive'
        }
        else if (group)
        {
            return 'maps:person-pin-circle'
        }
        else if (pickup)
        {
            return 'maps:place'
        }
        else if (express)
        {
            return 'maps:flight'
        }
        else
        {
            return 'maps:local-shipping'
        }
    }

    _itemgroupTitle(itemgroup)
    {
        return itemgroup ? ` / ${itemgroup.title}` : ''
    }

    _formatCurrencyShipmentMethodList(modelShipmentMethodList, currency)
    {
        if (!Array.isArray(modelShipmentMethodList)) { return modelShipmentMethodList }
        return modelShipmentMethodList.map((element, index, array) => 
        {
            var v = Object.assign({}, element)
            if (isFinite(v.amount) && v.amount > 0)
            {
                v.title = `${v.title} + ${this._formatPrice(v.amount, currency)}`
            }
            return v
        })
    }

}