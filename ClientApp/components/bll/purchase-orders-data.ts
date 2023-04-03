import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { PurchaseOrderListModel } from '../dal/purchase-orders-list-model'
import { PurchaseOrderListItemModel } from '../dal/purchase-orders-list-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class PurchaseOrdersData extends NetBase
{
    static get is() { return 'teamatical-purchase-orders-data' }

    static get template() 
    {
        return html``
        // return html`<app-localstorage-document key="orders-cache" data="{{ordersCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            //input
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            orders: { type: Object, notify: true },
            ordersCache: { type: Object, value: {} },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(orders.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(ordersCache, visible)',
            '_searchHandler(orders.search)',
        ]
    }

    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    _searchDebouncer: any
    _loaderDebouncer: any
    _loadDataTriggerFlag: any
    _loadmoreCallback: any
    _rq_start: any
    _setSearchingProgress: any
    _setLoading: any
    _setSaving: any
    _setFailure: any
    _ischanging: any
    _visibleOld: any
    orders: any
    api_action: any
    api_url: any
    api_body: any
    visible: any
    websiteUrl: any
    ordersCache: any


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }


    ready()
    {
        super.ready()
    }

    refresh()
    {
        this.api_action = 'get'
        if (this.orders) { this.orders.ptoken = '' }
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    loadMore(callback)
    {
        this.api_action = 'get'
        this._loadmoreCallback = () => {
            this._loadmoreCallback = null
            if (callback) { callback() }
        }
        if (this.orders) { this.orders.pnumber += 1 }
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    save(orderi, successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.api_action = 'save'
            this._fetchItems(1, orderi)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    makeAsDefault(store)
    {
        if (!this.visible) { return }

        this.api_action = 'makedefault'
        this._setFailure(false)
        this.api_body = store

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, 1, true)
    }

    addNew()
    {
        if (!this.visible) { return }

        this.api_action = 'addnew'
        this._setFailure(false)
        this.api_body = null

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    archiveStore(store)
    {
        if (!this.visible) { return }

        this.api_action = 'archive'
        this._setFailure(false)
        this.api_body = store

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    unarchiveStore(store)
    {
        if (!this.visible) { return }

        this.api_action = 'unarchive'
        this._setFailure(false)
        this.api_body = store

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.ordersCache) { return }
        this.ordersCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(ordersP)
    {
        // console.log(this.orders)
        if (!this.orders) { return 0 }
        return this.orders.totalElements
    }


    _loadDataTrigger(ordersCache, visible)
    {
        // console.log(ordersCache, visible)
        if (ordersCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
        {
            this._loaderDebouncer = Debouncer.debounce(this._loaderDebouncer, timeOut.after(200), () =>
            {
                this._loadDataTriggerFlag = true
                this.refresh()
            })
        }
        if (this._visibleOld === true && visible === false)
        {
            this._loadDataTriggerFlag = false
        }
        this._visibleOld = visible
    }

    _searchHandler(search)
    {
        if (this._ischanging) { return }

        this._setSearchingProgress(true)
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1600), () =>
        {
            // console.log(search)
            this.api_action = 'get'
            this.orders.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/user/purchaseorder-list-' + api_action
        return url
    }

    _loadingChanged(v)
    {
        // console.log(v)
        // this.dispatchEvent(new CustomEvent('api-orders-loading', { bubbles: true, composed: true, detail: { id: this., loading: v } }));
    }

    _savingChanged(v)
    {
        // this.dispatchEvent(new CustomEvent('api-orders-saving', { bubbles: true, composed: true, detail: { id: this., saving: v } }));
    }

    _fetchItems(attempts, orderi?)
    {
        if (!this.visible) { return }

        // if (this.ordersCache && Array.isArray(this.ordersCache.items) && this.ordersCache.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('orders.items', this.ordersCache.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)

        var obj: any = null
        if (this.api_action == 'get' && !(this.orders && this.orders.ptoken) && !(this.orders && this.orders.search))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.orders)
        }
        obj.tz = new Date().getTimezoneOffset()

        if (this.api_action == 'get') 
        { 
            delete obj.items 
        }
        else if (this.api_action == 'save')
        {
            obj = orderi
        }



        this.api_body = obj

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponseDebounced.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, 1, true)
    }

    _onRequestResponseDebounced(e)
    {
        const d = 0
        const t = this._loadmoreCallback ? (this._now() - this._rq_start) : d
        if (t < d)
        {
            this.async(() => { this._onRequestResponse(e) }, d - t)
        }
        else
        {
            this._onRequestResponse(e)
        }
    }

    _onRequestResponse(e)
    {
        this._setLoading(false)
        this._setSaving(false)

        var r = e['response']
        if (r)
        {
            var summary = r ? r['summary'] : null //obj
            if (summary && summary.Key == 'not_logged')
            {
                // this._setFailure(true)
                // this.setModel(this._convertJson2Class(undefined))

                var barr = [
                    {
                        title: this.localize('products-empty-ok'),
                        ontap: (e) => 
                        {
                            this._gotoAccount()
                        }
                    }
                ]

                barr.push({
                    title: this.localize('products-empty-signin'),
                    ontap: (e) => 
                    {
                        this.dispatchEvent(new CustomEvent('ui-user-auth', {
                            bubbles: true, composed: true, detail: {
                                signin: true
                            }
                        }))
                    }
                })

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('checkout-orders-not_logged-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
            else if (summary && summary.Key == 'forbid_not_organization')
            {
                // this._setFailure(true)
                // this.setModel(this._convertJson2Class(undefined))

                var barr = [
                    {
                        title: this.localize('products-empty-ok'),
                        ontap: (e) => 
                        {
                            this._gotoAccount()
                        }
                    }
                ]

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('checkout-orders-forbid_not_organization-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
            // else
            // {
            //     this._setFailure(true)
            // }
        }

        if (r && r['success'] === false)
        {
            var summary: any = null
            if (r['summary'])
            {
                summary = r.summary //Type | Message | Key
            }

            var result = r['result']
            var inx = -1
            var items = this.orders && this.orders.items ? this.orders.items.filter((curi, i, arr) => { 
                if (result && curi.PurchaseOrderID == result.PurchaseOrderID)
                {
                    inx = parseInt(i)
                    return true

                } 
                return  false
            }) : null

            var item = items && items.length > 0 ? items[0] : null
            if (item)
            {
                // console.log(inx, item)
                var path = 'orders.items.' + inx
                // this.set(path, {})

                if (summary && summary.Message)
                {
                    this.set(path + '.errorMessage', summary.Message)
                }

                if (Array.isArray(r['details']) && r.details.length > 0)
                {
                    var notvalid = {}
                    for (var i in r.details)
                    {
                        var acc = r.details[i]
                        notvalid[acc.Key] = acc.Message
                    }

                    this.set(path + '.notvalid', notvalid)
                }
            }
            else if (summary)
            {
                var barr = [
                    {
                        title: this.localize('products-empty-ok'),
                        ontap: (e) => 
                        {
                            //
                        }
                    }
                ]

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: '',
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))                
            }
            
        }

        
        if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, { success: r?.success }) }

        if (!r || r['success'] !== true) { return }
        /////////////////////////////////////////////

        // console.log('success-> result...')
        var updatedModel: any = null

        this._ischanging = true
        if (this.api_action == 'save')
        {
            var item = this._convertJson2ClassItem(r['result'])
            for (var i in this.orders.items)
            {
                if (item.PurchaseOrderID == this.orders.items[i].PurchaseOrderID)
                {
                    this.set('orders.items.' + i, item)
                    break
                }
            }
        }
        else
        {
            updatedModel = this._convertJson2Class(r['result'])
            if (this.api_action == 'get' && this.orders && (updatedModel && !updatedModel.pfirst))
            {
                // updatedModel.items = this.orders.items.concat(updatedModel.items)
                for (var i in updatedModel)
                {
                    if (i == 'items')
                    {
                        for (var j in updatedModel[i])
                        {
                            this.push('orders.' + i, updatedModel[i][j])
                        }
                    }
                    else
                    {
                        this.set('orders.' + i, updatedModel[i])
                    }
                }
            }
            else
            {
                this.set('orders', updatedModel)
            }
        }
        this._ischanging = false


        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }

        this._setSearchingProgress(false)
        
        //save data
        // this.set('ordersCache', updatedModel)
    }

    resetError(orderi, name?)
    {
        var inx = -1
        var items = this.orders.items.filter((curi, i, arr) =>
        {
            if (orderi && curi.PurchaseOrderID == orderi.PurchaseOrderID)
            {
                inx = parseInt(i)
                return true

            }
            return false
        })
        var item = items && items.length > 0 ? items[0] : null
        if (item)
        {
            // console.log(inx, item)
            var path = 'orders.items.' + inx
            if (name)
            {
                this.set(path + '.notvalid.' + name, null)
            }
            else
            {
                this.set(path + '.notvalid', null)
            }
        }
    }

    _onRequestError(e)
    {
        this._setSearchingProgress(false)
        this._setLoading(false)
        this._setSaving(false)
        this._setFailure(true)
    }

    _cloneModel(m)
    {
        if (m)
        {
            return this._convertJson2Class(JSON.parse(JSON.stringify(m)))
        }
        return m
    }

    _convertJson2Class(res, update?)
    {
        if (!res) { return new PurchaseOrderListModel() }

        var slist = Object.assign((update ? update : new PurchaseOrderListModel()), res)
        if (slist && Array.isArray(slist.items))
        {
            for (var s in slist.items)
            {
                slist.items[s] = this._convertJson2ClassItem(slist.items[s], update)
            }
        }

        return slist
    }

    _convertJson2ClassItem(res, update?)
    {
        return Object.assign((update ? update : new PurchaseOrderListItemModel()), res)
    }

}
