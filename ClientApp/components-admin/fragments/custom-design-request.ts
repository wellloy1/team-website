import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
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
import view from './custom-design-request.ts.html'
import style from './custom-design-request.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-sizes'
import '../../components/ui/ui-user-inline'
import '../ui/ui-changes-history'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
export class AdminCustomDesignRequest extends FragmentBase
{
    static get is() { return 'tmladmin-custom-design-request' }

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

            order: { type: Object, notify: true },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },


            APIPath: { type: String, computed: '_compute_APIPath(isOrganization)' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['custdesignreqid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            isOrganization: { type: Boolean, value: false },
        }
    }

    _netbase: any
    _observer: any
    api_action: any
    hasUnsavedChanges: boolean
    order: any
    gridCellClassNameGenerator: any
    gridCellClassNameGeneratorImpl: any


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            // '_log(order.*)',
        ]
    }

    _log(orderP) { console.log(orderP) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.$.dialogsave.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogsave)

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
            this.saveCustomDesignRequestTap()
        }
    }

    _text2html(text)
    {
        return text ? StringUtil.replaceAll(text, "\n", "<br />") : text
    }

    _compute_APIPath(isOrganization)
    {
        return isOrganization ? '/admin/api/customdesignrequest/partner-request-' : '/admin/api/customdesignrequest/request-'
    }

    _formatSizeTitle(manufi, mList)
    {
        return manufi && manufi.SizeTitle ? manufi.SizeTitle : 'Selected Sizes'
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


    hideSaveBtn(product)
    {
        return false
    }

    saveCustomDesignRequestTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveCustomDesignRequestConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => {
            if (newmodel && oldmodel.OrganizationID != newmodel.OrganizationID)
            {
                // console.log(oldmodel.OrganizationID, ' => ', newmodel.OrganizationID)
                var qp = { custdesignreqid: newmodel.OrganizationID }
                this.queryParams = qp
                window.history.replaceState(null, null, StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _onDownload(e) 
    {
        var asseti = e.model.__data.asseti
        var id = e.target.getAttribute('data-id')

        var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
        this.getOrderFile({ id: id, source: asseti.Source }, progress)

        e.preventDefault()
        return false
    }

}
