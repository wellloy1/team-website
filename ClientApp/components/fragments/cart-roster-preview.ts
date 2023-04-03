import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
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
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './cart-roster-preview.ts.html'
import style from './cart-roster-preview.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../bll/cart-roster-data'
import '../ui/ui-button'
import '../ui/ui-loader'
import '../ui/ui-network-warning'
import '../ui/ui-order-item'
import { CartRosterData } from '../bll/cart-roster-data'
import { IronListElement } from '@polymer/iron-list/iron-list.js';
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountOrderRosterBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior



@FragmentDynamic
export class AccountOrderRoster extends AccountOrderRosterBase
{
    static get is() { return 'teamatical-cart-roster-preview' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },
            categories: { type: Array },

            numItems: { type: Number },
            currency: { type: String },
            orders: { type: Object, },
            orderView: { type: Boolean, notify: true, },
            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            loadingMore: { type: Boolean, notify: true, }, 

            _isNoOrders: { type: Boolean, computed: '_computeIsNoOrders(orders.items, failure, offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(orders.items, failure, offline, loading)' },

            _numItems: { type: Number, computed: '_computeNumItems(numItems)' }, 
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasInitialItems: { type: Boolean, computed: '_computeHasInitialItem(_numItems, loading)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(orders.*, orders.items.length, loading)' },
            _hasNoMoreItems: { type: Boolean, computed: '_computeHasNoMoreItems(orders.pfirst, orders.plast, loading)' },
            hideCountTitle: { type: Boolean, computed: '_computeHideCountTitle(orderView)' },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
            searchingProgress: { type: Boolean },
            _hideSearchInput: { type: Boolean, computed: '_computeHideSearchInput(orderView)' },
        }
    }

    static get observers()
    {
        return [
            '_ordersListChanged(orders, orders.*)',
        ]
    }

    _listScrollTop: any
    isAttached: any
    loadingMore: any
    userInfo: any
    orders: any
    orderView: any
    visible: any


    get orderlist() { return this.$['list'] }
    get orderlistVirtual() { return this.$['gridList'] as IronListElement }
    get ordersData() { return this.$['cart-roster-data'] as CartRosterData }


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        var scrollHdl = (e) => 
        {
            if (this.visible && this.orderlistVirtual) { this.orderlistVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        if (this.parentElement) { this.parentElement.addEventListener('scroll', scrollHdl) }
    }

    allOrdersTap(e)
    {
        if (this.userInfo && this.userInfo.isAuth)
        {
            this._gotoAccount()
        }
        else
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('order-listdlg-message'),
                    buttons: [
                        {
                            title: this.localize('order-listdlg-btn-signin'),
                            ontap: (e) => 
                            {
                                this.dispatchEvent(new CustomEvent('ui-user-auth', {
                                    bubbles: true, composed: true, detail: {
                                        signin: true,
                                        href: this._hrefAccount()
                                    }
                                }))
                            }
                        },
                        {
                            title: this.localize('order-listdlg-btn-account'),
                            ontap: (e) => 
                            {
                                this._gotoAccountOrders()
                            }
                        },
                    ],
                }
            }))
        }
    }

    moreOrdersTap(e)
    {
        if (!e.target) { return }

        var se = document.documentElement
        this._listScrollTop = se.scrollTop
        this.loadingMore = true
        this.ordersData.loadMore(() =>
        {
            this.loadingMore = false
            if (this.visible) { this.orderlistVirtual.fire('iron-resize') }
        })
    }

    // cancelOrderTap(e)
    // {
    //     var orderi = e.model.__data.orderi

    //     //order-button-cancel
    //     this.dispatchEvent(new CustomEvent('api-show-dialog', {
    //         bubbles: true, composed: true, detail: {
    //             message: this.localize('order-cancel-confirm', 'oid', orderi.id),
    //             buttons: [
    //                 {
    //                     title: this.localize('order-cancel-btn-remove'),
    //                     ontap: (e) => 
    //                     {
    //                         var oid = orderi.id
    //                         this.ordersData.cancelOrder(oid)
    //                     }
    //                 },
    //                 {
    //                     title: this.localize('order-cancel-btn-leave'),
    //                     ontap: (e) => 
    //                     {
    //                         // console.log(e)
    //                     }
    //                 },
    //             ],
    //         }
    //     }))
    // }

    showCancelledStatus(status)
    {
        return status == 'cancelled' || status == 'cancel requested'

    }

    // hideCancelableMsg(orderi)
    // {
    //     return orderi.Cancelable || orderi.Canceled
    // }

    hideCancelBtn(orderi)
    {
        return !orderi.Cancelable // || orderi.Canceled
    }

    _loadMoreProgress(loading, loadingMore)
    {
        return loading && loadingMore
    }

    _computeSingle(ordersLength)
    {
        return ordersLength <= 1
    }

    _computeMany(ordersLength)
    {
        return ordersLength > 1
    }

    _computeNumItems(ordersLength)
    {
        return Math.abs(ordersLength)
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
        var v = numItems > 0 && !loading && (this.orders && this.orders.search === undefined)
        if ((!(this.orders && this.orders.search === undefined) && numItems == 0) || (this.orders && this.orders.search) || loading || this.orderView)
        {
            v = true
        }
        // console.log(numItems, loading, '===>', v)
        return v
    }

    _computeHasSearchedItems(ordersP, numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.orders && this.orders.search !== undefined)
        if ((this.orders && this.orders.search === undefined) || loading || this.orderView)
        {
            v = true
        }
        // console.warn(numItems, loading, (!this.orders || this.orders.search !== undefined), '->', v)
        return v
    }

    _computeHasNoMoreItems(pfirst, plast, loading)
    {
        return plast == true && pfirst !== true // && !loading
    }

    _computeHideSearchInput(orderView)
    {
        return orderView
    }

    _computeIsNotConn(orders, failure, offline, loading)
    {
        var v = (Array.isArray(orders) || loading !== true || failure === true)
        // console.log('orders ' + orders + ', off:' + offline + ', fail:' + failure + ', loading:' + loading + '   ->>>> _isNotConn ' + v)
        return v
    }

    _computeIsNoOrders(orders, failure, offline) //
    {
        return !Array.isArray(orders) || failure === true
    }

    _tryReconnect()
    {
        this.ordersData.reload()
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
                title: this._accountTitle(this.userInfo?.orgName, 'orders-title-document'),
            }
        }))
    }

    _ordersListChanged(orders, ordersList)
    {
        // this._scrollDebouncer = Debouncer.debounce(this._scrollDebouncer, timeOut.after(100), () =>
        // {
        //     if (this._listScrollTop) { scroll({ top: this._listScrollTop, behavior: 'silent' }) }
        // })
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }
}
