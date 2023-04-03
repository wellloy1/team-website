import '@polymer/iron-flex-layout/iron-flex-layout.js'
import { IronSelectableBehavior } from '@polymer/iron-selector/iron-selectable.js'
import { IronResizableBehavior} from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import view from '../ui/tabs.ts.html'
import style from '../ui/tabs.ts.css'
import { TabsOverlay } from '../ui/tabs-overlay'
const TabsBase = mixinBehaviors([IronResizableBehavior, IronSelectableBehavior], UIBase) as new () => UIBase & IronResizableBehavior & IronSelectableBehavior


@CustomElement
export class Tabs extends TabsBase
{
    static get is() { return 'teamatical-tabs' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            selected: { type: String },
            centered: { type: Boolean, value: true, reflectToAttribute: true },
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
        }
    }

    static get observers() 
    {
        return [
            '_onSelectedItemChanged(selectedItem, selected)'
        ]
    }

    uitabs: any
    centered: boolean
    _tabDebouncer: any
    _observer: any

    get overlay() { return this.$['overlay'] as TabsOverlay }
    get container() { return this.$['container'] }


    connectedCallback()
    {
        super.connectedCallback()

        this._observer = new FlattenedNodesObserver(this.container, (info) => this._onDOMchanged(info))

        this.addEventListener("iron-select", (e) => this._onItemSelected(e), EventPassiveDefault.optionPrepare())
        this.addEventListener("iron-deselect", (e) => this._onItemDeSelected(e), EventPassiveDefault.optionPrepare())
        this.addEventListener('iron-resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        this._onResized()
    }

    _onResized(e?)
    {
        let r = this.getBoundingClientRect()
        let c = this.$.container.getBoundingClientRect()
        // console.log(e, r, c)
        this.centered = r.width > c.width || r.width === 0 || c.width === 0
    }

    _onDOMchanged(info)
    {
        var nodesAdded = info.addedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.tagName == 'TEAMATICAL-TAB') })
        var nodesRemoved = info.removedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.tagName == 'TEAMATICAL-TAB') })

        if (!this.uitabs) { this.uitabs = [] }
        this.uitabs = this.uitabs.concat(nodesAdded)
        for (var i in nodesRemoved)
        {
            var inx = this.uitabs.indexOf(nodesRemoved[i])
            this.uitabs.splice(inx, 1)
        }

        this.overlay?.reset()
        this._onItemSelected({ detail: { item: this.selectedItem } })
    }

    _onItemSelected(e)
    {
        var tab = e.detail.item
        this._tabDebouncer = Debouncer.debounce(this._tabDebouncer, timeOut.after(50), () =>
        {
            if (this.overlay) { this.overlay.target = tab }
        })
    }

    _onItemDeSelected(e)
    {
        var tab = e.detail.item
        this._onItemSelected({ detail: { item: null } })
    }

    _onSelectedItemChanged(selectedItem, selected) 
    {
        // console.log(selected)
        if (selectedItem === undefined || selected === undefined) return

        this._onItemSelected({ detail: { item: selectedItem } })
    }
}