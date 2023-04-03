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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { IAdminSignalR_RollInspectionProgress } from '../../components/bll/signalr-global'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-roll-inspection.ts.html'
import style from './workstation-roll-inspection.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import '../ui/ui-scanner-printer-settings'
import '../../components/ui/ui-image'
import '../../components/ui/ui-image-svg'
import '../../components/bll/user-bot-data'
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
// import { PaperInputBehavior } from '@polymer/paper-input/paper-input-behavior'
// const Teamatical: TeamaticalGlobals = window['Teamatical']


@WorkstationDynamic
class AdminWorkstationPrintingReplacement extends WorkstationBase implements IAdminSignalR_RollInspectionProgress
{
    static get is() { return 'tmladmin-workstation-roll-inspection' }

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

            APIPath: { type: String, value: '/admin/api/workstation/print-replacement-' },
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
            lazyObserve: { type: String },//image lazyload

            tabletMode: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },

            barcodeExists: { type: Boolean, value: false },
            zoomimgi: { type: Object },
            dialogconfirmreplaceroll: { type: Object },

            disabledCommit: { type: Boolean, computed: '_computeDisabledCommit(loading, order, order.Replacements, order.Replacements.*)' },
            disabledFinishRoll: { type: Boolean, computed: '_computeDisabledBtn(loading, barcodeExists)' },
            disabledRequestBatch: { type: Boolean, computed: '_computeDisabledBtn(loading, barcodeExists)' },
        }
    }

    _netbase: any
    _observer: any
    loading: any
    env: any
    _spdReceivePacket_bind: any
    zoomimgi: any
    dialogconfirmreplaceroll: any


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_tabletDetection(queryParams.tablet)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
        ]
    }
    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()

        this._observer = new FlattenedNodesObserver(this.shadowRoot, (info: any) =>
        {
            var added = info.addedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.id == 'scanner-printer-settings') })
            // console.log(info, added)
            if (added.length > 0) 
            {
                var scannerprintersettings = added[0] as UIScannerPrinterSettings
                scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
            }
        })
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
    
    SR_PrintingTuningProcessedHandler(oobj: any)
    {
        this.api_action = 'get'
        var obj: any = this._requestObject(this.order)
        this._fetchItems(1, null, obj)

        // if (!this.order || !this.order.Replacements) { return }
        // for (var i in this.order.Replacements)
        // {
        //     if (this.order.Replacements[i] && this.order.Replacements[i].PrintingTuningID == oobj)
        //     {
        //         this.set('order.Replacements.' + i + '.Disabled', true)
        //     }
        // }
    }

    _spdReceivePacket(e: CustomEvent)
    {
        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'barcodescanned' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.Data
            // res.DataType
            // res.ScannerID
            var efake = { target: { parentElement: { value: res.Data } } }
            this._barcodeTap(efake)
        }
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        if (this.order?.CurrentBatch?.Items)
        {
            this.set('order.Replacements', this.order.Replacements.reverse())
        }

        this.set('order.Rolls', [
            {
                id: '1',
                TotalCommited: 0,
                Committed: 0,
                Processed: 0,
            },
            {
                id: '2',
                TotalCommited: 0,
                Committed: 0,
                Processed: 0,
            },
        ])
    }

    onSelectedBatch(e)
    {
        if (!e.detail.value) { return }
        var batchi = e.detail.value.__dataHost.__data.batchi

        if (this.order.CurrentBatch.ManufactureOrderID != batchi.ManufactureOrderID || this.order.CurrentBatch.BatchID != batchi.BatchID)
        {
            this.order.CurrentBatch = batchi

            this.dialogcancel_reason = ''
            this.api_action = 'get'
            var obj: any = this._requestObject(this.order)
            this._fetchItems(3, null, obj)
        }
    }

    _barcodeChanged(e)
    {
        var v = e.target.value || ''
        this.set('barcodeExists', !(!v.trim()))
        this.set('order.Invalid', false)
        this.set('order.IsDuplicate', false)
        return this._onInputChanged(e)
    }

    _onDownloadTap(e) 
    {
        var moid = e.target.getAttribute('mo-id')
        var batchid = e.target.getAttribute('batch-id')
        var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
        this.getOrderFile({ moid: moid, batchid: batchid }, progress)

        e.preventDefault()
        return false
    }

    _onGenerateTap(e)
    {
        // var moid = e.target.getAttribute('mo-id')
        // var batchid = e.target.getAttribute('batch-id')
        this.api_action = 'generate'
        var obj: any = this._requestObject(this.order)
        this._fetchItems(3, null, obj)
    }

    onInputChanged(e)
    {
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

        if (!Array.isArray(this.order.Replacements)) { this.set('order.Replacements', []) }
        var repObj = Object.assign({}, this._requestObject(this.order), {
            Barcode: e.target.parentElement.value,
            loading: true,
        })
        this.set('order.Invalid', false)
        this.set('order.IsDuplicate', false)

        this.unshift('order.Replacements', repObj)
        repObj.index = 0        
        this.api_action = 'item'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            this.set('order.Replacements.' + rq.body.index + '.loading', false)

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    
                    let order = r['result']

                    this.set('order.Invalid', order.Invalid)
                    this.set('order.IsDuplicate', order.IsDuplicate)

                    if (order.Invalid || order.IsDuplicate)
                    {
                        this.splice('order.Replacements', 0, 1)
                    }
                    else if (order.IsRoll)
                    {
                        this.splice('order.Replacements', 0, 1)
                        this.set('order.IsRoll', true)
                        var input = this.$['newbarcode'] as PaperInputElement
                        input.value = order.Barcode
                        this.showToast(
                            this.localize('admin-ws-roll-inspection-toast-roll', 'barcode', repObj.Barcode)
                        )
                    }
                    else
                    {
                        this.set('order.Replacements.' + rq.body.index, order)
                        this.showToast(
                            this.localize('admin-ws-roll-inspection-toast-part', 'barcode', repObj.Barcode)
                        )
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

        e.target.parentElement.value = ''
    }

    _removeRepTap(e)
    {
        if (!Array.isArray(this.order.Replacements)) { return }
        // var list = e.model.__data.repli
        var rinx = e.model.__data.index
        var repObj: any = this.order.Replacements[rinx]
        
        this.set('order.Invalid', false)
        this.set('order.IsDuplicate', false)

        this._setLoading(true)
        this.set('order.Replacements.' + rinx + '.removing', true)
        this.api_action = 'item-remove'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            this._setLoading(false)
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    let order = r['result']
                    if (order.Invalid)
                    {
                        //
                    }
                    else
                    {
                        rinx = -1
                        for (var i in this.order.Replacements)
                        {
                            if (repObj.ItemID != undefined && this.order.Replacements[i].ItemID == repObj.ItemID)
                            {
                                rinx = i
                                break
                            }
                        }
                        if (rinx != -1) { this.splice('order.Replacements', rinx, 1) }
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

    _computeDisabledCommit(loading, model, rlist, rlistP)
    {
        return loading || (rlist && rlist.length < 1)
    }

    _computeDisabledBtn(loading, barcodeExists)
    {
        return loading || !barcodeExists
    }

    _onCommitTap(e)
    {
        this.api_action = 'commit'
        var obj = this._requestObject(this.order)
        this._fetchItems(1, null, obj, (e) =>
        {
            if (e && e.TotalCommited) { this.showToast(this.localize('admin-ws-roll-inspection-toast-commited')) }
            
        })
    }

    _onFinishRollTap(e)
    {
        var input: any = this.$['newbarcode']
        this.order.Barcode = input ? input.value : undefined
        this.api_action = 'finish-roll'
        var obj = this._requestObject(this.order)
        this._fetchItems(1, null, obj, (e) =>
        {
            this.set('order.IsRoll', false)
            var input = this.$['newbarcode'] as PaperInputElement
            input.value = ''

            if (e && e.TotalCommited) { this.showToast(this.localize('admin-ws-roll-inspection-toast-finished')) }
        })
    }

    _onLoad(callback, e)
    {
        // console.log(e)
        var r = e['response']
        if (r)
        {
            if (r['success'] === true)
            {
                var order = r['result']
                if (order && !order.Replacements) { order.Replacements = [] }

                if (this.api_action == 'get' && this.order && (order && !order.pfirst))
                {
                    //override input ...
                    if (order.CurrentBatch) 
                    {
                        if (this.order.CurrentBatch.NestingQualityValue) { order.CurrentBatch.NestingQualityValue = this.order.CurrentBatch.NestingQualityValue }
                        for (var i in order.CurrentBatch.Fabrics)
                        {
                            if (this.order.CurrentBatch.Fabrics && this.order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters)
                            {
                                order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters = this.order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters
                            }
                        }
                    }

                    delete order.Barcode
                    this.set('order', order)
                    // for (var i in order)
                    // {
                    //     if (i == 'Barcode')
                    //     {
                    //         //
                    //     }
                    //     else
                    //     {
                    //         this.set('order.' + i, order[i])
                    //     }
                    // }
                }
                else
                {
                    this.set('order', order)
                }
                this._setLoading(false)

                if (callback) { callback(order) }
            }
            else if (r['success'] === false)
            {
                var order = r['result']
                
                if (order) { this.order = order }

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
                else if (s && (s.Key == 'invalid_barcode') && this.order)
                {
                    this.set('order.Invalid', true)
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


            if (r && r['summary'] && r['summary'].Key != 'invalid_barcode')
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

    _disabledReplaceRoll(loadingAny, repliDisabled)
    {
        return loadingAny || repliDisabled
    }

    onProductPartImageTap(e)
    {
        var repli = e.model.__data.repli
        // console.log(e.model.__data)
        this.zoomimgi = repli
        this._openDlg(this.$.dialogzoom as PaperDialogElement)
    }
    onProductPartImageBackTap(e)
    {
        var parti = e.model.__data.parti
        // console.log(e.model.__data)
        this.zoomimgi = parti
        this._openDlg(this.$.dialogzoomback as PaperDialogElement)
    }

    replacerollConfirmTap(e)
    {
        if (!Array.isArray(this.order.Replacements)) { return }

        var rinx = this.dialogconfirmreplaceroll?.index
        var repObj: any = this.order.Replacements[rinx]
        
        this._setLoading(true)

        this.set('order.Invalid', false)
        this.set('order.IsDuplicate', false)

        this.set('order.Replacements.' + rinx + '.loading', true)
        this.api_action = 'replace-roll'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            this._setLoading(false)
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    let repli = r['result']
                    if (repli.Invalid)
                    {
                        //
                    }
                    else
                    {
                        rinx = -1
                        for (var i in this.order.Replacements)
                        {
                            if (repObj.ItemID != undefined && this.order.Replacements[i].ItemID == repObj.ItemID)
                            {
                                rinx = i
                                break
                            }
                        }
                        if (rinx != -1) 
                        { 
                            this.set('order.Replacements.' + rinx, repli) 
                        }
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

    _onReplaceRollTap(e)
    {
        var repli = e.model.__data.repli
        var rinx = e.model.__data.index
        this.dialogconfirmreplaceroll = { obj: repli, index: rinx }
        this._openDlg(this.$['dialogconfirm-replaceroll'] as PaperDialogElement)
    }

}
