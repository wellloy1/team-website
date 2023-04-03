//---legacy polymer---
import '@polymer/iron-collapse/iron-collapse.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-styles/paper-styles.js'
import ResizeObserver from 'resize-observer-polyfill'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
//---lit---
import { html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import { UIBase } from './ui-base-lit'
//---component---
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import style from './paper-expansion-panel.ts.css'
//---consts---
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const PaperExpansionPanelBase = UIBase

// A Material Design [expansion panel with header and collapsible content](https://material.google.com/components/expansion-panels.html)
// ### Example

// ```html
// <paper-expansion-panel header="Panel" summary="With event" on-toggle="onToggle">
//   Lots of very interesting content.
// </paper-expansion-panel>
// ```

// ### Styling

// The following custom properties and mixins are available for styling:

// Custom property | Description | Default
// ----------------|-------------|----------
// --paper-expansion-panel-header|Mixin applied to the header of the panel|{}
// --paper-expansion-panel-summary|Mixin applied to the summary of the panel|{}
// --paper-expansion-panel-content|Mixin applied to collapsible content|{}


@customElement('paper-expansion-panel')
export class PaperExpansionPanel extends PaperExpansionPanelBase
{
	@property({ type: String }) 
	header: string = ''

	@property({ type: String }) 
	summary: string = ''

	@property({ type: Boolean, reflect: true }) 
	focused = true

	@property({ type: Boolean, reflect: true, converter: { fromAttribute: (value) => { return JSON.parse(value) }, toAttribute: (value) => { return String(value) } } }) 
	opened = true

	@property({ type: Boolean, reflect: true }) 
	disabled = false

	//attributes
	// @property({ type: Boolean, attribute: true }) noAnimation: boolean = false

	@property({ type: Boolean, attribute: 'no-toggle-header-focusable', reflect: true }) 
	noToggleHeaderFocusable = false
	
	@property({ type: Boolean, attribute: 'no-toggle-header', reflect: true }) 
	noToggleHeader = false

	@property({ type: Boolean, attribute: 'no-toggle-btn', reflect: true }) 
	noToggleButton = false

	@property({ type: Boolean, attribute: 'no-header', reflect: true }) 
	noHeader = false
	
	

	@query('iron-collapse') collapse: any
	@query('paper-icon-button.toggle') toggleBtn: any
	private resizeObserver: ResizeObserver
	private container: HTMLElement | null

	constructor()
	{
		super()
	}

	connectedCallback()
	{
		super.connectedCallback()
		
        this.container = this //this.shadowRoot ? this.shadowRoot.querySelector('.customization-container') : null
		this.resizeObserver = new ResizeObserver(entries => 
		{
			if (this.noToggleButton && !this.opened) { this.opened = true }
		})

		if (this.container) { this.resizeObserver.observe(this.container) }
	}

	disconnectedCallback()
	{
		if (this.resizeObserver && this.container) { this.resizeObserver.unobserve(this.container) }

		super.disconnectedCallback()
	}

	// attributeChangedCallback(name, oldVal, newVal)
	// {
	// 	console.log('attribute change: ', name, ' = ', oldVal, '->', newVal);
	// 	super.attributeChangedCallback(name, oldVal, newVal);
	// }

	@eventOptions({ capture: true })
	private _onFocus(e)
	{
		this.focused = true
		this.notifyPath('focused')
	}

	@eventOptions({ capture: true })
	private _onBlur(e)
	{
		this.focused = false
		this.notifyPath('focused')
	}

	@eventOptions({ capture: true })
	private _onPaperItemTap(e)
	{
		var epath = e.composedPath()
		var isbtn = epath.filter(i => i == this.toggleBtn).length > 0
		if (this.noToggleHeader && !isbtn) { return }
		
		this._toggle()
	}

	@eventOptions({ capture: true })
	private _onPaperItemKeydown(e)
	{
		// console.log(e)
		if (this.noToggleButton) { return }
		// console.log(this.focused, keyboardEventMatchesKeys(e, 'space'))
		if (this.focused && !e.ctrlKey && !e.altKey && !e.shiftKey && (keyboardEventMatchesKeys(e, 'space')))
		{
			// this._toggle()
		}
	}

	private _toggle()
	{
		this.opened = !this.opened
		this.dispatchEvent(new CustomEvent('toggle', { detail: { opened: this.opened }, bubbles: true, composed: true }))
	}

	private _onTransitionEnd(e)
	{
		this.dispatchEvent(new CustomEvent('toggle-transitionend', { detail: { opened: this.opened, transitionend: e }, bubbles: true, composed: true }))
	}

	private _computeToggleIcon(opened)
	{
		// return opened ? 'icons:expand-less' : 'icons:expand-more'
		return 'icons:expand-less'
	}

	private _resizeHandler(e?)
	{
		console.log(e)
	}
	
	private _toogleHeaderTabindex(noToggleHeader, noToggleButton, noToggleHeaderFocusable)
	{
		return noToggleHeader && noToggleButton && !noToggleHeaderFocusable ? -1 : 0
	}

	private _toggleBtnTabindex(noToggleHeader, noToggleButton)
	{
		return noToggleHeader ? 0 : -1
	}

	render()
	{
		let header = html`<slot name="header"><div class="flex">&nbsp;</div></slot>`
		if (this.header)
		{
			let summary = html``
			if (this.summary)
			{
				summary = html`<div .hidden=${this.opened} class="flex summary">${this.summary}</div>`
			}
			header = html`
			<div class="flex">${this.header}</div>
			${summary}
			`
		}

		return html`
			<style>${style}</style>

			<paper-item 
				class="header" 
				.disabled=${this.disabled}
				tabindex=${this._toogleHeaderTabindex(this.noToggleHeader, this.noToggleButton, this.noToggleHeaderFocusable)}
				@tap=${this._onPaperItemTap}
				@focus=${this._onFocus}
				@blur=${this._onBlur}
				@keydown=${this._onPaperItemKeydown}>

				${header}

				${this.noToggleButton ? html`` : html`
					<paper-icon-button 
						class="toggle" 
						aria-label="toggle" 
						tabindex=${this._toggleBtnTabindex(this.noToggleHeader, this.noToggleButton)}
						?collapsed=${!this.opened}
						icon="${this._computeToggleIcon(this.opened)}">
					</paper-icon-button>`
				}
			</paper-item>

			<iron-collapse 
				class="content" 
				@transitionend="${(e) => this._onTransitionEnd(e)}"
				.opened=${this.opened}>
				<slot></slot>
			</iron-collapse>
		`
	}
}
