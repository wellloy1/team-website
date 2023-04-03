import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'

import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { CustomElement } from '../utils/CommonUtils'
import { ProductData } from '../bll/product-data'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-select'
import '../ui/ui-quantity'
import '../ui/ui-image'
import '../ui/ui-date-time'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-cart-item.ts.html'
import style from './ui-cart-item.ts.css'



@CustomElement
export class UICartItem extends UIBase 
{
    static get is() { return 'teamatical-ui-cart-item' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            entry: { type: Object, observer: '_entryChanged' },
            userInfo: { type: Object },
            actionDisabled: { type: Boolean, reflectToAttribute: true },

            deleting: { type: Boolean },
            deleted: { type: Boolean, reflectToAttribute: true },
            smallScreen: { type: Boolean, reflectToAttribute: true },
            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.item.Product.ImageUrlSwap, smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesA(entry.item.Product.Title, entry.item.Product.ImageUrls, true)', },
            productImagesCount: { type: Array, computed: '_compute_productImagesCount(entry.item.Product.ImageUrls)', reflectToAttribute: true },
            _qtyMax: { type: Number, value: 12 },
            _optionList: { type: Array, notify: true, computed: '_computeOptionList(_qtyMax)', },

            hidePrices: { type: Boolean, computed: '_compute_hidePrices(entry.hideprices)', reflectToAttribute: true },
            priceRegularShow: { type: Boolean, computed: '_existsPrice(entry.price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(entry.price.ListPrice, entry.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceDiscounts: { type: Array, computed: '_computeDisounts(entry.price.DiscountOffers, entry.price.AppliedDiscounts)' },

            tooltipDirection: { type: String,  computed: '_compute_tooltipDirection(smallScreen)' },
        }
    }

    static get observers()
    {
        return [
            // '_log(entry)',
        ]
    }

    _log(v) { console.log('ui-cart-item', v) }

    _ready: any
    _checkVisibilityDebouncer: any
    deleting: any
    deleted: any
    entry: any

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

    isQtyForcedByAdmin(isAdmin, qtyStep, quantity)
    {
        return isAdmin && (quantity % qtyStep !== 0)
    }

    _compute_tooltipDirection(smallScreen)
    {
        return smallScreen ? 'left' : 'up'

    }

    _compute_hidePrices(item_hidePrices)
    {
        return item_hidePrices === undefined ? false : item_hidePrices
    }

    _compute_productImagesCount(arr)
    {
        return arr ? arr.length : 0
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

    _rosterCount(rosterCount, qty)
    {
        return isFinite(rosterCount) ? rosterCount * qty : qty
    }

    qtyCaption(qtyStep, rosterSelected)
    {
        var isroster = this._asBool(rosterSelected)
        if (isroster)
        {
            return this.localize('cart-roster-qty')
        }
        else if (qtyStep > 1)
        {
            return this.localize('cart-qty-step', 'step', qtyStep)
        }
        else
        {
            return this.localize('cart-qty')
        }
    }

    _computeImageBkg(imgUrl, smallScreen)
    {
        return !(!imgUrl)
    }

    _removeItem() 
    {
        this.deleting = true
        this.classList.remove('show')

        // var animation = this.animate(
        // [
        //     { transform: 'translateX(0)', opacity: 1, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' },
        //     { transform: 'translateX(100%)', opacity: 1, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' },
        //     { transform: 'translateX(100%)', opacity: 0 }
        // ], 
        // { duration: 750, })

        // animation.onfinish = () =>
        // {
        //     // Preserve end position of the animation
        //     // this.style.transform = 'translateY(100%)';
        //     // this.style.opacity = 0;
        //     // console.log('anim end')
        //     this._setCartItemQty(0);
        // }
    }

    _transEnd(e)
    {
        // console.log(e)
        if (e.propertyName == "transform")
        {
            // this.lazyLoadIfAny()
        }

        if (e.propertyName == "opacity" && e.type == "transitionend"
            && !this.classList.contains('show') && this.deleting == true)
        {
            // console.log(this.entry)
            this._setCartItemQty(0)
        }
    }

    _entryChanged(v, o)
    {
        // console.log(v)
        this.deleted = false
        this.deleting = false

        var t = this.entry.animIndex ? 120 * this.entry.animIndex : 27

        // this._qtyMax = Math.max(12, v.quantity) //need for selector version - failed on unlimited numbers

        this.async(() =>
        {
            this.classList.add('show')
        }, t)
    }

    _quantityChange(e) 
    {
        // console.log(e)
        if (!this._ready) { return }

        var qty = parseInt(e.detail.value, 10)
        // console.log(qty)
        this._setCartItemQty(qty, true)
    }

    _setCartItemQty(quantity, changed?) 
    {
        if (!changed)
        {
            this.entry.qty_old = this.entry.quantity
            this.entry.quantity = quantity
        }
        this.dispatchEvent(new CustomEvent('api-cart-item-set', { bubbles: true, composed: true, detail: { entry: this.entry } }))
    }

    _formatSize(sizes)
    {
        return StringUtil.formatSizes(sizes)
    }

    _formatPlayer(player)
    {
        return StringUtil.formatPlayer(player)
    }

    _buildProductUrl(entry)
    {
        if (!entry || !entry.item) { return '' }

        if (entry?.item?.Roster?.id)
        {
            //     var qobj: any = { 
            //         // oid: this.entry.oid, 
            //     }
            return this._hrefCartRosterPreview(entry?.id)
        }
        else
        {
            return this._hrefDetail(entry?.item?.ProductConfigurationID, 'cart')
        }        
    }

    _rosterEdit(e)
    {
        if (!this.entry || !this.entry.item || !this.entry.item.Roster || !this.entry.item.Roster.id) { return }
        var roster = this.entry.item.Roster
        var pconf = this.entry.item

        var qobj = {
            backurl: window.location.href,
            pid: pconf.ProductConfigurationID,
        }

        if (URL)
        {
            let url = new URL(qobj.backurl)
            url.searchParams.set('rid', roster.id)
            qobj.backurl = url.toString()
        }

        this._gotoAccountRoster(roster?.id, qobj)
    }
}