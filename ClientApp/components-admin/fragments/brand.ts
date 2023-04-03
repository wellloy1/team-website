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
import { Currency, Clipboard } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { UIAdminDialog } from '../ui/ui-dialog'
import { NetBase } from '../../components/bll/net-base'
import view from './brand.ts.html'
import style from './brand.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../ui/ui-dialog'
import '../ui/ui-product-item'
import '../ui/ui-color-input-picker'
import '../ui/ui-color-form-picker'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
export class AdminBrand extends FragmentBase
{
    static get is() { return 'tmladmin-brand' }

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
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title

            APIPath: { type: String, value: '/admin/api/brand/brand-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['brandid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTitle: { type: String },
            editBtn: { type: String },
            editSource: { type: Object, value: {}, notify: true },
            editType: { type: Boolean, value: false },

            activeItem: { type: Object },
            selectedProductionTemplateSvg: { type: String, value: '', notify: true },

            gridCellClassNameGenerator: { type: Object },
            zoomimgi: { type: Object },
            dialogeditcolor: { type: Object },

            isManufacturer: { type: Boolean, value: false },
        }
    }

    _netbase: any
    _observer: any
    hasUnsavedChanges: boolean
    order: any
    isManufacturer: boolean
    dialogeditcolor:any

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_orderLoaded(order)',
            '_queryColor(queryParams.Color, queryParams)',
        ]
    }
    _log(v) { console.log(v) }


    connectedCallback()
    {
        super.connectedCallback()

        document.addEventListener("keydown", (e) => this._onKeydown(e))
        this.addEventListener('tmladmin-ui-color-input-picker-add', (e) => this.onNewColorTap(e))
    }

    ready()
    {
        super.ready()
    }

    _datareloadDebouncer: Debouncer
    _dataReloadChanged(visible, queryParams)
    {
        // console.log('_dataReloadChanged', visible, queryParams)
        if (visible !== true || queryParams == undefined) { return }

        //check vars
        if (this.queryParamsRequired)
        {
            for (var i in this.queryParamsRequired) 
            {
                var v = this.queryParamsRequired[i]
                // console.log(v)
                if (queryParams[v] == undefined) { return }
            }
        }

        // console.log('reload - fire')
        this._datareloadDebouncer = Debouncer.debounce(this._datareloadDebouncer, timeOut.after(200), () =>
        {
            // console.log('reload - fire', queryParams)
            this.reload()
        })        
    }


    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveBrandTap()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            if (Array.isArray(this.order?.BrandColors))
            {
                for (var i in this.order.BrandColors)
                {
                    this.set(`order.BrandColors.${i}.IsEditTitle`, false)
                }
            }

            e.preventDefault()
            e.stopPropagation()
        }
    }
    
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
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

    _orderLoaded(order)
    {
        if (!order) { return }

        if (Array.isArray(order?.BrandColors) 
            && order.BrandColors.length > 0 
            && !order.BrandColors[0].Title)
        {
            this.set('order.BrandColors', [
                { 
                    ID: 'c0',
                    Title: 'Default',
                    Colors: order.BrandColors,
                }
            ])
        }
    }

    hideSaveBtn(brand)
    {
        return false
    }

    hideCloneBtn(brand)
    {
        return !brand.BrandID || brand.BrandID == '_new_'
    }

    cloneBrandTap(e)
    {
        var url = this._urlViewBrand('_new_', this.order.BrandID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveBrandTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveBrandConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.BrandID != newmodel.BrandID)
            {
                var qp = { brandid: newmodel.BrandID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    async pasteBrandColorsTap(e)
    {
        try
        {
            var json: any = await Clipboard.readFromClipboard()
            var model = JSON.parse(json)
            this.applyBrandColorsValidation(model)
            this.showToast('Brand Colors has been pasted from Clipboard...')
        }
        catch (e)
        {
            this.showToast('Brand Colors paste was failed - ' + e.message)
        }
    }

    applyBrandColorsValidation(model)
    {
        if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not array') }
        
        for (var i in model)
        {
            if (!model[i]['Title']) { throw new Error('model has no Title') }
            if (!Array.isArray(model[i]['Colors'])) { throw new Error('model has no Colors') }
            //                 "n": "PANTONE Yellow C",
            //                 "h": "FFDD00"
        }
        this.set('order.BrandColors', model)
    }

    copyBrandColorsTap(e)
    {
        this.showToast('Brand Colors has been copied to Clipboard...')
        Clipboard.copyFromString(JSON.stringify(this.order.BrandColors, null, "\t"))
    }

    _addColorCategoryTap(e)
    {
        var useridInput = e.target.parentElement
        var catTitle = useridInput.value
        if (!catTitle || !catTitle.trim || catTitle.trim() == '') { return }
        var colorCatTitleTrim = catTitle.trim()

        this.push('order.BrandColors', {
            ID: colorCatTitleTrim,
            Title: colorCatTitleTrim,
            Colors: [],
        })
        this.notifyPath(`order.BrandColors`)

        useridInput.value = ''

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeColorCategoryTap(e)
    {
        var bcolorcatinx = e.model.__data.bcolorcatinx
        this.splice(`order.BrandColors`, bcolorcatinx, 1)
        this.notifyPath(`order.BrandColors`)
    }

    _removeColorTap(e)
    {
        var bcolorcatinx = e?.model?.__dataHost?.__dataHost?.__data?.bcolorcatinx
        var colinx = e?.model?.__data?.colinx
        this.splice(`order.BrandColors.${bcolorcatinx}.Colors`, colinx, 1)
        this.notifyPath(`order.BrandColors.${bcolorcatinx}.Colors`)
    }

    _removeStandardColorTap(e)
    {
        var colinx = e.model.__data.colinx
        this.splice(`order.StandardColors`, colinx, 1)
        this.notifyPath(`order.StandardColors`)
    }

    _editCategoryTap(e)
    {
        var bcolorcatinx = e.model.__data.bcolorcatinx
        this.set(`order.BrandColors.${bcolorcatinx}.IsEditTitle`, true)
    }

    _editCategoryDoneTap(e)
    {
        var bcolorcatinx = e.model.__data.bcolorcatinx
        this.set(`order.BrandColors.${bcolorcatinx}.IsEditTitle`, false)
    }

    onNewColorTap(e)
    {
        if (!e?.detail?.color) { return }
        var col = e.detail.color
        var data = e?.detail?.target?.parentElement?.__dataHost?.__dataHost?.__data
        if (data?.bcolorcati)
        {
            this.push(`order.BrandColors.${data?.bcolorcatinx}.Colors`, col)
            this.notifyPath(`order.BrandColors.${data?.bcolorcatinx}.Colors`)
        }
        else 
        {
            if (!this.order.StandardColors) { this.set('order.StandardColors', []) }
            this.push(`order.StandardColors`, col)
            this.notifyPath(`order.StandardColors`)
        }
    }

    _upwardStdColorTap(e)
    {
        var coli = e.model.__data.coli
        var inx = -1
        for (var i in this.order.StandardColors)
        {
            if (this.order.StandardColors[i] && coli && this.order.StandardColors[i] === coli)
            {
                inx = this.order.StandardColors.indexOf(this.order.StandardColors[i])
                break
            }
        }
        // this.splice('order.StandardColors', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }
        var el = this.splice('order.StandardColors', inx, 1)
        this.splice('order.StandardColors', inxto, 0, el[0])
    }

    _downwardStdColorTap(e)
    {
        var coli = e.model.__data.coli
        var inx = -1
        for (var i in this.order.StandardColors)
        {
            if (this.order.StandardColors[i] && coli && this.order.StandardColors[i] === coli)
            {
                inx = this.order.StandardColors.indexOf(this.order.StandardColors[i])
                break
            }
        }
        // this.splice('order.StandardColors', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.StandardColors.length) { return }

        var el = this.splice('order.StandardColors', inx, 1)
        this.splice('order.StandardColors', inxto, 0, el[0])
    }

    queryColorHandler(col, queryParams)
    {
        var catinx = queryParams.catinx
        if (this.order?.BrandColors?.length >= (catinx + 1))
        {
            this.push(`order.BrandColors.${catinx}.Colors`, col)
            this.notifyPath(`order.BrandColors.${catinx}.Colors`)
        }
    }

    _editColorTap(e)
    {
        var coli = e?.model?.__data?.coli
        var colinx = e?.model?.__data?.colinx
        var bcolorcatinx = e?.model?.__dataHost?.__dataHost?.__data?.bcolorcatinx

        var dialogeditcolor = this.$.dialogeditcolor as UIAdminDialog
        if (dialogeditcolor && coli)
        {
            this.set('dialogeditcolor', Object.assign({ 
                colinx: colinx,
                bcolorcatinx: bcolorcatinx,
                color: coli,
            }))
            dialogeditcolor.open()
        }
        e.preventDefault()
        return false
    }

    _onEditColorConfirmTap(e)
    {
        if (this.dialogeditcolor)
        {
            this.set(`order.BrandColors.${this.dialogeditcolor.bcolorcatinx}.Colors.${this.dialogeditcolor.colinx}`, Object.assign({}, this.dialogeditcolor.color))
        }
    }

    onInputChanged(e)
    {
        if (e?.model?.__data?.bcolorcati)
        {
            this.notifyPath('order.BrandColors')
        }
        return this._onInputChanged(e)
    }

}
