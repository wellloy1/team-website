import '@polymer/iron-flex-layout/iron-flex-layout.js'
import { IronSelectableBehavior } from '@polymer/iron-selector/iron-selectable.js'
import { html } from '@polymer/polymer/polymer-element'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'

import { UIBase } from '../ui/ui-base'
import view from './ui-submenu-list.ts.html'
import style from './ui-submenu-list.ts.css'
const UISubmenuListBase = mixinBehaviors([IronSelectableBehavior], UIBase) as new () => UIBase & IronSelectableBehavior
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class UISubmenuList extends UISubmenuListBase
{
    static get is() { return 'teamatical-ui-submenu-list' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            selected: { type: String },
        }
    }

    static get observers() 
    {
        return [
            //'_onSelectedItemChanged(selectedItem, selected)'
        ]
    }

    attached()
    {
        super.attached()
        this._removeListener(this.activateEvent)
    }

    // _onSelectedItemChanged(selectedItem, selected) 
    // {
    //     console.log(selectedItem)
    //     if (selectedItem === undefined && this.selected) return
    //     this.$.overlay.target = selectedItem
    // }
}