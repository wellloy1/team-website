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
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './purchase-order.ts.html'
import style from './purchase-order.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-order-item'
import '../../components/ui/ui-user-inline'
import '../ui/ui-changes-history'
import '../ui/ui-task-list'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const ptoken_empty = ""



@FragmentDynamic
export class AdminPurchaseOrdersList extends FragmentBase
{
    static get is() { return 'tmladmin-purchase-order' }

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

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title            

            APIPath: { type: String, value: '/admin/api/purchaseorder/order-' },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pcoid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            dialogcancel_reason: { type: String },
        }
    }

    _netbase: any
    _observer: any
    hasUnsavedChanges: boolean

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()

        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            // this.savePurchaseOrderTap()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()
        }
    }


    _compute_pageObjectTitle(order, orderP)
    {
        return order?.Title ? order.Title : ''
    }

    formatLimitPrice(v, cur)
    {
        v = parseInt(v) * 100
        return this._formatPrice(v, cur)
    }

    // _createInvoiceDisabled(loading, invoiceID, orderCount)
    // {
    //     return loading || (invoiceID !== undefined || orderCount < 1)
    // }

    closeOrderTap(e)
    {
        this.api_action = 'close'
        this._fetchItems(1, null, { purchaseOrderID: this.order.PurchaseOrderID })
    }

    createInvoiceTap(e)
    {
        this.api_action = 'invoice'
        this._fetchItems(1, null, { purchaseOrderID: this.order.PurchaseOrderID })
    }

    approveOrderTap(e)
    {
        // console.log(e)
        this.api_action = 'approve'
        this._fetchItems(1, null, { purchaseOrderID: this.order.PurchaseOrderID })
    }

    needrefundOrderTap(e)
    {
        // console.log(e)
        this.api_action = 'refunded'
        this._fetchItems(1, null, { purchaseOrderID: this.order.PurchaseOrderID })
    }

    closeOrderConfirmTap(e)
    {
        this._openDlg(this.$["dialog-close"] as PaperDialogElement)
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    createInvoiceConfirmTap(e)
    {
        this._openDlg(this.$["dialog-createinvoice"] as PaperDialogElement)
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    approveOrderConfirmTap(e)
    {
        this._openDlg(this.$["dialog-approve"] as PaperDialogElement)
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    needrefundOrderConfirmTap(e)
    {
        this._openDlg(this.$["dialog-needrefund"] as PaperDialogElement)
        e.preventDefault()
        e.stopPropagation()
        return false
    }
}
