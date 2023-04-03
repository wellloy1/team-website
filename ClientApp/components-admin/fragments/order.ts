import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-list/iron-list.js';
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-toggle-button/paper-toggle-button'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@advanced-rest-client/json-viewer/json-viewer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, Clipboard } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { CheckoutData } from '../../components/bll/checkout-data'
import { APIResponseModel } from '../../components/dal/api-response-model'
import view from './order.ts.html'
import style from './order.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../../components/ui/ui-payment-type'
import '../../components/ui/ui-user-inline'
import '../ui/ui-order-item'
import '../ui/ui-dropdown-menu'
import '../ui/ui-richtext-editor'
import '../ui/ui-changes-history'
import '../ui/ui-task-list'
import '../ui/ui-progress-icon'
import '../ui/ui-dialog'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { UserInfoModel } from '../../components/dal/user-info-model';
import { UIAdminDialog } from '../ui/ui-dialog'
import '../ui/ui-dialog'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const AdminOrderBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior
const SHIPCARRIERS = {
    'DHL EXPRESS':      { url: 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id={TrackingNumber}' },
    'DHL':              { url: 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id={TrackingNumber}' },
    'UPS':              { url: 'https://www.ups.com/track?loc=en_US&requester=QUIC&tracknum={TrackingNumber}/trackdetails' },
    'AUSTRALIA POST':   { url: 'https://auspost.com.au/mypost/track/#/details/{TrackingNumber}' },
}


@FragmentDynamic
export class AdminOrder extends AdminOrderBase
{
    static get is() { return 'tmladmin-order' }

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


            APIPath: { type: String, value: '/admin/api/order/order-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['orderid'] },

            saving: { type: Boolean, notify: true, readOnly: true, },
            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            
            dialogcancel_reason: { type: String },
            dontSendEmail: { type: Boolean },
            
            isOrganization:{ type: Boolean, value: false },

            viewasjson: { type: Boolean, value: true },
            dialogdetails: { type: Object, notify: true }, 
            dialogsync: { type: Object, notify: true }, 
            dialogreinitiate: { type: Object, notify: true }, 
            dialogqaimgs: { type: Object },

            isProductConfigurationReplace: { type: Array, computed: '_compute_isProductConfigurationReplace(userInfo.isAdmin, isOrganization)' },
        }
    }

    _netbase: any
    _observer: any
    hasUnsavedChanges: boolean
    dontSendEmail: boolean
    _listScrollTop: any
    scrollTarget: any
    dialogdetails: any
    viewasjson: boolean
    websiteUrl: string
    _shiftKey: boolean = false
    _shiftKeyOnly: boolean = false
    dialogsync: any
    isOrganization: boolean
    _netbaseQAImg: NetBase
    dialogqaimgs: any

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_orderUpdated(order)',
        ]
    }
    _log() { console.log(...arguments) } 

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)
        this._observerGrid = new FlattenedNodesObserver(this.$['order-items'], (info: any) =>
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

        // this.addEventListener('order-item-change-pcid', (e) => this._onOrderItemChagePCID(e))
        document.addEventListener("keydown", (e) => this._onKeydown(e))
        document.addEventListener("keyup", (e) => this._onKeyup(e))
        this.addEventListener('order-item-addtocart', (e) => this._onOrderItemAddToCart(e))
        this.addEventListener('order-item-qaimages', (e) => this._onOrderItemShowQAImages(e))
        // 
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveDetailTap()
        }
    }

    _onLoadResult(order)
    {
        // order.Metadata = { customfield: 123 }
        return order
    }

    _compute_isProductConfigurationReplace(isAdmin, isOrganization)
    {
        return isAdmin && !isOrganization
    }

    _dis_recalcShiprates(loadingAny, cantSwitchShippingHubs)
    {
        return loadingAny || this._asBool(cantSwitchShippingHubs)
    }

    _shippingHubsWithPrices(shippingHubs)
    {
        if (!Array.isArray(shippingHubs)) { return shippingHubs }
        return shippingHubs.map(i => {
            if (!i.Price || !i.Currency) { return i }
            return Object.assign({}, i, { Name: `${i.Name} - ${this._formatPrice(i.Price, i.Currency)}` })
        })
    }

    shippingHubChanged(p)
    {
        this.notifyPath('order.ShippingHubs')
        this._computeHasUnsavedChanges(this.order, { value: this.order.ShippingHubs, path: 'order.ShippingHubs'}, this.orderSaved)
    }

    _useOwnPCIDTap(e)
    {
        for (var i in this.order.items)
        {
            this.set(`order.items.${i}.replacepcid`, this.order.items[i].item.ProductConfigurationID)
        }
    }

    _orderUpdated(order)
    {
        this.async(() =>
        {
            var ilists = this.root ? this.root.querySelectorAll('iron-list') : null
            if (ilists)
            {
                for (var i of ilists)
                {
                    i.fire('iron-resize')
                }
            }
        }, 150)

        // this.set('order.Containers', [{ContainerID:'123'}])
        // this.set('order.Tracking', [{
        //     Carrier: 'DHL',
        //     TrackingNumber: 'JD014600010150316556',
        //     Place: '1',
        //     ShippedCount: '1',
        //     HiddenForConsumer: true
        // }])
    }

    _initalNotes = ''
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path == 'order') { this._initalNotes = this.order?.Notes }
        if (orderP && orderP.path == 'order.Notes' && orderP.value == '<p><br></p>' && this._initalNotes == undefined) { return false }

        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    saveDetailTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveDetailConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._setSaving(true)
        this._postData(this.order, (newmodel) =>
        {
            this._setSaving(false)
            if (oldmodel.id != newmodel.id)
            {
                var qp = { orderid: newmodel.id }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    // _onOrderItemChagePCID(e)
    // {
    //     this.api_action = 'save-item'
    //     const entry = e.detail.entry
    //     const progress = e.detail.progress
    //     var oldmodel = { 
    //         id : this.order?.id,
    //         items: this.order?.items?.filter(i => i.id == entry.id)
    //     }
    //     // console.log(oldmodel)
    //     progress.active = true
    //     this._postData(oldmodel, (newmodel) =>
    //     {
    //         progress.active = false
    //     })
    // }

    hideSaveBtn(product)
    {
        return false
    }

    disableStatusSelection(loading)
    {
        return loading
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

    hideReinitiateBtn(order, isAlmighty)
    {
        return !order || !isAlmighty
    }

    cancelOrderTap(e)
    {
        this.dontSendEmail = false
        this._openDlg(this.$.dialogcancel as PaperDialogElement)
    }

    push2prodorsyncOrderTap(e)
    {
        this.push2prodorsyncOrder(this.order.id)
    }

    resnapshotOrderTap(e)
    {
        this.resnapshotOrder(this.order.id)
    }

    reinitiateOrderTap(e)
    {
        this.set('dialogreinitiate', {})
        this._openDlg(this.shadowRoot?.querySelector('#dialogreinitiate') as PaperDialogElement)
    }

    reinitiateOrderConfirmTap(e)
    {
        this.reinitiateOrder(this.order.id)
    }

    recalcShiprateOrderTap(e)
    {
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        if (progress) { progress.active = true }

        this.api_action = 'getshippingrates'
        this._postData(this.order, () => 
        { 
            if (progress) { progress.active = false }
        })
    }

    syncOrderTap(e)
    {
        if (this._shiftKeyOnly && !this.isOrganization) 
        {
            this.dialogsync = { orderid: this.order.id, auditfix: false }
            this._openDlg(this.$.dialogsync as PaperDialogElement)
        }
        else
        {
            this.syncOrder(this.order.id)
        }
    }
    
    syncOrderCofirmTap(e)
    {
        this.syncOrder(this.order.id, { auditfix: this.dialogsync?.auditfix })
    }

    refundOrderTap(e)
    {
        this._openDlg(this.$.dialogrefund as PaperDialogElement)
    }

    showEmailModelTap(e)
    {
        var emailType = this.order.OrderEmailType.id
        var orderid = this.order.id
        var url = this._computeAPIUrl(this.websiteUrl, this.APIPath, 'emailtemplate-get')
        this.url = StringUtil.urlquery(url, { orderID: orderid, templateType: emailType })
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true

        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true, 
                title: 'Email Model (SENDGRID test-data)',
                Details: null,
            })
            dialogdetails.open()

            this.cmd((emailModel) =>
            {
                progress.active = false
                this.set('dialogdetails.loading', false)

                var detailTxt:string | null = null
                try 
                {
                    detailTxt = JSON.stringify(emailModel, null, "\t")
                    this.viewasjson = true
                    this.set('dialogdetails.Details', detailTxt)
                }
                catch
                {
                    //
                }
            })
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    showPayData(e)
    {
        var payi = e.model.__data.payi

        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true, 
                title: 'Payment History Item Details',
                Details: null,
            })
            dialogdetails.open()

            this.async(() => 
            {
                this.set('dialogdetails.loading', false)
                var paydTxt = ''
                try 
                {
                    var payd = JSON.parse(payi.PaymentData)
                    paydTxt = JSON.stringify(payd, null, "\t")
                }
                catch
                {
                    this.viewasjson = false
                    paydTxt = payi.PaymentData
                }
                this.set('dialogdetails.Details', paydTxt)
            }, 170)
        }
    }

    copyJsonDetailsTap(e)
    {
        var item = e?.model?.__data?.histi
        var jsonTxt = item ? item.Details : this.dialogdetails.Details
        
        Clipboard.copyFromString(jsonTxt)
        this.showToast('JSON copied to clipboard...')
    }

    isCheckoutCodePay(payi)
    {
        // console.log(payi)
        return payi?.PaymentMethod?.id === 'PO'
    }

    isStripePay(payi)
    {
        // console.log(payi)
        return payi?.PaymentMethod?.id === 'SP'
    }

    _urlStripeConnected(id)
    {
        var arr = ['https://dashboard.stripe.com']
        if (this.order && this.order.Sandbox) { arr.push('test') }
        arr.push('connect')
        arr.push('accounts')
        arr.push(id)
        arr.push('activity')
        var url = arr.join('/')
        return url
    }

    onPayRow(e)
    {
        const data = e.model.__data
        const payi = data.payi
        const order = data.order
        // console.log(payd)
        // const env = this.env == 'Production' ? '.p' : ''

        //if (this.is2c2pPay(payi)) //notimplemented
        if (this.isCheckoutCodePay(payi))
        {
            var url = this._urlViewPurchaseOrder(payi.PaymentData)
            this._goto(url)
        }
        else if (this.isStripePay(payi))
        {
            var payd:any = null
            try  { var payd = JSON.parse(payi.PaymentData) } catch  {  }
            if (!payd) 
            { 
                this.showPayData(e)
                return //EXIT!!!
            }

            var arr = ['https://dashboard.stripe.com']
            if (this.order && this.order.Sandbox) { arr.push('test') }

            if (order?.SellerOrganization?.ConnectedStripeAccountID)
            {
                arr.push('connect')
                arr.push('accounts')
                arr.push(order.SellerOrganization.ConnectedStripeAccountID)
            }

            arr.push('payments')
            const PAYDATA = "StripeFeature.PaymentData"
            if (payd?.object == PAYDATA && payd.LastError?.payment_intent)
            {
                arr.push(payd.LastError.payment_intent.id)
            }
            else if (payd?.object == PAYDATA && payd.Webhook)
            {
                arr.push(payd.Webhook.id)
            }
            else if (payd?.object == PAYDATA && payd.Confirm)
            {
                arr.push(payd.Confirm.id)
            }
            else if (payd?.object == PAYDATA && payd.Create)
            {
                arr.push(payd.Create.id)
            }
            else //old charge or refund
            {
                switch (payd?.object) 
                {
                    case "refund": 
                        arr.push(payd.charge)
                        break

                    default:
                    case "charge": 
                        arr.push(payd.id)
                        break
                }
            }
            var url = arr.join('/')
            window.open(url, '_blank')
        }
        else
        {
            this.showPayData(e)
        }
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    isCarreirWebsite(tracki)
    {
        return this._asBool(tracki?.TrackingNumber)
            && typeof(tracki?.Carrier) == 'string' 
            && this._asBool(SHIPCARRIERS[tracki.Carrier.toUpperCase()])
    }

    onTrackRow(e)
    {
        var tracki = e.model.__data.tracki
        if (!tracki?.TrackingNumber 
            || typeof(tracki?.Carrier) != 'string' 
            || !SHIPCARRIERS[tracki.Carrier.toUpperCase()]) { return }

        var carrier = SHIPCARRIERS[tracki.Carrier.toUpperCase()]
        var url = StringUtil.replaceAll(carrier.url, '{TrackingNumber}', tracki.TrackingNumber)
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

    addOrderToCartTap(e)
    {
        this.api_action = 'add-to-cart'
        this._fetchItems(1, this.order.id, { 
            // useCurrentRosterVersion
        })
    }

    _onOrderItemAddToCart(e)
    {
        this.api_action = 'add-to-cart'
        this._fetchItems(1, this.order.id, { 
            orderItemID: e.detail.orderItemID, 
            // useCurrentRosterVersion
        })
    }

    refundOrderConfirm(e)
    {
        this.refundOrder(this.order.id, this.dialogcancel_reason)
    }

    updateStatusTap(e)
    {
        this.updateStatusOrder(this.order.id, this.order.ETag, this.order.Status.id)
    }

    moreDetailTap(e)
    {
        this.api_action = 'get'
        this._fetchItems(1, this.order.id, { domore: true })
    }

    updateStatusOrder(oid, etag, statusid)
    {
        this.api_action = 'status-update'
        this._fetchItems(1, oid, { etag: etag, statusid: statusid })
    }

    push2prodorsyncOrder(oid)
    {
        this.api_action = 'pushtoproduction'
        this._fetchItems(1, oid, {})
    }

    resnapshotOrder(oid)
    {
        this.api_action = 'resnapshot'
        this._fetchItems(1, oid, {})
    }

    reinitiateOrder(oid)
    {
        this.api_action = 'reinitiate'
        this._fetchItems(1, oid, {})
    }

    cancelOrder(oid, refund, refund_reason)
    {
        this.api_action = 'cancel'
        var obj = { 
            refund: refund, 
            comment: refund_reason, 
            dont_send_email: this.dontSendEmail,
        }
        this._fetchItems(1, oid, obj, this.cancelOrRefundResult.bind(this))
    }

    refundOrder(oid, refund_reason)
    {
        this.api_action = 'refund'
        var obj = { 
            comment: refund_reason, 
        }
        this._fetchItems(1, oid, obj, this.cancelOrRefundResult.bind(this))
    }

    cancelOrRefundResult(order, e)
    {
        if (e || !order) { return }
        // console.log(order.id)

        var iframe = document.createElement('iframe') as HTMLIFrameElement
        const height = 186
        iframe.style.position = 'absolute'
        iframe.style.bottom = `-${height}px`
        iframe.style.height = `${height}px`
        iframe.onload = (e) => 
        {
            this.async(() => { iframe.remove() }, 1000)
        }
        iframe.src = StringUtil.urlquery(`${this.websiteUrl}/i/admin-cancel-refund-order`, { id: order?.id })
        document.body.appendChild(iframe)
    }

    syncOrder(oid, options = {})
    {
        this.api_action = 'sync-payments'
        this._fetchItems(1, oid, options)
    }

    collectOrderDetailsTap(e?)
    {
        this.api_action = 'collect'
        this._fetchItems(1, this.order?.id)
    }

    // _onDownload(e) 
    // {
    //     this.getOrderFile({ id: this.order.id }, this.$.downloadProgress)
    //     e.preventDefault()
    //     return false
    // }

    sendEmailOrderPlacedTap(e)
    {
        var order = this.order
        if (!order) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        this.api_action = 'resend-email-orderplaced'
        this._fetchItems(1, order.id, { }, () => {
            progress.active = false
        })
        // e.preventDefault()
        // e.stopPropagation()
        // return false
    }

    _onKeyup(e)
    {
        return this._onKeydown(e)
    }

    _onKeydown(e)
    {
        e = e || window.event

        if (!this.visible) { return }

        this._shiftKey = e.shiftKey
        this._shiftKeyOnly = e.shiftKey && !e.altKey && !e.ctrlKey 
    }

    _qaimgloader: NetBase
    _qaimagesDebouncer: Debouncer
    async _onOrderItemShowQAImages(e)
    {
        var entry = e?.detail?.entry
        if (!entry) { return }

        this.set('dialogqaimgs.loading', true)
        var obj: any = Object.assign({}, entry)
        var dialogqaimgs = this.$.dialogqaimgs as UIAdminDialog
        if (dialogqaimgs)
        {
            this.set('dialogqaimgs', Object.assign({}, obj, { title: 'QA Images', loading: true }))
            dialogqaimgs.open()
        }

        try
        {
            if (!this._qaimgloader) { this._qaimgloader = new NetBase() }
            const org_prefix = this.isOrganization ? 'partner-' : ''
            var api_url = [this.websiteUrl, `admin/api/order/${org_prefix}order-item-${'qapicturies'}`].join('/')
            var r = await this._qaimgloader._apiRequest(api_url, entry, 'POST') as APIResponseModel | null | undefined
            if (r?.success && r?.result?.QaPicturies)
            {
                for (var i in this.order.items)
                {
                    if (this.order.items[i].id == entry.id)
                    {
                        this.set(`order.items.${i}.QaPicturies`, r.result.QaPicturies)
                        this.set(`dialogqaimgs.QaPicturies`, r.result.QaPicturies)
                        break
                    }
                }
            }
        }
        catch
        {
            //
        }

        this.set('dialogqaimgs.loading', false)
    }
}
