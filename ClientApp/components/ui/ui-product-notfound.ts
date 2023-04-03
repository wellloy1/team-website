import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'

import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-button'
import view from './ui-product-notfound.ts.html'
import style from './ui-product-notfound.ts.css'


@CustomElement
export class UIProductNotfound extends UIBase
{
    static get is() { return 'teamatical-ui-product-notfound' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
        }
    }

    _getMore()
    {
        this._gotoRoot()
    }
}
