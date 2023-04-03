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
import { NetBase } from '../../components/bll/net-base'
import view from './product-color.ts.html'
import style from './product-color.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-color-picker'
import '../../components/ui/ui-pantone-color-picker'
import '../ui/ui-color-form-picker'
import '../shared-styles/common-styles'
import { UIPantoneColorPicker } from '../../components/ui/ui-pantone-color-picker'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
class AdminProductColor extends FragmentBase
{
    static get is() { return 'tmladmin-product-color' }

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


            APIPath: { type: String, value: '/admin/api/color/color-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pcolorid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
        }
    }
    hasUnsavedChanges: boolean

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
        ]
    }

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
            this.saveColorConfirmTap()
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

    isApplyColor(qp_pcolorid, qp_backurl)
    {
        return qp_pcolorid == '_new_' && this._asBool(qp_backurl)
    }

    hideSaveBtn(color)
    {
        return false
    }

    hideCloneBtn(color)
    {
        return !color.i || color.i == '_new_'
    }

    cloneColorTap(e)
    {
        var url = this._urlViewColor('_new_', this.order.i)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    saveColorConfirmTap(e?)
    {
        if (this.isApplyColor(this.queryParams.pcolorid, this.queryParams.backurl))
        {
            this.applyColorTap(e)
            return //EXIT
        }
        
        this._openDlg(this.$.dialogsave as PaperDialogElement)
        
    }

    applyColorTap(e?)
    {
        this.api_action = 'create'
        this._postData(this._prepareColor(this.order), (newmodel) =>
        {
            if (newmodel.notvalid) 
            {
                this.set('order', newmodel)
                this.notifyPath('order.notvalid')
                return ///EXIT!!!
            }
            // console.log(newmodel)
            var backurl = window.location.origin + this.queryParams.backurl
            if (URL)
            {
                let url = new URL(backurl)
                url.searchParams.set('Color', JSON.stringify(newmodel))
                backurl = url.pathname + url.search
            }
            this._goto(backurl)
        })
    }

    saveColorTap(e?)
    {
        this.api_action = 'save'
        var oldmodel = this._prepareColor(this.order)
        this._postData(oldmodel, (newmodel) =>
        {
            if (newmodel && oldmodel.i != newmodel.i)
            {
                var qp = { pcolorid: newmodel.i }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    _prepareColor(color)
    {
        var obj = Object.assign({}, color)
        delete obj.sL
        delete obj.sa
        delete obj.sb
        delete obj.hex
        delete obj.notvalid
        return obj
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

}
