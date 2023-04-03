import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './dev-bot-user.ts.html'
import style from './dev-bot-user.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'

const Teamatical: TeamaticalGlobals = window['Teamatical']

@FragmentDynamic
class AdminDevBotUser extends FragmentBase
{
    static get is() { return 'tmladmin-dev-bot-user' }

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
            smallScreen: { type: Object },

            order: { type: Object },

            APIPath: { type: String, value: '/admin/api/user/' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: [] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            //
            lastDatabaseRequestCharge: { type: Number, value: 0 },
        }
    }

    order: any
    _netbase: any
    _observer: any
    api_action: any

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
    }

    createTap(e)
    {
        var urlData = this.order.UserID
        if (!urlData || !urlData.trim()) { return }
        urlData = urlData.trim()

        this.api_action = 'create-user'
        this._fetchItems(1, '', { userID: urlData })
    }

}
