import '@polymer/app-route/app-route.js'
import '@polymer/paper-input/paper-textarea.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { UIImageMultiView3D } from '../ui/ui-image-multiview-3d';
import { CustomDesignRequestData } from '../bll/custom-design-request-data'
import { StringUtil } from '../utils/StringUtil'
import '../bll/custom-design-request-data'
import '../ui/ui-loader'
import '../ui/ui-image-multiview-3d'
import '../ui/ui-assets-uploader'
import '../ui/ui-product-notfound'
import '../ui/ui-carousel'
import '../ui/ui-quantity'
import '../ui/ui-description'
import '../ui/ui-sizes'
import '../ui/ui-button'
import '../ui/ui-select'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './custom-design-request.ts.html'
import style from './custom-design-request.ts.css'
const type_other = 'other'

@FragmentDynamic
export class CustomDesignRequest extends FragmentBase
{
	static get is() { return 'teamatical-custom-design-request' }

	static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

	static get properties()
	{
		return {
			customDesignRequest: { type: Object },
			item: { type: Object },

			route: { type: Object, },
			routeData: { type: Object, },
			queryParams: { type: Object, notify: true },
			visible: { type: Boolean, value: false, observer: '_visibleChanged', },
			offline: { type: Boolean, observer: '_offlineChanged' },
			websiteUrl: { type: String },
			userInfo: { type: Object },

			//input
			teamInfo: { type: Object, notify: true },
			playerInfo: { type: Object, notify: true },
			colorsPalette: { type: Array },
			categories: { type: Array },
			saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },

			failure: { type: Boolean, value: false },
			loading: { type: Boolean, value: false, notify: true },
			assetsLoading: { type: Boolean, value: false, notify: true },
			debouncing: { type: Object, notify: true, value: {} },


			api_action: { type: String, },
			disableSubmit: { type: Boolean, notify: true, computed: '_computed_disableSubmit(loading, assetsLoading)' },
			loadingDisable: { type: Boolean, notify: true, computed: '_computed_loadingDisable(loading, api_action)' },
	
			customDesignRequestDescriptionPrefix: { type: Boolean, notify: true, computed: '_computed_customDesignRequestDescriptionPrefix(customDesignRequest, customDesignRequest.*)' },

			assetsTypeSelectorItems: { type: Array, value: [ 
				{ id: 't1', title: 'Team Logo' }, 
				{ id: 't2', title: 'Sponsor Logo' }, 
				{ id: 't3', title: 'Logo In Player Numbers' }, 
				{ id: 't4', title: 'Club Crest' }, 
				{ id: type_other, title: 'Other' },
			] },

			assetsPositionSelectorItems: { type: Array, value: [ 
				{ id: 'p1', title: 'Full Chest' }, 
				{ id: 'p2', title: 'Left Chest' }, 
				{ id: 'p3', title: 'Right Chest' }, 
				{ id: 'p4', title: 'Left Sleeve' }, 
				{ id: 'p5', title: 'Right Sleeve' }, 
				{ id: 'p6', title: 'Back Top' }, 
				{ id: 'p7', title: 'Back Middle' }, 
				{ id: 'p8', title: 'Back Low' }, 
				{ id: 'p9', title: 'Left Side' }, 
				{ id: 'p10', title: 'Right Side' }, 
				{ id: 'p11', title: 'Left Leg' }, 
				{ id: 'p12', title: 'Right Leg' }, 
				{ id: type_other, title: 'Other' },
			] },
		}
	}

	static get observers()
	{
		return [
			'_modelScrollToError(customDesignRequest.notvalid.*)',
			'_cdrLoaded(customDesignRequest)',
		]
	}
	_log(v) { console.log(v) }

	assetsTypeSelectorItems: any
	assetsPositionSelectorItems: any
	_debouncerAnonymousDialog: any
	customDesignRequestDescriptionPrefix: string
	_loadingOnUpdateDebouncer: any
	_itemChangeDebouncer: any
	recentProducts: any
	isReady: any
	item: any
	quantity: any
	needReset: any
	route: any
	hasChanged: any
	loadingOnUpdate: any
	routeData: any
	userInfo: any
	debouncing: any
	customDesignRequest: any

	get customDesignRequestData() { return this.$['custom-design-request-data'] as CustomDesignRequestData }
	get imageProduct() { return this.$['image-product'] as UIImageMultiView3D }
	// get assetsUploader() { return this.$['Assets'] as UIAssetsUploader }
	get requestForm() { return this.$.requestForm }
	get formElements() { return this.$ }


	connectedCallback()
	{
		super.connectedCallback()
	}

	ready()
	{
		super.ready()
	}

	focusDesc(e)
	{
		this.root.querySelector('#Description')?.focus()
	}

	_computed_customDesignRequestDescriptionPrefix(customDesignRequest, customDesignRequestP, html = true)
	{
		var str = this.localize('custom-design-request-text-sample',
			'name', customDesignRequest?.Name || '<name>',
			'organization', customDesignRequest?.Company || '<company>',
			'productname', customDesignRequest?.ProductConfiguration?.Product?.Title || '<productname>',
			'qty', customDesignRequest?.QuantityNeeded || '<qty>',
		)
		if (html)
		{
			str = StringUtil.replaceAll(str, "\n", "<br />")
		}
		return str
	}

	_formatSizeTitle(manufi, mList)
	{
		return manufi && manufi.SizeTitle ? manufi.SizeTitle : this.localize('detail-size')
	}

	_visibleChanged(visible, o)
	{
		if (!visible) { return }

		this.dispatchEvent(new CustomEvent('change-section', {
			bubbles: true, composed: true, detail: {
				title: this.localize('custom-design-request-title-document')
			}
		}))
	}

	_isDefined(item)
	{
		return item != null
	}

	_isNotConn(item, failure, offline, loading)
	{
		return (item !== undefined || !loading || offline === true || failure === true)
	}

	_isFound(item, failure, offline, loading)
	{
		var v = loading === true || failure === true
		if (v && !loading && item === null) { v = false }
		if (!v && !loading && !(item === undefined || item === null)) { v = true }
		if (!v && offline === undefined) { v = true }

		// console.log(item + ' | o:' + offline + ' | f:' + failure + ' | l:' + loading + ' => hide: ' + v)

		return v
	}

	_isNoProduct(item, failure, offline)
	{
		return !item || failure === true
	}

	_tryReconnect()
	{
		this.customDesignRequestData.refresh()
	}

	_offlineChanged(offline, old)
	{
		if (!offline && old != undefined)
		{
			this._tryReconnect()
		}
	}

	_computed_disableSubmit(loading, assetsLoading)
	{
		return loading || assetsLoading
	}

	_computed_loadingDisable(loading, api_action)
	{
		var v = loading
		if (api_action == 'update') { v = false }
		return v
	}

	onInputChanged(e)
	{
		return this._onInputChanged(e, 'customDesignRequest', 'id')
	}

	onSubmit(e)
	{
		this.customDesignRequest.DescriptionPrefix = this._computed_customDesignRequestDescriptionPrefix(this.customDesignRequest, null, false)
		this.customDesignRequestData.submit()
	}

	onAssetInputChanged(e)
	{
		var assetinx = e?.detail?.target?.__dataHost?.__data?.index
		// console.log(assetinx, e)
		if (e?.detail?.files?.length > 0 
			&& (assetinx + 1) == this.customDesignRequest.Assets.length) 
		{
			this.set('customDesignRequest.notvalid.Assets', null)
			this.async(() => { this._pushAssetsNew() }, 100)
		}
		else if (e?.detail?.files?.length < 1 && this.customDesignRequest?.Assets?.length > 0) 
		{
			// var list = []
			// for (var i of this.customDesignRequest.Assets)
			// {
			// 	if (i?.Files?.length != 0)
			// 	{
			// 		list.push(i)
			// 	}
			// }
			// this.set('customDesignRequest.Assets', list)


			// var moreitems = this.customDesignRequest.Assets.length > 1
			// while (moreitems)
			if (this.customDesignRequest.Assets.length > 1)
			{
				var lastinx = this.customDesignRequest.Assets.length - 1
				if (this.customDesignRequest.Assets[lastinx].Files.length <= 0 
					&& (this.customDesignRequest.Assets[lastinx - 1].Files.length <= 0 || assetinx == (lastinx - 1)))
				{
					this.set(`customDesignRequest.Assets.${lastinx}.Files`, [])
					this.splice('customDesignRequest.Assets', lastinx, 1)
				}
				// lastinx = this.customDesignRequest.Assets.length - 1
				// moreitems = this.customDesignRequest.Assets.length > 1 && this.customDesignRequest.Assets[lastinx].Files.length <= 0
			}
		}
	}

	_cdrLoaded(customDesignRequest)
	{
		this._pushAssetsNew()
	}

	_pushAssetsNew()
	{
		if (Array.isArray(this.customDesignRequest?.Assets))
		{
			this.customDesignRequest.Assets.push({
				Type: this.assetsTypeSelectorItems[0],
				Position: this.assetsPositionSelectorItems[0],
				Description: '', 
				Files: [], //UI Only
			})
			this.set('customDesignRequest.Assets', Object.assign([], this.customDesignRequest.Assets))
		}
	}

	_hideAssetDesc(asseti_Files, asseti_FilesP, inx)
	{		
		if (Array.isArray(asseti_Files) && asseti_Files.length > 0)
		{
			return false
		}
		// this.set(`customDesignRequest.Assets.${inx}.Type`, this.assetsTypeSelectorItems[0])
		// this.set(`customDesignRequest.Assets.${inx}.Position`, this.assetsPositionSelectorItems[0])
		// this.set(`customDesignRequest.Assets.${inx}.Description`, '')
		return true
	}

	_computed_hideByAssetsTypeSelector(assetsTypeSelector_id)
	{
		return assetsTypeSelector_id != type_other
	}

	_modelScrollToError(notvalidP)
	{
		var pi = null
		if (notvalidP && notvalidP.path == 'customDesignRequest.notvalid' && notvalidP.value)
		{
			var notvalid = notvalidP.value
			var keys = Object.keys(notvalid)
			if (notvalid && keys.length > 0)
			{
				pi = this.root.querySelector("[id='" + keys[0] + "']")
			}
		}
		if (pi) { this._focusAndScroll(pi) }
	}

	_computedSubmenu(categories, userInfo, userInfoP)
	{
		return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
	}
}
