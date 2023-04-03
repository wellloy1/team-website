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
import 'multiselect-combo-box'
import { property } from '@polymer/decorators'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './orders.ts.html'
import style from './orders.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-order-item'
import '../../components/ui/ui-payment-type'
import '../../components/ui/ui-user-inline'
import '../ui/ui-grid-pagination'
import '../ui/ui-progress-icon'
import '../shared-styles/common-styles'
import { UserInfoModel } from '../../components/dal/user-info-model'
const ptoken_empty = ""


@FragmentDynamic
export class AdminOrders extends FragmentBase
{
    static get is() { return 'tmladmin-orders' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            env: { type: String, },
            userInfo: { type: Object, },
            websiteUrl: { type: String },
            smallScreen: { type: Object },
            url: { type: String },
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

            APIPath: { type: String, value: '/admin/api/order/' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true }, 

            // api_summary_keys_popup: { type: Object, value: { 'show_popup': 1, 'filter-required': 1 } },
            showenBuildReportBtn: { type: Boolean, computed: '_compute_showenBuildReportBtn(userInfo.isAdmin, userInfo.isPartner)' },

           
            _filterArchive: { type: Object, value: 'false' },
            _filterSandbox: { type: Object, value: 'false' },
            _filterStatus: { type: Object, value: [
                "shipped",
                "in production",
                "ready for production",
                "payment pending",
                "payment captured",
            ] },
            _firstAttach: { type: Boolean, value: true },
	    
            isOrganization: { type: Boolean, value: false }, //ORGANIZATION-ORDERS!!!!
	    
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    _pagesUpdating: any
    oldSort: any
    oldFilters: any
    userInfo: UserInfoModel
    _filterArchive: any
    _filterStatus: any
    _filterSandbox: any
    _assignEnvDebouncer: Debouncer
    _firstAttach: boolean

    static get observers()
    {
        return [
            '_refreshGridData(visible, queryParams)',
            '_itemsChanged(pages, page)',
            '_pagesUpdatingChanged(_pagesUpdating)',
            '_assignEnv(env, _firstAttach)',
        ]
    }
    _log() { console.log(...arguments) }

    connectedCallback()
    {
        super.connectedCallback()

        this.async(() => { this._firstAttach = false }, 100)
    }

    disconnectedCallback()
    {
        this._firstAttach = true

        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _assignEnv(env, _firstAttach)
    {
        var t = this._firstAttach ? 170 : 17
        this._assignEnvDebouncer = Debouncer.debounce(this._assignEnvDebouncer, timeOut.after(t), () =>
        {
            if (env == 'Development')
            {
                this._filterSandbox = '' 
                this._filterArchive = ''
                this.set('_filterStatus', [])
            }
            else if (env == 'Production' && this._isUser(this.userInfo?.profile?.sub, { 'krs': 1 }))
            {
                this._filterArchive = ''
                this._filterSandbox = 'false'
                this.set('_filterStatus', [])
            }
            
            var initFilter = { }
            if (this._filterArchive)
            {
                initFilter['Archive'] = this._filterArchive
            }
            if (this._filterSandbox)
            {
                initFilter['Sandbox'] = this._filterSandbox
            }
            if (this._filterStatus.length > 0)
            {
                initFilter['Status'] = this._filterStatus.join(',')
            }
            if (Object.keys(initFilter).length > 0)
            {
                this._buildDataProvider(initFilter)
            }
            else
            {
                this._buildDataProvider()
            }
        })
    }

    _compute_showenBuildReportBtn(isAdmin, isPartner)
    {
        return isAdmin || isPartner
    }

    async downloadReportTap(e)
    {
        this.api_action = 'get-items-report'
        const api_url = this.api_url
        this.api_action = 'get-items'

        var prodnewObj: any = {  
            ps: 2147483647,
            tz: new Date().getTimezoneOffset(),
            filters: this.oldFilters,
        }
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        progress.active = true
        await this.cmdPostDownload(api_url, prodnewObj)
        progress.active = false

        if (e.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }
}
