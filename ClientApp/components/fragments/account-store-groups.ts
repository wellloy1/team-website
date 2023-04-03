import '@polymer/iron-list/iron-list.js'
import '@polymer/paper-fab/paper-fab.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import '../bll/store-groups-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import view from './account-store-groups.ts.html'
import style from './account-store-groups.ts.css'
import { StoreGroupsData } from '../bll/store-groups-data';
import { IronListElement } from '@polymer/iron-list/iron-list.js';
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountStoresBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class AccountStoreGroups extends AccountStoresBase
{
    static get is() { return 'teamatical-account-store-groups' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            category: { type: Object },
            categories: { type: Array },
            route: { type: Object },
            routeData: { type: Object, observer: '_routeDataChanged' },

            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },

            stores: { type: Object, },
            total: { type: Number },
            currency: { type: String },

            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            // editing: { type: Boolean, value: true, notify: true, reflectToAttribute: true },
            searchingProgress: { type: Boolean, }, 
            numItems: { type: Number },
            loadingMore: { type: Boolean, notify: true, },

            _numItems: { type: Number, computed: '_computeNumItem(numItems)' },
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _hasItems: { type: Boolean, computed: '_computeHasItem(_numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(stores.items.length)' },
            _isNoStores: { type: Boolean, computed: '_computeIsNoStores(stores.items, failure, offline)' },
            _hasNoMoreItems: { type: Boolean, computed: '_computeHasNoMoreItems(stores.pfirst, stores.plast, loading)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(stores.items, failure, offline, loading)' },
            actionNotAllowed: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    _listScrollTop: any
    isAttached: any
    visible: any
    route: any
    stores: any
    loadingMore: any

    get orderlist() { return this.$['list'] }
    get storegroupsVirtual():IronListElement { return this.$['gridList'] }
    get storesData():StoreGroupsData { return this.$['store-groups-data'] }



    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        var scrollHdl = (e) => 
        {
            if (this.visible && this.storegroupsVirtual) { this.storegroupsVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        this.parentElement.addEventListener('scroll', scrollHdl)
    }

    _routeDataChanged(routeData)
    {
        if (!this.route || this.route.prefix !== '/account-store-groups') { return }

        //if (this.category && this.category.items) //loaded before -> refresh
        // {
        //     this.categoryData.refresh()
        // }
    }

    _loadMoreProgress(loading, loadingMore)
    {
        return loading && loadingMore
    }

    _loadMore(e)
    {
        if (!e.target) { return }

        this.loadingMore = true
        var se = document.documentElement
        this._listScrollTop = se.scrollTop
        this.storesData.loadMore(() =>
        {
            this.loadingMore = false
            if (this.visible && this.storegroupsVirtual) { this.storegroupsVirtual.fire('iron-resize') }
        })
    }

    _computeSingle(storesLength)
    {
        return storesLength <= 1
    }

    _computeMany(storesLength)
    {
        return storesLength > 1
    }

    _computeHasItem(storesLength)
    {
        return storesLength > 0
    }

    _computeNumItem(storesLength)
    {
        return Math.abs(storesLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHasSearchedItems(storesLength)
    {
        return storesLength > 0 || !this.stores.search
    }

    _computeIsNotConn(items, failure, offline, loading)
    {
        var v = (Array.isArray(items) || loading !== true || failure === true)
        return v
    }

    _computeIsNoStores(items, failure, offline) //
    {
        return !Array.isArray(items) || failure === true
    }

    _computeHasNoMoreItems(pfirst, plast, loading)
    {
        return plast == true && pfirst !== true // && !loading
    }

    _tryReconnect()
    {
        // console.log('_tryReconnect')
        this.storesData.refresh()
    }

    _offlineChanged(offline, offlineOld)
    {
        if (offlineOld === true && offline === false && this.isAttached)
        {
            this._tryReconnect()
        }
    }

    _loadingChanged(v)
    {
        // 
    }

    _failureChanged(v)
    {
        // 
    }

    _visibleChanged(visible, o)
    {
        if (!visible) { return }

        if (o === false && visible === true)
        {
            // this.editing = false
        }

        // this._routeDataChangedForcely()

        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                category: 'href:' + this.getAttribute('name'),
                title: this.localize('store-groups-title-document', 'sid', 'sid'),
            }
        }))
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false
    }

    backToStoreTap(e)
    {
        this._gotoStore(this.stores?.StoreID)
    }
    
    viewParticipantsUrl(storei)
    {
        if (!storei) { return '' }
        return this._hrefAccountStoreGroup(storei?.GroupShippingID, { arch: true })
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }
}