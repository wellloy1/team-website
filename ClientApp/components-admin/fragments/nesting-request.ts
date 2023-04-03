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
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
import view from './nesting-request.ts.html'
import style from './nesting-request.ts.css'
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
class AdminNestingRequest extends FragmentBase
{
    static get is() { return 'tmladmin-nesting-request' }

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

            APIPath: { type: String, value: '/admin/api/nestingrequest/item-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['nestingid'] }, 

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

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
        ]
    }
    _log(v) { console.log('nesting-request', v) }

    // get zplbodymain() { return this.$['zpl-body-main'] as PaperTextareaElement }


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
            this.saveOrderTap()
        }
    }

    saveOrderTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveOrderConfirmTap(e)
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
            // this.redrawLabelTap()
        }
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }
}
