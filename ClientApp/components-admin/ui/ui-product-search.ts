import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { NetBase } from '../../components/bll/net-base'
import view from './ui-product-search.ts.html'
import style from './ui-product-search.ts.css'
import '../shared-styles/common-styles'
import { CustomElement } from '../../components/utils/CommonUtils'
import '../../components/ui/paper-expansion-panel'
import '../ui/ui-dialog'
import '../ui/production-sewing-item'
import { UIAdminDialog } from '../ui/ui-dialog'
import { StringUtil } from '../../components/utils/StringUtil'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys




@CustomElement
export class UIProductSearch extends UIBase
{
    static get is() { return 'tmladmin-ui-product-search' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            scrollTarget: { type: String, },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },
            smallScreen: { type: Object },

            visible: { type: Boolean, notify: true, },
            failure: { type: Boolean, notify: true, reflectToAttribute: true },
            loading: { type: Boolean, notify: true, reflectToAttribute: true },

            icon: { type: String, computed: '_compute_icon(userInfo)' },

            search: { type: Object, value: {} },

            APIPath: { type: String, value: '/admin/api/workstation/qa-' },
            api_action: { type: String, value: 'search' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: [] },
        }
    }

    static get observers()
    {
        return [
            '_searchInput(search.SearchManufactureOrderID, search.SearchBatchID, search.SearchOrderID)',
            // '_log(a)',
        ]
    }

    _log(v) { console.log(v) }

    _searchDebouncer: Debouncer
    api_action: string
    private _netbase: NetBase
    api_url: string
    private _updateLock: boolean
    search: any
    loading: boolean
    
    get search_dialog() { return this.$['search_dialog'] as UIAdminDialog }


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    onInputChanged(e)
    {

    }

    onItemTap(e)
    {
        if (this.search_dialog) { this.search_dialog.close() }
    }

    _filterTap(e)
    {
        
    }

    _filterKeydown(e)
    {
        
    }

    _compute_icon(userInfo)
    {
        return 'admin-icons:search'
    }

    _firstSearch = true 
    _searchInput(searchManufactureOrderID, searchBatchID, searchOrderID)
    {
        if (this._updateLock) { return }

        this.loading = true
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1200), async () =>
        {
            if (this._firstSearch)
            {
                this._firstSearch = false
                if (searchManufactureOrderID == "" && searchBatchID == "" && searchOrderID == "") 
                { 
                    this.loading = false
                    return 
                }
            }
            // console.log(this.search)
            if (!this._netbase) { this._netbase = new NetBase() }
            var search = Object.assign({}, this.search) as any
            delete search.SearchResults
            for (var i of Object.keys(search))
            {
                if (search[i]) { search[i] = search[i].trim() }
            }
            
            var r = await this._netbase._apiRequest(this.api_url, search)
            // console.log(r)
            this.loading = false
            this._updateLock = true
            this.search = r.result
            this._updateLock = false
        })
    }

    _openDialogTap(e?)
    {
        if (this.search_dialog)
        {
            // this.set('search_dialog', { loading: true })
            this.search_dialog.open()
        }
    }


    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        if (!websiteUrl || !APIPath || !api_action) { return '' }
        return websiteUrl + APIPath + api_action
    }

}
