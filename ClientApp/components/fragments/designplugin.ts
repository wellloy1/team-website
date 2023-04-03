import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './designplugin.ts.html'
import style from './designplugin.ts.css'
import '../ui/ui-loader'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
const DEFAULT_LOCALE = 'en-US'
const ALLOWED_LOCALES = { 'en-US': 1, 'th-TH': 1, }


@FragmentDynamic
export class DesignPlugin extends FragmentBase
{
	static get is() { return 'teamatical-designplugin' }

	static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-checkbox-styles">${style}</style>${view}`])}
	
	static get properties()
	{
		return {
			route: Object,
			routeData: Object,
			imagesPath: String,
			os: { type: String, notify: true, },
			offline: { type: Boolean },
			userInfo: Object,
			categories: { type: Array },
			visible: { type: Boolean, value: false, observer: '_visibleChanged' },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
			uiLanguage: { type: String, computed: 'ui_lang(language)' },
		}
	}

	route: any
	routeData: any
	imagesPath: any
	os: any

	static get observers()
	{
		return [
			// '_initialpage(route, visible, os)'
		]
	}

	constructor()
	{
		super()
	}

	connectedCallback()
	{
		super.connectedCallback()

		//var ui_locales = `${this.language.substr(0, 2)} ${this.defaultLanguage.substr(0, 2)}`
	}

	ui_lang(locale)
	{
		if (!ALLOWED_LOCALES[locale]) 
		{ 
			console.warn('Override article locale: [' + locale + '] -> [' + DEFAULT_LOCALE + ']')
			locale = DEFAULT_LOCALE 
		}
		return typeof (locale) == 'string' ? locale.substr(0, 2) : locale
	}

	_hide(view, os)
	{
		if (view == os)
		{
			return false
		}

		return true
	}

	_detectSystem()
	{
		if (this.route.path)
		{
			switch (this.route.path)
			{
				case '/mac':
					this.os = 'mac'
					break

				case '/win':
					this.os = 'win'
					break

				default:
					this._autodetectBrowserOS()
					break
			}

		}
		else if (this.route.path == '' || this.route.path == '/')
		{
			this._autodetectBrowserOS()
		}
	}

	_signUpTap(e)
	{
		this.dispatchEvent(new CustomEvent('ui-user-auth', {
			bubbles: true, composed: true, detail: {
				signup: true
			}
		}))
	}

	_autodetectBrowserOS()
	{
		// console.log('autodetect ...')
		var os = "win";
		const ba = navigator.appVersion
		if (ba.indexOf("Win") != -1) os = "win";
		if (ba.indexOf("Mac") != -1) os = "mac";
		// if (ba.indexOf("X11") != -1) os = "nix";
		// if (ba.indexOf("Linux") != -1) os = "lin";
		// console.log(os)

		this.os = os

		var path = this.route.prefix + '/' + encodeURIComponent(os)
		this._gotoRS(path)
	}

	_visibleChanged(visible)
	{
		if (!visible) { return }

		this._detectSystem()

		this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: {
			category: 'href:' + this.getAttribute('name'),
			title: this.localize('designplugin-title-document')
		} }))
	}

	_computedSubmenu(userInfo, userInfoP)
	{
		return TeamaticalApp.menuHelp(this, userInfo, userInfoP)
	}
}