import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/iron-icon/iron-icon'
import { html } from '@polymer/polymer/polymer-element'
// import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
// import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
// import { flush } from '@polymer/polymer/lib/utils/flush.js'
// import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
// import { ProductData } from '../bll/product-data'
import { Currency, CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { UIBase } from '../ui/ui-base'
import { FragmentBase } from '../fragments/fragment-base'
import '../../components/ui/ui-image'
import '../ui/ui-progress-icon'
import '../ui/ui-changes-history'
import '../ui/ui-dropdown-menu'
import '../shared-styles/common-styles'
import view from './production-order-item.ts.html'
import style from './production-order-item.ts.css'
import { PaperSpinnerLiteElement } from '@polymer/paper-spinner/paper-spinner-lite'



@CustomElement
export class AdminProductionOrderItem extends FragmentBase 
{
    static get is() { return 'tmladmin-production-order-item' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            entry: { type: Object, observer: '_entryChanged' },
            userInfo: { type: Object, },
            websiteUrl: { type: String },
            lazyObserve: { type: String },
            actionDisabled: { type: Boolean, reflectToAttribute: true },
            smallScreen: { type: Boolean, reflectToAttribute: true },

            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.ImageUrlSwap, smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesA(entry.Title, entry.ImageUrls)', },

            APIPath: { type: String, value: '/admin/api/orderproduction/item-' },
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
    uiimages: any 
    entry: any
    url: string
    websiteUrl: string
    APIPath: string

    // _urlViewManOrderItemSet = FragmentBase.prototype._urlViewManOrderItemSet
    // _urlDownloadOrderProductionItem = FragmentBase.prototype._urlDownloadOrderProductionItem
    // _openDlg = FragmentBase.prototype._openDlg
    // getOrderFile = FragmentBase.prototype.getOrderFile
    // cmd = FragmentBase.prototype.cmd

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

    _dis(a, negativeB)
    {
        return a || !negativeB
    }

    _formatObject(obj) 
    { 
        return JSON.stringify(obj) 
    }

    _formatManufactureOrders(manufactureOrderItems)
    {
        if (!manufactureOrderItems) { return manufactureOrderItems }

        var manufactureOrders = {}
        for (var i of manufactureOrderItems)
        {
            var morder = manufactureOrders[i.ManufactureOrderID]
            if (!morder)
            {
                morder = { }
                manufactureOrders[i.ManufactureOrderID] = morder
            }
            var batch = morder[i.ItemSetID]
            if (!batch)
            {
                batch = { }
                morder[i.ItemSetID] = batch 
            }
            batch[i.ItemID] = 1
        }

        var arr = Object.keys(manufactureOrders).map(i => {
            return {
                ManufactureOrderID: i,
                Batches: Object.keys(manufactureOrders[i]).map( j => {
                    return {
                        BatchID: j,
                        ManufactureOrderID: i,
                        Items: Object.keys(manufactureOrders[i][j]).map(k => { return { Barcode: k } })
                    }
                })
            }
        })
        // console.log(manufactureOrders, arr)

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

    _obj2Array(obj)
    {
        
        if (!obj) { return [] }

        return Object.keys(obj).map(function (key)
        {
            // console.log({
            //     key: key,
            //     value: obj[key]
            // })
            return {
                key: key,
                value: obj[key]
            }
        })
    }

    _convertSwColor(hex)
    {
        return 'fill:#' + hex + ';'
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
        
        // console.log(v)
        var t = this.entry.animIndex ? 120 * this.entry.animIndex : 27

        // this._qtyMax = Math.max(12, v.quantity)

        this.async(() =>
        {
            this.classList.add('show')
        }, t)
    }


    _onDownloadTap(e) 
    {
        var id = e?.target?.getAttribute('data-id')
        var progress = e?.target?.parentElement?.parentElement?.querySelector('paper-spinner-lite')
        this.getOrderFile({ id: id }, progress)
        e.preventDefault()
        return false
    }

    resetIntermidiateVersionTap(e)
    {
        var progress = e?.target?.parentElement?.querySelector('paper-spinner-lite') as PaperSpinnerLiteElement
        var detail = { 
            resetIntermidiateVersion: true, 
            entry: this.entry,
            // uibtn: e?.target,
            uiprogress: progress 
        }
        this.dispatchEvent(new CustomEvent('tmladmin-production-order-item', { bubbles: true, composed: true, detail: detail }))
    }

    reprocessConfirmTap(e)
    {
        var progress = e?.target?.parentElement?.querySelector('paper-spinner-lite') as PaperSpinnerLiteElement
        var detail = { 
            reprocess: true, 
            entry: this.entry,
            uiprogress: progress 
        }
        this.dispatchEvent(new CustomEvent('tmladmin-production-order-item', { bubbles: true, composed: true, detail: detail }))
    }

    preferedPackingQuantityTap(e)
    {
        var progress = e?.target?.parentElement?.querySelector('paper-spinner-lite') as PaperSpinnerLiteElement
        var detail = { 
            preferedPackingQuantity: true, 
            entry: this.entry,
            uiprogress: progress 
        }
        this.dispatchEvent(new CustomEvent('tmladmin-production-order-item', { bubbles: true, composed: true, detail: detail }))
    }

    showBarcodesTap(e)
    {
        var detail = { 
            showBarcodes: true, 
            entry: this.entry,
            batchi: e.model.__data.batchi
        }
        this.dispatchEvent(new CustomEvent('tmladmin-production-order-item', { bubbles: true, composed: true, detail: detail }))
    }
}