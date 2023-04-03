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
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { NetBase } from '../../components/bll/net-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { Color } from '../../components/utils/ColorUtils'
import '../shared-styles/common-styles'
import '../../components/ui/ui-color-picker'
import '../../components/ui/ui-pantone-color-picker'
import view from './ui-color-form-picker.ts.html'
import style from './ui-color-form-picker.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
const NEWUICOLOR = {
    "IsSpot": false,
    "n": "",
    "hex": "#000000",
    "sL": "0",
    "sa": "0",
    "sb": "0",
} 


@CustomElement
export class UIAdminColorFormPicker extends UIBase
{
    static get is() { return 'tmladmin-ui-color-form-picker' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            label: { type: String, reflectToAttribute: true, value: "Color" },
            colorTypeSelector: { type: Boolean, reflectToAttribute: true }, // color-type-selector

            visible: { type: Boolean, notify: true, },
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            tabindex: { type: String, reflectToAttribute: true }, //value: "-1"
            ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },

            selectedColor: { type: Object },
            selectedColorUI: { type: Object },
            selectedColorText: { type: String, computed: '_compute_selectedColorText(selectedColor.n, selectedColor.h)' },
        }
    }

    static get observers()
    {
        return [
            '_color(selectedColor)',

            '_colorui_isspot(selectedColorUI.IsSpot)',
            '_colorui_n(selectedColorUI.n)',
            '_colorui_hex(selectedColorUI.hex)',
            '_colorui_lab(selectedColorUI.sL, selectedColorUI.sa, selectedColorUI.sb)',
        ]
    }
    _log(v) { console.log(v) }


    //#region Vars

    _colorDebouncer: Debouncer
    _closeDebouncer: Debouncer
    selectedColor: any
    selectedColorUI = NEWUICOLOR

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

    _lockUI = true
    _color(selectedColor)
    {
        this._lockUI = true
        this.set('selectedColorUI.IsSpot', selectedColor.IsSpot)
        this.set('selectedColorUI.n', `${selectedColor.n}`)
        this.set('selectedColorUI.hex', `#${selectedColor.h}`)
        
        this.set('selectedColorUI.sL', `${selectedColor.L}`)
        this.set('selectedColorUI.sa', `${selectedColor.a}`)
        this.set('selectedColorUI.sb', `${selectedColor.b}`)
        this._lockUI = false
    }

    _colorui_isspot(isSpot)
    {
        if (this._lockUI) { return }

        this.set('selectedColor.IsSpot', isSpot)
    }

    _colorui_n(n)
    {
        if (this._lockUI) { return }

        this.set('selectedColor.n', `${n}`)
    }

    _colorui_hex(hex)
    {
        if (this._lockUI) { return }

        if (typeof(hex) == 'string' && hex.startsWith('#') && hex.length == 7)
        {
            var h = `${hex.substring(1)}`
            if (h != this.selectedColor.h) 
            { 
                this.set('selectedColor.h', h) 
            }
            // var rgb = [Number(`0x${h.substring(0,2)}`), Number(`0x${h.substring(2,4)}`), Number(`0x${h.substring(4,6)}`)]
        }
    }

    _setLab = false
    _colorui_lab(L, a, b)
    {
        if (this._lockUI) { return }

        var lab = [Number(L), Number(a), Number(b)]
        // if ( || !Number.isFinite(lab[1]) || !Number.isFinite(lab[2])) { return }
        if (!this.selectedColor?.notvalid) { this.set('selectedColor.notvalid', {}) }
        var notvalid = false
        if (!Number.isFinite(lab[0])) { this.set('selectedColor.notvalid.L', 'Wrong number'); notvalid = true }
        if (!Number.isFinite(lab[1])) { this.set('selectedColor.notvalid.a', 'Wrong number'); notvalid = true }
        if (!Number.isFinite(lab[2])) { this.set('selectedColor.notvalid.b', 'Wrong number'); notvalid = true }
        if (notvalid) { return }

        this.set('selectedColor.notvalid', null)
        this.set('selectedColor.L', lab[0])
        this.set('selectedColor.a', lab[1])
        this.set('selectedColor.b', lab[2])


        //RGB
        var rgb = Color.lab2rgb(lab)
        const to2hex = (v) => { return ('00' + Math.round(v).toString(16).toUpperCase()).slice(-2) }
        var h = `${to2hex(rgb[0])}${to2hex(rgb[1])}${to2hex(rgb[2])}`.toUpperCase()
        // console.log(L, a, b, '->', rgb, h, this.selectedColor.h)

        this.set('selectedColor.h', `${h}`)
        this.set('selectedColorUI.hex', `#${h}`) //set back RGB value
    }



    _compute_selectedColorText(name, hex)
    {
        return `${name} (#${hex})`
    }

    onInputChanged(e)
    {
        // console.log(e)
    }
}
