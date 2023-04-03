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
import { Currency, b64toBlob } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { NetBase } from '../../components/bll/net-base'
import { APIResponseModel } from '../../components/dal/api-response-model'
import view from './product-font.ts.html'
import style from './product-font.ts.css'
import style_shared from './shared-styles.css'
import 'multiselect-combo-box'
// import '../ui/ui-product-item'
// import '../../components/ui/ui-description'
// import '../../components/ui/ui-image-svg'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const NEWFONTID = '_new_'
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }



@FragmentDynamic
class AdminProductFont extends FragmentBase
{
    static get is() { return 'tmladmin-product-font' }

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
            
            newFilename: { type: Boolean, computed: '_compute_newFilename(order.FontID)' },
            loadingFont: { type: Boolean, },

            APIPath: { type: String, value: '/admin/api/font/font-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pfontid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            dialog_replace: { type: Object },
            zoomimgi: { type: Object },
            _fonts: { type: Array, value: {} },
            _disabledDownloadFont: { type: Boolean, computed: '_compute_disabledDownloadFont(order.FontID, _fonts, _fonts.*)' },
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
    dialog_replace: any
    loadingFont: boolean

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
            this.saveFontTap()
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
    
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        // console.log(order, orderP)
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


    _tailsItems(fontfacei_Characters)
    {
        if (typeof(fontfacei_Characters) !== 'string') { return [] }
        const r = fontfacei_Characters.split('')
        return r
    }

    onCloseEditItemDialog(e)
    {
    }

    _orderLoaded(order)
    {
        if (order?.FontID)
        {
            this._loadFontFile(order?.FontID, order?.Family)
        }
    }

    hideSaveBtn(font)
    {
        return false
    }

    hideCloneBtn(font)
    {
        return !font.FontID || font.FontID == NEWFONTID
    }

    _compute_newFilename(fontID)
    {
        return fontID == NEWFONTID
    }

    cloneFontTap(e)
    {
        var url = this._urlViewProductFont(NEWFONTID, this.order.FontID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    parseFontTap(e?)
    {
        var url = this._urlViewProductFont(this.order.Filename)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveFontTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveFontConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.FontID != newmodel.FontID)
            {
                var qp = { pfontid: newmodel.FontID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }
    
    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _titleFilename(newFilename)
    {
        return newFilename ? 'Filename' : 'Filename (read-only)'
    }

    _tooltip(txt)
    {
        return this._asBool(txt) ? txt : ''
    }

    _compute_disabledDownloadFont(fontID, fonts, fontsP)
    {
        var inx = MD5(fontID)
        return !(fonts && this._asBool(fonts[inx]))
    }

    _formatFontFilename(filename)
    {
        if (typeof(filename) != 'string') { return filename }
        return StringUtil.replaceAll(filename, 'data/Fonts/', '')
    }

    _filenameToMimeType(filename)
    {
        var inx = filename.lastIndexOf('.')
        var ext = 'ttf'
        if (inx >= 0 && filename.length > inx) 
        {
            ext = filename.substring(inx + 1)
        }
        var format = ''
        switch(ext)
        {
            case 'eot':     format = 'embedded-opentype'; break
            case 'otf':     format = 'opentype'; break
            case 'woff2':   format = 'woff2'; break
            case 'woff':    format = 'woff'; break
            case 'svg':     format = 'svg'; break
            case 'ttf':     format = 'truetype'
            default:
                format = 'truetype'
        }

        return format
    }

    _fontloader: NetBase
    _fonts: any
    _loadFontFile(fontID, fontFamily)
    {
        this.style.setProperty("--loaded-font-family", fontFamily)

        if (this._fonts[fontID]) { return }
        //loading-font ...
        if (!this._fontloader) { this._fontloader = new NetBase() }
        this.async(async () => 
        {
            this.loadingFont = true
            try
            {
                this.api_action = 'get-font'
                var r = await this._fontloader._apiRequest(this.api_url, { pfontid: fontID }, 'GET') as APIResponseModel | null | undefined
                if (r?.success && r?.result)
                {
                    // console.log(r.result.Filename,  r.result.FileContent)
                    var fontFormat = this._filenameToMimeType(r.result.Filename)
                    var fontcss = `
                    @font-face {
                        font-family: '${fontFamily}';
                        src: url(data:application/x-font-${fontFormat};charset=utf-8;base64,${r.result.FileContent}) format('${fontFormat}');
                    }`
                    var fontStyle = StringUtil.replaceAll(r.result.Filename, '/', '_')
                    fontStyle = StringUtil.replaceAll(fontStyle, ' ', '_')
                    fontStyle = StringUtil.replaceAll(fontStyle, '.', '_')
                    this._attachHeadStyle(fontcss, fontStyle)

                    var inx = MD5(fontID)
                    this.set(`_fonts.${inx}`, r.result)
                }
                this.loadingFont = false
            }
            catch
            {
                this.loadingFont = false
            }
        })
    }

    async _downloadFontTap(e)
    {
        try
        {
            var inx = MD5(this.order.FontID)
            var fontObj = this._fonts[inx]
            var fontFormat = this._filenameToMimeType(fontObj.Filename)
            var blob = b64toBlob(fontObj.FileContent, `application/x-font-${fontFormat}`)
            var link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = this._formatFontFilename(fontObj.Filename)
            const clickHandler = () => 
            {
                setTimeout(() => 
                {
                    this.removeEventListener('click', clickHandler)
                }, 150)
            }
            link.addEventListener('click', clickHandler, false)
            link.click()
        }
        catch(e)
        {
            console.error(e)
        }
    }


    //#region Replace

    addReplaceTap(e)
    {
        var useridInput = e.target.parentElement
        var replacenew = useridInput.value
        if (!replacenew || !replacenew.trim || replacenew.trim() == '') { return }
        var replacenewTrim = replacenew.trim()
        if (replacenewTrim.indexOf("d~") == 0)
        {
            replacenewTrim = "d~" + StringUtil.replaceAll(replacenewTrim, "d~", "").toUpperCase()
        }
        else
        {
            replacenewTrim = replacenewTrim.toUpperCase()
        }

        var fontfaceinx = e.target.parentElement.getAttribute('data-fontface-index')
        var replacenewObj = { From: replacenewTrim, To: '' }
        var dialog_replace = {
            title: 'Add Replace Item',
            saveBtn: 'Add',
            editItem: replacenewObj,
            editItem_A: replacenewObj,
            editItem_I: null,
            editItem_II: fontfaceinx,
            editItem_Edit: false,
        }

        this.set('dialog_replace', dialog_replace)
        this._openDlg(this.$.dialog_replace as PaperDialogElement)

        useridInput.value = ''

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveReplaceTap(e)
    {
        if (this.order) 
        {
            if (!this.order.FontfaceList) { this.set('order.FontfaceList', []) }
        }
        var { editItem, editItem_A, editItem_I, editItem_II, editItem_Edit } = this.dialog_replace

        var items = this.order.FontfaceList[editItem_II].Replace
        if (editItem_I != null && editItem_Edit)
        {
            items[editItem_I] = editItem
            this.notifyPath(`order.FontfaceList.${editItem_II}.Replace.` + editItem_I)
        }
        else
        {
            this.push(`order.FontfaceList.${editItem_II}.Replace`, Object.assign({}, editItem))
        }
        this.notifyPath(`order.FontfaceList.${editItem_II}.Replace`)
    }

    editReplaceTap(e)
    {
        var replacei = e.model.__data.replacei
        var replaceiinx = e.model.__data.index
        var fontfaceinx = e.model.__dataHost.__dataHost.__data.index
        var dialog_replace = {
            title: 'Edit Replace Item',
            saveBtn: 'Apply',
            editItem: Object.assign({}, replacei),
            editItem_A: replacei,
            editItem_I: replaceiinx,
            editItem_II: fontfaceinx,
            editItem_Edit: true,
        }
        this.set('dialog_replace', dialog_replace)
        this._openDlg(this.$.dialog_replace as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    upwardReplaceTap(e)
    {
        var replaceiinx = e.model.__data.index
        var fontfaceinx = e.model.__dataHost.__dataHost.__data.index

        if (replaceiinx === -1) { return } // throw new Error("Element not found in array")
        var inxto = replaceiinx - 1
        if (inxto < 0) { return }

        var el = this.splice(`order.FontfaceList.${fontfaceinx}.Replace`, replaceiinx, 1)
        this.splice(`order.FontfaceList.${fontfaceinx}.Replace`, inxto, 0, el[0])
    }

    downwardReplaceTap(e)
    {
        var replaceiinx = e.model.__data.index
        var fontfaceinx = e.model.__dataHost.__dataHost.__data.index

        if (replaceiinx === -1) { return } // throw new Error("Element not found in array")
        var inxto = replaceiinx + 1
        if (inxto > this.order.FontfaceList[fontfaceinx].Replace.length) { return }

        var el = this.splice(`order.FontfaceList.${fontfaceinx}.Replace`, replaceiinx, 1)
        this.splice(`order.FontfaceList.${fontfaceinx}.Replace`, inxto, 0, el[0])
    }

    deleteReplaceTap(e)
    {
        var replaceiinx = e.model.__data.index
        var fontfaceinx = e.model.__dataHost.__dataHost.__data.index

        this.splice(`order.FontfaceList.${fontfaceinx}.Replace`, replaceiinx, 1)
        this.notifyPath(`order.FontfaceList.${fontfaceinx}.Replace`)
        
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    //#endregion
}
