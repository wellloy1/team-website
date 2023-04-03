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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './website-locales.ts.html'
import style from './website-locales.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import '../ui/ui-grid-pagination'
const ptoken_empty = ""


@FragmentDynamic
export class AdminWebsiteLocales extends FragmentBase
{
    static get is() { return 'tmladmin-website-locales' }

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

            APIPath: { type: String, value: '/admin/api/locale/' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true },
            _pagesUpdating: { type: Boolean, notify: true },

            showenBuildReportBtn: { type: Boolean, computed: '_compute_showenBuildReportBtn(userInfo.isAlmighty)' },
        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    oldSort: any
    oldFilters: any

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

        this._buildDataProvider()
    }

    newItemTap(e)
    {
        this._goto(this._urlViewLocale('_new_'))

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _compute_showenBuildReportBtn(isAlmighty)
    {
        return isAlmighty
    }

    async downloadReportTap(e)
    {
        this.api_action = 'get-items-build'
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

    _stringShort(str, len = 100)
    {
        if (!str) { return str }
        return str?.length > len ? str.substring(0, len) + '...' : str
    }
}
