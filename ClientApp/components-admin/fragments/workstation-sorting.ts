import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-sorting.ts.html'
import style from './workstation-sorting.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import { UIAdminBarcodeInput } from '../ui/ui-barcode-input'
import '../ui/ui-barcode-input'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/ui-image-svg'
import '../ui/ui-scanner-printer-settings'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'



@WorkstationDynamic
class AdminWorkstationSorting extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-sorting' }

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

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/sort-' },
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

            barcodeLabel: { type: String, computed: '_computeBarcodeLabel(order.BatchID)' },

            zoomimgi: { type: Object },
            updateQueue: { type: Array, value: [] },

            showStateParts: { type: Boolean, value: true },
            showStateAccessories: { type: Boolean, value: true },

            sortreset_dialog: { Object },

            disabledPrintToteLabels: { type: Boolean, computed: '_computeDisabledPrintToteLabels(loading, userInfo.isAdmin, order.BatchID)' },
            disabledPrintBatchLabel: { type: Boolean, computed: '_computeDisabledPrintBatchLabel(loading, userInfo.isAdmin, order.BatchID)' },
            disabledStartNewBatch: { type: Boolean, computed: '_computeDisabledStartNewBatch(loading, userInfo.isAdmin, order.BatchID)' },
            disabledSortResetBatch: { type: Boolean, computed: '_compute_disabledSortResetBatch(loading, userInfo.isAdmin, order.BatchID)' },
            disabledShowState: { type: Boolean, computed: '_compute_disabledShowState(loading, userInfo.isAdmin, order.BatchID)' },
            disabledDryTestParts: { type: Boolean, computed: '_computeDisabledDryTestParts(loading, userInfo.isAdmin, order.BatchID)' },
            disabledPartsLabels: { type: Boolean, computed: '_computeDisabledPartsLabels(loading, userInfo.isAdmin, order.BatchID)' },
            disabledPrintAccessories: { type: Boolean, computed: '_computeDisabledPrintAccessories(loading, userInfo.isAdmin, order.BatchID)' },

            showPartsStats: { type: Boolean, computed: '_computeShowPartsStats(loading, userInfo.isAdmin, order.BatchID, order.RecentAccessory)' },
        }
    }


    sortreset_dialog: any
    _netbase: NetBase
    _netbaseNotify: NetBase
    _netbaseNotifyDebouncer: Debouncer
    _observer: any
    loading: any
    env: any
    new_order: any
    updateQueue: any
    loadingNotify: any
    showStateParts: any
    showStateAccessories: any


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
        ]
    }
    _log(v) { console.log(v) }

    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get barcodeinput() { return this.shadowRoot?.querySelector('#barcodeinput') as UIAdminBarcodeInput }


    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _orderLoaded(order)
    {
        if (!order) { return }
    }

    _spdReceivePacket(e: CustomEvent)
    {
        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'barcodescanned' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.Data
            // res.DataType
            this._barcodeInputPush(res.Data, res.ScannerID)
        }
    }

    onBarcode(barcode) //android
    {
        this._barcodeInputPush(barcode)
        return true
    }

    doseQrCodeTap(e)
    {
        var dosei = e.model.__data.dosei
        this._barcodeInputPush(dosei.Barcode)
        return true
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }
    
    _barcodeInputPush(barcode, scannerID: any = null)
    {
        if (this.barcodeinput) { this.barcodeinput.barcodePush(barcode, scannerID) }
    }

    _barcodeLoadingDebouncer: Debouncer
    onBarcodeInputEnter(e)
    {
        if (e?.detail?.invalid)
        { 
            this.scannerprintersettings.sortingBarcodeInvalid(e.detail.ScannerID)
            return //EXIT!!!
        }
        var barcodes = e?.detail?.barcodes
        if (!Array.isArray(barcodes) && !barcodes?.length) { return } //EXIT!!!
        
        for (var barcodei of barcodes)
        {
            var barcode = barcodei.barcode
            var scannerid = barcodei.ScannerID //(e.detail ? e.detail.ScannerID : undefined)

            if (this.order && this.order.BatchID && this.order.Parts && this.order.Accessories && this.order.ToteLabels)
            {
                //check if there is a parts
                var part = this.order.Parts.filter(i => { return i.Barcode.toUpperCase() == barcode.toUpperCase() })
                var accessory = this.order.Accessories.filter(acci => { 
                    return acci.Doses.some(dosei => {
                        return dosei.Barcode.toUpperCase() == barcode.toUpperCase() 
                    })
                })
                
                if (part.length > 0)
                {
                    let v = part[0]
                    if (this.order.RecentAccessory)
                    {
                        this.set('order.RecentAccessory', null)
                        this.scannerprintersettings.sortingScannedAccessoryOff()
                    }

                    this.showToast(`${v.Barcode} - ${v.ToteNumber} - ${v.Fabric} - ${v.Name}`)

                    e.target.parentElement.value = ''
                    let itemdata = Object.assign({ ScannerID: scannerid }, v)
                    this.scannerprintersettings.sortingScanned(itemdata)
                    this._notifyServer(itemdata, this.order)
                }
                else if (accessory.length > 0) 
                {
                    let v = Object.assign({}, accessory[0])
                    v.Doses = v.Doses.filter(dosei => { return dosei.Barcode.toUpperCase() == barcode.toUpperCase() })
                    let d = v.Doses[0]
                    this.showToast(`${d.Barcode} - ${v.Title} - ${d.TotesList.length}`)

                    if (this.order.RecentAccessory)
                    {
                        this.scannerprintersettings.sortingScannedAccessoryOff()
                    }
                    this.set('order.RecentAccessory', v)

                    e.target.parentElement.value = ''
                    let itemdata = Object.assign({ ScannerID: scannerid }, d)
                    this.scannerprintersettings.sortingAccessoryScanned(itemdata)
                }
                else if (this.order.RecentAccessory)
                {
                    let r = this.order?.RecentAccessory
                    let d = this.order?.RecentAccessory?.Doses[0]
                    var dtinx = d.TotesList.findIndex(i => { return i.Barcode.toUpperCase() == barcode.toUpperCase() })
                    if (dtinx == -1)
                    {
                        this.showToast(this.localize('admin-ws-sorting-toast-notfound'))
                    }
                    else
                    {
                        let itemdata = Object.assign({ 
                            ScannerID: scannerid,
                            TotesList: d.TotesList.slice(0, dtinx + 1),
                        }, {})
                        var v = d.TotesList[dtinx]
                        this.showToast(`${v.Barcode} - ${v.ToteNumber} - ${r.Title}`)
                        this.scannerprintersettings.sortingAccessoryToteScanned(itemdata)
                        this._notifyServer(itemdata, this.order)
                    }
                }
                else
                {
                    this.showToast(this.localize('admin-ws-sorting-toast-notfound'))
                }
            }
            else
            {
                var repObj = Object.assign({}, this._requestObject(this.order), {
                    Barcode: barcode,
                    loading: true,
                    index: 0,
                })
                this.api_action = 'get'
                this.set('loadingCmd', true)
                this.cmdPost(this.api_url, repObj, (result, response, rq) =>
                {
                    this.set('loadingCmd', false)
                    var r = response
                    if (r)
                    {
                        if (r['success'] === true)
                        {
                            var order = r['result']
                            if (!order.Invalid && order.BatchID && this.order.BatchID && order.BatchID != this.order.BatchID)
                            {
                                this.new_order = order
                                this._openDlg(this.$.startnew_dialog as PaperDialogElement)
                            }
                            else
                            {
                                this.set('order', order)
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
                }, true, 3)

                e.target.parentElement.value = ''
                this.showToast(repObj.Barcode)
            }
        }
    }

    _computeDisabledPrintToteLabels(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }
    
    _computeDisabledPrintBatchLabel(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _computeDisabledStartNewBatch(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _compute_disabledShowState(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _compute_disabledSortResetBatch(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _computeDisabledDryTestParts(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _computeDisabledPartsLabels(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _computeDisabledPrintAccessories(loading, isAdmin, batchID)
    {
        return loading || !batchID
    }

    _computeShowPartsStats(loading, isAdmin, batchID, recentAccessory)
    {
        return batchID && !recentAccessory //loading == false && 
    }

    _computeBarcodeLabel(batchID)
    {
        let lbl = 'Part Number'
        return lbl
    }

    printToteLabelsTap(e)
    {
        var repObj: any = {
            Barcode: this.order.Barcode,
            loading: true,
        }
        repObj.index = 0
        this.api_action = 'get-labels'
        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var order = r['result']
                    this.scannerprintersettings.printToteLabels(order.ToteLabels)
                    this.showToast(this.localize('admin-ws-sorting-toast-totelabels'))
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
        }, true, 3)
    }

    printBatchLabelTap(e)
    {
        var repObj: any = {
            Barcode: this.order.Barcode,
            loading: true,
        }
        repObj.index = 0
        this.api_action = 'get-labels'
        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var order = r['result']
                    this.scannerprintersettings.printBatchLabel(order)
                    this.showToast(this.localize('admin-ws-sorting-toast-batchlabel'))
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
        }, true, 3)
    }

    printAccessoriesTap(e)
    {
        window.print()
    }

    showStatePartsAccessoriesTap(e)
    {
        if (!this.order) { return }

        if (this.order.RecentAccessory)
        {
            this.scannerprintersettings.sortingScannedAccessoryOff()
        }

        // this.api_action = 'get'
        // var obj = this._requestObject(this.order)
        // this._fetchItems(1, null, obj, (e) =>
        // {
            var itemdata = { 
                ToteLabels: this.order.ToteLabels,  
                ToteLabelsPartsOrAccesssoriesOnly: true,
            }
            this.scannerprintersettings.sortingAccessoryTotesStateShow(itemdata)
        // })
    }

    showStateTap(e)
    {
        if (!this.order) { return }

        if (this.order.RecentAccessory)
        {
            this.scannerprintersettings.sortingScannedAccessoryOff()
        }

        // this.api_action = 'get'
        // var obj = this._requestObject(this.order)
        // this._fetchItems(1, null, obj, (e) =>
        // {
            var itemdata = { ToteLabels: this.order.ToteLabels }
            this.scannerprintersettings.sortingAccessoryTotesStateShow(itemdata)
            // this.showToast('Url has been decoded')
        // })
    }

    _notifyServerDebouncer: Debouncer
    _notifyServerBarcodes: any = []
    _notifyServer(part, batch)
    {
        var barcodeStr = part.Barcode
        if (Array.isArray(part.TotesList))
        {
            barcodeStr = part.TotesList.reduce((acc, i) => { return acc ? `${acc},${i.Barcode}` : `${i.Barcode}` }, '')
        }
        this._notifyServerBarcodes.push(barcodeStr)

        var notifyHandler = () => 
        {
            this.loadingNotify = true
            this.api_action = 'update'
            var obj: any = {
                ManufactureOrderID: batch.ManufactureOrderID,
                BatchID: batch.BatchID,
                Barcodes: this._notifyServerBarcodes,
                RecentAccessory: batch.RecentAccessory, /// ? batch.RecentAccessory : undefined,
            }
            this._notifyServerBarcodes = []

            var rq = {
                url: this.api_url,
                body: obj,
                //airstrike: true,
                method: "POST",
                handleAs: "json",
                debounceDuration: 300,
                onLoad: this._onRequestNotifyResponse.bind(this, (order, rs, rq) => 
                {
                    // this._netbaseNotifyDebouncer = Debouncer.debounce(this._netbaseNotifyDebouncer, timeOut.after(450), notifyDebounceHandler)
                    for (var i in order)
                    {
                        if (i != 'Barcode' && i != 'Barcodes')
                        {
                            this.set('order.' + i, order[i])
                        }
                    }
                }),
                onError: this._onRequestNotifyError.bind(this, () => 
                { 
                    //this._netbaseNotifyDebouncer = Debouncer.debounce(this._netbaseNotifyDebouncer, timeOut.after(450), notifyDebounceHandler)
                })
            }
            if (!this._netbaseNotify) { this._netbaseNotify = new NetBase() }
            this._netbaseNotify._getResource(rq, 99999999, false)
        }

        this._notifyServerDebouncer = Debouncer.debounce(this._notifyServerDebouncer, timeOut.after(150), () => 
        { 
            notifyHandler()
        })
    }

    _onRequestNotifyResponse(callback, e, rq)
    {
        // console.log(arguments)
        // this._setLoading(false)
        this.loadingNotify = false
        var response = e.response

        if (response && response['success'] === true)
        {
            if (callback) { callback(response['result'], response, rq) }
        }
        else
        {
            if (callback) { callback(null, response, rq) }//to stop loading ... 
        }

        // if (response && response['summary'] && response.summary.Key !== 'validation_fail')
        // {
        //     var summary = response['summary']
        //     var barr = [
        //         {
        //             title: this.localize('admin-app-ok'),
        //             ontap: (te) => 
        //             {
        //                 window.location.href = window.location.href
        //             }
        //         }
        //     ]
        //     this.dispatchEvent(new CustomEvent('api-show-dialog', {
        //         bubbles: true, composed: true, detail: {
        //             required: true,
        //             announce: '',
        //             message: summary.Message,
        //             buttons: barr,
        //         }
        //     }))
        // }
    }

    _onRequestNotifyError(callback, e, rq)
    {
        // this._setLoading(false)
        this.loadingNotify = false

        // var barr = [
        //     {
        //         title: this.localize('admin-app-ok'),
        //         ontap: (te) => 
        //         {
        //             if (e.message == 'The request failed with status code: 401')
        //             {
        //                 this._goSignIn()
        //             }
        //         }
        //     }
        // ]
        // this.dispatchEvent(new CustomEvent('api-show-dialog', {
        //     bubbles: true, composed: true, detail: {
        //         required: true,
        //         announce: '',
        //         message: e.message,
        //         buttons: barr,
        //     }
        // }))

        if (callback) { callback(null, null, rq) }
    }

    sortResetTap(e)
    {
        // this.new_order = null
        this.sortreset_dialog = { Reason: '' }
        this._openDlg(this.$.sortreset_dialog as PaperDialogElement)
    }

    sortingStateResetConfirmTap(e)
    {
        // console.log(this.sortreset_dialog.Reason)
        this.scannerprintersettings.sortingScannedAccessoryOff()
        
        this.api_action = 'reset'
        var obj = Object.assign(this._requestObject(this.order), 
        { 
            Reason: this.sortreset_dialog.Reason, 
        })
        this._fetchItems(1, null, obj, (e) =>
        {
            // this.scannerprintersettings.sortingScannedAccessoryOff()
        })
    }

    startnewTap(e)
    {
        this.new_order = null
        this._openDlg(this.$.startnew_dialog as PaperDialogElement)
    }

    startnewbatchTap(e)
    {
        if (this.new_order == null)
        {
            this.set('order', {}) //new by dialog
        }
        else
        {
            this.set('order', this.new_order) //new by scan->net
        }
    }

    dryTestPartsTap(e)
    {
        var parts = this.order.Parts
        for (var i in parts)
        {
            this._notifyServer({ Barcode: this.order.Parts[i].Barcode }, this.order)
        }
    }

    onCloseStartNewDialog(e)
    {
        //
    }

    _onLoad(callback, e)
    {
        var r = e['response']
        if (r)
        {
            if (r['success'] === true)
            {
                var order = r['result']
                this.set('order', order)
                this._setLoading(false)

                if (callback) { callback(order) }
            }
            else if (r['success'] === false)
            {
                var order = r['result']
                this.order = order
                this._setLoading(false)
                var s = r['summary']
                if (s && (s.Key == 'validation_fail'))
                {
                    this._applyDetailsErrors('order', r['details'])

                    if (callback) { callback(order) }
                }
                else if (s && (s.Key == 'internal_server_error' || s.Key == 'concurrent_access'))
                {
                    this._onError(callback, { 
                        message: s.Message, 
                        errorid: r ? r['errorid'] : null, 
                        devErrorDetails: r ? r['_devErrorDetails'] : null 
                    })
                }
                else
                {
                    this._onError(callback, null)
                }
            }
            else if (r['error'])
            {
                this._onError(callback, r['error'])
            }

            if (this.api_action == 'cancel') 
            {
                this.api_action = 'get'
            }


            if (r && r['summary'])
            {
                var summary = r['summary']
                var barr = [
                    {
                        title: this.localize('admin-app-ok'),
                        ontap: (te) => 
                        {
                            //do nothing due it is may be a validation_failed...or sothing UI preserve is required
                            // window.location.href = window.location.href
                        }
                    }
                ]
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: '',
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
        }
        else
        {
            this._onError(callback, null)
        }
    }

    _isDose(doseA, doseB)
    {
        return doseA?.Barcode && doseA?.Barcode === doseB?.Barcode
    }
}
