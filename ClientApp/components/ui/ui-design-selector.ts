import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronScrollTargetBehavior } from '@polymer/iron-scroll-target-behavior/iron-scroll-target-behavior.js';

import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-image'
import '../ui/ui-loader'
import '../ui/ui-carousel'
import '../ui/ui-wizard-sortable'
import '../ui/paper-expansion-panel.ts'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-design-selector.ts.html'
import style from './ui-design-selector.ts.css'
import { UICarousel } from './ui-carousel'
import { UIWizardSortable } from '../ui/ui-wizard-sortable'
import { PaperFabElement } from '@polymer/paper-fab/paper-fab.js'
import { PaperExpansionPanel } from './paper-expansion-panel'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIDesignSelectorBase = mixinBehaviors([IronResizableBehavior, IronScrollTargetBehavior], UIBase) as new () => UIBase & IronResizableBehavior & IronScrollTargetBehavior


@CustomElement
export class UIDesignSelector extends UIDesignSelectorBase
{
    static get is() { return 'teamatical-ui-design-selector' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}


    static get properties()
    {
        return {
            productId: { type: String, observer: '_productIdChanged' },
            selectorId: { type: String, observer: '_selectorIdChanged' }, //selector-id
            selectorTitle: { type: String }, //selector-title
            selectorOptions: { type: Array, notify: true, }, //selector-options
            selectorGroup: { type: String },
            isSwap: { type: Boolean, value: false, notify: true },
            isSwapAllow: { type: String, notify: true },
            isSwapHidden: { type: Boolean, computed: '_isSwapAllowComputed(isSwapAllow)' },
            opened: { type: String, notify: true, observer: '_openedChanged' },
            visible: { type: Boolean},
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
            focused: { type: Boolean, value: false, reflectToAttribute: true },
            designSelectors: { type: Object, notify: true, value: {}, observer: '_designSelectorsChanged' },

            smallScreen: { type: Object },
            customizationType: { type: String, },
            visibleWizard: { type: Boolean, computed: '_visibleWizardCompute(visible, showWizard)' },
            visibleSelector: { type: Boolean, computed: '_visibleSelectorCompute(visible, showCarousel)' },
            
            showCarousel: { type: Boolean, computed: '_showCarouselCompute(customizationType)' },
            showWizard: { type: Boolean, computed: '_showWizardCompute(customizationType)' },
            showCarousel_Delayed: { type: Boolean },
            showWizard_Delayed: { type: Boolean },

            wizardEditing: { type: Boolean, computed: '_wizardEditingCompute(showWizard, wizardReadonly)' },
            wizardReadonly: { type: Boolean, value: false, reflectToAttribute: true },
            wizardPanelSize: { type: Number, value: 361 },
            wizardPanelSizeDesktop: { type: Number, value: 361 },
            wizardPanelSizeMobile: { type: Number, value: 192 },
        }
    }

    visible: boolean
    opened: any
    isSwap: any
    wizardPanelSize: any
    wizardPanelSizeDesktop: any
    wizardPanelSizeMobile: any
    designSelectors: any
    selectorId: string
    selectorTitle: string
    _showWizardDebouncer: Debouncer
    _showCarouselDebouncer: Debouncer
    showWizard_Delayed: boolean
    showCarousel_Delayed: boolean
    showCarousel: boolean
    showWizard: boolean

    static get observers()
    {
        return [
            '_screenObserver(smallScreen)',
            // '_log(focused)',
        ]
    }
    _log(v) { console.log(v) }

    get swap() { return this.$['swap'] as PaperFabElement }
    get panel() { return this.$['panel'] as PaperExpansionPanel }
    get plist() { return (this.shadowRoot ? this.shadowRoot.querySelector('#plist') : null) as UICarousel  }
    get wlist() { return (this.shadowRoot ? this.shadowRoot.querySelector('#wlist') : null) as UIWizardSortable }


    constructor()
    {
        super()
        this.opened = false
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        this.panel.addEventListener('toggle-transitionend', (e) => this._onTransitionEnd(e))
    }

    lazyLoad()
    {
        //
    }

    _onTransitionEnd(e)
    {
        // console.log(e)
        if (e.detail.opened)
        {
            if (this.showCarousel && this.plist)
            {
                this.plist.dispatchEvent(new CustomEvent('iron-resize', { detail: { transitionend: e }, bubbles: true, composed: true }))
            }

            if (this.showWizard && this.wlist) 
            {
                this.wlist.dispatchEvent(new CustomEvent('iron-resize', { detail: { transitionend: e }, bubbles: true, composed: true }))
            }
        }
    }

    _screenObserver(smallScreen)
    {
        this.wizardPanelSize = smallScreen ? this.wizardPanelSizeMobile : this.wizardPanelSizeDesktop
    }

    _imageUrl(item_ImageUrl, item_ImageUrlSwap, isSwap)
    {
        return (isSwap ? item_ImageUrlSwap : item_ImageUrl)
    }

    _productIdChanged(v, old)
    {
        if (v != old)
        {
            //refresh with newer product
            if (this.plist) { this.plist.reset() } 
            if (this.wlist) { this.wlist.reset() } 
        }
    }

    _visibleSelectorCompute(visible, showCarousel) 
    {
        return visible === true && showCarousel === true
    }

    _visibleWizardCompute(visible, showWizard) 
    {
        return visible === true && showWizard === true
    }

    _showCarouselCompute(customizationType)
    {
        var v = customizationType == 'coach'

        if (!v) 
        {
            this._showCarouselDebouncer = Debouncer.debounce(
                this._showCarouselDebouncer,
                timeOut.after(1300),
                () =>
                {
                    this.showCarousel_Delayed = v
                }
            )
        }
        else if (this._showCarouselDebouncer)
        {
            this._showCarouselDebouncer.cancel()
            this.showCarousel_Delayed = v
        }

        return v
    }

    _showWizardCompute(customizationType)
    {
        var v = customizationType == 'wizard'

        if (!v) 
        {   
            this._showWizardDebouncer = Debouncer.debounce(
                this._showWizardDebouncer,
                timeOut.after(1300),
                () =>
                {
                    this.showWizard_Delayed = v
                }
            )
        }
        else if (this._showWizardDebouncer)
        {
            this._showWizardDebouncer.cancel()
            this.showWizard_Delayed = v
        }

        return v
    }

    _wizardEditingCompute(showWizard, wizardReadonly)
    {
        return showWizard && !wizardReadonly
    }

    _designSelectorsChanged(v, o)
    {
        if (!v) { return }

        var open = this.designSelectors[this.selectorId]
        // console.log('this.designSelectors[this.selectorId]: ' + open)

        // this.opened = (open === undefined || open === true)
        this.opened = true
    }

    _selectorIdChanged(v, o)
    {
        var open = this.designSelectors[v]
        this.opened = (open === undefined || open === true)
    }

    localizeSelectorTitle(selectorTitle, customizationType, wizardReadonly)
    {
        var title = selectorTitle //this.localize('customize-' + name)
        if (wizardReadonly === true && customizationType == 'wizard')
        {
            title += this.localize('customize-designset-readonly')
        }
        return title
    }

    _openedChanged(e)
    {
        if (this.designSelectors)
        {
            this.set('designSelectors.' + this.selectorId, e)
        }
    }

    _isSwapAllowComputed(isSwapAllow)
    {
        return !isSwapAllow
    }

    _icon(isSwap)
    {
        return isSwap ? "icons:undo" : "av:loop"
    }

    onSwap(e)
    {
        this.isSwap = !this.isSwap
    }

    _onToggle(e)
    {
        this.opened = e.detail.opened
        this.dispatchEvent(new CustomEvent('toggle', { detail: {} }))

        e.preventDefault()
        e.stopPropagation()
    }
}
