import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-toggle-button/paper-toggle-button'
import { PaperDropdownMenuLightElement } from '@polymer/paper-dropdown-menu/paper-dropdown-menu-light' 
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import '@advanced-rest-client/json-viewer/json-viewer.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
// import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { PaperDialogElement } from '@polymer/paper-dialog'
import { NetBase } from '../../components/bll/net-base'
import { StringUtil } from '../../components/utils/StringUtil'
// import { css_time_to_milliseconds } from '../../components/utils/CommonUtils'
import { FragmentBase } from '../fragments/fragment-base'
import '../shared-styles/common-styles'
import view from './ui-changes-history.ts.html'
import style from './ui-changes-history.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
import { Currency, Clipboard } from '../../components/utils/CommonUtils'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../ui/ui-dialog'
// const UIAdminDialogBase = mixinBehaviors([IronOverlayBehavior], UIBase) as new () => UIBase & IronOverlayBehavior
// const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UIAdminChangesHistory extends UIBase
{
    static get is() { return 'tmladmin-ui-changes-history' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true, },
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            // tabindex: { type: String, reflectToAttribute: true }, //value: "-1"
            // ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },
            // websiteUrl: { type: String },

            
            inline: { type: Boolean, reflectToAttribute: true, value: false },
            title: { type: String, reflectToAttribute: true, value: "History" },
            items: { type: Array, value: [] },

            // APIPath: { type: String, value: '/admin/api/user/' },
            // api_action: { type: String, value: 'search-user' },
            // api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },

            viewasjson: { type: Boolean, value: true },
            dialogdetails: { type: Object, notify: true }, 
        }
    }

    static get observers()
    {
        return [
            //  '_log(userSelected)',
        ]
    }
    _log(v) { console.log(v) }


    //#region Vars

    dialogdetails: any

    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    copyJsonDetailsTap(e)
    {
        var item = e?.model?.__data?.histi
        var jsonTxt = item ? item.Details : this.dialogdetails.Details
        
        Clipboard.copyFromString(jsonTxt)
        this.showToast('JSON copied to clipboard...')
    }

    showDetailsTap(e)
    {
        var itemi = e.model.__data.histi

        var dialogdetails = this.$.dialogdetails as UIAdminDialog
        if (dialogdetails)
        {
            this.set('dialogdetails', { 
                loading: true, 
                // id: `${itemi.ID}`,
                Details: itemi.Details,
            })
            dialogdetails.open()

            this.async(() => { this.set('dialogdetails.loading', false) }, 170)
        }
    }

}
