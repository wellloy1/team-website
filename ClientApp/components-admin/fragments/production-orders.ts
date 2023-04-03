import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './production-orders.ts.html'
import style from './production-orders.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import '../ui/ui-grid-pagination'
import '../ui/ui-progress-icon'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const ptoken_empty = ""



@FragmentDynamic
export class AdminProdutionOrders extends FragmentBase
{
    static get is() { return 'tmladmin-production-orders' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            url: { type: String },
            userInfo: { type: Object, },
            queryParams: { type: Object },
            smallScreen: { type: Object },
            dataProvider: { type: Object },

            lazyObserve: { type: String },//image lazyload
            loading: { type: Boolean, notify: true },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            pageSize: { type: Number, value: 15 },
            pfirst: { type: Boolean },
            plast: { type: Boolean },
            ptoken: { type: String, value: ptoken_empty },
            ptoken_next: { type: String, value: ptoken_empty },
            totalElements: { type: Number }, 
            totalPages: { type: Number }, 
            page: { type: Number, value: 0 },
            pages: { type: Array },

            APIPath: { type: String, value: '/admin/api/orderproduction/' },
            // APIPathFile: { type: String, value: '/admin/api/orderproduction/' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true },
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    _pagesUpdating: any
    oldSort: any
    oldFilters: any
    smallScreen: any


    static get observers()
    {
        return [
            '_refreshGridData(visible, queryParams)',
            '_itemsChanged(pages, page)',
            '_pagesUpdatingChanged(_pagesUpdating)',
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        // this.$.dialogconfirm.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogconfirm)
        
        this._buildDataProvider()
    }

    startDlgTap(e)
    {
        this._openDlg(this.$.dialogconfirm as PaperDialogElement)//, (this.smallScreen ? this.querySelector('div') : e.target))
    }

    startTap(e)
    {
        var url = this.websiteUrl + this.APIPath + 'request-batch-order'
        this.url = StringUtil.urlquery(url, {})
        this.cmd(() =>
        {
            this._refresh()
        })
    }

    formatIDs(ids)
    {
        if (!ids) { return '' }
        return ids.join(', ')
    }

    viewItemSet(e)
    {
        var item = e.model.__data.item
        var itemseti = e.model.__data.itemseti
        var url = this._urlViewManOrderItemSet(item.id, itemseti.ManufactureItemSetID) 
        this._goto(url)
    }

    _onView(e)
    {
        var oid = e.target.getAttribute('data-oid')
        var id = e.target.getAttribute('data-id')
        // console.log(oid, id)
        e.preventDefault()
        return false
    }

    // _onDownload(e) 
    // {
    //     var id = e.target.getAttribute('data-id')
    //     var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
    //     // console.log(oid, id, progress)

    //     this.getOrderFile({ id: id }, progress)
    //     e.preventDefault()
    //     return false
    // }

}
