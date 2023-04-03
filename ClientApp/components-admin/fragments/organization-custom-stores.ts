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
import view from './custom-stores.ts.html'
import style from './custom-stores.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-order-item'
import '../ui/ui-grid-pagination'
import '../shared-styles/common-styles'
const ptoken_empty = ""

@FragmentDynamic
export class AdminOrganizationCustomStores extends FragmentBase
{
    static get is() { return 'tmladmin-organization-custom-stores' }

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

            APIPath: { type: String, value: '/admin/api/store/partner-' },
            api_action: { type: String, value: 'get-items' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            visible: { type: Boolean, notify: true }, 
            _sortCreated: { type: Object },


            isOrganization:{ type: Boolean, value: true },

        }
    }

    _netbase: any
    _netbaseCmd: any
    _observer: any
    _pagesUpdating: any
    oldSort: any
    oldFilters: any
    progress: any

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

        var grid: any = this.$.grid
        grid.itemIdPath = 'StoreID'
    }

    ready()
    {
        super.ready()

        // if (typeof(this.queryParams['sort']) == 'string')
        // {
        //     var s = this.queryParams['sort'].split(',')
        //     if (s.length == 2)
        //     {
        //         this.set(`_sort${s[0]}`, s[1])
        //     }
        // }
        // console.log(this.queryParams['sort'])
        this._buildDataProvider()
    }


    //#region Overriden

    _urlViewStore(storeid)
    {
        var path = ['admin', 'organization-custom-store'].join('/')
        var qobj = { custstoreid: storeid, }
        return StringUtil.urlquery(path, qobj)
    }
    
    //#endregion
    
}
