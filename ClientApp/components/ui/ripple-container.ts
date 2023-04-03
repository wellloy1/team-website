import { PaperRippleBehavior } from '@polymer/paper-behaviors/paper-ripple-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'

import { UIBase } from '../ui/ui-base'
import view from './ripple-container.ts.html'
import style from './ripple-container.ts.css'
const RippleContainerBase = mixinBehaviors([PaperRippleBehavior], UIBase) as new () => UIBase & PaperRippleBehavior
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class RippleContainer extends RippleContainerBase
{
    static get is() { return 'teamatical-ripple-container' }
    
    static get template() { return html([`<style>${style}</style>${view}`])}

    constructor()
    {
        super()
        this._isDown = false
    }

    ready()
    {
        super.ready()
        this.addEventListener('focus', (e) => this._onFocus(e), { capture: true })
        this.addEventListener('blur', (e) => this._onBlur(e), { capture: true })
        this.addEventListener('down', (e) => this._rippleDown(e))
        this.addEventListener('up', (e) => this._rippleUp(e))
    }

    _onFocus(event)
    {
        // Prevent second ripple when clicking causes both focus and down.
        if (!this._isDown)
        {
            this._rippleDown(event)
        }
    }

    _onBlur(event)
    {
        this._rippleUp(event)
    }

    _rippleDown(event)
    {
        this._isDown = true
        this.getRipple().downAction(event)
    }

    _rippleUp(event)
    {
        this._isDown = false
        this.getRipple().upAction(event)
    }

}