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
import '../bll/store-admins-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-user-inline'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import view from './account-store-admins.ts.html'
import style from './account-store-admins.ts.css'
import { StoreAdminsData } from '../bll/store-admins-data';

const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountStoresBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class AccountStoreAdmins extends AccountStoresBase
{
    static get is() { return 'teamatical-account-store-admins' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

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

            admins: { type: Object, },
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

            _numItems: { type: Number, computed: '_computeNumItem(numItems)' },
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _hasItems: { type: Boolean, computed: '_computeHasItem(_numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(admins.items.length)' },
            _isNoAdministrators: { type: Boolean, computed: '_computeIsNoAdministrators(admins.Administrators, failure, offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(admins.Administrators, failure, offline, loading)' },
            actionNotAllowed: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },
            intiveNotAllowed: { type: Boolean, computed: '_computeInviteNotAllowed(offline, failure, loading, saving, admins.invite)' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    _listScrollTop: any
    route: any
    isAttached: any
    admins: any

    get adminlist() { return this.$['adminlist'] }
    get adminsData() { return this.$['store-admins-data'] as StoreAdminsData }



    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        window.addEventListener('scroll', (e) => 
        {
            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        })
    }

    _routeDataChanged(routeData)
    {
        if (!this.route || this.route.prefix !== '/account-store-admins') { return }

        //if (this.category && this.category.items) //loaded before -> refresh
        // {
        //     this.categoryData.refresh()
        // }
    }

    _computeSingle(adminsLength)
    {
        return adminsLength <= 1
    }

    _computeMany(adminsLength)
    {
        return adminsLength > 1
    }

    _computeHasItem(adminsLength)
    {
        return adminsLength > 0
    }

    _computeNumItem(adminsLength)
    {
        return Math.abs(adminsLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHasSearchedItems(adminsLength)
    {
        return adminsLength > 0 || !this.admins.search
    }

    _computeIsNotConn(items, failure, offline, loading)
    {
        var v = ((items === undefined || (Array.isArray(items) && items.length == 0)) && loading && offline === false && failure === false)
        return !v
    }

    _computeIsNoAdministrators(items, failure, offline) //
    {
        return !Array.isArray(items) || failure === true
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false
    }

    _computeInviteNotAllowed(offline, failure, loading, saving, email)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false || !email
    }

    _tryReconnect()
    {
        // console.log('_tryReconnect')
        this.adminsData.refresh()
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
                title: this.localize('store-admins-title-document', 'sid', 'sid'),
            }
        }))
    }

    _removeAdminTap(e)
    {
        var admini = e.model.__data.admini
        var sid = e.model.__data.admins.StoreID

        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                message: this.localize('store-admins-remove-confirm'),
                buttons: [
                    {
                        title: this.localize('store-admins-remove-btn-remove'),
                        ontap: (e) => 
                        {
                            this.adminsData.removeAdmin(sid, admini)
                        }
                    },
                    {
                        title: this.localize('store-admins-remove-btn-close'),
                        ontap: (e) => 
                        {
                            // console.log(e)
                        }
                    },
                ],
            }
        }))
    }

    _revokeInvite(e)
    {
        var invitei = e.model.__data.invitei
        var sid = e.model.__data.admins.StoreID
        // console.log(e, sid, invitei)
        this.adminsData.revokeInvite(sid, invitei)
    }

    _inviteTap(e)
    {
        //inviteInput
        if (!this._validateForm()) { return }

        var sid = this.admins.StoreID
        var invitei = this.admins.invite
        this.adminsData.inviteAdmin(sid, invitei)
    }

    _validateForm(test?)
    {
        
        var pi:any = this.$.inviteInput
        
        if(pi.validate())
        {
            pi.invalid = false
        }
        else
        {
            // announce error message
            if (pi.errorMessage)
            {
                //var ns = pi.nextElementSibling
                // console.log(pi.errorMessage)
                var em = pi.errorMessage
                this.dispatchEvent(new CustomEvent('announce', {
                    bubbles: true, composed: true,
                    detail: pi.errorMessage
                }))
            }

            this._focusAndScroll(pi)
        }

        return !pi.invalid
    }

    gotoStoreTap()
    {
        this._gotoStore(this.admins?.StoreID)
    }

    gotoStoreListTap(e)
    {
        this._gotoAccountStores()
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }
}