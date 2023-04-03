import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import view from './termsofuse.ts.html'
import style from './termsofuse.ts.css'


@FragmentDynamic
export class TermsofUse extends FragmentBase
{
	static get is() { return 'teamatical-termsofuse' }

	static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

	static get properties()
	{
		return {
			route: Object,
			routeData: Object,
			offline: { type: Boolean },
			userInfo: Object,
			categories: { type: Array },
			visible: { type: Boolean, value: false, observer: '_visibleChanged' },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
		}
	}

	constructor()
	{
		super()
	}

	connectedCallback()
	{
		super.connectedCallback()
	}

	_visibleChanged(visible)
	{
		if (!visible) { return }

		this.dispatchEvent(new CustomEvent('change-section', {
			bubbles: true, composed: true, detail: {
				title: this.localize('termsofuse-title-document')
			}
		}))
	}

	_computedSubmenu(userInfo, userInfoP)
	{
		return TeamaticalApp.menuHelp(this, userInfo, userInfoP)
	}
}