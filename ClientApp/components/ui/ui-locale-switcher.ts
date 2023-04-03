import '@polymer/iron-icon/iron-icon'
//---lit---
import { html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import { NetBase } from '../bll/net-base-lit'
import { StringUtil } from '../utils/StringUtil'
import { UIBase } from './ui-base-lit'
import style from './ui-locale-switcher.ts.css'


class LocaleMenuItem
{
	id: string
    title: string
	language: string
    countries: object | undefined
}
const localeListAPP: LocaleMenuItem[] = [
	{ title: "En", id: "en",	language: 'en', countries: { 'US': 1, 'AU': 1, 'GB': 1, 'PH': 1 } },
	{ title: "Th", id: "th-TH", language: 'th', countries: undefined },
	{ title: "Fr", id: "fr-FR", language: 'fr', countries: undefined },
	{ title: "Nl", id: "nl-BE", language: 'nl', countries: undefined },
	{ title: "De", id: "de-DE", language: 'de', countries: undefined },
]
const localeListADMIN: LocaleMenuItem[] = [
	{ title: "En", id: "en-US", language: 'en', countries: undefined },
	{ title: "Th", id: "th-TH", language: 'th', countries: undefined },
]


@customElement('teamatical-ui-locale-switcher')
export class UILocaleSwitcher extends UIBase
{
	// static observedAttributes = ['query-lang']
	// @query('teamatical-ui-locale-switcher-old') old: UILocaleSwitcherPolyE

	@property({ type: Number }) tabindex: number = 0
	@property({ type: String }) country: string = "US"
	@property({ type: String }) localeDefault: string = "en-US"

	@property({ type: Boolean, attribute: 'is-app', reflect: true }) isapp = false
	@property({ type: String, attribute: 'query-lang', reflect: true }) queryLang = ''

	@query('#dropdown') dropdownCheckbox: any
	
	netbase: NetBase
	_docTapHandler: any
	_checked: boolean

	get recentLang() 
	{
		var { lang, langCountry } = this._splitLocale(this.localeDefault)
		return lang
	}

	constructor()
	{
		super()
	}

	connectedCallback()
	{
		super.connectedCallback()

		this._docTapHandler = (e) => this._docTap(e)
		document.addEventListener("click", this._docTapHandler)
	}

	disconnectedCallback()
	{
		document.removeEventListener("click", this._docTapHandler)

		super.disconnectedCallback()
	}

	checkboxOnClick(e)
	{
		// console.log(e)
		this._checked = true
	}

	_docTap(e)
	{
		if (this._checked) 
		{ 
			this._checked = false
			return 
		}
		// console.log(e)
        var epath = e.path || e.composedPath()
        var el: any = Array.isArray(epath) ? epath.filter(i => { return i?.classList && i.classList.contains('dropdown__face') }) : null
		if (el?.length === 0 && this.dropdownCheckbox?.checked == true)
		{
			this.dropdownCheckbox.checked = false
		}
		else if (el?.length > 0)
		{
			e.stopPropagation()
		}
	}

	attributeChangedCallback(name, _old, value): void
	{
		if (name == 'query-lang' && this.queryLang)
		{
			this._queryLangHandler(value)
		}
		else
		{
			super.attributeChangedCallback(name, _old, value)
		}
	}

	@eventOptions({ capture: true })
	private async _switchLangEnter(e)
	{
		if (e.keyCode === 13)
		{
			let locale = e.target.getAttribute('locale')
			this._switchLocale(locale)
		}
	}

	@eventOptions({ capture: true })
	private async _switchLangTap(e)
	{
		let locale = e.target.getAttribute('locale')
		this._switchLocale(locale)
	}

	async _switchLocale(locale)
	{
		try
		{
			// console.log(locale)
			// if (this._dev) console.log('_switchLangTap', locale)
			this.dispatchEvent(new CustomEvent('locale-changed', { bubbles: true, composed: true, detail: { 
				locale: locale, 
				loading: true 
			} })) 

			await this.loadLocale(locale)
			
			this.saveRecentLocale()

			await this.saveLocaleToServer(locale) // notify backend to switch Razor/User locale - via session cookie

			this.dispatchEvent(new CustomEvent('locale-changed', {
				bubbles: true, composed: true, detail: {
					locale: locale,
					loading: false,
					reloadPage: true //RELOAD!!!!
				}
			}))
			//no need both load - page will be reloaded
			// this.old.loadLocale(locale, completeHandler)
		}
		catch(ex)
		{
			this.dispatchEvent(new CustomEvent('locale-changed', {
				bubbles: true, composed: true, detail: {
					loading: false
				}
			}))
		}
	}

	private async saveLocaleToServer(locale)
	{
		if (!this.netbase) { this.netbase = new NetBase() }
		
		var url = StringUtil.urlquery('/api/v1.0/user/set-locale', {locale: locale}) 
		try
		{
			var r = await this.netbase._apiRequest(url)
			// if (this._dev) console.log('saveLocaleToServer [', locale, '] => ', r)
		}
		catch
		{
		}
	}

	_splitLocale(locale)
	{
		if (typeof(locale) != 'string' || locale.length < 2) { return { lang: locale, langCountry: '' } }
		var lang = locale.substring(0, 2)
		var langCountry = locale.length >= 5 ? locale.substring(3, 5) : null
		return { lang: lang, langCountry: langCountry }
	}

	_queryLangHandler(queryLang:string)
	{
		if (typeof(queryLang) != 'string' || queryLang.length < 2) { return }

		//build url
		var url = window.location.href
		try 
		{
			var urlo = new URL(url)
			var qp: any = StringUtil.parsequery(urlo.search)
			if (qp)
			{
				delete qp.lang
				url = StringUtil.urlquery(`${urlo.pathname}`, qp)
			}
		} 
		catch (error) 
		{
		}
		window.history.replaceState(null, '', url)
		//don't notify, due reloading later - window.dispatchEvent(new CustomEvent('location-changed'))


		//detect locale
		var { lang, langCountry } = this._splitLocale(queryLang)
		var locale = 'en-US'
		for (var loci of localeListAPP)
		{
			if (StringUtil.startsWith(loci.id, lang))
			{
				if (loci.countries instanceof Object)
				{
					var country = langCountry && loci.countries[langCountry] ? langCountry : Object.keys(loci.countries)[0]
					locale = `${loci.id}-${country}`
				}
				else
				{
					locale = loci.id
				}

				this._switchLocale(locale)
				break
			}
		}
	}

	// locale-default="de-DE"
	// org-subdomain="decathlon-th"
	// org-country="TH"
	_buildLocale(i_id, ilang, icountries, countryCode2)
	{
		if (typeof(icountries) == 'object' && icountries != null && Object.keys(icountries).length > 0)
		{
			if (!icountries[countryCode2])
			{
				countryCode2 =  Object.keys(icountries)[0] ? Object.keys(icountries)[0] : i_id
			}
			return `${ilang}-${countryCode2}`
		}
		return i_id
	}
	
	_localeList(isapp, countryCode2)
	{
		var list = isapp ? localeListAPP : localeListADMIN
		return list
	}

	render()
	{
		const localeList = this._localeList(this.isapp, this.country)

		let langListTpl
		if (this.isapp)
		{
			langListTpl = html`
			<div class="dropdown">
			<input type="checkbox" id="dropdown" @click=${this.checkboxOnClick}>

			<label class="dropdown__face" for="dropdown">
				<div class="dropdown__text">
					<span class="recent-lang">
						<iron-icon icon="teamatical:earth"></iron-icon>
						<span>${this.recentLang}</span>
					</span> 
				</div>
				<div class="dropdown__arrow"></div>
			</label>

			<ul class="dropdown__items">
				${localeList.map((i) => {
					var loci = this._buildLocale(i.id, i.language, i.countries, this.country)
					return html`
						<li locale="${loci}">
							<a locale="${loci}" tabindex="${this.tabindex}" @click=${this._switchLangTap} @keydown=${this._switchLangEnter}>
								<!-- <iron-icon icon="teamatical:earth"></iron-icon> -->
								${i.title}
							</a>
						</li>`
				})}	
			</ul>
			</div>

			<svg>
				<filter id="goo">
					<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
					<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
					<feBlend in="SourceGraphic" in2="goo" />
				</filter>
			</svg>
			`
		}
		else
		{
			langListTpl = html`
			<div class="horizontal-center">
			<iron-icon icon="teamatical:earth"></iron-icon>
			<ul>
				${localeList.map((i) => {
					var loci = this._buildLocale(i.id, i.language, i.countries, this.country)
					return html`
						<li @click=${this._switchLangTap} @keydown=${this._switchLangEnter} locale="${loci}">
							<a locale="${loci}" tabindex="${this.tabindex}">
								${i.title}
							</a>
						</li>`
				})}
			</ul>
			</div>
			`
		}

		return html`<style>${style}</style>${langListTpl}`
	}

}



// @CustomElement
// export class UILocaleSwitcherPolyE extends UIBasePolyE
// {
// 	static get is() { return 'teamatical-ui-locale-switcher-old' }
// 	static get template() { return htmlPolyE([``]) }
// 	constructor()
// 	{
// 		super()
// 	}
// }

//polymer-element
// import { html as htmlPolyE} from '@polymer/polymer/polymer-element'
// import { UIBase as UIBasePolyE } from '../ui/ui-base'
// import { CustomElement } from '../utils/CommonUtils'
//end
