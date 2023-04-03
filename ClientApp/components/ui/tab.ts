import '@polymer/iron-flex-layout/iron-flex-layout.js'
import { html } from '@polymer/polymer/polymer-element'

import { UIBase } from '../ui/ui-base'
import '../ui/ripple-container'
import view from './tab.ts.html'
import style from './tab.ts.css'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class Tab extends UIBase
{
    static get is() { return 'teamatical-tab' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            name: { type: String, reflectToAttribute: true },
        }
    }
}