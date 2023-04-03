import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/app-route/app-route.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import '../bll/category-data'
// import { UIImage } from '../ui/ui-image'
// import { UIListItem } from '../ui/ui-list-item'
import { StringUtil } from '../utils/StringUtil'
import { CategoryData } from '../bll/category-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-image'
import '../ui/ui-list-item'
import '../ui/ui-list-subcategory'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import view from './list.ts.html'
import style from './list.ts.css'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const ListBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class List extends ListBase
{
    static get is() { return 'teamatical-list' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            category: { type: Object },
            categoriesRoot: { type: Array },
            categories: { type: Array, notify: true },
            route: { type: Object },
            routeData: { type: Object, observer: '_routeDataChanged' },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            smallScreen: { type: Boolean },

            visible: { type: Boolean, value: false },
            offline: { type: Boolean, observer: '_offlineChanged' },
            failure: { type: Boolean, value: false },
            loading: { type: Boolean, value: false, notify: true },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categoriesRoot, categories, userInfo, userInfo.*)' },
            _hideRecentlyViewed: { type: Boolean, computed: '_computeHideRecentlyViewed(loading, category.recentProducts)' },
        }
    }

    static get observers()
    {
        return [
            '_categoryChanged(category, category.items, visible)',
        ]
    }

    isAttached: any
    category: any
    categories: any
    route: any
    routeData: any
    websiteUrl: any
    userInfo: any
    visible: any
    offline: any
    failure: any
    loading: any
    submenu: any
    _ready: any
    _observer: any
    _changeSectionDebouncer: any

    get grid() { return this.$['grid'] }
    get categoryData() { return this.$['categoryData'] as CategoryData }


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
        this.isAttached = false
        if (this._observer) { this._observer.disconnect() }
    }

    ready()
    {
        super.ready()
        this._ready = true
    }

    _routeDataChanged(routeData)
    {
        if (!this.route || this.route?.prefix !== '/list') { return }

        if (this.category && this.category.items) //loaded before -> refresh
        {
            this.categoryData.refresh()
        }
    }

    localizeTitle(title)
    {
        if (!title) { return '' }
        
        var loct = this.localize(title)
        if (loct == title && title.startsWith('tabs-')) 
        {
            loct = StringUtil.toCapitalize(StringUtil.replaceAll(loct, 'tabs-', ''))
        }
        // console.log(title, '=>', loct)
        return loct
    }

    _getListItems(items)
    {
        // Return placeholder items when the items haven't loaded yet.
        //return items || [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        return items
    }

    _getItemHref(item)
    {
        // By returning null when `itemId` is undefined, the href attribute won't be set and
        // the link will be disabled.
        return item.name ? this._hrefDetail(item?.name, this.category?.name) : null
    }

    _getPluralizedQuantity(quantity)
    {
        if (!quantity) { return '' }

        let pluralizedQ = quantity === 1 ? this.localize('list-qty-item') : this.localize('list-qty-items')
        return '(' + quantity + ' ' + pluralizedQ + ')'
    }

    _categoryChanged(category, items, visible)
    {
        // console.log(category, items, visible)
        if (!visible || category === undefined) { return }

        this._changeSectionDebouncer = Debouncer.debounce(this._changeSectionDebouncer, timeOut.after(170), () =>
        {
            // console.log('_categoryChanged', category)
            if (!category)
            {
                this.dispatchEvent(new CustomEvent('show-invalid-url-warning', { bubbles: true, composed: true }))
            }
            else //if (items)// && items.length > 0)
            {
                // Notify the category and the page's title
                this.dispatchEvent(new CustomEvent('change-section', {
                    bubbles: true, composed: true, detail: {
                        category: 'cat:' + category.name,
                        title: category && category.title ? this.localize(category.title) : '',
                        type: 'catalog',
                        // desc: item?.Product?.Description || '',
                        // keywords: item?.Product?.Keywords || '',
                    }
                }))
            }
        })
    }

    _isNotConn(items, failure, offline, loading)
    {
        return (items !== undefined || !loading || offline === true || failure === true)
    }

    _isNoList(list, failure, offline)
    {
        return !list || failure === true
    }

    _notFound(items, failure, offline, loading)
    {
        if (failure === true || loading === true) { return false }
        if (items === null) { return true }
        return false
    }

    _isEmpty(items, failure, offline, loading)
    {
        if (loading === true || failure === true) { return false }
        if (!Array.isArray(items) || items.length !== 0) { return false }
        return true
    }

    _getMore()
    {
        this._gotoRoot()
    }

    _tryReconnect()
    {
        this.categoryData.refresh(this.category?.name)
    }

    _offlineChanged(offline, old)
    {
        if (!offline && old === false && this.isAttached) 
        {
            this._tryReconnect()
        }
    }

    _computeHideRecentlyViewed(loading, item_RecentProducts)
    {
        return loading || (!Array.isArray(item_RecentProducts) || item_RecentProducts.length < 1)
    }

    _computedSubmenu(categoriesRoot, categories, userInfo, userInfoP)
    {
        var categories = categoriesRoot || categories
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

}