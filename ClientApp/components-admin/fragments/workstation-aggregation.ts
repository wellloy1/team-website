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
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IAdminSignalR_ShippingProgress } from '../../components/bll/signalr-global'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-aggregation.ts.html'
import style from './workstation-aggregation.ts.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import '../ui/ui-barcode-input'
import { UIAdminDialog } from '../ui/ui-dialog'
import { UIAdminBarcodeInput } from '../ui/ui-barcode-input'
import { UIScannerPrinterSettings, SCANNERCOLORS } from '../ui/ui-scanner-printer-settings'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const cellSpaces = 4 * 2 + 4 * 2 //padding + border
const cellGap = 10
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }
const AdminWorkstationAggregationBase = mixinBehaviors([IronResizableBehavior], WorkstationBase) as new () => WorkstationBase & IronResizableBehavior


@WorkstationDynamic
class AdminWorkstationAggregation extends AdminWorkstationAggregationBase implements IAdminSignalR_ShippingProgress
{
    static get is() { return 'tmladmin-workstation-aggregation' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

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
            scrollTarget: { type: String, observer: 'scrollTargetChanged'},

            order: { type: Object },
            selectedBatchID: { type: Object },
            scannerList: { type: Array },
            ls_connected: { type: Boolean, observer: 'ls_connectedChanged' },

            APIPath: { type: String, value: '/admin/api/workstation/aggregation-' },
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
            dialogcellinfo: { type: Object },
            dialogprintcells: { type: Object },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },

            zoomimgi: { type: Object },

            disabledReset: { type: Boolean, computed: '_computeDisabledReset(loading, order.CanReset, userInfo.isAdmin)' },
            disabledDownload: { type: Boolean, computed: '_computeDisabledDownload(loading, order.Url, userInfo.isAdmin)' },
            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers, order.NoManufacturers)' },

            RecentCellAndScanners: { type: Array, computed: '_computeRecentCellAndScanners(order.RecentCell, scannerList)' },

            recentUnderScroll: { type: Boolean, value: false },
            allowUnderScroll: { type: Boolean, value: true },
            capacityMax: { type: Number },
            heightBase: { type: Number },
            widthBase: { type: Number },
            heightMaxRowSpaces: { type: Number },
        }
    }

    _netbase: any
    _observer: any
    _cellStateRestoreDebouncer: any
    // _ledsFirstLoad: any = false
    loading: any
    env: any
    scrollTarget: any
    recentUnderScrollRectTop: number
    recentUnderScrollRectHeight: number
    recentUnderScroll: boolean
    allowUnderScroll: boolean
    onScrollHandler: any
    dialogcellinfo: any
    dialogprintcells: any
    capacityMax: number
    heightBase: number
    widthBase: number
    heightMaxRowSpaces: number

    
    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
        ]
    }
    _log(v) { console.log(v) }
    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get barcodeinput() { return this.shadowRoot?.querySelector('#barcodeinput') as UIAdminBarcodeInput }


    connectedCallback()
    {
        super.connectedCallback()

        this.style.setProperty('--tmladmin-workstation-aggregation-scannercolor1', `#${SCANNERCOLORS[0]}`)
        this.style.setProperty('--tmladmin-workstation-aggregation-scannercolor2', `#${SCANNERCOLORS[1]}`)
        this.style.setProperty('--tmladmin-workstation-aggregation-scannercolor3', `#${SCANNERCOLORS[2]}`)

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        if (this.scannerprintersettings)
        {
            this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
            this.scannerprintersettings.addEventListener('api-scanner-printer-update-state', this._spdUpdateState.bind(this))
        }

        this.onScrollHandler = this.onScroll.bind(this)

        this._observer = new FlattenedNodesObserver(this.shadowRoot, (info: any) =>
        {
            // console.log(info)
            // var added = info.addedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.id == 'scanner-printer-settings') })
            if (!this._asBool(this.recentUnderScrollRectTop))
            {
                // var anchor = this.$['recent-cell-container'] as HTMLDivElement
                var anchor = this.shadowRoot ? this.shadowRoot.querySelector('.recent-cell-container') : null
                var st = 0//this.scrollTarget.scrollTop

                this.async(() =>
                {
                    var rect = anchor ? anchor.getBoundingClientRect() : { top: 0, height: 0 }
                    this.recentUnderScrollRectTop = rect.top + st + 60
                    this.recentUnderScrollRectHeight = Math.max(rect.height, 124)
                    // console.log('recentUnderScrollRectTop', this.recentUnderScrollRectHeight)
                    // console.log('recentUnderScrollRectTop', this.recentUnderScrollRectTop, this.recentUnderScrollRectHeight)
                })
            }
        })

        this.addEventListener('iron-resize', (e) => this._onResized(e))
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
        // this._ledsFirstLoad = true

    }

    SR_ReconnectHandler()
    {
        // this._ledsFirstLoad = true
        super.SR_ReconnectHandler()
    }

    SR_ShippingAggregationCellCompleteHandler(pobj: any)
    {
        if (!pobj) { return }

        // this.scannerprintersettings.aggregationCellComplete(pobj.CellIndex) //restore state will set LEDs state...
        this.api_action = 'get'
        var obj: any = this._requestObject(this.order)
        delete obj.Barcode //need to clean  because Manufacturer change
        this._fetchItems(3, null, obj, (order) => 
        { 
            //LEDs (CELLs indicator)
            this.cellsLEDStateRestore(order, 17)
        })
    }

    _formatBatch(batch)
    {
        if (batch === null) { return this.localize('admin-ws-aggregation-batch-notplannedyet') }
        return batch
    }

    _onResized(e?)
    {
        if (this.order?.Shelves) { this._calcMaxCapacity(this.order.Shelves) }
    }

    onScroll(e)
    {
        var st = this.scrollTarget.scrollTop
        var recentUnderScroll = st > this.recentUnderScrollRectTop
        if (this.recentUnderScroll != recentUnderScroll) { this.recentUnderScroll = recentUnderScroll }
        // console.log('onScroll', st, this.recentUnderScrollRectTop)
    }

    scrollTargetChanged(t, ot)
    {
        if (!t) { return }

        if (ot) { ot.removeEventListener('scroll', this.onScrollHandler) }
        t.addEventListener('scroll', this.onScrollHandler)
    }

    
    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        //Shelves (screen)
        if (order.Shelves)
        {
            var shelvesGrouped = Object.assign([], order.Shelves)
            for (var s of shelvesGrouped)
            {
                if (s.Rows?.length <= 0) { continue }

                var rgroups = []
                var l = s.Rows[0].Cells.length
                var rgroup = []
                for (var r of s.Rows)
                {
                    if (l == r.Cells.length)
                    {
                        rgroup.push(r)
                    }
                    else
                    {
                        l = r.Cells.length
                        rgroups.push(rgroup)
                        rgroup = []
                        rgroup.push(r)
                    }
                }
                if (rgroup.length > 0)
                {
                    rgroups.push(rgroup)
                }

                s.RowGroups = rgroups
                // delete s.Rows
            }
            this.set('order.ShelvesGrouped', shelvesGrouped)
        }

        this.cellsLEDStateRestore(order)
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
            this.showToast(this.localize('admin-ws-aggregation-scanner-fail', 'desc', cmd.Description))
        }
    }

    _spdUpdateState(e: CustomEvent)
    {
        if (e.detail.action == 'opened' && this.order)
        {
            this.cellsLEDStateRestore(this.order)
        }
    }

    onBarcode(barcode)
    {
        this._barcodeInputPush(barcode)
        return true
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
            this.scannerprintersettings.aggregationBarcodeInvalid(e.detail.ScannerID)
            return //EXIT!!!
        }
        var barcodes = e?.detail?.barcodes
        if (!Array.isArray(barcodes) && !barcodes?.length) { return } //EXIT!!!

        var scanners:{ID:''}[] = this.scannerprintersettings.getScanners()
        for (var barcodei of barcodes)
        {
            var barcode = barcodei.barcode
            var scannerID = barcodei.ScannerID

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
            if (scanners?.length > 0)
            { 
                if (scannerIndex >= scanners.length && !this._dev)
                {
                    this.showToast(this.localize('admin-ws-aggregation-scanner-notfound'))
                    continue //EXIT!!!
                }
                scannerID = scanners[scannerIndex]?.ID 
            }
 

            var repObj: any = Object.assign(this._requestObject(this.order), {
                Barcode: barcode,
                loading: true,
                BarcodeReaderID: scannerID,
                BarcodeReaderIndex: scannerIndex,
                BarcodeReadersCount: scanners ? scanners.length : 0,
            })
            
            // this.push('order.Replacements', repObj)
            // repObj.index = this.order.Replacements.length - 1
            // this.unshift('order.Replacements', repObj)
            repObj.index = 0
            this.api_action = 'get'
            
            if (this.order && Array.isArray(this.order.RecentCell) && repObj.Barcode)
            {
                var barcode = repObj.Barcode.trim()
                var recent = this.order.RecentCell.filter(i => i.BarcodeReaderIndex == scannerIndex)
                if (recent.length > 0 && recent[0].ExpectedBarcode && recent[0].CancelBarcode 
                    && recent[0].ExpectedBarcode != barcode && recent[0].CancelBarcode != barcode)
                {
                    this._barcodeInvalidFeedback(scannerID)
                    this.showToast(this.localize('admin-ws-aggregation-item-invalid'))
                    continue //EXIT!
                }
            }
    
            this.showToast(repObj.Barcode)
    
            this.cmdPost(this.api_url, repObj, (result, response, rq) =>
            {
                // this.set('order.Replacements.' + rq.body.index + '.loading', false)
                var r = response
                if (r)
                {
                    if (r['success'] === true)
                    {
                        var obj = r['result']
                        // console.log(r['result'])
                        // this.showToast(`${v.Barcode} - ${v.ToteNumber} - ${v.Fabric} - ${v.Name}`)
    
                        //LEDs Handling
                        this._barcodeLEDHandle(obj)
    
                        this.set('order', obj)
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
        }
    }

    _barcodeInvalidFeedback(barcodeReaderID)
    {
        this.scannerprintersettings.aggregationBarcodeInvalid(barcodeReaderID)
    }

    _barcodeLEDHandle(obj)
    {
        if (!obj) { return }


        if (obj.Invalid)
        {
            this._barcodeInvalidFeedback(obj.BarcodeReaderID)
            this.showToast(obj.BarcodeReaderID + ': ' + this.localize('admin-ws-aggregation-item-invalid'))
        }
        else
        {
            if (obj.AssignedCell)
            {
                // let itemdata = Object.assign({ ScannerID: obj.BarcodeReaderID }, obj.AssignedCell)
                // this.scannerprintersettings.aggregationProductScanned(itemdata)

                this.gotoShelf(obj.AssignedCell?.CellIndex)
            }

            if (obj.InvalidConfirm)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.gotoShelf(obj.InvalidConfirm?.CellIndex)
            }
            else if (obj.ConfirmedCell)
            {
                // let itemdata = Object.assign({ ScannerID: obj.BarcodeReaderID }, obj.ConfirmedCell)
                // this.scannerprintersettings.aggregationProductConfirmed(itemdata)
                this.gotoShelf(obj.ConfirmedCell?.CellIndex)
            }

            if (obj.InvalidEmpty)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.gotoShelf(obj.InvalidEmpty?.CellIndex)
            }
            else if (obj.EmptiedCell)
            {
                // let itemdata = Object.assign({ ScannerID: obj.BarcodeReaderID }, obj.EmptiedCell)
                // this.scannerprintersettings.aggregationCellEmpty(itemdata)
                this.gotoShelf(obj.EmptiedCell?.CellIndex)
            }

            if (obj.OutOfSpace === true)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.showToast(obj.BarcodeReaderID + ': ' + this.localize('admin-ws-aggregation-scanner-fail-outofspace'))
            }

            if (obj.QaNotApproved === true)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.showToast(obj.BarcodeReaderID + ': ' + this.localize('admin-ws-aggregation-scanner-fail-qanotapproved'))
            }

            if (obj.AdvancedToShipping === true)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.showToast(obj.BarcodeReaderID + ': ' + this.localize('admin-ws-aggregation-scanner-fail-passed2shipment'))
            }

            if (obj.CantForceCompletion === true)
            {
                this._barcodeInvalidFeedback(obj.BarcodeReaderID)
                this.showToast(obj.BarcodeReaderID + ': ' + this.localize('admin-ws-aggregation-scanner-fail-cantforcecompletion'))
            }


            // When "obj" is assigned LEDs state will be restored
        }

        //LEDs (CELLs indicator)
        this.cellsLEDStateRestore(obj, 17)
    }

    ls_connectedChanged(v, o)
    {
        if (!o && v && this.order) 
        {
            // console.log('cellsLEDStateRestore 000')
            this.cellsLEDStateRestore(this.order)
        }
    }

    cellsLEDStateRestore(order, tms = 200)
    {
        // console.log('cellsLEDStateRestore 1')
        var recentcells = order?.RecentCell
        var cells = order?.Cells
        this._cellStateRestoreDebouncer = Debouncer.debounce(this._cellStateRestoreDebouncer, timeOut.after(tms), () =>
        {
            // console.log('cellsLEDStateRestore 2')
            this.scannerprintersettings.aggregationCellsStateRestore(cells, recentcells)
        })
    }

    _putRecentBackToHeapTap(e)
    {
        var rcelli = e.model.__data.rcelli
        this._barcodeInputPush(rcelli.CancelBarcode, rcelli.ID)
    }

    _putRecentToProperCellTap(e)
    {
        var rcelli = e.model.__data.rcelli
        this._barcodeInputPush(rcelli.ExpectedBarcode, rcelli.ID) 
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }

    _computeDisabledReset(loading, canReset, isAdmin)
    {
        return !canReset || loading
    }

    _computeDisabledDownload(loading, Url, isAdmin)
    {
        return loading || !Url
    }

    _computeShowManufacturers(manlist, noManufacturers)
    {
        return manlist && !noManufacturers
    }

    _computeRecentCellAndScanners(recentCells, scannerList)
    {
        if (recentCells == undefined || scannerList == undefined) { return [] }

        // console.log(recentCells, scannerList)

        var mergedAr = [...Array(Math.max(scannerList.length, recentCells.length))].map(x => { return {} })
        for (var i in mergedAr)
        {
            if (scannerList[i])
            {
                mergedAr[i] = Object.assign(mergedAr[i], scannerList[i])
            }
            if (recentCells[i] && recentCells[i].BarcodeReaderIndex !== undefined && mergedAr.length > recentCells[i].BarcodeReaderIndex)
            {
                mergedAr[recentCells[i].BarcodeReaderIndex] = Object.assign(mergedAr[recentCells[i].BarcodeReaderIndex], recentCells[i])
            }
        }
        if (mergedAr.length < 1) //for dev
        { 
            // console.warn(mergedAr)
            mergedAr = []
            mergedAr.push({
                ID: 1,
                LEDColor: "FF0000",
                ModelName: "WLS9500",
                SerialNumber: "1008300516166",
                Type: "USBIBMHID",
            })
        }
        return mergedAr
    }

    _onResetConfirmTap(e)
    {
        this._openDlg(this.$.dialogreset as PaperDialogElement)//, this.querySelector('div'))
    }

    _onResetTap(e)
    {
        this.api_action = 'reset'
        var obj: any = Object.assign({}, this._requestObject(this.order), { ETag: this.order.ETag }) 
        this._fetchItems(3, null, obj, (order) => 
        {
            //LEDs (CELLs indicator)
            this.cellsLEDStateRestore(order, 17)
        })
    }

    gotoShelf(cellIndex)
    {
        if (!cellIndex) { return }

        if (!this.allowUnderScroll) { return }

        this.async(() => 
        {
            var shelfPrefix = cellIndex.substring(0, 1)
            var anchor = this.shadowRoot ? this.shadowRoot.querySelector(`[data-prefix='${shelfPrefix}']`) : null
            // console.log('gotoShelf', cellIndex, anchor)
            if (anchor)
            {
                var rect = anchor.getBoundingClientRect()
                var st = this.scrollTarget.scrollTop
                var to = st + rect.top - 60
                if (to < 0) { to = 0 }
                
                // console.log('gotoShelf => ', to, rect, st)
                this.scrollIt(to, 300, 'easeInOutQuad', null, null, this.scrollTarget)
            }
        }, 
        150)
    }

    heightShevels: object
    _calcMaxCapacity(orderShelves)
    {
        const shevelsid = MD5(typeof orderShelves == 'object' ? JSON.stringify(orderShelves) : orderShelves)
        if (!this.heightShevels) { this.heightShevels = {} }
        var shevelsCalced = this.heightShevels[shevelsid]
        if (shevelsCalced) { return }

        const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth  || document.getElementsByTagName('body')[0].clientWidth)
        const viewportHeight = (this.scrollTarget == window ? windowHeight : this.scrollTarget.clientHeight) 
        const viewportWidth = (this.scrollTarget == window ? windowWidth : this.scrollTarget.clientWidth) 
        var heightMax = viewportHeight - 300 //header part
        var widthMax = viewportWidth - 120 //
        var heightBase = 0
        var widthBase = 0
        var maxCapacity = 1
        var maxRowCount = 0
        var cellsCount = 0
        for (var shi of orderShelves)
        {
            cellsCount += Array.isArray(shi.Rows) && shi.Rows.length > 0 && Array.isArray(shi.Rows[0].Cells) ? shi.Rows[0].Cells.length : 0

            var shelfCapi = 0
            // RowGroups
            for (var rowi of shi.Rows)
            {
                var rowCapMaxi = 0
                for (var celli of rowi.Cells)
                {
                    if (celli.Capacity > rowCapMaxi) { rowCapMaxi = celli.Capacity }
                }
                shelfCapi += rowCapMaxi
            }
            //we have styles for max reasonable 50 capacity each cell but 2k screen can fit max 150???
            if (shelfCapi > maxCapacity) { maxCapacity = shelfCapi }
            if (shi.Rows.length > maxRowCount) { maxRowCount = shi.Rows.length }
        }
        const rowSpaces = (maxRowCount - 1) * cellGap + (maxRowCount) * cellSpaces
        const colSpaces = (cellsCount - 1) * cellGap + (cellsCount) * cellSpaces
        heightBase = Math.floor((heightMax - rowSpaces) / maxCapacity)
        widthBase = Math.floor((widthMax - colSpaces) / cellsCount)
        if (heightBase < 14) { heightBase = 14 }
        if (widthBase < 70) { widthBase = 70 }
        heightMax = Math.floor(heightBase * maxCapacity + rowSpaces)
        this.set('heightBase', 14) //heightBase)
        this.set('widthBase', widthBase)
        this.set('heightMaxRowSpaces', rowSpaces)
        this.set('capacityMax', maxCapacity)

        // console.log(widthBase, cellsCount, orderShelves.length)

        this.heightShevels[shevelsid] = true
    }

    _cellCapacity(celliCapacity, orderShelves)
    {
        this._calcMaxCapacity(orderShelves)
        if (Number.isFinite(celliCapacity) && celliCapacity > this.capacityMax) { celliCapacity = this.capacityMax }
        return `${celliCapacity}`
    }

    styleShelve(shelfi, orderShelves)
    {
        this._calcMaxCapacity(orderShelves)

        // var maxRowCount = 0
        // for (var shi of orderShelves)
        // {
        //     if (shi == shelfi)
        //     {
        //         // console.log(shi)
        //         if (shi.Rows.length > maxRowCount) { maxRowCount = shi.Rows.length }
        //     }
        // }
        // const rowSpaces = (maxRowCount - 1) * cellGap + (maxRowCount) * cellSpaces
        const rowSpaceDiff = 0//this.heightMaxRowSpaces - rowSpaces
        // console.log(this.heightMaxRowSpaces, rowSpaces)
        return `--cell-height-base:${this.heightBase}px; --cell-height-diff:${rowSpaceDiff}px; --cell-width-base:${this.widthBase}px`
    }

    styleShelfRowGroup(rowgroup)
    {
        // console.log(rowgroup)
        var columns = rowgroup.length > 0 ? (rowgroup[0].Cells?.length ?? 0) : 0
        return `--row-columns:${columns}`
    }

    _onPrintCellsConfirmTap(e)
    {
        this.set('dialogprintcells', {
            title: this.localize('admin-ws-aggregation-dlg-printcells'),
            msg: this.localize('admin-ws-aggregation-dlg-printcells-msg'),
            PrintRange: '',
            SpecialBarcodesOnly: false,
        })
        this._openDlg(this.$.dialogprintcells as PaperDialogElement)
    }

    _onPrintBackCellsConfirmTap(e)
    {
        this.set('dialogprintcells', {
            title: this.localize('admin-ws-aggregation-dlg-printbackcells'),
            msg: this.localize('admin-ws-aggregation-dlg-printbackcells-msg'),
            backcells: true,
            PrintRange: '',
            SpecialBarcodesOnly: false,
        })
        this._openDlg(this.$.dialogprintcells as PaperDialogElement)
    }

    _onPrintCmdsConfirmTap(e)
    {
        this.set('dialogprintcells', {
            title: this.localize('admin-ws-aggregation-dlg-printcmdcells'),
            msg: this.localize('admin-ws-aggregation-dlg-printcmdcells-msg'),
            cmdcells: true,
            PrintRange: '',
            SpecialBarcodesOnly: false,
        })
        this._openDlg(this.$.dialogprintcells as PaperDialogElement)
    }

    _onPrintCellsTap(e)
    {
        var repObj: any = {}
        if (this.order.Manufacturer) { repObj.Manufacturer = this.order.Manufacturer }
        repObj.SpecialBarcodesOnly = this.dialogprintcells.SpecialBarcodesOnly
        repObj.PrintRange = this.dialogprintcells.PrintRange
        this.api_action = 'cells'
        if (this.dialogprintcells.backcells)
        {
            this.api_action = 'cells-back'
        }
        else if (this.dialogprintcells.cmdcells)
        {
            this.api_action = 'cells-cmd'
        }
        
        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            // this.set('order.Replacements.' + rq.body.index + '.loading', false)
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var labels = r['result'].Labels 
                    //var labels =  this._filterCells(r['result'].Labels, repObj.PrintRange, repObj.SpecialBarcodesOnly)
                    // this.set('order.PrintCellLabels', labels)
                    this.scannerprintersettings.printAggregationCellLabels(labels)
                    this.showToast(this.localize('admin-ws-aggregation-toast-celllabels'))
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

        // e.target.parentElement.value = ''
        // this.showToast(repObj.Barcode)        
    }

    // _filterCells(labels, printRange?, specialBarcodesOnly?)
    // {
    //     if (!Array.isArray(labels)) { return labels }

    //     var cellRegex = /(\w).(\d).(\d)/g

    //     if (specialBarcodesOnly === true)
    //     {
    //         labels = labels.filter(i => 
    //         { 
    //             return i.CellIndex.match(cellRegex) === null
    //         })
    //     }

    //     //parse ranges
    //     if (typeof (printRange) == 'string' && printRange !== '')
    //     {
    //         var ranges:any = printRange.split(',')
    //         var pl = {}
    //         for (var i in ranges)
    //         {
    //             if (ranges[i].indexOf('-') >= 0)
    //             {
    //                 var r = ranges[i].split('-')
    //                 r[0] = r[0].trim().toUpperCase()
    //                 r[1] = r[1].trim().toUpperCase()
    //                 var s = r[0] == ''
    //                 for (var i in labels)
    //                 {
    //                     if (!s && labels[i].CellIndex == r[0])
    //                     {
    //                         s = true
    //                     }
    //                     if (s)
    //                     {
    //                         pl[labels[i].CellIndex] = 1
    //                     }
    //                     if (s && labels[i].CellIndex == r[1])
    //                     {
    //                         break
    //                     }
    //                 }
    //             }
    //             else 
    //             {
    //                 pl[ranges[i].trim().toUpperCase()] = 1
    //             }
    //         }
    //         labels = labels.filter(i =>
    //         {
    //             return pl[i.CellIndex] == 1
    //         })
    //     }

    //     console.log(labels)
    //     return labels
    // }

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


    showOrderDetailsTap(e)
    {
        // console.log(e)
        var orderi = e.model.__data.orderi
        var man = this.order.Manufacturer
        this.api_action = 'orderinfo'
        var obj: any = { Manufacturer: man, OrderID: orderi.OrderID }

        var dialogcellinfo = this.$.dialogcellinfo as UIAdminDialog
        if (dialogcellinfo)
        {
            this.set('dialogcellinfo', { loading: true })
            dialogcellinfo.open()
        }
        
        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            this.set('dialogcellinfo.loading', false)

            // console.log(result, r)
            if (!r) { return }

            if (r['success'] === true)
            {
                // console.log(result)
                // this.set('dialogcellinfo', Object.assign({ loading: true }, result))
                this.set('dialogcellinfo', result)
            }
            else if (r['success'] === false)
            {
                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }        
        })
    }
    
    showCellDetailsTap(e)
    {
        // console.log(e)
        var celli = e.model.__data.celli
        var man = this.order.Manufacturer
        this.api_action = 'cellinfo'
        var obj: any = { Manufacturer: man, CellIndex: celli.CellIndex }

        var dialogcellinfo = this.$.dialogcellinfo as UIAdminDialog
        if (dialogcellinfo)
        {
            this.set('dialogcellinfo', { loading: true })
            dialogcellinfo.open()
        }
        
        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            this.set('dialogcellinfo.loading', false)

            // console.log(result, r)
            if (!r) { return }

            if (r['success'] === true)
            {
                // console.log(result)
                // this.set('dialogcellinfo', Object.assign({ loading: true }, result))
                this.set('dialogcellinfo', result)
            }
            else if (r['success'] === false)
            {
                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }        
        })
    }

    _forgetCellTap(e)
    {
        // console.log(e)

        var orderi = this.dialogcellinfo
        var man = this.order.Manufacturer
        this.api_action = 'orderforget'
        var obj: any = { Manufacturer: man, OrderID: orderi.OrderID, CanForgetChecksum: orderi.CanForgetChecksum }

        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            if (!r) { return }

            if (r['success'] === true)
            {
                this.showToast(this.localize('admin-ws-aggregation-toast-orderforget-success'))
                // this.set('dialogcellinfo', result)
            }
            else if (r['success'] === false)
            {
                // this.showToast('FAILED.')

                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }        
        })

    }

    _forceCompletionCellTap(e)
    {
        // console.log(e)
        
        var celli = this.dialogcellinfo
        var man = this.order.Manufacturer
        this.api_action = 'cellforcecompletion'
        var obj: any = { Manufacturer: man, CellIndex: celli.CellIndex, CanForceCompletiononChecksum: celli.CanForceCompletiononChecksum }

        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            if (!r) { return }

            if (r['success'] === true)
            {
                this.showToast(this.localize('admin-ws-aggregation-toast-cellforcecompletion-success'))
            }
            else if (r['success'] === false)
            {
                // this.showToast('FAILED.')

                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }        
        })

    }

    _cellScannerState(scannerIndex, celli, recentCellAndScanners)
    {
        var recenti = recentCellAndScanners[scannerIndex - 1]
        if (recenti) 
        {
            return celli.CellIndex == recenti.CellIndex
        }
        return false
    }

}
