import '../ui/ui-loader'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import view from './admin.ts.html'
import style from './admin.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
export class Admin extends FragmentBase
{
    static get is() { return 'teamatical-admin' }

    static get template() { return html([`<style include="">${style}</style>${view}`])}


    static get properties()
    {
        return {
            offline: { type: Boolean },
            visible: { type: Boolean, observer: '_visibleChanged' },
            websiteUrl: { type: String },

            userInfo: { type: Object },
        }
    }

    static get observers()
    {
        return [
            '_pageIsChanged(visible, userInfo)'
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()

        // admin pages are in different area, to get there we need to reload page from server ...
        this._reloadWindowLocation()
    }

    _pageIsChanged(visible, userInfo)
    {
        if (visible !== true || userInfo === undefined) { return }
    }

    _visibleChanged(visible, o)
    {
        if (!visible) { return }

        this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
            title: this.localize('admin-title-document') 
        } }))
    }
}