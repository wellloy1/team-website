import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { NetBase } from '../bll/net-base'
import view from './privacypolicy.ts.html'
import style from './privacypolicy.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../ui/ui-loader'


@FragmentDynamic
export class PrivacyPolicy extends FragmentBase
{
	static get is() { return 'teamatical-privacypolicy' }

	static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

	static get properties()
	{
		return {
			route: Object,
			routeData: Object,
			offline: { type: Boolean },
			userInfo: Object,
			failure: { type: Boolean, },
			loading: { type: Boolean, notify: true },
			categories: { type: Array },
			visible: { type: Boolean, value: false, observer: '_visibleChanged' },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },

			policy: { type: String }
		}
	}

	_policyDebouncer: any
	_netbase: any
	failure: any
	loading: any
	policy: any


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

		this.loadPolicy()
	}


	loadPolicy()
	{
		const api_url = 'https://www.iubenda.com/api/privacy-policy/79618539'

		var retry = (first?) => 
		{
			this._policyDebouncer = Debouncer.debounce(this._policyDebouncer, timeOut.after(first ? 0 : 5000), () =>
			{
				this.failure = false
				this.loading = true
				if (!this._netbase) { this._netbase = new NetBase() }
				this._netbase._getResource(rq, 1, true)
			})
		}

		var rq = {
			url: api_url,
			external: true,
			method: "GET",
			handleAs: "json",
			debounceDuration: 300,
			onLoad: (e) =>
			{
				this.loading = false
				if (e.response.success && e.response.content)
				{
					this.policy = e.response.content
					this.$['policyContainer'].innerHTML = this.policy
				}
				else
				{
					console.error(e)
					retry()
				}
			},
			onError: (e) =>
			{
				this.loading = false
				console.error(e)
				retry()
			}
		}

		retry(1)
	}

	_isNotConn(item, failure, offline, loading)
	{
		//|| !loading
		return (item !== undefined || offline === true || failure === true)
	}

	_visibleChanged(visible, o)
	{
		if (!visible) { return }

		this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
			title: this.localize('privacypolicy-title-document') 
		} }))
	}

	_computedSubmenu(userInfo, userInfoP)
	{
		return TeamaticalApp.menuHelp(this, userInfo, userInfoP)
	}
}
