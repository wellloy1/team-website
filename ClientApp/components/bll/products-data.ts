import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { ProductConfigurationListModel } from '../dal/productconfiguration-list-model'
import { ProductConfigurationModel } from '../dal/product-configuration-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class ProductsData extends NetBase
{
    static get is() { return 'teamatical-products-data' }

    static get template() 
    {
        return html``
        // return html`<app-localstorage-document key="products-cache" data="{{productsCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            products: { type: Array, notify: true },
            productsCache: { type: Array, notify: true, value: {}, observer: '_productsCacheChanged' },
            queryParams: { type: Object, notify: true },

            numItems: { type: Number, notify: true, computed: '_computeNumItems(products.*)', },
            currency: { type: String, notify: true, computed: '_computeCurrency(products.items.splices)', },
            userInfo: { type: Object },
            websiteUrl: { type: String },

            api_action: { type: String, },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            searchingProgress: { type: Boolean, notify: true, readOnly: true },
        }
    }
   
    static get observers()
    {
        return [
            '_dataReloadChanged(visible, productsCache)',
            '_searchHandler(products.search)',
        ]
    }

    _searchDebouncer: any
    _loadmoreCallback: any
    _rq_start: any
    _ischanging: any
    _setSearchingProgress: any
    _setFailure: any
    _setLoading: any
    api_url: any
    api_action: any
    productsCache: any
    products: any
    websiteUrl: any
    visible: any



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
        if (this.products) { this.products.pnumber += 1 }
        this._fetchItems(3)
    }


    reload(reset?)
    {
        if (reset) { this.products = null }

        this.api_action = 'list-get'
        if (this.products) { this.products.ptoken = '' }
        this._fetchItems(3)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.productsCache) { return }

        this.productsCache = {}

        this.async(() =>
        {
            this.reload()
        })
    }

    _productsCacheChanged(v)
    {
        // if (!v || this._ischanging) { return }

        // console.log(v)
        // this._ischanging = true
        // this.set('products', v)
        // this._ischanging = false
    }

    _dataReloadChanged(visible, cache)
    {
        if (visible !== true || !cache) { return }
        if (this._ischanging) { return }

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
            this.products.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _visibleChanged(v, vo)
    {
        if (v !== true) { return }
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-products-loading', { bubbles: true, composed: true, detail: { loading: v } }));
    }

    _computeNumItems(productsP)
    {
        if (!this.products) { return 0 }
        return this.products.totalElements
    }

    _computeCurrency()
    {
        if (!this.products || !Array.isArray(this.products.items) || this.products.items.length < 1) { return '' }

        //TODO: convert if different along of products
        return this.products.items[0].Currency
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }
        var apiPath = '/api/v1.0/user/productconfiguration-'
        return this.websiteUrl + apiPath + api_action
    }

    archiveProduct(product)
    {
        if (!this.visible) { return }

        this.api_action = 'list-archive'
        this._setFailure(false)
        var oid = product?.ProductConfigurationID
        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: product,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onLoad.bind(this, oid),
            onError: this._onError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    unarchiveProduct(product)
    {
        if (!this.visible) { return }

        this.api_action = 'list-unarchive'
        this._setFailure(false)
        var oid = product?.ProductConfigurationID
        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: product,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onLoad.bind(this, oid),
            onError: this._onError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    _fetchItems(attempts, oid?)
    {
        if (!this.visible) { return }
        
        // if (!this.productsCache) { this.productsCache = {} }
        // var cacheItem = this.productsCache
        // if (cacheItem && Array.isArray(cacheItem.items) && cacheItem.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('products.items', cacheItem.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)


        var obj:any = null
        var qp:any = {}
        if (this.api_action == 'list-get')
        {
            if (!(this.products && this.products.ptoken) && !(this.products && this.products.search))
            {
                obj = this._convertJson2Class(undefined)
            }
            else
            {
                obj = this._cloneModel(this.products)
            }
            delete obj.items
            obj.tz = new Date().getTimezoneOffset()
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
                var updatedModel = null
                if (this.api_action == 'list-get' || this.api_action == 'get')
                {
                    updatedModel = this._convertJson2Class(r['result'])
                    this.setModel(updatedModel)
                }
                else if (this.api_action == 'list-archive' || this.api_action == 'list-unarchive')
                {
                    updatedModel = this._convertJson2ClassItem(r['result'])
                    this.setItemModel(updatedModel)
                }
            }
            else if (r['success'] === false)
            {
                var summary = r['summary'] //obj

                if (summary && summary.Key == 'not_logged')
                {
                    this.setModel(this._convertJson2Class(undefined))

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
                            announce: this.localize('products-products-announce'),
                            message: summary.Message,
                            buttons: barr,
                            errorid: r?.errorid ? r.errorid : null,
                            devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                        }
                    }))
                }
                else
                {
                    this._setFailure(true)
                }
            }
            else if (r['error'])
            {
                this._onError(r['error'])
            }

            ///...

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

    setItemModel(updatedItemModel)
    {
        this._ischanging = true
        if (this.api_action == 'list-archive' || this.api_action == 'list-unarchive')
        {
            for (var i in this.products.items)
            {
                var itemi = this.products.items[i]
                if (updatedItemModel.ProductConfigurationID == itemi.ProductConfigurationID)
                {
                    updatedItemModel.animIndex = this.products.items[i].animIndex
                    updatedItemModel.added = false
                    this.set(`products.items.${i}`, updatedItemModel)
                    break
                }
            }
        }
        this._ischanging = false
    }

    setModel(updatedModel)
    {
        if (!updatedModel) { return }

        if (Array.isArray(updatedModel.items))
        {
            Object.keys(updatedModel.items).forEach((i) =>
            {
                updatedModel.items[i].animIndex = 0 //parseInt(i, 10)
                updatedModel.items[i].added = false
            })
        }

        //ui update
        this._ischanging = true
        if (this.api_action == 'list-get' && this.products && (updatedModel && !updatedModel.pfirst))
        {
            for (var i in updatedModel)
            {
                // console.log(i)
                if (i == 'items')
                {
                    for(var j in updatedModel[i])
                    {
                        this.push('products.' + i, updatedModel[i][j])
                        // console.log(updatedModel[i][j])
                    }
                }
                else
                {
                    this.set('products.' + i, updatedModel[i])
                }
            }
            // this.set('products', updatedModel)
            // updatedModel.items = this.products.items.concat(updatedModel.items)
        }
        else
        {
            this.set('products', updatedModel)
        }
        this._ischanging = false
        if (this.api_action == 'list-get' && this._loadmoreCallback) { this._loadmoreCallback() }

        //save data
        // this._ischanging = true
        // var productCacheItem = this._cloneModel(productList)
        // delete productCacheItem.ptoken
        // this.set('productsCache', productCacheItem)
        // this._ischanging = false
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
        if (!res) { return new ProductConfigurationListModel() }

        var slist = Object.assign((update ? update : new ProductConfigurationListModel()), res)
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
        return Object.assign((update ? update : new ProductConfigurationModel()), res)
    }

}
