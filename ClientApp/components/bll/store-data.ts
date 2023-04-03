import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StoreConfigurationModel } from '../dal/store-configuration-model'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
import { CatalogProductModel } from '../dal/catalog-product-model'
import { ProductPriceModel } from '../dal/product-price-model'
import { CheckoutData } from './checkout-data'
import { UIStoreItem } from '../ui/ui-store-item'



@CustomElement
export class StoreData extends NetBase
{
    static get is() { return 'teamatical-store-data' }

    static get template() 
    {
        return html`<app-localstorage-document key="store-cache" session-only data="{{cache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            //input
            isOrganization: { type: Boolean, value: false, notify: true },
            itemName: { type: String, observer: '_itemNameChanged' },
            itemModel: { type: Object, notify: true, }, //api_model
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },

            itemModelOld: { type: Object, notify: true },
            cache: { type: Object, value: {}, },

            _observers: { type: Array, },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, },

            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },

            countryGroupProfile: { type: Object, notify: true, computed: '_compute_countryProfile(itemModel.shipping.ShipCountry.id)' },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(visible, itemName, queryParams)',
            '_itemModelChanged(itemModel.*, cache, userInfo, visible)',
            '_itemModelLoaded(itemModel)',
        ]
    }

    _first: any
    _visibleOld: any
    _ischanging: any
    _setFailure: any
    _observers: any
    _saveSuccessHandler: any
    _setSaving: any
    _setLoading: any
    _itemModelUpdating: any
    _loadDataTriggerFlag: any
    _modelChangeDebouncer: any
    _modelDebouncer: any
    _resetDebouncer: any
    _itemModelOld: any
    _confirmAccountEmailCompleteHandler: any
    _confirmAccountPhoneCompleteHandler: any
    itemModel: any
    itemName: any
    itemModelOld: any
    queryParams: any
    websiteUrl: any
    userInfo: any
    cache: any
    api_action: any
    api_url: any
    api_body: any
    loading: any
    failure: any
    visible: any
    saving: any
    _suppress_loadDataTrigger: boolean
    isOrganization: boolean


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        if (window.localStorage) { window.localStorage?.removeItem('store-cache') }

        this._first = true
    }

    ready()
    {
        super.ready()
        this._observers = []
    }

    refresh(sid?)
    {
        if (!this.itemName) { return }

        this.api_action = 'get'
        // Try at most 3 times to get the items.
        this._fetchItems(this.itemName, 3)
    }

    save(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.itemModelOld = this._cloneModel(this.itemModel) //clone
            this.api_action = 'save'
            this._fetchItems(this.itemName, 1)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    cancel()
    {
        this.reset()
    }

    cleanPrivateInfoInCache()
    {
        if (!this.cache) { return }

        this.set('cache', {})

        this.async(() =>
        {
            this.refresh()
        })
    }

    reset() //relaod
    {
        // console.log('reset...')
        // if (!this.itemName) { this.itemName = null }

        var handler = () =>
        {
            this.api_action = 'get'
            // console.log('GO! ... reset')
            this._fetchItems(this.itemName, 1)
        }
        this._resetDebouncer = Debouncer.debounce(this._resetDebouncer, timeOut.after(17), handler)
    }

    resendConfirm(type)
    {
        var qpar = {
            'storeID': this.itemModel ? this.itemModel.sid : '',
            'type': type,
        }
        var apiurl = StringUtil.urlquery(this._computeAPIUrl('resend-confirm', this.websiteUrl), qpar)
        // console.log('fetch: ' + apiurl)

        this._setLoading(true)
        var rq = {
            url: apiurl,
            onLoad: () =>
            {
                this._setLoading(false)
            },
            onError: () =>
            {
                this._setLoading(false)
            },
        }
        this._getResource(rq, 1, true)
    }

    addItem(itemi)
    {
        var items = Object.assign([], this.itemModel.items)
        items.unshift(itemi)

        this.itemModel.items = items
        this._modelApplyItems(this.itemModel)
        this.notifyPath('itemModel.items')
    }

    removeItem(id)
    {
        var items = this.itemModel.items.filter((i) =>
        {
            if (id == i.id)
            {
                return false
            }
            return true
        })
        
        this.itemModel.items = items
        this._modelApplyItems(this.itemModel)
        this.notifyPath('itemModel.items')
    }

    // moveFirstItem(id)
    // {
    //     var items = this.itemModel.items.filter((i) => { return id == i.name })
    //     if (items.length > 0)
    //     {
    //         var inx = this.itemModel.items.indexOf(items[0])
    //         var delArr = this.itemModel.items.splice(inx, 1)
    //         this.itemModel.items.unshift(delArr[0])
    //         this.set('itemModel.items', Object.assign([], this.itemModel.items))
    //     }
    // }

    // moveLastItem(id)
    // {
    //     var items = this.itemModel.items.filter((i) => { return id == i.name })
    //     if (items.length > 0)
    //     {
    //         var inx = this.itemModel.items.indexOf(items[0])
    //         var delArr = this.itemModel.items.splice(inx, 1)
    //         this.itemModel.items.push(delArr[0])
    //         this.set('itemModel.items', Object.assign([], this.itemModel.items))
    //     }
    // }

    setSID(sid)
    {
        var store = this.itemModel ? this._cloneModel(this.itemModel) : new StoreConfigurationModel()
        store.sid = (typeof (sid) == 'string' ? sid.trim(): sid)
        this.set('itemModel', store)
    }

    set(path, val, notify?)
    {
        let internal = (path && path.indexOf('itemModel') >= 0) && notify !== true
        if (internal) { this._itemModelUpdating = true }
        super.set(path, val)
        if (internal) { this._itemModelUpdating = false }
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/store/' + api_action
        // console.log(url)
        return url
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-store-loading', { bubbles: true, composed: true, detail: { id: this.itemName, loading: v } }));
    }

    _savingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-store-saving', { bubbles: true, composed: true, detail: { id: this.itemName, saving: v } }));
    }

    _itemNameChanged(nv, ov)
    {
        // console.log('_itemNameChanged: ' + ov + ' -> ' + nv)
        // if (nv === '')
        // {
        //     this.itemModel = null
        //     this._setFailure(false)
        // }
    }

    _itemModelLoaded(itemModel)
    {
        //
    }

    _loadDataTrigger(visible, itemName, queryParams)
    {
        if (this._suppress_loadDataTrigger) { return }

        if (itemName !== undefined && visible == true && queryParams != undefined)
        {
            this.reset()
        }
    }

    _itemModelChanged(itemModelP, cache, userInfo, visible)
    {
        // console.log(itemModelP)

        if ((itemModelP.path == 'itemModel' && itemModelP.value == undefined) || !cache || userInfo === undefined || visible !== true || this._itemModelUpdating === true) { return }

        var t = 1000
        if (this.itemModel && this.itemModelOld && this.itemModel.shipping && this.itemModelOld.shipping)
        {
            t = (JSON.stringify(this.itemModel.shipping.ShipmentMethod) == JSON.stringify(this.itemModelOld.shipping.ShipmentMethod)) ? t : 17
            t = (JSON.stringify(this.itemModel.shipping.RequestConfirmAccountEmail) == JSON.stringify(this.itemModelOld.shipping.RequestConfirmAccountEmail)) ? t : 17
            t = (JSON.stringify(this.itemModel.shipping.RequestConfirmAccountPhone) == JSON.stringify(this.itemModelOld.shipping.RequestConfirmAccountPhone)) ? t : 17
        }

        if (this._first)
        {
            t = 0
        }

        // console.log('w ' + t)

        var changed = true
        var reqModel = JSON.parse(JSON.stringify(this.itemModel)) //clone

        if (reqModel && this.itemModelOld)
        {
            //fields not to send requests...
            reqModel.result = this.itemModelOld.result

            reqModel.sid = this.itemModelOld.sid
            reqModel.userid = this.itemModelOld.userid
            reqModel.title = this.itemModelOld.title
            reqModel.created = this.itemModelOld.created
            reqModel.updated = this.itemModelOld.updated

            reqModel.storelogo = this.itemModelOld.storelogo
            // reqModel.image = this.itemModelOld.image
            // reqModel.placeholder = this.itemModelOld.placeholder
            reqModel.isdefault = this.itemModelOld.isdefault
            reqModel.isowner = this.itemModelOld.isowner

            reqModel.RecentProducts = this.itemModelOld.RecentProducts

            reqModel.isMatrix = this.itemModelOld.isMatrix
            reqModel.hasMatrix = this.itemModelOld.hasMatrix
            reqModel.isgroup = this.itemModelOld.isgroup
            reqModel.groupdeadline = this.itemModelOld.groupdeadline
            reqModel.groupmin = this.itemModelOld.groupmin
            reqModel.groupshippingautorenewal = this.itemModelOld.groupshippingautorenewal
            reqModel.groupshippingautorenewalvalue = this.itemModelOld.groupshippingautorenewalvalue
            reqModel.groupshippingautorenewalunits = this.itemModelOld.groupshippingautorenewalunits
            // 

            reqModel.ValidationRules = this.itemModelOld.ValidationRules

            if (this.itemModelOld.items)
            {
                reqModel.items = this.itemModelOld.items.map(i => {
                    // console.log(i)
                    return i
                })
            }
            else
            {
                reqModel.items = this.itemModelOld.items
            }
            

            reqModel.checkoutcodeonly = this.itemModelOld.checkoutcodeonly
            reqModel.hideprices = this.itemModelOld.hideprices
            reqModel.inpubliccatalog = this.itemModelOld.inpubliccatalog
            reqModel.hidecustomize = this.itemModelOld.hidecustomize
            reqModel.quickcustomize = this.itemModelOld.quickcustomize
            reqModel.bindorganization = this.itemModelOld.bindorganization
            reqModel.bindorganizationWas = this.itemModelOld.bindorganizationWas
            reqModel.description = this.itemModelOld.description
            reqModel.notvalid = this.itemModelOld.notvalid

            reqModel.CurrencyRegions = this.itemModelOld.CurrencyRegions
            reqModel.CurrencyRegion = this.itemModelOld.CurrencyRegion

            if (this.itemModelOld.shipping)
            {
                if (!reqModel.shipping) { reqModel.shipping = {} }

                reqModel.shipping.notvalid = this.itemModelOld.shipping.notvalid
                reqModel.shipping.CustomOptionsTitle = this.itemModelOld.shipping.CustomOptionsTitle
                reqModel.shipping.CustomOptions = this.itemModelOld.shipping.CustomOptions
                reqModel.shipping.CustomOptionsRequired = this.itemModelOld.shipping.CustomOptionsRequired

                //request confirmation...
                reqModel.shipping.AccountEmail = this.itemModelOld.shipping.AccountEmail
                reqModel.shipping.AccountPhone = this.itemModelOld.shipping.AccountPhone
                reqModel.shipping.ShipFirstName = this.itemModelOld.shipping.ShipFirstName
                reqModel.shipping.ShipLastName = this.itemModelOld.shipping.ShipLastName

                reqModel.shipping.IsCompany = this.itemModelOld.shipping.IsCompany
                reqModel.shipping.ShipCompany = this.itemModelOld.shipping.ShipCompany
                reqModel.shipping.ShipTaxID = this.itemModelOld.shipping.ShipTaxID
                reqModel.shipping.ShipEORI = this.itemModelOld.shipping.ShipEORI

                reqModel.shipping.ShipAddress = this.itemModelOld.shipping.ShipAddress
                reqModel.shipping.ShipAddress2 = this.itemModelOld.shipping.ShipAddress2
                reqModel.shipping.ShipAddress3 = this.itemModelOld.shipping.ShipAddress3
                reqModel.shipping.ShipCity = this.itemModelOld.shipping.ShipCity
                //request shipmentmethod...
                reqModel.shipping.ShipCountry = this.itemModelOld.shipping.ShipCountry
                reqModel.shipping.ShipState = this.itemModelOld.shipping.ShipState
                reqModel.shipping.ShipZip = this.itemModelOld.shipping.ShipZip

                reqModel.shipping.IsResidential = this.itemModelOld.shipping.IsResidential

                reqModel.shipping.DeliveryDetailsOnly = this.itemModelOld.shipping.DeliveryDetailsOnly
                reqModel.shipping.DeliveryDetails = this.itemModelOld.shipping.DeliveryDetails
                
                reqModel.shipping.IsActive = this.itemModelOld.shipping.IsActive
                reqModel.shipping.OrderCount = this.itemModelOld.shipping.OrderCount

                reqModel.shipping.ShipmentMethod = this.itemModelOld.shipping.ShipmentMethod
                reqModel.shipping.ShipmentMethodList = this.itemModelOld.shipping.ShipmentMethodList

                //ui
                reqModel.shipping.IsConfirmedAccountEmail = this.itemModelOld.shipping.IsConfirmedAccountEmail
                reqModel.shipping.IsConfirmedAccountPhone = this.itemModelOld.shipping.IsConfirmedAccountPhone
                reqModel.shipping.IsConfirmingAccountEmail = this.itemModelOld.shipping.IsConfirmingAccountEmail
                reqModel.shipping.IsConfirmingAccountPhone = this.itemModelOld.shipping.IsConfirmingAccountPhone
                // if (reqModel.shipping.RequestConfirmAccountEmail == undefined) { this.itemModelOld.shipping.RequestConfirmAccountEmail = undefined }
                // if (reqModel.shipping.RequestConfirmAccountPhone == undefined) { this.itemModelOld.shipping.RequestConfirmAccountPhone = undefined }
                reqModel.shipping.AccountPhoneConfirm = this.itemModelOld.shipping.AccountPhoneConfirm
                reqModel.shipping.AccountEmailConfirm = this.itemModelOld.shipping.AccountEmailConfirm
            }
            reqModel.AdminInvitationConfirm = this.itemModelOld.AdminInvitationConfirm

            // if (this._dev)
            // {
            //     var diff = StringUtil.compareAsJSON(reqModel, this.itemModelOld)
            //     if (diff) 
            //     {
            //         console.log(diff.old, diff.new)
            //     }
            // }

            changed = (JSON.stringify(reqModel) !== JSON.stringify(this.itemModelOld))
            // console.log('changed', changed)
            // console.log(JSON.stringify(reqModel))
            // console.log(JSON.stringify(this.itemModelOld))
        }
        else
        {
            changed = true
        }

        if (changed) 
        {

            this.itemModelOld = JSON.parse(JSON.stringify(this.itemModel)) //save for changes comparison
            if (this._first) { this._first = false }

            if (this.api_action == 'update')
            {
                this._getResourceCancel() //cancel recent request if any

                this._modelDebouncer = Debouncer.debounce(this._modelDebouncer,
                    timeOut.after(t), () =>
                    {
                        this._fetchItems(this.itemName, 1)
                    })
            }
        }
        else
        {
            // console.log('no change')
        }
    }

    _fetchItems(itemName, attempts)
    {
        if (!this.visible) { return }

        // console.log('_fetchItems', itemName)
        this._setFailure(false)

        if (!this.cache) { this.set('cache', {}) }
        if (this.api_action == 'get')
        {
            var cacheItem = (itemName === undefined ? null : this.cache[itemName])
            if (cacheItem)
            {
                this._ischanging = true
                this.itemModel = cacheItem
                this._ischanging = false
            }
        }


        var obj = (this.api_action == 'get' ? this._convertJson2Class(undefined) : this._cloneModel(this.itemModel))

        obj.sid = itemName
        if (obj && typeof obj.groupmin == 'string')
        {
            obj.groupmin = parseInt(obj.groupmin)
        }


        ///queryParams - parse
        if (this.api_action == 'get' && this.queryParams != undefined)
        {
            var queryParams = this.queryParams //for some reason queryParams are empty

            const emailConfirm = queryParams['email-confirm']
            const phoneConfirm = queryParams['phone-confirm']
            const inviteConfirm = queryParams['invite-confirm']

            if (emailConfirm && typeof emailConfirm == 'string')
            {
                if (!obj.shipping) { obj.shipping = {} }
                obj.shipping.AccountEmailConfirm = emailConfirm
            }
            else if (phoneConfirm && typeof phoneConfirm == 'string')
            {
                if (!obj.shipping) { obj.shipping = {} }
                obj.shipping.AccountPhoneConfirm = phoneConfirm
            }
            else if (inviteConfirm && typeof inviteConfirm == 'string')
            {
                obj.AdminInvitationConfirm = inviteConfirm
            }
        }


        // ///cleanup due: Application Gateway, traffic optimization
        if (this.api_action != 'get')
        {
            obj.ValidationRules = undefined
            obj.RecentProducts = undefined
            obj.shipping.CountryList = undefined

            // if (this.api_action == 'update')
            // {
            //     obj.items = undefined
            // }
            if (Array.isArray(obj.items))
            {
                obj.items = obj.items.map(i => 
                {
                    // profitBase
                    // profitValue
                    //TODO: delete profit
                    if (!this.isOrganization)
                    {
                        delete i.profit
                        delete i.profitBase
                        delete i.profitValue
                    }
                    delete i.profitBaseMax
                    delete i.profitEdit
                    delete i.profitMax
                    delete i.profitP
                    delete i.profitSliderEdit
                    delete i.profitSliderEditVal
                    delete i.profitSliderInitial
                    delete i.profitSliderInitialVal
                    delete i.profitVal
                    return i
                })
            }

            delete obj.CurrencyRegions
        }

        this.api_body = obj

        // if (this.api_action == 'save')
        // {
        //     this.set('itemModel.items', []) //clear to force rerendering items
        // }

        // console.log(obj.items)

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse ? this._onRequestResponse.bind(this) : (e) => { this._onRequestResponse(e) }, //due to iOS 13.5 - bind of undefined issue
            onError: this._onRequestError ? this._onRequestError.bind(this) : (e) => { this._onRequestError(e) }, //due to iOS 13.5 - bind of undefined issue
        }
        
        this._getResource(rq, 1, true)
    }

    _onRequestResponse(e)
    {
        var r = e['response']
        if (!r || r['error'])
        {
            this._setFailure(true)
        }
        else 
        {
            var showSummary = true
            if (r['success'] === true)
            {
                if (r.summary?.Key != 'invitation_not_logged')
                {
                    //after parsing need to clear
                    delete this.queryParams['email-confirm']
                    delete this.queryParams['phone-confirm']
                    delete this.queryParams['invite-confirm']
                }

                if (this.api_action == 'save')
                {
                    this.set('itemModel.items', []) //clear to force rerendering items
                }
                this._modelApplyRequest(r['result'], true)
                if (this.api_action == 'get')
                {
                    //save for changes comparison
                    this._itemModelOld = JSON.parse(JSON.stringify(this.itemModel)) //clone
                }
                this.api_action = 'update'
            }
            else if (r['success'] === false)
            {
                if (this.itemModel && !this.itemModel.result) { this.set('itemModel.result', {}) }
                if (this.api_action == 'update' && r['result']) 
                { 
                    this._modelApplyRequest(r['result'], true) 
                }

                if (r['summary'])
                {
                    this.set('itemModel.result.errorMessage', r.summary.Message)

                    if (r.summary.Key == 'validation_fail')
                    {
                        showSummary = false
                    }
                    else if (r.summary.Key == 'store_notfound')
                    {
                        showSummary = false
                        this.set('itemModel', null)
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
                        let barr:any = []
                        if (isdialog_suggestion)
                        {
                            barr.push({
                                title: this.localize('checkout-address-suggestion-correct-btn'),
                                ontap: (e) => 
                                {
                                    this.set('itemModel.shipping.UseSuggestionValidation', true)
                                    this.api_action = 'save'
                                    this._fetchItems(this.itemName, 1)
                                }
                            })
                        }
                        barr.push({
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
                                this.set('itemModel.shipping.IgnoreSuggestionValidation', true)
                                this.api_action = 'save'
                                this._fetchItems(this.itemName, 1)
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
                        var b2 = (i.Key == 'ShipmentMethod')
                        if (b2)
                        {
                            this.set('itemModel.result.shipmentMethodError', i.Message)
                            // console.log(i)
                        }
                        return !b2
                    })
                    this.set('itemModel.result.notvalid', notvalid)
                    this.api_action = 'update'
                }
            }

            if (showSummary && r['summary'] && r.summary.Key && r.summary.Message)
            {
                this._showSummaryMessage(r.summary.Key, r.summary.Message, r)
            }
        }

        this._setLoading(false)
        this._setSaving(false)
        this.handleConfirmHandlers(e)
    }

    _onRequestError(e)
    {
        this._setFailure(true)

        this._setLoading(false)
        this._setSaving(false)

        this.handleConfirmHandlers(e)
    }

    handleConfirmHandlers(e)
    {
        if (this._confirmAccountEmailCompleteHandler)
        {
            this._confirmAccountEmailCompleteHandler.call(undefined, { event: e })
            this._confirmAccountEmailCompleteHandler = null
        }

        if (this._confirmAccountPhoneCompleteHandler)
        {
            this._confirmAccountPhoneCompleteHandler.call(undefined, { event: e })
            this._confirmAccountPhoneCompleteHandler = null
        }
    }

    confirmAccountEmail(completeHandler)
    {
        this._confirmAccountEmailCompleteHandler = completeHandler
        this.itemModel.shipping.RequestConfirmAccountEmail = true
        this.notifyPath('itemModel.shipping.RequestConfirmAccountEmail')
    }

    confirmAccountPhone(completeHandler)
    {
        this._confirmAccountPhoneCompleteHandler = completeHandler
        this.itemModel.shipping.RequestConfirmAccountPhone = true
        this.notifyPath('itemModel.shipping.RequestConfirmAccountPhone')
    }

    _showSummaryMessage(summaryKey, summaryMessage, r: any = null)
    {
        if (this.__errorsResponseGlobalKeys && this.__errorsResponseGlobalKeys[summaryKey]) { return } //dont handle global keys
        // 'groupshipping_confirm'
        // 'groupshipping_confirm_send'
        // 'invitation_confirm'
        // "cant_suspend_groupshipping"
        // "store_admin_invitation"
        // "store_admin_invitation_send"
        // "email_doesnt_match"
        // "cant_remove_owner_or_yourself"
        // "invitation_invalid"

        var barr: any = []
        barr.push({
            title: this.localize('store-summary-ok'),
            ontap: (e) => 
            {
                //none
            }
        })

        if (summaryKey == 'invitation_not_logged') 
        {
            barr.push({
                title: this.localize('store-invite-signin'),
                ontap: (e) => 
                {
                    this.dispatchEvent(new CustomEvent('ui-user-auth', {
                        bubbles: true, composed: true, detail: {
                            signin: true
                        }
                    }))
                }
            })
        }
        else if (summaryKey == 'not_logged')
        {
            summaryMessage = this.localize('detail-store-failed-isauth')
            barr.push({
                title: this.localize('store-invite-signin'),
                ontap: (e) => 
                {
                    this.dispatchEvent(new CustomEvent('ui-user-auth', {
                        bubbles: true, composed: true, detail: {
                            signin: true
                        }
                    }))
                }
            })
        }

        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                required: true,
                message: summaryMessage,
                buttons: barr,
                errorid: r?.errorid ? r.errorid : null,
                devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
            }
        }))
    }

    _modelApplyItems(updatedModel)
    {
        if (Array.isArray(updatedModel?.items))
        {
            updatedModel.items = updatedModel.items.map((i, inx) => {
                var mi: any = UIStoreItem.initModel(i)
                mi.id = i.name + '-' + inx
                return mi
            })
        }
    }

    _modelApplyRequest(obj, isreq)
    {
        
            
        // console.log('success-> result...')
        var updatedModel = this._convertJson2Class(obj)//, this.itemModel)
        if (updatedModel)
        {
            //TEMP: FIX
            // if (this.api_action == 'save')
            // {
            //     updatedModel.lid = null 
            // }
            // updatedModel.lid = (this.queryParams && this.api_action != 'save' ? this.queryParams['lid'] : null)


            //TEMP: patches
            // updatedModel.image = '/data/images/mens_outerwear.jpg'
            // updatedModel.placeholder = 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAXAABAQEAAAAAAAAAAAAAAAAAAAIEAQEAAAAAAAAAAAAAAAAAAAACEAAAAwYHAQAAAAAAAAAAAAAAERMBAhIyYhQhkaEDIwUVNREBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A3dkr5e8tfpwuneJITOzIcmQpit037Bw4mnCVNOpAAQv/2Q=='
            // updatedModel.ValidationRules.push({ id: "items.title", maxlength: "1000", required: "true", type: "text" })
            // updatedModel.isgroup = false
            // updatedModel.groupdeadline = { tz: -420, ms: 1527613200000 }
            if (updatedModel.shipping)
            {
                updatedModel.shipping.RequestConfirmAccountEmail = undefined
                updatedModel.shipping.RequestConfirmAccountPhone = undefined
                // updatedModel.shipping.IsConfirmedAccountEmail = true
                // updatedModel.shipping.IsConfirmedAccountPhone = true
            }
            // updatedModel.shipping.IsConfirmedAccountEmail = true
            // updatedModel.shipping.IsConfirmedAccountPhone = true
            // updatedModel.shipping.IsConfirmingAccountEmail = true
            // updatedModel.shipping.IsConfirmingAccountPhone = true


            // updatedModel['CurrencyRegions'] = [
            //     {
            //         "id": "USD_Region",
            //         "title": "USD Region"
            //     },
            //     {
            //         "id": "THB_Region",
            //         "title": "THB Region"
            //     },
            //     {
            //         "id": "AUD_Region",
            //         "title": "AUD Region"
            //     },
            // ]
            // updatedModel['CurrencyRegion'] = {
            //     "id": "USD_Region",
            //     "title": "USD Region",
            //     "Currency": JSON.parse(JSON.stringify({
            //         "id": "THB",
            //         "title": "THB"
            //     })),
            // }


            // console.log(updatedModel.items)
            this._modelApplyItems(updatedModel)

            if (this.api_action == 'get' && updatedModel.groupdeadline && updatedModel.groupdeadline.ms == 0 && updatedModel.groupdeadline.tz == 0)
            {
                var now = new Date()
                updatedModel.groupdeadline = {
                    tz: now.getTimezoneOffset(),
                    ms: now.valueOf(),
                }
                // console.log(updatedModel.groupdeadline)
            }

            if (this.userInfo && updatedModel.shipping && !updatedModel.shipping.AccountEmail)
            {
                updatedModel.shipping.AccountEmail = (this.userInfo.profile && this.userInfo.profile.email ? this.userInfo.profile.email : "")
            }
            if (this.itemModel && this.itemModel.shipping && Array.isArray(this.itemModel.shipping.CountryList) && updatedModel.shipping && updatedModel.shipping.CountryList == null)
            {
                updatedModel.shipping.CountryList = this.itemModel.shipping.CountryList
            }

            // if (this.api_action == 'update')
            // {
            //     updatedModel.items = this.itemModel.items //restore items, due on update it does not sents
            // }

        }

        this._ischanging = true
        // // this.set('itemModel.items', [])
        // if (this.api_action == 'update' && updatedModel.shipping) 
        // {
        //     this.itemModel.shipping = updatedModel.shipping
        // }
        // else
        // {
        this.itemModel = updatedModel
        this._ischanging = false

        // console.log(updatedModel)
        const updatedModelID = updatedModel && updatedModel.sid ? updatedModel.sid : ''

        //save data
        if (!this.cache) { this.cache = {} }
        var cacheItem = Object.assign({}, updatedModel)
        delete cacheItem.RecentProducts
        this.set('cache.' + updatedModelID, cacheItem)

        //update objects back
        // this.playerInfo = this.itemModel.Player
        // this.teamInfo = this.itemModel.Team

        const routeChange = () =>
        {
            this._suppress_loadDataTrigger = true
            this.itemName = this.itemModel.sid
            var path = ['/store', this.itemModel.sid].join('/')
            var qobj = Object.keys(this.queryParams).reduce((acc, key) =>
            {
                const _acc = acc
                if (this.queryParams[key] !== undefined) _acc[key] = this.queryParams[key]
                return _acc
            }, {})
            var url = StringUtil.urlquery(path, qobj, true)
            this._gotoRS(url)
            this._suppress_loadDataTrigger = false
        }


        ///queryParams - build
        if (this.api_action == 'get' && this.itemModel && this.itemModel.sid)
        {
            routeChange()
        }
        else if (this.api_action == 'update' && this.queryParams != undefined)
        {
            // var qp = ShopProductData.product_uery1(updatedModel, this.queryParams, this.customizationType)
            // this.set('queryParams', qp)
            // this._gotoRS(StringUtil.urlquery(document.location.pathname, qp))
        }
        else if (this.api_action == 'save')
        {
            this.api_action = 'update'

            routeChange()

            // console.log('Save Succeed!')
            if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, { id: updatedModelID }) }
        }

    }

    _cloneModel(m)
    {
        if (m)
        {
            return this._convertJson2Class(JSON.parse(JSON.stringify(m)))
        }
        return m
    }

    _fillAbsUrl(item)
    {
        return item
    }

    _convertJson2Class(res, update?)
    {
        if (!res) { return new StoreConfigurationModel() }


        // console.log(res)

        var obj: any = null
        if (update)
        {
            obj = Object.assign(update, res)
        }
        else
        {
            obj = Object.assign(new StoreConfigurationModel(), res)
        }

        if (Array.isArray(obj.items))
        {
            for (var i in obj.items)
            {
                obj.items[i] = Object.assign(new CatalogProductModel(), obj.items[i])
                if (obj.items[i].price)
                {
                    obj.items[i].price = Object.assign(new ProductPriceModel(), obj.items[i].price)
                }
            }
        }

        // obj.groupdeadline = Object.assign(new Object(), obj.groupdeadline)
        // obj.shipping = Object.assign(new Object(), obj.shipping)
        // obj.shipping.CountryList = Object.assign(new Object(), obj.shipping.CountryList)

        return obj
    }

    _compute_countryProfile(shipCountryID)
    {
        return CheckoutData._compute_countryProfile(shipCountryID)
    }

}
