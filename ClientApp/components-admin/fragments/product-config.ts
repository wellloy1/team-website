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
import view from './product-config.ts.html'
import style from './product-config.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-user-inline'
import '../ui/ui-product-item'
import '../ui/ui-search-input'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminProductConfig extends FragmentBase
{
    static get is() { return 'tmladmin-product-config' }

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

            APIPath: { type: String, value: '/admin/api/productconfiguration/pc-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pconfigid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTitle: { type: String },
            editBtn: { type: String },
            editSource: { type: Object, value: {}, notify: true },
            editType: { type: Boolean, value: false },

            individualPrivileges: { type: Boolean, computed: '_compute_individualPrivileges(order.shareToEveryoneToggle)' },

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
            '_orderLoaded(order)',
            // '_log(order.*)',
        ]
    }

    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()

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
            this.saveProductConfTap()
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

    _compute_individualPrivileges(shareToEveryoneToggle)
    {
        return !shareToEveryoneToggle
    }
    
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        // console.log(order, orderP)
        try
        {
            var orderSavedObj = orderSaved ? JSON.parse(orderSaved) : {}
            orderSavedObj.ProductConfiguration = order?.ProductConfiguration
            orderSaved = JSON.stringify(orderSavedObj)
            }
        catch
        {
        }

        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    _orderLoaded(order)
    {
        // var designs = order.Designs
        // var setname = ''
        // var inx = 0
        // for (var i in designs)
        // {
        //     if (designs[i].SetName != setname)
        //     {
        //         inx++
        //         setname = designs[i].SetName
        //     }
        //     this.set(`order.Designs.{i}.SetIndex`, inx)
        // }
        // this.set('order.Designs', designs)

        // this.set('order.Users', [])
        // this.set('order.Organizations', [])
    }

    _onDownloadAI(e) 
    {
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        // console.log(id, progress)
        this.getDesignFile({ id: id, type: 'ai' }, progress)
        e.preventDefault()
        return false
    }

    _onDownloadSVG(e) 
    {
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        // console.log(id, progress)
        this.getDesignFile({ id: id, type: 'svg' }, progress)
        e.preventDefault()
        return false
    }

    hideAll(selectedProductionTemplateSvg)
    {
        return selectedProductionTemplateSvg != ''
    }

    formatOrganization(org, addOrgID?)
    {
        var s = ''
        if (org && org.Name) { s += org.Name }
        if (org && org.OrganizationID) 
        {
            if (s == '') 
            { 
                s += '[' + org.OrganizationID + ']' 
            }
            else if (addOrgID === true)
            {
                s = '[' + org.OrganizationID + ']\n ' + s
            }
        }
        return s
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

    onMeshSourceNameTap(e)
    {
        var item = e.model.__data.item
        if (item?.notvalid?.MeshSourceSvg)
        {
            //show dialog
            this.zoomimgi = item?.notvalid?.MeshSourceSvg
            this.zoomimgiName = item?.MeshSourceName
            this._openDlg(this.$.dialogzoom as PaperDialogElement)

        }
        // console.log(e, item?.notvalid?.MeshSourceName, item?.notvalid?.MeshSourceSvg)
    }

    _activeItemChanged(activeItem)
    {
        this.selectedProductionTemplateSvg = activeItem ? activeItem.PartSvg : ''
    }

    _gridSourcesReset(sourceP) 
    {
        // console.log(sourceP)
        const grid:any = this.shadowRoot.querySelector('vaadin-grid#grid_Sources')

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

    hideSaveBtn(pc)
    {
        return false
    }

    // showenCloneBtn(pc)
    // {
    //     return pc.ProductConfigurationID && pc.ProductConfigurationID != '_new_'
    // }

    // showenCloneDomainSelector(pc)
    // {
    //     return pc.ProductConfigurationID && pc.ProductConfigurationID == '_new_'
    // }

    // cloneViewTap(e)
    // {
    //     var url = this._urlViewPConfiguration('_new_', this.order.ProductConfigurationID)
    //     this._goto(url)

    //     e.preventDefault()
    //     e.stopPropagation()
    //     return false
    // }

    saveProductConfTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveProductConfConfirmTap(e)
    {
        if (this.order.shareToEveryoneToggle && Array.isArray(this.order.Designs))
        {
            for (var i in this.order.Designs)
            {
                this.order.Designs[i].Users = []
                this.order.Designs[i].Organizations = []
            }
        }

        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.ProductConfigurationID != newmodel.ProductConfigurationID)
            {
                var qp = { pconfigid: newmodel.ProductConfigurationID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    onCloseEditSourceDialog(e)
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Sources')
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

        this._openDlg(this.$.dialog_view as PaperDialogElement)
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

    pmSizesList(productManufacturers, editSource)
    {
        var pm = productManufacturers.filter(i => i.ProductManufacturerID == editSource.ProductManufacturerID)
        
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

    _removeProductManufacturerTap(e)
    {
        var mprodi = e.model.__data.mprodi
        for (var i in this.order.ProductManufacturers)
        {
            if (this.order.ProductManufacturers[i] && mprodi && this.order.ProductManufacturers[i] === mprodi)
            {
                var inx = this.order.ProductManufacturers.indexOf(this.order.ProductManufacturers[i])
                this.splice('order.ProductManufacturers', inx, 1)
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _upwardProductManufacturerTap(e)
    {
        var mprodi = e.model.__data.mprodi
        var inx = -1
        for (var i in this.order.ProductManufacturers)
        {
            if (this.order.ProductManufacturers[i] && mprodi && this.order.ProductManufacturers[i] === mprodi)
            {
                inx = this.order.ProductManufacturers.indexOf(this.order.ProductManufacturers[i])
                break
            }
        }
        // this.splice('order.ProductManufacturers', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }
        var el = this.splice('order.ProductManufacturers', inx, 1)
        this.splice('order.ProductManufacturers', inxto, 0, el[0])
    }

    _downwardProductManufacturerTap(e)
    {
        var mprodi = e.model.__data.mprodi
        var inx = -1
        for (var i in this.order.ProductManufacturers)
        {
            if (this.order.ProductManufacturers[i] && mprodi && this.order.ProductManufacturers[i] === mprodi)
            {
                inx = this.order.ProductManufacturers.indexOf(this.order.ProductManufacturers[i])
                break
            }
        }
        // this.splice('order.ProductManufacturers', inx, 1)

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.ProductManufacturers.length) { return }

        var el = this.splice('order.ProductManufacturers', inx, 1)
        this.splice('order.ProductManufacturers', inxto, 0, el[0])
    }

    _addProductManufacturerTap(e)
    {
        var useridInput = e.target.parentElement
        var mprodnew = useridInput.value
        if (!mprodnew || !mprodnew.trim || mprodnew.trim() == '') { return }
        var mprodnewTrim = mprodnew.trim()
        if (mprodnewTrim.indexOf("d~") == 0)
        {
            mprodnewTrim = "d~" + StringUtil.replaceAll(mprodnewTrim, "d~", "").toUpperCase()
        }
        else
        {
            mprodnewTrim = mprodnewTrim.toUpperCase()
        }

        var inx = -1
        for (var i in this.order.ProductManufacturers)
        {
            if (this.order.ProductManufacturers[i] && mprodnewTrim && this.order.ProductManufacturers[i].ProductManufacturerID === mprodnewTrim)
            {
                inx = this.order.ProductManufacturers.indexOf(this.order.ProductManufacturers[i])
                this._applyDetailsErrors('order', [{ Key: "ProductManufacturerID", Message: "Duplicate Product Manufacturer ID", Type: "e" }])
                return
            }
        }


        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'createpm'
        var mprodnewObj: any = { ProductManufacturerID: mprodnewTrim }

        this.cmdPost(this.api_url, mprodnewObj, (r, response) =>
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
                    this.push('order.ProductManufacturers', newItem)
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

    cloneSourceTap(e)
    {
        var item = e.model.__data.item
        var newItem = JSON.parse(JSON.stringify(item))

        this.editTitle = 'Edit New Source'
        this.editBtn = 'Add Source'
        this.editSource = newItem
        this.editSource_I = null
        this.editType = false
        
        this._openDlg(this.$.dialog_view as PaperDialogElement)
    }

    addNewSourceTap(e)
    {
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true

        this.api_action = 'createsource'
        var sourceObj: any = { 
            Sizes: this.order.ProductManufacturers.map((currentValue, index, array) => {
                return { 
                    ProductManufacturerID: currentValue.ProductManufacturerID, 
                    ProductType: currentValue.Type, 
                }
            }) 
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

                    this._openDlg(this.$.dialog_view as PaperDialogElement)
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


    _onUserSearchAdded(e)
    {
        var user = e?.detail?.user
        if (!user) { return }
        var designinx = e?.detail?.target?.__dataHost?.__dataHost?.__dataHost?.__dataHost?.__data?.designinx
        if (this._asBool(designinx))
        {
            this.push(`order.Designs.${designinx}.Users`, user)
            e.stopPropagation()
        }
        else
        {
            this.push(`order.Users`, user)
            e.stopPropagation()
        }
    }

    _removeUserTap(e)
    {
        var useri = e.model.__data.useri
        var designinx = e?.model?.__dataHost?.__dataHost?.__dataHost?.__dataHost?.__data?.designinx
        if (!this._asBool(designinx)) { return }

        for (var i in this.order.Designs[designinx].Users)
        {
            if (this.order.Designs[designinx].Users[i] && useri && this.order.Designs[designinx].Users[i].UserID === useri.UserID)
            {
                var inx = this.order.Designs[designinx].Users.indexOf(this.order.Designs[designinx].Users[i])
                this.splice(`order.Designs.${designinx}.Users`, inx, 1)
                this.notifyPath(`order.Designs.${designinx}.Users`)
                break
            }
        }
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeUserPCTap(e)
    {
        var useri = e.model.__data.useri
        for (var i in this.order.Users)
        {
            if (this.order.Users[i] && useri && this.order.Users[i].UserID === useri.UserID)
            {
                var inx = this.order.Users.indexOf(this.order.Users[i])
                this.splice(`order.Users`, inx, 1)
                this.notifyPath(`order.Users`)
                break
            }
        }
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addOrganizationTap(e)
    {
        var orgID = e.target.parentElement.value
        var designinx = e?.target?.__dataHost?.__dataHost?.__dataHost?.__data?.designinx
        if (orgID && this._asBool(designinx))
        {
            e.target.parentElement.value = ''
            this.push(`order.Designs.${designinx}.Organizations`, { OrganizationID: orgID })
            e.stopPropagation()
        }
    }

    _removeOrganizationTap(e)
    {
        var organizationi = e.model.__data.organizationi
        var designinx = e?.model?.__dataHost?.__dataHost?.__dataHost?.__dataHost?.__data?.designinx
        if (!this._asBool(designinx)) { return }

        for (var i in this.order.Designs[designinx].Organizations)
        {
            if (this.order.Designs[designinx].Organizations[i] && organizationi && this.order.Designs[designinx].Organizations[i].OrganizationID === organizationi.OrganizationID)
            {
                var inx = this.order.Designs[designinx].Organizations.indexOf(this.order.Designs[designinx].Organizations[i])
                this.splice(`order.Designs.${designinx}.Organizations`, inx, 1)
                this.notifyPath(`order.Designs.${designinx}.Organizations`)
                break
            }
        }
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addOrganizationPCTap(e)
    {
        var orgID = e.target.parentElement.value
        if (orgID)
        {
            e.target.parentElement.value = ''
            this.push(`order.Organizations`, { OrganizationID: orgID })

            //spread Organizations[] -> Designs.Organizations[]

            e.stopPropagation()
        }
    }

    _removeOrganizationPCTap(e)
    {
        var organizationi = e.model.__data.organizationi
        for (var i in this.order.Organizations)
        {
            if (this.order.Organizations[i] && organizationi && this.order.Organizations[i].OrganizationID === organizationi.OrganizationID)
            {
                var inx = this.order.Organizations.indexOf(this.order.Organizations[i])
                this.splice(`order.Organizations`, inx, 1)
                this.notifyPath(`order.Organizations`)
                break
            }
        }
        e.preventDefault()
        e.stopPropagation()
        return false
    }
}
