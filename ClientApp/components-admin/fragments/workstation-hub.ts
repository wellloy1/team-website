import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@polymer/app-route/app-route.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-hub.ts.html'
import style from './workstation-hub.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dropdown-menu'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
const Teamatical: TeamaticalGlobals = window['Teamatical']


@WorkstationDynamic
class AdminWorkstationHub extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-hub' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            routeData: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true },
            env: { type: String },
            smallScreen: { type: Object },

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/hub-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            queryParamsRequired: { type: Object, value: [] },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },
            recentWeight: { type: Number, value: -1, readOnly: true, },

            zoomimgi: { type: Object },


            _hideConfirmDelivery: { type: Boolean, computed: '_compute_hideConfirmDelivery(order.IsRecieved, order.ID)' },
            _hideDetails: { type: Boolean, computed: '_compute_hideDetails(order.ID)' },
        }
    }

    _netbase: any
    _observer: any
    _lockTags: boolean
    cooldownFlag: boolean
    loading: any
    env: any
    cooldownProgress: number
    disabledAirContainer: boolean
    histogramChart: any
    _lasthistAr: string
    filter_dB: number
    _setModelLock: boolean
    routeData: any

    __dataReloadOnAuthChanged_State = { userInfo_isBotAuth: undefined, userInfo_isAuth: undefined, api_subscribe: true }
    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth)',
            '_orderLoaded(order)',
        ]
    }
    _log(v) { console.log('ws-hub', v) }
    get newbarcode() { return this.$['newbarcode'] as PaperInputElement }
    

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }

    onBarcode(barcode)
    {
        this.async(() =>
        {
            var efake = { target: { parentElement: { value: barcode } } }
            this._barcodeTap(efake)
        })
        return true
    }

    _compute_hideConfirmDelivery(orderIsRecieved, orderID)
    {
        return !orderID || orderIsRecieved
    }

    _compute_hideDetails(orderID)
    {
        return !orderID
    }


    _barcodeEnter(e)
    {
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if ((!e.ctrlKey && !e.altKey && keycode == 13) && e.target == this.$['newbarcode'])
        {
            var efake = { target: { parentElement: e.target } }
            this._barcodeTap(efake)
        }
    }

    _barcodeTap(e)
    {
        super._barcodeTap(e)
        if (!e.target || !e.target.parentElement || !e.target.parentElement.value || e.target.parentElement.value.trim() == '') { return }

        var repObj = Object.assign({}, this._requestObject(this.order), {
            ID: e.target.parentElement.value,
            loading: true,
        })

        repObj.index = 0
        this.api_action = 'get'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this._setModelLock = true
                    this.set('order', r['result'])
                    this._setModelLock = false
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }

        }, false)

        e.target.parentElement.value = ''
    }

    _requestObject(order)
    {
        // if (!order) { return order }
        var r: any = {
            ID: order?.ID,
            // SubscriptionsState: 'order?.SubscriptionsState',
        }
        if (!r.ID && this.routeData && this.routeData['id'])
        {
            r.ID = this.routeData['id']
        }
        // if (order.Manufacturer) { r.Manufacturer = order.Manufacturer }
        return r
    }

    _orderLoaded(order)
    {
        if (!order) { return }
    }

    confirmContainerDeliveryTap(e?)
    {
        this._openDlg(this.$.dialogconfirmdelivery as PaperDialogElement)
    }

    containerDeliveryTap(e?)
    {
        this.api_action = 'delivered'
        var oldmodel = Object.assign({}, this.order)

        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.ID != newmodel.ID)
            {
                var qp = { shipcontid: newmodel.ID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }
}
