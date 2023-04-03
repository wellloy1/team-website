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
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-qa.ts.html'
import style from './workstation-qa.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import fonts from '../shared-styles/common-fonts.ts.css'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { UIAdminBarcodeInput } from '../ui/ui-barcode-input'
import '../ui/ui-scanner-printer-settings'
import '../ui/production-sewing-item'
import '../ui/ui-product-search'
import '../ui/ui-barcode-input'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/ui-order-item'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { Md5 } from "md5-typescript"
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const MD5 = (str) => { return Md5.init(str).toUpperCase() }


@WorkstationDynamic
class AdminWorkstationQA extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-qa' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true, },
            env: { type: String },
            smallScreen: { type: Object },
            scrollTarget: { type: String,  },

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/qa-' },
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
            connectedWS: { type: Boolean, notify: true },
            activeWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },
            
            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },
            dialogresetlabeled: { type: Object },
            dialogdefect: { type: Object },

            zoomimgi: { type: Object },
            printRfid: { type: Boolean, },

            disabledPrintLabel: { type: Boolean, computed: '_computeDisabledPrintLabel(loading, order.CanApprove, order.ImageUrls, userInfo.isAdmin)' },
            hiddenPrintLabel: { type: Boolean, computed: '_computeHiddenPrintLabel(loading, order.ImageUrls, userInfo.isAdmin)' },

            isReplaced: { type: Boolean, value: false, reflectToAttribute: true }, 
            isApproved: { type: Boolean, value: false, reflectToAttribute: true },

            approveCount: {type: String, },
            printCount: { type: String, },
            disabledResetLabeled: { type: Boolean, computed: '_compute_disabledResetLabeled(loading, loadingCmd, loadingWS, order.ApprovedCount, order.LabeledCount, order.Count)' },
            disabledPrintBulk: { type: Boolean, computed: '_compute_disabledPrintBulk(loading, loadingCmd, loadingWS, connectedWS, activeWS, printCount, order.LabeledCount, order.Count)' },
            disabledTakeAPicture: { type: Boolean, computed: '_compute_disabledTakeAPicture(loading, loadingCmd, loadingWS, connectedWS, activeWS, printCount, order.LabeledCount, order.Count)' },
            // disabledDefect: { type: Boolean, computed: '_compute_disabledDefect(loading, loadingCmd, loadingWS, printCount, order.LabeledCount, order.Count)' },
            disablePrintCountInput: { type: Boolean, computed: '_compute_disablePrintCountInput(order.LabeledCount, order.Count, loadingAny)' },
            disabledReprintLabeled: { type: Boolean, computed: '_compute_disabledReprintLabeled(order.ApprovedLabelZPL, loadingAny)' },

            // hiddenResetLabeled: { type: Boolean, computed: '_compute_hiddenResetLabeled(loading, loadingCmd, loadingWS, order.ApprovedCount, order.LabeledCount, order.Count)' },
            // hiddenDefect: { type: Boolean, computed: '_compute_hiddenDefect(loading, loadingCmd, loadingWS, order.ApprovedCount, order.LabeledCount, order.Count)' },

            groupLabels: { type: Array, value: [], },
        }
    }


    //#region Vars

    private _reloadRfidDebouncer: Debouncer
    private _reloadRfidDebouncer0: Debouncer
    _netbase: NetBase
    _observer: any
    loading: any
    env: any
    zoomimgi: any
    approveCount: string
    printCount: string
    groupLabels: any
    disabledPrintLabel: boolean
    hiddenPrintLabel: boolean
    isApproved: boolean
    disabledApproveBulk: boolean
    disabledPrintBulk: boolean
    printRfid: boolean
    private _firstLoad: boolean = true
    disabledTakeAPicture: any
    dialogresetlabeled: any
    dialogdefect: any
    
    //#endregion


    static get observers()
    {
        return [
            'dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe, printRfid)',
            '_orderLoaded(order)',
            '_reloadOrder(printRfid)',
            // '_log(activeWS)',
        ]
    }

    _log(v) { console.log(v) }

    get scannerprintersettings() { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get barcodeinput() { return this.shadowRoot?.querySelector('#barcodeinput') as UIAdminBarcodeInput }
    get netbase() 
    { 
        if (!this._netbase) { this._netbase = new NetBase() }
        return this._netbase
    }


    connectedCallback()
    {
        super.connectedCallback()
        
        // this.labelsPaging = this.labelsPagingList[0].id

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))

        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    onBarcode(barcode) //android
    {
        this._barcodeInputPush(barcode)
        return true
    }

    _spdReceivePacket(e: CustomEvent) //localservice
    {
        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'barcodescanned' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.Data
            // res.DataType
            this._barcodeInputPush(res.Data, res.ScannerID)
        }

        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'cameraresult' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            let dataObj = e.detail.pkt
            this.async(async () => {
                try
                {
                    const b64toBlob = (base64, type = 'application/octet-stream') => fetch(`data:${type};base64,${base64}`).then(res => res.blob())
                    const cameraresultData = new FormData()
                    cameraresultData.append('Barcode', dataObj.Barcode)
                    cameraresultData.append('cameraresult', await b64toBlob(dataObj.Data))

                    this.set('order.cameraResult', dataObj)
                    this.api_action = 'cameraresult'
                    var r = await this.netbase._apiRequest(this.api_url, cameraresultData)
                    if (r?.success && r?.result?.length > 0)
                    {
                        this.push('order.Pictures', Object.assign({ }, { ImageUrl: r.result[0].imgUrl, Name: 'Pic' + (this.order.Pictures.length + 1), blobName: r.result[0].blobName }))
                        // console.log(this.order.Pictures)
                        // this.notifyPath('order')
                    }
                    this.set('order.cameraResult', null)                    
                }
                catch
                {
                    //
                }
            })
        }
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this.printCount = (!this._asBool(this.printCount) ? "1" : this.printCount)
    }

    _requestObject(order)
    {
        if (!order) { return { PrintRFID: this.printRfid} }

        var r: any = {
            PrintRFID: this.printRfid,
            Barcode: order.Barcode,
            SubscriptionsState: order.SubscriptionsState,
            
            BatchID: order.BatchID,
            BatchContext: order.BatchContext,
        }
        if (order.Manufacturer) { r.Manufacturer = order.Manufacturer }
        return r
    }

    onItemTap(e)
    {
        if (e.detail?.entry?.Barcode && this.barcodeinput)
        {
            this._barcodeInputPush(e.detail.entry.Barcode)
            return true
        }
    }
    
    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        this.set('order.Discarded', false)
        return this._onInputChanged(e)
    }

    _barcodeInputPush(barcode, scannerID: any = null)
    {
        if (this.barcodeinput) { this.barcodeinput.barcodePush(barcode, scannerID) }
    }

    _barcodeLoadingDebouncer: Debouncer
    onBarcodeInputEnter(e)
    {
        var scanners:{ID:''}[] = this.scannerprintersettings.getScanners()
        var scannerID = e.ScannerID
        var scannerIndex = 0
        if (scanners && e.ScannerID)
        {
            for (var i in scanners)
            {
                if (scanners[i] && scanners[i].ID == e.ScannerID)
                {
                    scannerIndex = parseInt(i, 10)
                    break
                }
            }
        }
        if (scanners && !this._dev) 
        { 
            if (scannerIndex >= scanners.length)
            {
                this.showToast(this.localize('admin-ws-aggregation-scanner-notfound'))
                return //EXIT!!!
            }
            scannerID = scanners[scannerIndex]?.ID 
        }


        if (e?.detail?.invalid)
        { 
            // console.warn('onBarcodeInputEnter - invalid')
            this.scannerprintersettings.qaBarcodeInvalid(scannerID)
            return //EXIT!!!
        }
        var barcodes = e?.detail?.barcodes
        if (!Array.isArray(barcodes)) { return } //EXIT!!!




        var repObj = Object.assign({}, this._requestObject(this.order), {
            PrintRFID: this.printRfid,
            Barcodes: barcodes.map(i => i.barcode),
            loading: true,
            index: 0,
        })
        delete repObj.Barcode


        this.set('loadingCmd', true)
        if (this._barcodeLoadingDebouncer) { this._barcodeLoadingDebouncer.cancel() }
        this.api_action = 'get'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            this.set('loadingCmd', true)
            this._barcodeLoadingDebouncer = Debouncer.debounce(this._barcodeLoadingDebouncer, timeOut.after(600), () =>
            {
                this.set('loadingCmd', false)
            })
            
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.set('order', r['result'])

                    //turn off auto// if (this.order.canTakePicture) { this._onTakeAPictureTap() } 
        
                    if (this.order.Discarded || this.order.Invalid)
                    {
                        this.scannerprintersettings.qaBarcodeInvalid(scannerID)
                    }
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
        }, 
        false)
    }

    _onKeydownEvent(e)
    {
        // console.log(e)
        var keycode = -1
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        // if ((e.ctrlKey && !e.altKey && !e.shiftKey && keycode == 32) && !this.disabledApproveBulk)
        // {
        // }
        // else 
        if ((!e.ctrlKey && !e.altKey && !e.shiftKey && keycode == 13) && !this.disabledPrintBulk)
        {
            var el = e.path ? e.path.filter(i => { return i.classList && i.classList.contains('print-count-input') }) : []
            // console.log(el)
            if (el.length > 0) { this._onPrintLabelsBulkTap() } 
        }
        // else if ((!e.ctrlKey && !e.altKey && !e.shiftKey && keyboardEventMatchesKeys(e, 'esc')) && )
        // {
        // }
    }

    _formatSizeIsCurrent(keymeasureValues, sizeCode)
    {
        if (!Array.isArray(keymeasureValues)) { return '' }

        var ss = keymeasureValues.filter(i => i.Size == sizeCode)
        if (ss.length > 0)
        {
            return ss[0].IsCurrentSize
        }
        return false
    }

    _formatSizeValue(keymeasureValues, sizeCode)
    {
        if (!Array.isArray(keymeasureValues)) { return '' }

        var ss = keymeasureValues.filter(i => i.Size == sizeCode)
        if (ss.length > 0)
        {
            return ss[0].Value
        }
        return ''
    }    

    _computeDisabledPrintLabel(loading, can,  Url, isAdmin)
    {
        return loading //|| !can
    }

    _computeHiddenPrintLabel(loading, Url, isAdmin)
    {
        return !Url
    }
    
    _compute_disabledResetLabeled(loading, loadingCmd, loadingWS, orderApprovedCount, orderLabeledCount, orderCount)
    {
        var v = this._computeLoadingAny(loading, loadingCmd, loadingWS)
        return v
    }

    _compute_disabledPrintBulk(loading, loadingCmd, loadingWS, connectedWS, activeWS, printCountStr, orderLabeledCount, orderCount)
    {
        var v = this._computeLoadingAny(loading, loadingCmd, loadingWS)

        if (!v)
        {
            try
            {
                var r = parseInt(printCountStr)
                let labelsCount = orderCount - orderLabeledCount
                if (isNaN(r) || r > labelsCount)
                {
                    v = true
                }
            }
            catch
            {
                v = true
            }
        }
        return v || !(activeWS)
    }

    _compute_disabledTakeAPicture(loading, loadingCmd, loadingWS, connectedWS, activeWS, printCountStr, orderLabeledCount, orderCount)
    {
        var v = this._computeLoadingAny(loading, loadingCmd, loadingWS)
        let labelsCount = orderCount - orderLabeledCount
        return v || labelsCount < 1  || !(activeWS)
    }

    _compute_disablePrintCountInput(orderLabeledCount, orderCount, loadingAny)
    {
        return loadingAny || (orderCount == 1) || (orderCount - orderLabeledCount) < 1
    }

    _compute_disabledReprintLabeled(orderApprovedLabelZPL, loadingAny)
    {
        return loadingAny || !orderApprovedLabelZPL
    }

    rfidTap(e)
    {
        //
    }

    _reloadOrder(printRfid)
    {
        this._reloadRfidDebouncer = Debouncer.debounce(this._reloadRfidDebouncer, timeOut.after(600), () =>
        {
            if (this._firstLoad)
            {
                this._firstLoad = false
                return 
            }
            this.reload()
        })
    }

    dataReloadOnAuthChanged(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth, api_subscribe, printRfid)
    {
        this._reloadRfidDebouncer0 = Debouncer.debounce(this._reloadRfidDebouncer0, timeOut.after(600), () =>
        {
            this._dataReloadOnAuthChanged(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth, api_subscribe)
        })
    }

    _onPrintLabelTap(e?)
    {
        var obj = Object.assign({}, this.order, {
            Approved: true,
            Discarded: false,
        })
        delete obj.LabelItems
        delete obj.ImageUrls
        delete obj.Product
        delete obj.Accessories

        this.api_action = 'approve'
        this.cmdPost(this.api_url, obj, (result, response, rq) =>
        {
            // this.set('order.Replacements.' + rq.body.index + '.loading', false)
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    // console.log(r['result'])
                    this.set('order', r['result'])
                    // this.set('order.Replacements.' + rq.body.index, r['result'])

                    var labels:any = []
                    if (this.order.LabelItem) { labels.push(this.order.LabelItem) }
                    this.scannerprintersettings.printCustomer(this.order.ZPLTemplate, labels)
                    this.showToast(this.localize('admin-ws-qa-toast-printed'))
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
    }

    _top_limit(v, max)
    {
        return v > max ? max : v
    }

    async _onPrintLabelsBulkTap(e?)
    {
        try
        {
            let cnt = parseInt(this.printCount)
            if (cnt > this.order.Count)
            {
                throw Error('max')
            }
            this.printCount = ''

            this.api_action = 'print'
            var reqObj = 
            {
                Barcode: this.order?.Barcode,
                Pictures: this.order?.Pictures.map(i => { return { 
                    blobName: i.blobName,
                    imgUrl: i.ImageUrl,
                } }),
                PrintCount: cnt, 
                PrintRFID: this.order?.PrintRFID,
            }
            var r = await this.netbase._apiRequest(this.api_url, reqObj)
            // console.log(r)
            if (r?.success && r?.result)
            {
                this.order = r.result
                var printItems = this.order.LabelItems
                this.scannerprintersettings.printCustomer(this.order.ZPLTemplate, printItems)
                this.showToast(this.localize('admin-ws-qa-toast-labels-printed', 'count', printItems.length))
            }
            else
            {
                this.showToast(this.localize('admin-ws-qa-toast-labels-print-failed'))
                var msg = r?.summary?.Message ? r.summary.Message : this.localize('admin-ws-qa-toast-labels-print-failed')
                var barr = [
                    {
                        title: this.localize('admin-app-ok'),
                        ontap: (e) => 
                        {
                        }
                    }
                ]
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: '',
                        message: msg,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
        }
        catch(ex)
        {
            this.showToast(this.localize('admin-ws-qa-toast-labels-print-failed'))
        }
    }

    _onPrintLabelsBulkConfirmTap(e)
    {
        this._openDlg(this.$.dialogbulk as PaperDialogElement, this.querySelector('div'))
    }

    _onTakeAPictureTap(e?)
    {
        if (this.disabledTakeAPicture) { return }

        this.scannerprintersettings.cameraTakeAPicture(this.order?.Barcode)
    }

    indexLen(a, b)
    {
        return (a + 1) === b
    }

    onProductPartImageTap(e)
    {
        var parti = e.model.__data.parti
        this.zoomimgi = parti
        this._openDlg(this.$.dialogzoom as PaperDialogElement)
    }

    onProductPartImageBackTap(e)
    {
        var parti = e.model.__data.parti
        this.zoomimgi = parti
        this._openDlg(this.$.dialogzoomback as PaperDialogElement)
    }

    _onReprintLabeledTap(e)
    {
        if (!this.order.ApprovedLabelZPL) { return }

        var labels:any = []
        labels.push({ ZPL: this.order.ApprovedLabelZPL })
        this.scannerprintersettings.printCustomer('', labels)
        this.showToast(this.localize('admin-ws-qa-toast-printed'))

    }

    _onResetLabeledTap(e)
    {
        this.dialogresetlabeled = { ResetReason: '' }
        this._openDlg(this.$.dialogresetlabeled as PaperDialogElement)
    }

    resetLabeledConfirmTap(e)
    {
        if (!this.dialogresetlabeled.ResetReason || this.dialogresetlabeled.ResetReason.length < 5) 
        { 
            if (!this.dialogresetlabeled?.notvalid) { this.dialogresetlabeled.notvalid = {} }
            this.set('dialogresetlabeled.notvalid.ResetReason', 'Reset reason is mandatory (a few words)')
            e.preventDefault()
            e.stopPropagation()
            return 
        }

        let reason = this.dialogresetlabeled.ResetReason
        this.set('dialogresetlabeled.ResetReason', '')
        this.api_action = 'discard-nonapproved-labels'
        let obj = Object.assign({}, this._requestObject(this.order), { 
            Reason: reason 
        })
        this._fetchItems(1, null, obj, (r) =>
        {
            //
        })
    }

}
