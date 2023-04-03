import '@polymer/iron-list/iron-list.js'
import '@polymer/paper-fab/paper-fab.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import { IronListElement } from '@polymer/iron-list/iron-list.js';
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
import { PurchaseOrdersData } from '../bll/purchase-orders-data'
import '../bll/purchase-orders-data'
import { Clipboard } from '../utils/CommonUtils'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../ui/ui-select'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import view from './account-purchase-orders.ts.html'
import style from './account-purchase-orders.ts.css'
import { UserInfoModel } from '../dal/user-info-model'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountPurchaseOrdersBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class AccountPurchaseOrders extends AccountPurchaseOrdersBase
{
    static get is() { return 'teamatical-account-purchase-orders' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },

            orders: { type: Object, notify: true, },
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

            maxlength: { type: String, value: "7" },
            pattern: { type: String, value: '[0-9]{1,7}' },

            loadingGet: { type: Boolean, computed: '_computeLoadingGet(loading, saving)' },
            _numItems: { type: Number, computed: '_computeNumItem(numItems)' },
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _hasItems: { type: Boolean, computed: '_computeHasItem(_numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(orders.items.length)' },
            _hasInitialItems: { type: Boolean, computed: '_computeHasInitialItem(_numItems, loading)' },
            _isNoPurchaseOrders: { type: Boolean, computed: '_computeIsNoPurchaseOrders(orders.items, failure, offline)' },
            _hasNoMoreItems: { type: Boolean, computed: '_computeHasNoMoreItems(orders.pfirst, orders.plast, loading)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(orders.items, failure, offline, loading)' },
            actionNotAllowed: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
        }
    }

    static get observers()
    {
        return [
            '_delayedEditing(orders.*)',
            // '_log(orders.*)',
        ]
    }

    _listScrollTop: any
    _delayedEditDebouncers: any = {}
    _firstFocusInput: any
    _firstFocusInputDebouncer: any
    isAttached: any
    visible: any
    orders: any
    loadingMore: any
    userInfo: UserInfoModel


    get orderlist() { return this.$['list'] }
    get ordersData()  { return this.$['purchase-orders-data'] as PurchaseOrdersData }
    get orderlistVirtual() { return this.$['gridList'] as IronListElement }


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        var scrollHdl = (e) => 
        {
            if (this._listScrollTop !== undefined)
            {
                if (this.visible && this.orderlistVirtual) { this.orderlistVirtual.fire('iron-resize') }

                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        this.parentElement.addEventListener('scroll', scrollHdl)
        // console.log(this.parentElement)
        // document.querySelector('#tmapp').addEventListener('scroll', scrollHdl)
    }

    formatLimitPrice(v, cur)
    {
        v = parseInt(v) * 100
        return this._formatPrice(v, cur)
    }

    _title(title, purchaseOrderID, created)
    {
        if (!title)
        {
            var pseudoID = StringUtil.replaceAll(StringUtil.hashCode(purchaseOrderID).toString(), '-', '')
            title = `${pseudoID} - ${this._formatDate(created, this.language)}`
        }
        return this.localize('purchase-orders-item-title', 'title', title)
    }

    _CopyPurchaseOrderIDTap(e)
    {
        if (!e || !e.target) { return }

        var orderi = e.model.__data.orderi
        const handleToken = (tok) => 
        {
            Clipboard.copyFromString(tok)
            this.showToast(this.localize('purchase-orders-id-toast-clipboard'))
        }

        if (orderi && orderi.PurchaseOrderID)
        {
            if (e instanceof KeyboardEvent)
            {
                var keycode
                var wevent: any = window.event
                if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

                if ((!e.ctrlKey && !e.altKey && keycode == 13))
                {
                    handleToken(orderi.PurchaseOrderID)
                }
            }
            else
            {
                handleToken(orderi.PurchaseOrderID)
            }
        }
    }

    _delayedEditing(ordersP)
    {
        // console.log(ordersP)
        var inx = ordersP.path.indexOf('.editing')
        if (inx > 0 && ordersP.path.length == (inx + 8))
        {
            var pre = ordersP.path.substring(0, inx)
            var val = ordersP.value
            this._delayedEditDebouncers[ordersP.path] = Debouncer.debounce(this._delayedEditDebouncers[ordersP.path], timeOut.after(200), () => {
                this.set(pre + '.editingDelayed', val)
            })
        }
    }

    disabledOrderApprove(orderi)
    {
        return !orderi.PurchaseOrderID || orderi.InvoiceID
    }

    hideOrderApprove(orderi, orderi_editing)
    {
        return false || orderi_editing
    }

    hideInvoiceView(orderi, orderi_editing)
    {
        return !orderi.InvoiceID || orderi_editing
    }

    _hiddenCheckoutCode(editing, status)
    {
        return editing || status == 'Closed'
    }

    _log(ordersP)
    {
        console.log(ordersP)
    }

    saveTap(e)
    {
        // console.log(e)
        var inx = e.model.__data.index
        var orderi = e.model.__data.orderi
        var itemi_editing = orderi.editing ? false : true

        var epath = e.path || e.composedPath()
        var el = epath ? epath.filter(i => { return i.classList && i.classList.contains('order') }) : null
        this.ordersData.save(orderi, (e) =>
        {
            // var inputs = el && el[0] ? el[0].querySelectorAll('paper-input, teamatical-ui-select') : []
            // this._firstFocusInputDebouncer = Debouncer.debounce(this._firstFocusInputDebouncer, timeOut.after(300), () =>
            // {
            //     if (inputs && inputs.length > 0) { this._focusAndScroll(inputs[0], -66) }
            // })
            if (e?.success) 
            { 
                this.set(`orders.items.${inx}.notvalid`, {}) 
                this._updateEditing(inx, itemi_editing)
            }
        })
    }

    discardTap(e)
    {
        var inx = e.model.__data.index
        var orderi = e.model.__data.orderi
        var itemi_editing = orderi.editing ? false : true

        this._discardItem(inx, itemi_editing)
    }

    _discardItem(inx, itemi_editing)
    {
        this.set(`orders.items.${inx}.notvalid`, {})
        this._updateEditing(inx, itemi_editing)
    }

    _startEdit(e)
    {
        var inx = e.model.__data.index
        var orderi = e.model.__data.orderi
        var itemi_editing = orderi.editing ? false : true
        this._updateEditing(inx, itemi_editing)

        if (!itemi_editing) 
        {
            this.set(`orders.items.${inx}.notvalid`, {})
            return 
        }

        //focus on items
        var epath = e.path || e.composedPath()
        var el = epath ? epath.filter(i => { return i.classList && i.classList.contains('order-header') }) : null
        var inputs = el && el[0] ? el[0].querySelectorAll('paper-input, teamatical-ui-select') : null
        //editing-heading
        if (inputs && inputs.length > 1)
        {
            this._firstFocusInputDebouncer = Debouncer.debounce(this._firstFocusInputDebouncer, timeOut.after(300), () =>
            {
                if (typeof inputs[1].getBoundingClientRect == 'function' && !this._elementInViewport(inputs[1]))
                {
                    this._focusAndScroll(inputs[1], -66)
                }
            })
        }
    }    

    _updateEditing(inx, itemi_editing)
    {
        var items = this.orders.items
        var oldStateEditing = Array.isArray(this.orders?.items) ? items[inx]?.editing : false

        var restoreItem = (items, i) => {

            if (items[i].before)
            {
                for (var k in items[i].before)
                {
                    this.set('orders.items.' + i + '.' + k, items[i].before[k])
                }
                this.set('orders.items.' + i + '.before', null)
            }
        }

        //reset others
        for (var i in items)
        {
            var ii = parseInt(i)
            if (ii != inx && itemi_editing)
            {
                if (items[i].editing)
                {
                    this.set('orders.items.' + i + '.editing', false)
                    restoreItem(items, i)
                }
            }
        }

        //set recent
        if (!oldStateEditing && itemi_editing)
        {
            this.set('orders.items.' + inx + '.before', {
                TotalAmountLimit: items[inx].TotalAmountLimit,
                TotalAmountOrderLimit: items[inx].TotalAmountOrderLimit,
            })
        }
        else
        {
            restoreItem(items, inx)
            this.set('orders.items.' + inx + '.before', null)
        }
        this.set('orders.items.' + inx + '.editing', itemi_editing)
    }

    _loadMore(e)
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

    _computeHasItem(ordersLength)
    {
        return ordersLength > 0
    }

    _computeNumItem(ordersLength)
    {
        return Math.abs(ordersLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHasSearchedItems(ordersLength)
    {
        return ordersLength > 0 || !this.orders.search
    }

    _computeHasInitialItem(numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.orders && this.orders.search === undefined)
        if ((!(this.orders && this.orders.search === undefined) && numItems == 0) || (this.orders && this.orders.search) || loading) 
        {
            v = true
        }
        return v
    }

    _computeIsNotConn(orders_items, failure, offline, loading)
    {
        var v = (Array.isArray(orders_items) || loading !== true || failure === true)
        // console.log('products ' + products + ', off:' + offline + ', fail:' + failure + ', loading:' + loading + '   ->>>> _isNotConn ' + v)
        return v
    }    

    _computeIsNoPurchaseOrders(items, failure, offline) //
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
        this.ordersData.refresh()
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
                title: this._accountTitle(this.userInfo?.orgName, 'purchase-orders-title-document'),
            }
        }))
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false
    }

    _computeLoadingGet(loading, saving)
    {
        return loading && !saving
    }

    _adminsList(e)
    {
        var orderi = e.model.__data.orderi
        this._gotoAccountOrderAdmins(orderi?.PurchaseOrderID)
    }

    _onMakeAsDefault(e)
    {
        if (!e.model) { return }
        var orderi = e.model.__data.orderi
        this.ordersData.makeAsDefault(orderi)
    }

    onInputChanged(e)
    {
        var epath = e.path || e.composedPath()
        var orderi = e.model.__data.orderi
        this.ordersData.resetError(orderi, epath[0].name)
        // epath[0].invalid = false
    }

    closeTap(e)
    {
        //
    }

    _onAddTap(e)
    {
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                announce: this.localize('purchase-orders-addnew-announce'),
                message: this.localize('purchase-orders-addnew-msg'),
                buttons: [
                    {
                        title: this.localize('purchase-orders-addnew-cancel'),
                        ontap: (e) => 
                        {
                        }
                    },
                    {
                        title: this.localize('purchase-orders-addnew-ok'),
                        ontap: (e) => 
                        {
                            this.ordersData.addNew()
                        }
                    },
                ],
            }
        }))
    }

    _archiveItem(e)
    {
        if (!e.model) { return }
        var orderi = e.model.__data.orderi
        this.ordersData.archiveStore(orderi)
    }

    _unarchiveItem(e)
    {
        if (!e.model) { return }
        var orderi = e.model.__data.orderi
        this.ordersData.unarchiveStore(orderi)
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }


    _onKeydownEvent(e)
    {
        if (!this.visible) { return }

        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!e.shiftKey && !e.altKey && !e.ctrlKey && keyboardEventMatchesKeys(e, 'esc') && Array.isArray(this.orders?.items))
        {
            for (var inx in this.orders.items)
            {
                if (this.orders.items[inx].editing)
                {
                    this._discardItem(inx, false)
                }
            }
        }
    }
}