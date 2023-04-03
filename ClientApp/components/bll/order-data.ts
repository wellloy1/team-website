import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { OrderListModel } from '../dal/order-list-model'
import { OrderModel } from '../dal/order-model'
import { CustomElement } from '../utils/CommonUtils'
import { CheckoutData } from './checkout-data'
const ptoken_empty = ""


@CustomElement
export class OrderData extends NetBase
{
    static get is() { return 'teamatical-order-data' }

    static get template() 
    {
        return html``
        // return html`<app-localstorage-document key="orders-cache" data="{{ordersCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            orders: { type: Array, notify: true },
            ordersCache: { type: Array, notify: true, value: {}, observer: '_ordersCacheChanged' },
            queryParams: { type: Object, notify: true },

            numItems: { type: Number, notify: true, computed: '_computeNumItems(orders.*)', },
            // total: { type: Number, notify: true, computed: '_computeTotal(orders.items.splices)', },
            currency: { type: String, notify: true, computed: '_computeCurrency(orders.items.splices)', },
            userInfo: { type: Object },
            websiteUrl: { type: String },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            orderView: { type: Boolean, readOnly: true, notify: true, },
            orderid: { type: String, readOnly: true, notify: true, },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            accessToken: { type: String, readOnly: true, notify: true, },
        }
    }
   
    static get observers()
    {
        return [
            '_dataReloadChanged(visible, orderid, ordersCache)',
            '_computeOrderView(queryParams, visible)',
            '_searchHandler(orders.search)',
        ]
    }

    _searchDebouncer: any
    _loadmoreCallback: any
    _rq_start: any
    _setSearchingProgress: any
    _setFailure: any
    _setLoading: any
    _ischanging: any
    _setOrderid: any
    _setOrderView: any
    orders: any
    api_action: any
    api_url: any
    queryParams: any
    ordersCache: any
    websiteUrl: any
    orderid: any
    visible: any
    setItems: any
    accessToken: string = ''
    _setAccessToken: any



    connectedCallback()
    {
        super.connectedCallback()
    }

    loadMore(callback)
    {
        this.api_action = 'list-get'
        this._loadmoreCallback = () =>
        {
            this._loadmoreCallback = null
            if (callback) { callback() }
        }
        if (this.orders) { this.orders.pnumber += 1 }
        this._fetchItems(3)
    }


    reload(reset?)
    {
        if (reset) { this.orders = null }

        // console.log('orders-reload :', this.queryParams)
        this.api_action = 'list-get'
        if (this.queryParams && this.queryParams.orderid) 
        { 
            // if (!this.orders) { this.orders = {} }
            // this._ischanging = true
            // this.orders.search = this.queryParams.orderid 
            // this._ischanging = false
            this.api_action = 'get'
        }
        if (this.orders) { this.orders.ptoken = '' }
        this._fetchItems(3)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.ordersCache) { return }

        this.ordersCache = {}

        this.async(() =>
        {
            this.reload()
        })
    }

    addtocartOrder(oid, callback?)
    {
        this.api_action = 'addtocart'
        this._fetchItems(1, oid, callback)
    }

    cancelOrder(oid)
    {
        this.api_action = 'cancel'
        this._fetchItems(1, oid)
    }

    _ordersCacheChanged(v)
    {
        // if (!v || this._ischanging) { return }

        // console.log(v)
        // this._ischanging = true
        // this.set('orders', v)
        // this._ischanging = false
    }

    _dataReloadChanged(visible, orderid, cache)
    {
        if (visible !== true || orderid == undefined || !cache) { return }

        this.reload()
    }

    _searchHandler(search)
    {
        if (this._ischanging) { return }

        this._setSearchingProgress(true)
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1600), () =>
        {
            // console.log(search)
            this.api_action = 'list-get'
            this.orders.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _visibleChanged(v, vo)
    {
        if (v !== true) { return }
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-shoppingorders-loading', { bubbles: true, composed: true, detail: { loading: v } }));
    }

    _computeNumItems(storesP)
    {
        if (!this.orders) { return 0 }
        return this.orders.totalElements
    }

    // _computeNumItems()
    // {
    //     if (!this.orders || !Array.isArray(this.orders.items)) { return 0 }
    //     var v = this.orders.items.reduce((totali, i) =>
    //     {
    //         return i.items.reduce((totalj, j) =>
    //         {
    //             var qty = parseInt(j.quantity, 10)
    //             return totalj + qty
    //         }, totali)
    //     }, 0)
    //     return v
    // }

    // _computeTotal()
    // {
    //     if (!this.orders || !Array.isArray(this.orders.items)) { return 0 }
    //     var v = this.orders.items.reduce((totali, i) =>
    //     {
    //         var ti = i.Totals.filter(o => { return o.id == 'cf.totals.total' })
    //         return (ti.length > 0 ? ti[0].amount : 0)
    //     }, 0)
    //     return v
    // }

    _computeCurrency()
    {
        if (!this.orders || !Array.isArray(this.orders.items) || this.orders.items.length < 1) { return '' }

        //TODO: convert if different along of orders
        return this.orders.items[0].Currency
    }

    _computeOrderView(queryParams, visible)
    {
        // console.log(queryParams)
        var r = '__list__'
        for (var i in queryParams)
        {
            if (i.toLowerCase() == 'orderid') 
            {
                r = queryParams[i]
                break
            }
        }
        this._setOrderid(r)
        this._setOrderView(r !== '__list__')
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }
        var apiPath = '/api/v1.0/user/order-'
        return this.websiteUrl + apiPath + api_action
    }

    _fetchItems(attempts, oid?, callback?)
    {
        if (!this.visible) { return }
        

        if (!this.ordersCache) { this.ordersCache = {} }
        var cacheItem = this.ordersCache[this.orderid]
        if (cacheItem && Array.isArray(cacheItem.items) && cacheItem.items.length > 0)
        {
            this._ischanging = true
            this.set('orders.items', cacheItem.items)
            this._ischanging = false
        }
        this._setFailure(false)


        var obj:any = null
        var qp:any = {}
        if (this.api_action == 'list-get')
        {
            if (!(this.orders && this.orders.ptoken) && !(this.orders && this.orders.search))
            {
                obj = this._convertJson2Class(undefined)
            }
            else
            {
                obj = this._cloneModel(this.orders)
            }
            delete obj.items
            obj.tz = new Date().getTimezoneOffset()
        }
        else if (this.api_action == 'get')
        {
            //orderID, accessToken - from emails
            qp = JSON.parse(JSON.stringify(this.queryParams))
            if (qp['amp;accessToken']) { qp['accessToken'] = qp['amp;accessToken'] } //sometime email client does this shit!
            if (oid) { qp['orderid'] = oid }
            //if (qp && qp['accessToken']) { this._setAccessToken(qp['accessToken']) } //--disabled due lineitemid not secure for now
        }
        else if (this.api_action == 'cancel' || this.api_action == 'addtocart')
        {
            qp = JSON.parse(JSON.stringify(this.queryParams))
            //if (qp && qp['accessToken']) { this._setAccessToken(qp['accessToken']) } //--disabled due lineitemid not secure for now
            obj = Object.assign(new OrderModel(), { id: oid, AccessToken: this.accessToken })
        }

        var apiurl = StringUtil.urlquery(this.api_url, qp)
        var apimethod = this.api_action == 'get' ? "GET" : "POST"
        var apibody = obj

        this._setLoading(true)
        var rq = {
            url: apiurl,
            body: apibody,
            method: apimethod,
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onLoadDebounced.bind(this, oid, callback),
            onError: this._onError.bind(this, oid, callback)
        }

        this._rq_start = this._now()
        this._getResource(rq, attempts, true)
    }

    _onLoadDebounced(oid, callback, e)
    {
        const d = 0
        const t = this._loadmoreCallback ? (this._now() - this._rq_start) : d
        if (t < d)
        {
            this.async(() => { this._onLoad(oid, callback, e) }, d - t)
        }
        else
        {
            this._onLoad(oid, callback, e)
        }
    }

    _onLoad(oid, callback, e)
    {
        var r = e['response']
        
        this._setSearchingProgress(false)
        this._setLoading(false)
        
        if (r)
        {
            if (r['success'] === true && r['result'])
            {
                var updatedModel: any = null
                var summary = r['summary'] //obj

                this._ischanging = true
                if (this.api_action == 'list-get' || this.api_action == 'get')
                {
                    updatedModel = this._convertJson2Class(r['result'])

                    //this.api_action == 'list-get' &&
                    if (this.orders && (updatedModel && !updatedModel.pfirst))
                    {
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
                else if (this.api_action == 'cancel' || this.api_action == 'addtocart')
                {
                    var order = this._convertJson2ClassItem(r['result'])
                    for (var i in this.orders.items)
                    {
                        if (order.id == this.orders.items[i].id)
                        {
                            this.set('orders.items.' + i, order)
                            break
                        }
                    }

                    if (this.api_action == 'cancel')
                    {
                        this.dispatchEvent(new CustomEvent('api-refund-done', { bubbles: true, composed: true, detail: { model: order } }))
                    }
                    else if (this.api_action == 'addtocart')
                    {
                        if (order['ShoppingCartCount'])
                        {
                            this.dispatchEvent(new CustomEvent('api-cart-count-set', { bubbles: true, composed: true, detail: { shoppingCartCount: order['ShoppingCartCount']  } }))
                        }                        
                    }
                }
                this._ischanging = false

                if (summary && summary.Key == 'suggest_login')
                {
                    var barr = [{
                        title: this.localize('orders-empty-signin'),
                        ontap: (e) => 
                        {
                            this.dispatchEvent(new CustomEvent('ui-user-auth', {
                                bubbles: true, composed: true, detail: {
                                    signin: true
                                }
                            }))
                        }
                    }]
                    this.dispatchEvent(new CustomEvent('api-show-dialog', {
                        bubbles: true, composed: true, detail: {
                            // required: true,
                            announce: this.localize('checkout-orders-suggest_login-announce'),
                            message: summary.Message,
                            buttons: barr,
                            errorid: r?.errorid ? r.errorid : null,
                            devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                        }
                    }))
                }

                if (callback) { callback(r['result'], r) }
            }
            else if (r['success'] === false)
            {
                if (this.orderid && this.setItems) { this.setItems(this.orderid, {}) }

                var summary = r['summary'] //obj
                var barr = [
                    {
                        title: this.localize('orders-empty-ok'),
                        ontap: (e) => 
                        {
                            this._gotoAccountOrders()
                        }
                    }
                ]

                // if (summary.Key == 'order_absent_or_no_access') 
                // {
                //     //
                // }

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('checkout-orders-no_order-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))

                if (callback) { callback(r['result'], r) }
            }
            else if (r['error'])
            {
                this._onError(oid, callback, r['error'])
            }

            if (this.api_action == 'cancel')  { this.api_action = 'get' }
        }
        else
        {
            this._onError(oid, callback, r)
        }
    }

    _onError(oid, callback, err)
    {
        this._setSearchingProgress(false)
        this._setFailure(true)
        this._setLoading(false)

        if (callback) { callback(err) }
    }

    // setModel(orderid, orderList)
    // {
    //     if (!orderList) { return }

    //     Object.keys(orderList.items).forEach((i) =>
    //     {
    //         orderList.items[i].animIndex = 0 //parseInt(i, 10)
    //         orderList.items[i].added = false
    //         // items[i].item.Product.ImageUrlSwap = items[i].item.Product.ImageUrl

    //         // //TODO: add temp data 
    //         // items[i].Cancelable = (Math.random() > 0.5)
    //         // items[i].Canceled = (Math.random() > 0.5)
    //     })

    //     // if (orderList && orderList.items)
    //     // {
    //     //     //for images use first roster record
    //     //     orderList.items[0].items[0].item.Player = undefined
    //     //     orderList.items[0].items[0].item.SizesSelected = undefined
    //     //     orderList.items[0].items[0].item.Roster = { ID: '1IEAUI5RCBZGUEHWAWZ4QVOTJ1B', Title: 'My Roster 1 (10)' }
    //     // }

    //     //ui update
    //     this._ischanging = true
    //     this.set('orders', orderList)
    //     this._ischanging = false
    //     if (this.api_action == 'list-get' && this._loadmoreCallback) { this._loadmoreCallback() }

    //     //save data
    //     // this._ischanging = true
    //     // var orderCacheItem = this._cloneModel(orderList)
    //     // delete orderCacheItem.ptoken
    //     // this.set('ordersCache.' + orderid, orderCacheItem)
    //     // this._ischanging = false
    // }

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
        if (!res) { return new OrderListModel() }

        var slist = Object.assign((update ? update : new OrderListModel()), res)
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
        return Object.assign((update ? update : new OrderModel()), res)
    }

    static _compute_countryProfile(shipCountryID)
    {
        return CheckoutData._compute_countryProfile(shipCountryID)
    }

}
