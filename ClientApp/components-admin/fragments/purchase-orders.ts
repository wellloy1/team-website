import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import { property } from '@polymer/decorators';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './purchase-orders.ts.html'
import style from './purchase-orders.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-order-item'
import '../../components/ui/ui-user-inline'
import '../shared-styles/common-styles'
import '../ui/ui-grid-pagination'

const ptoken_empty = ""



@FragmentDynamic
export class AdminPurchaseOrders extends FragmentBase
{
    static get is() { return 'tmladmin-purchase-orders' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            url: { type: String },
            dataProvider: { type: Object },

            lazyObserve: { type: String },//image lazyload
            loading: { type: Boolean, notify: true },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            pageSize: { type: Number, value: 10 },
            pfirst: { type: Boolean },
            plast: { type: Boolean },
            ptoken: { type: String, value: ptoken_empty },
            ptoken_next: { type: String, value: ptoken_empty },
            totalElements: { type: Number }, 
            totalPages: { type: Number }, 
            page: { type: Number, value: 0 },
            pages: { type: Array },

            APIPath: { type: String, value: '/admin/api/purchaseorder/' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true }, 

            _filterStatus: { type: Object, value: 'Waiting approve' },
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    _pagesUpdating: any
    oldSort: any
    oldFilters: any

    static get observers()
    {
        return [
            '_refreshGridData(visible, queryParams)',
            '_itemsChanged(pages, page)',
            '_pagesUpdatingChanged(_pagesUpdating)',
            // '_log(_filterStatus)',
        ]
    }
    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        this._buildDataProvider(true)
    }

    _formatCurrencyID3(id3)
    {
        return id3 ? id3.toUpperCase() : id3
    }
    // _createInvoiceDisabled(loading, invoiceID, orderCount)
    // {
    //     return loading || (invoiceID !== undefined || orderCount < 1)
    // }

    // createInvoiceTap(e)
    // {
    //     var item = e.model.__data.item
    //     var progress = e.target.parentElement.querySelector('paper-spinner-lite')

    //     progress.active = true
    //     var url = this.websiteUrl + this.APIPath + 'invoice'
    //     this.url = StringUtil.urlquery(url, { purchaseOrderID: item.PurchaseOrderID })
    //     this.cmd(() =>
    //     {
    //         progress.active = false
    //         this._refresh()
    //     })


    //     e.preventDefault()
    //     return false
    // }

    // payApproveTap(e)
    // {
    //     var item = e.model.__data.item
    //     var progress = e.target.parentElement.querySelector('paper-spinner-lite')

    //     progress.active = true
    //     var url = this.websiteUrl + this.APIPath + 'approve'
    //     this.url = StringUtil.urlquery(url, { purchaseOrderID: item.PurchaseOrderID })
    //     this.cmd(() =>
    //     {
    //         progress.active = false
    //         this._refresh()
    //     })


    //     e.preventDefault()
    //     return false
    // }

    // needRefundTap(e)
    // {
    //     var item = e.model.__data.item
    //     var progress = e.target.parentElement.querySelector('paper-spinner-lite')

    //     progress.active = true
    //     var url = this.websiteUrl + this.APIPath + 'refunded'
    //     this.url = StringUtil.urlquery(url, { purchaseOrderID: item.PurchaseOrderID })
    //     this.cmd(() =>
    //     {
    //         progress.active = false
    //         this._refresh()
    //     })


    //     e.preventDefault()
    //     return false
    // }

}
