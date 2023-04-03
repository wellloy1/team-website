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
import view from './product-accessory.ts.html'
import style from './product-accessory.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-image-uploader'
import '../ui/ui-color-input-picker'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminProductAccessory extends FragmentBase
{
    static get is() { return 'tmladmin-product-accessory' }

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

            APIPath: { type: String, value: '/admin/api/productaccessory/accessory-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['accessoryid'] }, //, 'productid'

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
        }
    }

    hasUnsavedChanges: boolean
    // _colorDebouncer: any
    // _closeDebouncer: any
    editManItem: any
    editManItem_Edit: any
    editManItem_A: any
    editManItem_I: any
    editManTitle: any
    editManBtn: any


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_queryColor(queryParams.Color, queryParams)',
            // '_loaded(order)', //temp for tests...
            // '_log(order.Images)',
        ]
    }
    _log(v) { console.log('product-accessory', v) }

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
            this.saveAccessoryConfirmTap()
        }
    }

    _formatWeightGramsLabel(title, weightGrams)
    {
        if (!weightGrams) { return title }
        var wgrams = -1
        try { wgrams = parseInt(weightGrams) } catch { }
        return isFinite(wgrams) ? `${title} - ${this._formatWeight(wgrams, 'lbs')}` : title
    }

    _uploadImagePath(APIPath, path)
    {
        return APIPath + path
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()

            // this.saveAccessoryConfirmTap()
        }
    }

    hideAll(selectedProductionTemplateSvg)
    {
        return selectedProductionTemplateSvg != ''
    }

    hideSaveBtn(accessory)
    {
        return false
    }

    hideCloneBtn(accessory)
    {
        return !accessory.ProductAccessoryID || accessory.ProductAccessoryID == '_new_'
    }

    cloneAccessoryTap(e)
    {
        var url = this._urlViewProductAccessory('_new_', this.order.ProductAccessoryID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveAccessoryConfirmTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveAccessoryTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (newmodel && oldmodel.ProductAccessoryID != newmodel.ProductAccessoryID)
            {
                var qp = { accessoryid: newmodel.ProductAccessoryID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _removeManufacturerTap(e)
    {
        var mani = e.model.__data.mani
        for (var i in this.order.Manufacturers)
        {
            if (this.order.Manufacturers[i] && mani && this.order.Manufacturers[i] === mani)
            {
                var inx = this.order.Manufacturers.indexOf(this.order.Manufacturers[i])
                this.splice('order.Manufacturers', inx, 1)
                this.notifyPath('order.Manufacturers')
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _upwardManufacturerTap(e)
    {
        var mani = e.model.__data.mani
        var inx = -1
        for (var i in this.order.Manufacturers)
        {
            if (this.order.Manufacturers[i] && mani && this.order.Manufacturers[i] === mani)
            {
                inx = this.order.Manufacturers.indexOf(this.order.Manufacturers[i])
                break
            }
        }
        // this.splice('order.Manufacturers', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }
        var el = this.splice('order.Manufacturers', inx, 1)
        this.splice('order.Manufacturers', inxto, 0, el[0])
    }

    _downwardManufacturerTap(e)
    {
        var mani = e.model.__data.mani
        var inx = -1
        for (var i in this.order.Manufacturers)
        {
            if (this.order.Manufacturers[i] && mani && this.order.Manufacturers[i] === mani)
            {
                inx = this.order.Manufacturers.indexOf(this.order.Manufacturers[i])
                break
            }
        }
        // this.splice('order.Manufacturers', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.Manufacturers.length) { return }

        var el = this.splice('order.Manufacturers', inx, 1)
        this.splice('order.Manufacturers', inxto, 0, el[0])
    }

    _addManufacturerTap(e)
    {
        var useridInput = e.target.parentElement
        var newitemid = this._newItemIDPrepare(useridInput?.value)
        if (!newitemid) { return }

        var inx = -1
        for (var i in this.order.Manufacturers)
        {
            if (this.order.Manufacturers[i] && newitemid && this.order.Manufacturers[i].ManufacturerID === newitemid)
            {
                inx = this.order.Manufacturers.indexOf(this.order.Manufacturers[i])
                this._applyDetailsErrors('order', [{ Key: "ManufacturerID", Message: "Duplicate  Manufacturer ID", Type: "e" }])
                return
            }
        }


        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'manufacturer-new'
        var reqObj: any = { ManufacturerID: newitemid }

        this.cmdPost(this.api_url, reqObj, (r, response) =>
        {
            progress.active = false
            useridInput.disabled = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var newItem = r['result']
                    useridInput.value = ''
                    this.push('order.Manufacturers', newItem)
                    this.notifyPath('order.Manufacturers')
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _editManufacturerTap(e)
    {
        var item = e.model.__data.mani
        var inx = e.model.__data.index

        this.editManTitle = 'Edit Accessory Manufactorer'
        this.editManBtn = 'Apply'
        this.editManItem = Object.assign({}, item)
        this.editManItem_A = item
        this.editManItem_I = inx
        this.editManItem_Edit = true

        this._openDlg(this.$.dialog_manufacture as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveManufacturerTap(e)
    {
        if (this.order) 
        {
            if (!this.order.Manufacturers) { this.set('order.Manufacturers', {}) }
        }

        var items = this.order.Manufacturers
        if (this.editManItem_I != null && this.editManItem_Edit)
        {
            items[this.editManItem_I] = this.editManItem
            this.notifyPath('order.Manufacturers.' + this.editManItem_I)
        }
        else
        {
            this.push('order.Manufacturers', Object.assign({}, this.editManItem))
            this.notifyPath('order.Manufacturers')
        }
    }

    onCloseEditManufacturerDialog(e)
    {
        //
    }
}
