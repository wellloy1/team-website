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
import view from './shipping-container.ts.html'
import style from './shipping-container.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
// import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
// import '../../components/ui/ui-color-picker'
// import '../../components/ui/ui-image-uploader'
// import '../../components/ui/ui-pantone-color-picker'
import '../shared-styles/common-styles'
import '../ui/ui-changes-history'
import '../ui/ui-dropdown-menu'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminShippingContainer extends FragmentBase
{
    static get is() { return 'tmladmin-shipping-container' }

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

            APIPath: { type: String, value: '/admin/api/shippingcontainer/container-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['shipcontid'] }, 

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

            // _shouldRenderSwPalette: { type: Boolean, computed: '_shouldRenderSwPaletteCompute(colorsSwatchPalette)' },
        }
    }

    dialogdispose = { reason: '', notvalid: {} }
    hasUnsavedChanges: boolean

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            // '_log(dialogdispose.notvalid.DisposeReason)',
        ]
    }
    _log(v) { console.log(AdminShippingContainer.is, v) }

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
            this.saveShippingContainerTap()
        }
    }

    hideSaveBtn(order)
    {
        return false
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _dis_Carton(loadingAny, orderCanSetCarton)
    {
        return loadingAny || !orderCanSetCarton
    }

    _orderCartonList(orderCarton)
    {
        return orderCarton ? [orderCarton] : []
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()

            this.saveShippingContainerTap()
        }
    }    


    saveShippingContainerTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveShippingContainerConfirmTap(e?)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)

        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel.ID != newmodel.ID)
            {
                var qp = { shipcontid: newmodel.ID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
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
}
