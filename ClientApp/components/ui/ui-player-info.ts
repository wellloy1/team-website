import '@polymer/paper-input/paper-input.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-select'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-player-info.ts.html'
import style from './ui-player-info.ts.css'

const UIPlayerInfoBase = mixinBehaviors([], UIBase) as new () => UIBase
const SESSION_PLAYERINFONAMEMIXED = 'player-info-name-mixed'

@CustomElement
export class UIPlayerInfo extends UIPlayerInfoBase
{
    static get is() { return 'teamatical-ui-player-info' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            customizationType: { type: String },
            playerInfo: { type: Object, },
            loading: { type: Boolean },

            playerNameUI: { type: String },
            playerNameSwitcher: { type: Boolean, value: true, notify: true, reflectToAttribute: true },
            playerNameUppercase: { type: Boolean, value: true, notify: true, reflectToAttribute: true },
            playerNameAnimation: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            

            notName: { type: Boolean, notify: true, computed: '_computeNotName(playerInfo.*, customizationType)' },
            notNumber: { type: Boolean, notify: true, computed: '_computeNotNumber(playerInfo.*, customizationType)' },
            notYear: { type: Boolean, notify: true, computed: '_computeNotYear(playerInfo.*, customizationType)' },
            notActivity: { type: Boolean, notify: true, computed: '_computeNotActivity(playerInfo.*, customizationType)' },
            notCaptain: { type: Boolean, notify: true, computed: '_computeNotCaptain(playerInfo.*, customizationType)' },

            _uppercaseSwitcherDisabled: { type: Boolean, notify: true, computed: '_compute_uppercaseSwitcherDisabled(playerNameSwitcher)' },
            _uppercaseSwitcherTooltip: { type: String, notify: true, computed: '_compute_uppercaseSwitcherTooltip(playerNameUppercase)' },

            activityOptions: { type: Array, }, // value: [{ "ID": "baseball", "Name": "Baseball" }, { "ID": "basketball", "Name": "Basketball" }, { "ID": "football", "Name": "Football" }, { "ID": "hockey", "Name": "Hockey" }, { "ID": "soccer", "Name": "Soccer" }, { "ID": "wrestling", "Name": "Wrestling" }, { "ID": "other", "Name": "Other" }]
            captainOptions: { type: Array, }, //value: [{ ID: '', Name: 'None' }, { ID: 'C', Name: 'C' }, { ID: 'K', Name: 'K' }]
        }
    }

    static get observers()
    {
        return [
            '_playerNameChanged(playerInfo.PlayerName)',
            '_focus2Input(playerInfo.notvalid.*)',
            // '_log(playerInfo.*)',
        ]
    }
    _log(playerInfoP) { console.log(UIPlayerInfo.is, playerInfoP) }


    get number() { return this.$['number'] }
    get name() { return this.$['name'] }

    playerInfo: any
    playerNameUI: string
    playerNameUppercase: boolean
    _lockPlayerName: boolean
    playerNameAnimationDebouncer: Debouncer
    playerNameAnimation: boolean
    playerNameByModelDebouncer: Debouncer


    connectedCallback()
    {
        super.connectedCallback()
        
        if (sessionStorage) 
        {
            let playerNameMixed = sessionStorage.getItem(SESSION_PLAYERINFONAMEMIXED)
            this.playerNameUppercase = (playerNameMixed !== 'true')
        }
    }

    onInputChanged(e)
    {
        this._onInputChanged(e, 'playerInfo')
    }

    _playerNameChanged(playerName)
    {
        if (this._lockPlayerName) { return }
        //set back if it was converted
        this.playerNameByModelDebouncer = Debouncer.debounce(this.playerNameByModelDebouncer, timeOut.after(150), () =>
        {
            this._lockPlayerName = true
            playerName = this._setDataPlayerName(playerName)
            this._lockPlayerName = false
        })

        if (this.playerNameUI && playerName && this.playerNameUI.toLocaleUpperCase() == playerName.toLocaleUpperCase()) { return } //if its not empty - we think it is sync with data object...¯\_(ツ)_/¯
        this.set('playerNameUI', playerName)

    }

    onInputPlayerName(e)
    {
        var val = e.target.value
        this._setDataPlayerName(val)
    }

    _focus2Input(v)
    {
        if (v.value === undefined) { return }
        for (var i in v.value)
        {
            var pi: any = null
            try { pi = this.shadowRoot ? this.shadowRoot.querySelector('[name=' + i + ']') : null } catch { }
            if (pi) { this._focusAndScroll(pi, -60) }
            break
        }
    }

    _setDataPlayerName(val)
    {
        if (this.playerNameUppercase && val)
        {
            let upperVal = val.toLocaleUpperCase(this.localizeLang)
            if (val != upperVal)
            {
                val = upperVal
            }
        }
        this.set('playerInfo.PlayerName', val)
        return val
    }

    _makeUppercaseTap(e)
    {
        this.playerNameUppercase = !this.playerNameUppercase
        this.playerNameAnimation = true
        this.playerNameAnimationDebouncer = Debouncer.debounce(this.playerNameAnimationDebouncer, timeOut.after(300), () =>
        {
            this.playerNameAnimation = false
        })
        if (sessionStorage) { sessionStorage.setItem(SESSION_PLAYERINFONAMEMIXED, (!this.playerNameUppercase).toString()) }

        this.onInputPlayerName({ target: { value: this.playerNameUI } })
    }

    _compute_uppercaseSwitcherDisabled(playerNameSwitcher)
    {
        return !playerNameSwitcher
    }
    
    _compute_uppercaseSwitcherTooltip(playerNameUppercase)
    {
        let v = playerNameUppercase
        return this.localize(v ? 'playerinfo-uppercase-warning' : 'playerinfo-mixed-warning')
    }

    _computeNotName(playerInfoP, customizationType)
    {
        var v = this.playerInfo && customizationType == 'player' ? this.playerInfo.NotPlayerName : false
        // console.log(playerInfoP, customizationType)
        return v
    }

    _computeNotNumber(playerInfoP, customizationType)
    {
        var v = this.playerInfo && customizationType == 'player' ? this.playerInfo.NotPlayerNumber : false
        // console.log(playerInfoP, customizationType)
        return v
    }

    _computeNotYear(playerInfoP, customizationType)
    {
        var v = this.playerInfo && customizationType == 'player' ? this.playerInfo.NotPlayerYear : false
        // console.log(playerInfoP, customizationType)
        return v
    }

    _computeNotActivity(playerInfoP, customizationType)
    {
        var v = this.playerInfo && customizationType == 'player' ? this.playerInfo.NotPlayerActivity : false
        return v
    }

    _computeNotCaptain(playerInfoP, customizationType)
    {
        var v = this.playerInfo && customizationType == 'player' ? this.playerInfo.NotPlayerCaptain : false
        return v
    }

}