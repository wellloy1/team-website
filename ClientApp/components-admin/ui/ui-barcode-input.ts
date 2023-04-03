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
import { PaperDropdownMenuLightElement } from '@polymer/paper-dropdown-menu/paper-dropdown-menu-light' 
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
// import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { NetBase } from '../../components/bll/net-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { deepClone } from '../../components/utils/CommonUtils'
import { UIAdminDialog } from '../ui/ui-dialog'
import { CustomElement } from '../../components/utils/CommonUtils'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { APIResponseModel } from '../../components/dal/api-response-model'
import '../ui/ui-dialog'
import '../ui/production-sewing-item'
// import { css_time_to_milliseconds } from '../../components/utils/CommonUtils'
import '../shared-styles/common-styles'

import view from './ui-barcode-input.ts.html'
import style from './ui-barcode-input.ts.css'
// const UIAdminDialogBase = mixinBehaviors([IronOverlayBehavior], UIBase) as new () => UIBase & IronOverlayBehavior
// const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UIAdminBarcodeInput extends UIBase
{
    static get is() { return 'tmladmin-ui-barcode-input' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true, },
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            label: { type: String, reflectToAttribute: true, value: "Search User" },
            tabindex: { type: String, reflectToAttribute: true }, //value: "-1"
            ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },

            barcodeTxt: { type: String, value: '' },
            loading: { type: Boolean, reflectToAttribute: true },

            scannedBarcodes: { type: Array, value: [], notify: true },
            relatedBarcodes: { type: Array, value: []},
            
            containerizingMode: { type: Boolean, reflectToAttribute: true }, //containerizing-mode
            aggregationMode: { type: Boolean, reflectToAttribute: true }, //aggregation-mode
            qaMode: { type: Boolean, reflectToAttribute: true }, //qa-mode
            shippingMode: { type: Boolean, reflectToAttribute: true }, //shipping-mode
            sortingMode: { type: Boolean, reflectToAttribute: true }, //sorting-mode

            showHelpBtn: { type: Boolean, value: true, reflectToAttribute: true }, //show-help-btn

            // websiteUrl: { type: String },
            // frameMargin: { type: String, reflectToAttribute: true },
            // role: { type: String, value: "dialog", reflectToAttribute: true },

            _disabledEnter: { type: Boolean, notify: true, computed: '_compute_disabledEnter(disabled, loading, barcodeTxt)' },
            _disabledHelp: { type: Boolean, notify: true, computed: '_compute_disabledHelp(disabled, loading, barcodeTxt)' },

            dialoghelp: { type: Array, notify: true, }, //dialoghelp
        }
    }

    static get observers()
    {
        return [
            '_watchRelatedBarcodes(relatedBarcodes)',
            '_watchScannedBarcodes(scannedBarcodes, loading)',
            //  '_log(visible)',
        ]
    }
    _log(v) { console.log(v) }


    get newbarcode() { return this.shadowRoot?.querySelector('#newbarcode') as PaperInputElement }
    

    //#region Vars

    scannedBarcodes: { barcode: '', ScannerID: '' }[]
    relatedBarcodes: { barcode: '' }[]
    relatedBarcodesHash: any
    disabled: boolean
    loading: boolean
    _disabledEnter: boolean
    dialoghelp: any

    containerizingMode: boolean
    aggregationMode: boolean
    qaMode: boolean
    shippingMode: boolean
    sortingMode: boolean
    beforeBarcodePush: any

    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    _compute_disabledEnter(disabled, loading, barcodeTxt)
    {
        return disabled || loading || !this._asBool(barcodeTxt)
    }
    
    _compute_disabledHelp(disabled, loading, barcodeTxt)
    {
        return disabled || loading || !this._asBool(barcodeTxt)
    }


    _watchRelatedBarcodes(relatedBarcodes)
    {
        this.relatedBarcodesHash = {}
        if (Array.isArray(relatedBarcodes))
        {
            for (var i in relatedBarcodes)
            {
                this.relatedBarcodesHash[relatedBarcodes[i]] = 1
            }
        }
    }

    _barcodeEnter(e)
    {
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if ((!e.ctrlKey && !e.altKey && keycode == 13) && e.target == this.$['newbarcode'] && !this._disabledEnter)
        {
            var efake = { target: { parentElement: e.target } }
            this._barcodeTap(efake)
        }
    }

    _barcodeTapUrl(e)
    {
        var barcodeStr = e?.target?.parentElement?.value
        if (barcodeStr)
        {
            // console.log('w-base', barcodeStr)
            barcodeStr = barcodeStr.trim()
            //parse url-w-barcode
            try
            {
                //https://wwwdev.teamatical.com/admin/workstation-sewing?Barcode=WGPUP
                var url = new URL(barcodeStr)
                const urlParams = new URLSearchParams(window.location.search)
                const barcodePar = urlParams.get('Barcode') || urlParams.get('id')
                //? or url.hash
                if (barcodePar)
                {
                    barcodeStr = barcodePar
                }
                // console.log('w-base - from url', barcodeStr)
            } 
            catch (_)
            {
                //
            }
            e.target.parentElement.value = barcodeStr
        }
    }

    onInputChanged(e)
    {
        this.dispatchEvent(new CustomEvent('barcode-changed', { bubbles: true, composed: true, detail: e }))
    }


    _barcodeScanDebouncer: Debouncer
    barcodePush(barcode, scannerID = '')
    {
        this._barcodePushHandler(barcode, scannerID)
    }

    _barcodePushHandler(barcode, scannerID = '')
    {
        var pushAllow = true
        if (this.beforeBarcodePush && typeof this.beforeBarcodePush == 'function')
        {
            try { pushAllow = this.beforeBarcodePush(barcode, scannerID) } catch(ex) { console.error(ex) }
        }
        if (pushAllow)
        {
            this._barcodePush(barcode, scannerID)
        }
    }

    _barcodePush(barcode, scannerID = '')
    {
        this.unshift('scannedBarcodes', { barcode: barcode, ScannerID: scannerID })
        this.showToast(barcode)

        const wt = this._getDebounceDelay(barcode)
        this._barcodeScanDebouncer = Debouncer.debounce(this._barcodeScanDebouncer, timeOut.after(wt), () => { this._processScannedBarcodes() })
    }

    _getDebounceDelay(barcode)
    {
        var wt = 17
        if (this.relatedBarcodesHash[barcode] && this.scannedBarcodes?.length < 20)
        {
            wt = 1600
        }
        return wt
    }

    _processScannedBarcodes()
    {
        if (this.loading) 
        {
            this._barcodeScanDebouncer = Debouncer.debounce(this._barcodeScanDebouncer, timeOut.after(350), () => { this._processScannedBarcodes() })
            console.warn('time is out, but request is not finished yet ...')
            return //WAIT!!!
        }
        var d = { barcodes: deepClone(this.scannedBarcodes).reverse() } //.map(i => i.barcode)
        this.scannedBarcodes = []
        this.dispatchEvent(new CustomEvent('barcode-enter', { bubbles: true, composed: true, detail: d }))
    }

    _watchScannedBarcodes(scannedBarcodes, loading)
    {
        if (this._barcodeScanDebouncer?.isActive() 
            && !loading 
            && this.scannedBarcodes?.length)
        {
            this._barcodeScanDebouncer = Debouncer.debounce(this._barcodeScanDebouncer, timeOut.after(1), () => { this._processScannedBarcodes() })
        }
    }

    _barcodeTap(e)
    {
        this._barcodeTapUrl(e)
        if (!e.target || !e.target.parentElement || !e.target.parentElement.value || e.target.parentElement.value.trim() == '') { return }
        
        var barcode = e.target?.parentElement?.value?.trim()
        if (barcode)
        {
            var barcodes: any = null
            try { barcodes = barcode.split(',') } catch (ex) {}
            if (Array.isArray(barcodes))
            {
                for (var i in barcodes)
                {
                    var bi = barcodes[i].trim()
                    if (bi)
                    {
                        this._barcodePushHandler(bi)
                    }
                }
            }
            else
            {
                this._barcodePushHandler(barcode)
            }
        }
        e.target.parentElement.value = ''
    }

    _formatInvalid(invalid, invalidMessage, locale_msg)
    {
        if (!invalid) { return '' }
        return this._asBool(invalidMessage) ? invalidMessage : this.localize(locale_msg)
    }

    _netbase: NetBase
    async _showBarcodeDetailsTap(e)
    {
        if (!e.target || !e.target.parentElement || !e.target.parentElement.value || e.target.parentElement.value.trim() == '') { return }
       
        var barcode = e.target.parentElement.value.trim()
        var barcodes: any = null
        try { barcodes = barcode.split(',') } catch (ex) {}
        var barcodeout: any = []
        if (Array.isArray(barcodes))
        {
            for (var i in barcodes)
            {
                var bi = barcodes[i].trim()
                if (bi)
                {
                    barcodeout.push(bi)
                }
            }
        }
        else
        {
            barcodeout.push(barcode)
        }

        e.target.parentElement.value = ''


        //Show Dialog
        await this.showBarcodeDetails(barcodeout[0])
    }

    async showBarcodeDetails(barcode)
    {
        var obj: any = { 
            barcode: barcode
        }

        var dialoghelp = this.$.dialoghelp as UIAdminDialog
        if (dialoghelp)
        {
            this.set('dialoghelp', Object.assign({ 
                loading: true 
            }, 
            obj, { 
                title: 'Barcode Details' 
            }))
            dialoghelp.open()
        }

        if (!this._netbase) { this._netbase = new NetBase() }
        try
        {
            // GET /admin/api/workstation/barcode-details?barcode=QO529C8H25DAC
            var r = await this._netbase._apiRequest('/admin/api/workstation/barcode-details', obj, 'GET') as APIResponseModel | null | undefined
            if (r?.success === true)
            {
                this.set('dialoghelp', Object.assign(r?.result, { title: this.dialoghelp.title }))
            }
        }
        catch(ex)
        {
            console.error(ex)
        }
        this.set('dialoghelp.loading', false)
    }
    
}
