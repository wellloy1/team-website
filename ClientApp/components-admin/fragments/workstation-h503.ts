import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'

import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import view from './workstation-h503.ts.html'
import style from './workstation-h503.ts.css'
import '../shared-styles/common-styles'
import '../assets'
import '../../components/ui/ui-button'
import '../../components/ui/ui-network-warning'


@WorkstationDynamic
export class workstationh503 extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-h503' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            offline: { type: Boolean, value: false, observer: '_offlineChanged' },
            visible: { type: Boolean, observer: '_visibleChanged' },

            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },
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

    _reloadPage()
    {
        this._reloadWindowLocation()
    }

    _tryReconnect()
    {
        // this._reloadWindowLocation()
    }

}
