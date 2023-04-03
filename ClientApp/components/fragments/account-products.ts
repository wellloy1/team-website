import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-list/iron-list.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { IronListElement } from '@polymer/iron-list/iron-list.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { scroll } from '@polymer/app-layout/helpers/helpers'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency, Clipboard } from '../utils/CommonUtils'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './account-products.ts.html'
import style from './account-products.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import '../bll/products-data'
import '../ui/ui-product-item'
import '../ui/ui-button'
import '../ui/ui-loader'
import '../ui/ui-network-warning'
import '../ui/ui-user-inline'
import { StringUtil } from '../utils/StringUtil'
import { ProductsData } from '../bll/products-data';
import { UserInfoModel } from '../dal/user-info-model'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AccountProductsBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior



@FragmentDynamic
export class AccountProducts extends AccountProductsBase
{
    static get is() { return 'teamatical-account-products' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },

            products: { type: Object, },
            numItems: { type: Number },
            currency: { type: String },
            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            loadingMore: { type: Boolean, notify: true, }, 

            localStorage: { type: Object, value: {} },
            isGrid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            _numItems: { type: Number, computed: '_computeNumItems(numItems)' },
            _numItemsApproximately: { type: String, computed: '_computeNumItemsApproximately(numItems)' },
            _single: { type: Boolean, computed: '_computeSingle(_numItems)' },
            _many: { type: Boolean, computed: '_computeMany(_numItems)' },
            _hasInitialItems: { type: Boolean, computed: '_computeHasInitialItem(_numItems, loading)' },
            _hasSearchedItems: { type: Boolean, computed: '_computeHasSearchedItems(numItems, loading)' },
            _hasNoMoreItems: { type: Boolean, computed: '_computeHasNoMoreItems(products.pfirst, products.plast, loading)' },

            _isNoProducts: { type: Boolean, computed: '_computeIsNoProducts(products.items,failure,offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(products.items, failure, offline, loading)' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
            searchingProgress: { type: Boolean },

            actionNotAllowed: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },
        }
    }

    static get observers()
    {
        return [
            '_productsListChanged(products, products.*)',
            '_localStorageChanged(localStorage)',
        ]
    }

    _listScrollTop: any
    _scrollDebouncer: any
    loadingMore: any
    visible: any
    isAttached: any
    products: any
    isGrid: boolean
    localStorage: any
    userInfo: UserInfoModel

    get productList() { return this.$['list'] }
    get productListVirtual() { return this.$['list-virtual'] as IronListElement }
    get productsData() { return this.$['products-data'] as ProductsData }


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        this.addEventListener('iron-resize', (e) => this._onResized(e))

        window.addEventListener('scroll', (e) => 
        { 
            if (this.visible && this.productListVirtual) { this.productListVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        })
    }
    
    _localStorageChanged(v, o)
    {
        if (!v) { return }

        if (v && v.isGrid !== undefined)// && this.userInfo?.isDesigner === true)
        {
            this.isGrid = v.isGrid
        }
    }

    gripSwitchTap(e)
    {
        this.isGrid = !this.isGrid
        this.async(() => { this.productListVirtual.fire('iron-resize') })
        if (this.localStorage) { this.set('localStorage.isGrid', this.isGrid) }
    }

    _onResized(e?)
    {
        // if (this.visible && this.productListVirtual) { this.async(() => { this.productListVirtual.fire('iron-resize') }) }
    }

    _buildProductUrl(entry)
    {
        if (!entry || !entry.ProductConfigurationID) { return '' }
        return this._hrefDetail(entry.ProductConfigurationID, 'configurations')
    }

    moreProductsTap(e)
    {
        if (!e.target) { return }

        var se = document.documentElement
        this._listScrollTop = se.scrollTop
        this.loadingMore = true
        this.productsData.loadMore(() =>
        {
            this.loadingMore = false
            if (this.visible && this.productListVirtual) { this.productListVirtual.fire('iron-resize') }
        })
    }

    hideCancelableMsg(orderi)
    {
        return orderi.Cancelable || orderi.Canceled
    }

    hideCancelBtn(orderi)
    {
        return !orderi.Cancelable || orderi.Canceled
    }

    _loadMoreProgress(loading, loadingMore)
    {
        return loading && loadingMore
    }

    _computeSingle(productsLength)
    {
        return productsLength <= 1
    }

    _computeMany(productsLength)
    {
        return productsLength > 1
    }

    _computeNumItems(productsLength)
    {
        return Math.abs(productsLength)
    }

    _computeNumItemsApproximately(numItems)
    {
        return numItems < 0 ? '+' : ''
    }

    _computeHasInitialItem(numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.products && this.products.search === undefined)
        if ((!(this.products && this.products.search === undefined) && numItems == 0) || (this.products && this.products.search) || loading) 
        {
            v = true
        }
        return v
    }

    _computeHasSearchedItems(numItems, loading)
    {
        var v = numItems > 0 && !loading && (this.products && this.products.search !== undefined)
        if ((this.products && this.products.search === undefined) || loading)
        {
            v = true
        }
        // console.warn(numItems, loading, (!this.products || this.products.search !== undefined), '->', v)
        return v
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || saving !== false // || loading !== false
    }

    _computeHasNoMoreItems(pfirst, plast, loading)
    {
        return plast == true && pfirst !== true // && !loading
    }

    _computeIsNotConn(products, failure, offline, loading)
    {
        var v = (Array.isArray(products) || loading !== true || failure === true)
        // console.log('products ' + products + ', off:' + offline + ', fail:' + failure + ', loading:' + loading + '   ->>>> _isNotConn ' + v)
        return v
    }

    _computeIsNoProducts(products, failure, offline)
    {
        return !Array.isArray(products) || failure === true
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }

    _tryReconnect()
    {
        this.productsData.reload()
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

        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                category: 'href:' + this.getAttribute('name'),
                title: this._accountTitle(this.userInfo?.orgName, 'products-title-document'),
            }
        }))
    }

    _productsListChanged(products, productsList)
    {
        // console.log(products)
    }

    _archiveItem(e)
    {
        if (!e.model) { return }
        var producti = e.model.__data.producti
        this.productsData.archiveProduct(producti)
    }
    _unarchiveItem(e)
    {
        if (!e.model) { return }
        var producti = e.model.__data.producti
        this.productsData.unarchiveProduct(producti)
    }
}
