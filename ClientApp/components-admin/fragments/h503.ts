import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'

import { FragmentBase, FragmentStatic } from './fragment-base'
import view from './h503.ts.html'
import style from './h503.ts.css'
import '../shared-styles/common-styles'
import '../assets'
import '../../components/ui/ui-button'
import '../../components/ui/ui-network-warning'


@FragmentStatic
export class h503 extends FragmentBase
{
    static get is() { return 'tmladmin-h503' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

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

    _reloadPage()
    {
        this._reloadWindowLocation()
    }

    _tryReconnect()
    {
        // this._reloadWindowLocation()
    }

}
