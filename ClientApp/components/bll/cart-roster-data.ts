import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { CartRosterListModel, CartRosterItemModel } from '../dal/cart-roster-list-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class CartRosterData extends NetBase
{
    static get is() { return 'teamatical-cart-roster-data' }

    static get template() 
    {
        return html``
    }

    static get properties()
    {
        return {
            rid: { type: Object },
            orders: { type: Array, notify: true },
            queryParams: { type: Object, notify: true },

            numItems: { type: Number, notify: true, computed: '_computeNumItems(orders.*)', },
            currency: { type: String, notify: true, computed: '_computeCurrency(orders.items.splices)', },
            userInfo: { type: Object },
            websiteUrl: { type: String },

            api_action: { type: String, value: 'list-get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            orderid: { type: String, readOnly: true, notify: true, },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
        }
    }
   
    static get observers()
    {
        return [
            '_dataReloadChanged(visible, rid)',
            '_searchHandler(orders.search)',
            // '_log(orders.*)',
        ]
    }
    _log(v) { console.log(v) }

    rid: any
    _searchDebouncer: any
    _datareloadDebouncer: any
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
    websiteUrl: any
    orderid: any
    visible: any
    setItems: any



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

        this.api_action = 'list-get'
        if (this.orders) 
        {
            this.setProperties({
                'orders.id': this.rid,
            })
        }
        else
        {
            this.set('orders', {
                id: this.rid,
            })
        }
        if (this.orders) { this.orders.ptoken = '' }
        this._fetchItems(3)
    }

    _dataReloadChanged(visible, rid)
    {
        if (this._ischanging || visible !== true || rid == undefined) { return }

        // console.log(visible, rid, queryParams)
        this._datareloadDebouncer = Debouncer.debounce(this._datareloadDebouncer, timeOut.after(200), () =>
        {
            this.reload(true)
        })
    }

    _searchHandler(search)
    {
        if (!this.visible ||  this._ischanging || search == undefined) { return }

        this._setSearchingProgress(true)
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1600), () =>
        {
            // console.log(search)
            this.api_action = 'list-get'
            this.orders.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }
        var apiPath = '/api/v1.0/cart/rosteritems-'
        return this.websiteUrl + apiPath + api_action
    }

    _visibleChanged(v, vo)
    {
        //
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

    _fetchItems(attempts, oid?)
    {
        if (!this.visible) { return }

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
            if (this.orders)
            {
                obj['id'] = this.orders['id']
                obj['oid'] = this.orders['oid']
            }

            delete obj.items
            obj.tz = new Date().getTimezoneOffset()
        }

        // else if (this.api_action == 'get')
        // {
        //     //orderID, accessToken - from emails
        //     qp = JSON.parse(JSON.stringify(this.queryParams))
        //     if (oid)
        //     {
        //         qp['orderid'] = oid
        //     }
        // }
        // else if (this.api_action == 'cancel')
        // {
        //     obj = Object.assign(new OrderModel(), { id: oid, AccessToken: this.queryParams ? this.queryParams.accessToken : ''})
        // }

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
            onLoad: this._onLoadDebounced.bind(this, oid),
            onError: this._onError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, attempts, true)
    }

    _onLoadDebounced(oid, e)
    {
        const d = 0
        const t = this._loadmoreCallback ? (this._now() - this._rq_start) : d
        if (t < d)
        {
            this.async(() => { this._onLoad(oid, e) }, d - t)
        }
        else
        {
            this._onLoad(oid, e)
        }
    }

    _onLoad(oid, e)
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
                    if (this.api_action == 'list-get' && this.orders && (updatedModel && !updatedModel.pfirst))
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
                else if (this.api_action == 'cancel')
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
                    this.dispatchEvent(new CustomEvent('api-refund-done', { bubbles: true, composed: true, detail: { model: order } }))
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
            }
            else if (r['error'])
            {
                this._onError(r['error'])
            }

            if (this.api_action == 'cancel') 
            {
                this.api_action = 'get'
            }
        }
        else
        {
            this._onError(r)
        }
    }

    _onError(e)
    {
        this._setSearchingProgress(false)
        this._setFailure(true)
        this._setLoading(false)
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
        if (!res) { return new CartRosterListModel() }

        var slist = Object.assign((update ? update : new CartRosterListModel()), res)
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
        return Object.assign((update ? update : new CartRosterItemModel()), res)
    }

}
