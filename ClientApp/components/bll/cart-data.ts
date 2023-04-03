import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class CartData extends NetBase
{
    static get is() { return 'teamatical-cart-data' }

    static get template() 
    {
        return html`<app-localstorage-document key="cart-cache" data="{{cartCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            cart: { type: Array, notify: true },
            numItems: { type: Number, notify: true, value: 0 },
            currency: { type: String, notify: true },
            cartDetails: { type: Object, notify: true },

            cartCache: { type: Array, notify: true, value: null, observer: '_cartCacheChanged' },
            route: { type: Object, },
            userInfo: { type: Object },
            websiteUrl: { type: String },
            selectedPage: { type: String },

            _loading: { type: Boolean, value: false, notify: true, readOnly: true, observer: '_loadingChanged' },
            _loadingQueue: { type: Array, notify: true, value: [] },

            loading: { type: Boolean, notify: true, computed: '_computeLoading(_loading)' },
            failure: { type: Boolean, value: false, notify: true, readOnly: true, },
            visible: { type: Boolean, observer: '_visibleChanged' },
        }
    }

    static get observers()
    {
        return [
            '_authChanged(userInfo, userInfo.*)',
        ]
    }

    _reloadAuthDebouncer: any
    _ischanging: any
    _loading: any
    _loadingQueue: any
    _set_loading: any
    _setFailure: any
    _lastUserInfo: any
    failure: any
    cart: any
    currency: any
    cartCache: any
    websiteUrl: any
    route: any
    numItems: number
    cartDetails: any
    
        
    connectedCallback()
    {
        super.connectedCallback()
    }

    addItem(entry)
    {
        var citem = entry

        // if (Array.isArray(this.cart))
        // {
        //     for (var i in this.cart)
        //     {
        //         var ei = this.cart[i]
        //         if (ShopProductData.product_compare(ei.item, citem.item))
        //         {
        //             var qty = parseInt(ei.quantity, 10)
        //             ei.quantity = qty + 1
        //             break
        //         }
        //     }
        // }

        citem.added = true
        // citem.quantity = 2147483647 //test max value
        this.setItem(citem)
    }

    setItem(entry)
    {
        var citem = entry
        // console.log(citem)
        if (!this.cart) { this.cart = [] }

        let i = this._indexOfEntry(citem)
        // console.log(i)
        var qty = parseInt(citem.quantity, 10)
        if (qty === 0) 
        {
            // Remove item from cart when the new quantity is 0.
            if (i !== -1) 
            {
                this._removeItemRequest(citem) //api
            }
        }
        else 
        {
            // Use Polymer's array mutation methods (`splice`, `push`) so that observers on `cart.splices` are triggered.
            if (i !== -1) 
            {
                // this.splice('cart', i, 1, citem)
                this._updateItemRequest(citem) //api
            }
            else 
            {
                // citem.animIndex = this.cart.length
                // this.push('cart', citem)
                this._addItemRequest(citem) //api
            }
        }
    }

    _indexOfEntry(entry)
    {
        if (!this.cart) { return -1 }

        for (var si in this.cart)
        {
            var storei = this.cart[si]
            for (var ci in storei.items)
            {
                var itemi = storei.items[ci]
                if (itemi.id === entry.id)
                {
                    return { si: si, ci: ci }
                }
            }
        }
        return -1
    }

    clearCart(gid)
    {
        this.reloadCart()
    }

    setCartCount(count)
    {
        this.numItems = count
    }

    setCart(cartObj)
    {
        if (!cartObj) { return }

        this.numItems = cartObj['ShoppingCartCount']
        var stores = cartObj['stores']
        this.currency = cartObj['Currency'] || (stores && stores.length > 0 ? stores[0].Currency : undefined)
        this.setCartItems(stores ? stores : [])
        this.cartDetails = null
    }

    setCartGroup(cartObj)
    {
        if (!cartObj) { return }

        this.numItems = cartObj['ShoppingCartCount']
        var recentStores = this.cart
        let storei = cartObj?.stores && cartObj.stores.length > 0 ? cartObj.stores[0] : undefined
        if (recentStores && storei)
        {
            var inx = -1
            recentStores.find((i, index, array) => {
                if (i.gid == storei.gid)
                {
                    inx = index
                    return true
                }
                return false
            })
            if (inx >= 0)
            {
                recentStores[inx] = storei
                this.currency = cartObj['Currency'] || (storei ? storei.Currency : undefined)
                this.setCartItems(recentStores ? Object.assign([], recentStores) : [])
                this.cartDetails = null
            }
        } 
        else if (!recentStores)
        {
            this.setCart(cartObj)
        }
    }

    setCartItems(stores)
    {
        if (!stores) { return }

        //animation indexes
        var inx = 0
        Object.keys(stores).forEach((si) =>
        {
            var items = stores[si].items
            // var has_disabled_product = false
            Object.keys(items).forEach((ci) => 
            {
                inx += 1
                items[ci].animIndex = inx
                items[ci].added = false
                
                //temp fix
                // if (items[ci].item?.Product?.ProductDisabled && !items[ci].notAvailable)
                // {
                //     items[ci].notAvailable = items[ci].item?.Product?.ProductDisabled
                //     items[ci].notAvailableReason = items[ci].item?.Product?.ProductDisabledReason
                //     has_disabled_product = true
                // }
            })
            // if (has_disabled_product)
            // {
            //     stores[si].summary = { Key: 'has_disabled_product', Message: 'Sold Out'}
            // }
        })

        if (this._loadingQueue.length == 0)
        {
            // console.log('_loadingQueue is Empty ... ')
            this._ischanging = true
            this.set('cart', stores)
            this._ischanging = false
        }

        // //save data
        // this._ischanging = true
        // this.set('cartCache', stores)
        // this._ischanging = false
    }

    reloadCart(reset?)
    {
        if (reset) { this.cart = null }

        // console.log('cart-reload :' + reset)
        this._fetchItems(3)
    }

    _authChanged(userInfo, userInfoP)
    {
        // console.log('cart-data', userInfoP)
        // reload cart on any page
        // if ((this._lastUserInfo?.isAuth !== userInfo?.isAuth 
        //     || this._lastUserInfo?.profile?.sub !== userInfo?.profile?.sub)
        //     && this.route.path.indexOf('/checkout') != 0)
        // {
        //     this._reloadAuthDebouncer = Debouncer.debounce(this._reloadAuthDebouncer, timeOut.after(600), () =>
        //     {
        //         this.reloadCart()
        //     })
        // }

        this._lastUserInfo = userInfo
    }

    _cartCacheChanged(v)
    {
        if (!v || this._ischanging) { return }

        //disable caching for loading from razor view
        // this._ischanging = true
        // this.set('cart', v)
        // this._ischanging = false
    }

    _visibleChanged(v, vo)
    {
        //console.log('cart-visible :' + v)
        if (!(vo === false && v === true)) { return }

        this.reloadCart()
    }

    _computeLoading(loading)
    {
        // console.log('_computeLoading: ' + loading + ', ' + this._loadingQueue.length)
        return loading || this._loadingQueue.length > 0
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-shoppingcart-loading', { bubbles: true, composed: true, detail: { loading: v } }))
    }

    // _computeNumItems(cart, cart_splices)
    // {
    //     if (!cart) { return 0 }

    //     return cart.reduce((total, storei) =>
    //     {
    //         var qtys = storei.items.reduce((totale, entryi) =>
    //         {
    //             var qty = parseInt(entryi.quantity, 10)
    //             return totale + qty
    //         }, 0)

    //         return total + qtys
    //     }, 0)
    // }

    _removeItemRequest(entry, attempts?)
    {
        this._buildRequest('remove', entry, attempts)
    }

    _updateItemRequest(entry, attempts?)
    {
        if (this._ischanging) { return }
        this._buildRequest('update', entry, attempts)
    }

    _addItemRequest(entry, attempts?)
    {
        this._buildRequest('add', entry, attempts)
    }

    _fetchItems(attempts?)
    {
        // if (this.cartCache)
        // {
        //     this._ischanging = true
        //     this.set('cart', this.cartCache)
        //     this._ischanging = false
        // }

        this._buildRequest('get', null, attempts)
    }

    _buildRequest(action, entry, attempts)
    {
        if (this._reloadAuthDebouncer) { this._reloadAuthDebouncer.cancel() }

        var apiurl = this.websiteUrl + '/api/v1.0/cart/' + action
        var rq:any = null
        if (action === 'get')
        {
            rq = {
                url: apiurl,
                onLoad: this._onLoad.bind(this, action),
                onError: this._onError.bind(this, action)
            }
        }
        else
        {
            var obj = JSON.parse(JSON.stringify(entry)) //clone
            obj.quantity = parseInt(obj.quantity, 10)
            delete obj.added
            delete obj.animIndex
            delete obj.price
            if (action !== 'add') { obj.item = null }

            rq = {
                url: apiurl,
                body: obj,
                method: "POST",
                handleAs: "json",
                debounceDuration: 300,
                onLoad: this._onLoad.bind(this, action),
                onError: this._onError.bind(this, action)
            }
        }
        rq['attempts'] = attempts
        this._requestQueue(rq)
    }

    _requestQueue(rq)
    {
        var autostart = (this._loadingQueue.length == 0)
        this._loadingQueue.push(rq)
        // console.log('_requestQueue ' + rq.url + ' ' + this._loadingQueue.length)

        if (autostart && !this._loading) 
        {
            this._requestsHandleNext()
        }
    }

    _requestsHandleNext()
    {
        // console.log(this._loadingQueue.length)
        var rq = this._loadingQueue.shift()
        if (!rq) { return }

        // console.log(rq)
        this._setFailure(false)
        this._set_loading(true)
        this._getResource(rq, rq.attempts, true)
    }

    _onLoad(action, e)
    {
        var r = e['response']

        if (r && r['success'] && r['result'])
        {
            var cartData = r['result']
            this.setCart(cartData)

            if (action == 'add' && this._loadingQueue.length < 1)
            {
                this.dispatchEvent(new CustomEvent('api-cart-item-added', { bubbles: true, composed: true, detail: { 
                    entry: cartData 
                } }))
            }
        }
        else
        {
            this.cartDetails = r ? r['details'] : null
            this._setFailure(true)
            if (action == 'add' && this._loadingQueue.length < 1)
            {
                this.dispatchEvent(new CustomEvent('api-cart-item-added', { bubbles: true, composed: true, detail: { 
                    failed: true,
                    summary: r ? r['summary'] : null,
                    details: r ? r['details'] : null,
                } }))
            }
        }
        this._set_loading(false)

        if (!this.failure && this._loadingQueue.length > 0)
        {
            this._requestsHandleNext()
        }
    }

    _onError(action, e)
    {
        this._setFailure(true)
        this._set_loading(false)
        if (action == 'add')
        {
            this.dispatchEvent(new CustomEvent('api-cart-item-added', { bubbles: true, composed: true, detail: { 
                failed: true,
            } }))
        }
    }

}