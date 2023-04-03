import { html } from '@polymer/polymer/polymer-element'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import view from './ui-validation-summary.ts.html'
import style from './ui-validation-summary.ts.css'



@CustomElement
export class UIValidationSummary extends UIBase
{
    static get is() { return 'teamatical-ui-validation-summary' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            errorMessage: { type: String },
            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }
}