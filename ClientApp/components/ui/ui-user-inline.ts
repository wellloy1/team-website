import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
import '@polymer/polymer/lib/elements/custom-style'
//---lit---
import { html, css, unsafeCSS } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js';

import commonStyles from '../shared-styles/common-styles.ts.css'
import { UserModel } from '../../components/dal/user-info-model'
import { UIBase } from '../../components/ui/ui-base-lit'



@customElement('teamatical-ui-user-inline')
export class UIDescription extends UIBase
{
    @property({ type: Object }) 
    user: UserModel | null = null

    @property({ type: Boolean, attribute: 'show-admin-org-link', reflect: true }) 
	showAdminOrgLink = true

    @property({ type: Boolean, attribute: 'hide-id', reflect: true }) 
	hideID = false

    @property({ type: Boolean, attribute: 'show-as-line', reflect: true }) 
	showAsLine = false


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


    render()
    {
        if (!this.user) { return html`` }

        //nowrap??
        let br = this.showAsLine ? html` ` : html`<br/>`
        
        let userIDBlock = html`
        <b>
            <span class="copy-tap" @tap=${this._copyTap} copy-content=${ifDefined(this.user?.UserID)}>
                [${this.user?.UserID}]
            </span>
        </b>
        `
        let userNameBlock = !this._asBool(this.user?.Name) ? html`` : html`${br}<span class="copy-tap line">${this.user?.Name}</span>`
        let userEmailBlock = !this._asBool(this.user?.Email) || (this.user?.Name == this.user?.Email) ?  html`` : html`${br}<span class="copy-tap" @tap=${this._copyTap} copy-content=${ifDefined(this.user?.Email)}>&lt;${this.user?.Email}&gt;</span>`
        let userOrgBlock = !this._asBool(this.user?.Organization) ?  html`` : html`
            ${br}<span class="copy-tap" @tap=${this._copyTap} copy-content=${ifDefined(this.user?.Organization?.OrganizationID)}>${this.user?.Organization?.OrganizationName}</span>
            ${this.showAdminOrgLink ? html`<a href$="${this._hrefAdminOrganization(this.user?.Organization?.OrganizationID)}"><iron-icon icon="admin-icons:open-in-new" class="open-in-here"></iron-icon></a> ` : html``}
        `
        return html`
            ${this.hideID ? html`` : userIDBlock}
            ${userNameBlock}
            ${userEmailBlock}
            ${userOrgBlock}
        `
    }

    static styles = [
    css`${unsafeCSS(commonStyles)}`,
    css`
        :host { 
            display: inline-block;
            @apply --teamatical-ui-user-inline-style;
        }
    `]
}
