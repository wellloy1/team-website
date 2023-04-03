import '@polymer/iron-media-query/iron-media-query.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { NetBase } from '../bll/net-base'

import view from './help.ts.html'
import style from './help.ts.css'
import '../ui/ui-loader'
import '../ui/ui-network-warning'
import '../ui/paper-expansion-panel'
import '../shared-styles/common-styles'
import { StringUtil } from '../utils/StringUtil'
import { PaperExpansionPanel } from '../ui/paper-expansion-panel'
import { RandomInteger } from '../utils/MathExtensions'
const DEFAULT_LOCALE = 'en-US'
const ALLOWED_LOCALES = { 'en-US': 1, }
const ALLOWED_LOCALES_MENU = { 'en-US': 1, 'en-AU': 1, 'fr-FR': 1, 'th-TH': 1, }


@FragmentDynamic
export class Help extends FragmentBase
{
	static get is() { return 'teamatical-help' }

	static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

	static get properties()
	{
		return {
            smallScreen: { type: Object },
			mobileScreen: { type: Object },
			article: { type: Object },

			websiteUrl: { type: String },
			route: { type: Object, observer: '_routeChanged' },
			routeData: { type: Object, observer: '_routeDataChanged' },
			offline: { type: Boolean, notify: true },
			userInfo: { type: Object, },
			failure: { type: Boolean, notify: true, },
			loading: { type: Boolean, notify: true },
			categories: { type: Array },
			visible: { type: Boolean, value: false, observer: '_visibleChanged' },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
			
			isConnecting: { type: Boolean, notify: true, computed: '_computed_isConnecting(articleContent, failure, offline, loading, visible)' },
			isNotFound: { type: Boolean, notify: true, computed: '_computed_isNotFound(articleContent, failure, offline, loading, visible)' },
			isNetworkFailure: { type: Boolean, notify: true, computed: '_computed_isNetworkFailure(articleContent, failure, offline, loading, visible)' },

			articleContent: { type: String, notify: true, observer: '_changed_articleContent' },
			menuContent: { type: String },
		}
	}

	static get observers()
	{
		return [
			'_articleChanged(article, visible)',
			// '_log(visible, loading, failure, offline, articleContent)',
		]
	}
	_log(...args) { console.log('help "visible, loading, failure, offline, articleContent"', ...args) }

	get menuExpansion() { return this.$['menuExpansion'] as PaperExpansionPanel }
	get menuContainer() { return this.$['menuContainer'] as HTMLDivElement }
	get articleContainer() { return this.$['articleContainer'] as HTMLDivElement }
	

	

	article: string
	route: any
	failure: boolean
	loading: boolean
	visible: boolean
	articleContent: any
	menuContent: any
	_menuDebouncer: Debouncer
	_articleDebouncer: Debouncer
	_changeSectionDebouncer: Debouncer
	_routeDebouncer: Debouncer
	_netbase: NetBase
	_netbase_menu: NetBase
	websiteUrl: string
	mobileScreen: boolean




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

		this._loadMenu(this.language)
	}

	_routeChanged(route)
	{
		// console.log(route)
		this._routeDebouncer = Debouncer.debounce(this._routeDebouncer, timeOut.after(17), () =>
		{
			if (!this.visible) { return }

			this.article = this.route?.path ? this.route?.path.substr(1) : 'home'
		})
	}

	_routeDataChanged(routeData)
	{
		// console.log(routeData, this.route)
		if (!this.route || this.route?.prefix !== '/help') { return }

		this._routeDebouncer = Debouncer.debounce(this._routeDebouncer, timeOut.after(17), () =>
		{
			if (!this.visible) { return }
			this.article = this.route?.path ? this.route?.path.substr(1) : 'home'
		})
	}

	_articleChanged(article, visible)
	{
		if (!visible || article === undefined) { return }

		this.articleContent = '' //reset old to show animation properly
		if (this.mobileScreen) { this.menuExpansion.opened = false } //close menu expansion

		this._loadArticle(article, this.language)
	}

	_htmlBuild(html)
	{
		var path = `/data${window.location.pathname}`
		var lastSpashInx = path.lastIndexOf('/')
		if (lastSpashInx)
		{
			path = path.substring(0, lastSpashInx)
		}
		//images
		var startw, repw
		// startw = `src="images/`; repw = `src="${path}/images/`
		startw = `<img src="`; repw = `<img src="${path}/`
		var rhtml = StringUtil.replaceAll(html, startw, repw)
		
		startw = `<link href="`; repw = `<link href="${path}/`
		rhtml = StringUtil.replaceAll(rhtml, startw, repw)

		rhtml = StringUtil.replaceAll(rhtml, '<img', '<img loading="lazy"')

		//font size / family
		// rhtml = StringUtil.replaceAll(rhtml, 'font-size:', 'font-size1:')
		// rhtml = StringUtil.replaceAll(rhtml, 'font-family:', 'font-family1:')
		
		var sinx = rhtml.indexOf('<body')
		if (sinx >= 0) 
		{
			rhtml = rhtml.substring(sinx, rhtml.length - 1)
		}

		return rhtml
	}

	_apiUrlArticle(article, locale)
	{
		var art_path = article
		const urlPostfix = `-${locale}.html`
		if (typeof(art_path) == 'string')
		{
			var htmlInx = art_path.indexOf(urlPostfix)
			if (htmlInx >= 0 && htmlInx == (art_path.length - urlPostfix.length))
			{
				//do nothing
			}
			else if (art_path.lastIndexOf('/') == (art_path.length - 1))
			{
				art_path += 'index' + urlPostfix
			}
			else
			{
				art_path += urlPostfix
			}
		}
		const api_url = `${this.websiteUrl}/data/help/${art_path}`
		return api_url
	}

	_loadArticle(article, locale = 'en-US')
	{
		if (!ALLOWED_LOCALES[locale]) 
		{ 
			console.warn('Override article locale: [' + locale + '] -> [' + DEFAULT_LOCALE + ']')
			locale = DEFAULT_LOCALE 
		}


		var api_url = this._apiUrlArticle(article, locale)
		var retry_cnt = 0
		var retry = (first?) => 
		{
			this._articleDebouncer = Debouncer.debounce(this._articleDebouncer, timeOut.after(first ? 0 : RandomInteger(5000, 6000)), () =>
			{
				if (!this._netbase) { this._netbase = new NetBase() }
				retry_cnt++
				// console.log(retry_cnt)
				if (retry_cnt > 2) 
				{
					rq.url = this._apiUrlArticle(article, DEFAULT_LOCALE)
				}
				else if (retry_cnt > 3) 
				{
					this.failure = true
					this.loading = false
					this.articleContent = ''
					return //EXIT
				}
				this.failure = false
				this.loading = true
				this._netbase._getResource(rq, 1, true)
			})
		}

		var rq = {
			url: api_url,
			external: true,
			method: 'GET',
			handleAs: 'text',
			debounceDuration: 300,
			onLoad: (e) =>
			{
				if (e.response)
				{
					this.loading = false
					this.articleContent = this._htmlBuild(e.response)
				}
				else
				{
					console.error(e)
					retry()
				}
			},
			onError: (e) =>
			{
				if (e.message == "The request failed with status code: 404")
				{
					// this.articleContent = ''
				}
				console.error(e)
				retry()
			}
		}

		this.failure = false
		this.loading = true
		retry(1)
	}

	_loadMenu(locale)
	{
		if (!ALLOWED_LOCALES_MENU[locale]) 
		{ 
			console.warn('Override menu locale: [' + locale + '] -> [' + DEFAULT_LOCALE + ']')
			locale = DEFAULT_LOCALE 
		}

		var retry_cnt = 0
		const api_url = `${this.websiteUrl}/data/help/menu-${locale}.html`

		var retry = (first?) => 
		{
			this._menuDebouncer = Debouncer.debounce(this._menuDebouncer, timeOut.after(first ? 0 : 5000), () =>
			{
				if (!this._netbase_menu) { this._netbase_menu = new NetBase() }
				retry_cnt++
				
				if (retry_cnt > 2) 
				{
					rq.url = `${this.websiteUrl}/data/help/menu-${DEFAULT_LOCALE}.html`
				}
				else if (retry_cnt > 3) 
				{
					return //EXIT
				}
				this._netbase_menu._getResource(rq, 1, true)
			})
		}

		var rq = {
			url: api_url,
			external: true,
			method: "GET",
			handleAs: "text",
			debounceDuration: 300,
			onLoad: (e) =>
			{
				if (e.response)
				{
					this.menuContent = e.response
					this.menuContainer.innerHTML = this.menuContent
				}
				else
				{
					console.error(e)
					retry()
				}
			},
			onError: (e) =>
			{
				console.error(e)
				retry()
			}
		}

		retry(1)
	}

	_tryReconnect()
    {
		this._articleChanged(this.article, this.visible)
    }

	_visibleChanged(visible, o)
	{
		if (!visible) { return }

		this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
			category: 'href:' + this.getAttribute('name'),
			title: this.localize('help-title-document') 
		} }))
	}

	_changed_articleContent(html, o)
	{
		this.articleContainer.innerHTML = html
	}

	_computed_isConnecting(articleContent, failure, offline, loading, visible)
	{
		let f = (failure || offline || !visible)
		let a = this._asBool(articleContent)
		let r = loading && !f 
		return r
	}

	_computed_isNotFound(articleContent, failure, offline, loading, visible)
	{
		let f = (loading || failure || offline || !visible)
		let a = this._asBool(articleContent)
		let r = !f && !a && articleContent != undefined
		return r
	}

	_computed_isNetworkFailure(articleContent, failure, offline, loading, visible)
	{
		return failure === true && !loading
	}

	_computedSubmenu(userInfo, userInfoP)
	{
		return TeamaticalApp.menuHelp(this, userInfo, userInfoP)
	}
}


    