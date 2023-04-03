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
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
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
import { CheckoutData } from '../../components/bll/checkout-data'
import view from './manufacturer.ts.html'
import style from './manufacturer.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-user-inline'
import '../ui/ui-search-input'
import '../ui/ui-dropdown-menu'
import '../ui/ui-changes-history'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']



@FragmentDynamic
class AdminManufacturer extends FragmentBase
{
    static get is() { return 'tmladmin-manufacturer' }

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

            APIPath: { type: String, value: '/admin/api/manufacturer/manufacturer-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['manid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },
            gridCellClassNameGeneratorFabricShrink: { type: Object },
            gridCellClassNameGeneratorAggregationCells: { type: Object },

            edititem: { type: Object, value: {}, notify: true },
            editTitle: { type: String },
            editBtn: { type: String },

            editBulkStackHeightSuggestion: { type: String, computed: '_edit_bulkStackHeightSuggestionChanged(edititem.WeightGramsPerMeter2)' },
        }
    }

    _netbase: any
    _observer: any
    api_action: any
    hasUnsavedChanges: boolean
    order: any
    edititem: any
    editTitle: any
    editBtn: any
    edititem_A: any
    edititem_I: any
    edititem_hostI: any
    gridCellClassNameGeneratorFabricShrink: any
    gridCellClassNameGeneratorAggregationCells: any
    AggregationShelves: any


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
        ]
    }

    _log(orderP) { console.log(orderP) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.$.dialogsave.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogsave)
        // this.$.dialog_compensation.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialog_compensation)
        // this.$.dialog_agcell.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialog_agcell)
        
        this.gridCellClassNameGeneratorFabricShrink = this.gridCellClassNameGeneratorFabricShrinkImpl
        this.gridCellClassNameGeneratorAggregationCells = this.gridCellClassNameGeneratorAggregationCellsImpl

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
            this.saveManufacturerTap()
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

            // this.saveManufacturerTap()
        }
    }

    _edit_bulkStackHeightSuggestionChanged(weightGramsPerMeter2)
    {
        var layers = 50 
        try
        {
            weightGramsPerMeter2 = parseInt(weightGramsPerMeter2)
            if (isFinite(weightGramsPerMeter2))
            {
                var t = (weightGramsPerMeter2 - 100) / 200
                var layers = Math.round(80 - t * 20)
                if (layers < 60) layers = 60
                if (layers > 80) layers = 80
            }
        }
        catch
        {
            //
        }
        return layers
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path.indexOf('Orientation') >= 0 && orderP.path.indexOf('.title') > 0)
        {
            return false
        }

        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    disableSelection(loading)
    {
        return loading
    }

    gridCellClassNameGeneratorFabricShrinkImpl(column, rowData)
    {
        var classes = ''
        if (rowData.item.notvalid !== undefined)
        {
            classes = ' notvalid'
        }
        // console.log(rowData, classes)
        return classes
    }

    gridCellClassNameGeneratorAggregationCellsImpl(column, rowData)
    {
        var classes = ''
        if (rowData.item.notvalid !== undefined)
        {
            classes = ' notvalid'
        }
        // console.log(rowData, classes)
        return classes
    }

    hideSaveBtn(product)
    {
        return false
    }

    hideAddPaperBtn(order)
    {
        return false
    }

    hideAddFabricShrinkCompensationBtn(order)
    {
        return false
    }

    hideAddAggregationCellsBtn(order)
    {
        return false
    }

    onCloseEditPaperDialog(e)
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Papers')
        if (grid) { grid.clearCache() }
    }

    onCloseEditСompensationDialog(e)
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_FabricShrinkCompensation')
        if (grid) { grid.clearCache() }
    }

    onCloseEditAgCellDialog(e)
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_AggregationCells')
        if (grid) { grid.clearCache() }
    }

    saveManufacturerTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveManufacturerConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => {
            if (oldmodel.ManufacturerID != newmodel.ManufacturerID)
            {
                // console.log(oldmodel.ManufacturerID, ' => ', newmodel.ManufacturerID)
                var qp = { manid: newmodel.ManufacturerID }
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }


    addNewPaperTap(e)
    {
        this.editTitle = 'Add Paper'
        this.editBtn = 'Add Paper'
        this.edititem = { } //Type: 'QuantityDiscount' }
        this.edititem_A = null
        this.edititem_I = null

        this._openDlg(this.$.dialog_paper as PaperDialogElement)
    }

    editPaperTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index

        this.editTitle = 'Edit Paper'
        this.editBtn = 'Apply Paper'
        this.edititem = Object.assign({}, item)
        this.edititem_A = item
        this.edititem_I = inx

        this._openDlg(this.$.dialog_paper as PaperDialogElement)
    }

    deletePaperTap(e)
    {
        var list = this.order.Papers
        var item = e.model.__data.item
        for (var i in list)
        {
            if (list[i].id == item.id)
            {
                list.splice(i, 1)
                this.notifyPath('order.Papers')
                break
            }
        }
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Papers')
        if (grid) { grid.clearCache() }
    }

    savePaperTap(e)
    {
        if (this.order) 
        {
            if (!this.order.Papers) { this.set('order.Papers', []) }
        }
        var items = this.order.Papers
        if (this.edititem_I != null)
        {
            items[this.edititem_I] = Object.assign(items[this.edititem_I], this.edititem)
            this.notifyPath('order.Papers.' + this.edititem_I)
        }
        else
        {
            items.push(Object.assign({}, this.edititem))
            this.notifyPath('order.Papers')
        }
    }




    addNewFabricShrinkCompensationItemTap(e)
    {
        this.editTitle = 'Add Compensation'
        this.editBtn = 'Add Compensation'
        this.edititem = { } //Type: 'QuantityDiscount' }
        this.edititem_A = null
        this.edititem_I = null

        this._openDlg(this.$.dialog_compensation as PaperDialogElement)
    }

    editFabricShrinkCompensationTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index

        this.editTitle = 'Edit Compensation'
        this.editBtn = 'Apply Compensation'
        this.edititem = Object.assign({}, item)
        this.edititem_A = item
        this.edititem_I = inx

        this._openDlg(this.$.dialog_compensation as PaperDialogElement)
    }

    deleteFabricShrinkCompensationTap(e)
    {
        var list = this.order.FabricShrinkCompensation
        var item = e.model.__data.item
        for (var i in list)
        {
            if (list[i].Name == item.Name)
            {
                list.splice(i, 1)
                this.notifyPath('order.FabricShrinkCompensation')
                break
            }
        }
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_FabricShrinkCompensation')
        if (grid) { grid.clearCache() }
    }

    saveFabricShrinkCompensationTap(e)
    {
        if (this.order) 
        {
            if (!this.order.FabricShrinkCompensation) { this.set('order.FabricShrinkCompensation', {}) }
        }
        var items = this.order.FabricShrinkCompensation
        if (this.edititem_I != null)
        {
            items[this.edititem_I] = Object.assign(items[this.edititem_I], this.edititem)
            this.notifyPath('order.FabricShrinkCompensation.' + this.edititem_I)
        }
        else
        {
            items.push(Object.assign({}, this.edititem))
            this.notifyPath('order.FabricShrinkCompensation')
        }
    }


    addNewAggregationCellsItemTap(e)
    {
        this.editTitle = 'Add Cells'
        this.editBtn = 'Add Cells'
        var sinx = this.AggregationShelves ? this.AggregationShelves.length : 1
        this.edititem = { ShelfIndex: ''+sinx } //Type: 'QuantityDiscount' }
        this.edititem_A = null
        this.edititem_I = null
        this.edititem_hostI = null

        this._openDlg(this.$.dialog_agcell as PaperDialogElement)
    }

    editAggregationCellsTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index
        var hinx = e.model.__dataHost.__dataHost.__data.index

        this.editTitle = 'Edit Cells'
        this.editBtn = 'Apply Cells'
        this.edititem = Object.assign({}, item)
        this.edititem_A = item
        this.edititem_I = inx
        this.edititem_hostI = hinx


        this._openDlg(this.$.dialog_agcell as PaperDialogElement)
    }

    hideShelfIndex(editTitle)
    {
        return editTitle !== 'Add Cells'
    }

    deleteAggregationCellsTap(e)
    {
        var item = e.model.__data.item
        var iteminx = e.model.__data.index
        var shelvei = e.model.__dataHost.__dataHost.__data.shelvei
        var shelveinx = e.model.__dataHost.__dataHost.__data.index //itemsIndex

        this.order.AggregationShelves[shelveinx].RowGroups.splice(iteminx, 1)
        this.notifyPath('order.AggregationShelves.' + shelveinx + '.RowGroups')
        if (this.order.AggregationShelves[shelveinx].RowGroups.length < 1)
        {
            this.splice('order.AggregationShelves', shelveinx, 1)
            this.notifyPath('order.AggregationShelves')
        }

        const grids: any = this.shadowRoot.querySelectorAll('#aggregation-list vaadin-grid')
        if (grids && grids.length >= shelveinx) 
        {
            grids[shelveinx].clearCache()
        }
    }

    saveAggregationCellsTap(e)
    {
        if (this.order)
        {
            if (!this.order.AggregationShelves) { this.set('order.AggregationShelves', []) }
        }

        if (this.edititem_I != null && this.edititem_hostI != null)
        {
            var items = this.order.AggregationShelves[this.edititem_hostI].RowGroups
            if (this.edititem_A.ShelfIndex === this.edititem.ShelfIndex)
            {
                items[this.edititem_I] = Object.assign(items[this.edititem_I], this.edititem)
                this.notifyPath('order.AggregationCells.' + this.edititem_hostI + '.RowGroups.' + this.edititem_I)

                const grids: any = this.shadowRoot.querySelectorAll('#aggregation-list vaadin-grid')
                if (grids && grids.length >= this.edititem_hostI) 
                {
                    grids[this.edititem_hostI].clearCache()
                }
            }
        }
        else
        {
            var hostItems = this.order.AggregationShelves
            var hasShelf = false
            for (var i in hostItems)
            {
                if (hostItems[i].ShelfIndex == this.edititem.ShelfIndex)
                {
                    hasShelf = true
                    hostItems[i].RowGroups.push(Object.assign({}, this.edititem))
                    const grids: any = this.shadowRoot.querySelectorAll('#aggregation-list vaadin-grid')
                    if (grids && grids.length > parseInt(i)) 
                    {
                        grids[i].clearCache()
                    }
                    break
                }
            }

            if (!hasShelf)
            {
                var shelfnew = { ShelfIndex: this.edititem.ShelfIndex, RowGroups: [this.edititem] }
                var len = this.push('order.AggregationShelves', shelfnew)
                var inx = len - 1
                this.notifyPath('order.AggregationShelves')
                // this.notifyPath('order.AggregationShelves.' + inx + '.RowGroups')

                this.async(() =>
                {
                    const grids: any = this.shadowRoot?.querySelectorAll('#aggregation-list vaadin-grid')
                    if (grids && grids.length > len)
                    {
                        grids[inx].clearCache()
                    }
                })
            }
        }
    }


    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _removeShelveTap(e)
    {
        var shelvei = e.model.__data.shelvei
        for (var i in this.order.AggregationShelves)
        {
            if (this.order.AggregationShelves[i] && shelvei && this.order.AggregationShelves[i] === shelvei)//this.order.AggregationShelves[i].ShelveID === shelvei.ShelveID)
            {
                var inx = this.order.AggregationShelves.indexOf(this.order.AggregationShelves[i])
                this.splice('order.AggregationShelves', inx, 1)
                this.notifyPath('order.AggregationShelves')
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeUserTap(e)
    {
        var useri = e.model.__data.useri
        for (var i in this.order.Users)
        {
            if (this.order.Users[i] && useri && this.order.Users[i].UserID === useri.UserID)
            {
                var inx = this.order.Users.indexOf(this.order.Users[i])
                this.splice('order.Users', inx, 1)
                this.notifyPath('order.Users')
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addUserTap(e)
    {
        var useridInput = e.target.parentElement
        var userid = useridInput.value

        if (!userid) { return }

        var user = { UserID: userid.trim() }
        this.push('order.Users', user)
        this.notifyPath('order.Users')

        useridInput.value = ''

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _onUserSearchAdded(e)
    {
        var user = e?.detail?.user
        if (user)
        {
            this.push('order.Users', user)
            e.stopPropagation()
        }
    }

    _transforMatrix(str)
    {
        return `transform: matrix(${str})`
    }

}
