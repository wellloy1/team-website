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
import view from './deal-profile-simulation.ts.html'
import style from './deal-profile-simulation.ts.css'
import style_shared from './shared-styles.css'
import '../ui/ui-changes-history'
import '../../components/ui/ui-select'
import '../shared-styles/common-styles'
import 'multiselect-combo-box'
import CliModule from 'bpmn-js-cli'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import PaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider'
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider'
import AppendContextPadProvider from 'bpmn-js/lib/features/create-append-anything/AppendContextPadProvider'
// import AlignElementsMenuProvider from 'bpmn-js/lib/features/align-elements/AlignElementsMenuProvider'
// import AlignElementsContextPadProvider from 'bpmn-js/lib/features/align-elements/AlignElementsContextPadProvider'
// import DistributeElementsMenuProvider from 'bpmn-js/lib/features/distribute-elements/DistributeElementsMenuProvider'
// import EditorActions from 'diagram-js/lib/features/editor-actions/EditorActions'
import style_diagram from 'bpmn-js/dist/assets/diagram-js.css'
import style_bpmn from 'bpmn-js/dist/assets/bpmn-js.css'
import style_bpmnfont from 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const DiagramXmlVersion = "2"
const isFullEditor = false// Teamatical.BuildEnv == 'Development'



@FragmentDynamic
class AdminDealProfileSimulation extends FragmentBase
{
    static get is() { return 'tmladmin-deal-profile-simulation' }

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

            APIPath: { type: String, value: '/admin/api/dealprofile/simulation-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pconfigid'] },

            saving: { type: Boolean, notify: true, readOnly: true, },
            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
			loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

			showVariables: { type: Boolean, value: true },
			dialogrevert: { type: Object, value: {} },

			obligationsReport: { type: Array, computed: '_compute_obligationsReport(order.Seller, order.Brand, order.Teamatical, order.Factory)' },
        }
    }

	//#region Vars

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
	_variableDebouncer: Debouncer

	//#endregion Vars


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_diagramBuild(order)',
			'_showVariablesChanged(showVariables)',
        ]
    }
    _log(v) { console.log('deal-profile-simulation', v) }


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
            this.simulateTap()
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
        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

	_onLoadResult(order: any) 
	{
		return order
	}

    hideSaveBtn(deal)
    {
        return false
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

	showVariables: boolean
	async _showVariablesChanged(showVariables)
	{
		var bpmnModeler: BpmnModeler = this.diagramJs
		if (!bpmnModeler) { return }

		if (showVariables)
		{
			var xmlR = await bpmnModeler.saveXML()
			this.order.DiagramXml = xmlR?.xml
			this.order.DiagramXmlVersion = DiagramXmlVersion
			await this._diagramBuild(Object.assign({}, this.order))
		}
		else
		{
			var overlays = bpmnModeler.get('overlays')
			overlays.clear()
		}
	}

	revertDiagramXmlTap(e)
	{
		var newModel = deepClone(this.order)
		newModel.DiagramXml = ''
		this.set('order', newModel)
	}

	revertDiagramXmlConfirmDialogTap(e)
	{
        var dialogrevert = this.$.dialogrevert as UIAdminDialog
        if (dialogrevert)
        {
            dialogrevert.open()
        }
		e.preventDefault()
        return false
	}
	
    async simulateTap(e?)
    {
        this.api_action = 'update'
        this._setSaving(true)
		if (this.diagramJs)
		{
			var bpmnModeler: BpmnModeler = this.diagramJs
			var xmlR = await bpmnModeler.saveXML()
			this.order.DiagramXml = xmlR?.xml
			this.order.DiagramXmlVersion = DiagramXmlVersion
		}
        var oldmodel = Object.assign({}, this.order)
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

    async _diagramBuild(deal_profile)
    {
      	if (!deal_profile) { return }
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
			if (uipalette && !isFullEditor)
			{
				// uipalette.style.display = 'none'
				uipalette.querySelector('[data-action="create"]').style.display = 'none'
			}
			this.diagramJs = bpmnModeler
			var eventBus = bpmnModeler.get('eventBus')
			eventBus.on('element.dblclick', 999999, (e) => this._elementDblClick(e))
			eventBus.on('commandStack.connection.reconnect.canExecute', 999999, (e) => this._connectionReconnectCanExecute(e))
			// for (var i of Object.keys(eventBus._listeners)) { eventBus.on(i, 999999, (e) => this._logEvent(e)) }
		

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
			const gapx = 250
			const gapy = 150
			const membersCoord = {
				buyer: { x: 1 * gapx, y: 0.5 * gapy },
				emitter: { x: 1 * gapx, y: 4 * gapy }, 			//?
				seller: { x: 1 * gapx, y: 2 * gapy },
				sellerProfit: { x: 1 * gapx, y: 3 * gapy },
				paymentgw: { x: 3 * gapx, y: 1 * gapy },
				brandGate: { x: 3 * gapx, y: 2 * gapy }, 		//?
				brand: { x: 3 * gapx, y: 3 * gapy },
				brandProfit: { x: 3 * gapx, y: 4 * gapy },
				shippingCompany: { x: 3 * gapx, y: 5 * gapy },	//?
				teamatical: { x: 4 * gapx, y: 2 * gapy },
				teamaticalProfit: { x: 5 * gapx, y: 1 * gapy },
				factoryGate: { x: 5 * gapx, y: 2 * gapy },		//?
				factory: { x: 5 * gapx, y: 3 * gapy },
				factoryProfit: { x: 5 * gapx, y: 4 * gapy },
				tax: { x: 5 * gapx, y: 5 * gapy },				//?
			}

			this._building = true

			var updateModel = false
			var startShape: any
			var rootShape: any
			if (deal_profile?.DiagramXml && DiagramXmlVersion == deal_profile?.DiagramXmlVersion)
			{
				await bpmnModeler.importXML(deal_profile.DiagramXml)
				startShape = elementRegistry.get('StartEvent_1')
				rootShape = elementRegistry.get('Process_1') //root element
				updateModel = true
			}
			else 
			{
				var hasBuyer = deal_profile.Relations.filter(i => i.Source.id == "buyer")?.length > 0
				// rootShape = elementRegistry.get('Process_1') //root element
				// if (rootShape)
				// {
				// 	startShape = elementRegistry.get('StartEvent_1')
				// 	if (!startShape && hasBuyer) { modeling.appendShape(elementFactory.createShape({ type: 'bpmn:startEvent', id: 'StartEvent_1' })) }
				// 	//clear other shapes
				// }
				// else
				// {
				await bpmnModeler.createDiagram()
				startShape = elementRegistry.get('StartEvent_1')
				rootShape = elementRegistry.get('Process_1') //root element
				if (startShape && !hasBuyer) { modeling.removeElements([ startShape ]) }
			}

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
				var x = 0, y = 0
				var memCoord = membersCoord[memi.id]
				if (memCoord) { x = memCoord.x; y = memCoord.y }

				var shapei: any
				if (updateModel)
				{
					shapei = elementRegistry.get(memi.id)
				}
				else
				{
					shapei = memi.id != "buyer" ? modeling.createShape(elementFactory.createShape({ type: "bpmn:Task" }), { x: x, y: y }, rootShape) : null
					if (startShape && memi.id == "buyer") 
					{ 
						modeling.moveElements([startShape], { x: x - startShape.x - startShape.width / 2, y: y - startShape.y - startShape.height / 2 })
						modeling.updateLabel(startShape, `Buyer: ${deal_profile.PointOfPurchase.title}, #:${deal_profile.Quantity}`)
						shapei = startShape
					}
					shapei.businessObject.id = memi.id					
				}
				memberShapes[memi.id] = shapei.id
				
				if (memi.id == 'teamatical') { canvas.addMarker(shapei.id, 'teamatical-saas') } else { canvas.removeMarker(shapei.id, 'teamatical-saas') }
				if (memi.id.indexOf('Profit') >= 0) { canvas.addMarker(shapei.id, 'profit') } else { canvas.removeMarker(shapei.id, 'profit') }

				var shapetitle = memi.title
				if (memi.id == 'brand' && deal_profile?.Brand?.id) { shapetitle = `${deal_profile.Brand.title}` }
				if (memi.id == 'factory' && deal_profile?.Factory?.id) { shapetitle = `${deal_profile.Factory.title}` }
				if (memi.id == 'seller' && deal_profile?.Seller?.id) { shapetitle = `${deal_profile.Seller.title}` }
				if (memi.id == 'paymentgw' && deal_profile?.PaymentType?.id) { shapetitle = `${deal_profile.PaymentType.title}` }
				shapei.businessObject.name = shapetitle
				modeling.updateLabel(shapei, shapetitle)
			}
			var shapes = Object.values(memberShapes).map(i => elementRegistry.get(i))
			// console.log(memberShapes)

			distributeElements.trigger(shapes, 'horizontal')
			canvas.zoom('fit-viewport', 'auto')

			if (updateModel)
			{
				overlays.clear()
			}

			for (var i in deal_profile.Relations)
			{
				var reli = deal_profile.Relations[i]
				this._diagramAddConnection(i, reli, memberShapes, bpmnModeler, updateModel)
			}

			this._building = false
        } 
        catch (err) 
        {
			this._building = false
            const { warnings, message } = err
            console.error('error rendering', err)
        }
    }

	_diagramAddConnection(inx, reli, memberShapes, bpmnModeler, updateModel = false)
	{
		var modeling = bpmnModeler.get('modeling')
		var canvas = bpmnModeler.get('canvas')
		var elementRegistry = bpmnModeler.get('elementRegistry')

		var srcShapeID = memberShapes[reli.Source.id]
		var destShapeID = memberShapes[reli.Destination.id]
		// console.log(`(${inx}) ${reli.Source.id} (${srcShapeID})`, '->', `${reli.Destination.id} (${destShapeID})`)
		if (!srcShapeID || !destShapeID) { return }
		
		var connecti: any
		if (updateModel)
		{
			if (!reli.metaConnectionID)
			{
				for (let i of Object.keys(elementRegistry._elements)) 
				{ 
					let elemi = elementRegistry._elements[i]?.element
					if (elemi?.type == 'bpmn:SequenceFlow'
						&& elemi.businessObject.id == `${reli.Source.id}-${reli.Destination.id}-${reli.SourceProfileType.id}`)
					{
						reli.metaConnectionID = elemi.id
						// console.log(`rel: ${reli.Source.id} -> ${reli.Destination.id} {${reli.SourceProfileType.id}} =>>> SHAPE: ${elemi.id}`)
					}
				}
			}
			connecti = elementRegistry.get(reli.metaConnectionID) 
		} 
		else 
		{ 
			connecti = modeling.connect(elementRegistry.get(srcShapeID), elementRegistry.get(destShapeID)) 
			reli.metaConnectionID = connecti.id
		}

		if (connecti)
		{
			var rel_title = ''
			var flow_zero = true
			for (var i in reli.Value)
			{
				if (rel_title) { rel_title += ", " }
				rel_title += `${this._formatPrice(reli.Value[i].Flow, reli.Value[i].Currency)}`
				if (reli.Value[i].Flow > 0) { flow_zero = false }
			}
			connecti.businessObject.id = `${reli.Source.id}-${reli.Destination.id}-${reli.SourceProfileType.id}`
			connecti.businessObject.name = rel_title
			modeling.updateLabel(connecti, rel_title)

			var labelShape = connecti.labels?.length > 0 ? connecti.labels[0] : null
			if (labelShape) { canvas.addMarker(labelShape.id, 'flow-price') }
	
			// this._diagramAddTextAnnotation(connecti, reli, bpmnModeler)
			this._diagramAddOverlays(connecti, reli, bpmnModeler, updateModel)


			if (flow_zero && reli?.SourceProfileType?.id == 'Brand') { canvas.addMarker(connecti.id, 'flow-zero-brand') } else { canvas.removeMarker(connecti.id, 'flow-zero-brand') }
			if (flow_zero && reli?.SourceProfileType?.id == 'Seller') { canvas.addMarker(connecti.id, 'flow-zero-seller') } else { canvas.removeMarker(connecti.id, 'flow-zero-seller') }
		}
		else
		{
			console.warn(reli, connecti)
		}
	}

	_diagramAddOverlays(connecti, reli, bpmnModeler, updateModel = false)
	{
		if (!connecti?.id || !this.showVariables) { return }

		var modeling = bpmnModeler.get('modeling')
		var overlays = bpmnModeler.get('overlays')
		var elementRegistry = bpmnModeler.get('elementRegistry')
		
		// 0.3 * Infinity (∞)
		// -2 * (unit of sale currency)
		// + (shipping estimation)
		var relParts = reli?.TransactionLimit
		if (relParts?.length > 0)
		{
			var html = `<div class="diagram-note"><ul class="formula-list">`
			for (var i in relParts)
			{
				var partTitle = relParts[i].Variable.id == 'infinity' ? '∞' : relParts[i].Variable.title
				if (partTitle.indexOf(' ') >= 0) { partTitle = `(${partTitle})` }
				var partK = relParts[i].Coefficient
				try 
				{ 
					var v = parseFloat(relParts[i].Coefficient)
					partK = `${v >= 0 ? '+' : '-'} ${Math.abs(v).toFixed(3)}`

					if (this._asBool(relParts[i]?.Variable?.Value))
					{
						var vv = relParts[i].Variable.Value == 1152921504606847000 ? '∞' : this._formatPrice(relParts[i].Variable.Value, relParts[i].Variable.Currency)
						partTitle += ` = ${vv}`
					}
				}
				catch 
				{
					//
				}
				html += `<li>${partK}&nbsp;×&nbsp;${partTitle}</li>`
			}
			var sumpartTitle = ``
			for (var i in reli.Value)
			{
				var vali = reli.Value[i]
				if (sumpartTitle) { sumpartTitle += ', ' }
				sumpartTitle += vali.Limit == 1152921504606847000 ? '∞' : this._formatPrice(vali.Limit, vali.Currency)
			}
			html += `<li class="sum">∑ ${sumpartTitle}</li>`
			html += `</ul></div>`

			var pintoShape = connecti.labels?.length > 0 ? connecti.labels[0] : null
			// console.log(`${connecti.businessObject.sourceRef.id} - ${connecti.businessObject.targetRef.id}`)
			if (pintoShape)
			{
				overlays.remove({element: pintoShape})
				overlays.add(pintoShape.id, 'note', {
					position: {
						top: 0,
						left: 0,
					},
					html: html
				})
			}
		}
	}

	_diagramAddTextAnnotation(connecti, reli, bpmnModeler)
	{
		var modeling = bpmnModeler.get('modeling')
		var moddle = bpmnModeler.get('moddle')
		var elementFactory = bpmnModeler.get('elementFactory')

		var parts_txt = `${reli.Distance ? `distance (${reli.Distance})\n` : '' }`
		var lines = 1
		var relParts = reli?.TransactionLimit?.length > 0 ? reli.TransactionLimit : []
		for (var i in relParts)
		{
			var partTitle = relParts[i].Variable.id == 'infinity' ? '∞' : relParts[i].Variable.title
			if (partTitle.indexOf(' ') >= 0) { partTitle = `(${partTitle})` }
			var partK = relParts[i].Coefficient
			try 
			{ 
				var v = parseFloat(relParts[i].Coefficient)
				partK = `${v >= 0 ? '+' : '-'} ${Math.abs(v).toFixed(2)}`

				if (this._asBool(relParts[i]?.Variable?.Value))
				{
					var vv = relParts[i].Variable.Value == 1152921504606847000 ? '∞' : this._formatPrice(relParts[i].Variable.Value, relParts[i].Variable.Currency)
					partTitle += ` = ${vv}\n`
				}
			}
			catch 
			{
				//
			}
			lines++
			parts_txt += `${partK} × ${partTitle}`
		}
		// parts_txt += "=> "
		// var textAnnotation = elementFactory.createShape({ type: 'bpmn:TextAnnotation', businessObject: moddle.create('bpmn:TextAnnotation', { text: parts_txt }) })
		// modeling.appendShape(connecti, textAnnotation, { x: connecti.waypoints[0].x + 100, y: connecti.waypoints[0].y + 100, width: 290, height: 6 + lines * 17.5 })
		// modeling.setColor([ textAnnotation ], { stroke: '#42B415', fill: '#42B415' })

		// create a BPMN element that can be serialized to XML during export
		// var newCondition = moddle.create('bpmn:FormalExpression', {
		// 	body: parts_txt //'${ value > 100 }'
		// })
		// modeling.updateProperties(connecti, { conditionExpression: newCondition })
	}

	_elementDblClick(e) 
	{
		if (this._building) { return false }

		if (this._dev) console.log('dblclick', e.element.type)
		return e?.element?.type == 'bpmn:Process' 
			|| e?.element?.type == 'bpmn:TextAnnotation'
	}

	_connectionReconnectCanExecute(e)
	{
		if (this._building) { return false }

		// if (e.command == 'connection.reconnect')
		return false
	}

	_logEvent(e)
	{
		if (this._building) { return false }
		console.log(e)
	}

	_compute_obligationsReport(seller, brand, teamatical, factory)
	{
		var obligationsReport: any = []
		if (seller) { obligationsReport.push(Object.assign({ type: 'Seller' }, seller)) }
		if (brand) { obligationsReport.push(Object.assign({ type: 'Brand' }, brand)) }
		if (teamatical) { obligationsReport.push(Object.assign({ type: 'Teamatical' }, teamatical)) }
		if (factory) { obligationsReport.push(Object.assign({ type: 'Factory' }, factory)) }

		return obligationsReport
	}

	_formatObligValue(vali)
	{
		if (!vali) { return vali }
		var t = ''
		t += `${this._formatPrice(vali.Value, vali.Currency)}`
		if (vali.Destination) { t+= ` to ${vali.Destination.title}` }
		return t 
	}
}



//#region Bpmn tunes


var _getPaletteEntries = PaletteProvider.prototype.getPaletteEntries
const myPalette = { "hand-tool": 1, "lasso-tool": 0, "space-tool": 1, } // "global-connect-tool": 1, "tool-separator": 1, "create.task": 1 }
const myPaletteEnd = myPalette
//[ "hand-tool", "lasso-tool", "space-tool", "global-connect-tool", "tool-separator", "create.start-event", "create.intermediate-event", "create.end-event", "create.exclusive-gateway", "create.task", "create.data-object", "create.data-store", "create.subprocess-expanded", "create.participant-expanded", "create.group" ]
PaletteProvider.prototype.getPaletteEntries = function(element) 
{
	var entries = _getPaletteEntries.apply(this)
	if (entries && !isFullEditor)
	{
		var allowAddTask = false
		for (var i of Object.keys(entries))
		{
			if ((allowAddTask && myPalette[i]) || (!allowAddTask && myPaletteEnd[i])) { continue }
			delete entries[i]
		}
	}
    return entries 
}


const myContextCon = { "append.text-annotation": 1 }
const myContextTaskEnd = { "append.text-annotation": 1 }
const myContextTask = { "append.text-annotation": 1  }
const myContextAnnot = { "delete": 1  }

const _getContextPadEntries = ContextPadProvider.prototype.getContextPadEntries
ContextPadProvider.prototype.getContextPadEntries = function(element) 
{
    const entries = _getContextPadEntries.apply(this, [ element ])
	if (entries && !isFullEditor)
	{
		var allowAddTask = false
		for (var i of Object.keys(entries))
		{
			if (element.type == 'bpmn:Task' && ((allowAddTask && myContextTask[i]) || (!allowAddTask && myContextTaskEnd[i]))) { continue }
			if (element.type == 'bpmn:SequenceFlow' && myContextCon[i]) { continue }
			if (element.type == 'bpmn:TextAnnotation' && myContextAnnot[i]) { continue }
			delete entries[i]
		}
	}
	return entries
}


const _getAppendContextPadEntries = AppendContextPadProvider.prototype.getContextPadEntries
AppendContextPadProvider.prototype.getContextPadEntries = function(element) 
{
    const entries = _getAppendContextPadEntries.apply(this, [ element ])
	if (entries && !isFullEditor)
	{
		var allowAddTask = false
		for (var i of Object.keys(entries))
		{
			if (element.type == 'bpmn:Task' && ((allowAddTask && myContextTask[i]) || (!allowAddTask && myContextTaskEnd[i]))) { continue }
			if (element.type == 'bpmn:SequenceFlow' && myContextCon[i]) { continue }
			if (element.type == 'bpmn:TextAnnotation' && myContextAnnot[i]) { continue }
			delete entries[i]
		}
	}
	return entries
}

//#endregion Bpmn tunes
