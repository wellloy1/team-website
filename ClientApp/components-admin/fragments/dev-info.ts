import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-tabs/paper-tabs'
import '@polymer/paper-tabs/paper-tab'
import '@polymer/paper-toggle-button/paper-toggle-button'
// import '@vaadin/vaadin-grid/vaadin-grid.js'
// import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
// import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { UICOLORS_LIGHT, Color } from '../../components/utils/ColorUtils'
import { NetBase } from '../../components/bll/net-base'
import '@advanced-rest-client/json-viewer/json-viewer.js'
import view from './dev-info.ts.html'
import style from './dev-info.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { Currency, Clipboard } from '../../components/utils/CommonUtils'
import { UIAdminDialog } from '../ui/ui-dialog'
import { IAdminSignalR_VersionUpdated } from '../../components/bll/signalr-global'
import '../ui/ui-dialog'
const COLORS_KEYS = Object.keys(UICOLORS_LIGHT)
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminDevInfo extends FragmentBase implements IAdminSignalR_VersionUpdated
{
    static get is() { return 'tmladmin-dev-info' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

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

            order: { type: Object, observer: '_orderChanged' },
            serverSelectedIndex: { type: Number },
            serverSelected: { type: String, computed: '_compute_serverSelected(serverSelectedIndex, loading)' },

            APIPath: { type: String, value: '/admin/api/info/' },
            api_action: { type: String, value: 'renderer' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: [] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            confirm_type: { type: String, value: 'cache' },
            confirm_title: { type: String, computed: '_computeConfirmTitle(confirm_type)' },
            confirm_okbtn: { type: String, computed: '_computeConfirmOkBtn(confirm_type)' },
            confirm_message: { type: String, computed: '_computeConfirmMsg(confirm_type)' },

            viewasjson: { type: Boolean, value: true },
            dialogdetails: { type: Object, notify: true },
            checkboxAutoRefresh:{ type: Boolean, value: false, observer: '_checkboxAutoRefreshChanged' },
        }
    }

    _netbase: any
    _observer: any
    confirm_type: string
    smallScreen: boolean
    serverSelectedIndex: number
    serverSelected: any
    dialogdetails: any


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_compareItems(serverSelectedIndex, order)',
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _log(v) { console.log(v) }

    _visibleChanged(visible)
    {
        if (!visible) { return }
    }

    SR_VersionUpdated(vobj: any)
    {
        this.reload()
        
        if (this.checkboxAutoRefresh)
        {
            this._autoRefreshDebouncer = Debouncer.debounce(this._autoRefreshDebouncer, timeOut.after(10000), () => { this.reload() })
        }
    }

    _onLoadResult(order)
    {
        var serverSelectedIndex = order?.SelectedInx ?? 0
        this._compareItems(serverSelectedIndex, order)

        return super._onLoadResult(order)
    }

    _autoRefreshDebouncer: Debouncer
    _checkboxAutoRefreshChanged(autorefresh)
    {
        if (autorefresh)
        {
            this._autoRefreshDebouncer = Debouncer.debounce(this._autoRefreshDebouncer, timeOut.after(10000), () => { this.reload() })
        } 
        else if (this._autoRefreshDebouncer)
        {
            this._autoRefreshDebouncer.cancel()
        }
    }

    _onServerTabTap(e)
    {
        // var serveri = e.model.__data.serveri
        // console.log(e)
        // this.reload()
        // if (this.checkboxAutoRefresh)
        // {
        //     this._autoRefreshDebouncer = Debouncer.debounce(this._autoRefreshDebouncer, timeOut.after(10000), () => { this.reload() })
        // }
    }


    _fetchItems(attempts, oid?, qp1?, callback?, abort = true, contextFields = [])
    {
        if (this.checkboxAutoRefresh)
        {
            this._autoRefreshDebouncer = Debouncer.debounce(this._autoRefreshDebouncer, timeOut.after(10000), () => { this.reload() })
        }
        super._fetchItems(attempts, oid, qp1, callback, abort, contextFields)
    }

    _orderChanged(order)
    {
        if (this.serverSelectedIndex === undefined) { this.serverSelectedIndex = order?.SelectedInx ?? 0 }
    }

    _compareItems(serverSelectedIndex, order: any = null)
    {
        if (!order?.ServerItems) { return }

        var serverSel = order.ServerItems[serverSelectedIndex]
        var compareResult = {}

        for (var i in order.ServerItems)
        {
            var serveri = order.ServerItems[i]
            if (serverSelectedIndex != i)
            {
                var diff = StringUtil.compareAsJSON(serverSel, serveri)
                if (diff) 
                {
                    compareResult = Object.assign(compareResult, diff.old, diff.new)
                }
            }
        }
        this.diffIndex = compareResult
    }

    diffIndex: any
    _check(serverSelectedIndex, name, val)
    {
        // if (name == 'Renderer'
        //     || name == 'MachineName') 
        // { return false }
        // console.log(name, this.diffIndex ? this.diffIndex[name] : null)

        return this.diffIndex && this.diffIndex[name]
    }

    _compute_serverSelected(serverSelectedIndex, loading)
    {
        return this.order?.ServerItems[serverSelectedIndex]
    }

    hideCacheResetBtn(orderi)
    {
        return false
    }

    hideFontResetBtn(orderi)
    {
        return false
    }

    hideColorResetBtn(orderi)
    {
        return false
    }

    reloadTap(e)
    {
        this.reload()
    }

    resetCacheTap(e)
    {
        this.confirm_type = 'cache'
        this.dialogConfirmOpen(e)
    }

    resetFontTap(e)
    {
        this.confirm_type = 'font'
        this.dialogConfirmOpen(e)
    }

    resetColorTap(e)
    {
        this.confirm_type = 'color'
        this.dialogConfirmOpen(e)
    }

    restartRendererTap(e)
    {
        this.confirm_type = 'renderer'
        this.dialogConfirmOpen(e)
    }

    restartWebsiteTap(e)
    {
        this.confirm_type = 'killweb'        
        const se = e?.detail?.sourceEvent
        if (!se?.altKey && !se?.ctrlKey && se?.shiftKey)
        {
            this.confirm_type = 'killwebhard'
        }        
        this.dialogConfirmOpen(e)
    }

    killGhostscriptTap(e)
    {
        this.confirm_type = 'killgs'
        this.dialogConfirmOpen(e)
    }

    dialogConfirmOpen(e)
    {
        this._openDlg(this.$.dialogconfirm as PaperDialogElement)
    }

    dialogConfirmTap(e)
    {
        var params: any = {}
        switch(this.confirm_type)
        {
            case 'cache':
                this.api_action = 'cache-reset'
                break

            case 'font':
                this.api_action = 'fontindex-reload'
                break

            case 'color':
                this.api_action = 'basecolors-reload'
                break

            case 'renderer':
                this.api_action = 'renderer-kill'
                params['server'] = this.serverSelected?.MachineName
                break

            case 'killweb':
                this.api_action = 'web-kill'
                params['server'] = this.serverSelected?.MachineName
                break

            case 'killwebhard':
                this.api_action = 'web-kill-hard'
                params['server'] = this.serverSelected?.MachineName
                break
                    
            case 'killgs':
                this.api_action = 'gs-kill'
                params['server'] = this.serverSelected?.MachineName
                break
            }
        
        this._fetchItems(1, '', params)
    }

    _computeConfirmTitle(confirm_type)
    {
        switch (this.confirm_type)
        {
            case 'cache':
                return 'Cache Reset Confirm'

            case 'font':
                return 'Fonts Reset Confirm'

            case 'color':
                return 'Colors Reset Confirm'

            case 'renderer':
                return 'Restart Renderer Confirm'

            case 'killweb':
                return 'Kill Website Node Confirm'
            
            case 'killwebhard':
                return 'Kill Hard Website Node Confirm'
        
            case 'killgs':
                return 'Kill Ghostscript Confirm'
        }
    }

    _computeConfirmOkBtn(confirm_type)
    {
        switch (this.confirm_type)
        {
            case 'cache':
                return 'Cache Reset'

            case 'font':
                return 'Fonts Reset'

            case 'color':
                return 'Colors Reset'

            case 'renderer':
                return 'Restart Renderer'

            case 'killweb':
                return 'Kill Node'

            case 'killwebhard':
                return 'Kill Hard Node'
                    
            case 'killgs':
                return 'Kill Ghostscript'
        }
    }

    _computeConfirmMsg(confirm_type)
    {
        switch (this.confirm_type)
        {
            case 'cache':
                return 'Are you sure to reset website cache?'

            case 'font':
                return 'Are you sure to reset website fonts?'

            case 'color':
                return 'Are you sure to reset website colors?'

            case 'renderer':
                return 'Are you sure to restart Renderer?'

            case 'killweb':
                return 'Are you sure to to kill Website Node?'
    
            case 'killwebhard':
                return 'Are you sure to to kill HARD Website Node?'
    
            case 'killgs':
                return 'Are you sure to to kill Ghostscript?'
        }
    }

    showSignalReportTap(e)
    {
        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true,
                title: 'Signaling Monitor Report',
                Details: JSON.stringify(this.order.SignalMonitorReport, null, "\t"),
            })
            dialogdetails.open()

            this.async(() => { this.set('dialogdetails.loading', false) }, 170)
        }
    }

    copyJsonDetailsTap(e)
    {
        var item = e?.model?.__data?.histi
        var jsonTxt = item ? item.Details : this.dialogdetails.Details
        
        Clipboard.copyFromString(jsonTxt)
        this.showToast('JSON copied to clipboard...')
    }

    serverTabsStyle(orderServerItems, serverSelectedIndex)
    {
        if (!Array.isArray(orderServerItems) || !isFinite(serverSelectedIndex) || serverSelectedIndex < 0) { return '' }
        var serveri = orderServerItems[serverSelectedIndex]
        var { colk, colf } = this._serverTabColors(serveri)
        return `--paper-tabs-selection-bar-color: ${colf}`
    }

    serverTabStyle(serveri)
    {
        var { colk, colf } = this._serverTabColors(serveri)
        return `background-color: var(${colk}); color: ${colf}`
    }

    _serverTabColors(serveri)
    {
        // console.log(serveri, serveri?.ServerInfo?.BuildWebsiteVersion)
        var buildVer = serveri?.ServerInfo?.BuildWebsiteVersion

        if (typeof(buildVer) != 'string') { return '' }

        const max = COLORS_KEYS.length - 1
        var hash = 0, i, chr
        for (i = 0; i < buildVer.length; i++)
        {
            chr = buildVer.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32bit integer
        }
        var inx = Math.abs(hash * 6) % max
        let colk = COLORS_KEYS[inx]
        return { colk: colk, colf: Color.contrastBW(UICOLORS_LIGHT[colk]) }
    }

}