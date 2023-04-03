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
import { CategoryData } from '../bll/category-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-image'
// import '../ui/ui-list-item'
// import '../ui/ui-list-subcategory'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import view from './kits.ts.html'
import style from './kits.ts.css'

const Teamatical: TeamaticalGlobals = window['Teamatical']
const KitsBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class KitsPages extends KitsBase
{
    static get is() { return 'teamatical-kits' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            category: { type: Object },
            categories: { type: Array, notify: true },
            route: { type: Object },
            routeData: { type: Object, observer: '_routeDataChanged' },
            websiteUrl: { type: String },
			imagesPath: { type: String },
            userInfo: { type: Object },
            smallScreen: { type: Boolean },

            page: { type: String, reflectToAttribute: true, observer: '_pageChanged' },
            pageLoading: { type: Boolean, reflectToAttribute: true, },

            visible: { type: Boolean, value: false },
            offline: { type: Boolean, observer: '_offlineChanged' },
            failure: { type: Boolean, value: false },
            loading: { type: Boolean, value: false, notify: true },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }
    _log(v) { console.log(v) }

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
    page: string
    pageLoading: boolean

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
        if (!this.route || this.route?.prefix !== '/kits') { return }

        this.page = routeData.category
    }

    _pageChanged(page, oldPage?)
    {
        this._pageLoad(page, oldPage)
    }

    _pageLoad(page, oldPage?)
    {
        // When a load failed, it triggered a 404 which means we need to eagerly load the 404 page definition
        let pageloadedHandler = this._pageLoaded.bind(this, Boolean(oldPage))
        
        // webpackMode: "lazy" 
        // if (this._dev) { console.log('Dynamicaly - ' + page + ' is loading...') }
        this.pageLoading = true

        import(`../fragments/kit-pages/${page}`)
            .then(pageloadedHandler)
            .catch(pageloadedHandler)
    }

    _pageLoaded(shouldResetLayout, e)
    {
        this.pageLoading = false
        if (e instanceof Error) 
        { 
            console.warn('Dynamicaly - ' + this.page + ' failed to load')
            return ///EXIT
        }
    }

    _subdomain(subdomainA, subdomainB)
    {
        return subdomainA == subdomainB
    }

    _page(pageA, pageB)
    {
        return pageA == pageB
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
        this.categoryData.refresh(this.category.name)
    }

    _offlineChanged(offline, old)
    {
        if (!offline && old === false && this.isAttached) 
        {
            this._tryReconnect()
        }
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return []//TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

}