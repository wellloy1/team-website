import '@polymer/iron-icon/iron-icon.js'
import '@polymer/app-route/app-route.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { UICartItem } from '../ui/ui-cart-item'
import '../ui/ui-loader'
import '../ui/ui-cart-item'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import view from './cart.ts.html'
import style from './cart.ts.css'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const CartBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class Cart extends CartBase
{
    static get is() { return 'teamatical-cart' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            cart: { type: Array, },
            cartvisible: { type: Array, },
            numItems: { type: Number },
            currency: { type: String },
            websiteUrl: { type: String },
            route: { type: Object, },
            routeData: { type: Object, observer: '_routeDataChanged', },
            categories: { type: Array },
            userInfo: { type: Object },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },

            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },

            hasItems: { type: Boolean, computed: '_computeHasItem(numItems, cart, visible)', notify: true, reflectToAttribute: true },
            _allowPrimary: { type: Boolean, computed: '_computeAllow(cart, cart.splices)' },
            _single: { type: Boolean, computed: '_computeSingle(numItems)' },
            _many: { type: Boolean, computed: '_computeMany(numItems)' },
        }
    }

    static get observers()
    {
        return [
            '_cartListChanged(cart, cart.*, visible)',
        ]
    }

    route: any
    cartvisible: boolean
    isAttached: boolean
    loading: boolean
    offline: boolean


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true
    }

    isCheckoutForcedByAdmin(isAdmin, storei_summary_Key)
    {
        return isAdmin && storei_summary_Key == 'has_disabled_product'
    }

    disabledCheckout(loading, isAdmin, storei_summary_Key, overflowMessage)
    {
        var v = loading 
            || this._asBool(overflowMessage)
            || (storei_summary_Key == 'has_disabled_product' && !this.isCheckoutForcedByAdmin(isAdmin, storei_summary_Key))
        // console.log(loading, isAdmin, storei_summary_Key, overflowMessage, '=>', v)
        return v
    }

    _routeDataChanged(routeData)
    {
        if (!this.route || this.route.prefix !== '/cart') { return }

        if (!this.offline && !this.loading) { this._reloadApi() }
    }

    _storeTitle(storei)
    {
        return storei ? storei.title : ''
    }

    _computeSingle(cartLength)
    {
        return cartLength <= 1
    }

    _computeMany(cartLength)
    {
        return cartLength > 1
    }

    _computeHasItem(cartLength, cart, visible)
    {
        return cartLength > 0
    }

    _computeAllow(cart, csplices)
    {
        if (Array.isArray(cart) && cart.length > 1)
        {
            return false
        }
        return true
    }

    _isNotConn(cart, failure, offline, loading)
    {
        var v = (Array.isArray(cart) || loading !== true || failure === true)
        // console.log('cart ' + cart + ', off:' + offline + ', fail:' + failure + ', loading:' + loading + '   ->>>> _isNotConn ' + v)

        return v
    }

    _isNoCart(cart, failure, offline)
    {
        return !Array.isArray(cart) || failure === true
    }

    _tryReconnect()
    {
        // console.log('_tryReconnect')
        this._reloadApi(true)
    }

    _reloadApi(reset?)
    {
        this.dispatchEvent(new CustomEvent('api-cart-reload', { bubbles: true, composed: true, detail: { reset: reset } }))
    }

    _offlineChanged(offline, offlineOld)
    {
        if (offlineOld === true && offline === false && this.isAttached)
        {
            this._tryReconnect()
        }
    }

    _loadingChanged(v)
    {
        // 
    }

    _failureChanged(v)
    {
        // 
    }

    _visibleChanged(visible)
    {
        if (!visible) { return }

        // Notify the section's title
        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                title: this.localize('cart-title-document')
            }
        }))
    }

    _cartListChanged(cart, cartList, visible)
    {
        if (visible !== true)
            return
        this.cartvisible = cart
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

}