import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'

import { FragmentBase, FragmentStatic } from './fragment-base'
import view from './h503.ts.html'
import style from './h503.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import { CustomElement } from '../utils/CommonUtils'


@FragmentStatic
export class h503 extends FragmentBase
{
    static get is() { return 'teamatical-h503' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            offline: { type: Boolean, value: false, observer: '_offlineChanged' },
            visible: { type: Boolean, observer: '_visibleChanged' },
        }
    }

    isAttached: any = false
    

    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true
    }

    _offlineChanged(offline)
    {
        if (!offline && this.isAttached) 
        {
            this._reloadWindowLocation()
        }
    }

    _tryReconnect()
    {
        console.log('...')
        //this._reloadWindowLocation()
    }

    _visibleChanged(visible, o)
    {
        if (!visible) { return }

        this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
            title: this.localize('h503-title-document') 
        } }))
    }

}
