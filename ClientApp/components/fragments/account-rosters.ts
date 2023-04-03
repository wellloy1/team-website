import '@polymer/iron-list/iron-list.js'
import '@polymer/paper-fab/paper-fab.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import { IronListElement } from '@polymer/iron-list'
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
import { RostersData } from '../bll/rosters-data'
import '../bll/rosters-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import view from './account-rosters.ts.html'
import style from './account-rosters.ts.css'
import { UserInfoModel } from '../dal/user-info-model'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountRostersBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class AccountRosters extends AccountRostersBase
{
    static get is() { return 'teamatical-account-rosters' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },

            rosters: { type: Object, },
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
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(rosters.items.length)' },
            _isNoRosters: { type: Boolean, computed: '_computeIsNoRosters(rosters, rosters.items, failure, offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(rosters.items, failure, offline, loading)' },
            _hasNoMoreItems: { type: Boolean, computed: '_computeHasNoMoreItems(rosters.pfirst, rosters.plast, loading)' },
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
    _scrollDebouncer: any
    isAttached: any
    rosters: any
    visible: any
    loadingMore: any
    userInfo: UserInfoModel


    get rosterlist() { return this.$['list'] }
    get rosterlistVirtual():IronListElement { return this.$['gridList'] }
    get rostersData(): RostersData { return this.$['rosters-data'] }



    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        var scrollHdl = (e) => 
        {
            if (this.visible && this.rosterlistVirtual) { this.rosterlistVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        this.parentElement.addEventListener('scroll', scrollHdl)        
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
        this.rostersData.loadMore(() =>
        {
            this.loadingMore = false
            if (this.visible && this.rosterlistVirtual) { this.rosterlistVirtual.fire('iron-resize') }
        })
    }

    _rosterItemTitle(rosterID, rosterTitle)
    {
        var title = rosterTitle ? rosterTitle : rosterID
        return this.localize('rosters-item-title', 'title', title)
    }
    

    _computeSingle(rostersLength)
    {
        return rostersLength <= 1
    }

    _computeMany(rostersLength)
    {
        return rostersLength > 1
    }

    _computeHasItem(rostersLength)
    {
        return rostersLength > 0
    }

    _computeNumItem(rostersLength)
    {
        return Math.abs(rostersLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHasSearchedItems(rostersLength)
    {
        return rostersLength > 0 || !this.rosters.search
    }

    _computeIsNotConn(items, failure, offline, loading)
    {
        var v = (Array.isArray(items) || loading !== true || failure === true)
        return v
    }

    _computeIsNoRosters(model, items, failure, offline) //
    {
        return !model || !Array.isArray(items) || failure === true
    }

    _computeHasNoMoreItems(pfirst, plast, loading)
    {
        return plast == true && pfirst !== true // && !loading
    }

    _tryReconnect()
    {
        this.rostersData.refresh()
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
                title: this._accountTitle(this.userInfo?.orgName, 'rosters-title-document'),
            }
        }))
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || saving !== false //|| loading !== false 
    }
    
    _onMakeAsDefault(e)
    {
        if (!e.model) { return }
        var rosteri = e.model.__data.rosteri
        this.rostersData.makeAsDefault(rosteri)
    }

    _onAddTap(e)
    {
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                announce: this.localize('rosters-addnew-announce'),
                message: this.localize('rosters-addnew-msg'),
                buttons: [
                    {
                        title: this.localize('rosters-addnew-cancel'),
                        ontap: (e) => 
                        {
                        }
                    },
                    {
                        title: this.localize('rosters-addnew-ok'),
                        ontap: (e) => 
                        {
                            this.rostersData.addNew()
                        }
                    },
                ],
            }
        }))
    }

    _archiveItem(e)
    {
        if (!e.model) { return }
        var rosteri = e.model.__data.rosteri
        this.rostersData.archiveStore(rosteri)
    }
    _unarchiveItem(e)
    {
        if (!e.model) { return }
        var rosteri = e.model.__data.rosteri
        this.rostersData.unarchiveStore(rosteri)
    }

    _isnotarch(isarchive, rosteri_id)
    {
        return !isarchive
    }

    _isarch(isarchive, rosteri_id)
    {
        return isarchive
    }    

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }
}