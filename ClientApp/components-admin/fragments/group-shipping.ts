import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './group-shipping.ts.html'
import style from './group-shipping.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-sizes'
import '../ui/ui-changes-history'
import '../ui/ui-dropdown-menu'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
export class AdminGroupShipping extends FragmentBase
{
    static get is() { return 'tmladmin-group-shipping' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },

            order: { type: Object, notify: true, observer: '_order_Changed' },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/groupshipping/' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['ordershipid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            dialogcancel_reason: { type: String },
            dialogfinish_reason: { type: String },
            
            isOrganization: { type: Boolean, value: false },

            editTitle: { type: String },
            editBtn: { type: String },
            editSource: { type: Object, value: {}, notify: true },
            editType: { type: Boolean, value: false },
            editItem: { type: Object, value: {}, notify: true },
        }
    }

    _netbase: NetBase
    _netbaseCmd: NetBase
    _observer: any
    api_action: any
    hasUnsavedChanges: boolean
    order: any
    gridCellClassNameGenerator: any
    gridCellClassNameGeneratorImpl: any
    progress: any
    dialogcancel_reason: any
    dialogfinish_reason: any
    _pagesUpdating: any

    editTitle: any
    editBtn: any
    editItem: any
    editItem_Edit: any
    editItem_A: any
    editItem_I: any



    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            // '_log(order.*)',
        ]
    }
    _log(orderP) { console.log(orderP) }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveGroupOrderTap()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()
        }
    }

    recalcShiprateOrderTap(e)
    {
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        if (progress) { progress.active = true }

        this.api_action = 'getshippingrates'
        this._postData(this.order, () => 
        { 
            if (progress) { progress.active = false }
        })
    }

    _order_Changed(v, o)
    {
        if (!v?.ShippingRates) { this.set('order.ShippingRates', [])}
    }

    _dis_recalcShiprates(loadingAny, cantSwitchShippingHubs)
    {
        return loadingAny || this._asBool(cantSwitchShippingHubs)
    }

    _dis_ShippingHub(loadingAny, orderShippingHubs)
    {
        return loadingAny || !this._asBool(orderShippingHubs)
    }

    shippingHubChanged(e)
    {
        // var inx = e.model.__data.index
        // var inx = e.model.__data.shubi
        
        //selection changed to notify [unsaved] state
        // this.notifyPath('order.ShippingHubs')
    }

    hideSaveBtn(order)
    {
        return false
    }

    // _initalNotes = ''
    // _computeHasUnsavedChanges(order, orderP, orderSaved)
    // {
    //     // if (orderP && orderP.path.indexOf('order.Status.title') >= 0) { return false }
    //     // if (orderP && orderP.path == 'order') { this._initalNotes = this.order?.Notes }
    //     // if (orderP && orderP.path == 'order.Notes' && orderP.value == '<p><br></p>' && this._initalNotes == undefined) { return false }

    //     try
    //     {
    //         var orderSavedObj = JSON.parse(orderSaved)
    //         orderSavedObj.Status = order.Status
    //         orderSaved = JSON.stringify(orderSavedObj)
    //     }
    //     catch
    //     {
    //     }
    //     return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    // }

    saveGroupOrderTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveGroupOrderConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => 
        {
            console.log(newmodel)

            // if (newmodel && oldmodel.OrganizationID != newmodel.OrganizationID)
            // {
            //     // console.log(oldmodel.OrganizationID, ' => ', newmodel.OrganizationID)
            //     var qp = { ordershipid: newmodel.OrganizationID }
            //     this.queryParams = qp
            //     window.history.replaceState(null, null, StringUtil.urlquery(document.location.pathname, qp))
            // }
        })
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    moreDetailTap(e)
    {
        this.api_action = 'get'
        this._fetchItems(1, this.order.id, { domore: true })
    }

    finishNowConfirmTap(e)
    {
        if (this.dialogfinish_reason)
        {
            this.url = StringUtil.urlquery(this.url, { reason: this.dialogfinish_reason })
        }
        this.dialogfinish_reason = ''

        this.progress.active = true
        this.cmd((result, r) =>
        {
            this.progress.active = false
            this.updateModel(result)
        })
    }

    finishNowTap(e)
    {
        var item = this.order
        this.progress = e.target.parentElement.querySelector('paper-spinner-lite')

        var url = this.websiteUrl + this.APIPath + 'finish-now'
        this.url = StringUtil.urlquery(url, { groupShippingId: item.GroupShippingID })

        // this._openDlg(this.$.dialogcancel as PaperDialogElement, this.shadowRoot.querySelector('div'))
        // var epath = e.path || e.composedPath()
        this._openDlg(this.$.dialogfinishnow as PaperDialogElement) //, epath[0])

        e.preventDefault()
        return false
    }

    acceptForManufactoringTap(e)
    {
        var item = this.order
        this.progress = e.target.parentElement.querySelector('paper-spinner-lite')

        var url = this.websiteUrl + this.APIPath + 'accept-for-manufactoring'
        this.url = StringUtil.urlquery(url, { groupShippingId: item.GroupShippingID })

        // this._openDlg(this.$.dialogcancel as PaperDialogElement, this.shadowRoot.querySelector('div'))
        var epath = e.path || e.composedPath()
        this._openDlg(this.$.dialogaccept as PaperDialogElement) //, epath[0])
        
        e.preventDefault()
        return false
    }

    acceptConfirmTap(e)
    {
        this.progress.active = true
        this.cmd((result) =>
        {
            this.progress.active = false
            this.updateModel(result)
        })
    }

    cancelTap(e)
    {
        var item = this.order
        this.progress = e.target.parentElement.querySelector('paper-spinner-lite')

        var url = this.websiteUrl + this.APIPath + 'cancel'
        this.url = StringUtil.urlquery(url, { groupShippingId: item.GroupShippingID })

        // e.preventDefault()
        // return false


        // this._openDlg(this.$.dialogcancel as PaperDialogElement, this.shadowRoot.querySelector('div'))
        var epath = e.path || e.composedPath()
        this._openDlg(this.$.dialogcancel as PaperDialogElement) //, epath[0])

        e.preventDefault()
        return false
    }

    cancelConfirmTap(e)
    {
        if (this.dialogcancel_reason)
        {
            this.url = StringUtil.urlquery(this.url, { reason: this.dialogcancel_reason })
        }
        this.dialogcancel_reason = ''
        
        this.progress.active = true
        this.cmd((result) => { 
            this.progress.active = false 
            this.updateModel(result)
        })
    }

    // regularShippingTap(e)
    // {
    //     var item = this.order
    //     this.progress = e.target.parentElement.querySelector('paper-spinner-lite')
    //     var url = this.websiteUrl + this.APIPath + 'regular-shipping'
    //     this.url = StringUtil.urlquery(url, { groupShippingId: item.GroupShippingID })
    //     this.progress.active = true
    //     this.cmd((result) => { 
    //         this.progress.active = false 
    //         this.updateModel(result)
    //     })

    //     e.preventDefault()
    //     return false
    // }

    // directShippingTap(e)
    // {
    //     var item = this.order
    //     this.progress = e.target.parentElement.querySelector('paper-spinner-lite')
    //     var url = this.websiteUrl + this.APIPath + 'direct-shipping'
    //     this.url = StringUtil.urlquery(url, { groupShippingId: item.GroupShippingID })
    //     this.progress.active = true
    //     this.cmd((result) => { 
    //         this.progress.active = false 
    //         this.updateModel(result)
    //     })

    //     e.preventDefault()
    //     return false
    // }

    updateModel(order)
    {
        this.orderUpdating = true
        this.set('order', order)
        this.orderUpdating = false
    }

    _filterShippingHubs(shippingHub, shippingHubs, cantSwitchShippingHubs)
    {
        var shippingHubsLst = shippingHubs
        if (this._asBool(cantSwitchShippingHubs))
        {
            var shippingHubsLst = shippingHubs.filter(i => i.Name == shippingHub?.Name)
        }
        return shippingHubsLst
    }


    

    addRateTap(e)
    {
        var useridInput = e.target.parentElement
        var newval = useridInput.value
        if (!newval || !newval.trim || newval.trim() == '') { return }
        useridInput.value = ''
        var objnewTrim = newval.trim()

        var inx = -1
        for (var i in this.order.ShippingRates)
        {
            if (this.order.ShippingRates[i] && objnewTrim && this.order.ShippingRates[i].Name === objnewTrim)
            {
                inx = this.order.ShippingRates.indexOf(this.order.ShippingRates[i])
                this._applyDetailsErrors('order', [{ Key: "id", Message: "Duplicate Rate Name", Type: "e" }])
                return
            }
        }


        var newid = this._getNewID(this.order.ShippingRates) 
        var newObj: any = { 
            ID: newid, 
            Name: objnewTrim, 
            Amount: 0,
            Currency: this.order?.Currencies?.length ? Object.assign({}, this.order.Currencies[0]) : {},
            Label: this.order?.ThirdPartyDeliveryLabelList?.length ? Object.assign({}, this.order.ThirdPartyDeliveryLabelList[0]) : {},
            Description: '',
        }
        this.editTitle = 'Add Rate Item'
        this.editBtn = 'Add'
        this.editItem = newObj
        this.editItem_I = null
        this.editItem_Edit = false

        this._openDlg(this.$.dialog_rate as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _getNewID(rates)
    {
        if (!Array.isArray(rates) || rates.length < 1) { return "1" }
        var r = rates.reduce((accumulator, currentValue) => 
        {
            var n = currentValue?.ID ? parseInt(currentValue?.ID) : 0
            return accumulator < n ? n : accumulator
        }, 1)
        return (r++).toString()
    }

    saveRateTap(e)
    {
        if (this.order) 
        {
            if (!this.order.ShippingRates) { this.set('order.ShippingRates', []) }
        }

        var items = this.order.ShippingRates
        if (this.editItem_I != null && this.editItem_Edit)
        {
            items[this.editItem_I] = this.editItem //Object.assign(items[this.editItem_I], this.editItem)
            this.notifyPath('order.ShippingRates.' + this.editItem_I)
        }
        else
        {
            this.push('order.ShippingRates', Object.assign({}, this.editItem))
            // this.notifyPath('order.ShippingRates')
        }
    }

    upwardItemTap(e)
    {
        // var item = e.model.__data.ratei
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el = this.splice('order.ShippingRates', inx, 1)
        this.splice('order.ShippingRates', inxto, 0, el[0])
    }

    downwardItemTap(e)
    {
        // var item = e.model.__data.ratei
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.ShippingRates.length) { return }

        var el = this.splice('order.ShippingRates', inx, 1)
        this.splice('order.ShippingRates', inxto, 0, el[0])
    }
    
    editItemTap(e)
    {
        var item = e.model.__data.ratei
        var inx = e.model.__data.index

        this.editTitle = 'Edit Rate Item'
        this.editBtn = 'Apply'
        this.editItem = Object.assign({}, item)
        this.editItem_A = item
        this.editItem_I = inx
        this.editItem_Edit = true

        this._openDlg(this.$.dialog_rate as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    deleteItemTap(e)
    {
        // var ratei = e.model.__data.ratei
        var inx = e.model.__data.index
        this.splice('order.ShippingRates', inx, 1)
        
        e.preventDefault()
        e.stopPropagation()
        return false
    }
}
