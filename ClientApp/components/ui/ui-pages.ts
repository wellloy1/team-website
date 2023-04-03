import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronSelectableBehavior } from '@polymer/iron-selector/iron-selectable.js';
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { ArraySelector } from '@polymer/polymer/lib/elements/array-selector.js'
import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
// import '../ui/ui-image'
// import '../ui/ui-sortable-list'
import '../shared-styles/common-styles'
// import view from './ui-pages.ts.html'
// import style from './ui-pages.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIPagesBase = mixinBehaviors([IronResizableBehavior, IronSelectableBehavior], UIBase) as new () => UIBase & IronResizableBehavior & IronSelectableBehavior
// LegacyElementMixin, HTMLElement


@CustomElement
export class UIPages extends UIPagesBase
{
    static get is() { return 'teamatical-ui-pages' }
    
    static get template() { return html([`<style> :host { display: block; } :host > ::slotted(:not(slot):not(.iron-selected)) { display: none !important; }</style><slot></slot>`]) }

    static get properties()
    {
        return {
            activateEvent: {type: String, value: null}
        }
    }

    static get observers()
    {
        return [
            '_selectedPageChanged(selected)'
        ]
    }
    // selected: any

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }
    
    _selectedPageChanged(selected, old) 
    {
        this.async(this.notifyResize)
    }

    // _selectSelected(selected) 
    // {
    //     console.log(this.items)
    //     super._selectSelected(selected)
    // }
    
}
