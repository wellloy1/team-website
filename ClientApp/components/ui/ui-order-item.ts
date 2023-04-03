import '@polymer/iron-media-query/iron-media-query.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'

import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { ProductData } from '../bll/product-data'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-image'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-order-item.ts.html'
import style from './ui-order-item.ts.css'


@CustomElement
export class UIOrderItem extends UIBase 
{
    static get is() { return 'teamatical-ui-order-item' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            lazyObserve: { type: String },
            userInfo: { type: Object },
            entry: { type: Object, observer: '_entryChanged' },
            accessToken: { type: String, },

            actionDisabled: { type: Boolean, reflectToAttribute: true }, //action-disabled
            smallScreen: { type: Boolean, reflectToAttribute: true },
            isAdminConsole: { type: Boolean, value: false, reflectToAttribute: true },
            isCart: { type: Boolean, reflectToAttribute: true },
            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.item.Product.ImageUrlSwap,smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesA(entry.item.Product.Title, entry.item.Product.ImageUrls, true)', },
            _qtyMax: { type: Number, value: 12 },
            _optionList: { type: Array, notify: true, computed: '_computeOptionList(_qtyMax)', },

            hidePrices: { type: Boolean, computed: '_compute_hidePrices(entry.hideprices)', reflectToAttribute: true },
            priceRegularShow: { type: Boolean, computed: '_existsPrice(entry.price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(entry.price.ListPrice, entry.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceDiscounts: { type: Array, computed: '_computeDisounts(entry.price.DiscountOffers, entry.price.AppliedDiscounts)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    _observer: any 
    _ready: any
    _checkVisibilityDebouncer: any
    _qtyMax: any
    uiimages: any 
    entry: any
    isAdminConsole: any
    isCart: any


    get imageproductgrid() { return this.$['image-product-grid'] }


    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener("transitionend", (e) => this._transEnd(e), EventPassiveDefault.optionPrepare())
    }

    ready()
    {
        super.ready()

        this._ready = true
    }

    _compute_hidePrices(item_hidePrices)
    {
        return item_hidePrices === undefined ? false : item_hidePrices
    }

    _computeOptionList(qtyMax)
    {
        var arr = new Array(qtyMax)
        for (var i = 0; i < arr.length; i++)
        {
            arr[i] = i + 1
        }
        return arr
    }

    _computeImageBkg(imgUrl, smallScreen)
    {
        return !(!imgUrl)
    }

    _removeItem() 
    {
        this.classList.remove('show')
    }

    _transEnd(e)
    {
        // console.log(e)
        if (e.propertyName == "transform")
        {
            if (!this.classList.contains('show'))
            {
                // console.log('end delete')
            }
        }
    }

    _entryChanged(v, o)
    {
        // console.log(v)
        var t = this.entry.animIndex ? 120 * this.entry.animIndex : 27

        this._qtyMax = Math.max(12, v.quantity)

        this.async(() =>
        {
            this.classList.add('show')
        }, t)
    }

    _formatSize(sizes)
    {
        return StringUtil.formatSizes(sizes)
    }

    _formatPlayer(player)
    {
        return StringUtil.formatPlayer(player)
    }

    _buildProductUrl(entry, accessToken)
    {
        if (!this.entry || !this.entry.item) { return }
        

        if (this.entry.item.Roster && this.entry.item.Roster.id)
        {
            var qobj: any = { 
                oid: this.entry.oid, 
            }
            if (this.isAdminConsole) { qobj['id'] = this.entry.id }
            if (accessToken) { qobj['accessToken'] = accessToken }
            return this.isAdminConsole ? this._hrefAdminOrderRoster(qobj) : this._hrefAccountOrderRoster(this.entry?.id, qobj)
        }
        else
        {
            //if (this.isAdminConsole) - no admin page yet
            var dedicated = this.isCart ? 'cart' : 'order'
            var qobj = ProductData.product_query(entry, {}, dedicated)
            return this._hrefDetail(entry?.item?.ProductConfigurationID, dedicated, qobj)
        }
    }

    _rosterEdit(e)
    {
        if (!this.entry || !this.entry.item || !this.entry.item.Roster || !this.entry.item.Roster.id) { return }
        var roster = this.entry.item.Roster
        // var pconf = this.entry.item

        var qobj = {
            // backurl: window.location.href,
            // pid: pconf.ProductConfigurationID,
        }
        // if (URL)
        // {
        //     let url = new URL(qobj.backurl)
        //     url.searchParams.set('rid', roster.id)
        //     qobj.backurl = url.toString()
        // }

        this._gotoAccountRoster(roster?.id, qobj)
    }
}