import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-checkbox/paper-checkbox'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { scroll } from '@polymer/app-layout/helpers/helpers'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './account-purchase-order.ts.html'
import style from './account-purchase-order.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import '../bll/purchase-order-data'
import '../ui/ui-button'
import '../ui/ui-loader'
import '../ui/ui-image'
import '../ui/ui-network-warning'
import '../ui/ui-order-item'
import { PurchaseOrderData } from '../bll/purchase-order-data';
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior



@FragmentDynamic
export class AccountPurchaseOrder extends AccountBase
{
    static get is() { return 'teamatical-account-purchase-order' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },
            numItems: { type: Number },
            participants: { type: Object, },

            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            lazyload: { type: Boolean, value: true, notify: true, },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            disableApproved: { type: Boolean, value: true },
            disabledCreateInvoice: { type: Boolean, computed: '_compute_disabledCreateInvoice(loading, disableApproved, participants.CanCreateInvoice, participants.HasPendingOrders)' },
            disabledCloseToken: { type: Boolean, computed: '_compute_disabledCloseToken(loading, participants.CanClose)' },
            disabledCancel: { type: Boolean, computed: '_compute_disabledCancel(loading, participants.CanCancel)' },

            _isNoParticipants: { type: Boolean, computed: '_computeIsNoParticipants(participants.items, failure, offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(participants.items, failure, offline, loading)' },

            _numItems: { type: Number, computed: '_computeNumItems(numItems)' }, 
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasInitialItems: { type: Boolean, computed: '_computeHasInitialItem(_numItems, loading)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(numItems, loading)' },
            _hasItems: { type: Boolean, computed: '_computeHasItems(_numItems, numItems, loading)' },
            hideCountTitle: { type: Boolean, computed: '_computeHideCountTitle(orderView)' },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
            searchingProgress: { type: Boolean },
            _hideSearchInput: { type: Boolean, computed: '_computeHideSearchInput(orderView)' },
        }
    }

    static get observers()
    {
        return [
            '_participantsListChanged(participants, participants.*)',

        ]
    }

    _listScrollTop: any
    isAttached: any
    disableApproved: any
    participants: any
    userInfo: any
    orderView: any

    get orderlist() { return this.$['list'] }
    get participantsData():PurchaseOrderData { return this.$['purchase-order-data'] }


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

    showCancelledStatus(status)
    {
        return status == 'cancelled'
    }

    checkboxChangeHandler(e?)
    {
        var approved: boolean | null = null
        var itemSetItems = this.participants.items || []

        for (var i in itemSetItems)
        {
            // for (var j in itemSetItems[i].Items)
            // {
            //     var orders = itemSetItems[i].Items
            //     if (orders[j].approved == true)
            //     {
            //         approved = (approved === false ? false : true)
            //     }
            // }

            if (itemSetItems[i].approved == true)
            {
                approved = (approved === false ? false : true)
            }
        }

        this.disableApproved = !approved
    }

    checkboxAllChangeHandler(e)
    {
        var itemSetItems = this.participants.items || []
        var checked = e.target.checked
        for (var i in itemSetItems)
        {
            // for (var j in itemSetItems[i].Items)
            // {
            //     var orders = itemSetItems[i].Items
            //     orders[j].approved = checked 
            //     this.notifyPath('participants.items.' + i + '.Items.' + j + '.approved')
            // }
            itemSetItems[i].approved = checked 
            this.notifyPath('participants.items.' + i + '.approved')
        }
        this.checkboxChangeHandler()
    }

    cancelTap(e)
    {
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                message: this.localize('purchase-order-dialog-cancelorder-msg'),
                buttons: [
                    {
                        title: this.localize('purchase-order-dialog-cancel-btn'),
                        ontap: (e) => 
                        {
                            //
                        }
                    },
                    {
                        title: this.localize('purchase-order-dialog-cancelorder-btn'),
                        ontap: (e) => 
                        {
                            this.participantsData.cancelAllOrders((e) => 
                            {
                                //
                            })
                        }
                    },
                ],
            }
        }))
    }

    closeTap(e)
    {
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                message: this.localize('purchase-order-dialog-close-msg'),
                buttons: [
                    {
                        title: this.localize('purchase-order-dialog-cancel-btn'),
                        ontap: (e) => 
                        {
                            //
                        }
                    },
                    {
                        title: this.localize('purchase-order-dialog-close-btn'),
                        ontap: (e) => 
                        {
                            this.participantsData.closeToken((e) => 
                            {
                                //
                            })
                        }
                    },
                ],
            }
        }))
    }

    approveAndInvoice(e)
    {
        // console.log(e)
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                message: this.localize('purchase-order-dialog-approve-msg'),
                buttons: [
                    {
                        title: this.localize('purchase-order-dialog-cancel-btn'),
                        ontap: (e) => 
                        {
                            //
                        }
                    },
                    {
                        title: this.localize('purchase-order-dialog-approve-btn'),
                        ontap: (e) => 
                        {
                            this.participantsData.approveSelected((e) => 
                            {
                                //
                            })
                        }
                    },
                ],
            }
        }))
    }

    _printTap(e)
    {
        this.makesureImageIsloaded(this.$.list, () =>
        {
            window.print()
        })
    }

    formatIndex(i)
    {
        return i + 1
    }

    hideCancelableMsg(orderi)
    {
        return orderi.Cancelable || orderi.Canceled
    }

    hideCancelBtn(orderi)
    {
        return !orderi.Cancelable || orderi.Canceled
    }

    _computeSingle(participantsLength)
    {
        return participantsLength <= 1
    }

    _computeMany(participantsLength)
    {
        return participantsLength > 1
    }

    _computeNumItems(participantsLength)
    {
        return Math.abs(participantsLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHideCountTitle(orderView)
    {
        return orderView
    }

    _computeHasInitialItem(numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.participants && this.participants.search === undefined)
        if ((!(this.participants && this.participants.search === undefined) && numItems == 0) || (this.participants && this.participants.search) || loading || this.orderView)
        {
            v = true
        }
        // console.log(numItems, loading, '===>', v)
        return v
    }

    _computeHasSearchedItems(numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.participants && this.participants.search !== undefined)
        if ((this.participants && this.participants.search === undefined) || loading || this.orderView)
        {
            v = true
        }
        // console.warn(numItems, loading, (!this.participants || this.participants.search !== undefined), '->', v)
        return v
    }

    _computeHasItems(numItems, numItems2, loading)
    {
        return numItems > 0 && numItems2 > 0 && loading !== true

    }

    _computeHideSearchInput(orderView)
    {
        return orderView
    }

    _computeIsNotConn(participants, failure, offline, loading)
    {
        var v = (Array.isArray(participants) || loading !== true || failure === true)
        // console.log('participants ' + participants + ', off:' + offline + ', fail:' + failure + ', loading:' + loading + '   ->>>> _isNotConn ' + v)
        return v
    }

    _computeIsNoParticipants(participants, failure, offline) //
    {
        return !Array.isArray(participants) || failure === true
    }

    _tryReconnect()
    {
        this.participantsData.refresh()
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

    _visibleChanged(visible)
    {
        if (!visible) { return }

        let cat = 'href:' + this.getAttribute('name')
        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                category: cat,
                title: this.localize('purchase-order-title-document'),
            }
        }))
    }

    _formatPlayer(player)
    {
        return StringUtil.formatPlayer(player)
    }

    _formatSize(sizes)
    {
        return StringUtil.formatSizes(sizes)
    }

    _participantsListChanged(participants, participantsList)
    {
        // this._scrollDebouncer = Debouncer.debounce(this._scrollDebouncer, timeOut.after(100), () =>
        // {
        //     if (this._listScrollTop) { scroll({ top: this._listScrollTop, behavior: 'silent' }) }
        // })
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }

    _compute_disabledCreateInvoice(loading, disableApproved, canCreateInvoice, hasPendingOrders)
    {
        return loading || disableApproved || !canCreateInvoice || hasPendingOrders
    }

    _compute_disabledCloseToken(loading, canClose)
    {
        return loading || !canClose
    }

    _compute_disabledCancel(loading, canCancel)
    {
        return loading || !canCancel
    }

}
