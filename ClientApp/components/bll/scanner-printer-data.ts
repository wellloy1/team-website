import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
import { RandomInteger } from '../utils/MathExtensions'
import { StringUtil } from '../utils/StringUtil'
import { UIBase } from '../../components/ui/ui-base'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const COLOR_NONE = '000000'
const COLOR_ISCOMPLETED = '00FF00'
const COLOR_ISEMPTY = 'FF0000'
const COLOR_ISPARTLY = '0000FF'
const COLOR_ISPARTS = '00FF00'
const COLOR_ISACCESSORIES = '0000FF'
const TOTE_ALL = 'ALL'
const BARCODE_UNDEFINED = '??????'
const WS_PKT_LIMIT = 60000
//utf-8 - ^CI28
//moved to locale (to use with backend) const TM_LOGO_ZPL = `~DYR:TM-LOGO.PNG,P,P,1398,,:B64:iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAIAAAC2BqGFAAAACXBIWXMAAC4jAAAuIwF4pT92AAAB0ElEQVR4nO3ZAW6DMBAFUVP1/lemUpEiRJWWBJj9W2YuQPySbGxnmJmZmZmZmZmZmZmZmZmZmZmZmZnZjZvutvR5nkueO5U9eCp4j6sWO8b4qHowv+ZC5UpoeOW1ysXQ2PrLleuhAYUE5QjoSy1ClFOgLxLJUQ6CTnM5vSDoc63T3rYs6LOAAr8ccdDHmTJHUCL0EazYQR8K/R5Z8s9pLvSrcOGblmjo/Xz5W8N06D2ILTbgDaB/p+xyzOkB/Qy00WGyDfRP1l5H9k7Qa9x2FyNl/xnerWaf6L4JDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQZdDTd//7ieuKP9HYyguJl+pHB0BQrpwyoy+FSFAeY3wGvIbx4Dj3X4gQ4qWsXceJNFHKidu7U4DSlEP30QeZApWDZvSm90Z2JvFS9MnwJbhk5QZH8J184co97jr+RMxXzp3Rm56N7BbES51u7zasjZT7XZM+cHsptxkd69oRL3nxDyU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQkMJDSU0lNBQQhONMb4A4/KEnDoMi8AAAAAASUVORK5CYII=:392A`


@CustomElement
export class ScannerPrinterData extends NetBase
{
    static get is() { return 'teamatical-scanner-printer-data' }

    static get template() 
    {
        return html``
    }

    static get properties()
    {
        return {
            connectionUrl: { type: String, value: 'ws://127.0.0.1:8080/api-ws-scanner-printer' },
            autoConnect: { type: Boolean, notify: true, reflectToAttribute: true },
            autoReconnect: { type: Boolean, notify: true, reflectToAttribute: true, },
            visible: { type: Boolean, notify: true, },
            websiteUrl: { type: String },
            weightUnits: { type: String },

            connecting: { type: Boolean, notify: true, },
            connected: { type: Boolean, notify: true, value: false,  },
            failure: { type: Boolean, notify: true, value: false, },

            cmdsent: { type: Number, notify: true, value: 0 },
            loading: { type: Boolean, notify: true, computed: '_loadingCompute(cmdsent)' },
            active: { type: Boolean,  notify: true, computed: '_compute_active(_dev, autoConnect, connected)' },

            //flags
            ledController: { type: Boolean, notify: true, reflectToAttribute: true },
            barcodeScanner: { type: Boolean, notify: true, reflectToAttribute: true },
            stickerPrinter: { type: Boolean, notify: true, reflectToAttribute: true },
            weightScale: { type: Boolean, notify: true, reflectToAttribute: true },
            videoCameraEnabled: { type: Boolean, notify: true, reflectToAttribute: true }, //video-camera-enabled
            rfid: { type: Boolean, notify: true, reflectToAttribute: true },
            _dev: { type: Boolean, notify: true },

            //lists
            rfidscanners: { type: Array, notify: true, value: [] },
            scanners: { type: Array, notify: true, value: [] },
            printers: { type: Array, notify: true, value: [] },
            printerfonts: { type: Array, notify: true, value: [] },
            leds: { type: Array, notify: true, value: [] },
            scales: { type: Array, notify: true, value: [] },
            videocameras: { type: Array, notify: true, value: [] },

            //videocamera
            videoModes: { type: Array, notify: true, value: [] },
            videoExposure: { type: Object, notify: true, value: {} },
            videoFocus: { type: Object, notify: true, value: {} },
            videoZoom: { type: Object, notify: true, value: {} },

            //devices
            rfidscanner: { type: Object, notify: true, value: {} },
            scanner1: { type: Object, notify: true, value: {} },
            scanner2: { type: Object, notify: true, value: {} },
            scanner3: { type: Object, notify: true, value: {} },
            printer: { type: Object, notify: true, value: {} },
            scale: { type: Object, notify: true, value: {} },
            led: { type: Object, notify: true, value: {} },
            videoCamera: { type: Object, notify: true, value: {} },


            APIPath: { type: String, value: '/admin/api/workstation/api-font-' },
            api_action: { type: String, value: 'list' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: [] },
        }
    }


    //#region vars

    _dev: any //= false

    ledController: boolean
    barcodeScanner: boolean
    stickerPrinter: boolean
    weightScale: boolean
    rfid: boolean
    videoCameraEnabled: boolean
    videoCamera: object //selected
    connectionUrl: any
    autoConnect: any
    socket: WebSocket
    connected: any
    failure: any
    cmdsent:any
    autoReconnect:any
    printer: any
    visible: any
    _reconnectTries: any = 0
    _reconnectLast: any = 2000
    weightUnits: string
    __dataHost: any
    wakeLock: any = null
    handleVisibilityChange: any
    _wakeLockOnBarcodeScanDebouncer: Debouncer
    api_url: string
    api_action: string
    _reloadFontList: { PrinterID: any } | null = null
    printerfonts: any
    videocameras: any
    _last_cameratakepicture: { command: string; data: { barcode: any; cameraid: any; mode: any; exposure: any } }

    //#endregion


    static get observers()
    {
        return [
            '_onVisibleChanged(visible)',
            // '_log(active)',
        ]
    }
    _log(v) { console.log('scanner-printer-data', v) }

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.handleVisibilityChange = async () =>
        {
            if (this.wakeLock !== null && document.visibilityState === 'visible')
            {
                await this.requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    disconnectedCallback()
    {
        if (this.connected)
        {
            this._disconnect()
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange)

        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    get wsReadyState()
    {
        return this.socket ? this.socket.readyState : null
    }

    get wsReadyStateString()
    {
        return this.convertReadyState(this.wsReadyState)
    }



    connect(connectionUrl)
    {
        return this._connect(connectionUrl)
    }

    disconnect()
    {
        return this._disconnect()
    }

    downloadFile(url, filename)
    {
        var cmd = {
            "command": "cutterfile",
            "data": {
                "url": url,
                "filename": filename,
            },
        }
        return this.sendCommand(cmd)
    }

    requestCameraSettings(cameraID: any) 
    {
        this.set('videoModes', null)
        this.set('videoExposure', {})
        this.set('videoFocus', {})
        this.set('videoZoom', {})

        var cmd = { 
            "command": "cameragetparameters", 
            "data": {
                "cameraid": cameraID,
            },
        }
        return this.sendCommand(cmd)
    }

    cameraTakeAPicture(barcode, cameraid, videomodeIndex, videoExposure, videoFocus, videoZoom) 
    {
        var cmd = {
            "command": "cameratakepicture", 
            "data": {
                "barcode": barcode,
                "cameraid": cameraid,
                "mode": videomodeIndex,
                "exposure": videoExposure,
                "focus": videoFocus,
                "zoom": videoZoom,
            }
        }
        this._last_cameratakepicture = cmd
        return this.sendCommand(cmd)
    }


    rfidTagsClear()
    {
        var cmd = { 
            "command": "clearrfidscanner", 
        }
        return this.sendCommand(cmd)
    }

    scannerDismiss(itemdata)
    {
        var cmd = {
            "command": "signalscanner",
            "data": {
                "scannerid": itemdata.ScannerID,
                "feedback": "stopaction",
            },
        }
        return this.sendCommand(cmd)
    }

    turnoffledsAll()
    {
        this.turnoffleds()
    }

    turnoff_onledsFor(itemdata)
    {
        itemdata.TotesList = [{ ToteNumber: TOTE_ALL, ScannerLED: COLOR_NONE }].concat(itemdata.TotesList)
        this.turnonledsFor(itemdata)
    }

    turnoffleds(itemdata?)
    {
        var totecolors: any[] = []
        if (itemdata == undefined)
        {
            totecolors = [{ "tote": TOTE_ALL, "color": COLOR_NONE }]
        }
        else
        {
            totecolors = (Array.isArray(itemdata.TotesList) ? 
                itemdata.TotesList.map(i => { return { "tote": i.ToteNumber, "color": COLOR_NONE } })
                : [{ "tote": itemdata.ToteNumber, "color": COLOR_NONE },])
        }
                
        var cmd = {
            "command": "turnonleds",
            "data": {
                "showfortime": 0,
                "totecolors": totecolors,
            },
        }

        // console.log(cmd)
        return this.sendCommand(cmd)
    }

    turnonledsFor(itemdata)
    {
        // if (this._dev) console.log('turnonledsFor', itemdata)

        var totecolors:any = []
        if (Array.isArray(itemdata.TotesList))
        {
            totecolors = itemdata.TotesList.map(i =>
            {
                return {
                    "tote": i.ToteNumber,
                    "color": itemdata.ScannerLED ? itemdata.ScannerLED : i.ScannerLED
                }
            })
        }
        else if (Array.isArray(itemdata.ToteLabels))
        {
            var totecolorsA:any = []
            totecolors = itemdata.ToteLabels.map(i =>
            {
                //green for completed, yellow for partially completed and red for empty
                var colori = COLOR_NONE

                if (i.IsEmpty)
                {
                    colori = COLOR_ISEMPTY
                }
                else
                {
                    if (itemdata.ToteLabelsPartsOrAccesssoriesOnly)
                    {
                        if (i.IsAccessorySorted || i.IsPartsSorted)
                        {
                            colori = i.IsPartsSorted ? COLOR_ISPARTS : COLOR_ISACCESSORIES
                            if (i.IsAccessorySorted && i.IsPartsSorted)
                            {
                                totecolorsA.push({
                                    "tote": i.ToteNumber,
                                    "color": COLOR_ISACCESSORIES
                                })
                            }
                        }
                    }
                    else
                    {
                        if (i.IsCompleted)
                        {
                            colori = COLOR_ISCOMPLETED
                        }
                        else if (i.IsAccessorySorted || i.IsPartsSorted)
                        {
                            colori = COLOR_ISPARTLY
                        }
                    }
                }

                return {
                    "tote": i.ToteNumber,
                    "color": colori
                }
            })
            totecolors = totecolors.concat(totecolorsA)
        }
        else if (itemdata.ToteNumber && itemdata.ScannerLED)
        {
            totecolors = [{
                "tote": itemdata.ToteNumber,
                "color": itemdata.ScannerLED
            }]
        }

        var cmd = {
            "command": "turnonleds",
            "data": {
                "showfortime": itemdata.ScannerDelay,
                "totecolors": totecolors,
            },
        }

        // console.log(cmd)
        return this.sendCommand(cmd)
    }

    _printTemplate(data: any, zplTemplate = '')
    {
        var pkt = zplTemplate
        var list: any[] = []
        if (!Array.isArray(data))
        {
            list.push(data)
        }
        else
        {
            list = data
        }
        for (var i in list)
        {
            let di = list[i]
            pkt += di.ZPL
        }
        this.sendPrintZebra(pkt)
    }

    printTemplateBatch(data: any = { ZPL: '' })
    {
        return this._printTemplate(data)
    }

    printTemplateTote(data: any = { ZPL: '' })
    {
        return this._printTemplate(data)
    }

    printTemplateAirContainerShipping(label_zpl, barcode)
    {
        return this._printTemplate({ ZPL: label_zpl})
    }

    printTemplateStockOptions(zplTemplate, data: any = { ZPL: '' })
    {
        return this._printTemplate(data, zplTemplate)
    }

    printTemplateCustomer(zplTemplate, data: any = { ZPL: '' })
    {
        return this._printTemplate(data, zplTemplate)
    }

    printTemplateCustomerShipping(shippingData)
    {
        return this._printTemplate({ ZPL: shippingData?.ShippingLabel || ''})
    }

    printTemplateCells(data: any)
    {
        return this._printTemplate(data)
    }

    printTemplateStacking(data: any)
    {
        return this._printTemplate(data)
    }

    printTemplatePackageTempLabel(data)
    {
        return this._printTemplate({ ZPL: data?.TempLabelZPL || ''})
    }

    printCarrierLabel(zpl)
    {
        return this._printTemplate({ ZPL: zpl || ''})
    }

    localizeRAW(locale, locid)
    {
        return this.localizeZPL(locale, locid, true)
    }

    localizeZPL(locale, locid, raw = false)
    {
        var l = this.localizeLang(locale, locid)
        return raw ? l : this.encodeZPL(l)
    }

    encodeZPL(text)
    {
        if (typeof (text) == 'undefined') { return '' }
        if (typeof (text) != 'string') { return text }
        //TODO: ~ ^ etc...
        var otxt = StringUtil.replaceAll(text, "\n", '\\&')
        // otxt = StringUtil.replaceAll(otxt, "~", '_7E')
        otxt = StringUtil.replaceAll(otxt, "~", '-')
        if (this._dev && text != otxt) { console.log(text, otxt) }
        return otxt
    }

    async sendPrintZebraFont(zebracode, fontID, awaitCmd = null)
    {
        if (!zebracode || !this.printer || !this.printer.ID) { return false }

        var cmd = {
            "command": "printzpl", 
            "data": {
                "printerid": this.printer.ID,
                "fontid": fontID,
                "document": zebracode,
            },
        }
        var packet_done = false
        // var last_cmdsent = this.cmdsent
        var packetInterceptor = (e: Event) => 
        {
            var edetail = (e as CustomEvent).detail
            var r = edetail.pkt && edetail.pkt.CommandResult ? edetail.pkt.CommandResult : null
            if (r && r.Command == (awaitCmd ? awaitCmd : cmd.command))
            {
                packet_done = true
                this.removeEventListener('api-scanner-printer-packet', packetInterceptor)
            }
        }
        this.addEventListener('api-scanner-printer-packet', packetInterceptor)
        this.sendCommand(cmd)
        return new Promise((resolve, reject) => 
        {
            var tm = setInterval(() => 
            {
                if (packet_done)
                {
                    clearInterval(tm)
                    resolve('done')
                }
            }, 17)
        })
    }

    sendPrintZebra(zebracode)
    {
        if (!zebracode || !this.printer || !this.printer.ID) { return false }

        if (this._dev) console.log(zebracode)

        var cmd = {
            "command": "printzpl",   
            "data": {
                "printerid": this.printer.ID,
                "document": zebracode,
            },
        }

        return this.sendCommand(cmd)
    }

    requestDevicesLists()
    {
        if (this.rfid)
        {
            this.sendCommand({ "command": "rfidscannerslist" })
        }

        if (this.weightScale)
        {
            // this.sendCommand({ "command": "scalelist" })
        }

        if (this.ledController)
        {
            // this.sendCommand({ "command": "ledcontrollerslist" })
        }

        if (this.barcodeScanner)
        {
            this.sendCommand({ "command": "scannerslist" })
        }

        if (this.stickerPrinter)
        {
            this.sendCommand({ "command": "printerslist" })
        }

        if (this.videoCameraEnabled)
        {
            this.sendCommand({ "command": "cameraslist" })
        }
    }

    toggleLocalServiceOnScreen(on)
    {
        this.sendCommand({ "command": "toggleonscreen", "data": { state: on } })
    }

    sendCommand(cmd)
    {
        // if (Teamatical.BuildEnv == 'Development') console.log(cmd)

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN)
        {
            if (!this._dev) { console.warn("socket not connected", cmd) }
            return false
        }

        var pkt = ''
        if (typeof (cmd) == 'string')
        {
            pkt = cmd
        }
        else
        {
            pkt = JSON.stringify(cmd)
        }
        
        this.set('cmdsent', this.cmdsent + 1)
        this.socket.send(pkt)
        return true
    }

    
    attachRfidScanner(rfidscanner)
    {
        if (!rfidscanner || !rfidscanner.ScannerId) { return }
        this.set('rfidscanner', rfidscanner)

        return this.sendCommand({
            "command": "attachrfidscanner",
            "data": { "scannerid": rfidscanner.ScannerId },
        })
    }

    attachScanner(scanner, varID = 'scanner1')
    {
        if (!scanner || !scanner.ID || this.connected !== true) { return }

        this.set(varID, scanner)
        
        return this.sendCommand({ 
            "command": "attachscanner", 
            "data": { "scannerid": scanner.ID, "beepervolume": "2" } 
        })
    }

    attachPrinter(printer)
    {
        if (!printer || !printer.ID) { return }
        
        this.set('printer', printer)
        this.sendCommand({ "command": "printergetfonts", "data": { printerid: printer.ID } })
    }

    printerGetFontList()
    {
        if (!this.printer || !this.printer.ID || this.cmdsent > 0) { return }
        this.sendCommand({ "command": "printergetfonts", "data": { printerid: this.printer.ID } })
    }

    attachLed(led)
    {
        if (!led || !led.ID) { return }
        this.set('led', led)
    }

    attachScale(scale)
    {
        this.set('scale', scale)
        return this.sendCommand({
            "command": "attachscale",
            "data": {},
        })
    }

    attachVideoCamera(videocamera)
    {
        // console.log(videocamera)
    }

    convertReadyState(wsReadyState)
    {
        var str = ''
        switch (wsReadyState)
        {
            case WebSocket.CLOSED:
                str = "Closed"
                break

            case WebSocket.CLOSING:
                str = "Closing..."
                break

            case WebSocket.CONNECTING:
                str = "Connecting..."
                break

            case WebSocket.OPEN:
                str = "Open"
                break

            default:
                str = "Unknown WebSocket State"
                break
        }

        return str
    }

    _compute_active(dev, autoConnect, connected)
    {
        //if (this._dev && this.autoConnect) { return } //general developer has no devices - turn off connecting
        // console.log(dev, autoConnect)
        return (dev || connected) && autoConnect
    }

    _loadingCompute(cmdcount)
    {
        // console.log(cmdcount)
        return cmdcount > 0
    }

    _onVisibleChanged(visible)
    {
        if (visible == true)
        {
            if (this.autoConnect) { this._connect(this.connectionUrl) }
        }
        else if (this.connected)
        {
            this._disconnect()
        }
    }

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        if (!websiteUrl || !APIPath || !api_action) { return '' }
        return websiteUrl + APIPath + api_action
    }

    async printerFontLoadToDevice(fonti)
    {
        this.api_action = 'get'
        var r = await this._apiRequest(this.api_url, fonti)
        // console.log('printerFontLoadToDevice', fonti, r)
        if (r?.result)
        {
            var pkt = r.result.ZPL
            this._reloadFontList = { PrinterID: fonti.PrinterID }
            await this.sendPrintZebraFont(pkt, fonti.ID)
        }
    }

    async printerFontUnloadFromDevice(fonti)
    {
        this.api_action = 'remove'
        var r = await this._apiRequest(this.api_url, fonti)
        // console.log('printerFontUnloadFromDevice', fonti, r)
        if (r?.result)
        {
            var pkt = r.result.ZPL
            this._reloadFontList = { PrinterID: fonti.PrinterID }
            await this.sendPrintZebraFont(pkt, fonti.ID, 'printergetfonts')
        }
    }


    async wakeLockOnBarcodeScanRestore()
    {
        if (!('wakeLock' in navigator)) { return }

        if (!this.wakeLock)
        {
            await this.requestWakeLock()
        }

        const tms = 5 * 60 * 1000
        console.log('Screen Wake Lock delayed (ms)', tms)
        this._wakeLockOnBarcodeScanDebouncer = Debouncer.debounce(this._wakeLockOnBarcodeScanDebouncer, timeOut.after(tms), () =>
        {
            console.log('Screen Wake Lock try to release ...')
            //here cancel wakelock
            if (this.wakeLock)
            {
                this.wakeLock.release()
                this.wakeLock = null
            }
        })
    }

    async requestWakeLock()
    {
        try
        {
            this.wakeLock = await navigator.wakeLock.request('screen')
            this.wakeLock.addEventListener('release', () =>
            {
                console.log('Screen Wake Lock released:', this.wakeLock.released)
            })
            console.log('Screen Wake Lock released:', this.wakeLock.released)
        } 
        catch (err)
        {
            console.error(`${err.name}, ${err.message}`)
        }

    }

    

    _connect(connectionUrl, reconnect = false)
    {
        if (this._dev && this.autoConnect) { return } //general developer has no devices - turn off connecting

        // console.log('_connect', connectionUrl)
        if (this.connected) { return }

        this.set('connecting', true)
        if (this.failure) { this.set('failure', false) }

        try
        {
            if (this.socket instanceof WebSocket)
            {
                this.socket.close(1000, "Closing from client")
                this.socket.onopen = null
                this.socket.onclose = null
                this.socket.onerror = null
                this.socket.onmessage = null
                this.socket = null
            }

            this.dispatchEvent(new CustomEvent('api-scanner-printer-update-state', { bubbles: true, composed: true, detail: { action: 'connecting', } }))
            this.socket = new WebSocket(connectionUrl)
        }
        catch (ex)
        {
            this.onSocketError(ex)
        }

        this.socket.onopen = this.onSocketOpened.bind(this)
        this.socket.onclose = this.onSocketClosed.bind(this)
        this.socket.onerror = this.onSocketError.bind(this)
        this.socket.onmessage = this.onSocketMessage.bind(this)
    }

    _disconnect()
    {
        // console.log('_disconnect', this.connectionUrl)
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN)
        {
            console.warn('socket not connected')
        }
        this.socket.close(1000, "Closing from client")
        this.socket.onopen = null
        this.socket.onclose = null
        this.socket.onerror = null
        this.socket.onmessage = null
        this.socket = null
    }

    onSocketOpened(e)
    {
        // console.log(e, this)
        this.set('cmdsent', 0)
        this.set('connecting', false)
        this.set('connected', true)
        this.dispatchEvent(new CustomEvent('api-scanner-printer-update-state', { bubbles: true, composed: true, detail: { action: 'opened', readyState: this.socket.readyState } }))
        this._reconnectTries = 0
        this._reconnectLast = 2000
    }

    onSocketClosed(e)
    {
        this.set('connecting', false)
        this.set('connected', false)
        this.dispatchEvent(new CustomEvent('api-scanner-printer-update-state', { bubbles: true, composed: true, detail: { action: 'closed', readyState: this.socket.readyState } }))
        this.set('cmdsent', 0)

        if (this.autoReconnect && this.visible)
        {
            // this._reconnectLast = this._reconnectLast + this._reconnectTries * RandomInteger(1000, 5000)
            this._reconnectLast = 2000 + RandomInteger(-1000, 1000)
            this.dispatchEvent(new CustomEvent('api-scanner-printer-update-state', { bubbles: true, composed: true, detail: { action: 'auto-reconnect-wait', readyState: this.socket.readyState } }))
            this.async(()=>
            {
                this._reconnectTries++
                this._connect(this.connectionUrl, true)
            }, 
            this._reconnectLast)

            console.warn('Wait before reconnect... ', this._reconnectLast + 'ms')
        }
    }

    onSocketError(e)
    {
        console.warn(e)
        this.set('failure', true)
        this.dispatchEvent(new CustomEvent('api-scanner-printer-update-state', { bubbles: true, composed: true, detail: { action: 'error', readyState: this.socket.readyState } }))
    }

    onSocketMessage(e)
    {
        var dataObj: any = {}
        try 
        {
            dataObj = JSON.parse(e.data) 

            //fix an issue of old localservice
            if (typeof(dataObj) == 'string' && dataObj.startsWith('{"result":{"Command":"toggleonscreen"'))
            {
                dataObj = JSON.parse(dataObj)
                dataObj.CommandResult = dataObj.result
                delete dataObj.result
            }

            // if (Teamatical.BuildEnv == 'Development') console.log(dataObj)            
        } 
        catch 
        { 
            //
        }


        if (dataObj.CommandResult && 
            !(dataObj.CommandResult.Command == 'barcodescanned'
            || dataObj.CommandResult.Command == 'cameraresult' 
            || dataObj.CommandResult.Command == 'rfidscannresult'
            || dataObj.CommandResult.Command == 'weightresult'
            || dataObj.CommandResult.Command == 'printerfontprogress'
            ))
        {
            //exclude input-only commands
            this.set('cmdsent', this.cmdsent - 1)
        }

        var barr = [
            {
                title: this.localize('admin-app-ok'),
                ontap: (e) => 
                {
                    //
                }
            }
        ]
        if (dataObj.CommandResult && 
            (dataObj.CommandResult.Command == 'barcodescanned'
            || dataObj.CommandResult.Command == 'cameraresult' 
            || dataObj.CommandResult.Command == 'rfidscannresult'
            || dataObj.CommandResult.Command == 'weightresult'
            ) && dataObj.CommandResult.CurrentClients > 1)
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    // announce: this.localize('products-products-announce'),
                    message: this.localize('admin-local-service-fail', 'cmd', dataObj.CommandResult.Command, 'desc', `Local Service has multiple clients for some reason ${dataObj.CommandResult.CurrentClients}.`),
                    buttons: barr,
                }
            }))
            return //ignore packet with multiclients
        }


        //process packet
        if (dataObj.CommandResult && dataObj.CommandResult.ResultCode == 'success')
        {
            switch (dataObj.CommandResult.Command)
            {
                case 'rfidscannerslist':
                    var rfidscanners = Object.assign([], dataObj.RFIDScanners)
                    rfidscanners.unshift({
                        ScannerId: '',
                        ScannerName: `Unset RFID Scanner`,
                    })
                    this.set('rfidscanners', rfidscanners)
                    break

                case 'scannerslist':
                    // ID: 1
                    // ModelName: "WLS9500           "
                    // SerialNumber: "1008300516166   "
                    // Type: "USBIBMHID"
                    // dataObj.Scanners[0].Type += RandomInteger(1, 9999) //TEST
                    var scannersTitles = dataObj.Scanners.map(i => Object.assign({}, i, 
                        { 
                            Title: `${i.ModelName} - (#: ${i.SerialNumber}, ${this.localize('admin-ws-devicesettings-scanner-type')} ${i.Type})` 
                        }
                    ))
                    scannersTitles.unshift({
                        ID: '',
                        Title: `Unset Scanner`,
                        ModelName: "Unset Scanner",
                        SerialNumber: "Unset Scanner",
                        Type: "Unset Scanner"
                    })
                    this.set('scanners', scannersTitles)
                    break

                case 'printerslist':
                    var printersList = dataObj.Printers.map(i => Object.assign({}, i, { 
                        Title: `${i.Name} - (#: ${i.ID}, ${this.localize('admin-ws-devicesettings-printer-type')} ${i.Type})`
                    }))
                    printersList.unshift({
                        ID: '',
                        Title: `Unset Printer`,
                    })
                    this.set('printers', printersList)
                    // ConnectionString: "\\?\usb#vid_0a5f&pid_0120#d2j181101100#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}"
                    // ID: "d2j181101100"
                    // Name: "ZTC ZD420-203dpi ZPL"
                    // Type: "Zebra"
                    break

                case 'ledcontrollerslist':
                    this.set('leds', dataObj.Leds)
                    break

                case 'scaleslist':
                    this.set('scales', dataObj.Scales)
                    break

                case 'cameraslist':
                    var videocameras = Array.isArray(dataObj.Cameras) ? dataObj.Cameras.map((vi, inx) => {  return { ID: vi, Title: `Camera ${inx}` } }) : []
                    videocameras.unshift({
                        ID: '',
                        Title: `Unset Video Camera`,
                    })
                    this.set('videocameras', videocameras)
                    if (Array.isArray(this.videocameras) && this.videocameras.length > 0 && this.videocameras[0].ID)
                    {
                        this.requestCameraSettings(this.videocameras[0].ID)
                    }
                    break
    

                case 'printerfontprogress':
                    // console.log(dataObj)
                    if (dataObj.fontid && this.printerfonts)
                    {
                        var inx = -1
                        this.printerfonts.filter((i,inxi) => {
                            if (i.ID == dataObj.fontid)
                            {
                                inx = inxi
                                return true
                            }
                            return false
                        })
                        if (inx >= 0)
                        {
                            var p = parseFloat(dataObj.progress) * 100
                            this.set(`printerfonts.${inx}.Progress`, Math.round(p))
                        }
                    }
                    break

                case 'printergetfonts':
                    this.async(async () => {
                        try
                        {
                            var printerfonts = dataObj.Files.map(i => Object.assign({}, { 
                                ID: i,
                                Title: i,
                                PrinterID: this.printer.ID,
                            }))

                            // this.set('printerfonts', printerfonts) //TEST
                            // console.log('printerfonts', printerfonts, this.api_url)
                            this.api_action = 'list'
                            var r = await this._apiRequest(this.api_url, printerfonts)
                            // console.log('printerfonts', r)
                            if (r?.result)
                            {
                                this.set('printerfonts', r.result)
                            }
                        }
                        catch
                        {
                            //
                        }
                    })
                    break
                
                case 'printzpl':
                    if (this.cmdsent < 1 && this._reloadFontList)
                    {
                        this.async(() => {
                            this.sendCommand({ "command": "printergetfonts", "data": { printerid: this._reloadFontList.PrinterID } })
                            this._reloadFontList = null
                        })
                    }
                    break
                
                case 'cameragetparameters':
                    // console.log(dataObj.Exposure, dataObj.Focus, dataObj.Modes, dataObj.Zoom)
                    this.set('videoModes', Array.isArray(dataObj.Modes) ? dataObj.Modes.map(i => { return { 'mode': i } }) : null)
                    this.set('videoCamera', {})
                    this.set('videoExposure', dataObj.Exposure ? dataObj.Exposure : { Min: -12, Max: 12, Step:1, Value: -7, Auto: true })
                    this.set('videoFocus', dataObj.Zoom ? dataObj.Zoom : { Min: -12, Max: 12, Step:1, Value: -7, Auto: true })
                    this.set('videoZoom', dataObj.Focus ? dataObj.Focus : { Min: -12, Max: 12, Step:1, Value: -7, Auto: true })
                    break

                case 'cameratakepicture':
                    break

                case 'cameraresult':
                    this.api_action = 'cameraresult'
                    dataObj.Barcode = this._last_cameratakepicture?.data.barcode
                    break
            }
        }
        else if (dataObj.CommandResult && dataObj.CommandResult.ResultCode == 'fail')
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    // announce: this.localize('products-products-announce'),
                    message: this.localize('admin-local-service-fail', 'cmd', dataObj.CommandResult.Command, 'desc', dataObj.CommandResult.Description),
                    buttons: barr,
                }
            }))
        }

        //dispatch for application
        this.dispatchEvent(new CustomEvent('api-scanner-printer-packet', { bubbles: true, composed: true, 
            detail: { pkt: dataObj, readyState: this.socket.readyState } 
        }))



        //wake Lock restore if barcode scans
        var pkt = dataObj
        if (pkt && pkt.CommandResult)
        {
            if (pkt.CommandResult.Command == 'barcodescanned' && pkt.CommandResult.ResultCode == 'success')
            {
                this.async(async () => { this.wakeLockOnBarcodeScanRestore() })
            }
        }
    }

}