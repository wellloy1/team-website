import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
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
import { IronListElement } from '@polymer/iron-list'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './order-roster.ts.html'
import style from './order-roster.ts.css'
import style_shared from './shared-styles.css'
import '../ui/ui-order-item'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const AdminOrderRosterBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic 
export class AdminOrderRoster extends AdminOrderRosterBase
{
    static get is() { return 'tmladmin-order-roster' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/order/order-rosteritems-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['orderid', 'rosterid'] },
            queryParamsAsObject: { type: Boolean, value: true },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            dialogcancel_reason: { type: String },

            loadingMore: { type: Boolean, notify: true, },

            isOrganization: { type: Boolean, value: false },
        }
    }

    _netbase: any
    _observer: any
    _listScrollTop: any
    loadingMore: any
    hasUnsavedChanges: boolean
    scrollTarget: any

    
    get rosterlistVirtual() { return this.$['gridList'] as IronListElement}

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            // '_log(userInfo.*, isOrganization)',
        ]
    }
    _log(v) { console.log('order-roster', v) }


    connectedCallback()
    {
        super.connectedCallback()

        this._observerGrid = new FlattenedNodesObserver(this.rosterlistVirtual, (info: any) =>
        {
            // console.log('FlattenedNodesObserver ... ', info)
            if (this.visible) 
            {
                var ilists = this.root ? this.root.querySelectorAll('iron-list') : null
                if (ilists)
                {
                    for (var i of ilists)
                    {
                        // console.log(i)
                        i.fire('iron-resize')
                    }
                }
            }
        })
    }

    ready()
    {
        super.ready()
    }

    reload()
    {
        super.reload(true) //due to it countinous nature - we need to start from scratch
    }

    _oldVisible: boolean
    _dataReloadChanged(visible, queryParams)
    {
        if (!this._oldVisible && visible)
        {
            this.order = null
        }
        this._oldVisible = visible

        super._dataReloadChanged(visible, queryParams)
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveDetailTap()
        }
    }

    hideSaveBtn(product)
    {
        return false
    }

    hideSyncBtn(orderi)
    {
        return false
    }

    hideRefundBtn(orderi)
    {
        return false
    }

    hideCancelBtn(orderi)
    {
        return !orderi.Cancelable || orderi.Canceled
    }

    hideCancelableMsg(orderi)
    {
        return orderi.Cancelable || orderi.Canceled
    }

    hideResnapshotBtn(orderi)
    {
        return false
    }

    saveDetailTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveDetailConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            // if (oldmodel.id != newmodel.id)
            // {
            //     var qp = { rosterid: newmodel.id }
            //     this.queryParams = qp
            //     window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            // }
        })
    }

    cancelOrderTap(e)
    {
        this._openDlg(this.$.dialogcancel as PaperDialogElement)
    }

    resnapshotOrderTap(e)
    {
        this.resnapshotOrder(this.order.id)
    }

    syncOrderTap(e)
    {
        this.syncOrder(this.order.id)
    }

    refundOrderTap(e)
    {
        this._openDlg(this.$.dialogrefund as PaperDialogElement)        
    }

    // viewOrderProduction(e)
    // {
    //     var url = this._urlViewOrderProduction(this.order.OrderProductionID)
    //     this._goto(url)
    // }

    showPayData(e)
    {
        var payi = e.model.__data.payi

        var paydTxt = ''
        try 
        {
            var payd = JSON.parse(payi.PaymentData)
            paydTxt = JSON.stringify(payd, null, "\t")
        }
        catch
        {
            paydTxt = payi.PaymentData
        }
        var dialogdump: any = this.$.dialogdump
        var pre = dialogdump.querySelector('pre')
        pre.innerText = paydTxt
        this._openDlg(dialogdump)
    }

    showHistDetails(e)
    {
        var histi = e.model.__data.histi
        var dialogdump:any = this.$.dialogdump
        var pre = dialogdump.querySelector('pre')
        pre.innerText = histi.Details
        this._openDlg(dialogdump)
    }

    isStripePay(payi)
    {
        // console.log(payi)
        return payi.PaymentMethod && payi.PaymentMethod.id === 'SP'
    }

    isNoPayData(payi)
    {
        return payi.PaymentMethod && 
            (payi.PaymentMethod.id === 'testPayment' || payi.PaymentMethod.id === 'chargeFreePayment')
    }

    onPayRow(e)
    {
        var payi = e.model.__data.payi
        var payd: any = null
        try 
        {
            var payd = JSON.parse(payi.PaymentData)
        }
        catch 
        { 
            //
        }

        if (!payd) 
        { 
            this.showPayData(e)
            return 
        }
        // console.log(payd)

        // const env = this.env == 'Production' ? '.p' : ''
        var arr = ['https://dashboard.stripe.com']
        if (this.order && this.order.Sandbox) { arr.push('test') }

        //URL
        switch (payd.object) 
        {
            case "refund":
                // arr.push('refunds')
                arr.push('payments')
                break;
            default:
            case "charge":
                arr.push('payments')
                break;
        }
        //ID
        switch (payd.object) 
        {
            case "refund":
                // arr.push(payd.id)
                arr.push(payd.ChargeId)
                break;
            default:
            case "charge":
                arr.push(payd.id)
                break;
        }

        var url = arr.join('/')
        window.open(url, '_blank')
    }

    cancelOrderConfirm(e)
    {
        this.cancelOrder(this.order.id, false, this.dialogcancel_reason)
    }

    cancelOrderRefundConfirm(e)
    {
        this.cancelOrder(this.order.id, true, this.dialogcancel_reason)
    }

    refundOrderConfirm(e)
    {
        this.refundOrder(this.order.id, this.dialogcancel_reason)
    }

    cancelOrder(oid, refund, refund_reason)
    {
        this.api_action = 'cancel'
        this._fetchItems(1, oid, { refund: refund, comment: refund_reason })
    }

    resnapshotOrder(oid)
    {
        this.api_action = 'resnapshot'
        this._fetchItems(1, oid, {})
    }

    refundOrder(oid, reason)
    {
        this.api_action = 'refund'
        this._fetchItems(1, oid, { comment: reason })
    }

    syncOrder(oid)
    {
        this.api_action = 'sync-payments'
        this._fetchItems(1, oid)
    }

    _loadMoreProgress(loading, loadingMore)
    {
        return loading && loadingMore
    }

    _loadMore(e)
    {
        if (!e.target || !this.visible) { return }

        this.loadingMore = true
        var se = this.parentElement?.parentElement //document.documentElement
        this._listScrollTop = se?.scrollTop
        
        // var lst = Object.assign([], this.order.items)
        // for (var i in lst)
        // {
        //     this.push('order.items', lst[i])
        // }
        this.loadMoreItems(() =>
        {
            this.loadingMore = false
            if (this.visible && this.rosterlistVirtual) { this.rosterlistVirtual.fire('iron-resize') }
        })
    }

}
