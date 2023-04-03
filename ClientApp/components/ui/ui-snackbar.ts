import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js'

import { UIBase } from './ui-base'
import view from './ui-snackbar.ts.html'
import style from './ui-snackbar.ts.css'
const UISnackbarBase = mixinBehaviors([GestureEventListeners], UIBase) as new () => UIBase & GestureEventListeners
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class UISnackbar extends UISnackbarBase
{
    static get is() { return 'teamatical-ui-snackbar' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            opened: { type: Boolean, reflectToAttribute: true },
            strong: { type: Boolean, reflectToAttribute: true, observer: '_strongChanged', },
            timeout: { type: Number, value: 4000 },
        }
    }

    _closeDebouncer: Debouncer
    strong: boolean
    opened: boolean
    timeout: number
    _openedTime: number
    handleTapBind: any

    
    constructor()
    {
        super()

        this.handleTapBind = this.handleTap.bind(this)
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
        
        if (this.handleTapBind) 
        { 
            Gestures.removeListener(document, 'tap', this.handleTapBind) 
            Gestures.removeListener(this.shadowRoot, 'tap', this.handleTapBind) 
        }
    }

    _strongChanged(v, o)
    {
        // console.log('_strongChanged', o, ' --- >', v)
        if (this.handleTapBind) 
        {
            Gestures.removeListener(document, 'tap', this.handleTapBind)
            Gestures.removeListener(this.shadowRoot, 'tap', this.handleTapBind)
        }
        if (this.strong)
        {
            Gestures.addListener(this.shadowRoot, 'tap', this.handleTapBind)
        }
        else
        {
            Gestures.addListener(document, 'tap', this.handleTapBind)
        }
    }

    handleTap(e)
    {
        if (!this.opened || (this._now() - this._openedTime) < 350) { return }

        this.close()
    }

    open()
    {
        flush()

        if (!this.offsetHeight) { return }

        this.opened = true
        this._openedTime = this._now()

        if (this.strong) { return } //no timeout

        if (this._closeDebouncer) { this._closeDebouncer.cancel() }
        this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(this.timeout), () =>
        {
            this.close()
        })
    }

    close()
    {
        this.dispatchEvent(new CustomEvent('api-ui-snackbar-closed', { bubbles: true, composed: true, detail: { _inst: this } }))
        this.opened = false
    }
    
}
