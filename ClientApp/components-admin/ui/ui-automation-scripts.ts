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
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { NetBase } from '../../components/bll/net-base'
import view from './ui-automation-scripts.ts.html'
import style from './ui-automation-scripts.ts.css'
import '../shared-styles/common-styles'
import { CustomElement } from '../../components/utils/CommonUtils'
import { UserInfoModel } from '../../components/dal/user-info-model'
import { UISnackbar } from '../../components/ui/ui-snackbar'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { sleep } from '../../components/utils/CommonUtils'
import '../../components/ui/paper-expansion-panel'
import '../ui/ui-dialog'
import { UIAdminDialog } from '../ui/ui-dialog'
import { StringUtil } from '../../components/utils/StringUtil'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys




@CustomElement
export class UIAutomationScripts extends UIBase
{
    static get is() { return 'teamatical-ui-automation-scripts' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },
            smallScreen: { type: Object },
            scrollTarget: { type: String, },

            visible: { type: Boolean, notify: true, },
            connecting: { type: Boolean, notify: true, reflectToAttribute: true },
            connected: { type: Boolean, notify: true, reflectToAttribute: true },
            failure: { type: Boolean, notify: true, reflectToAttribute: true },
            loading: { type: Boolean, notify: true, reflectToAttribute: true },

            automationScript: { type: String, value: '' },
            // log: { type: Array, notify: true, value: [] },

            icon: { type: String, computed: '_computeIcon(userInfo)' },
            disableRun: { type: String, computed: '_compute_disableRun(loading, devConsole)' },

            devConsole: { type: Boolean, value: true, notify: true },
            filename: { type: String },
        }
    }

    static get observers()
    {
        return [
            // '_log(automationScript)',
        ]
    }

    _log(v) { console.log(v) }

    // get scannerprinterdata(): ScannerPrinterData { return this.$['scanner-printer-data'] as ScannerPrinterData }
    get texteditorPre() { return this.$['texteditor'] as HTMLPreElement }
    

    _toast: UISnackbar
    userInfo: UserInfoModel
    automationScript: string
    loading: boolean
    devConsole: boolean
    visible: boolean
    _devConsoleDebouncer: Debouncer
    texteditor: any
    recentFile: any
    filename: string = ''
    // log: any


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        window.addEventListener('resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        // window.addEventListener('devtoolschange', (e: any) => { this.devConsole = e.detail.open })

        // var auto_dialog: any = this.$.auto_dialog
        // var scrollable = auto_dialog.querySelector('paper-dialog-scrollable')
        // scrollable.dialogElement = auto_dialog
    }

    _onResized(e)
    {
        this._devConsoleDebouncer = Debouncer.debounce(this._devConsoleDebouncer, timeOut.after(250), () =>
        {
            this._checkDevConsole()
            this.texteditor?.resize()
        })        
    }

    _onKeydownEvent(e)
    {
        // console.log(this.visible, e)
        if (this.userInfo?.isAdmin !== true || this.visible === false) { return }

        var keycode = -1
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }
        var auto_dialog = this.$.auto_dialog as UIAdminDialog

        // console.log(keycode, e)    
        if (e.ctrlKey && !e.altKey && !e.shiftKey && e.code == 'KeyR' && auto_dialog?.opened === true)
        {
            this._onRunTap({ target: this.$.runbtn})
            e.preventDefault()
            e.stopPropagation()
            return 
        }

        if (e.ctrlKey && !e.altKey && !e.shiftKey && e.code == 'KeyO' && auto_dialog?.opened === true)
        {
            this.onOpenFileTap()
            e.preventDefault()
            e.stopPropagation()
            return
        }

        if (e.ctrlKey && !e.altKey && e.shiftKey && e.code == 'KeyO' && auto_dialog?.opened === true)
        {
            this.onReloadFileTap()
            e.preventDefault()
            e.stopPropagation()
            return
        }

        if (e.ctrlKey && !e.altKey && e.shiftKey && e.code == 'KeyC' && auto_dialog?.opened === true && this.recentFile)
        {
            this.onCloseFileTap()
            e.preventDefault()
            e.stopPropagation()
            return
        }

        if (e.ctrlKey && !e.altKey && !e.shiftKey && e.code == 'KeyS' && auto_dialog?.opened === true && this.recentFile)
        {
            this.onSaveFileTap()
            e.preventDefault()
            e.stopPropagation()
            return
        }

        if ((e.ctrlKey && !e.altKey && e.shiftKey && e.code == 'KeyA') && auto_dialog?.opened !== true)
        {
            this._openDialogTap()
            e.preventDefault()
            e.stopPropagation()
            return 
        }

        //console.log(e.ctrlKey, e.altKey, e.shiftKey, keycode)
        if (keycode == 123 || (e.ctrlKey && e.shiftKey))
        {
            this._devConsoleDebouncer = Debouncer.debounce(this._devConsoleDebouncer, timeOut.after(1250), () =>
            {
                this._checkDevConsole()
            })
        }
    }

    _openDialogTap(e?)
    {
        var auto_dialog = this.$.auto_dialog as UIAdminDialog
        if (auto_dialog)
        {
            this.set('auto_dialog', { loading: true })
            auto_dialog.open()
        }        
        // this._openDlg()
        // var dlg: any = this.$.auto_dialog
        // dlg.positionTarget = this.querySelector('div')
        // dlg.open()


        this.async(async () =>
        {
            const ace = await import('ace-builds/src-noconflict/ace')
            await import('ace-builds/webpack-resolver.js')
            await import('ace-builds/src-noconflict/ext-language_tools.js')
            ace.require("ace/ext/language_tools")
            const editor = ace.edit(this.texteditorPre)
            editor.getSession().setMode('ace/mode/javascript')
            editor.setTheme('ace/theme/github')
            editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: false,

            })
            editor.renderer.attachToShadowRoot()
            editor.session.on('changeMode', function (e, session)
            {
                if ("ace/mode/javascript" === session.getMode().$id)
                {
                    if (!!session.$worker)
                    {
                        session.$worker.send("setOptions", [{
                            asi: true,
                            esversion: 9,
                            // "-W095": false,
                            // "-W025": false
                        }]);
                    }
                }
            })

            this.texteditor = editor
        })

        this._devConsoleDebouncer = Debouncer.debounce(this._devConsoleDebouncer, timeOut.after(250), () =>
        {
            this._checkDevConsole()
            this.texteditor?.resize()
        })    
    }

    // openFile(e)
    // {
    //     // console.log(e)
    //     var input = e.target

    //     var reader = new FileReader()
    //     reader.onload = () =>
    //     {
    //         let text = reader.result

    //         this.texteditor?.setValue(text)
    //         // this.texteditor.valueDelta = JSON.stringify([
    //         //     { insert: text, attributes: { "code-block": true } },
    //         // ])
    //     }
    //     if (input.files && input.files.length > 0)
    //     {
    //         reader.readAsText(input.files[0])
    //     }
    // }

    async getFileHandle()
    {
        const opts = {
            types: [
                {
                    description: 'Javascript Files',
                    accept: {
                        'application/javascript': ['.js'],
                    }
                }
            ]
        }
        return await window.showOpenFilePicker(opts)
    }

    async saveFile(fileHandle, contents)
    {
        if (!fileHandle)
        {
            fileHandle = await window.showSaveFilePicker()
        }
        const writable = await fileHandle.createWritable()
        await writable.write(contents)
        await writable.close()
    }

    async onOpenFileTap(e?)
    {
        var input = await this.getFileHandle()
        if (input && input.length > 0 && input[0])
        {
            this.recentFile = input[0]
            const file = await this.recentFile.getFile()
            const contents = await file.text()
            this.filename = this.recentFile.name
            this.texteditor?.setValue(contents)
        }
    }

    async onReloadFileTap(e?)
    {
        if (this.recentFile)
        {
            const file = await this.recentFile.getFile()
            const contents = await file.text()
            this.texteditor?.setValue(contents)
        }
    }

    onCloseFileTap(e?)
    {
        this.texteditor?.setValue('')
        this.recentFile = null
        this.filename = ''
    }

    async onSaveFileTap(e?)
    {
        if (!this.recentFile) { return }

        const contents = this.texteditor?.getValue()
        await this.saveFile(this.recentFile, contents)
    }

    async _onRunTap(e)
    {
        if (this.userInfo?.isAdmin !== true) { return }

        if (!this.devConsole) 
        {
            this._showToast('Script cannot run without Dev Console ...')
            return
        }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        var accessToken = await NetBase.prototype._getAccessToken()

        //api for tests
        // const urlquery = this._urlquery
        const apiRequestPOST = async (url = '', data = {}, retry, headers) => await this.apiRequest_(url, 'POST', accessToken, data, retry, headers)
        const apiRequestGET = async (url = '', data = {}, retry, headers) => { return await this.apiRequest_(url, 'GET', accessToken, data, retry, headers) }
        const apiList = async (url = '', filters = [], processHandler) => { return await this.apiList(url, accessToken, filters, processHandler) }
        const urlquery = (url, data) => this._urlquery(url, data)
        const download = (txt, filename) => this._download(txt, filename)
        const runasync = async (func) => await this.async(func, 0)
        const runsleep = (ms) => { return sleep(ms) } 
        const randomint = (min, max) => { return RandomInteger(min, max) }
       
        const console_log = function () { this.apiLog('log', ...arguments) }.bind(this)
        const console_err = function () { this.apiLog('err', ...arguments) }.bind(this)
        const console_title = function () { this.apiLog('title', ...arguments) }.bind(this)
        const console_res = function () { this.apiLog('res', ...arguments) }.bind(this)





        const automationScript = this.texteditor?.getValue() || ``
        if (!automationScript.trim())
        {
            this._showToast('Script is Empty ...')
            return
        }
        // console.log(automationScript)
        this.set('log', [])
        this._showToast('Script Run...')
        progress.active = true
        this.loading = true

        var main = () => {}
        try
        {
            this.apiLog('run', '.......................')
            main = eval(`${automationScript}`)
            var v = await main()
            console_res(v)
        }
        catch (err)
        {
            console_err(err)
        }
        this.loading = false
        progress.active = false
        this._showToast('Script Stop.')
    }

    _checkDevConsole()
    {
        var auto_dialog = this.$.auto_dialog as UIAdminDialog
        if (!auto_dialog.opened) { return }


        // if (!this.visible) { return }

        // var checkStatus
        // var element = new Image()
        // Object.defineProperty(element, 'id', {
        //     get: function () 
        //     {
        //         checkStatus = 'on'
        //         throw new Error("Dev tools checker")
        //     }
        // })
        // requestAnimationFrame(() =>
        // {
        //     checkStatus = 'off'
        //     console.dir(element)
        //     var r = checkStatus == 'on'
        //     if (r != this.devConsole) { this.devConsole = r }
        // })
        this.devConsole = true
    }

    onCloseSettingsDialog(e)
    {
        //
    }

    _computeIcon(userInfo)
    {
        return 'admin-icons:extension'
    }

    _compute_disableRun(loading, devConsole)
    {
        return loading || !devConsole
    }


    //     const workerTaskRun = async (workerFnStr, input) =>
    //     {
    //         // Create worker
    //         //workerFunction.toString().replace('"use strict";', '')
    //         let fnString = '(' + workerFnStr + ')();'
    //         let workerBlob = new Blob([fnString])
    //         let workerBlobURL = window.URL.createObjectURL(workerBlob, { type: 'application/javascript; charset=utf-8' })
    //         let worker = new Worker(workerBlobURL)

    //         // Run worker
    //         return await new Promise((resolve, reject) =>
    //         {
    //             worker.onmessage = (e) => { resolve(e.data) }
    //             worker.onerror = (e) => { reject(e) }
    //             worker.postMessage(input)
    //             // console.log(worker, input)
    //         })
    //     }

    _urlquery(pathname, qpar)
    {
        var qs = ''
        if (qpar) 
        {
            qs = Object.keys(qpar).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(qpar[key]) }).join('&')
        }
        var first = (pathname && pathname.indexOf('?') >= 0 ? false : true)
        return pathname + (qs ? (first ? '?' : '&') + qs : '')
    }

    apiLog(...args)
    {
        var data = [...args]
        var type = data.shift()
        // this.log.push({ type: type, data: data })

        switch(type)
        {
            default:
            case 'log':
                console.log('%c Script Log ', 'color: white; background-color: #818894', ...data)
                break

            case 'req':
                console.log('%c Script API ', 'color: white; background-color: #95B46A', ...data)
                break

            case 'title':
                console.log('%c Script Title: ' + data[0], 'color: white; background-color: #db7b2d')
                break

            case 'err':
                console.log('%c Script Error ', 'color: white; background-color: #D33F49', ...data)
                break

            case 'run':
                console.clear()
                console.log('%c Script RUN ' + data[0], 'color: white; background-color: ##2241A5')
                break
    
            case 'res':
                console.log('%c Script Result ', 'color: white; background-color: #2241A5', ...data)
                break
        }
    }

    async apiRequest_(url = '', method = 'POST', accessToken = '', data = {}, retry = { count: 1, summaryKey: '-' }, headers = {})
    {
        if (!url) { return }
        var relative_path = false
        if (url.substr(0, 1) !== '/') 
        { 
            url = '/' + url 
            relative_path = true
        }
        const api_admin = '/admin/api'
        if (relative_path && !url.startsWith(api_admin)) { url = api_admin + url }
        // url = window.location.origin + url //need if in webworker
        if (method == 'GET') { url = this._urlquery(url, data) }

        // Default options are marked with *
        var rq = {
            method: method, // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken,
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *client
        } as RequestInit

        for (var h in headers)
        {
            rq.headers[h] = headers[h]
        }

        if (method == 'POST')
        {
            // body data type must match "Content-Type" header
            rq.body = JSON.stringify(data)
        }

        // this.apiLog('req', { url: url, method: method, accessToken: accessToken, progress: true })

        if (!retry) { retry = { count: 1, summaryKey: '-' } }

        var r = null, response
        for (var i = 0; i <= retry.count; i++)
        {
            response = await fetch(url, rq)
            try
            {
                r = await response.json()
            }
            catch
            {
                throw new Error("JSON wrong format, it might be GET/POST missing")
            }
            if (r.summary?.Key === retry.summaryKey) { continue }
            break
        }

        if (r?.success)
        {
            // this.apiLog('req', { url: url, method: method, accessToken: accessToken, done: true, response: response, json: r })
        }
        else
        {
            this.apiLog('err', { url: url, method: method, accessToken: accessToken, done: true, response: response, json: r })
            throw new Error("API Success FALSE")
        }
        return r
    }

    async apiList(url, accessToken, filters = [], processHandler = async (item, arr) => { })
    {
        var qpar = {
            pn: 0,
            ps: 64,
            pt: "",
            tz: new Date().getTimezoneOffset(),
            filters: JSON.stringify(filters)
        }
        const MAX_PAGES = 100000
        var items = []
        for (var p = 0; p <= MAX_PAGES; p++)
        {
            var api = await this.apiRequest_(url, 'POST', accessToken, qpar)
            if (!api.success) { throw new Error('Failed') }

            for(var i in api.result.content)
            {
                await processHandler(api.result.content[i], items)
            }

            if (api.result.plast) { break }

            qpar = Object.assign(qpar, {
                pn: qpar.pn + 1,
                pt: api.result.ptoken_next
            })
        }
        return items
    }

    _download(data, filename)
    {
        var element = document.createElement('a')
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data))
        element.setAttribute('download', filename)
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    _showToast(msg)
    {
        if (!this._toast)
        {
            this._toast = new UISnackbar()
            this._toast.timeout = 3 * 1000
            this.shadowRoot?.appendChild(this._toast)
        }
        this._toast.innerHTML = msg
        this._toast.open()
    }

}
