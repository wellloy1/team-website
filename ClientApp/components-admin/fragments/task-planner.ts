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
import '@advanced-rest-client/json-viewer/json-viewer.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import view from './task-planner.ts.html'
import style from './task-planner.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import '../ui/ui-grid-pagination'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const ptoken_empty = ""



@FragmentDynamic
export class AdminTaskPlanner extends FragmentBase
{
    static get is() { return 'tmladmin-task-planner' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            url: { type: String },
            dataProvider: { type: Object },
            smallScreen: { type: Object },

            lazyObserve: { type: String },//image lazyload
            loading: { type: Boolean, notify: true },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            pageSize: { type: Number, value: 20 },
            pfirst: { type: Boolean },
            plast: { type: Boolean },
            ptoken: { type: String, value: ptoken_empty },
            ptoken_next: { type: String, value: ptoken_empty },
            totalElements: { type: Number }, 
            totalPages: { type: Number }, 
            page: { type: Number, value: 0 },
            pages: { type: Array },

            APIPath: { type: String, value: '/admin/api/planner/' },
            api_action: { type: String, value: 'planner-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true }, 
            _pagesUpdating: { type: Boolean, notify: true },

            allowProgress: { type: Boolean, computed: '_compute_allowProgress(visible)' },
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    oldSort: any
    oldFilters: any
    smallScreen: any
    progress: any

    static get observers()
    {
        return [
            '_refreshGridData(visible, queryParams)',
            '_itemsChanged(pages, page)',
            '_pagesUpdatingChanged(_pagesUpdating)'
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        // this.$.dialogcancel.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogcancel)
        // this.$.dialogconfirm.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogconfirm)
        
        this._buildDataProvider()
    }

    _compute_allowProgress(visible)
    {
        return visible && !Teamatical._browser.iPhone
    }

    startDlgTap(e)
    {
        this._openDlg(this.$.dialogconfirm as PaperDialogElement)//, this.smallScreen ? this.querySelector('div') : e.target)
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

    startTestTap(e)
    {
        var url = this.websiteUrl + this.APIPath + 'request-batch-order-test'
        this.url = StringUtil.urlquery(url, {})
        this.cmd(() =>
        {
            this._refresh()
        })
    }

    runForceTap(e)
    {
        var item = e.model.__data.item
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'force-item'
        this.url = StringUtil.urlquery(url, { itemID:item.ID})
        // console.log(item, progress, this.url)
        this.cmd(()=>{ 
            progress.active = false 
            this._refresh()
        })

        e.preventDefault()
        return false
    }

    retryTap(e)
    {
        var item = e.model.__data.item
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'retry-item'
        this.url = StringUtil.urlquery(url, { itemID: item.ID })
        // console.log(item, progress, this.url)
        this.cmd(() => { 
            progress.active = false 
            this._refresh()
        })

        e.preventDefault()
        return false
    }

    removeDialogTap(e)
    {
        var item = e.model.__data.item
        this.progress = e.target.parentElement.querySelector('paper-spinner-lite')

        var url = this.websiteUrl + this.APIPath + 'remove-item'
        this.url = StringUtil.urlquery(url, { itemID: item.ID })

        this._openDlg(this.$.dialogcancel as PaperDialogElement)// e.target)

        e.preventDefault()
        return false
    }

    removeTap(e)
    {
        var progress = this.progress
        progress.active = true
        this.cmd(() => { 
            progress.active = false 
            this._refresh()
        })
    }
}
