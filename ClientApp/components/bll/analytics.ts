import { html } from '@polymer/polymer/polymer-element'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { LocalizeBehaviorBase } from '../bll/localize-behavior'
import { CustomElement } from '../utils/CommonUtils'
import { UserInfoModel } from '../dal/user-info-model'
// import { ApplicationInsights } from '@microsoft/applicationinsights-web'



@CustomElement
export class Analytics extends LocalizeBehaviorBase
{
    static get is() { return 'teamatical-analytics' }

    static get template() 
    {
        return html``
    }
    
    static get properties() 
    {
        return {
            userInfo: { type: Object },
            websiteUrl: { type: String },
            env: { type: String },
        }
    }

    static get observers()
    {
        return [
            '_userEnvChanged(env, userInfo)',
        ]
    }

    userInfo: UserInfoModel
    // appInsights: any


    connectedCallback()
    {
        super.connectedCallback()
    }

    // promoView-promoClick
    // productImpressions-productClick

    pageView(data)
    {
        this._fbq('track', 'PageView', data)
    }

    productImpressions(category)
    {
        // Measures product impressions and also tracks a standard
        // pageview for the tag configuration.
        // Product impressions are sent by pushing an impressions object
        // containing one or more impressionFieldObjects.
        var impressions = (!category) ? [] : category.items
        var currency = ''
        if (Array.isArray(impressions))
        {
            impressions = impressions.map((itemi, i, arr) =>
            {
                var p = itemi
                currency = p.price?.Currency
                return {
                    'name': p && p.title ? p.title : '', // Name or ID is required.
                    'id': p.name,
                    //'pid': p.Product.ProductID,
                    'price': Currency.format(p.price?.SalePriceFinal, p.price?.Currency),
                    // 'brand': p.brand,
                    // 'variant': StringUtil.formatSizes(p.SizesSelected),
                    'list': category.name,
                    'position': i,
                }
            })
        }

        this._pushDataLayer({
            'event': 'productImpressions',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'currencyCode': currency, // Local currency is optional.
                'impressions': impressions,
            }
        })
    }

    productDetails(data)
    {
        // Measure a view of product details. This example assumes the detail view occurs on pageload,
        // and also tracks a standard pageview of the details page.
        var p = data
        this._pushDataLayer({
            'event': 'productDetail',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'currencyCode': p.Price?.Currency, // Local currency is optional.
                'detail': {
                    'actionField': { 'list': p.category },    // 'detail' actions have an optional list property.
                    'products': [{
                        'name': p.Product.Title, // Name or ID is required.
                        'id': p.ProductConfigurationID,
                        'pid': p.Product.ProductID,
                        'price': Currency.format(p.Price?.SalePriceFinal, p.Price?.Currency),
                        // 'brand': p.Product.Brand,
                        'category': p.category,
                        'variant': StringUtil.formatSizes(p.SizesSelected),
                    }]
                },
            }
        })
    }

    cartProductAddTo(entry)
    {
        // console.log(entry)
        if (!entry || !entry.item) { return }

        var p = entry.item
        // Measure adding a product to a shopping cart by using an 'add' actionFieldObject
        // and a list of productFieldObjects.
        var product = {
            'name': p.Product.Title, // Name or ID is required.
            'id': p.ProductConfigurationID,
            'pid': p.Product.ProductID,
            'price': Currency.format(p.Price?.SalePriceFinal, p.Price?.Currency),
            // 'brand': p.Product.Brand,
            'category': p.category,
            'variant': StringUtil.formatSizes(p.SizesSelected),

            'quantity': entry.quantity,
        }

        this._pushDataLayer({
            'event': 'addToCart',
            'ecommerce': {
                'currencyCode': p.Product.Currency,
                'add': {                                    // 'add' actionFieldObject measures. 
                    'products': [ product ]                 //  adding a product to a shopping cart.
                }
            }
        })

        // Trigger Add to Cart event every time someone adds a product to their cart         
        this._fbq('track', 'AddToCart', {
            value: p.Price?.SalePriceFinal,
            currency: p.Price?.Currency, 
            content_type: 'product',
            contents: [ product ],
            content_name: p.Product.Title,
            num_items: entry.quantity,
        })
    }

    cartProductRemoveFrom(entry)
    {
        if (!entry || !entry.item) { return }

        var p = entry.item
        // Measure the removal of a product from a shopping cart.
        this._pushDataLayer({
            'event': 'removeFromCart',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'currencyCode': p.Product.Currency,
                'remove': {                               // 'remove' actionFieldObject measures.
                    'products': [{                          //  removing a product to a shopping cart.
                        'name': p.Product.Title, // Name or ID is required.
                        'id': p.ProductConfigurationID,
                        'pid': p.Product.ProductID,
                        'price': Currency.format(entry.price?.SalePriceFinal, entry.price?.Currency),
                        // 'brand': p.Product.Brand,
                        'category': p.category,
                        'variant': StringUtil.formatSizes(p.SizesSelected),

                        'quantity': entry.qty_old
                    }]
                }
            }
        })
    }

    checkout(data)
    {
        // console.log(data)
        if (!data) { return }

        var currency = data.Cart.Currency
        var store = data.Cart.stores.find((v, i, arr) =>
        {
            return v.gid == data.ItemGroupID
        })
        var products = (!store) ? [] : store.items
        if (Array.isArray(products))
        {
            products = products.map((entry, i, arr) =>
            {
                var p = entry.item
                return {
                    'name': p.Product.Title, // Name or ID is required.
                    'id': p.ProductConfigurationID,
                    'pid': p.Product.ProductID,
                    'price': Currency.format(entry.price?.SalePriceFinal, entry.price?.Currency),
                    // 'brand': p.Product.Brand,
                    'category': p.category,
                    'variant': StringUtil.formatSizes(p.SizesSelected),
                    'quantity': entry.quantity
                }
            })
        }

        this._pushDataLayer({
            'event': 'checkout',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'currencyCode': currency,
                'checkout': {
                    'actionField': {
                        'step': 1,
                        'option': 'Credit Card',
                    },
                    'products': products,
                },
            },
            // 'eventCallback': function ()
            // {
            //     document.location = 'checkout.html'
            // },
        })

        // Trigger Initiate Checkout event every time someone moves from cart to checkout
        this._fbq('track', 'InitiateCheckout', {
            // value: total.amount,
            currency: currency, 
            content_type: 'product',
            contents: products,
        })
    }

    purchase(order)
    {
        // console.log(order)
        if (!order) { return }

        var tax = order.Totals.find((v, i, arr) => { return v.id == 'cf.totals.tax' })
        var shipping = order.Totals.find((v, i, arr) => { return v.id == 'cf.totals.shipment' })
        var total = order.Totals.find((v, i, arr) => { return v.id == 'cf.totals.total' })

        var currency = order.Currency
        var products = order.items
        if (Array.isArray(products))
        {
            products = products.map((entry, i, arr) =>
            {
                var p = entry.item
                return {
                    'name': p.Product.Title, // Name or ID is required.
                    'id': p.ProductConfigurationID,
                    'pid': p.Product.ProductID,
                    'price': Currency.format(entry.price?.SalePriceFinal, entry.price?.Currency),
                    // 'brand': p.Product.Brand,
                    'category': p.category,
                    'variant': StringUtil.formatSizes(p.SizesSelected),
                    'quantity': entry.quantity
                }
            })
        }


        // Send transaction data with a pageview if available
        // when the page loads. Otherwise, use an event when the transaction
        // data becomes available.
        this._pushDataLayer({
            'event': 'purchase',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'currencyCode': currency,
                'purchase': {
                    'actionField': {
                        'id': order.id,                            // Transaction ID. Required for purchases and refunds.
                        'tax': tax ? Currency.format(tax.amount, currency) : '0',
                        'shipping': shipping ? Currency.format(shipping.amount, currency) : '0',
                        'revenue': Currency.format(total.amount, currency), // Total transaction value (incl. tax and shipping)
                        // 'affiliation': 'Online Store',
                        // 'coupon': 'SUMMER_SALE'
                    },
                    'products': products,
                }
            }
        })

        // Trigger Purchase event every time a purchase is completed
        this._fbq('track', 'Purchase', { 
            value: total.amount,
            currency: currency, 
            content_type: 'product',
            contents: products,
        })
    }

    refund(order)
    {
        // Refund an entire transaction by providing the transaction ID. This example assumes the details
        // of the completed refund are available when the page loads:
        this._pushDataLayer({
            'event': 'refund',
            'userId': this._userID(this.userInfo),
            'ecommerce': {
                'refund': {
                    'actionField': { 'id': order.id }         // Transaction ID. Required for purchases and refunds.
                }
            }
        })
    }

    customdesignrequestSubmit(customdesignrequest)
    {
        this._pushDataLayer({
            'event': 'CustomDesignSubmit',
            'userId': this._userID(this.userInfo),
            // 'ecommerce': {
            // }
        })
    }

    feedbackSubmit(feedbackForm)
    {
        this._pushDataLayer({
            'event': 'FeedbackFormSubmit',
            'userId': this._userID(this.userInfo),
            // 'ecommerce': {
            // }
        })
    }
    


    //#region Helpers

    _pushDataLayer(data)
    {
        //GoogleAnalytics
        if (window.dataLayer !== undefined)
        {
            try { window.dataLayer.push(data) } catch { }
        }

        //MSApplicationInsight
        if (window.appInsights && data.event)
        {
            const appInsights = window.appInsights
            var mstEvent = {
                name: data.event,
                properties: data,
            }
            try { appInsights.trackEvent(mstEvent) } catch { }
        }
    }

    _fbq(action, event, data)
    {
        //Facebook (Meta) Pixel
        if (window.fbq)
        {
            try { window.fbq(action, event, data) } catch { }
        }
    }

    _userID(userInfo)
    {
        if (userInfo && userInfo.isAuth === true)
        {
            return userInfo?.profile?.sub
        }
        else
        {
            return ''
        }
    }

    _userEnvChanged(env, userInfo: UserInfoModel)
    {
        if (env === undefined || userInfo === undefined) { return }

        var uid = this._userID(userInfo)

        this._pushDataLayer({ 'env': env })
        this._pushDataLayer({ 'userId': uid })
        if (userInfo?.orgSubdomain) { this._pushDataLayer({ 'orgSubdomain': userInfo.orgSubdomain }) }
        if (userInfo?.orgName) { this._pushDataLayer({ 'orgName': userInfo.orgName }) }
    }

    //#endregion
}