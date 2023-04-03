import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-media-query/iron-media-query.js'
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
import view from './workstation-containerizing.ts.html'
import style from './workstation-containerizing.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import '../ui/ui-barcode-input'
import { UIAdminBarcodeInput } from '../ui/ui-barcode-input'
import { UIAdminDialog } from '../ui/ui-dialog'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
import 'chart.js/dist/Chart.js'
// import annotationPlugin from 'chartjs-plugin-annotation'
// Chart.register(annotationPlugin)
declare const Chart: any //?


@WorkstationDynamic
class AdminWorkstationContainerizing extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-containerizing' }

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
            mobileScreen: { type: Object },
            scrollTarget: { type: String, observer: 'scrollTargetChanged'},

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/containerizing-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            queryParamsRequired: { type: Object, value: [] },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },
            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            disabledBarcodeInput: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            scannedBarcodes: { type: Array, value: [] },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },
            recentWeight: { type: Number, value: -1, readOnly: true, },

            zoomimgi: { type: Object },

            cooldownFlag: { type: Boolean, computed: '_compute_cooldownFlag(cooldownProgress)' },
            cooldownProgress: { type: Number, value: 0, notify: true },

            showHistorgram: { type: Boolean, value: false },
            showItemFixed: { type: Boolean, value: true, reflectToAttribute: true },
            filter_dB: { type: Number, value: -100 },

            disabledResetTags: { type: Boolean, computed: '_computeDisabledResetTags(loadingAny)' },
            disabledAirContainer: { type: Boolean, computed: '_computeDisabledAirContainer(loadingAny, cooldownProgress, order.Container.ID, order.Container.InputPackage.Items, order.Container.AlreadyPacked, userInfo.isAdmin)' },
            disabledPrintContainer: { type: Boolean, computed: '_computeDisabledPrintContainer(loadingAny, order.Container.Label, userInfo.isAdmin)' },
            disabledDisposeContainer: { type: Boolean, computed: '_computeDisabledDisposeContainer(loadingAny, order.Container.IsDisposable, userInfo.isAdmin)' },
            disabledSetCartonContainer: { type: Boolean, computed: '_compute_disabledSetCartonContainer(loadingAny, order.Container.CanSetCarton, userInfo.isAdmin)' },

            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers, order.NoManufacturers)' },
        }
    }

    //#region Vars

    _netbase: any
    _observer: any
    _lockTags: boolean
    cooldownFlag: boolean
    loading: any
    env: any
    cooldownProgress: number
    disabledAirContainer: boolean
    _cooldownTimer: any
    histogramChart: any
    _lasthistAr: string
    filter_dB: number
    _setModelLock: boolean

    scrollTarget: any
    recentUnderScrollRectTop: number
    recentUnderScrollRectHeight: number
    recentUnderScroll: boolean
    allowUnderScroll: boolean
    onScrollHandler: any
    mobileScreen: boolean

    //#endregion

    
    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
            '_cartonSelected(order.Container.Carton.id)',
            '_cooldownMonitor(cooldownFlag)',
            '_buildChart(order.Container.InputPackage.Items, filter_dB)',
            '_buildInputPackage(order.Container.InputPackage.AllItems, filter_dB)',
        ]
    }
    _log(v) { console.log('ws-containerizing', v) }
    get scannerprintersettings() { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get barcodeinput() { return this.shadowRoot?.querySelector('#barcodeinput') as UIAdminBarcodeInput }
    get histogramChartCanvas() { return this.$['histogramChart'] as HTMLCanvasElement }
    // get productList() { return this.$['list'] as IronListElement }
    // get productListVirtual() { return this.$['list-virtual'] as IronListElement }
    

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))

        this._cooldownTimer = setInterval((e) => this._cooldownHandler(e), 17)

        // this.nfcReader = new NDEFReader()
        
        this.onScrollHandler = this.onScroll.bind(this)
    }

    disconnectedCallback()
    {
        if (this._cooldownTimer) clearInterval(this._cooldownTimer)

        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)
    }

    // async startNFCScan()
    // {
    //     await this.nfcReader.scan()
    //     this.nfcReader.onreading = (e) =>
    //     {
    //         console.log(e.message)
    //     }
    // }
    
    _barcodeInputPush(barcode, scannerID: any = null)
    {
        if (this.barcodeinput) { this.barcodeinput.barcodePush(barcode, scannerID) }
    }

    onBarcode(barcode)
    {
        this._barcodeInputPush(barcode)
        return true
    }

    _spdReceivePacket(e: CustomEvent)
    {
        var cmd = e.detail.pkt && e.detail.pkt.CommandResult ? e.detail.pkt.CommandResult : null

        if (cmd && cmd.Command == 'barcodescanned' && cmd.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.DataType
            this._barcodeInputPush(res.Data, res.ScannerID)
        }
        else if (cmd && cmd.Command == 'signalscanner' && cmd.ResultCode == 'fail')
        {
            this.showToast(this.localize('admin-ws-containerizing-scanner-fail', 'desc', cmd.Description))
        }
        else if (cmd && cmd.Command == 'rfidscannresult' && cmd.ResultCode == 'success' && e.detail.pkt.Tags !== undefined
            && this._lockTags !== true)
        {
            var tags = e.detail?.pkt?.Tags
            if (!Array.isArray(tags)) { return }

            //build all processed keys
            var recentKeys = {}
            if (Array.isArray(this.order?.Container?.InputPackage?.AllItems)) 
            { 
                recentKeys = this.order?.Container?.InputPackage?.AllItems.reduce((acc, curr) => 
                {
                    acc[curr.RFIDHex] = curr
                    return acc
                }, {})
            }
            //convert from localservice to model
            tags = tags.map((i: any) => 
            { 
                var tagi = this.convertLocalToServer(i)
                var processed = recentKeys[tagi.RFIDHex]
                return Object.assign(processed ? processed : {}, tagi)
            })
            //remove duplicates
            const a3 = tags.reduce((acc, x) =>
            {
                if (x.RFIDHex)
                {
                    acc[x.RFIDHex] = { ...acc[x.RFIDHex] || {}, ...x }
                }
                return acc
            }, {})
            tags = Object.values(a3)
            
            if (this.order && (!this.order.Container || !this.order.Container.InputPackage)) { this.order.Container = { InputPackage: { Items: []} } }
            this.set('order.Container.InputPackage.AllItems', tags)
        }
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
        if (!Array.isArray(barcodes)) { return } //EXIT!!!

        var scanners:{ID:''}[] = this.scannerprintersettings.getScanners()

        for (var barcodei of barcodes)
        {
            var barcode = barcodei.barcode
            var scannerid = barcodei.ScannerID //(e.detail ? e.detail.ScannerID : undefined)

            var scannerID = scannerid
            var scannerIndex = 0
            if (scanners && scannerID)
            {
                for (var i in scanners)
                {
                    if (scanners[i] && scanners[i].ID == scannerID)
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
    

            // if (!Array.isArray(this.order.Replacements)) { this.set('order.Replacements', []) }
            var repObj = Object.assign({}, this._requestObject(this.order), {
                Barcode: barcode,
                loading: true,
                BarcodeReaderIndex: scannerIndex,
                BarcodeReadersCount: scanners ? scanners.length : 0,
                index: 0,
            })
            if (this.order.CurrentPack) 
            { 
                repObj.CurrentPack = { 
                    ID: this.order?.CurrentPack?.ID,
                    PackID: this.order?.CurrentPack?.PackID,
                    Provider: this.order?.CurrentPack?.Provider,
                    Weight: this.order?.CurrentPack?.Weight,
                }
            }


            this.api_action = 'get'

            this.set('loadingCmd', true)
            if (this._barcodeLoadingDebouncer) { this._barcodeLoadingDebouncer.cancel() }
        
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

                        // if (this.order.Discarded || this.order.Invalid)
                        // {
                        //     this.scannerprintersettings.qaBarcodeInvalid(scannerID)
                        // }
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
    }

    _filterAlreadyPackedNoItems(items, alreadyPackedItems)
    {
        if (!Array.isArray(items) || typeof(alreadyPackedItems) != 'object') { return true }
        var packed = this._filterAlreadyPacked(items, alreadyPackedItems)
        return packed.length == 0
    }

    _filterAlreadyPacked(items, alreadyPackedItems)
    {
        if (!Array.isArray(items) || typeof(alreadyPackedItems) != 'object') { return items }
        var f = items.filter(i => !alreadyPackedItems[i.RFIDHex])
        return f.sort((a, b) => 
        { 
            if (this._isScanned(a) && !this._isScanned(b)) { return -1 }
            if (!this._isScanned(a) && this._isScanned(b)) { return 1 }
            // if (a.RFIDHex < b.RFIDHex) { return -1 }
            // if (a.RFIDHex > b.RFIDHex) { return 1 }
            return 0
        })
    }
    
    _isScanned(itemi)
    {
        return itemi.Unknown === undefined && itemi.Invalid === undefined && itemi.Missing === undefined
    }
    
    onPrintContainerTap(e)
    {
        var cnt = this.order?.Container
        this.scannerprintersettings.printContainerLabel(cnt?.Label?.ZPL, cnt?.Barcode)
        this.showToast(this.localize('admin-ws-containerizing-toast-printcontainerlabel'))
    }

    onTestTagsTap(e)
    {
        var tags: any = []
        var inputStr = '' //TODO: input value
        if (inputStr)
        {
            try 
            { 
                tags = JSON.parse(inputStr) 
                tags = tags.map(i => this.convertServerToLocal(i))
            } 
            catch 
            {
                //
            }
        }
        else
        {
            //TEST: mock tags randomly - this.order.Samples
            var samples = [ { "RFID": "", "RFIDHex": "", "SignalStrength": 0, "VisibilityCount": 0, "SeenTime": 0  },]
            samples = [
                //unknown
                { "RFID": "5955HCXNZOVYIX2T", "RFIDHex": "0000F5F5F5F5F5F5F5F5F5F5", "SignalStrength": -40, "VisibilityCount":1, "SeenTime": 1617818366233  },

                //invalid
                { "RFID": "ORXBLK0GGGTPK", "RFIDHex": "000000065D351BB4615E4A68", "SignalStrength": -52, "VisibilityCount":1, "SeenTime": 1617818366233  },
                { "RFID": "41LC6", "RFIDHex": "00000000000000000067A646", "SignalStrength": -63, "VisibilityCount":1, "SeenTime": 1617818366233  },
                { "RFID": "P1LC7", "RFIDHex": "00000000000000000281DB47", "SignalStrength": -64, "VisibilityCount":1, "SeenTime": 1617818366233  },
                { "RFID": "11LC9", "RFIDHex": "0000000000000000001AC349", "SignalStrength": -65, "VisibilityCount":1, "SeenTime": 1617818366233  },

                //valid
                { "RFID": "671ZQWRUG8F34", "RFIDHex": "00000001976FDC387403F660", "SignalStrength": -66, "VisibilityCount":1, "SeenTime": 1617818366233 },
                { "RFID": "SD199HWHE8848", "RFIDHex": "00000007490A754F4932CD18", "SignalStrength": -67, "VisibilityCount":1, "SeenTime": 1617818366233 },
                { "RFID": "PF1IS314C8155", "RFIDHex": "00000006876EC8A1C571A3C9", "SignalStrength": -68, "VisibilityCount":1, "SeenTime": 1617818366233 },


                { "RFID": "671ZQWRUG8F341", "RFIDHex": "00000001976FDC387403F660", "SignalStrength": -89, "VisibilityCount":1, "SeenTime": 1617818366233 },
                { "RFID": "SD199HWHE88482", "RFIDHex": "00000007490A754F4932CD18", "SignalStrength": -88, "VisibilityCount":1, "SeenTime": 1617818366233 },
                { "RFID": "PF1IS314C81553", "RFIDHex": "00000006876EC8A1C571A3C9", "SignalStrength": -92, "VisibilityCount":1, "SeenTime": 1617818366233 },
                //[{"hexvalue":"E280689400004007ED7210B3","userdata":"\u0011\u0011-&\u0013#+\u001b\u000e(#\"#\u0017\u0011\u000e\u0011\u001f"}]}
            ]

            const convert = this.convertServerToLocal
            if (tags.length == 0 && Array.isArray(samples))
            {
                for (var i = 0; i < 3; i++)
                {
                    var vi = RandomInteger(0, samples.length - 1)
                    tags.push(convert(samples[vi]))
                }

                if (this.order?.Container?.InputPackage?.Items)
                {
                    for (var ki of this.order.Container.InputPackage.Items)
                    {
                        tags.push(convert(ki))
                    }

                    //remove duplicates
                    const a3 = tags.reduce((acc, x) =>
                    {
                        if (x.hexvalue)
                        {
                            acc[x.hexvalue] = { ...acc[x.hexvalue] || {}, ...x }
                        }
                        return acc
                    }, {})
                    tags = Object.values(a3)
                }
            }
        }
        
        var efake = { detail: { pkt: { 
            CommandResult: { Command: 'rfidscannresult', ResultCode: 'success' },
            Tags: tags,
        } } } as CustomEvent

        this._spdReceivePacket(efake)
    }

    checkboxRemoveMissingChangeHandler(e)
    {
        if (e?.target?.checked)
        {
            var obj: any = {}
            var dialogremovemissing = this.$.dialogremovemissing as UIAdminDialog
            if (dialogremovemissing)
            {
                this.set('dialogremovemissing', Object.assign({}, obj, { loading: true }))
                dialogremovemissing.open()
            }
            this.async(() =>
            {
                this.set('dialogremovemissing.loading', false)
            }, 350)
        }
    }

    onCloseDialogRemoveMissing(e)
    {
        this.set('order.RemoveMissing', e.detail.confirm == true)
    }

    dialogremovemissingConfirmTap(e)
    {
        //do nothing
    }

    _onAirContainerTap(e?)
    {
        if (!Array.isArray(this.order?.Container?.InputPackage?.AllItems)) { return }

        var progress:any = null
        if (e)
        {
            progress = e.target.parentElement.querySelector('paper-spinner-lite')
            progress.active = true
        }

        this.api_action = 'pack-container'
        var newObj: any = Object.assign({ }, this.order, { DryRun: !e })
        var allItems = this.order.Container.InputPackage.AllItems
        delete this.order.Container.InputPackage.AllItems

        this._lockTags = true
        this.cmdPost(this.api_url, newObj, (r, response) =>
        {
            if (progress) { progress.active = false }

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var recentKeys = allItems.reduce((acc, curr) => 
                    {
                        acc[curr.RFIDHex] = curr
                        return acc
                    }, {})

                    var newModel = r['result']
                    if (Array.isArray(newModel.Container.InputPackage.Items))
                    {
                        for (var i in newModel.Container.InputPackage.Items)
                        {
                            var newi = newModel.Container.InputPackage.Items[i]
                            if (recentKeys[newi.RFIDHex])
                            {
                                recentKeys[newi.RFIDHex] = Object.assign(newi, {
                                    SignalStrength: recentKeys[newi.RFIDHex].SignalStrength,
                                    VisibilityCount: recentKeys[newi.RFIDHex].VisibilityCount,
                                    SeenTime: recentKeys[newi.RFIDHex].SeenTime,
                                })
                            }
                            else
                            {
                                recentKeys[newi.RFIDHex] = newi
                            }
                        }
                    }
                    newModel.Container.InputPackage.AllItems = Object.values(recentKeys)
                    this._setModelLock = true
                    this.set('order', newModel)
                    this._setModelLock = false
                    // this.showToast(this.localize('admin-ws-containerizing-toast-label'))
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                    // else if (s && this.api_summary_keys_hide[s.Key])
                    // {
                    //     this.showToast(s.Message)
                    // }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
                else
                {
                    this._onError(null, null)
                }
            }
            else
            {
                this._onError(null, null)
            }

            this._lockTags = false
        })
    
        if (e?.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    _onResetTagsTap(e)
    {
        this.set('cooldownProgress', 0)
        this.scannerprintersettings.containerizingRFIDStart()

        this._lockTags = true
        this.set('order.Container', {})
        this._lockTags = false
    }

    _lastCartonId: string
    _cartonSelected(cartonid)
    {
        if (this.loading || this._setModelLock) { return }
        if (!cartonid || this._lastCartonId == cartonid || cartonid == '0') { return }
        if (!this.order?.Container?.ID) { return } //need to be active-valid container
        
        this._lastCartonId = cartonid

        var progress = null // e.target.parentElement.querySelector('paper-spinner-lite')
        // progress.active = true
        this.api_action = 'set-carton'
        var newObj: any = Object.assign({ }, this.order)


        // delete newObj.Samples
        // if (newObj.Container) { newObj.Container.TestPack = true }

        // console.log(newObj)
        // return
        this.cmdPost(this.api_url, newObj, (r, response) =>
        {
            // progress?.active = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    // this.set('order.Container.Items', [])
                    // var newItem = r['result']
                    this._setModelLock = true
                    // this.set('order', newItem)
                    this._setModelLock = false
                    this.showToast(this.localize('admin-ws-containerizing-toast-carton'))
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                    // else if (s && this.api_summary_keys_hide[s.Key])
                    // {
                    //     this.showToast(s.Message)
                    // }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
                else
                {
                    this._onError(null, null)
                }
            }
            else
            {
                this._onError(null, null)
            }
        })

        // if (e?.preventDefault) 
        // {
        //     e.preventDefault()
        //     e.stopPropagation()
        // }
        return false
    }

    onDisposeContainerTap(e)
    {
        this._lockTags = true

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        this.api_action = 'dispose-container'
        var newObj: any = Object.assign({ }, this.order)
        // delete newObj.Samples
        // if (newObj.Container) { newObj.Container.TestPack = true }

        // console.log(newObj)
        // return
        this.cmdPost(this.api_url, newObj, (r, response) =>
        {
            progress.active = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.set('order.Container.Items', [])
                    var newItem = r['result']
                    this._setModelLock = true
                    this.set('order', newItem)
                    this._setModelLock = false
                    // this.showToast(this.localize('admin-ws-containerizing-toast-label'))
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                    // else if (s && this.api_summary_keys_hide[s.Key])
                    // {
                    //     this.showToast(s.Message)
                    // }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
                else
                {
                    this._onError(null, null)
                }
            }
            else
            {
                this._onError(null, null)
            }
            this._lockTags = false
        })

        if (e.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    convertLocalToServer(l)
    {
        return { 
            RFID: (this._asBool(l.userdata) ? l.userdata : l.hexvalue), 
            RFIDHex: l.hexvalue,
            SignalStrength: l.SignalStrength,
            VisibilityCount: l.VisibilityCount,
            SeenTime: l.SeenTime,
        }
    }

    convertServerToLocal(s: any) 
    {
        return { 
            hexvalue: s.RFIDHex, 
            userdata: s.RFID,
            SignalStrength: s.SignalStrength,
            VisibilityCount: s.VisibilityCount,
            SeenTime: s.SeenTime,
        }

    }

    onScroll(e)
    {
        var st = this.scrollTarget.scrollTop
        var recentUnderScroll = (st > this.recentUnderScrollRectTop) && !this.mobileScreen
        if (this.recentUnderScroll != recentUnderScroll) { this.recentUnderScroll = recentUnderScroll }
        // console.log('onScroll', st, this.recentUnderScrollRectTop)
    }

    scrollTargetChanged(t, ot)
    {
        if (!t) { return }

        if (ot) { ot.removeEventListener('scroll', this.onScrollHandler) }
        t.addEventListener('scroll', this.onScrollHandler)
    }

    _formatTimestamp(ms)
    {
        if (!ms) { return ms }
        return this._formatDate({ ms: ms })
    }

    gotoAnchor(e, b)
    {
        super.gotoAnchor(e, b, 180)
    }

    anchorSelector(tabi)
    {
        return `#A${tabi}`
    }

    _anchorIndexStyle(orderContainerPackages, packageiItems, packageinx, iteminx)
    {
        var inx = 0
        for (var pi in orderContainerPackages)
        {
            var packagei = orderContainerPackages[pi]
            for (var ti in packagei.Items)
            {
                var itemi = packagei.Items[ti]
                if (this._or(itemi.Missing, itemi.Invalid))
                {
                    inx++
                }
                if (packageinx == pi && ti == iteminx)
                {
                    break
                }
            }
            if (packageinx == pi) { break }
        }
        return `--x: ${inx}`
    }

    _cooldownHandler(e?)
    {
        if (this.cooldownProgress >= 100) { return }
        this.set('cooldownProgress', this.cooldownProgress + (this._dev ? 100/60 : 100/360))
    }

    _cooldownMonitor(cooldownFlag)
    {
        if (!cooldownFlag) { return }
        if (!this.disabledAirContainer) { this._onAirContainerTap() }
    }

    _computeDisabledDisposeContainer(loading, isDesposable, isAdmin)
    {
        return loading || isDesposable !== true
    }

    _compute_disabledSetCartonContainer(loading, CanSetCarton, isAdmin)
    {
        return loading || CanSetCarton !== true
    }

    _computeDisabledPrintContainer(loading, label, isAdmin)
    {
        return loading || !label
    }

    _computeDisabledAirContainer(loading, cooldownProgress, containerID, inputPackage_Items, alreadyPacked, isAdmin)
    {
        return !this._compute_cooldownFlag(cooldownProgress) || loading || containerID
            || ((inputPackage_Items === undefined || inputPackage_Items.length  < 1)
                && (alreadyPacked === undefined || Object.keys(alreadyPacked).length  < 1))
    }

    _computeDisabledResetTags(loading)
    {
        return loading
    }

    _compute_cooldownFlag(cooldownProgress)
    {
        return cooldownProgress >= 100
    }

    _computeShowManufacturers(manlist, noManufacturers)
    {
        return manlist && !noManufacturers
    }

    _onDownloadTap(e) 
    {
        var moid = e.target.getAttribute('mo-id')
        var batchid = e.target.getAttribute('batch-id')
        var pdf = e.target.getAttribute('pdf-id')
        var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
        this.getOrderFile({ moid: moid, batchid: batchid, pdf: pdf }, progress)
        
        // window.location.href = this.order.Url

        e.preventDefault()
        return false
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }

    _buildInputPackage(allItems, filter_dB)
    {
        if (!Array.isArray(allItems) || !filter_dB) { return }

        var recentKeys = {}
        if (Array.isArray(this.order?.Container?.InputPackage?.Items)) 
        { 
            recentKeys = this.order?.Container?.InputPackage?.Items.reduce((acc, curr) => 
            {
                acc[curr.RFIDHex] = curr
                return acc
            }, {})
        }

        var filtertags = allItems.filter(i => i.SignalStrength >= filter_dB)

        var filteredKeys = filtertags.reduce((acc, curr) => 
        {
            acc[curr.RFIDHex] = curr
            return acc
        }, {})
        
        if (JSON.stringify(Object.keys(recentKeys).sort()) != JSON.stringify(Object.keys(filteredKeys).sort()))
        {
            this.set('cooldownProgress', 0)
        }

        if (this.order && (!this.order.Container || !this.order.Container.InputPackage)) { this.order.Container = { InputPackage: { Items: [] } } }
        this.set('order.Container.InputPackage.Items', filtertags)
    }

    _buildChart(inputItems, filter_dB)
    {
        var tags = inputItems ?? []

        var tolerance_dB = 5
        var hist = {}
        for (var i of tags)
        {
            var hv = Math.floor(i.SignalStrength / tolerance_dB) * tolerance_dB
            hist[hv] = (hist[hv] == undefined ? 1 : hist[hv] + 1)
        }
        var histAr: any = []
        for (var hi of Object.keys(hist))
        {
            var dBi = parseInt(hi)
            histAr.push({dB: dBi, tags: hist[hi] })
        }
        histAr = histAr.sort((a, b) => 
        { 
            if (a.dB < b.dB) { return 1 }
            if (a.dB > b.dB) { return -1 }
            return 0
        })

        var lastHistAr = JSON.stringify(histAr)
        if (this._lasthistAr == lastHistAr) { return } //EXIT
        this._lasthistAr = lastHistAr
        
        // console.log(histAr.map(i => i.dB), histAr.map(i => i.tags))

        var сhartData: any = { }
        сhartData.labels = histAr.map(i => i.dB)
        сhartData.datasets = [{
            barPercentage: 0.5,
            barThickness: 6,
            maxBarThickness: 8,
            minBarLength: 2,
            data: histAr.map(i => i.tags)
        }]
        // console.log(histAr.map(i => i.tags))
        
        if (this.histogramChart)
        {
            this.histogramChart.data = сhartData
            this.histogramChart.update()
        }
        else
        {
            var ctx = this.histogramChartCanvas.getContext('2d')
            const chartConf = {
                type: 'bar',
                data: сhartData,
                options: {
                    responsive: true,
                    animation: false,
                    stacked: false,
                    hover: {
                        mode: 'index',
                        intersec: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: this.localize('admin-ws-containerizing-hist-title'),
                        },                        
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: () => { return '' },
                                label: (ttipi, data) => 
                                {
                                    return `Tags ${ttipi.formattedValue} with signal about ${ttipi.label}dB`
                                }
                            }
                        },
                        legend: {
                            display: false,
                        }
                    },

                    scales: {
                        x: {
                            display: true,
                            ticks: {
                                callback: function (value, index, values)
                                {
                                    return `${this.getLabelForValue(value)}dB`
                                }
                            },
                            title: {
                                display: true,
                                text: this.localize('admin-ws-containerizing-hist-x'),
                            },
                        },
                        y: {
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            suggestedMin: 0,
                            ticks: {
                                stepSize: 1,
                                callback: function (value, index, values)
                                {
                                    return `${this.getLabelForValue(value)}`
                                }
                            },
                            title: {
                                display: true,
                                text: this.localize('admin-ws-containerizing-hist-y'),
                            },
                        }, 
                    }
                },
            }
            this.histogramChart = new Chart(ctx, chartConf)
        }
    }

    async _showBarcodeDetailsTap(e)
    {
        var barcode = e?.model?.__data?.itemi?.RFID 
            || e?.model?.__data?.packagei?.Barcode
            || e?.model?.__data?.itemi?.Barcode
        await this.barcodeinput.showBarcodeDetails(barcode)
    }
}
