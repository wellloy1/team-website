import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
import { html } from '@polymer/polymer/polymer-element'
import { PaperButtonBehavior, PaperButtonBehaviorImpl } from '@polymer/paper-behaviors/paper-button-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'


import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import view from './ui-button.ts.html'
import style from './ui-button.ts.css'
const UIButtonBase = mixinBehaviors([PaperButtonBehavior], UIBase) as new () => UIBase & PaperButtonBehavior



@CustomElement
export class UIButton extends UIButtonBase
{
    static get is() { return 'teamatical-ui-button' }

    static get template() { return html([`<style include="paper-material-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            raised: { type: Boolean, reflectToAttribute: true, value: false, observer: '_calculateElevation' },
            disabled: { type: Boolean, reflectToAttribute: true, observer: '_disabledChanged2', },
            responsive: { type: Boolean, reflectToAttribute: true },
            responsiveHide: { type: Boolean, reflectToAttribute: true },
            mobileScreen: { type: Boolean },

            href: { type: String },
            _href: { type: String, computed: '_computeHref(href, disabled)' },
            _rel: { type: String, computed: '_computeRel(href, disabled)' },

            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
        }
    }

    href: any
    disabled: any
    raised: any
    responsive: any
    mobileScreen: any
    _setElevation: any

    constructor()
    {
        super()
        this.addEventListener('tap', e => this._onTapHandler(e))
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    _computeRel(href, disabled)
    {
        const rel = "noreferrer nofollow"
        if (disabled || !href) { return rel }
        return null
    }

    _computeHref(href, disabled)
    {
        if (disabled) { return null }
        return href
    }

    _onTapHandler(e)
    {
        var ae = document.activeElement as HTMLElement
        if (e.detail && ae == this) { ae.blur() }

        if (this.disabled) 
        { 
            e.stopPropagation()
            e.stopImmediatePropagation()
            return
        }

        if (this.href) { this._goto(this.href) }
    }

    _disabledChanged2(disabled, old)
    {
        // console.log(disabled)
        // super._disabledChanged(disabled, old)
        if (this.responsive && this.mobileScreen) { this.style.pointerEvents = '' }
    }

    _calculateElevation()
    {
        if (!this.raised)
        {
            this._setElevation(0)
        } 
        else
        {
            PaperButtonBehaviorImpl._calculateElevation.apply(this)
        }
    }
}
