import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { Currency, CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { UIBase } from '../ui/ui-base'
import { UIImage } from '../../components/ui/ui-image'
import '../shared-styles/common-styles'
import view from './catalog-plugin-products-item.ts.html'
import style from './catalog-plugin-products-item.ts.css'
// const Teamatical: TeamaticalGlobals = window['Teamatical']


@CustomElement
export class AdminCatalogPluginProductsItem extends UIBase
{
    static get is() { return 'tmladmin-catalog-plugin-products-item' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            categoryId: { type: String },
            item: { type: Object },
            editing: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            deleting: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            isOrganization: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            smallScreen: { type: Boolean },

            priceRegularShow: { type: Boolean, computed: '_existsPrice(item.price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(item.price.ListPrice, item.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            priceDiscounts: { type: Array, computed: '_computeDisounts(item.price.DiscountOffers, item.price.AppliedDiscounts)' },

            _hideEditDelayed: { type: Boolean, value: true, notify: true },
            _hideEdit: { type: Boolean, computed: '_computeHideEdit(editing)' },

            hideProfit: { type: Boolean, computed: '_hideProfitCompute(editing, isOrganization)' },
        }
    }

    constructor()
    {
        super()
    }

    _ready: any
    _editDebouncer: any
    _hideEditDelayed: any
    smallScreen: any
    editing: any
    deleting: any
    websiteUrl: string
    categoryId: string


    
    get img() { return (this.$['img'] instanceof UIImage) ? this.$['img'] : null }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
        this._ready = true

        this.addEventListener('tap', (e:Event) =>
        {
            if (this.editing && this.smallScreen && this.$ && this.$.title)
            {
                var epath: any = e.path || e.composedPath()
                var txt = epath[0]
                if (txt.tagName != 'INPUT')
                {
                    txt = this.shadowRoot.querySelector('paper-input:not([hidden=""]')
                }
                if (txt) 
                {
                    txt.blur()
                    txt.focus()
                }
            }
        })
    }

    newProductTap(e)
    {
        var dhost = e.target.__dataHost
        var itemi = dhost.__data.item
        var iteminx = dhost.__dataHost.__data.itemsIndex
        // console.log(iteminx, itemi)
        this.dispatchEvent(new CustomEvent('api-admin-catalog-plugin-item-new', {
            bubbles: true, composed: true, detail: {
                index: iteminx,
                item: itemi
            }
        }))
    }

    gotoProductConfTap(e)
    {
        var itemi = e.target.__dataHost.__data.item
        var path = this._urlViewProductConfiguration(itemi.BaseUrl, itemi.ID)
        window.open(path, '_newtab')
    }

    gotoProductConfAdminTap(e)
    {
        var itemi = e.target.__dataHost.__data.item
        var path = this._urlViewProduct(itemi.ProductID)
        window.open(path, '_newtab')
    }

    _urlViewProductConfiguration(baseUrl, pconfid)
    {
        if (!pconfid) { return '' }
        return [baseUrl, 'detail', this.categoryId, encodeURI(pconfid)].join('/')
    }

    _urlViewProduct(productid)
    {
        if (!productid) { return '' }
        return '/admin/product?productid=' + encodeURI(productid)
    }

    _urlItem(item, editing?)
    {
        if (editing) { return '#' }
        return item.name ? [item.BaseUrl, 'detail', 'store', item.name].join('/') : null
    }

    _computeHideEdit(editing)
    {
        var v = !editing

        this._editDebouncer = Debouncer.debounce(this._editDebouncer, timeOut.after(250), () =>
        {
            this._hideEditDelayed = v
        })

        return v
    }

    _hideProfitCompute(editing, isOrganization)
    {
        // isOrganization = false
        return !editing || !isOrganization
    }

    _deleteTap(e)
    {
        e.preventDefault()

        const epath = e.path || e.composedPath()
        for (var i in epath)
        {
            var listitem:any = null
            if (epath[i] instanceof AdminCatalogPluginProductsItem) 
            {
                listitem = epath[i]
                if (listitem && listitem.__data)
                {
                    var data = listitem.__data.item
                    this.deleting = true
                    this.async(() =>
                    {
                        this.dispatchEvent(new CustomEvent('api-admin-catalog-plugin-item-delete', { bubbles: true, composed: true, detail: { item: data } }))
                        this.deleting = false
                    }, 200)
                }
                break
            }
        }

        return false
    }
}
