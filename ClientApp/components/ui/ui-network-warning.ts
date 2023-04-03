import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import { UIBase } from '../ui/ui-base'

import { CustomElement } from '../utils/CommonUtils'
import '../ui/ui-button'
import view from './ui-network-warning.ts.html'
import style from './ui-network-warning.ts.css'


@CustomElement
export class UINetworkWarning extends UIBase
{
    static get is() { return 'teamatical-ui-network-warning' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            offline: Boolean
        }
    }

    _tryReconnect()
    {
        this.dispatchEvent(new CustomEvent('try-reconnect', { composed: true }))
    }
}