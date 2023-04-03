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
import '@vaadin/vaadin-date-picker/vaadin-date-picker'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import 'multiselect-combo-box'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { convertDateISO } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './organization.ts.html'
import style from './organization.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import '../../components/ui/ui-description'
import '../../components/ui/paper-expansion-panel'
import '../../components/ui/ui-user-inline'
import '../ui/ui-search-input'
import '../ui/ui-changes-history'
import '../ui/ui-color-input-picker'
import '../ui/ui-dropdown-menu'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']



@FragmentDynamic
class AdminOrganization extends FragmentBase
{
    static get is() { return 'tmladmin-organization' }

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

            order: { type: Object, notify: true },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title


            APIPath: { type: String, value: '/admin/api/organization/organization-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['orgid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTaxCert: { type: Object, value: { } },
            addTaxCert: { type: Object, value: { } },

            dialog_taxstate: { type: Object, value: { } },
            addTaxState: { type: Object, value: { } },

            usaStates: { type: Array, computed: '_compute_usaStates(order.USStates)' },


            // orderCatalogPluginCategoryItems: { type: Array, value: [] },
            orderCatalogPluginCategorySelectedItems: { type: Array, value: [] },


            editTitle: { type: String },
            editBtn: { type: String },
            editSource: { type: Object, value: {}, notify: true },
            editType: { type: Boolean, value: false },
            editItem: { type: Object, value: {}, notify: true },
        }
    }

    _netbase: any
    _observer: any
    api_action: any
    hasUnsavedChanges: boolean
    order: any
    gridCellClassNameGenerator: any
    gridCellClassNameGeneratorImpl: any
    editTaxCert: any
    editTaxCertTitle: string
    applyTaxCertBtn: string
    addTaxCert: any
    // orderCatalogPluginCategoryItems: any
    orderCatalogPluginCategorySelectedItems: any
    dialog_taxstate: any
    addTaxState: any

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
            '_orderLoaded(order)',
            // '_log(order.*)',
        ]
    }

    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.$.dialogsave.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogsave)

        this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl

        document.addEventListener("keydown", (e) => this._onKeydown(e))

        this.addEventListener('api-search-input-added', (e) => this._onUserSearchAdded(e))
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveOrganizationTap()
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

            // this.saveOrganizationTap()
        }
    }

    _customlogoCobrand(b)
    {
        if (typeof(b) == 'string')
        {
            if (StringUtil.isNumeric(b.charAt(0)))
            {
                b = `_${b}`
            }
        }
        return b
    }

    _dis_TeamaticalCombinedFeePercent(id)
    {
        return !(id == 'TematicalGetsFeeOnly' || id == 'TeamaticalGetsFeeOnly' || id == 'TeamaticalGetsFeeOnlyByPercent')
    }

    _ph_TeamaticalCombinedFeePercent(id, TeamaticalCombinedFeeDefaultPercent)
    {
        return this._dis_TeamaticalCombinedFeePercent(id) ? '' : TeamaticalCombinedFeeDefaultPercent
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        try
        {
            var orderSavedObj = JSON.parse(orderSaved)
            orderSaved = JSON.stringify(orderSavedObj)
        }
        catch
        {
            //
        }
        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this.set('order.NoQtyLimitForBindStores', true)
        if (!this.order.TaxCertificates) { this.set('order.TaxCertificates', []) }

        if (typeof(order?.CatalogPluginCategory) == 'string')
        {
            // this.set('orderCatalogPluginCategoryItems', order.CatalogPluginCategory.split(','))
            this.set('orderCatalogPluginCategorySelectedItems', order.CatalogPluginCategory.split(','))
        }
    }

    catalogPluginCategoryCustomItemAdded(e)
    {
        // const itemText = e.detail
        // this.orderCatalogPluginCategoryItems.push(itemText)
        // const selectedItemsUpdate = this.orderCatalogPluginCategorySelectedItems.slice(0)
        // selectedItemsUpdate.push(itemText)
        // this.set('orderCatalogPluginCategorySelectedItems', selectedItemsUpdate)
        // if (Array.isArray(this.orderCatalogPluginCategorySelectedItems))
        // {
        //     this.set('order.CatalogPluginCategory', this.orderCatalogPluginCategorySelectedItems.join(','))
        // }
    }

    _categoryItemsConvertAndSet(items)
    {
        if (Array.isArray(items))
        {
            this.set('order.CatalogPluginCategory', items.join(','))
        }
    }

    catalogPluginCategoryCustomItemsChanged(e)
    {
        this._categoryItemsConvertAndSet(this.orderCatalogPluginCategorySelectedItems)
    }
    
    catalogPluginCategoryCustomItemRemoved(e)
    {
        this._categoryItemsConvertAndSet(this.orderCatalogPluginCategorySelectedItems)
    }

    catalogPluginCategoryCustomItemRemovedAll(e)
    {
        this._categoryItemsConvertAndSet(this.orderCatalogPluginCategorySelectedItems)
    }

    hideSaveBtn(product)
    {
        return false
    }

    _disabledSendGrid(loading, isReady)
    {
        return loading || !isReady
    }

    setupSendgridTap(e)
    {
        this.api_action = 'setupsendgrid'
        this._postData(this.order, (newmodel) => {
        })
    }

    normalizeStoresDomainTap(e)
    {
        this.api_action = 'normalize-stores-domain'
        this._postData(this.order, (newmodel) => {
        })
    }

    saveOrganizationTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveOrganizationConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => {
            if (newmodel && oldmodel.OrganizationID != newmodel.OrganizationID)
            {
                // console.log(oldmodel.OrganizationID, ' => ', newmodel.OrganizationID)
                var qp = { orgid: newmodel.OrganizationID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _onUserSearchAdded(e)
    {
        var user = e?.detail?.user
        if (user)
        {
            this.push('order.Users', user)
            this.notifyPath('order.Users')
            e.stopPropagation()
        }
    }

    _addShippingHubIDTap(e)
    {
        var shubidInput = e.target.parentElement
        var newid = shubidInput.value
        
        if (!newid || !newid.trim || newid.trim() == '') { return }
        var newidTrim = newid.trim()
        if (newidTrim.indexOf("d~") == 0)
        {
            newidTrim = "d~" + StringUtil.replaceAll(newidTrim, "d~", "").toUpperCase()
        }
        else
        {
            newidTrim = newidTrim.toUpperCase()
        }

        var inx = -1
        for (var i in this.order.ShippingHubs)
        {
            if (this.order.ShippingHubs[i] && newidTrim && this.order.ShippingHubs[i].ID === newidTrim)
            {
                inx = this.order.ShippingHubs.indexOf(this.order.ShippingHubs[i])
                this._applyDetailsErrors('order', [{ Key: "ShippingHubs", Message: "Duplicate Shipping Hub ID", Type: "e" }])
                return
            }
        }

        shubidInput.value = ''
        this.push('order.ShippingHubs', { ID: newidTrim })
        this.notifyPath('order.ShippingHubs')

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeShippingHubTap(e)
    {
        var shippinghubi = e.model.__data.shippinghubi
        for (var i in this.order.ShippingHubs)
        {
            if (this.order.ShippingHubs[i] 
                && this.order.ShippingHubs[i].ID === shippinghubi?.ID)
            {
                var inx = this.order.ShippingHubs.indexOf(this.order.ShippingHubs[i])
                this.splice('order.ShippingHubs', inx, 1)
                this.notifyPath('order.ShippingHubs')
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _upwardShippingHubTap(e)
    {
        var shippinghubi = e.model.__data.shippinghubi
        var inx = -1
        for (var i in this.order.ShippingHubs)
        {
            if (this.order.ShippingHubs[i] && shippinghubi && this.order.ShippingHubs[i] === shippinghubi)
            {
                inx = this.order.ShippingHubs.indexOf(this.order.ShippingHubs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el: any = this.splice('order.ShippingHubs', inx, 1)
        this.splice('order.ShippingHubs', inxto, 0, el[0])
    }

    _downwardShippingHubTap(e)
    {
        var shippinghubi = e.model.__data.shippinghubi
        var inx = -1
        for (var i in this.order.ShippingHubs)
        {
            if (this.order.ShippingHubs[i] && shippinghubi && this.order.ShippingHubs[i] === shippinghubi)
            {
                inx = this.order.ShippingHubs.indexOf(this.order.ShippingHubs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.ShippingHubs.length) { return }

        var el: any = this.splice('order.ShippingHubs', inx, 1)
        this.splice('order.ShippingHubs', inxto, 0, el[0])
    }


    // Users
    _removeUserTap(e)
    {
        var useri = e.model.__data.useri
        for (var i in this.order.Users)
        {
            if (this.order.Users[i] && useri && this.order.Users[i].UserID === useri.UserID)
            {
                var inx = this.order.Users.indexOf(this.order.Users[i])
                this.splice('order.Users', inx, 1)
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }



    _compute_usaStates(orderUSStates)
    {
        return !orderUSStates ? [] : orderUSStates.map(i => { return {
            ID: i.id,
            Name: i.title,
        }})
    }
    
    taxcertNewExpirationDateChanged(e)
    {
        return this._onInputChanged(e)
    }

    addNewTaxStateTap(e)
    {
        this.dialog_taxstate = {
            title: 'Add New State Tax',
            btn_title: 'Add',
            index: null,
            State: this.addTaxState.State || '',
            TaxPercent: '',
            Description: this.addTaxState.Description || '',
            notvalid: {},
        }
        this._openDlg(this.$.dialog_taxstate as PaperDialogElement)
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    editTaxStateTap(e)
    {
        var taxstatei = e.model.__data.taxstatei
        var taxstateindex = e.model.__data.index

        this.dialog_taxstate = {
            title: 'Exit State Tax',
            btn_title: 'Apply',
            index: taxstateindex,
            State: taxstatei.State,
            TaxPercent: taxstatei.TaxPercent,
            Description: taxstatei.Description || '',
            notvalid: {},
        }
        this._openDlg(this.$.dialog_taxstate as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    applyTaxStateBtnTap(e)
    {
        const __EXIT = (e) =>
        {
            e.preventDefault()
            e.stopPropagation()
            return false
        }

        if (this.order) 
        {
            if (!this.order.TaxStates) { this.set('order.TaxStates', []) }
        }

        var items = this.order.TaxStates
        var notValid: any = []

        if (this.dialog_taxstate && !this.dialog_taxstate.State) 
        { 
            notValid.push({ Key: "State", Message: "State is required", Type: "e" })
        }
        else
        {
            var inx = -1
            for (var k in items)
            {
                if (items[k] && this.dialog_taxstate && items[k].State === this.dialog_taxstate.State && this.dialog_taxstate.index != k)
                {
                    inx = items.indexOf(items[k])
                    notValid.push({ Key: "State", Message: "Duplicate State", Type: "e" })
                }
            }
        }

        if (this.dialog_taxstate && !this.dialog_taxstate.TaxPercent) 
        { 
            notValid.push({ Key: "TaxPercent", Message: "Tax % is required", Type: "e" })
        }

        if (notValid.length > 0) 
        { 
            this._applyDetailsErrors('dialog_taxstate', notValid)
            return __EXIT(e) ///EXIT!!!!
        } 



        var dialog_taxstate = Object.assign({}, this.dialog_taxstate)
        // if (this.dialog_taxstate)
        // {
        //     var dd = new Date()
        //     // var tt = new Date()
        //     try
        //     {
        //         dd.setTime(Date.parse(editTaxCert.ExpirationDate))
        //         // tt.setTime(Date.parse(`1970-01-01T${groupdeadlinetime}Z`))
        //         // dd.setHours(tt.getUTCHours(), tt.getUTCMinutes(), tt.getUTCSeconds(), 0)
        //     }
        //     catch
        //     {
        //         //
        //     }
        //     editTaxCert.ExpirationDate = { ms: dd.getTime(), tz: dd.getTimezoneOffset() }
        // }

        delete dialog_taxstate.notvalid
        if (dialog_taxstate && dialog_taxstate.index != null)
        {
            var i = dialog_taxstate.index
            this.set(`order.TaxStates.${i}.State`, dialog_taxstate.State)
            this.set(`order.TaxStates.${i}.TaxPercent`, dialog_taxstate.TaxPercent)
            this.set(`order.TaxStates.${i}.Description`, dialog_taxstate.Description)
        }
        else if (dialog_taxstate)
        {
            delete dialog_taxstate.index
            this.push('order.TaxStates', dialog_taxstate)
            this.notifyPath('order.TaxStates')
        }
    }

    upwardTaxStateTap(e)
    {
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el: any = this.splice('order.TaxStates', inx, 1)
        this.splice('order.TaxStates', inxto, 0, el[0])
    }

    downwardTaxStateTap(e)
    {
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.TaxStates.length) { return }

        var el: any = this.splice('order.TaxStates', inx, 1)
        this.splice('order.TaxStates', inxto, 0, el[0])
    }

    deleteTaxStateTap(e)
    {
        var inx = e.model.__data.index
        this.splice('order.TaxStates', inx, 1)
        this.notifyPath('order.TaxStates')

        e.preventDefault()
        e.stopPropagation()
        return false
    }


    addNewTaxCertTap(e)
    {
        this.editTaxCertTitle = 'Add New Tax Certificate'
        this.applyTaxCertBtn = 'Add'
        this.set('editTaxCert.index', null)
        this.set('editTaxCert.State', this.addTaxCert.State || '')
        this.set('editTaxCert.ExpirationDate', this.addTaxCert.ExpirationDate)
        this.set('editTaxCert.Description', this.addTaxCert.Description || '')
        this.set('editTaxCert.notvalid', {})
        this._openDlg(this.$.dialog_taxcert as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    editTaxCertTap(e)
    {
        var taxcerti = e.model.__data.taxcerti
        var taxcertindex = e.model.__data.index

        this.editTaxCertTitle = 'Edit Tax Certificate'
        this.applyTaxCertBtn = 'Apply'
        this.set('editTaxCert.index', taxcertindex)
        this.set('editTaxCert.State', taxcerti.State)
        this.set('editTaxCert.ExpirationDate', convertDateISO(taxcerti.ExpirationDate?.ms))
        this.set('editTaxCert.Description', taxcerti.Description || '')
        this.set('editTaxCert.notvalid', {})
        this._openDlg(this.$.dialog_taxcert as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    applyTaxCertBtnTap(e) //apply
    {
        const __EXIT = (e) =>
        {
            e.preventDefault()
            e.stopPropagation()
            return false
        }

        if (this.order) 
        {
            if (!this.order.TaxCertificates) { this.set('order.TaxCertificates', []) }
        }

        var items = this.order.TaxCertificates
        var notValid: any = []

        // console.log(this.editTaxCert)
        if (this.editTaxCert && !this.editTaxCert.State) 
        { 
            notValid.push({ Key: "State", Message: "State is required", Type: "e" })
        }
        else
        {
            var inx = -1
            for (var k in items)
            {
                if (items[k] && this.editTaxCert && items[k].State === this.editTaxCert.State && this.editTaxCert.index != k)
                {
                    inx = items.indexOf(items[k])
                    notValid.push({ Key: "State", Message: "Duplicate State", Type: "e" })
                }
            }
        }

        if (this.editTaxCert && !this.editTaxCert.ExpirationDate) 
        { 
            notValid.push({ Key: "ExpirationDate", Message: "Set Expiration Date is required", Type: "e" })
        }

        if (notValid.length > 0) 
        { 
            this._applyDetailsErrors('editTaxCert', notValid)
            return __EXIT(e) ///EXIT!!!!
        } 



        var editTaxCert = Object.assign({}, this.editTaxCert)
        if (this.editTaxCert)
        {
            var dd = new Date()
            // var tt = new Date()
            try
            {
                dd.setTime(Date.parse(editTaxCert.ExpirationDate))
                // tt.setTime(Date.parse(`1970-01-01T${groupdeadlinetime}Z`))
                // dd.setHours(tt.getUTCHours(), tt.getUTCMinutes(), tt.getUTCSeconds(), 0)
            }
            catch
            {
                //
            }
            editTaxCert.ExpirationDate = { ms: dd.getTime(), tz: dd.getTimezoneOffset() }
        }

        delete editTaxCert.notvalid
        if (editTaxCert && editTaxCert.index != null)
        {
            var i = editTaxCert.index
            this.set(`order.TaxCertificates.${i}.State`, editTaxCert.State)
            this.set(`order.TaxCertificates.${i}.ExpirationDate`, editTaxCert.ExpirationDate)
            this.set(`order.TaxCertificates.${i}.Description`, editTaxCert.Description)
        }
        else if (editTaxCert)
        {
            this.set('addTaxCert.State', '')
            this.set('addTaxCert.ExpirationDate', '')

            delete editTaxCert.index
            this.push('order.TaxCertificates', editTaxCert)
            this.notifyPath('order.TaxCertificates')
        }
    }

  
    upwardTaxCertTap(e)
    {
        // var item = e.model.__data.mproducti
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el: any = this.splice('order.TaxCertificates', inx, 1)
        this.splice('order.TaxCertificates', inxto, 0, el[0])
    }

    downwardTaxCertTap(e)
    {
        // var item = e.model.__data.mproducti
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.TaxCertificates.length) { return }

        var el: any = this.splice('order.TaxCertificates', inx, 1)
        this.splice('order.TaxCertificates', inxto, 0, el[0])
    }

    deleteTaxCertTap(e)
    {
        // var mproducti = e.model.__data.mproducti
        var inx = e.model.__data.index
        this.splice('order.TaxCertificates', inx, 1)
        this.notifyPath('order.TaxCertificates')

        e.preventDefault()
        e.stopPropagation()
        return false
    }


    _notUsedCurrencies(currencies, freeShippingThresholds)
    {
        // var l = currencies.filter((i) => 
        // {
        //     var f = freeShippingThresholds.filter((n) => 
        //     {
        //         return i.id == n.Currency?.id
        //     })
        //     return f.length < 1
        // })
        return currencies
    }



    addThresholdTap(e)
    {
        var useridInput = e.target.parentElement
        var newval = useridInput.value
        if (!newval || !newval.trim || newval.trim() == '') { return }
        useridInput.value = ''
        var objnewTrim = newval.trim()

        var inx = -1
        for (var i in this.order.FreeShippingThresholds)
        {
            if (this.order.FreeShippingThresholds[i] && objnewTrim && this.order.FreeShippingThresholds[i].Currency.id === objnewTrim.toUpperCase())
            {
                inx = this.order.FreeShippingThresholds.indexOf(this.order.FreeShippingThresholds[i])
                this._applyDetailsErrors('order', [{ Key: "Threshold", Message: "Duplicate Currency", Type: "e" }])
                return
            }
        }


        var f = this.order.Currencies.filter((i) => { return i.id == objnewTrim.toUpperCase() })
        var newObj: any = { 
            Currency: f.length > 0 ? Object.assign({}, f[0]) : this.order.Currencies[0],
            Amount: 0,
        }
        this.editTitle = 'Add Rate Item'
        this.editBtn = 'Add'
        this.editItem = newObj
        this.editItem_I = null
        this.editItem_Edit = false

        this._openDlg(this.$.dialog_threshold as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveThresholdTap(e)
    {
        if (this.order) 
        {
            if (!this.order.FreeShippingThresholds) { this.set('order.FreeShippingThresholds', []) }
        }

        var items = this.order.FreeShippingThresholds
        if (this.editItem_I != null && this.editItem_Edit)
        {
            items[this.editItem_I] = this.editItem //Object.assign(items[this.editItem_I], this.editItem)
            this.notifyPath('order.FreeShippingThresholds.' + this.editItem_I)
            // this.notifyPath('order.FreeShippingThresholds')
        }
        else
        {
            this.push('order.FreeShippingThresholds', Object.assign({}, this.editItem))
        }
    }

    upwardItemTap(e)
    {
        // var item = e.model.__data.thresholdi
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el = this.splice('order.FreeShippingThresholds', inx, 1)
        this.splice('order.FreeShippingThresholds', inxto, 0, el[0])
    }

    downwardItemTap(e)
    {
        // var item = e.model.__data.thresholdi
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.FreeShippingThresholds.length) { return }

        var el = this.splice('order.FreeShippingThresholds', inx, 1)
        this.splice('order.FreeShippingThresholds', inxto, 0, el[0])
    }
    
    editItemTap(e)
    {
        var item = e.model.__data.thresholdi
        var inx = e.model.__data.index

        this.editTitle = 'Edit Rate Item'
        this.editBtn = 'Apply'
        this.editItem = Object.assign({}, item)
        this.editItem_A = item
        this.editItem_I = inx
        this.editItem_Edit = true

        this._openDlg(this.$.dialog_threshold as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    deleteItemTap(e)
    {
        // var thresholdi = e.model.__data.thresholdi
        var inx = e.model.__data.index
        this.splice('order.FreeShippingThresholds', inx, 1)
        
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _disTeam(loading, orderIsDefaultTeam)
    {
        return loading || !orderIsDefaultTeam
    }

    _disPlayer(loading, orderIsDefaultPlayer)
    {
        return loading || !orderIsDefaultPlayer
    }

    _formatFeeDistributionModeList(orderFeeDistributionModes)
    {
        if (Array.isArray(orderFeeDistributionModes))
        {
            orderFeeDistributionModes = orderFeeDistributionModes.map(i => { return Object.assign(i, { title: this._formatFeeDistributionMode(i.id) }) })
        }
        return orderFeeDistributionModes
    }

}
