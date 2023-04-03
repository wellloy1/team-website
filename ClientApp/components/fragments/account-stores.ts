import '@polymer/iron-list/iron-list.js'
import '@polymer/paper-fab/paper-fab.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import { IronListElement } from '@polymer/iron-list/iron-list.js'
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
import { StoresData } from '../bll/stores-data'
import '../bll/stores-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-date-time'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import view from './account-stores.ts.html'
import style from './account-stores.ts.css'
import { UserInfoModel } from '../dal/user-info-model'
import { OrganizationsData } from '../bll/organizations-data'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountStoresBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior
const AutocreationStoreID = 'CustomStore'


@FragmentDynamic
export class AccountStores extends AccountStoresBase
{
    static get is() { return 'teamatical-account-stores' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
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
    loadingMore: any
    stores: any
    userInfo: UserInfoModel


    get storeslist() { return this.$['list'] }
    get storeslistVirtual() { return this.$['gridList'] as IronListElement}
    get storesData() { return this.$['stores-data'] as StoresData }



    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        var scrollHdl = (e) => 
        {
            if (this.visible && this.storeslistVirtual) { this.storeslistVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        if (this.parentElement) { this.parentElement.addEventListener('scroll', scrollHdl) }
    }

    _isvirtual(storei_sid)
    {
        // console.log(storei_sid, AutocreationStoreID)
        return storei_sid == AutocreationStoreID
    }

    _isnotarch(isarchive, storei_sid)
    {
        return !isarchive || this._isvirtual(storei_sid) 
    }

    _isarch(isarchive, storei_sid)
    {
        return isarchive || this._isvirtual(storei_sid) 
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
            if (this.visible) { this.storeslistVirtual.fire('iron-resize') }
        })
    }

    _computeSingle(storesLength)
    {
        return storesLength == 1
    }

    _computeMany(storesLength)
    {
        return storesLength > 1 || storesLength == 0
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
                title: this._accountTitle(this.userInfo?.orgName, 'stores-title-document'),
            }
        }))
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || saving !== false // || loading !== false
    }

    _adminsList(e)
    {
        var storei = e.model.__data.storei
        this._gotoAccountStoreAdmins(storei?.sid)
    }

    _onMakeAsDefault(e)
    {
        if (!e.model) { return }
        var storei = e.model.__data.storei
        this.storesData.makeAsDefault(storei)
    }

    _onAddTap(e)
    {
        var dialog_msg = (this.userInfo.orgName ? this.localize('stores-addnew-org-msg', 'organization', this.userInfo.orgName) : this.localize('stores-addnew-msg'))
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                announce: this.localize('stores-addnew-announce'),
                message: dialog_msg,
                buttons: [
                    {
                        title: this.localize('stores-addnew-cancel'),
                        ontap: (e) => 
                        {
                        }
                    },
                    {
                        title: this.localize('stores-addnew-ok'),
                        ontap: (e) => 
                        {
                            this.storesData.addNew()
                        }
                    },
                ],
            }
        }))
    }

    _archiveItem(e)
    {
        if (!e.model) { return }
        var storei = e.model.__data.storei
        this.storesData.archiveStore(storei)
    }
    _unarchiveItem(e)
    {
        if (!e.model) { return }
        var storei = e.model.__data.storei
        this.storesData.unarchiveStore(storei)
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }

}