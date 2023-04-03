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
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import { PaperSpinnerLiteElement } from '@polymer/paper-spinner/paper-spinner-lite.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-stacking.ts.html'
import style from './workstation-stacking.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../ui/ui-scanner-printer-settings'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
// import { Md5 } from "md5-typescript"
// const MD5 = (str) => { return Md5.init(str).toUpperCase() }
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }

@WorkstationDynamic
class AdminWorkstationStacking extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-stacking' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true },
            env: { type: String },
            smallScreen: { type: Object },

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/stack-' },
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

            disabledPrintStickers: { type: Boolean, computed: '_compute_disabledPrintStickers(loadingAny, loadingWS, order.Stickers)' },
            zoomimgi: { type: Object },
        }
    }

    _netbase: any
    _observer: any
    loading: any
    env: any
    fileProgressList: any

    
    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
        ]
    }
    _log(v) { console.log(v) }
    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get downloadProgress(): PaperSpinnerLiteElement { return this.$['download-progress'] as PaperSpinnerLiteElement }


    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        if (this.scannerprintersettings)
        {
            this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
        }
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _spdReceivePacket(e: CustomEvent)
    {
        var pkt = e.detail.pkt
        if (pkt && pkt.CommandResult)
        {
            if (pkt.CommandResult.Command == 'barcodescanned' && pkt.CommandResult.ResultCode == 'success')
            {
                var efake = { target: { parentElement: { value: pkt.Data } } }
                this._barcodeTap(efake)
            }
            else if (pkt.CommandResult.Command == 'cutterfile' && (pkt.CommandResult.ResultCode == 'progress' || pkt.CommandResult.ResultCode == 'success'))
            {
                // console.warn(pkt)
                this.set('fileProgressList.' + (MD5(pkt.FileName)), pkt)
            }
        }
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

    _orderLoaded(order)
    {
        if (!order) { return }

        // if (this.order.Stickers)
        // {
        //     var sti = this.order.Stickers[0]
        //     for (var i=0; i<= 900; i++)
        //     {
        //         this.order.Stickers.push(Object.assign({}, sti))
        //     }
        //     this.notifyPath('order.Stickers.length')
        // }
        
    }

    _compute_disabledPrintStickers(loadingAny, loadingWS, stickers)
    {
        return loadingAny === true || loadingWS === true || !stickers || stickers.length == 0
    }

    _onStickerPrintTap(e)
    {
        this.scannerprintersettings.printStackingLabels(this.order.Stickers)
        this.showToast(this.localize('admin-ws-stacking-toast-printed'))
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
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


        // if (!Array.isArray(this.order.Replacements)) { this.set('order.Replacements', []) }
        var repObj = Object.assign({}, this._requestObject(this.order), {
            Barcode: e.target.parentElement.value,
            loading: true,
            index: 0,
        })
        this.api_action = 'get'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            // this.set('order.Replacements.' + rq.body.index + '.loading', false)
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    // console.log(r['result'])
                    this.set('order', r['result'])
                    this._pages_Updated()
                    // this.set('order.Replacements.' + rq.body.index, r['result'])
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
        this.showToast(repObj.Barcode)
    }

    _pages_Updated()
    {
        var previewPages = this.$['preview-pages'] as HTMLDivElement
        previewPages.style.maxHeight = window.innerHeight + "px"
    }

    _pageStyle(pagei)
    {
        // <!--Copies: 1
        // Image:
        // "https://wwwdev.teamatical.com/api/v1.0/image/get?i0x=jE.y.4mEh4pWWiF7u6JeHHlh0eCEEeRaa.gKHCXIurC_TaS9Xsr9AqHzLy9TQOrTSycpu.2F57ydmG7yiVXGD.t_ecCKdDlEI0qRcbZDiEA"
        // LengthMeters: 0.09863899999999998
        // WidthMeters: 1.8288
        // RasterizationTimeTicks: 15541390

        // var ratio = pagei.WidthMeters / pagei.LengthMeters
        var ratio = pagei.LengthMeters / pagei.WidthMeters
        var st = "object-fit: cover; width:100%;"
        // st += "height: " + ratio + "vw;"
        return st
    }

    _pageTitle(pagei)
    {
        var ts = this._formatDouble(pagei?.RasterizationTimeTicks / 10000)
        return `Rasterization Time: ${ts} (ms)`
    }

}
