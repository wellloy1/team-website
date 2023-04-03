import '@polymer/app-route/app-route.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Currency } from '../utils/CommonUtils'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { ProductData } from '../bll/product-data'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { TeamInfoModel } from '../dal/team-info-model'
import { PlayerInfoModel } from '../dal/player-info-model'
import { ColorModel } from '../dal/color-model'
import { UIImageMultiView3D } from '../ui/ui-image-multiview-3d'
import '../bll/product-data'
import '../ui/ui-loader'
import '../ui/ui-button'
import '../ui/ui-player-info'
import '../ui/ui-team-info'
import '../ui/ui-product-notfound'
import '../ui/ui-image-multiview-3d'
import '../ui/ui-network-warning'
import '../shared-styles/common-styles'
import view from './team.ts.html'
import style from './team.ts.css'

const TeamBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior

@FragmentDynamic
export class Team extends TeamBase
{
    static get is() { return 'teamatical-team' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            item: { type: Object, notify: true },

            route: { type: Object, },
            routeData: { type: Object, observer: '_routeDataChanged', },
            routeActive: { type: Boolean },
            queryParams: { type: Object, },
            visible: { type: Boolean, value: false, observer: '_visibleChanged', },
            offline: { type: Boolean, observer: '_offlineChanged' },
            websiteUrl: { type: String },
            categories: { type: Array },
            userInfo: { type: Object },

            //input
            teamInfo: { type: Object, notify: true },
            playerInfo: { type: Object, notify: true },
            colorsPalette: { type: Array },

            itemNameOld: { type: String },
            isReady: { type: Boolean, },
            hasChanged: { type: Boolean, },
            loading: { type: Boolean, value: false, notify: true },
            failure: { type: Boolean, value: false, notify: true },

            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
            loadingOnUpdate: { type: Boolean, value: true },
        }
    }

    static get observers()
    {
        return [
            '_itemVisibleChanged(item, visible)',
        ]
    }

    get imageProduct() { return this.$['image-product'] }
    get productData(): ProductData { return <ProductData>this.$['productData'] }

    isReady: any
    _loadingOnUpdateDebouncer: any
    _itemChangeDebouncer: any
    // panels: any
    route: any
    hasChanged: any
    loadingOnUpdate: any
    item: any
    categories: any


    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
        this.isReady = true
    }

    // _panelsByIndex(inx)
    // {
    //     return this.panels[inx]
    // }

    _onToggle(e)
    {
        //
    }

    _routeDataChanged(routeData)
    {
        // console.log(this.itemNameOld + ' > ' + routeData.item)
        // if (this.itemNameOld != routeData.item) 
        // {
        //     console.log('hasChanged')
        //     this.hasChanged = true
        //     this.itemNameOld = routeData.item
        //     this.reset()
        //     this.item = undefined
        // }
        if (!this.route || this.route.prefix !== '/team') { return }

        this.hasChanged = true
        if (this.productData) { this.productData.reset() }
        if (UIImageMultiView3D && (this.imageProduct instanceof UIImageMultiView3D))
        {
            this.imageProduct.reset()
        }
    }

    reset()
    {
        if (UIImageMultiView3D && (this.imageProduct instanceof UIImageMultiView3D))
        {
            this.imageProduct.reset()
        }
    }

    _itemVisibleChanged(item, visible)
    {
        if (!visible) 
        { 
            this.loadingOnUpdate = true
            return 
        }


        let handler = () =>
        {
            if (!this.hasChanged) { return }
            this.hasChanged = false

            this._loadingOnUpdateDebouncer = Debouncer.debounce(this._loadingOnUpdateDebouncer, timeOut.after(1500), () => { this.loadingOnUpdate = false })
        }
        this._itemChangeDebouncer = Debouncer.debounce(this._itemChangeDebouncer, microTask, handler)
    }

    isNotArrayOrEmpty(ar)
    {
        return !Array.isArray(ar) || ar.length < 1
    }

    localizeSelectorTitle(name)
    {
        return this.localize('customize-' + name)
    }

    _saveProductConfiguration()
    {
        this.productData.save((e) =>
        {
            var cat = this.item.CatalogCategory
            var catN = this.categories[0].name
            if (cat.StoreID)
            {
                return this._gotoStore(cat.StoreID) //EXIT
            }
            if (cat.name) { catN = cat.name }
            this._gotoList(catN)
        })
    }

    _createProduct()
    {
        // console.log('_createProduct')
    }

    _visibleChanged(v)
    {
        if (v === false)
        {
            this.item = undefined
        }
        else if (v === true)
        {
            this.dispatchEvent(new CustomEvent('change-section', {
                bubbles: true, composed: true, detail: {
                    category: this.productData.itemName,
                    title: this.localize('create-team-title')
                    // type: 'catalog',
                    // desc: item?.Product?.Description || '',
                    // keywords: item?.Product?.Keywords || '',
                }
            }))
        }
    }

    _isDefined(item)
    {
        return item != null
    }

    _isNotConn(item, failure, offline, loading)
    {
        return (item !== undefined || !loading || offline === true || failure === true)
    }

    _isFound(item, failure, offline, loading)
    {
        var v = loading === true || failure === true
        if (v && !loading && item === null) { v = false }
        if (!v && !loading && !(item === undefined || item === null)) { v = true }
        return v
    }

    _isNoProduct(item, failure, offline)
    {
        return !item || failure === true
    }

    _tryReconnect()
    {
        this.productData.refresh()
    }

    _offlineChanged(offline, old)
    {
        if (!offline && old != undefined)
        {
            this._tryReconnect()
        }
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }
}