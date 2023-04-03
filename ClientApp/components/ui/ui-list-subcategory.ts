import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronScrollTargetBehavior } from '@polymer/iron-scroll-target-behavior/iron-scroll-target-behavior.js';
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-list-carousel'
import '../ui/paper-expansion-panel.ts'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-list-subcategory.ts.html'
import style from './ui-list-subcategory.ts.css'
import { PaperExpansionPanel } from './paper-expansion-panel'
import { UIListCarousel } from './ui-list-carousel'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIDesignSelectorBase = mixinBehaviors([IronResizableBehavior, IronScrollTargetBehavior], UIBase) as new () => UIBase & IronResizableBehavior & IronScrollTargetBehavior


@CustomElement
export class UIListSubcategory extends UIDesignSelectorBase
{
    static get is() { return 'teamatical-ui-list-subcategory' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}


    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true },
            smallScreen: { type: Object },
            subcategoryTitle: { type: String },
            subcategoryItems: { type: Array },
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
            focused: { type: Boolean, value: false, reflectToAttribute: true },

            noCollapsible: { type: Boolean, value: false, reflectToAttribute: true },

            
            itemsCache: {type: Array },
            opened: { type: Boolean, value: true },
        }
    }

    static get observers()
    {
        return [
            // '_log(focused)',
        ]
    }

    opened: any
    focused: boolean

    get panel() { return this.$['panel'] as PaperExpansionPanel }
    get plist() { return this.$['list'] as UIListCarousel }

    _log(v) {  console.log(v) }

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        this.addEventListener('transitionend', (e) => this._onTransitionEnd(e), EventPassiveDefault.optionPrepare())
        this.panel.addEventListener('toggle-transitionend', (e) => this._onTransitionEnd(e), EventPassiveDefault.optionPrepare())
        // this.addEventListener('focused-changed', (e: any) => { 
        //     this.set('focused', e.detail.focused) 
        //     e.stopPropagation()
        // })
    }

    localizeTitle(name)
    {
        var title = this.localize(name)
        return title
    }

    _onTransitionEnd(e)
    {
        if (!e.detail || e.detail && e.detail.opened)
        {
            this.plist.dispatchEvent(new CustomEvent('iron-resize', { detail: { transitionend: e }, bubbles: true, composed: true }))
        }
    }

    _onToggleExpansionPanel(e)
    {
        this.opened = e.detail.opened
        this.dispatchEvent(new CustomEvent('toggle', { detail: { } }))

        e.preventDefault()
        e.stopPropagation()
    }
}
