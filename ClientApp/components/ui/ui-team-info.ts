import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'

import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import { UIPantoneColorPicker } from '../ui/ui-pantone-color-picker'
import '../ui/ui-color-picker'
import '../ui/ui-pantone-color-picker'
import '../ui/ui-select'
import '../shared-styles/tooltip-styles'
import view from './ui-team-info.ts.html'
import style from './ui-team-info.ts.css'
import { TeamInfoModel } from '../dal/team-info-model'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UITeamInfo extends UIBase
{
    static get is() { return 'teamatical-ui-team-info' }

    static get template() { return html([`<style include="teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            customizationType: { type: String },
            teamInfo: { type: Object, observer: '_teamInfoAssigned', },
            colorsPantonePalette: { type: Array, },
            colorsSwatchPalette: { type: Array, },
            sportsList: { type: Array, },
            loading: { type: Boolean },
            isPantonePicker: { type: Boolean, reflectToAttribute: true },

            _shouldRenderSwPalette: { type: Boolean, computed: '_shouldRenderSwPaletteCompute(colorsSwatchPalette)' },
            _shouldRenderSports: { type: Boolean, computed: '_shouldRenderSportsCompute(sportsList)' },

            notTeamName1: { type: Boolean, notify: true, computed: '_computeNotTeamName1(teamInfo.*, customizationType)' },
            notTeamName2: { type: Boolean, notify: true, computed: '_computeNotTeamName2(teamInfo.*, customizationType)' },
            notTeamName3: { type: Boolean, notify: true, computed: '_computeNotTeamName3(teamInfo.*, customizationType)' },
            notTeamName4: { type: Boolean, notify: true, computed: '_computeNotTeamName4(teamInfo.*, customizationType)' },
            notColor1: { type: Boolean, notify: true, computed: '_computeNotColor1(teamInfo.*, customizationType)' },
            notColor2: { type: Boolean, notify: true, computed: '_computeNotColor2(teamInfo.*, customizationType)' },
            notColor3: { type: Boolean, notify: true, computed: '_computeNotColor3(teamInfo.*, customizationType)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    _colorDebouncer: any
    _closeDebouncer: any
    customizationType: string
    teamInfo: TeamInfoModel

    get colorPicker1() { return this.shadowRoot ? this.shadowRoot.querySelector('#colorPicker1') : null }
    get colorPicker2() { return this.shadowRoot ? this.shadowRoot.querySelector('#colorPicker2') : null }
    get colorPicker3() { return this.shadowRoot ? this.shadowRoot.querySelector('#colorPicker3') : null }
    get swatchPicker1() { return this.shadowRoot ? this.shadowRoot.querySelector('#swatchPicker1') : null }
    get swatchPicker2() { return this.shadowRoot ? this.shadowRoot.querySelector('#swatchPicker2') : null }
    get swatchPicker3() { return this.shadowRoot ? this.shadowRoot.querySelector('#swatchPicker3') : null }


    connectedCallback()
    {
        super.connectedCallback()

        this.dispatchEvent(new CustomEvent('api-load-colors', { bubbles: true, composed: true, detail: { customizationType: this.customizationType } }))

        document.addEventListener("keydown", (e) => this.onKeydown(e))
    }


    onPantoneColor1(e)
    {
        this._colorHandler(this.colorPicker1)
    }

    onPantoneColor2(e)
    {
        this._colorHandler(this.colorPicker2)
    }

    onPantoneColor3(e)
    {
        this._colorHandler(this.colorPicker3)
    }

    onInputChanged(e)
    {
        this._onInputChanged(e, 'teamInfo')
    }

    _teamInfoAssigned(teamInfo)
    {
        // console.log(teamInfo)
    }

    _shouldRenderSwPaletteCompute(colorsSwatchPalette)
    {
        return Array.isArray(colorsSwatchPalette)
    }

    _shouldRenderSportsCompute(sportsList)
    {
        return Array.isArray(sportsList)
    }

    _convertSwColor(hex)
    {
        return 'color:#' + hex + ';' +
            'fill:#' + hex + ';'
    }

    _colorHandler(picker)
    {
        this._colorDebouncer = Debouncer.debounce(this._colorDebouncer, microTask, () =>
        {
            if (!(picker instanceof UIPantoneColorPicker)) { return }
            if (picker.opened) { return }
            picker.noCancelOnOutsideClick = true
            picker.open()
            this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(150),
                () => { picker.noCancelOnOutsideClick = false })
        })
    }


    _computeNotTeamName1(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotTeamName1 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotTeamName2(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotTeamName2 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotTeamName3(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotTeamName3 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotTeamName4(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotTeamName4 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotColor1(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotColor1 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotColor2(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotColor2 : false
        // console.log(teamInfoP, customizationType)
        return v
    }

    _computeNotColor3(teamInfoP, customizationType)
    {
        var v = this.teamInfo && customizationType == 'player' ? this.teamInfo.NotColor3 : false
        // console.log(teamInfoP, customizationType)
        return v
    }


    onKeydown(e)
    {
        e = e || window.event

        var f: HTMLElement | null = null
        var fe = this.root ? this.root.querySelectorAll('paper-input') : []
        for (var fi of [...fe])
        {
            if (fi.getAttribute("focused") !== null) { f = fi }
        }
        if (f !== null && (!e.ctrlKey && !e.altKey && !e.shiftKey && (keyboardEventMatchesKeys(e, 'enter') || keyboardEventMatchesKeys(e, 'space'))))
        {
            var ii = f.querySelector('iron-icon')
            if (ii)
            {
                ii.click()
                if (e?.stopPropagation) { e.stopPropagation() }
                if (e?.preventDefault) { e.preventDefault() }
                return false
            }
        }
    }

}