import { html } from '@polymer/polymer/polymer-element'
import '@polymer/paper-input/paper-input.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
// import { TeamaticalApp } from '../teamatical-app/teamatical-app'
// import { StringUtil } from '../../utils/StringUtil'
// import { UIBase } from '../../ui/ui-base'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
const Teamatical: TeamaticalGlobals = window['Teamatical']


const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
}

const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"] // Enable cards accepted

const allowedCardAuthMethods = ["PAN_ONLY"] // CRYPTOGRAM_3DS

const billingAddressParameters = { phoneNumberRequired: true }

const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
        "gateway": "2c2p", 
        "gatewayMerchantId": "JT01",
    }
}
const baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks,
        billingAddressRequired: true,
        billingAddressParameters: billingAddressParameters
    }
}
const isRTPCardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks,
        billingAddressRequired: true,
        billingAddressParameters: billingAddressParameters,
    }
}
const cardPaymentMethod = Object.assign(
    {},
    baseCardPaymentMethod,
    {
        tokenizationSpecification: tokenizationSpecification
    }
)




@CustomElement
export class PaymentGateway2C2P extends NetBase
{
    static get is() { return 'teamatical-payment-2c2p' }

    static get template() { return html`` }

    static get properties()
    {
        return {
            apiPubkey: { type: String, },
            websiteUrl: { type: String, },
        }
    }

    static get observers()
    {
        return [
            // '_log(apiPubkey)',
        ]
    }

    _log(v) { console.log(v) }
    _dev: boolean
    websiteUrl: string
    paymentsClient: any = null 



    connectedCallback()
    {
        super.connectedCallback()

        // this.addScript(this.websiteUrl + '/build/external/my2c2p-sandbox.1.7.3.patched.js')
        // this.addScript(this.websiteUrl + '/build/external/my2c2p.1.7.3.patched.js')
        // this.addScript('https://pay.google.com/gp/p/js/pay.js', (e) => { this.onGooglePayLoaded(e) })
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    
    static Redirect(orderPaymentRedirectModel)
    {
        //TEST:
        // order2c2p = {
        //     payment_url: 'https://demo2.2c2p.com/2C2PFrontEnd/RedirectV3/payment',
        //     version: '8.5',
        //     merchant_id: '764764000004532',
        //     currency: '702',
        //     result_url_1: 'https://decathlon-th-dev2.teamatical.com/checkout?gid=8VMAHVYDXZV1IMCP3BZREUIWAZG',
        //     hash_value: '',
        //     payment_description: 'payment description ...',
        //     order_id: '2342ORDER',
        //     amount: '000000002500',
        // }

        const form = document.createElement('form')
        form.method = orderPaymentRedirectModel.Method || 'POST'
        form.action = orderPaymentRedirectModel.Url
        const order2c2p = orderPaymentRedirectModel.Data
        for (const keyi of Object.keys(order2c2p)) 
        {
            const hiddenField = document.createElement('input')
            hiddenField.type = 'hidden'
            hiddenField.name = keyi
            hiddenField.value = order2c2p[keyi]
            form.appendChild(hiddenField)
        }
        // form.style.visibility = 'hidden'
        document.body.appendChild(form)
        form.submit() //Booom!
    }


    // getEncrypted(pform, callback = (encryptedData) => {}, errcallback = (errCode, errDesc) => {})
    // {
    //     if (!window.My2c2p?.getElementsByName)
    //     {
    //         window.My2c2p.getElementsByName = (e) => { return pform.querySelectorAll(`[name=${e}]`) }
    //     }
    //     My2c2p.getEncrypted(pform, function(encryptedData, errCode, errDesc) 
    //     {
	// 		if (errCode !=0 )
    //         { 
    //             errcallback(errCode, errDesc)
    //         }
	// 		else 
    //         {
    //             callback(encryptedData)
	// 		}
	// 	})
    // }

    //#region GPay

    // getGooglePaymentsClient() 
    // {
    //     if (this.paymentsClient === null) 
    //     {
    //         this.paymentsClient = new window.google.payments.api.PaymentsClient({ environment: 'TEST' })
    //     }
    //     return this.paymentsClient
    // }

    // getGoogleIsReadyToPayRequest() 
    // {
    //     return Object.assign(
    //         {},
    //         baseRequest,
    //         {
    //             allowedPaymentMethods: [isRTPCardPaymentMethod],
    //             existingPaymentMethodRequired: true
    //         }
    //     )
    // }

    // onGooglePayLoaded(e)
    // {
    //     console.log(e)
    //     const paymentsClient = this.getGooglePaymentsClient()

    //     paymentsClient.isReadyToPay(this.getGoogleIsReadyToPayRequest())
    //         .then((response) =>
    //         {
    //             if (response.result) 
    //             {
    //                 this.addGooglePayButton()
    //                 // @todo prefetch payment data to improve performance after confirming site functionality
    //                 this.prefetchGooglePaymentData()
    //             } 
    //             else 
    //             {
    //                 console.log("isRTP false")
    //             }
    //         })
    //         .catch((err) =>
    //         {
    //             // show error in developer console for debugging
    //             console.error(err)
    //         })
    // }

    // addGooglePayButton() 
    // {
    //     const paymentsClient = this.getGooglePaymentsClient()
    //     const button = paymentsClient.createButton({ onClick: this.onGooglePaymentButtonClicked })
    //     document.getElementById('container').appendChild(button)
    // }

    // prefetchGooglePaymentData() 
    // {
    //     const paymentDataRequest = this.getGooglePaymentDataRequest()

    //     // transactionInfo must be set but does not affect cache
    //     paymentDataRequest.transactionInfo = {
    //         totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
    //         currencyCode: 'SGD'
    //     }
    //     const paymentsClient = this.getGooglePaymentsClient()
    //     paymentsClient.prefetchPaymentData(paymentDataRequest)
    // }

    // onGooglePaymentButtonClicked() 
    // {
    //     const paymentDataRequest = this.getGooglePaymentDataRequest()
    //     paymentDataRequest.transactionInfo = this.getGoogleTransactionInfo()

    //     const paymentsClient = this.getGooglePaymentsClient()
    //     paymentsClient.loadPaymentData(paymentDataRequest)
    //         .then((paymentData) => 
    //         {
    //             // handle the response
    //             this.processPayment(paymentData)
    //         })
    //         .catch((err) => 
    //         {
    //             // show error in developer console for debugging
    //             console.error(err)
    //             //alert(JSON.stringify(err))
    //         })
    // }

    // getGoogleTransactionInfo() 
    // {
    //     return {
    //         currencyCode: 'SGD',
    //         totalPriceStatus: 'FINAL',
    //         // set to cart total
    //         totalPrice: '10.00'
    //     }
    // }

    // getGooglePaymentDataRequest() 
    // {
    //     const paymentDataRequest: any = Object.assign({}, baseRequest)
    //     paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod]
    //     paymentDataRequest.transactionInfo = this.getGoogleTransactionInfo()
    //     paymentDataRequest.merchantInfo = {
    //         // @todo a merchant ID is available for a production environment after approval by Google
    //         // See {@link https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist|Integration checklist}
    //         merchantId: '<sign up for Merchant ID from Google Pay>',
    //         merchantName: '2C2P Test Merchant'
    //     }
    //     return paymentDataRequest
    // }


    // processPayment(paymentData) 
    // {
    //     // $("#mobilePaymentData").val(JSON.stringify(JSON.parse(paymentData.paymentMethodData.tokenizationData.token)))
    //     // @todo pass payment data response to gateway to process payment
    //     // document.forms[0].submit()
    //     // `
    //     // <div id="container"></div>
    //     // <div id="result"></div>
    //     // <!-- Mandatory Web Form Attributes:
    //     //     Form 'id': Used to identify the form that will be submitted to the backend.
    //     //     Form 'action': The address of the backend code that will submit payment request to 2c2p Payment Gateway.
    //     //     Form 'method': Should be set to 'POST' method
    //     // -->
    //     // <form id="2c2p-payment-form" action="payment_3ds.aspx" method="post">
    //     //     <!-- Optional Section Start -->
    //     //     <!--This extended section is optional, it can be fully customizable if neccessary -->
    //     //     <input type="hidden" id="mobilePaymentData" name="mobilePaymentData" /><br />
    //     //     <!-- Optional Section End -->
    //     // </form>`
    // }

    //#endregion


    // addScript(path, callback = null)
    // {
    //     var script = document.createElement("script")
    //     script.setAttribute("async", "true")
    //     script.src = path
    //     if (callback) { script.addEventListener('load', (e) => callback(e)) }
    //     if (document.readyState === 'loading' && ('import' in document.createElement('link')))
    //     {
    //         document.write(script.outerHTML)
    //     }
    //     else
    //     {
    //         document.head.appendChild(script)
    //     }
    //     return script
    // }
}