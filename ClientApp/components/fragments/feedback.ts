import '@polymer/iron-flex-layout/iron-flex-layout.js'
// import '@polymer/iron-flex-layout/iron-flex-layout-classes.js'
import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { NetBase } from '../bll/net-base'
import { StringUtil } from '../utils/StringUtil'
import view from './feedback.ts.html'
import style from './feedback.ts.css'
import '../ui/ui-loader'
import '../ui/ui-select'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import { UserInfoModel } from '../dal/user-info-model'
import { UISelect } from '../ui/ui-select'


@FragmentDynamic
export class Feedback extends FragmentBase
{
	static get is() { return 'teamatical-feedback' }

	static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

	static get properties()
	{
		return {
			route: Object,
			routeData: Object,
			offline: { type: Boolean },
			userInfo: { type: Object },
            queryParams: { type: Object, notify: true },
			failure: { type: Boolean, },
			loading: { type: Boolean, notify: true },
			categories: { type: Array },

			visible: { type: Boolean, value: false, notify: true, observer: '_visibleChanged' },
			submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },

			TypeList: { type: Array, value: [
				{ id: "suggestion", title: "Feedback" }, 
				{ id: "teamstore", title: "Sign my team up for online store" }, 
				{ id: "request_plugin_access", title: "Design support" }, 
				{ id: "trackorder", title: "Track my order" },
				{ id: "issue", title: "Technical support" }, 
			] },
			TypeListLoc: { type: Array, notify: true, computed: '_computedTypeListLoc(TypeList)' },
			TypeSelected: { type: Object, observer: '_typeSelectedChanged' },

			OrgtypeList: { type: Array, value: [
				{ id: "team", title: "team" }, 
				{ id: "club", title: "club" }, 
				{ id: "school", title: "school" }, 
				{ id: "company", title: "company" }, 
			] },
			OrgtypeListLoc: { type: Array, notify: true, computed: '_computed_OrgtypeListLoc(OrgtypeList)' },
			OrgtypeSelected: { type: Object, observer: '_orgtypeSelectedChanged' },
			OrganizationTitleLoc: { type: String, computed: '_computed_OrganizationTitleLoc(OrgtypeSelected)' },

			RelationshipList: { type: Array, value: [
				{ id: "coach", title: "Coach" }, 
				{ id: "parent", title: "Parent" }, 
				{ id: "player", title: "Player" }, 
				{ id: "manager", title: "Manager" },
				{ id: "organization_admin", title: "Organization admin" }, 
				{ id: "other", title: "Other" }, 
				
			] },
			RelationshipListLoc: { type: Array, notify: true, computed: '_computedRelationshipListLoc(RelationshipList)' },
			RelationshipSelected: { type: Object, observer: '_relationshipSelectedChanged' },
			RelationshipTitleLoc: { type: String, computed: '_computed_RelationshipTitleLoc(OrganizationTitleLoc)' },


			CountryList: { type: Object, computed: '_computedCountryList()' },
			CountrySelected: { type: Object, },
		}
	}

	static get observers()
    {
        return [
			'_typeChanged(queryParams.id, visible)',
			'_orgtypeChanged(queryParams.oid, visible)',
			'_relationshipChanged(queryParams.rid, visible)',
        ]
    }
	_log(v) { console.log(v) }


	TypeList: any[]
	TypeSelected: any
	OrgtypeList: any[]
	OrgtypeSelected: any
	RelationshipList: any[]
	RelationshipSelected: any
	userInfo: UserInfoModel
	netbase: any
	_resizeDebouncer: any
	failure: any
	loading: any
	policy: any
	CountryList: any[]
	CountrySelected: any
	queryParams: any
	_typeDebouncer: Debouncer
	_orgtypeDebouncer: Debouncer
	_relationshipDebouncer: Debouncer
	visible: boolean


	get Type() { return this.$['Type'] as UISelect }
	get Orgtype() { return this.$['Orgtype'] as UISelect }
	get Relationship() { return this.$['Relationship'] as UISelect }
	get FirstName() { return this.$['FirstName'] as PaperInputElement }
	get LastName() { return this.$['LastName'] as PaperInputElement }
	// get State() { return this.$['State'] as PaperInputElement }
	// get Company() { return this.$['Company'] as PaperInputElement }
	get AccountPhone() { return this.$['AccountPhone'] as PaperInputElement }
	get AccountEmail() { return this.$['AccountEmail'] as PaperInputElement }
	get Organization() { return this.$['Organization'] as PaperInputElement }
	get Description() { return this.$['Description'] as PaperInputElement }
	

	constructor()
	{
		super()
	}

	connectedCallback()
	{
		super.connectedCallback()


		if (this.TypeList?.length > 0) { this.TypeSelected = this.TypeList[0] }
		if (this.OrgtypeList?.length > 0) { this.OrgtypeSelected = this.OrgtypeList[0] }
		if (this.RelationshipList?.length > 0) { this.RelationshipSelected = this.RelationshipList[0] }
	}

	ready()
	{
		super.ready()

		var textarea:any = this.Description
		var handler = () =>
		{
			var w = timeOut.after(150) //resize ? timeOut.after(1000) : microTask
			this._resizeDebouncer = Debouncer.debounce(this._resizeDebouncer, w, () =>
			{
				// textarea.style.cssText = 'height:auto;' // padding:0
				// for box-sizing other than "content-box" use:
				// el.style.cssText = '-moz-box-sizing:content-box';
				var css = 'height:' + (textarea.scrollHeight) + 'px'
				if (textarea.style.cssText != css)
				{
					textarea.style.cssText = css
				}
			})
		}
		window.addEventListener('resize', handler, EventPassiveDefault.optionPrepare())
		textarea.addEventListener('keydown', handler, EventPassiveDefault.optionPrepare())

		// Type of feedback: (custom design request, question, suggestion, issue) First Name, Last name, Email, Phone, Team Name, Sport, Age Group, Team Gender, Logo upload, text description

		this.CountrySelected = this.CountryList && this.CountryList.length ? this.CountryList[231] : null
	}

	onSubmit(e)
	{
		if (!this._validateForm()) { return }
		var descriptionTxt = this.Description.value
		if (typeof descriptionTxt == 'string') { descriptionTxt = descriptionTxt.trim() }
		if (descriptionTxt == '') { return }

		if (!this.netbase) { this.netbase = new NetBase() }
		this.loading = true
		
		var qp = {
			'TypeSelected': this.Type.value,
			'OrgtypeSelected': this.Orgtype.value,
			'RelationshipSelected': this.Relationship.value,

			'FirstName': this.FirstName.value,
			'LastName': this.LastName.value,

			// 'State': this.State.value,
			// 'Company': this.Company.value,
			// 'Country': this.CountrySelected,

			'AccountPhone': this.AccountPhone.value,
			'AccountEmail': this.AccountEmail.value,

			'Organization': this.Organization.value,
			'Description': descriptionTxt,
		}
		var url = '/api/v1.0/user/feedback'
		var rq = {
			url: url,
			body: qp,
			method: 'POST',
			onLoad: this._onRequestResponse.bind(this),
			onError: this._onRequestError.bind(this)
		}
		this.netbase._getResource(rq, 1, true)
		this.dispatchEvent(new CustomEvent('api-analytics-feedback', { bubbles: true, composed: true, detail: { action: 'submit', model: qp } }))
	}

	_validateForm(test?)
	{
		// if (this.model && this.model.PaymentMethod && this.model.PaymentMethod.id == "testPayment")
		// {
		//     return true //TODO: FOR TEST PURPOSES ONLY -> SERVER-SIDE VALIDATION BASED
		// }

		let form = this.$.container
		let firstInvalid = false
		var piList = form.querySelectorAll('paper-input,ui-select') //,textarea

		for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
		{
			if (pi.disabled || pi.hidden) { continue }

			if (pi.validate())
			{
				pi.invalid = false
			}
			else
			{
				if (!firstInvalid)
				{
					firstInvalid = true

					// announce error message
					if (pi.errorMessage)
					{
						//var ns = pi.nextElementSibling
						// console.log(pi.errorMessage)
						var em = pi.errorMessage
						this.dispatchEvent(new CustomEvent('announce', {
							bubbles: true, composed: true,
							detail: pi.errorMessage
						}))
					}

					this._focusAndScroll(pi)
				}
				// pi.setAttribute('aria-invalid', 'true')
			}
		}

		return !firstInvalid;
	}

	_onRequestResponse(event)
	{
		this.loading = false 
		var r = event['response']
		if (r && r['success'])
		{
			// var v = r['result']

			this.dispatchEvent(new CustomEvent('api-show-dialog', {
				bubbles: true, composed: true, detail: {
					announce: this.localize('feedback-sent-announce'),
					message: this.localize('feedback-sent-msg'),
					buttons: [
						{
							title: this.localize('feedback-sent-ok'),
							ontap: (e) => 
							{
							}
						},
					],
					errorid: r?.errorid ? r.errorid : null,
					devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
				}
			}))

			this.Description.value = ''
		}
		else
		{
			this._onRequestError(event)
		}
	}

	_onRequestError(event)
	{
		this.loading = false 
		// console.error(event)
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
			title: this.localize('feedback-title-document') 
		}}))
	}

	_computedCountryList()
	{
		let clst = this.localizeGetKeys('country-')
		return clst.map(i => 
		{ 
			return {
				id: i.replace('country-', ''),
				title: this.localize(i),
			} 
		})
	}

	_typeSelectedChanged(v, o)
	{
		// console.log(v)
		if (v?.id == 'request_plugin_access' && !this.userInfo?.isAuth)
		{
			var barr = [
				{
					title: this.localize('app-access-denied-ok'),
					ontap: (te) => 
					{
						//do nothing due it is may be a validation_failed...or sothing UI preserve is required
						// window.location.href = window.location.href
						this.TypeSelected = o
					}
				},
				{
					title: this.localize('app-access-denied-signin'),
					ontap: (e) =>
					{
						this.dispatchEvent(new CustomEvent('ui-user-auth', {
							bubbles: true, composed: true, detail: {
								signin: true
							}
						}))
					}
				},
			]
			this.dispatchEvent(new CustomEvent('api-show-dialog', {
				bubbles: true, composed: true, detail: {
					required: true,
					announce: '',
					message: this.localize('feedback-request_plugin_access-auth-required'),
					buttons: barr,
				}
			}))

		}
	}

	_typeChanged(queryParams_id, visible)
	{
		if (queryParams_id && visible)
		{
			var s = this.TypeList.filter(i => i.id == queryParams_id)
			this._typeDebouncer = Debouncer.debounce(this._typeDebouncer, timeOut.after(17), () =>
            {
				this.set('TypeSelected', s.length > 0 ? Object.assign({}, s[0]) : this.TypeSelected)
            })
		}		
	}

	_computedTypeListLoc(TypeList)
	{
		if (!Array.isArray(TypeList)) { return TypeList }
		
		return TypeList.map(i => { 
			i.title = this.localize('feedback-opt-' + i.id)
			return i
		})
	}



	_orgtypeSelectedChanged(v, o)
	{
		//TODO
	}

	_orgtypeChanged(queryParams_oid, visible)
	{
		if (queryParams_oid && visible)
		{
			var s = this.OrgtypeList.filter(i => i.id == queryParams_oid)
			this._orgtypeDebouncer = Debouncer.debounce(this._orgtypeDebouncer, timeOut.after(17), () =>
            {
				this.set('OrgtypeSelected', s.length > 0 ? Object.assign({}, s[0]) : this.OrgtypeSelected)
            })
		}		
	}

	_computed_OrgtypeListLoc(relationshipList)
	{
		if (!Array.isArray(relationshipList)) { return relationshipList }
		
		return relationshipList.map(i => { 
			i.title = this.localize('feedback-orgtype-opt-' + i.id)
			return i
		})
	}

	_computed_OrganizationTitleLoc(orgtypeSelected)
	{
		return this.localize('feedback-orgtype-opt-' + orgtypeSelected?.id) 
	}

	_relationshipSelectedChanged(v, o)
	{
		//TODO
	}

	_relationshipChanged(queryParams_rid, visible)
	{
		if (queryParams_rid && visible)
		{
			var s = this.RelationshipList.filter(i => i.id == queryParams_rid)
			this._relationshipDebouncer = Debouncer.debounce(this._relationshipDebouncer, timeOut.after(17), () =>
            {
				this.set('RelationshipSelected', s.length > 0 ? Object.assign({}, s[0]) : this.RelationshipSelected)
            })
		}		
	}

	_computedRelationshipListLoc(relationshipList)
	{
		if (!Array.isArray(relationshipList)) { return relationshipList }
		
		return relationshipList.map(i => { 
			i.title = this.localize('feedback-relationship-opt-' + i.id)
			return i
		})
	}

	_computed_RelationshipTitleLoc(orgtypeLoc)
	{
		return this.localize('feedback-relationship-title', 'rel', orgtypeLoc)
	}

	_computedSubmenu(userInfo, userInfoP)
	{
		return TeamaticalApp.menuHelp(this, userInfo, userInfoP)
	}
}
