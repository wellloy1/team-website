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
// import '../ui/ui-image-multiview-3d'
import view from './ui-product-item.ts.html'
import style from './ui-product-item.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
// import { Md5 } from "md5-typescript"
// const MD5 = (str) => { return Md5.init(str).toUpperCase() }
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }



@CustomElement
export class UIProductItem extends UIBase 
{
    static get is() { return 'teamatical-ui-product-item' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            entry: { type: Object, observer: '_entryChanged' },
            visible: { type: Boolean },
            lazyObserve: { type: String },
            grid: { type: Boolean, reflectToAttribute: true },
            actionDisabled: { type: Boolean, reflectToAttribute: true },
            smallScreen: { type: Boolean, reflectToAttribute: true },
            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.Product.ImageUrlSwap,smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesHA(grid, entry.Product.Title, entry.Product.ImageUrls, entry.Product.ImageUrlsHighResolution)', },
            productViews: { type: Array },
            // _qtyMax: { type: Number, value: 12 },
            // _optionList: { type: Array, notify: true, computed: '_computeOptionList(_qtyMax)', },

            hidePrices: { type: Boolean, computed: '_compute_hidePrices(entry.hideprices)', reflectToAttribute: true },
            priceRegularShow: { type: Boolean, computed: '_existsPrice(entry.Price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(entry.Price.SalePriceFinal, entry.Price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(entry.Price.ListPrice, entry.Price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(entry.Price.SalePriceFinal, entry.Price.Currency)' },
            // priceDiscounts: { type: Array, computed: '_computeDisounts(entry.price.DiscountOffers, entry.price.AppliedDiscounts)' },
            priceDiscounts: { type: Array, value: [] },
        }
    }

    static get observers()
    {
        return [
            'monitorProductViews(entry.ProductViews, entry.ProductViews.*)',
            // 'log(productImages)',
        ]
    }

    log() { console.log(...arguments) }

    _observer: any 
    _ready: any
    _checkVisibilityDebouncer: any
    uiimages: any 
    entry: any
    _qtyMax: any
    productViews: any

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

    _computeProductImagesHA(grid, title, imgsUrls, imgsUrlsHires?)
    {
        imgsUrls = grid && Array.isArray(imgsUrls) && imgsUrls.length > 0 ? [imgsUrls[0]] : imgsUrls
        return super._computeProductImagesHA(title, imgsUrls, imgsUrlsHires)
    }

    monitorProductViews(productViews, productViewsP)
    {
        var ar = []
        for (var i in productViews)
        {
            let vi = Object.assign(productViews[i], { ViewId: MD5(productViews[i].ImageUrl), Selected: true })
            ar.push([ vi ])
        }
        this.productViews = ar
    }

    _toArrayViews(imgi)
    {
        var imgO = Object.assign(imgi, { ViewId: MD5(imgi.ImageUrl), Selected: true })
        // console.log(imgO)
        return [imgO]
    }

    _computeProductViewsImages(title = '', imgsUrls = [])
    {
        console.log(title, imgsUrls)
        if (!Array.isArray(imgsUrls)) { return imgsUrls }
        return imgsUrls.map(i => { return { title: title, imgUrl: i.ImageUrl } })
    }


    // _computeOptionList(qtyMax)
    // {
    //     var arr = new Array(qtyMax)
    //     for (var i = 0; i < arr.length; i++)
    //     {
    //         arr[i] = i + 1
    //     }
    //     return arr
    // }

    _computeImageBkg(imgUrl, smallScreen)
    {
        return !(!imgUrl)
    }

    _removeItem() 
    {
        this.classList.remove('show')
    }

    _buildProductUrl(entry)
    {
        if (!entry || !entry.ProductConfigurationID) { return '' }
        return this._hrefDetail(entry.ProductConfigurationID, 'configurations')
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
        if (!this.entry) { return }
        
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
    
}