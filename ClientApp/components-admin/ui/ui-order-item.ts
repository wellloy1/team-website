import '@polymer/iron-media-query/iron-media-query.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'

import { CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { ProductData } from '../../components/bll/product-data'
import { FragmentBase } from '../fragments/fragment-base'
import { UIBase } from '../ui/ui-base'
import '../../components/ui/ui-image'
import '../../components/ui/ui-select'
import '../ui/ui-progress-icon'
import view from './ui-order-item.ts.html'
import style from './ui-order-item.ts.css'
import '../shared-styles/common-styles'


@CustomElement
export class UIAdminOrderItem extends UIBase 
{
    static get is() { return 'tmladmin-ui-order-item' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            lazyObserve: { type: String },
            userInfo: { type: Object },
            entry: { type: Object, observer: '_entryChanged' },
            index: { type: String },
            // websiteUrl: { type: String },
            // scrollTarget: { type: String, },

            actionDisabled: { type: Boolean, reflectToAttribute: true }, //action-disabled
            smallScreen: { type: Boolean, reflectToAttribute: true },
            isCart: { type: Boolean, reflectToAttribute: true },
            isAddtocart: { type: Boolean, reflectToAttribute: true },
            loadingCmd: { type: Boolean },
            
            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.item.Product.ImageUrlSwap, smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesA(entry.item.Product.Title, entry.item.Product.ImageUrls)', },
            _qtyMax: { type: Number, value: 12 },
            _optionList: { type: Array, notify: true, computed: '_computeOptionList(_qtyMax)', },

            priceRegularShow: { type: Boolean, computed: '_existsPrice(entry.price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(entry.price.ListPrice, entry.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(entry.price.SalePriceFinal, entry.price.Currency)' },
            priceDiscounts: { type: Array, computed: '_computeDisounts(entry.price.DiscountOffers, entry.price.AppliedDiscounts)' },

            isOrganization:{ type: Boolean, value: false },
            isSizeSelector: { type: Array, computed: '_compute_isSizeSelector(userInfo.isAdmin, isOrganization)' },
            isPlayerInfoEdit: { type: Array, computed: '_compute_isPlayerInfoEdit(userInfo.isAdmin, isOrganization)' },
            isProductConfigurationReplace: { type: Array, computed: '_compute_isProductConfigurationReplace(userInfo.isAdmin, isOrganization)' },
            isProductAdminLink: { type: Array, computed: '_compute_isProductAdminLink(userInfo.isAdmin, isOrganization)' },
        }
    }

    static get observers()
    {
        return [
            // '_log(actionDisabled)',
        ]
    }
    _log(v) { console.log('admin-order-item', v) }

    _urlViewProduct = FragmentBase.prototype._urlViewProduct
    _urlViewProductManufacturer = FragmentBase.prototype._urlViewProductManufacturer

    _observer: any 
    _ready: any
    _checkVisibilityDebouncer: any
    _qtyMax: any
    uiimages: any 
    entry: any
    isOrganization: boolean
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

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    dis_show_qaimages(actionDisabled, isQaPictureAvailable)
    {
        return actionDisabled || !isQaPictureAvailable
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

    _compute_isSizeSelector(isAdmin, isOrganization)
    {
        return isAdmin && !isOrganization
    }

    _compute_isPlayerInfoEdit(isAdmin, isOrganization)
    {
        return isAdmin && !isOrganization
    }

    _compute_isProductConfigurationReplace(isAdmin, isOrganization)
    {
        return isAdmin && !isOrganization
    }

    _compute_isProductAdminLink(isAdmin, isOrganization)
    {
        return !(isAdmin && !isOrganization)
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

    _formatSizeTitle(manufi, mList)
    {
        return manufi && manufi.SizeTitle ? manufi.SizeTitle : this.localize('detail-size')
    }

    _hrefStore(baseUrl, store)
    {
        if (!store) { return '' }
        return [baseUrl, 'store', store.sid].join('/')
    }

    _buildProductUrlTarget(entry)
    {
        if (!entry || !entry.item) { return }

        if (!(entry.item.Roster && entry.item.Roster.id))
        {
            return '_blank'
        }

        return ''
    }

    _buildProductConfigUrl(entry)
    {
        var dedicated = this.isCart ? 'cart' : 'order'
        var path = [entry.item.BaseUrl, 'detail', dedicated, entry.item.ProductConfigurationID].join('/')
        var qobj = ProductData.product_query(entry, {}, dedicated)
        return StringUtil.urlquery(path, qobj)
    }

    _buildProductUrl(entry)
    {
        if (!entry || !entry.item) { return }
        

        if (entry.item.Roster && entry.item.Roster.id)
        {
            var path = (this.isOrganization ?  '/admin/organization-order-roster' : '/admin/order-roster' )
            var qobj: any = { orderid: entry.oid, rosterid: entry.id }
            // if (this.entry.item.BaseUrl) { path = this.entry.item.BaseUrl + path}
            return StringUtil.urlquery(path, qobj)
        }
        else
        {
            return this. _buildProductConfigUrl(entry)
        }
    }

    //for admin console..
    _hrefOrganization(org)
    {
        if (!org) { return '' }
        return ['/admin', 'organization?orgid=' + org.OrganizationID].join('/')
    }

    _rosterEdit(e)
    {
        if (!this.entry || !this.entry.item || !this.entry.item.Roster || !this.entry.item.Roster.id) { return }
        var roster = this.entry.item.Roster
        // var pconf = this.entry.item

        var path = ['/account-roster', roster.id].join('/')
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

        this._goto(StringUtil.urlquery(path, qobj))
    }

    // _changeProductConfTap(e)
    // {
    //     var progress = e.target.parentElement.querySelector('paper-spinner-lite')
    //     this.dispatchEvent(new CustomEvent('order-item-change-pcid', { bubbles: true, composed: true, detail: { entry: this.entry, progress: progress } }))
    // }

    _useOwnPCIDTap(e)
    {
        this.set('entry.replacepcid', this.entry.item.ProductConfigurationID)
    }

    addToCartTap(e)
    {
        this.dispatchEvent(new CustomEvent('order-item-addtocart', { bubbles: true, composed: true, detail: { orderItemID: this.entry.id } }))
    }

    showQAImagesTap(e)
    {
        this.dispatchEvent(new CustomEvent('order-item-qaimages', { bubbles: true, composed: true, detail: { entry: this.entry } }))
    }

}