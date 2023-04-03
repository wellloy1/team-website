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
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { NetBase } from '../../components/bll/net-base'
import { UIAdminDialog } from '../ui/ui-dialog'
import view from './product-view.ts.html'
import style from './product-view.ts.css'
import style_shared from './shared-styles.css'
import '../ui/ui-product-item'
import '../ui/ui-dropdown-menu'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminProductView extends FragmentBase
{
    static get is() { return 'tmladmin-product-view' }

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

            APIPath: { type: String, value: '/admin/api/view/view-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pviewid'] }, //, 'productid'

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
        }
    }

    _netbase: any
    _observer: any
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

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_gridSourcesReset(order.Sources.*)',
        ]
    }

    _log(v) { console.log('product-view', v) }

    connectedCallback()
    {
        super.connectedCallback()

        this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl
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
            this.saveProductViewTap()
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

            // this.saveProductViewTap()
        }
    }
    
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP?.path == 'order.IsProductConfigurationCheckerboard' || orderP?.path == 'order.IsProductConfigurationTexts') { return false }

        try
        {
            var orderSavedObj = orderSaved ? JSON.parse(orderSaved) : {}
            orderSavedObj.ProductConfiguration = order.ProductConfiguration
            orderSaved = JSON.stringify(orderSavedObj)
        }
        catch
        {
        }

        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    _pcWhite(checkerboard, texts)
    {
        return !checkerboard && !texts
    }

    _pcCheckerboard(checkerboard, texts)
    {
        return checkerboard && !texts
    }

    _pcTexts(checkerboard, texts)
    {
        return !checkerboard && texts
    }

    _pcCheckerboardTexts(checkerboard, texts)
    {
        return checkerboard && texts
    }

    _dis_addnewsource(orderViewID, orderProductManufacturerID, loading)
    {
        //orderViewID == '_new_' && 
        return (!orderProductManufacturerID) || loading
    }

    _sizes(orderSizes, editSourceSize)
    {
        return orderSizes ? orderSizes : [editSourceSize]
    }

    hideAll(selectedProductionTemplateSvg)
    {
        return selectedProductionTemplateSvg != ''
    }

    onDownloadTap(e)
    {
        // console.log(e, this.zoomimgiName, this.zoomimgi)
        let filename = this.zoomimgiName
        let data = this.zoomimgi


        var blob = new Blob([data], { type: 'image/svg+xml' })
        if (window.navigator.msSaveOrOpenBlob)
        {
            window.navigator.msSaveBlob(blob, filename)
        }
        else
        {
            var elem = window.document.createElement('a')
            elem.href = window.URL.createObjectURL(blob)
            elem.download = filename
            document.body.appendChild(elem)
            elem.click()
            document.body.removeChild(elem)
        }        
    }

    _activeItemChanged(activeItem)
    {
        this.selectedProductionTemplateSvg = activeItem ? activeItem.PartSvg : ''
    }

    _gridSourcesReset(sourceP) 
    {
        // console.log(sourceP)
        const grid:any = this.shadowRoot ? this.shadowRoot.querySelector('vaadin-grid#grid_Sources') : null

        if (sourceP.path.indexOf('.notvalid') >= 0)
        {
            if (grid) { grid.clearCache() }
        }

        // if (grid && !this._grid_SourceEvent)
        // {
        //     this._grid_SourceEvent = true
        //     grid.addEventListener('active-item-changed', function (event)
        //     {
        //         const item = event.detail.value
        //         grid.selectedItems = item ? [item] : []
        //     })
        // }
    }

    hideSaveBtn(view)
    {
        return false
    }

    hideCloneBtn(view)
    {
        return !view || !view.ViewID || view.ViewID == '_new_'
    }

    cloneViewTap(e)
    {
        var url = this._urlViewProductView('_new_', undefined, this.order?.ViewID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveProductViewTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveProductConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel?.ViewID != newmodel?.ViewID)
            {
                var qp = { pviewid: newmodel?.ViewID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    onCloseEditSourceDialog(e)
    {
        const grid: any = this.shadowRoot ? this.shadowRoot.querySelector('vaadin-grid#grid_Sources') : null
        if (grid) { grid.clearCache() }
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

    editSourceTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index

        this.editTitle = 'Edit Source'
        this.editBtn = 'Apply'
        this.editType = true
        this.editSource = Object.assign({}, item)
        this.editSource.NestingRotations = Object.assign({}, item.NestingRotations)
        this.editSource_A = item
        this.editSource_I = inx

        this._openDlg(this.$.dialog_source as PaperDialogElement)
    }

    deleteSourceTap(e)
    {
        // var item = e.model.__data.item
        var inx = e.model.__data.index
        var epath = e.path || e.composedPath()
        for (var i in epath)
        {
            if (epath[i].tagName == 'VAADIN-GRID')
            {
                this.splice('order.Sources', inx, 1)

                var grid: any = epath[i]
                if (grid) { grid.clearCache() }
                break
            }
        }

    }

    pmSizesList(pm, editSource)
    {
        if (pm.length > 0)
        {
            return pm[0].Sizes
        }
        return []
    }

    saveSource(e)
    {
        if (this.order) 
        {
            if (!this.order.Sources) { this.set('order.Sources', {}) }
        }
        var items = this.order.Sources
        // console.log(Object.assign({}, this.editSource))
        var cameraFileAll = this.editSource.CameraFileAll
        delete this.editSource.CameraFileAll
        // console.log(Object.assign({}, this.editSource), cameraFileAll)
        if (this.editSource_I != null && this.editType)
        {
            items[this.editSource_I] = Object.assign(items[this.editSource_I], this.editSource)
            this.notifyPath('order.Sources.' + this.editSource_I)

            if (cameraFileAll)
            {
                for (var i in this.order.Sources)
                {
                    // console.log(i)
                    this.order.Sources[i].CameraFile = this.editSource.CameraFile
                    this.notifyPath('order.Sources.' + i)
                }
            }
        }
        else
        {
            items.push(Object.assign({}, this.editSource))
            this.notifyPath('order.Sources')
        }
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    cloneSourceTap(e)
    {
        var item = e.model.__data.item
        var newItem = JSON.parse(JSON.stringify(item))

        this.editTitle = 'Edit New Source'
        this.editBtn = 'Add Source'
        this.editSource = newItem
        this.editSource_I = null
        this.editType = false
        
        this._openDlg(this.$.dialog_source as PaperDialogElement)
    }

    addNewSourceTap(e)
    {
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true

        this.api_action = 'createsource'
        var sourceObj: any = { 
            ProductManufacturerID: this.order.ProductManufacturerID, 
        }
        this.cmdPost(this.api_url, sourceObj, (r, response) =>
        {
            progress.active = false
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var newItem = r['result']
                    this.editTitle = 'Add New Source'
                    this.editBtn = 'Add New Source'
                    this.editSource = newItem
                    this.editSource_I = null
                    this.editType = false

                    this._openDlg(this.$.dialog_source as PaperDialogElement)
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

}
