import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-grid/vaadin-grid-selection-column.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, deepClone, sleep } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { NetBase } from '../../components/bll/net-base'
import { UIAdminDialog } from '../ui/ui-dialog'
import view from './deal-profile.ts.html'
import style from './deal-profile.ts.css'
import style_shared from './shared-styles.css'
import '../ui/ui-changes-history'
import '../../components/ui/ui-select'
import '../shared-styles/common-styles'
import 'multiselect-combo-box'
// import BpmnViewer from 'bpmn-js'
import CliModule from 'bpmn-js-cli'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider'
import AppendContextPadProvider from 'bpmn-js/lib/features/create-append-anything/AppendContextPadProvider'
import PaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider'
import style_diagram from 'bpmn-js/dist/assets/diagram-js.css'
import style_bpmn from 'bpmn-js/dist/assets/bpmn-js.css'
import style_bpmnfont from 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']




@FragmentDynamic
class AdminDealProfile extends FragmentBase
{
    static get is() { return 'tmladmin-deal-profile' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}${style_diagram}${style_bpmn}${style_bpmnfont}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/dealprofile/' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['dealid'] },

            saving: { type: Boolean, notify: true, readOnly: true, },
            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
			loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            isDiagram: { type: Boolean, value: false },
			membersList: { type: String, computed: '_compute_membersList(order.Members)' },
			membersListNew: { type: String, computed: '_compute_membersListNew(order.Members, order.Relations, order.Relations.*)' },
			membersListNewSelected: { type: Object },
			variableToAdd: { type: Object },

			allowAddTasks: { type: Boolean, computed: '_compute_allowAddTasks(order.Members, order.Relations, order.Relations.*)' },
        }
    }

    _netbase: any
    _observer: any
	variableToAdd: any
    hasUnsavedChanges: boolean
    editTitle: any
    editBtn: any
    editType: any
    editSource: any
    editSource_A: any
    editSource_I: any
    gridCellClassNameGenerator: any
    api_action: any
    order: any
    selectedProductionTemplateSvg: any
    _grid_SourceEvent: any
    zoomimgi: any
    zoomimgiName: string
    diagramJs: any
	membersList: any
	_lockRel: boolean
	_lastHash = 0
	_building = false
	isDiagram: boolean
	_variableDebouncer: Debouncer


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_diagramBuild(order, isDiagram)',
            // '_diagramUpdate(order.Relations.*)',
        ]
    }
    _log(v) { console.log('deal-profile', v) }


    connectedCallback()
    {
        super.connectedCallback()

        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    disconnectedCallback()
    {
        if (this.diagramJs) {  this.diagramJs.detach() }

        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveDealProfileTap()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()
        }
    }
    
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        // if (orderP?.path == 'order.IsProductConfigurationCheckerboard' || orderP?.path == 'order.IsProductConfigurationTexts') { return false }

        // try
        // {
        //     var orderSavedObj = orderSaved ? JSON.parse(orderSaved) : {}
        //     orderSavedObj.ProductConfiguration = order.ProductConfiguration
        //     orderSaved = JSON.stringify(orderSavedObj)
        // }
        // catch
        // {
        // }

        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

	_onLoadResult(order: any) 
	{
		if (order?.Variables?.length > 0)
		{
			this.set('variableToAdd', order.Variables[0])
		}
		return order
	}

    hideSaveBtn(deal)
    {
        return false
    }

	_dis_discard(loadingAny, orderIsDraft, hasUnsavedChanges)
	{
		return loadingAny || !orderIsDraft || hasUnsavedChanges
	}
	
    // hideCloneBtn(deal)
    // {
    //     return !deal || !deal.DealProfileID || deal.DealProfileID == '_new_'
    // }

    // cloneDealProfileTap(e)
    // {
    //     var url = this._urlViewDealProfile('_new_', undefined, this.order?.DealProfileID)
    //     this._goto(url)

    //     e.preventDefault()
    //     e.stopPropagation()
    //     return false
    // }

    saveDealProfileTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveDealProfileConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._setSaving(true)
        this._postData(this.order, (newmodel) =>
        {
            this._setSaving(false)
            if (oldmodel?.DealProfileID != newmodel?.DealProfileID)
            {
                var qp = { dealid: newmodel?.DealProfileID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

	discardDraftTap(e)
	{
		this.api_action = 'draft-discard'
        var oldmodel = Object.assign({}, this.order)
        this._setSaving(true)
        this._postData(this.order, (newmodel) =>
        {
            this._setSaving(false)
            if (oldmodel?.DealProfileID != newmodel?.DealProfileID)
            {
                var qp = { dealid: newmodel?.DealProfileID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
	}

    onInputChanged(e)
    {
		if (e.model?.__data?.parti)
		{
			var partinx = e.model.__data.partinx
			var relinx = e.model.__dataHost.__dataHost.__data.relinx
            this.set(`order.Relations.${relinx}.TransactionLimit.${partinx}.notvalid.Coefficient`, '')
		}
		else if (e.model?.__data?.reli?.notvalid)
        {
			var relinx = e.model?.__data?.relinx
			this.set(`order.Relations.${relinx}.notvalid.${e.target.name}`, '')
			// this._variableDebouncer = Debouncer.debounce(this._variableDebouncer, timeOut.after(200), () =>
			// {
			// 	this.notifyPath(`order.Relations.${relinx}`)
			// })
        }
		else if (e?.target?.__dataHost?.__data?.dialogrelation?.reli?.notvalid)
		{
			this.set(`dialogrelation.reli.notvalid.${e.target.name}`, '')
		}
        return this._onInputChanged(e)
    }

	_diagramAddOverlays(connecti, reliTransactionLimit, overlays)
	{
		// 0.3 * Infinity (∞)
		// -2 * (unit of sale currency)
		// + (shipping estimation)
		if (reliTransactionLimit?.length > 0)
		{
			var html = `<div class="diagram-note"><ul class="formula-list">`
			for (var i in reliTransactionLimit)
			{
				var partTitle = reliTransactionLimit[i].Variable.id == 'infinity' ? '∞' : reliTransactionLimit[i].Variable.title
				if (partTitle.indexOf(' ') >= 0) { partTitle = `(${partTitle})` }
				var partK = reliTransactionLimit[i].Coefficient
				try 
				{ 
					var v = parseFloat(reliTransactionLimit[i].Coefficient)
					partK = `${v >= 0 ? '+' : '-'} ${Math.abs(v).toFixed(2)}`
				} 
				catch {}
				html += `<li>${partK}&nbsp;×&nbsp;${partTitle}</li>`
			}
			html += `</ul></div>`
			overlays.add(connecti.id, 'note', {
				position: {
					top: 16,
					left: -200,
				},
				html: html
			})
		}
	}

	_diagramAddConnection(reli, memberShapes, modeling, elementRegistry, overlays)
	{
		var srcShapeID = memberShapes[reli.Source.id]
		var destShapeID = memberShapes[reli.Destination.id]
		console.log(`${reli.Source.id} (${srcShapeID})`, '->', `${reli.Destination.id} (${destShapeID})`)
		if (!srcShapeID || !destShapeID) { return }
		
		// console.log(srcShapeID, '->', destShapeID)
		
		var connecti = modeling.connect(elementRegistry.get(srcShapeID), elementRegistry.get(destShapeID))
		var disti = `${reli.Distance ? reli.Distance : '' }`
		// console.log(reli.metaConnectionID, '=', connecti.id)
		reli.metaConnectionID = connecti.id
		connecti.businessObject.name = disti
		modeling.updateLabel(connecti, disti)
		// var metarelid = `${reli.Source.id}-${reli.Destination.id}`
		// var metad = deal_profile?.Metadata?.Relations[metarelid]
		// if (this._asBool(metad?.waypoints)) { connecti.waypoints = metad.waypoints }

		this._diagramAddOverlays(connecti, reli.TransactionLimit, overlays)
	}

	async _diagramUpdate(drP)
	{
		if (!this.diagramJs || this._lockRel) { return }

		if (drP.path == 'order.Relations' || drP.path == 'order.Relations.length')
		{
			//do nothing
		}
		else if (drP.path == 'order.Relations.splices')
		{
			const bpmnModeler = this.diagramJs
			const modeling = bpmnModeler.get('modeling')
			const elementRegistry = bpmnModeler.get('elementRegistry')
			if (drP.value.indexSplices[0].removed?.length > 0)
			{
				var reli = drP.value.indexSplices[0].removed[0]
				var connecti = elementRegistry.get(reli.metaConnectionID)
				if (connecti) { modeling.removeElements([connecti]) }
			}
		}
		else if (drP.path.indexOf('order.Relations.') >= 0 && drP.path.indexOf('.', 'order.Relations.'.length) < 0 && this.diagramJs)
		{
			const bpmnModeler = this.diagramJs
			const modeling = bpmnModeler.get('modeling')
			const elementRegistry = bpmnModeler.get('elementRegistry')
			const overlays = bpmnModeler.get('overlays')
			var reli = drP.value
			var elementi = elementRegistry.get(reli.metaConnectionID)
			if (reli.Source.id == elementi.businessObject.sourceRef.id 
				&& reli.Destination.id == elementi.businessObject.targetRef.id)
			{
				//Distance
				modeling.updateLabel(elementi, reli.Distance)
				//update Parts
				var connecti = elementRegistry.get(reli.metaConnectionID) 
				overlays.remove({element: connecti})
				this._diagramAddOverlays(connecti, reli.TransactionLimit, overlays)
			}
			else
			{
				// var connecti = elementRegistry.get(reli.metaConnectionID) 
				await this._diagramBuild(this.order, this.isDiagram)
			}
		}
	}

    async _diagramBuild(deal_profile, isDiagram)
    {
      	if (!deal_profile || !isDiagram) { return }
		var hash = StringUtil.hashCode(JSON.stringify(deal_profile))
		if (this._lastHash == hash) { return }

		// check hash of deal_profile and rebuild if necessary
		var bpmnModeler: BpmnModeler
		if (!this.diagramJs)
		{
			this._attachHeadStyle(style_bpmnfont, 'bpmn-font') //attach icons
			var opts: any = {
				container: this.shadowRoot?.querySelector('#diagram-container'),
				keyboard: { bindTo: this.shadowRoot?.querySelector('#diagram-container') }, 
				moddleExtensions: {},
				additionalModules: [
					// CustomRules
				]
			}
			if (this._dev) 
			{ 
				opts.additionalModules.push(CliModule)
				opts['cli'] = { bindTo: 'cli' }
			}

			bpmnModeler = new BpmnModeler(opts)
			bpmnModeler._container.querySelector('a[href="http://bpmn.io"]')?.remove() //remove logo
			var uipalette = bpmnModeler._container.querySelector('.djs-palette')
			if (uipalette)
			{
				// uipalette.style.display = 'none'
				uipalette.querySelector('[data-action="create"]').style.display = 'none'
			}
			this.diagramJs = bpmnModeler

			var eventBus = bpmnModeler.get('eventBus')
			eventBus.on('element.dblclick', 999999, (e) => this._elementDblClick(e))
			eventBus.on('element.changed', 999999, (e) => this._elementChanged(e))
			eventBus.on('connection.changed', 999999, (e) => this._connectionChanged(e))
			eventBus.on('connection.removed', 999999, (e) => this._connectionRemoved(e))
			eventBus.on('shape.added', 999999, (e) => this._shapeAdded(e))
			// eventBus.on('shape.changed', 999999, (e) => this._logEvent(e))
			// eventBus.on('keyboard.keyup', 10000, (e) => this._logEvent(e))

			var canvas = bpmnModeler.get('canvas')
			canvas._container.addEventListener('dblclick', (e) => 
			{ 
				if (e.target.getAttribute('data-element-id') == 'Process_1')
				{
					canvas.zoom('fit-viewport', 'auto')
				}
			})

		}
		else
		{
			bpmnModeler = this.diagramJs
		}

		try 
        {
			var canvas = bpmnModeler.get('canvas')
			var overlays = bpmnModeler.get('overlays')
			var modeling = bpmnModeler.get('modeling')
			var elementRegistry = bpmnModeler.get('elementRegistry')
			var elementFactory = bpmnModeler.get('elementFactory')
			var distributeElements = bpmnModeler.get('distributeElements')
			// var	alignElements = bpmnModeler.get('alignElements')

			this._building = true

			await bpmnModeler.createDiagram()
			const process = elementRegistry.get('Process_1')
			const startEvent = elementRegistry.get('StartEvent_1')
			modeling.removeElements([ startEvent ])

			const grid_gap = 350
			var x = 350, y = grid_gap * 2
			var memberShapes = {}
			var membersHasRelations = {}
			for (var i in deal_profile.Relations)
			{
				var reli = deal_profile.Relations[i]
				membersHasRelations[reli.Source.id] = 1
				membersHasRelations[reli.Destination.id] = 1
			}
			var deal_profileMembers = deal_profile.Members.filter(i => membersHasRelations[i.id])
			for (var i in deal_profileMembers)
			{
				var memi = deal_profileMembers[i]
				var taski = elementFactory.createShape({ type: "bpmn:Task" })
				taski.businessObject.id = memi.id
				taski.businessObject.name = memi.title

				var ii = parseInt(i)
				var memprevi = (ii - 1) >= 0 ? deal_profileMembers[(ii - 1).toString()] : null
				var isprofit = `${memprevi?.id}Profit` == `${memi?.id}`
				if (isprofit) { y = y - grid_gap } else { x += grid_gap }
				// var metad = deal_profile?.Metadata?.Members[memi.id]
				// if (this._asBool(metad?.x)) { x = metad.x }
				// if (this._asBool(metad?.y)) { y = metad.y }
				// if (!metad) 
				// {
				// 	if (!deal_profile.Metadata) { deal_profile.Metadata = { Members: {} } }
				// 	deal_profile.Metadata.Members[memi.id] = { x: x, y: y }
				// }
				var shapei = modeling.createShape(taski, { x: x, y: y }, process)
				if (isprofit) { y = y + grid_gap }

				memberShapes[memi.id] = shapei.id

				// add marker
				if (isprofit) { canvas.addMarker(shapei.id, 'needs-discussion') }
			}

			for (var i in deal_profile.Relations)
			{
				var reli = deal_profile.Relations[i]
				this._diagramAddConnection(reli, memberShapes, modeling, elementRegistry, overlays)
			}

			var shapes = Object.values(memberShapes).map(i => elementRegistry.get(i))
			distributeElements.trigger(shapes, 'horizontal')

			// alignElements.trigger(shapes, 'middle')
			// const { xml } = await bpmnModeler.saveXML({format: true})
			// await bpmnModeler.importXML(layoutedDiagramXML)

			canvas.zoom('fit-viewport', 'auto')
			this._building = false
        } 
        catch (err) 
        {
			this._building = false
            const { warnings, message } = err
            console.error('error rendering', err)
        }
    }

	_logEvent(e)
	{
		if (this._building) { return }
		console.log(e)
	}

	_shapeAdded(e)
	{
		if (this._building) { return }
		// console.log(e)

		if (e.element.type == 'bpmn:Task')
		{
			var membersHasRelations = {}
			if (Array.isArray(this.order.Relations))
			{
				for (var i in this.order.Relations)
				{
					var reli = this.order.Relations[i]
					membersHasRelations[reli.Source.id] = 1
					membersHasRelations[reli.Destination.id] = 1
				}
			}
			var mlist = this.order.Members.filter(i => !membersHasRelations[i.id])
			var msel = this.order.Members.filter(i => !membersHasRelations[i.id] && i.id == this.membersListNewSelected?.id)
			var taski = e.element
			if (mlist?.length > 0)
			{
				taski.businessObject.id = msel?.length > 0 ? msel[0]?.id : mlist[0].id
				taski.businessObject.name = msel?.length > 0 ? msel[0]?.title : mlist[0].title
			}
		}
	}

	_connectionRemoved(e) 
	{
		if (this._building) { return }

		for (var inx in this.order.Relations)
		{
			if (this.order.Relations[inx].Source.id == e.element.businessObject.sourceRef.id
				&& this.order.Relations[inx].Destination.id == e.element.businessObject.targetRef.id)
			{
				this._lockRel = true
				try { this.splice('order.Relations', parseInt(inx), 1) } catch {}
				this._lockRel = false
				break
			}
		}
	}

	_connectionChanged(e) 
	{
		if (this._building) { return }

		var connectionWas = false
		for (var inx in this.order.Relations)
		{
			if (this.order.Relations[inx].Source.id == e.element.businessObject.sourceRef.id
				&& this.order.Relations[inx].Destination.id == e.element.businessObject.targetRef.id)
			{
				// console.warn(this.order.Relations[inx].metaConnectionID, '~', e.element.id)
				connectionWas = true
				break
			}
		}
		
		if (!connectionWas) 
		{
			var relationWasInx = -1
			var relationWasAr = this.order.Relations.filter((i, inx, arr) => {
				var v = i.metaConnectionID == e.element.id
				if (v) { relationWasInx = inx}
				return v
			})
			if (relationWasInx >= 0) 
			{ 
				this._lockRel = true
				try { this.splice('order.Relations', relationWasInx, 1) } catch {} 
				this._lockRel = false
			}
			var relationWas = relationWasAr?.length > 0 ? relationWasAr[0] : null
			try 
			{ 
				var srcid = e.element.businessObject.sourceRef.id 
				var destid = e.element.businessObject.targetRef.id 
				var newR: any = {
					metaConnectionID: e.element.id,
					Source: { id: srcid, title: this._findItem(this.membersList, srcid)?.title },
					Destination: { id: destid, title: this._findItem(this.membersList, destid)?.title },
					TransactionLimit: relationWas ? relationWas.TransactionLimit : [],
					Distance: relationWas ? relationWas.Distance : '0',
				}
				this._lockRel = true
				this.push('order.Relations', newR) 
				this._lockRel = false
			} 
			catch 
			{}
		}
	}

	_elementDblClick(e) 
	{
		if (e.element.type == 'bpmn:Task') //prevent editing task (Member)
		{
			return false
		}
	}

	_elementChanged(e) 
	{
		if (this._building) { return }

		if (e.element.type == 'bpmn:SequenceFlow')
		{
			var relationWasInx = -1
			var relationWasAr = this.order.Relations.filter((i, inx, arr) => {
				var v = i.metaConnectionID == e.element.id
				if (v) { relationWasInx = inx}
				return v
			})
			if (relationWasInx >= 0)
			{
				var relationWas = relationWasAr[0]
				if (relationWas.Distance != e.element.businessObject.name)
				{
					this._lockRel = true
					try { this.set(`order.Relations.${relationWasInx}.Distance`, e.element.businessObject.name) } catch {}
					this._lockRel = false
				}

				// var metadata = this.order.Metadata
				// if (!metadata) { metadata = { Members: {}, Relations: {} } }
				// var id = `${e.element.businessObject.sourceRef.id}-${e.element.businessObject.targetRef.id}`
				// metadata.Relations[id] = Object.assign(metadata.Relations[id] ? metadata.Relations[id] : {}, { waypoints: e.element.waypoints, })
				// this.set('order.Metadata', metadata)
			}
		}
		else if (e.element.type == 'bpmn:Task')
		{
			var memberWasInx = -1
			var memberWasAr = this.order.Members.filter((i, inx, arr) => {
				var v = i.id == e.element.businessObject.id
				if (v) { memberWasInx = inx}
				return v
			})
			if (memberWasInx >= 0)
			{
				// var memberWas = memberWasAr[0]
				// var metadata = this.order.Metadata
				// if (!metadata) { metadata = { Members: {}, Relations: {} } }
				// var id = e.element.businessObject.id
				// metadata.Members[id] = Object.assign(metadata.Members[id] ? metadata.Members[id] : {}, {
				// 	x: e.element.x,
				// 	y: e.element.y,
				// })
				// this.set('order.Metadata', metadata)
			}
		}
	}


	_findItem(list, id)
	{
		if (!Array.isArray(list)) { return null }
		for (var i in list)
		{
			if (list[i].id == id) { return list[i]; break }
		}
		return null
	}

	_title(obj)
	{
		return !obj ? obj : obj.title
	}

	_formatParts(parts)
	{
		if (!Array.isArray(parts)) { return '' }
		return parts.map(i => { return `${this._title(i.Variable)}(${i.Coefficient})` }).join(', ')
	}

	downwardRelationTap(e)
	{
		var reli = e.model.__data.reli
        var inx = -1
        for (var i in this.order.Relations)
        {
            if (this.order.Relations[i] && reli && this.order.Relations[i] === reli)
            {
                inx = this.order.Relations.indexOf(this.order.Relations[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.Relations.length) { return }

		this._lockRel = true
        var el = this.splice('order.Relations', inx, 1)
        this.splice('order.Relations', inxto, 0, el[0])
		this._lockRel = false
	}

	upwardRelationTap(e)
	{
		var reli = e.model.__data.reli
        var inx = -1
        for (var i in this.order.Relations)
        {
            if (this.order.Relations[i] && reli && this.order.Relations[i] === reli)
            {
                inx = this.order.Relations.indexOf(this.order.Relations[i])
                break
            }
        }

        if (inx === -1) { return }
        var inxto = inx - 1
        if (inxto < 0) { return }

		this._lockRel = true
        var el = this.splice('order.Relations', inx, 1)
        this.splice('order.Relations', inxto, 0, el[0])
		this._lockRel = false
	}

	removeRelationTap(e)
	{
		var relinx = e?.model?.__data?.relinx
		this.splice(`order.Relations`, relinx, 1)
		this.notifyPath(`order.Relations`)
		e.preventDefault()
        return false
	}

	addRelationTap(e)
	{
		var newR: any = {}
		var newR: any = {
			"Source": this.membersList?.length > 0 ? this.membersList[0] : {},
			"Destination": this.membersList?.length > 0 ? this.membersList[0] : {},
			"TransactionLimit": [],
			"Distance": 0
		}
		this.unshift(`order.Relations`, newR)
	}

	editRelationTap(e)
	{
		var reli = e?.model?.__data?.reli
		var relinx = e?.model?.__data?.relinx

        var dialogrelation = this.$.dialogrelation as UIAdminDialog
        if (dialogrelation && reli)
        {
			reli = deepClone(Object.assign(reli, { Parts: reli.TransactionLimit.map(i => { return { id: i.Variable.id, title: i.Variable.title } }) }))
            this.set('dialogrelation', Object.assign({ 
                relinx: relinx,
                reli: reli,
            }))
            dialogrelation.open()
        }

		e.preventDefault()
        return false
	}
	
	dialogrelation: any
	editRelationApplyTap(e)
    {
        if (!this.dialogrelation) { return }

		var reli = deepClone(this.dialogrelation.reli)
		var oldParts = reli.TransactionLimit
		reli.TransactionLimit = []
		for (var i in reli.Parts)
		{
			reli.notvalid = {}
			reli.TransactionLimit[i] = {
				notvalid: {},
				Variable: reli.Parts[i],
				Coefficient: i < oldParts.length ? oldParts[i].Coefficient : '1',
			}
		}
		delete reli.Parts
		this.set(`order.Relations.${this.dialogrelation.relinx}`, reli)
    }

	addVariableTap(e)
	{
		// var reli = e.model.__data.reli
		var relinx = e.model.__data.relinx
		this.push(`order.Relations.${relinx}.TransactionLimit`, 
		{
			notvalid: {},
			Variable: Object.assign({}, this.variableToAdd),
			Coefficient: '1',
		})
	}
	
	removeVariableTap(e)
	{
		var partinx = e.model.__data.partinx
		var relinx = e.model.__dataHost.__dataHost.__data.relinx
		try { this.splice(`order.Relations.${relinx}.TransactionLimit`, partinx, 1) } catch {}
	}

	membersListNewSelected: any
	_compute_membersListNew(members, relations, relationsP)
	{
		if (!Array.isArray(members)) { return members }

		var r = members.filter(i => i.id == this.membersListNewSelected?.id)
		if (r?.length < 1 && members?.length > 0)
		{
			this.set('membersListNewSelected', members[0]) 
		}

		var membersHasRelations = {}
		if (Array.isArray(relations))
		{
			for (var i in relations)
			{
				var reli = relations[i]
				membersHasRelations[reli.Source.id] = 1
				membersHasRelations[reli.Destination.id] = 1
			}
		}
		return members.filter(i => !membersHasRelations[i.id])
	}

	_compute_membersList(members)
	{
		var list: any = [{ id: 'NA', title: 'N/A' }]
		if (Array.isArray(members))
		{
			list = list.concat(members)
		}
		return list
	}

	_compute_allowAddTasks(members, relations, relationsP)
	{
		var membersHasRelations = {}
		if (Array.isArray(relations))
		{
			for (var i in relations)
			{
				var reli = relations[i]
				membersHasRelations[reli.Source.id] = 1
				membersHasRelations[reli.Destination.id] = 1
			}
		}
		var r = Object.keys(membersHasRelations).length !== members?.length
		window.allowAddTask = r
		return r
	}

}

//#region Bpmn tunes

var _getPaletteEntries = PaletteProvider.prototype.getPaletteEntries
const myPalette = { "hand-tool": 1, "lasso-tool": 1, "space-tool": 1, "global-connect-tool": 1, } // "tool-separator": 1, "create.task": 1 }
const myPaletteEnd = { "hand-tool": 1, "lasso-tool": 1, "space-tool": 1, "global-connect-tool": 1, }
//[ "hand-tool", "lasso-tool", "space-tool", "global-connect-tool", "tool-separator", "create.start-event", "create.intermediate-event", "create.end-event", "create.exclusive-gateway", "create.task", "create.data-object", "create.data-store", "create.subprocess-expanded", "create.participant-expanded", "create.group" ]
PaletteProvider.prototype.getPaletteEntries = function(element) 
{
	var entries = _getPaletteEntries.apply(this)
	if (entries)
	{
		var allowAddTask = window.allowAddTask
		for (var i of Object.keys(entries))
		{
			if ((allowAddTask && myPalette[i]) || (!allowAddTask && myPaletteEnd[i])) { continue }
			delete entries[i]
		}
	}
    return entries 
}


const myContextCon = { "delete": 1, } //append
const myContextTaskEnd = { "connect": 1, "delete": 1 }
const myContextTask = { "append.append-task": 1, "connect": 1, "delete": 1 } 
//[ "append.end-event", "append.gateway", "append.append-task", "append.intermediate-event", "replace", "append.text-annotation", "connect", "delete" ]
const _getContextPadEntries = ContextPadProvider.prototype.getContextPadEntries
ContextPadProvider.prototype.getContextPadEntries = function(element) 
{
    const entries = _getContextPadEntries.apply(this, [ element ])
	if (entries)
	{
		var allowAddTask = window.allowAddTask
		for (var i of Object.keys(entries))
		{
			if (element.type == 'bpmn:Task' && ((allowAddTask && myContextTask[i]) || (!allowAddTask && myContextTaskEnd[i]))) { continue }
			if (element.type == 'bpmn:SequenceFlow' && myContextCon[i]) { continue }
			delete entries[i]
		}
	}
	return entries
}


const _getAppendContextPadEntries = AppendContextPadProvider.prototype.getContextPadEntries
AppendContextPadProvider.prototype.getContextPadEntries = function(element) 
{
    const entries = _getAppendContextPadEntries.apply(this, [ element ])
	if (entries)
	{
		var allowAddTask = window.allowAddTask
		for (var i of Object.keys(entries))
		{
			if (element.type == 'bpmn:Task' && ((allowAddTask && myContextTask[i]) || (!allowAddTask && myContextTaskEnd[i]))) { continue }
			if (element.type == 'bpmn:SequenceFlow' && myContextCon[i]) { continue }
			delete entries[i]
		}
	}
	return entries
}

//#endregion Bpmn tunes
