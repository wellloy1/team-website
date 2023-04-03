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
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
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
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
import view from './currency-region.ts.html'
import style from './currency-region.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../../components/ui/ui-image-svg'
import '../shared-styles/common-styles'
import '../ui/ui-changes-history'
import '../ui/ui-dropdown-menu'
import 'multiselect-combo-box'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminCurrencyRegion extends FragmentBase
{
    static get is() { return 'tmladmin-currency-region' }

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
            colorsPalette: { type: Array },
            colorsSwatchPalette: { type: Array, },

            order: { type: Object, },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title

            APIPath: { type: String, value: '/admin/api/currencyregion/' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['curregid'] }, 

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTitle: { type: String },
            editBtn: { type: String },
            editSource: { type: Object, value: {}, notify: true },
            editType: { type: Boolean, value: false },
            editItem: { type: Object, value: {}, notify: true },
            editItemAllowPickupPoint: { type: Boolean, value: false },
            editItemProvider: { type: Object },

            activeItem: { type: Object },
            selectedProductionTemplateSvg: { type: String, value: '', notify: true },

            gridCellClassNameGenerator: { type: Object },
            orderProviders: { type: Object },
        }
    }

    dialogdispose = { reason: '', notvalid: {} }
    hasUnsavedChanges: boolean
    orderProviders: any
    editTitle: any
    editBtn: any
    editItem: any
    editItem_Edit: any
    editItem_A: any
    editItem_I: any
    editItem_PI: any
    editItemProvider: any
    editItemAllowPickupPoint: boolean

    

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_orderLoaded(order)',
            '_providerListBuild(order.Providers, order.SupportedProviders)', //orderProviders
        ]
    }
    _log(v) { console.log(AdminCurrencyRegion.is, v) }

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    ready()
    {
        super.ready()
    }
    
    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveCurrencyRegionTap()
        }
    }

    hideCloneBtn(id)
    {
        return !id || id == '_new_'
    }

    hideSaveBtn(order)
    {
        return false
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _dis_address(loading, isPickupPoint)
    {
        return loading || !isPickupPoint
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()

            this.saveCurrencyRegionTap()
        }
    }    

    saveCurrencyRegionTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveCurrencyRegionConfirmTap(e?)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)

        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.ID != newmodel.ID)
            {
                var qp = { curregid: newmodel.ID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    cloneModel: any
    cloneTap(e)
    {
        this.cloneModel = Object.assign({}, this.order, { ID: '_new_', ETag: null })

        var qp = { curregid: '_new_' }
        this.queryParams = qp
        window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
    }

    _orderLoaded(order)
    {
        if (this.cloneModel)
        {
            this.set('order', this.cloneModel)
            this.cloneModel = null
        }
    }

    disposeTap(e)
    {
        this.set('dialogdispose', {})
        this._openDlg(this.$.dialogdispose as PaperDialogElement)
    }

    disposeConfirmTap(e)
    {
        var dialogdispose_reason = this.dialogdispose.reason
        if (!dialogdispose_reason || dialogdispose_reason.length < 5) 
        { 
            this.set('dialogdispose.notvalid', {})
            this.set('dialogdispose.notvalid.DisposeReason', 'Dispose reason is mandatory (a few words)')
            e.preventDefault()
            e.stopPropagation()
            return //EXIT!!!
        }

        this.set('dialogdispose.reason', '')
        this.api_action = 'dispose'
        this._fetchItems(1, null, { 
            reason: dialogdispose_reason,
        })

    }

    labelImage(labelList, label_id)
    {
        if (!Array.isArray(labelList)) { return '' }
        var f = labelList.filter(i => i.id == label_id)
        if (f.length > 0)
        {
            // console.log(f[0].id)
            return f[0].imageUrl || this._trans_image()
        }
        return ''
    }

    _trans_image()
	{
		return this._trans_image_z6()
	}

	_trans_image_z6()
	{
		return "data:image/png;base64," +
			"iVBORw0KGgoAAAANSUhEUgAAAkAAAAMACAAAAADp3ocyAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAACdFJOUwAAdpPNOAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAHESURBVBgZ7cExAQAAAMIg+6deDQ9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXArDWgABeKZ+fgAAAABJRU5ErkJggg=="
	}

    _providerListBuild(orderProviderRates, orderSupportedProviders)
    {
        if (!Array.isArray(orderProviderRates) || !Array.isArray(orderProviderRates)) { return orderProviderRates }
        
        var providers = orderProviderRates.filter((i) => 
        {
            return orderSupportedProviders.filter(n => n == i.ID).length > 0
        })
        this.set('orderProviders', providers)
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

    addRateTap(e)
    {
        var useridInput = e.target.parentElement
        var newval = useridInput.value
        // if (!newval || !newval.trim || newval.trim() == '') { return }
        useridInput.value = ''
        var objnewTrim = newval.trim()

        var provideri = e.model.__data.provideri
        var pinx = e.model.__data.pinx

        var newid = this._getNewID(provideri.Rates) 
        var newObj: any = { 
            ID: newid, 
            Name: objnewTrim, 
            Amount: 0,
            Currency: this.order?.Currencies?.length ? Object.assign({}, this.order.Currencies[0]) : {},
            Label: provideri?.LabelsList?.length ? Object.assign({}, provideri.LabelsList[0]) : {},
            Description: '',
        }
        this.editTitle = 'Add Rate Item'
        this.editBtn = 'Add'
        this.editItem = newObj
        this.editItem_I = null
        this.editItem_PI = pinx
        this.editItemProvider = provideri
        this.editItem_Edit = false
        this.editItemAllowPickupPoint = provideri.AllowPickupPoint

        this._openDlg(this.$.dialog_rate as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    editItemTap(e)
    {
        var provideri = e.model.__data.provideri
        var pinx = e.model.__dataHost.__dataHost.__data.itemsIndex

        var item = e.model.__data.ratei
        var rinx = e.model.__data.rinx

        this.editTitle = 'Edit Rate Item'
        this.editBtn = 'Apply'
        this.editItem = Object.assign({}, item)
        this.editItem_A = item
        this.editItem_I = rinx
        this.editItem_PI = pinx
        this.editItemProvider = provideri
        this.editItem_Edit = true
        this.editItemAllowPickupPoint = provideri.AllowPickupPoint

        this._openDlg(this.$.dialog_rate as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }
   
    saveRateTap(e)
    {
        if (this.order) 
        {
            if (!this.orderProviders) { this.set('orderProviders', []) }
            if (!this.orderProviders[this.editItem_PI]) { this.set(`orderProviders.${this.editItem_PI}.Rates`, []) }
        }

        if (this.editItem_I != null && this.editItem_Edit)
        {
            this.set(`orderProviders.${this.editItem_PI}.Rates.${this.editItem_I}`, Object.assign({}, this.editItem))
            this.notifyPath(`orderProviders.${this.editItem_PI}.Rates`)
        }
        else
        {
            this.push(`orderProviders.${this.editItem_PI}.Rates`, Object.assign({}, this.editItem))
            this.notifyPath(`orderProviders.${this.editItem_PI}.Rates`)
        }

        this.set('order.Providers', this.orderProviders)
    }

    upwardItemTap(e)
    {
        var pinx = e.model.__dataHost.__dataHost.__data.itemsIndex
        var rinx = e.model.__data.rinx

        if (rinx === -1) { return } // throw new Error("Element not found in array")
        var inxto = rinx - 1
        if (inxto < 0) { return }

        this.splice(`orderProviders.${pinx}.Rates`, rinx, 1)

        var el = this.splice(`orderProviders.${pinx}.Rates`, rinx, 1)
        this.splice(`orderProviders.${pinx}.Rates`, inxto, 0, el[0])

        this.set('order.Providers', this.orderProviders)
    }

    downwardItemTap(e)
    {
        var pinx = e.model.__dataHost.__dataHost.__data.itemsIndex
        var rinx = e.model.__data.rinx

        if (rinx === -1) { return } // throw new Error("Element not found in array")
        var inxto = rinx + 1
        if (inxto > this.orderProviders[pinx].Rates.length) { return }

        var el = this.splice(`orderProviders.${pinx}.Rates`, rinx, 1)
        this.splice(`orderProviders.${pinx}.Rates`, inxto, 0, el[0])

        this.set('order.Providers', this.orderProviders)
    }
    
    deleteItemTap(e)
    {
        var pinx = e.model.__dataHost.__dataHost.__data.itemsIndex
        var rinx = e.model.__data.rinx
        this.splice(`orderProviders.${pinx}.Rates`, rinx, 1)

        this.set('order.Providers', this.orderProviders)
        
        e.preventDefault()
        e.stopPropagation()
        return false
    }    

    onCloseEditItemDialog(e)
    {
        //
    }

}
