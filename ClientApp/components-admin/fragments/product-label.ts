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
import { crc16CCITT } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
import view from './product-label.ts.html'
import style from './product-label.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-color-picker'
import '../../components/ui/ui-image-uploader'
import '../../components/ui/ui-pantone-color-picker'
import '../../components/ui/paper-expansion-panel'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import '../shared-styles/common-styles'
import { Clipboard } from '../../components/utils/CommonUtils'
import { PaperTextareaElement } from '@polymer/paper-input/paper-textarea.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']



@FragmentDynamic
class AdminProductLabel extends FragmentBase
{
    static get is() { return 'tmladmin-product-label' }

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
            colorsSwatchPalette: { type: Array, },

            order: { type: Object, },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title

            APIPath: { type: String, value: '/admin/api/productlabel/label-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['labelid'] }, 

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

            imgList: { type: Object, notify: true, },
            imgZPLBody: { type: String, value: '' },

            // _shouldRenderSwPalette: { type: Boolean, computed: '_shouldRenderSwPaletteCompute(colorsSwatchPalette)' },
            dialogdetails: { type: Object, notify: true },
        }
    }

    hasUnsavedChanges: boolean
    imgZPLBody: string
    scrollTarget: any
    dialogdetails: any

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_processImgList(imgList)',
        ]
    }
    _log(v) { console.log('product-label', v) }

    get zplbodymain() { return this.$['zpl-body-main'] as PaperTextareaElement }


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
            this.saveLabelConfirmTap()
        }
    }

    _uploadImagePath(APIPath, path)
    {
        return APIPath + path
    }

    _onKeydown(e)
    {
        e = e || window.event
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()
        }

        // if (this._dev) console.log(keycode)
        if ((e.ctrlKey && !e.altKey && !e.shiftKey && keycode == 66))
        {
            this.redrawLabelTap()
        }
    }

    hideSaveBtn(label)
    {
        return false
    }

    hideCloneBtn(label)
    {
        return !label.ProductLabelID || label.ProductLabelID == '_new_'
    }

    cloneLabelTap(e)
    {
        var url = this._urlViewProductLabel('_new_', this.order.ProductLabelID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    hideCopyBtn(label)
    {
        return !label?.ProductLabelID
    }

    copyLabelTap(e)
    {
        var zpl = this.order.ZPLBodyProcessed
        Clipboard.copyFromString(zpl)
        this.showToast('ZPL Label has been copied to Clipboard...')
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    hideRedrawBtn(label)
    {
        return !label?.ProductLabelID
    }

    _onLoadResult(order)
    {
        if (!order?.ProductLabelID && this.order.ProductLabelID) //preserve _new_
        {
            order.ProductLabelID = this.order.ProductLabelID
        }
        return order
    }

    redrawLabelTap(e?) 
    {
        this.api_action = 'redraw'
        var oldmodel = Object.assign({}, this.order)

        this._postData(this.order, (newmodel) =>
        {
            if (newmodel?.ProductLabelID && oldmodel.ProductLabelID != newmodel.ProductLabelID)
            {
                var qp = { labelid: newmodel.ProductLabelID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
            // this._cacheVariables(newmodel.VariableSubtitutions, newmodel.ZPLBodyProcessed)
        })
    }

    _saveOrderForUnsavedComparison(order)
    {
        if (!order) { return }

        if (this.api_action != 'redraw')
        {
            this.orderSaved = this._saveOrderSerialize(order)
        }
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        try { var saved = JSON.parse(orderSaved) } catch {}
        var v = super._computeHasUnsavedChanges(Object.assign({}, order, { 
            PreviewImageUrl: saved?.PreviewImageUrl, 
            ZPLBodyProcessed: saved?.ZPLBodyProcessed,
            VariableSubtitutions: saved?.VariableSubtitutions,
        }), orderP, orderSaved)
        return v
    }

    saveLabelConfirmTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveLabelTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (newmodel && oldmodel.ProductLabelID != newmodel.ProductLabelID)
            {
                var qp = { labelid: newmodel.ProductLabelID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    async _processImgList(imgListP)
    {
        // console.log(imgListP)
        const getBase64 = (file) => 
        {
            return new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.readAsDataURL(file)
              reader.onload = () => resolve(reader.result)
              reader.onerror = error => reject(error)
            })
        }
        const getArr = (file) => 
        {
            return new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.readAsArrayBuffer(file)
              reader.onload = () => resolve(reader.result)
              reader.onerror = error => reject(error)
            })
        }
        const equal = (buf1, buf2) =>
        {
            if (buf1.byteLength != buf2.byteLength) return false
            var dv1 = new Int8Array(buf1)
            var dv2 = new Int8Array(buf2)
            for (var i = 0; i != buf1.byteLength; i++)
            {
                if (dv1[i] != dv2[i]) return false
            }
            return true
        }
        const checkOffset = (offset, ext, length) =>
        {
            if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
            if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
        }
        const readInt32BE = (buf: Uint8Array, offset, noAssert = true) =>
        {
            if (!noAssert) checkOffset(offset, 4, buf.length)
          
            return (buf[offset] << 24) |
              (buf[offset + 1] << 16) |
              (buf[offset + 2] << 8) |
              (buf[offset + 3])
        }
        const colorType = (byte) => 
        {
            var str = 'NA'
            switch (byte)
            {
                case 0: str = 'Grayscale'; break
                case 2: str = 'RGB'; break
                case 3: str = 'Palette'; break
                case 4: str = 'GrayscaleAlpha'; break
                case 6: str = 'RGBA'; break
            }
            return str
        }
        const getPNGInfo = async (file) => 
        {
            const data = await getArr(file) as ArrayBuffer
            var pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
            var pngHeaderSign = new Uint8Array(data.slice(0, 8))
            if(!equal(pngSignature, pngHeaderSign)) 
            {
                console.warn('Invalid png file header!')
                return null
            }
            var pngHeader = new Uint8Array(data.slice(0, 28 * 4))
            return {
                width: readInt32BE(pngHeader, 16),
                height: readInt32BE(pngHeader, 20),
                bitDepth: pngHeader[24],
                colorType: colorType(pngHeader[25]),
                colorTypeCode: pngHeader[25],
                compressionMethod: pngHeader[26],
                filterMethod: pngHeader[27],
                interlaceMethod: pngHeader[28],
            }
        }
        let imgZPLBody = ''
        if (imgListP)
        {
            for (var imgi of imgListP)
            {
                // if (imgi.type == 'image/png')
                // {
                //     //check PNG
                //     var pnginfo = await getPNGInfo(imgi)
                //     console.log(pnginfo)
                //     //break
                // }

                imgi.b64 = await getBase64(imgi)
                imgi.b64 = StringUtil.replaceAll(imgi.b64, 'data:image/png;base64,', '')
                let crc = crc16CCITT(imgi.b64)
                let imgZPL = `~DYR:${imgi.name},P,P,${imgi.size},,:B64:${imgi.b64}:${crc}`
                imgZPLBody += imgZPL + "\n"
                // console.log(imgZPL)
            }
        }
        this.imgZPLBody = imgZPLBody
    }

    copyVarNameTap(e?)
    {
        var vsubi = e?.model?.__data?.vsubi
        if (!vsubi?.VariableName) { return }
        var varname = `{${vsubi.VariableName}}`
        Clipboard.copyFromString(varname)
        this.showToast('Variable Name copied to clipboard...')
    }

    selectVarNameTap(e?)
    {
        var vsubi = e?.model?.__data?.vsubi
        if (!vsubi?.VariableName || !this.zplbodymain) { return }

        var vari = `{${vsubi.VariableName}`
        vari = vari.substring(0, vari.length)
        // console.warn(vari, this.zplbodymain.selectionStart, this.zplbodymain.selectionEnd)
        let sinx = (this.zplbodymain.selectionStart == this.zplbodymain.selectionEnd ? 0 : this.zplbodymain.selectionEnd)
        var inx = this.zplbodymain.value?.indexOf(vari, sinx) as number
        if (sinx != 0 && inx == -1) 
        {
            sinx = 0
            inx = this.zplbodymain.value?.indexOf(vari, sinx) as number
        }

        if (this._asBool(inx) && inx >= 0)
        {
            this.async(() => {
                this.zplbodymain.focus()
                this.zplbodymain.selectionStart = inx
                let linx = this.zplbodymain.value?.indexOf('}', inx)
                if (!linx && linx !== 0) { linx = inx + vari.length }
                this.zplbodymain.selectionEnd = linx + 1



                var scrollContainer = (this.scrollTarget || document.body) as HTMLElement
                var sl = document.getSelection()

                if (scrollContainer && sl) 
                {
                    var st = scrollContainer.scrollTop

                    const range = document.createRange()
                    // range.setStartAfter(this.zplbodymain, this.zplbodymain.selectionStart)
                    // range.setEnd(this.zplbodymain, this.zplbodymain.selectionEnd)
                    // function getTextSelection(el) {
                    //     var start = 0, end = 0, normalizedValue, range,
                    //         textInputRange, len, endRange;
                    //     if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
                    //         start = el.selectionStart;
                    //         end = el.selectionEnd;
                    //     } else {
                    //         range = document.selection.createRange();
                    //         if (range && range.parentElement() == el) {
                    //             len = el.value.length;
                    //             normalizedValue = el.value.replace(/\r\n/g, "\n");
                    //             // Create a working TextRange that lives only in the input
                    //             textInputRange = el.createTextRange();
                    //             textInputRange.moveToBookmark(range.getBookmark());
                    //             // Check if the start and end of the selection are at the very end
                    //             // of the input, since moveStart/moveEnd doesn't return what we want
                    //             // in those cases
                    //             endRange = el.createTextRange();
                    //             endRange.collapse(false);
                    //             if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                    //                 start = end = len;
                    //             } else {
                    //                 start = -textInputRange.moveStart("character", -len);
                    //                 start += normalizedValue.slice(0, start).split("\n").length - 1;
                    //                 if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                    //                     end = len;
                    //                 } else {
                    //                     end = -textInputRange.moveEnd("character", -len);
                    //                     end += normalizedValue.slice(0, end).split("\n").length - 1;
                    //                 }
                    //             }
                    //         }
                    //     }
                    //     alert("start :" + start + " End :" + end);
                    // }
                    var rect = range.getBoundingClientRect()
                    var to = st + rect.top - 60
                    if (to < 0) { to = 0 }
                    // this.scrollIt(to, 300, 'easeInOutQuad', null, null, this.scrollTarget)
                }
            })
        }
        else
        {
            //not found or ...
            // this.scrollIt(0, 300, 'easeInOutQuad', null, null, this.scrollTarget)
        }
    }

    showHelpTap(e)
    {
        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true,
                title: 'Conditional Templating Help',
                Details: `
Conditional operations in ZPL processing.
                    
1. Conditional strings
Applicable for ^FD and ^FV commands.
condition format: {subtitutionKey=compareToValue:SetValue}
if 'subtitutionKey' exist in a specific scenario and its subtitution is equal to 'compareToValue' whole '{...}' is replaced with SetValue
if 'subtitutionKey' exist in a specific scenario and its subtitution is NOT equal to 'compareToValue' whole '{...}' is replaced with empty string
if 'subtitutionKey' is not exist in a specific scenario {...} is printed as is
Example:
    ^FD{barcode=999:NINESBARCODE}^FS


2. Conditional blocks
Applicable for ^FX command.
^FX command is ignored by printer until next '^' or '~' symbol
condition format: ^FX{subtitutionKey=compareToValue} ... ^FX[optional start of new conditional block]
if 'subtitutionKey' exist in a specific scenario and its subtitution is NOT equal to 'compareToValue' all zpl code to the next ^FX command is skipped
Example:
^FX{terminal=DEPLOY}
<australian hub zpl>
^FX{terminal=USMI}
<us hub zpl>
^FX
<both zpl>`
                
            })
            dialogdetails.open()

            this.async(() => { this.set('dialogdetails.loading', false) }, 170)
        }
    }
}
