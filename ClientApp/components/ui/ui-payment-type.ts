import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
import '@polymer/polymer/lib/elements/custom-style'
import { microTask } from '@polymer/polymer/lib/utils/async'
//---lit---
import { html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import { UIBase } from '../ui/ui-base-lit'
import style from './ui-payment-type.ts.css'


@customElement('teamatical-ui-payment-type')
export class UIPaymentType extends UIBase
{
    @property({ type: String, reflect: true, attribute: 'pay-type' }) payType: string
    @property({ type: String, reflect: true, attribute: 'pay-method' }) payMethod: string
    @property({ type: String, reflect: true, attribute: 'pay-kind' }) payKind: string

    @property({ type: String, reflect: true, attribute: 'icon-namespace' }) iconNamespace = 'brand:'
    @property({ type: Boolean, reflect: true, attribute: 'as-admin' }) asAdmin: boolean = false


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

    _formatPayMethodAdmin(paymentType, paymentMethod, payKind)
    {
        if (payKind === undefined) { payKind = "payment" }
        var type = paymentType
        if ((this._asBool(paymentMethod) && paymentMethod != 'SP' && !this._asBool(paymentType)) || payKind != 'payment') { type = 'none' }
        return this.localizepv('order-paymenthistory-type-', type)
    }

    _formatPayMethodCustomer(paymentType, paymentMethod, paymentKind: string | null = null)
    {
        var title = this.localize('order-paymenthistory-type-none')
        
        if(this._asBool(paymentType))
        {
            var type = paymentType
            if (paymentKind != 'payment' || paymentKind == null) { type = 'none' }
            title = this.localizepv('order-paymenthistory-type-', type)
        }
        else if ((paymentKind == 'payment' || paymentKind == null) && paymentMethod) 
        {
            var lockey = paymentMethod == 'SP' ? 'undefined' : paymentMethod
            title = this.localizepv('order-paymenthistory-method-', lockey)
        }
        return title
    }    

    iconsList = { 
        'visa': 1, 'mastercard': 1, 'amex': 1, 'discover': 1, //cards
        'link': 1,
        'apple_pay': 2, 'google_pay': 2, //wallets
        'sofort': 3, 'bancontact': 3, 'ideal': 3, 'giropay': 3, 'p24': 3, //banks
    }
    nocaptionList = { 'apple_pay': 1, 'google_pay': 1 } 

    render()
    {
        var nocaption = (this.nocaptionList[this.payType] == 1)
        var caption = ''
        if (this.asAdmin && !nocaption)
        {
            caption = this._formatPayMethodAdmin(this.payType, this.payMethod, this.payKind)
        }
        else if (!this.asAdmin && !nocaption)
        {
            caption = this._formatPayMethodCustomer(this.payType, this.payMethod, this.payKind)
        }
        var hasIcon = this.iconsList[this.payType]
        var iconClass = ''
        switch (hasIcon)
        {
            case 1: iconClass = 'card'; break
            case 2: iconClass = 'wallet'; break
            case 3: iconClass = 'bank'; break
        }

        var brand = this.payType
        var icon = hasIcon ? html`
            <iron-icon 
                icon="${this.iconNamespace}${brand}" 
                class="${iconClass}">
            </iron-icon>
        ` : ''

        return html`
            <custom-style>
                <style is="custom-style" include="paper-material-styles"></style>
            </custom-style>
            <style>
				${style}
            </style>

            <span class="nowrap">
                ${icon}
                ${caption}
            </span>
        `
    }


}
