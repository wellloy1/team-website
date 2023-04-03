import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
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
import view from './product-sizecategory.ts.html'
import style from './product-sizecategory.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminProductSizecategory extends FragmentBase
{
    static get is() { return 'tmladmin-product-sizecategory' }

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

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title


            APIPath: { type: String, value: '/admin/api/sizecategory/size-category-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pscid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            edititem: { type: Object, value: {}, notify: true },
            editTitle: { type: String },
            editBtn: { type: String },

            gridCellClassNameGenerator: { type: Object },
        }
    }

    _netbase: any
    _observer: any
    hasUnsavedChanges: boolean
    edititem: any
    editTitle: any
    editBtn: any
    gridCellClassNameGenerator: any
    api_action: any
    order: any
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

    // _log(orderP) { console.log(orderP) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.$.dialogsave.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogsave)
        // this.$.dialog_size.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialog_size)
        
        this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl
    }

    _compute_pageObjectTitle(order, orderP)
    {
        return order?.SizeCategoryName ? order.SizeCategoryName : ''
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveSizeCategoryTap()
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

            //this.saveSizeCategoryTap()
        }
    }

    hideSaveBtn(product)
    {
        return false
    }

    saveSizeCategoryTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveSizeCategoryConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.id != newmodel.id)
            {
                var qp = { pscid: newmodel.id }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    hideAddBtn(order)
    {
        return false
    }

    hideMinCount(type)
    {
        return type != 'QuantityDiscount'
    }

    onCloseEditDiscountDialog(e)
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#discountGrid')
        if (grid) { grid.clearCache() }
        // grid.generateCellClassNames()
    }

    onCloseEditItemDialog(e)
    {
        //
    }

    gridCellClassNameGeneratorImpl(column, rowData)
    {
        var classes = ''
        if (rowData.item.notvalid !== undefined)
        {
            classes = ' notvalid'
        }
        // console.log(rowData, classes)
        return classes
    }

    editItemTap(e)
    {
        var item = e.model.__data.sizei
        var inx = e.model.__data.index

        this.editTitle = 'Edit Size Item'
        this.editBtn = 'Apply'
        this.editItem = Object.assign({}, item)
        this.editItem_A = item
        this.editItem_I = inx
        this.editItem_Edit = true

        this._openDlg(this.$.dialog_size as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    addSizeTap(e)
    {
        var useridInput = e.target.parentElement
        var sizenew = useridInput.value
        if (!sizenew || !sizenew.trim || sizenew.trim() == '') { return }
        var sizenewTrim = sizenew.trim()
        if (sizenewTrim.indexOf("d~") == 0)
        {
            sizenewTrim = "d~" + StringUtil.replaceAll(sizenewTrim, "d~", "").toUpperCase()
        }
        else
        {
            sizenewTrim = sizenewTrim.toUpperCase()
        }

        var inx = -1
        for (var i in this.order.Sizes)
        {
            if (this.order.Sizes[i] && sizenewTrim && this.order.Sizes[i].id === sizenewTrim)
            {
                inx = this.order.Sizes.indexOf(this.order.Sizes[i])
                this._applyDetailsErrors('order', [{ Key: "id", Message: "Duplicate Size ID", Type: "e" }])
                return
            }
        }


        var sizenewObj: any = { SizeCode: sizenewTrim }
        this.editTitle = 'Add Size Item'
        this.editBtn = 'Add'
        this.editItem = sizenewObj
        this.editItem_I = null
        this.editItem_Edit = false

        this._openDlg(this.$.dialog_size as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveSizeTap(e)
    {
        if (this.order) 
        {
            if (!this.order.Sizes) { this.set('order.Sizes', {}) }
        }

        var items = this.order.Sizes
        if (this.editItem_I != null && this.editItem_Edit)
        {
            items[this.editItem_I] = this.editItem //Object.assign(items[this.editItem_I], this.editItem)
            this.notifyPath('order.Sizes.' + this.editItem_I)
            // this.notifyPath('order.Sizes')
        }
        else
        {
            this.push('order.Sizes', Object.assign({}, this.editItem))
        }
    }

    upwardItemTap(e)
    {
        // var item = e.model.__data.sizei
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el = this.splice('order.Sizes', inx, 1)
        this.splice('order.Sizes', inxto, 0, el[0])
    }

    downwardItemTap(e)
    {
        // var item = e.model.__data.sizei
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.Sizes.length) { return }

        var el = this.splice('order.Sizes', inx, 1)
        this.splice('order.Sizes', inxto, 0, el[0])
    }

    deleteItemTap(e)
    {
        // var sizei = e.model.__data.sizei
        var inx = e.model.__data.index
        this.splice('order.Sizes', inx, 1)
        
        e.preventDefault()
        e.stopPropagation()
        return false
    }    

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _addViewIdTap(e)
    {
        var useridInput = e.target.parentElement
        var newid = useridInput.value
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
        for (var i in this.order.ViewIDs)
        {
            if (this.order.ViewIDs[i] && newidTrim && this.order.ViewIDs[i] === newidTrim)
            {
                inx = this.order.ViewIDs.indexOf(this.order.ViewIDs[i])
                this._applyDetailsErrors('order', [{ Key: "ViewIDs", Message: "Duplicate View ID", Type: "e" }])
                return
            }
        }

        useridInput.value = ''
        this.push('order.ViewIDs', { ViewID: newidTrim })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeViewIdTap(e)
    {
        var viewi = e.model.__data.viewi
        for (var i in this.order.ViewIDs)
        {
            if (this.order.ViewIDs[i] && viewi && this.order.ViewIDs[i] === viewi)
            {
                var inx = this.order.ViewIDs.indexOf(this.order.ViewIDs[i])
                this.splice('order.ViewIDs', inx, 1)
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _upwardViewIdTap(e)
    {
        var viewi = e.model.__data.viewi
        var inx = -1
        for (var i in this.order.ViewIDs)
        {
            if (this.order.ViewIDs[i] && viewi && this.order.ViewIDs[i] === viewi)
            {
                inx = this.order.ViewIDs.indexOf(this.order.ViewIDs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el = this.splice('order.ViewIDs', inx, 1)
        this.splice('order.ViewIDs', inxto, 0, el[0])
    }

    _downwardViewIdTap(e)
    {
        var viewi = e.model.__data.viewi
        var inx = -1
        for (var i in this.order.ViewIDs)
        {
            if (this.order.ViewIDs[i] && viewi && this.order.ViewIDs[i] === viewi)
            {
                inx = this.order.ViewIDs.indexOf(this.order.ViewIDs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.ViewIDs.length) { return }

        var el = this.splice('order.ViewIDs', inx, 1)
        this.splice('order.ViewIDs', inxto, 0, el[0])
    }

    _surchargeTitle(sizei)
    {
        return sizei.Name + ' Surcharge'
    }
}
