import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { CustomElement } from '../utils/CommonUtils'
import { CatalogProductModel } from '../dal/catalog-product-model'
import { ProductPriceModel } from '../dal/product-price-model'
import { NetBase } from '../bll/net-base'
import { TeaminfoData } from '../bll/teaminfo-data'
import { CategoryItem } from '../dal/catalog-product-model'
const CATALOG_ROOTID = "-"


const categoryList = [
    {
        //root category - to allow load category list from server...
        name: CATALOG_ROOTID,
    },
]

@CustomElement
export class CategoryData extends NetBase
{
    static get is() { return 'teamatical-category-data' }

    static get template()
    {
        return html`<app-localstorage-document key="catalog-cache" data="{{catalogCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            route: { type: Object, },
            itemName: String,
            categoryName: String,
            categories: { type: Array, value: categoryList, readOnly: true, notify: true },
            category: { type: Object, notify: true },
            userInfo: { type: Object },
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            role: { type: String },

            APIPath: { type: String, value: '/api/v1.0/catalog/' },
            api_action: { type: String, value: 'categories' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            // api_body: { type: Object },

            catalogCache: { type: Object },
            version: { type: Number },
            item: { type: Object, computed: '_computeItem(category.items, itemName)', notify: true },

            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true },
            visible: { type: Boolean, notify: true, },
        }
    }

    currency: any
    api_url: string
    route: any
    itemName: any
    categoryName: any
    categories: any
    userInfo: any
    queryParams: any
    websiteUrl: any
    catalogCache: any
    version: any
    category: any
    item: any
    loading: any
    failure: any
    visible: any
    recentProducts: any
    _ischangingCache: any
    _setFailure: any
    _setLoading: any
    _setCategories: any
    _refreshDebouncer: any
    _firstLoadRoot = false
    lastUpdateTime: any = {}
    role: string

    static get observers()
    {
        return [
            '_categoryChanged(route, categoryName)',
            '_catalogCacheLoaded(catalogCache)',
            // '_log(loading)',
        ]
    }

    _log() { console.log('category-data', ...arguments) }

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    refresh(categoryName?, tries = 3)
    {
        if (!categoryName) { return }
        // if (!tries) { tries = 3 }
        // Try at most 3 times to get the items.
        
        this._fetchItems(categoryName, tries)
    }
    
    _catalogCacheLoaded(catalogCache)
    {
        if (this._ischangingCache) { return }

        if ((!this.categories || this.categories.length == 0 || this.categories === categoryList) && catalogCache)  
        {
            this._setCategories(Object.assign([], this._toArray(catalogCache)))
        }
    }

    _toArray(obj)
    {
        var v = Object.keys(obj).map((key) =>
        {
            return Object.assign({ id: key }, obj[key])
        })
        return v
    }

    _categoryChanged(route, categoryName)
    {
        if (route === undefined || categoryName === undefined) { return }

        // console.log(route)
        var pathAr = route.path?.split('/').filter(i => i !== "")
        // console.log(this.role, 'category-data._categoryChanged', route)
        var islist = (route.path.indexOf("/list") >= 0 || route.prefix.indexOf("/list") >= 0)
        const pages_needRootCatalog = { 'store': 1, 'detail': 1, 'team': 1, }
        if (((this.role === undefined || this.role === null || this.role == 'app') && !islist && categoryName == CATALOG_ROOTID && (pages_needRootCatalog[pathAr[0]] || route.path == '/')) 
            || (this.role == 'list' && islist))
        {
            if (!this.catalogCache) { this.catalogCache = {} }

            var cacheItem = this.catalogCache[categoryName]
            // console.log('_categoryChanged', cacheItem)
            if (cacheItem) { this.set('category', cacheItem) }


            this._refreshDebouncer = Debouncer.debounce(this._refreshDebouncer, timeOut.after(17), () =>
            {
                if (categoryName == CATALOG_ROOTID 
                    && this.lastUpdateTime[categoryName] 
                    && (this._now() - this.lastUpdateTime[categoryName]) < 900) 
                { return }
                this.lastUpdateTime[categoryName] = this._now()
                // console.log(this.role, 'category-data._categoryChanged =>>> refresh' , categoryName, route, pathAr)
                this.refresh(categoryName)
            })
        }
    }

    _getCategoryObject(categories, categoryName)
    {
        var arr = categories.filter((i) => { return i.name === categoryName })
        if (arr.length > 0) { return arr[0] }
        return null
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-catalog-loading', { bubbles: true, composed: true, detail: { loading: v, catalogCache: this.catalogCache } }))
    }

    _computeItem(items, itemName)
    {
        if (!items || !itemName) { return }

        for (let i = 0, item; item = items[i]; ++i) 
        {
            if (item.name === itemName)
            {
                return item
            }
        }
    }

    _mergeCategories(categories)
    {
        // if (this._dev)
        // {
        //     console.log('1', JSON.parse(JSON.stringify(categories)))
        // }
        if (!this.categories || !categories) { return categories }


        for (var i in categories)
        {
            if (categories[i].name && !categories[i].title)
            {
                categories[i].title = 'tabs-' + categories[i].name
            }
            var thiscati = this.categories.filter(o =>
            {
                return o.name === categories[i].name
            })
            if (thiscati.length > 0 && thiscati[0]) 
            {
                const { title, StoreID } = categories[i]
                Object.assign(categories[i], thiscati[0])
                categories[i].title = title
                categories[i].StoreID = StoreID
            }
        }
        // if (this._dev)
        // {
        //     console.log('2', JSON.parse(JSON.stringify(categories)))
        // }
        return categories
    }

    _cacheRestoreCategories(catalogCache)
    {
        // console.log('_cacheRestoreCategories', catalogCache)
        if (!catalogCache) { return }

        var categories = [] as any
        for (var i in catalogCache)
        {
            if (!Array.isArray(catalogCache[i])) //check for backward compatibility
            {
                categories.push(catalogCache[i])
            }
        }

        if (JSON.stringify(this.categories) !== JSON.stringify(categories) && categories?.length > 0)
        {
            this._setCategories(Object.assign([], categories))
        }
    }

    _cacheCategories(categories)
    {
        var catalogCacheNew = categories.reduce((acc, it) => {
            acc[it.name] = Object.assign({}, it)
            return acc
        }, {})

        //clean images before cache
        for (var i in catalogCacheNew)
        {
            if (catalogCacheNew[i] && catalogCacheNew[i].items)
            {
                catalogCacheNew[i].items = catalogCacheNew[i].items.map(i =>
                {
                    var ii = Object.assign({}, i)
                    ii.image = '' //replace imgs form cache item to avoid blinking effect
                    return ii
                })
            }
        }

        this._ischangingCache = true
        this.set('catalogCache', catalogCacheNew)
        this._ischangingCache = false
    }

    _fetchItems(categoryName, attempts)
    {
        if (categoryName == undefined) { return }

        var category: null | CategoryItem = null
        if (this.categories && !(this.categories.length === 1 && this.categories[0].name == CATALOG_ROOTID))
        {
            category = this._getCategoryObject(this.categories, categoryName)
        }
        if (!category)
        {
            category = { name: categoryName }
        }


        // Only fetch the items of a category if it has not been previously set.
        //FIX: reload each time to have updated images with custom data //if (!category || category.items) { return; }
        this._setFailure(false)
        this._setLoading(true)

        var qpar = {} //TeaminfoData.integration_params_apply(this.route.__queryParams) || {}
        qpar['category'] = category.name
        var apiurl = StringUtil.urlquery(this.api_url, qpar)
        var rq = {
            url: apiurl,
            onLoad: this._onRequestResponse.bind(this, category),
            onError: this._onRequestError.bind(this),
        }
        this._getResource(rq, attempts, true)
    }

    _onRequestResponse(category, request)
    {
        // console.log(this.role, 'category-data._onRequestResponse')
        var r = request['response']
        if (r && r['success'])
        {
            var r = r['result']
            var items: null | Array<any> = null, 
                categories: null | Array<any> = null, 
                recentProducts: null | Array<any> = null
            if (Array.isArray(r)) //oldFormat
            {
                items = r
                categories = this.categories
            }
            else if (r)
            {
                items = r.Products || null
                categories = r.Categories || null
                recentProducts = r.RecentProducts || null
            }

            // var heroimgs = [
            //     { image: '/data/images/ladies_outerwear.jpg', placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAWQABAQAAAAAAAAAAAAAAAAAAAAEBAQEAAAAAAAAAAAAAAAAAAAIDEAABAwMFAQAAAAAAAAAAAAARAAEygRIDIlITMwUVEQEBAAAAAAAAAAAAAAAAAAAAQf/aAAwDAQACEQMRAD8Avqn5meQ0kwk1UyclmLtNj7L4PQoioFf/2Q==' },
            //     { image: '/data/images/ladies_tshirts.jpg', placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAXwABAQEAAAAAAAAAAAAAAAAAAAMFAQEBAAAAAAAAAAAAAAAAAAABAhAAAQIDCQAAAAAAAAAAAAAAEQABITETYZECEjJCAzMVEQACAwAAAAAAAAAAAAAAAAAAATFBgf/aAAwDAQACEQMRAD8AzeADAZiFc5J7BC9Scek3VrtooilSNaf/2Q==' },
            //     { image: '/data/images/mens_outerwear.jpg', placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAXAABAQEAAAAAAAAAAAAAAAAAAAIEAQEAAAAAAAAAAAAAAAAAAAACEAAAAwYHAQAAAAAAAAAAAAAAERMBAhIyYhQhkaEDIwUVNREBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A3dkr5e8tfpwuneJITOzIcmQpit037Bw4mnCVNOpAAQv/2Q==' },
            //     { image: '/data/images/mens_tshirts.jpg', placeholder: 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCAADAA4DASIAAhEBAxEB/8QAWwABAQEAAAAAAAAAAAAAAAAAAAMEAQEAAAAAAAAAAAAAAAAAAAAAEAABAwEJAAAAAAAAAAAAAAARAAESEyFhodEygjMUBREAAwAAAAAAAAAAAAAAAAAAAEFC/9oADAMBAAIRAxEAPwDb7kupZU1MTGnvOCgxpvzEXTyRElCmf//Z' },
            // ]
            // for (var i in categories)
            // {
            //     let hc = Math.round(Math.abs(heroimgs.length * 100000000 / hashCode(categories[i].name)) * heroimgs.length) - 1 
            //     if (hc >= heroimgs.length) { hc = heroimgs.length - 1 }
            //     if (hc < 0) { hc = 0 }
            //     // console.log(categories[i].name, hc)
            //     var img = heroimgs[hc]
            //     categories[i].image = img.image
            //     categories[i].placeholder = img.placeholder
            // }


            //convert Items
            if (Array.isArray(items) && items.length > 0) 
            {
                for (var i in items)
                {
                    items[i] = Object.assign(new CatalogProductModel(), items[i])
                    items[i].price = Object.assign(new ProductPriceModel(), items[i].price)
                }
            }

            categories = this._mergeCategories(categories)
            
            var cati = this._getCategoryObject(categories, category.name)
            if (cati)
            {
                category = cati
                category.items = items
                category.recentProducts = recentProducts
            }
            else
            {
                category.items = null
                category.recentProducts = recentProducts
            }

            if (Array.isArray(categories) && JSON.stringify(this.categories) !== JSON.stringify(categories))
            {
                var cacheNotify = (this.categories.length == 0 && categories.length > 0)
                // console.log("was", this.categories, "\nnow", categories)
                this._setCategories(Object.assign([], categories))
                if (cacheNotify)
                {
                    //means need notify root data - thru cache object
                    this.notifyPath('catalogCache')
                }
            }
            this.set('category', category)
            this.notifyPath('category.items')
            this.dispatchEvent(new CustomEvent('api-catalog-loaded', { bubbles: true, composed: true, detail: { id: category.name, model: category, currency: this.currency } }))
            this._cacheCategories(categories)

            this._setLoading(false)
        }
        else
        {
            this._onRequestError(request)
        }
    }

    _onRequestError(e)
    {
        this._setFailure(true)
        this._setLoading(false)
    }

}
