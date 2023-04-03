import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import view from './ui-scanner-printer-settings.ts.html'
import style from './ui-scanner-printer-settings.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
import { ScannerPrinterData } from '../../components/bll/scanner-printer-data'
import '../../components/bll/scanner-printer-data'
import '../ui/ui-dropdown-menu'
import '../shared-styles/common-styles'
import { PlayerInfoModel } from '../../components/dal/player-info-model';
// var SCANNERCOLORS = ["FC0203", "FFFF01", "00CB00"]
export const SCANNERCOLORS = ["FF0000", "00FF00", "0000FF"]
const FRONTCELL = "F-"
const BACKCELL = "B-"


@CustomElement
export class UIScannerPrinterSettings extends UIBase
{
    printerfonts: any
    static get is() { return 'teamatical-ui-scanner-printer-settings' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            storageName: { type: String, notify: true, reflectToAttribute: true },
            userInfo: { type: Object, notify: true, },
            visible: { type: Boolean, notify: true, },
            connecting: { type: Boolean, notify: true, reflectToAttribute: true },
            connected: { type: Boolean, notify: true, reflectToAttribute: true },
            failure: { type: Boolean, notify: true, reflectToAttribute: true },
            loading: { type: Boolean, notify: true, reflectToAttribute: true },
            active: { type: Boolean, notify: true, reflectToAttribute: true },

            multiScannersCount: { type: Number, notify: true, value: 1 },
            consoleOnScreen: { type: Boolean, notify: true },

            //devices options
            barcodeScanner: { type: Boolean, notify: true, reflectToAttribute: true }, // option: barcode-scanner
            multiScanners: { type: Boolean, notify: true, reflectToAttribute: true }, // option: multi-scanners

            ledController: { type: Boolean, notify: true, reflectToAttribute: true }, // option: led-controller
            sortingDelays: { type: Boolean, notify: true, reflectToAttribute: true }, // option: sorting-delays
            aggregationDelays: { type: Boolean, notify: true, reflectToAttribute: true }, // option: aggregation-delays

            stickerPrinter: { type: Boolean, value: false, notify: true, reflectToAttribute: true }, //value: false !very_importent - to allow trigger attachment proper way // option: sticker-printer
            weightScale: { type: Boolean, notify: true, reflectToAttribute: true }, // option: weight-scale
            rfid: { type: Boolean, notify: true, reflectToAttribute: true }, // option: rfid
            stickerPrinterRfid: { type: Boolean, notify: true, reflectToAttribute: true }, // option: sticker-printer-rfid
            videoCamera: { type: Boolean, notify: true, reflectToAttribute: true }, // option: video-camera


            //lists
            rfidscanners: { type: Array, notify: true, value: [] },
            scanners: { type: Array, notify: true, value: [] },
            printers: { type: Array, notify: true, value: [] },
            printerfonts: { type: Array, notify: true, value: [] },
            leds: { type: Array, notify: true, value: [] },
            scales: { type: Array, notify: true, value: [] },
            videocamerasList: { type: Array, notify: true, value: [] },

            //videocameras
            videoModes: { type: Array, notify: true, value: [] },
            videoExposure: { type: Object, notify: true, value: {} },
            videoFocus: { type: Object, notify: true, value: {} },
            videoZoom: { type: Object, notify: true, value: {} },

            printRfid: { type: Boolean, notify: true },
            rfidscanner: { type: Object, notify: true, value: {} },
            scanner1: { type: Object, notify: true, value: {} },
            scanner2: { type: Object, notify: true, value: {} },
            scanner3: { type: Object, notify: true, value: {} },
            printer: { type: Object, notify: true, value: {} },
            led: { type: Object, notify: true, value: {} },
            scale: { type: Object, notify: true, value: {} },
            videocameraSelected: { type: Object, notify: true, value: {} },
            videomode: { type: Object, notify: true, value: {} },
            videomodeIndex: { type: Number, notify: true, value: null },


            deviceSettings: { type: Object, notify: true },
            status: { type: String, },
            isready: { type: Boolean, value: false },
            misconfigured: { type: Boolean, reflectToAttribute: true, computed: '_computeMisconfigured(connecting, connected, failure, deviceSettings, deviceSettings.*)' },
            
            icon: { type: String, computed: '_computeIcon(connecting, connected, failure)' },
            cannotChange: { type: String, computed: '_computeCannotChange(connecting, connected, failure)' },

            showRfidPrinter: { type: String, computed: '_compute_showRfidPrinter(stickerPrinterRfid, userInfo.isAdmin)' },
            showRfidScanner: { type: String, computed: '_computeShowRfidScanner(rfid, rfidscanners, visible, userInfo.isAdmin)' },
            showScanner1: { type: String, computed: '_computeShowScanner1(multiScannersCount)' },
            showScanner2: { type: String, computed: '_computeShowScanner2(multiScannersCount, multiScanners)' },
            showScanner3: { type: String, computed: '_computeShowScanner3(multiScannersCount, multiScanners)' },
            showPrinter: { type: String, computed: '_computeShowPrinter(visible)' },
            showVideoCameraSelection: { type: String, computed: '_compute_showVideoCameraSelection(visible)' },

            scannerList: { type: Array, computed: '_computeScannerList(deviceSettings.*, multiScanners, multiScannersCount)', notify: true },
            weightUnits: { type: String, computed: '_compute_weightUnits(deviceSettings.WeightScaleUnits)', notify: true },
        }
    }

    static get observers()
    {
        return [
            '_settingsChanged(isready, connected, deviceSettings.*, stickerPrinter)',
            '_updateSelectedScanners(scanners)',
            '_updateSelectedVideocamera(videocameraSelected.ID)',
            '_updateSelectedVideomode(videomode.ID)',
            // '_log(scanner1)',
        ]
    }

    _log(v) { console.log('UIScannerPrinterSettings', v) }

    get scannerprinterdata() { return this.$['scanner-printer-data'] as ScannerPrinterData }


    //#region Vars

    $:any
    multiScanners: any
    multiScannersCount: any
    scanner1: any
    scanner2: any
    scanner3: any
    printer: any
    scanners: any
    printers: any
    videocamerasList: any
    videocameraSelected: any
    deviceSettings: any
    _savelock: any
    connecting: any
    connected: any
    failure: any
    loading: any
    SortingDelay: any
    SortingAccessoryDelay: any
    rfid: boolean
    stickerPrinterRfid: boolean
    printRfid: boolean
    rfidscanners: any
    rfidscanner: any
    ledController: boolean
    barcodeScanner: boolean
    stickerPrinter: boolean
    weightScale: boolean
    consoleOnScreen: boolean
    videoCamera: boolean
    videoModes: any
    videomode: any
    videomodeIndex: any
    videoExposure: any
    videoFocus: any
    videoZoom: any


    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.scannerprinterdata.addEventListener('api-scanner-printer-update-state', this._spdUpdateState.bind(this))
        this.scannerprinterdata.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))

        if (window.localStorage)
        {
            var deviceSettingsOld = window.localStorage.getItem('ui-scanner-printer-settings')
            if (deviceSettingsOld)
            {
                try
                {
                    this.deviceSettings = JSON.parse(deviceSettingsOld)
                    window.localStorage.removeItem('ui-scanner-printer-settings')
                }
                catch
                {
                    //
                }
            }
            else //defaults
            {
                this.deviceSettings = {
                    SortingDelay: '10000',  
                    SortingAccessoryDelay: '86400000',
                    AggregationFrontDelay: '86400000', 
                    AggregationBackDelay: '86400000',
                    WeightScaleUnits: 'lbs',
                }
            }
        }
        // window.addEventListener('resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        // window.addEventListener("popstate", (e) => this._onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
        // window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())

        var scanner_printer_settings_dialog: any = this.$.scanner_printer_settings_dialog
        var scrollable = scanner_printer_settings_dialog.querySelector('paper-dialog-scrollable')
        scrollable.dialogElement = scanner_printer_settings_dialog

        this.async(() => { this.set('isready', true) })
    }

    getScanners()
    {
        //multiScanners, multiScannersCount
        var scanners = []
        var cnt = (this.deviceSettings?.multiScannersCount ? this.deviceSettings.multiScannersCount : 3)
        if (!this.multiScanners) { cnt = 1 }

        if (!this.deviceSettings) { return scanners}

        for (var i = 0; i < cnt; i++)
        {
            let ii = i + 1
            if (this.deviceSettings['scanner' + ii])
            {
                scanners[i] = this.deviceSettings['scanner' + ii]
                scanners[i].LEDColor = SCANNERCOLORS[i]
            }
        }
        return scanners
    }

    onLocalServiceOnScreenChanged(e)
    {
        this.scannerprinterdata.toggleLocalServiceOnScreen(e.target.checked)
    }

    _openSettingsTap(e)
    {
        var dlg: any = this.$.scanner_printer_settings_dialog
        dlg.positionTarget = this.querySelector('div')
        dlg.open()

        return this.scannerprinterdata.requestDevicesLists()
    }

    _updateSelectedScanners(scanners)
    {
        for(var i in scanners)
        {
            if (scanners[i].ID == this.scanner1?.ID) { this.set('scanner1', Object.assign({}, scanners[i])) }
            if (scanners[i].ID == this.scanner2?.ID) { this.set('scanner2', Object.assign({}, scanners[i])) }
            if (scanners[i].ID == this.scanner3?.ID) { this.set('scanner3', Object.assign({}, scanners[i])) }
        }
    }

    _updateSelectedVideocamera(cameraID)
    {
        if (cameraID)
        {
            this.scannerprinterdata.requestCameraSettings(cameraID)
        }
    }

    _updateSelectedVideomode(videomodeID)
    {
        if (!Array.isArray(this.videoModes)) { return }
        
        var inx = "0"
        var v = this.videoModes.filter((i, index, array) => 
        { 
            var f = i.ID == videomodeID
            if (f)
            {
                inx = index.toString()
            }
            return f
        })
        if (v?.length > 0)
        {
            this.videomodeIndex = inx
        }
    }

    _settingsChanged(isready, connected, deviceSettingsP)
    {
        // console.log('_settingsChanged()', isready, connected, deviceSettingsP)
        if (this._savelock == true || isready === undefined || deviceSettingsP == undefined) { return }

        // if (connected)
        // {
        //     console.log('12')
        // }

        if (deviceSettingsP.path == "deviceSettings" && deviceSettingsP.value)
        {
            let ds = deviceSettingsP.value

            this.set('consoleOnScreen', ds.consoleOnScreen)
            this.scannerprinterdata.toggleLocalServiceOnScreen(this._asBool(ds.consoleOnScreen))


            this.set('multiScannersCount', ds.multiScannersCount)
            if (this.scanner1 && ds.scanner1 && this.scanner1.ID != ds.scanner1.ID) { this.set('scanner1', Object.assign({}, ds.scanner1)) }
            if (this.scanner2 && ds.scanner2 && this.scanner2.ID != ds.scanner2.ID) { this.set('scanner2', Object.assign({}, ds.scanner2)) }
            if (this.scanner3 && ds.scanner3 && this.scanner3.ID != ds.scanner3.ID) { this.set('scanner3', Object.assign({}, ds.scanner3)) }
            if (this.printer && ds.printer && this.printer.ID != ds.printer.ID) { this.set('printer', Object.assign({}, ds.printer)) }


            //////////// RFID SCANNERS ////////////

            if (ds.rfidscanner)
            {
                this.set('rfidscanner', Object.assign({}, ds.rfidscanner))

                if (this.rfid)
                {
                    this.scannerprinterdata.attachRfidScanner(ds.rfidscanner)
                }
            }



            //////////// BARCODE SCANNERS ////////////
            if (ds.multiScannersCount)
            {
                this.set('multiScannersCount', ds.multiScannersCount)
            }

            //request list for 'misconfigurated' FLAG
            // this.scannerprinterdata.requestDevicesLists()


            let sc = ds.scanner1
            if (sc)
            {
                let scannerName = 'scanner1'
                if (sc.ID != this.scanner1.ID) 
                { 
                    this.set(scannerName, sc) 
                }
                if (this.barcodeScanner) { this.scannerprinterdata.attachScanner(sc, scannerName) }
            }

            sc = ds.scanner2
            if (sc)
            {
                let scannerName = 'scanner2'
                if (sc.ID != this.scanner2.ID) 
                {
                    this.set(scannerName, sc)
                }
                if (this.barcodeScanner) { this.scannerprinterdata.attachScanner(sc, scannerName) }
            }

            sc = ds.scanner3
            if (sc)
            {
                let scannerName = 'scanner3'
                if (sc.ID != this.scanner3.ID) 
                {
                    this.set(scannerName, sc)
                }
                if (this.barcodeScanner) { this.scannerprinterdata.attachScanner(sc, scannerName) }
            }

            //////////// STICKER PRINTERS ////////////
            this.set('printRfid', this._asBool(ds.printRfid))
           
            if (ds.printer)
            {
                this.set('printer', Object.assign({}, ds.printer))
                if (this.stickerPrinter) { this.scannerprinterdata.attachPrinter(ds.printer) }
            }



            //////////// LEDS CONTROLLERS ////////////
            if (ds.led)
            {
                this.set('led', Object.assign({}, ds.led))
                if (this.ledController) { this.scannerprinterdata.attachLed(ds.led) }
            }


            //////////// WEIGHT SCALES ////////////
            if (ds.WeightScaleUnits == undefined) { this.set('deviceSettings.WeightScaleUnits', 'lbs') } //for backward compatibility
            if (ds.scale)
            {
                this.set('scale', Object.assign({}, ds.scale))
                if (this.weightScale) { this.scannerprinterdata.attachScale(ds.scale) }
            }


            //////////// VIDEO CAMERAS ////////////
            if (ds.videocamera)
            {
                this.set('videocameraSelected', ds.videocamera)
                if (this.videoCamera) { this.scannerprinterdata.attachVideoCamera(ds.videocamera) }
            }

            if (ds.videoModes)
            {
                this.set('videoModes', ds.videoModes)
            }
            if (ds.videomode)
            {
                this.set('videomode', ds.videomode)
            }
            if (ds.videomodeIndex)
            {
                this.set('videomodeIndex', ds.videomodeIndex)
            }
            if (ds.videoExposure)
            {
                this.set('videoExposure', ds.videoExposure)
            }
            if (ds.videoFocus)
            {
                this.set('videoFocus', ds.videoFocus)
            }
            if (ds.videoZoom)
            {
                this.set('videoZoom', ds.videoZoom)
            }
        }
    }

    onCloseSettingsDialog(e)
    {
        //
    }

    _assignScannerID(itemdata, ds?)
    {
        if (ds && !itemdata.ScannerID && ds && ds.scanner1)
        {
            itemdata.ScannerID = ds.scanner1.ID //assign default scanner - 1
        }
    }

    _assignScannerPosAndColor(itemdata, ds?, colors?)
    {
        this._assignScannerID(itemdata, ds)

        if (ds) 
        {
            //vesa versa order - to make last (N1) more prioritized
            if (ds.scanner3 && itemdata.ScannerID == ds.scanner3.ID) //3
            {
                itemdata.ScannerPOS = 3
            }

            if (ds.scanner2 && itemdata.ScannerID == ds.scanner2.ID) //2
            {
                itemdata.ScannerPOS = 2
            }

            if (ds.scanner1 && itemdata.ScannerID == ds.scanner1.ID) //1
            {
                itemdata.ScannerPOS = 1
            }
        }
        else
        {
            itemdata.ScannerPOS = 1
        }

        if (colors && itemdata.ScannerPOS > 0 && colors.length >= itemdata.ScannerPOS)
        {
            itemdata.ScannerLED = colors[itemdata.ScannerPOS - 1]
        }
    }

    cutterDownloadFile(downloadUrl, filename)
    {
        return this.scannerprinterdata.downloadFile(downloadUrl, filename)
    }


    cameraTakeAPicture(barcode)
    {
        const id = this.videocameraSelected.ID
        const inx = this.videomodeIndex
        const videoExposure = this.videoExposure.Auto ? "Auto" : this.videoExposure.Value
        const videoFocus = this.videoFocus.Auto ? "Auto" : this.videoFocus.Value
        const videoZoom = this.videoZoom.Auto ? "Auto" : this.videoZoom.Value

        this.scannerprinterdata.cameraTakeAPicture(barcode, id, inx, videoExposure, videoFocus, videoZoom)
    }

    // aggregationProductScanned(itemdata)
    // {
    //     const defaultDelay = 30 * 1000
    //     const scannerColor = "FFFFFF"
    //     let ds = this.deviceSettings
    //     if (itemdata)
    //     {
    //         try
    //         {
    //             var parsed = parseInt(ds.AggregationFrontDelay, 10)
    //             if (isNaN(parsed)) { parsed = defaultDelay }
    //             itemdata.ScannerDelay = parsed
    //         }
    //         catch
    //         {
    //             //
    //         }
    //         itemdata.ScannerLED = scannerColor
    //         itemdata.ToteNumber = FRONTCELL + itemdata.CellIndex //convert
    //         this._assignScannerPosAndColor(itemdata, ds, SCANNERCOLORS)
    //     }
    //     return this.scannerprinterdata.turnonledsFor(itemdata)
    // }

    // aggregationProductConfirmed(itemdata)
    // {
    //     let ds = this.deviceSettings
    //     this._assignScannerID(itemdata, ds)
    //     //front
    //     var frontData = Object.assign({}, itemdata)
    //     frontData.ToteNumber = FRONTCELL + itemdata.CellIndex //convert
    //     return this.scannerprinterdata.turnoffleds(frontData)
    //     //back
    //     if (itemdata && itemdata.IsComplete)
    //     {
    //         this.aggregationCellComplete(itemdata.CellIndex)
    //     }
    // }

    // aggregationCellEmpty(itemdata)
    // {
    //     var backData = Object.assign({}, itemdata)
    //     backData.ToteNumber = BACKCELL + itemdata.CellIndex //convert
    //     return this.scannerprinterdata.turnoffleds(backData) //ToteNumber
    // }

    _barcodeInvalid(scannerID)
    {
        var itemdata = { ScannerID: scannerID }
        this._assignScannerID(itemdata, this.deviceSettings)
        return this.scannerprinterdata.scannerDismiss(itemdata) //ScannerID
    }

    qaBarcodeInvalid(scannerID)
    {
        return this._barcodeInvalid(scannerID)
    }

    aggregationBarcodeInvalid(scannerID)
    {
        return this._barcodeInvalid(scannerID)
    }

    shippingBarcodeInvalid(scannerID)
    {
        return this._barcodeInvalid(scannerID)
    }

    sortingBarcodeInvalid(scannerID)
    {
        return this._barcodeInvalid(scannerID)
    }

    aggregationCellComplete(cellIndex)
    {
        const defaultDelay = 86400000 //24h
        const scannerColor = "FFFFFF"
        let ds = this.deviceSettings
        let scannerDelay = defaultDelay
        try
        {
            var parsed = parseInt(ds.AggregationBackDelay, 10)
            if (isNaN(parsed)) { parsed = defaultDelay }
            scannerDelay = parsed
        }
        catch
        {
            //
        }

        var backData = {
            ScannerDelay: scannerDelay,
            ScannerLED: scannerColor,
            ToteNumber: BACKCELL + cellIndex, //convert
        }
        return this.scannerprinterdata.turnonledsFor(backData)
    }

    aggregationCellsStateRestore(cells, recentcells?)
    {
        if (!Array.isArray(cells)) { return }

        //TURNOFF ALL BACK & FRONT
        let ds = this.deviceSettings
        var frontData: any[] | null = null
        var backData: any[] | null = null

        ///BACK
        let defaultDelay = 86400000 //24h
        let scannerColor = "FFFFFF"
        let scannerDelay = defaultDelay
        try
        {
            var parsed = parseInt(ds.AggregationBackDelay, 10)
            if (isNaN(parsed)) { parsed = defaultDelay }
            scannerDelay = parsed
        }
        catch
        {
            //
        }

        //cells is array
        // CellIndex: "A.2.2"
        // RelatedItemsTotal: 9
        // SignleItem: false
        // IsComplete: false
        var completedCells = cells.filter(i => i.IsComplete == true)
        backData = completedCells.map((i) => { 
            return Object.assign({}, i, { 
                ToteNumber: BACKCELL + i.CellIndex,
                ScannerLED: scannerColor,
            }) 
        })
        var backAsFrontData = completedCells.map((i) => { 
            return Object.assign({}, i, { 
                ToteNumber: FRONTCELL + i.CellIndex,
                ScannerLED: scannerColor,
            }) 
        })


        ///FRONT
        if (Array.isArray(recentcells))
        {
            scannerColor = "FFFFFF"
            try
            {
                var parsed = parseInt(ds.AggregationFrontDelay, 10)
                if (isNaN(parsed)) { parsed = defaultDelay }
                scannerDelay = parsed
            }
            catch
            {
                //
            }
            // BarcodeReaderIndex: 0
            // CellIndex: "A.1.2"
            // RelatedItemsTotal: 3
            // SignleItem: false
            // IsComplete: false
            // Items: [{ Barcode: "TKI", Sandbox: true }, { Barcode: "FKJ", Sandbox: true }]
            frontData = recentcells ? recentcells.map((i) =>
            {
                let itemdata = {
                    ToteNumber: FRONTCELL + i.CellIndex,
                    ScannerLED: SCANNERCOLORS[i.BarcodeReaderIndex],
                }
                return itemdata
            }) : []
        }

        var leds: any[] = []
        if (frontData && frontData.length > 0)
        {
            leds = leds.concat(frontData)
        }
        if (backData && backData.length > 0)
        {
            leds = leds.concat(backData)
        }
        if (backAsFrontData?.length > 0)
        {
            leds = leds.concat(backAsFrontData)
        }

        this.scannerprinterdata.turnoff_onledsFor({
            ScannerDelay: scannerDelay,
            TotesList: leds,
        })
    }

    sortingAccessoryToteScanned(itemdata)
    {
        return this.scannerprinterdata.turnoffleds(itemdata)
    }

    sortingAccessoryTotesStateShow(itemdata)
    {
        const defaultDelay = 10000
        let ds = this.deviceSettings

        if (itemdata) 
        {
            try
            {
                var parsed = parseInt(ds.SortingDelay, 10)
                if (isNaN(parsed)) { parsed = defaultDelay }
                itemdata.ScannerDelay = parsed
            }
            catch
            {
                //
            }
        }
        return this.scannerprinterdata.turnonledsFor(itemdata)
    }

    sortingAccessoryScanned(itemdata)
    {
        const defaultDelay = 86400000 //24h
        const accessoryColor = "FFFFFF"
        let ds = this.deviceSettings

        if (itemdata)
        {
            try
            {
                var parsed = parseInt(ds.SortingAccessoryDelay, 10)
                if (isNaN(parsed)) { parsed = defaultDelay }
                itemdata.ScannerDelay = parsed
            }
            catch
            {
                //
            }

            itemdata.ScannerLED = accessoryColor
            this._assignScannerPosAndColor(itemdata, ds)
        }

        return this.scannerprinterdata.turnonledsFor(itemdata)
    }

    sortingScannedAccessoryOff()
    {
        return this.scannerprinterdata.turnoffleds()
    }

    sortingScanned(itemdata)
    {
        const defaultDelay = 10000
        let ds = this.deviceSettings

        if (itemdata) 
        { 
            try
            {
                var parsed = parseInt(ds.SortingDelay, 10)
                if (isNaN(parsed)) { parsed = defaultDelay }
                itemdata.ScannerDelay = parsed
            }
            catch
            {
                //
            }

            this._assignScannerPosAndColor(itemdata, ds, SCANNERCOLORS)
        }
        return this.scannerprinterdata.turnonledsFor(itemdata)
    }

    freightforwardRFIDStart()
    {
        return this.scannerprinterdata.rfidTagsClear()
    }
    
    containerizingRFIDStart()
    {
        return this.scannerprinterdata.rfidTagsClear()
    }

    printBatchLabel(batch)
    {
        return this.scannerprinterdata.printTemplateBatch(batch)
    }

    printAggregationCellLabels(cells)
    {
        if (!Array.isArray(cells)) { return }
        return this.scannerprinterdata.printTemplateCells(cells)
    }    

    printContainerLabel(label_zpl, barcode)
    {
        return this.scannerprinterdata.printTemplateAirContainerShipping(label_zpl, barcode)
    }

    printToteLabels(toteLabels)
    {
        if (!Array.isArray(toteLabels)) { return }
        var ar = toteLabels.reverse()
        return this.scannerprinterdata.printTemplateTote(ar)
    }

    printStackingLabels(labels)
    {
        if (!Array.isArray(labels)) { return }
        return this.scannerprinterdata.printTemplateStacking(labels)
    }

    prepareCustomerData(labeli)
    {
        var customOption = labeli.CustomOptionTitle + ' ' + labeli.CustomOption
        var recepientName = labeli.RecepientFirstName + ' ' + labeli.RecepientLastName
        var playerName = ''
        if (labeli.Player && labeli.Player.PlayerName) { playerName += labeli.Player.PlayerName }
        if (labeli.Player && labeli.Player.PlayerNumber) { playerName += ' #' + labeli.Player.PlayerNumber }
        if (labeli.Player && labeli.Player.PlayerYear) { playerName += ' ' + labeli.Player.PlayerYear }
        if (labeli.Player && labeli.Player.PlayerCaptain) { playerName += ' ' + labeli.Player.PlayerCaptain.Name }
        if (labeli.Player && labeli.Player.PlayerActivity) { playerName += ' ' + labeli.Player.PlayerActivity.Name }
        var name = recepientName + (playerName ? " (" + playerName + ')' : '')

        return { 
            customOption: customOption,
            name: name,
        }
    }

    printCustomer(zplTemplate, labels)
    {
        // var lang = userLanguage ? userLanguage : this.defaultLanguage
        return this.scannerprinterdata.printTemplateCustomer(zplTemplate, labels)
    }

    printStockOptions(zplTemplate, labels)
    {
        return this.scannerprinterdata.printTemplateStockOptions(zplTemplate, labels)
    }

    printShippingLabel(shippingData, userLanguage = '')
    {
        // var lang = userLanguage ? userLanguage : this.defaultLanguage
        return this.scannerprinterdata.printTemplateCustomerShipping(shippingData)
    }

    printShippingPackageTempLabel(packageData)
    {
        return this.scannerprinterdata.printTemplatePackageTempLabel(packageData)
    }

    printCarrierLabel(zpl)
    {
        return this.scannerprinterdata.printCarrierLabel(zpl)
    }

    saveSettings(e)
    {
        var ds = this.deviceSettings || {}
        var assign = false

        ds['consoleOnScreen'] = this.consoleOnScreen


        //////////// LED CONTROLLERS ////////////
        // NONE

        //////////// WEIGHT SCALES ////////////
        if (this.weightScale)
        {
            ds['scale'] = 'default'
            assign = true
        }



        //////////// RFID SCANNERS ////////////
        for (var i in this.rfidscanners)
        {
            if (this.rfidscanners[i] && this.rfidscanner && this.rfidscanners[i].ScannerId == this.rfidscanner.ScannerId)
            {
                ds['rfidscanner'] = Object.assign({}, this.rfidscanners[i])
                assign = true
            }
        }


        //////////// BARCODE SCANNERS ////////////
        ds['multiScannersCount'] = this.multiScannersCount
        for (var i in this.scanners)
        {
            if (this.scanners[i] && this.scanner1 && this.scanners[i].ID == this.scanner1.ID)
            {
                ds['scanner1'] = Object.assign({}, this.scanners[i])
                assign = true
            }

            if (this.scanners[i] && this.scanner2 && this.scanners[i].ID == this.scanner2.ID)
            {
                ds['scanner2'] = Object.assign({}, this.scanners[i])
                assign = true
            }

            if (this.scanners[i] && this.scanner3 && this.scanners[i].ID == this.scanner3.ID)
            {
                ds['scanner3'] = Object.assign({}, this.scanners[i])
                assign = true
            }
        }
        var multiScannersCount = parseInt(this.multiScannersCount)
        if (multiScannersCount < 3) { delete ds.scanner3; assign = true }
        if (multiScannersCount < 2) { delete ds.scanner2; assign = true }


        //////////// STICKER PRINTERS ////////////
        for (var i in this.printers)
        {
            if (this.printers[i] && this.printer && this.printers[i].ID == this.printer.ID)
            {
                ds['printer'] = Object.assign({}, this.printers[i])
                assign = true
            }
        }
        
        if (ds['printRfid'] !== this.printRfid)
        {
            ds['printRfid'] = Object.assign({}, this.printRfid)
            assign = true
        }


        //////////// VIDEO CAMERAS ////////////
        for (var i in this.videocamerasList)
        {
            if (this.videocamerasList[i] && this.videocameraSelected && this.videocamerasList[i].ID == this.videocameraSelected.ID)
            {
                ds['videocamera'] = Object.assign({}, this.videocamerasList[i])
                assign = true
            }
        }

        //////////// VIDEO MODE ////////////
        ds['videoModes'] = this.videoModes
        for (var i in this.videoModes)
        {
            if (this.videoModes[i] && this.videomode && this.videoModes[i].mode == this.videomode.mode)
            {
                ds['videomode'] = Object.assign({}, this.videoModes[i])
                ds['videomodeIndex'] = i
                assign = true
            }
        }
        ds['videoExposure'] = this.videoExposure
        ds['videoFocus'] = this.videoFocus
        ds['videoZoom'] = this.videoZoom
        

        //////////// ALL SETTINGS SAVING ////////////
        if (assign)
        {
            this.set('deviceSettings', Object.assign({}, ds))
        }
    }

    _spdUpdateState(e: CustomEvent)
    {
        // var action = e.detail.action
        var status = ''
        if (this.connecting)
        {
            status = "Connecting..."
        }
        else
        {
            if (this.failure)
            {
                status = "Connection failure"
            }
            else if (this.connected)
            {
                status = "Connected"
            }
            else
            {
                status = "NA"
            }
        }
        this.set('status', status)
    }

    _spdReceivePacket(e: CustomEvent)
    {
        //
    }

    _computeCannotChange(connecting, connected, failure)
    {
        return failure || connecting || !connected
    }

    _computeShowScanner1(multiScannersCount)
    {
        // console.log(multiScannersCount)
        return multiScannersCount > 0
    }

    _computeShowScanner2(multiScannersCount, multiScanners)
    {
        // console.log(multiScannersCount)
        return multiScannersCount > 1 && multiScanners
    }

    _computeShowScanner3(multiScannersCount, multiScanners)
    {
        // console.log(multiScannersCount)
        return multiScannersCount > 2 && multiScanners
    }

    _computeScannerList(deviceSettingsP, multiScanners, multiScannersCount)
    {
        return this.getScanners()
    }

    _computeShowPrinter(visible)
    {
        return visible
    }

    _compute_showVideoCameraSelection(visible)
    {
        return visible
    }

    _compute_showRfidPrinter(stickerPrinterRfid, isAdmin)
    {
        return stickerPrinterRfid && isAdmin
    }

    _computeShowRfidScanner(rfid, rfidScanner, visible)
    {
        return rfid && visible
    }

    _computeIcon(connecting, connected, failure)
    {
        return 'admin-device:usb'
    }

    _onResized(e)
    {
    }

    _onHistoryPopstate(e)
    {
    }

    _onScroll(e)
    {
    }

    _compute_weightUnits(weightScaleUnits)
    {
        return weightScaleUnits
    }

    _computeMisconfigured(connecting, connected, failure, deviceSettings, deviceSettingsP)
    {
        if (!connected || failure || connecting) { return false }

        var ds = deviceSettings

        //TODO: scanners /multiScanners
        // console.log(deviceSettings, this.scanner1, this.scanner2, this.scanner3, '=>', this.multiScannersCount)
        if (this.barcodeScanner)
        {
            var cnt = 0
            if (this.multiScanners)
            {
                try
                {
                    cnt = typeof (this.multiScannersCount) == 'string' ? parseInt(this.multiScannersCount) : this.multiScannersCount
                }
                catch (ex)
                {
                    console.warn(ex)
                }
            }
            else
            {
                cnt = 1
            }

            if (!isFinite(cnt) || cnt <= 0) { return true }

            if (cnt >= 1 && (!ds?.scanner1 || ds?.scanner1?.ID != this.scanner1?.ID)) { return true }
            if (cnt >= 2 && (!ds?.scanner2 || ds?.scanner2?.ID != this.scanner2?.ID)) { return true }
            if (cnt >= 3 && (!ds?.scanner3 || ds?.scanner3?.ID != this.scanner3?.ID)) { return true }
        }
        
        //TODO: rfidscanners
        if (this.rfid)
        {
            // rfidscanners = "{{rfidscanners}}"
        }

        //TODO: printers
        if (this.stickerPrinter)
        {
            // printers = "{{printers}}"
        }

        //TODO: scales
        if (this.weightScale)
        {
            // scales = "{{scales}}"        
        }

        //TODO: leds
        if (this.ledController)
        {
            // leds = "{{leds}}"
        }

        return false
    }

    _hiddenRemoveFont(fontiIsInstalled, fontiID)
    {
        return !fontiIsInstalled || fontiID == 'Z:0.TTF'
    }

    _fontLoading(loading, fontiP, connected = true)
    {
        var fontiLoading = false
        for (var fonti of this.printerfonts)
        {
            if (fonti.Loading)
            {
                fontiLoading = true
                break
            }
        }
        return loading || fontiLoading || !connected
    }

    _loadListFontTap(e)
    {
        this.scannerprinterdata.printerGetFontList()
    }

    async _loadFontTap(e)
    {
        var fonti = e.model.__data.fonti
        var index = e.model.__data.index
        // console.log(e.model.__data)
        this.set(`printerfonts.${index}.Loading`, true)
        await this.scannerprinterdata.printerFontLoadToDevice(fonti)
        this.set(`printerfonts.${index}.Loading`, false)
    }

    async _unloadFontTap(e)
    {
        var fonti = e.model.__data.fonti
        var index = e.model.__data.index
        // console.log(e.model.__data)
        this.set(`printerfonts.${index}.Loading`, true)
        await this.scannerprinterdata.printerFontUnloadFromDevice(fonti)
        this.set(`printerfonts.${index}.Loading`, false)
    }

    _disabled(loading, auto)
    {
        return loading || auto
    }
}
