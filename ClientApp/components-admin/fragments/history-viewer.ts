import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import '@advanced-rest-client/json-viewer/json-viewer.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { Currency, Clipboard } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './history-viewer.ts.html'
import style from './history-viewer.ts.css'
import style_shared from './shared-styles.css'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../../components/ui/ui-user-inline'
import '../shared-styles/common-styles'
import '../ui/ui-grid-pagination'
import '../ui/ui-dialog'


const ptoken_empty = ""



@FragmentDynamic
export class AdminHistoryViewer extends FragmentBase
{
    static get is() { return 'tmladmin-history-viewer' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            queryParams: { type: Object },
            env: { type: String },
            userInfo: { type: Object, },

            url: { type: String },
            dataProvider: { type: Object },

            lazyObserve: { type: String },//image lazyload
            loading: { type: Boolean, notify: true },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            pageSize: { type: Number, value: 25 },
            pfirst: { type: Boolean },
            plast: { type: Boolean },
            ptoken: { type: String, value: ptoken_empty },
            ptoken_next: { type: String, value: ptoken_empty },
            totalElements: { type: Number }, 
            totalPages: { type: Number }, 
            page: { type: Number, value: 0 },
            pages: { type: Array },

            APIPath: { type: String, value: '/admin/api/historyviewer/' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true }, 
            _pagesUpdating: { type: Boolean, notify: true },

            viewasjson: { type: Boolean, notify: true, value: true }, 
            dialogdetails: { type: Object },
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    oldSort: any
    oldFilters: any
    dialogdetails: any

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

        this._buildDataProvider()

        var grid = this.$.grid as any
        grid.addEventListener('active-item-changed', (e) => 
        {
            console.log(e)
        })
    }

    copyJsonDetailsTap(e)
    {
        var item = e?.model?.__data?.item
        var jsonTxt = item ? item.Details : this.dialogdetails.Details

        Clipboard.copyFromString(jsonTxt)
        this.showToast('JSON copied to clipboard...')
    }

    showDetailsTap(e)
    {
        var itemi = e.model.__data.item

        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true, 
                id: `${itemi.id}`,
                Details: itemi.Details,
            })
            dialogdetails.open()

            this.async(() => { this.set('dialogdetails.loading', false) }, 170)
        }
    }

}