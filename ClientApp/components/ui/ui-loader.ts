import { html } from '@polymer/polymer/polymer-element'

import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import view from './ui-loader.ts.html'
import style from './ui-loader.ts.css'


@CustomElement
export class UILoader extends UIBase
{
    static get is() { return 'teamatical-ui-loader' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            loadingMsg: { type: String },
        }
    }

    loadingMsg: string

    constructor()
    {
        super()

        this.loadingMsg = this.localize('app-connecting')
    }
}
