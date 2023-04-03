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
import '@polymer/paper-item/paper-icon-item'
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
import { UIAdminDialog } from '../ui/ui-dialog'
import '../shared-styles/common-styles'
import '../ui/ui-color-form-picker'
import '../ui/ui-dialog'
import { APIResponseModel } from '../../components/dal/api-response-model'
import view from './ui-color-input-picker.ts.html'
import style from './ui-color-input-picker.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
const NEWCOLOR = {
    "IsSpot": false,
    "i": null,
    "n": "",
    "h": "000000",
    "L": "",
    "a": "",
    "b": "",
} 


@CustomElement
export class UIAdminColorInputPicker extends UIBase
{
    static get is() { return 'tmladmin-ui-color-input-picker' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true, },
            label: { type: String, reflectToAttribute: true, value: "Color" },
            websiteUrl: { type: String },

            showAddButton: { type: Boolean, notify: true, reflectToAttribute: true }, //show-add-button
            spotColorOnly: { type: Boolean, notify: true, reflectToAttribute: true }, //spot-color-only
            spotLimit: { type: String, notify: true, reflectToAttribute: true, value: '10' }, //spot-limit
            isManufacturer: { type: Boolean, notify: true, reflectToAttribute: true }, //is-manufacturer

            
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            tabindex: { type: String, reflectToAttribute: true }, //value: "-1"
            ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },

            selectedColor: { type: Object, value: null, notify: true }, //selected-color
            colorsSwatchPalette: { type: Array, notify: true, value: [] }, //colors-swatch-palette
            colorsPantonePalette: { type: Array, notify: true, value: [] }, //colors-pantone-palette

            // selectedColorText: { type: String, computed: '_compute_selectedColorText(selectedColor.n, selectedColor.h)' },
            disabledAddColor: { type: Boolean, computed: '_compute_disabledAddColor(selectedColor.n, selectedColor.h, visible)' },
            disabledInput: { type: Boolean, computed: '_compute_disabledInput(disabled, searchProgress)' },
            searching: { type: Object, value: { lookup : false, newcolor: false } },
            searchProgress: { type: Boolean, computed: '_compute_searchProgress(searching.lookup, searching.newcolor)' },

            dialognew: { type: Object },
            search: { type: String },

            colors: { type: Array, notify: true, value: [] },
            colorSelected: { type: Object, notify: true, value: null },
        }
    }

    static get observers()
    {
        return [
            '_selectedColorChanged(selectedColor.n)',
            '_monitorSearch(search)',
            '_monitorVisibility(visible)',
            'spotLimitChanged(spotLimit)',
        ]
    }
    _log() { console.log('tmladmin-ui-color-input-picker', ...arguments) }


    get colorPantonePicker() { return this.$['colorPantonePicker'] as UIPantoneColorPicker }
    get newColorBtn() { return this.$['newColorBtn'] as HTMLElement }
    get inputEl() { return this.$['inputEl'] as HTMLInputElement }
    
    
    //#region Vars

    _colorDebouncer: Debouncer
    _closeDebouncer: Debouncer
    showNewPopup: boolean
    _blocksearch: boolean = false
    websiteUrl: string
    search: string
    selectedColor: any
    dialognew: any
    _colorcreate: NetBase
    limit: number
    // spotLimit: string
    parentTapHandler: any
    colors: any

    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.parentTapHandler = (e) => 
        {
            var epath = e.path || e.composedPath()
            var el = epath ? epath.filter(i => {  return i?.nodeName == UIAdminColorInputPicker.is.toUpperCase() }) : []
            if (el?.length == 0 || (el?.length > 0 && el[0] != this))
            {
                this._clearColorSuggestionList()
            }
        }
        document.addEventListener('tap', this.parentTapHandler, EventPassiveDefault.optionPrepare())
    }

    disconnectedCallback()
    {
        if (this.parentTapHandler) { document.removeEventListener('tap', this.parentTapHandler) }
        super.disconnectedCallback()
    }

    _hide_colorsPantonePalette(colorsPantonePalette)
    {
        return !(Array.isArray(colorsPantonePalette) && colorsPantonePalette.length > 0)
    }

    _blockselcol = false
    _selectedColorChanged(selectedColor_n)
    {
        if (this._blockselcol || this.search == selectedColor_n) { return }

        this._blocksearch = true
        this.search = selectedColor_n
        this._blocksearch = false
    }

    _compute_selectedColorText(name, hex)
    {
        return (name && hex) ? `${name} (#${hex})` : ''
    }
    
    _compute_disabledAddColor(name, hex, visible)
    {
        return !(name && hex)
    }

    _compute_disabledInput(disabled, searchProgress)
    {
        return disabled || searchProgress
    }

    _compute_searchProgress(lookup, newcolor)
    {
        // console.log(lookup, newcolor)
        return lookup || newcolor
    }

    onInputChanged(e)
    {
        //
    }

    spotLimitChanged(spotLimit)
    {
        try
        {
            this.limit = parseInt(spotLimit)
        }
        catch
        {
            //
        }
    }

    _addColorTap(e)
    {
        this._clearColorSuggestionList()

        this.dispatchEvent(new CustomEvent('tmladmin-ui-color-input-picker-add', { bubbles: true, composed: true, detail: { 
            color: this.selectedColor,
            target: e.target,
        } }))

        this.selectedColor = Object.assign({}, NEWCOLOR)
        this.notifyPath('selectedColor.h')
    }

    onNewColorTap(e)
    {
        this._clearColorSuggestionList()

        var coli = Object.assign({}, this.selectedColor ? this.selectedColor : NEWCOLOR)
        if (this.selectedColor?.n)
        {
            coli.n = this.selectedColor.n + ' [non-spot]'
        }

        var dialognew = this.$.dialognew as UIAdminDialog
        if (dialognew && coli)
        {
            this.set('dialognew', { 
                color: coli,
            })
            dialognew.open()
        }
        
        e.preventDefault()
        return false
    }

    async onApplyColorTap(e)
    {
        var apiurl = StringUtil.urlquery(`${this.websiteUrl}/admin/api/color/color-create`, {})
        if (!this._colorcreate) { this._colorcreate = new NetBase() }
        this.set('searching.newcolor', true)
        
        var obj = {}
        for (var k of Object.keys(NEWCOLOR))
        {
            obj[k] = this.dialognew.color[k]
        }

        var r = await this._colorcreate._apiRequest(apiurl, obj, 'POST') as APIResponseModel | null
        this.set('searching.newcolor', false)

        var uidialognew = this.$.dialognew as UIAdminDialog
        if (r?.success && r?.result)
        {
            this.selectedColor = r.result
            this.notifyPath('selectedColor.h')
            if (uidialognew) { uidialognew.close() }
        }
        else if (r?.summary?.Key == 'validation_fail' && r?.details)
        {
            var notvalid = {}
            for (var errd of r.details)
            {
                if (errd?.Key)
                {
                    notvalid[errd?.Key] = errd.Message
                }
            }
            this.set('dialognew.color.notvalid', notvalid)
        }
    }
    
    onPantoneColorTap(e)
    {
        this._colorDebouncer = Debouncer.debounce(this._colorDebouncer, microTask, () =>
        {
            var picker: any = this.colorPantonePicker
            if (!(picker instanceof UIPantoneColorPicker)) { return }
            if (picker.opened) { return }
            picker.noCancelOnOutsideClick = true
            this.dispatchEvent(new CustomEvent('api-suppress-autoreload', { bubbles: true, composed: true, detail: { autoreload: false } }))
            picker.open()
            this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(150),
                () => { picker.noCancelOnOutsideClick = false })
        })

    }

    _onColorItemTap(e)
    {
        var colori = e?.target?.__dataHost?.__data?.colori
        this.selectedColor = colori
        this.notifyPath('selectedColor.h')

        this._clearColorSuggestionList()
    }

    _clearColorSuggestionList()
    {
        if (this.colors?.length > 0)
        {
            this.set('colors', [])
        }
        this.set('colorSelected', null)
    }

    _lastvisible = false
    _netbaseCombo: NetBase
    _monitorVisibility(visible)
    {
        if (this._lastvisible && !visible)
        {
            if (this._netbaseCombo) { this._netbaseCombo._getResourceCancel }
            this.search = ''
        }
        this._lastvisible = visible
    }

    _searchDebouncer: Debouncer
    _monitorSearch(search)
    {
        if (this._blocksearch) { return }
        if (!search)
        {
            this.set('colors', [])
            this.set('colorSelected', null)
            if (this._searchDebouncer) { this._searchDebouncer.cancel() }
            return //EXIT!!!
        }


        var apiurl = StringUtil.urlquery(`${this.websiteUrl}/admin/api/color/get-items`, {})
        var coloridTest = /b(?<id>[0-9]{1,})/gm
        var filters = [{ path: 'n', value: search }]
        if (search)
        {
            var coloridm = coloridTest.exec(search)
            if (coloridm && coloridm[0] == coloridm?.input)
            {
                filters = [{ path: 'i', value: `b${coloridm?.groups?.id}` }]
            }
        }
        
        this._blockselcol = true
        this.selectedColor = null
        this._blockselcol = false

        var apiobj = {
            "pn": 0,
            "ps": 25,
            "pt": "",
            "tz": -420,
            "filters": JSON.stringify(filters),
        }

        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(950), async () => 
        {
            if (!this._netbaseCombo) { this._netbaseCombo = new NetBase() }

            this.set('searching.lookup', true)
            var r: any = await this._netbaseCombo._apiRequest(apiurl, apiobj, 'POST')
            this.set('searching.lookup', false)
            if (r?.success && r?.result)
            {
                var res = r.result
                var colors = res.content
                if (Array.isArray(colors) && colors.length > this.limit) { colors = colors.slice(0, this.limit) }
                this.set('colors', colors)
                this.set('colorSelected', null)
                this.async(()=> { this.inputEl.focus() }, 17)
            }
        })
    }
}
