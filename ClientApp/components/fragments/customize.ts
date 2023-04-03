import '@polymer/app-route/app-route.js'
import '@polymer/paper-toggle-button/paper-toggle-button'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronScrollTargetBehavior } from '@polymer/iron-scroll-target-behavior/iron-scroll-target-behavior.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { Guid } from '../utils/MathExtensions'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import '../bll/product-data'
import '../ui/ui-image-multiview-3d'
import '../ui/ui-loader'
import '../ui/ui-product-notfound'
import '../ui/ui-team-info'
import '../ui/ui-player-info'
import '../ui/ui-image-uploader'
import '../ui/ui-design-selector'
import '../ui/ui-carousel'
import '../ui/ui-button'
import '../ui/ui-network-warning'
import '../ui/ui-product-variants'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import view from './customize.ts.html'
import style from './customize.ts.css'
import { ProductData } from '../bll/product-data';
import { UIImageMultiView3D } from '../ui/ui-image-multiview-3d';
import { UIImageUploader } from '../ui/ui-image-uploader';

const Teamatical: TeamaticalGlobals = window['Teamatical']
const CustomizeBase = mixinBehaviors([IronResizableBehavior, IronScrollTargetBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior & IronScrollTargetBehavior



@FragmentDynamic
export class Customize extends CustomizeBase
{
    static get is() { return 'teamatical-customize' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            item: { type: Object, notify: true },

            route: { type: Object, },
            routeData: { type: Object, observer: '_routeDataChanged', },
            queryParams: { type: Object, notify: true },
            visible: { type: Boolean, value: false, observer: '_visibleChanged', },
            offline: { type: Boolean, observer: '_offlineChanged' },
            websiteUrl: { type: String },
            categories: { type: Array },
            userInfo: { type: Object },
            
            customizationType: { type: String, notify: true },
            editingWizard: { type: Boolean, notify: true },
            allowModeSwitcher: { type: String, computed: '_allowModeSwitcherCompute(item.CanCoach, item.CanWizard)' },
            allowModeSwitching: { type: String, computed: '_allowModeSwitchingCompute(item.CanCoach, item.CanWizard, loading)' },


            //input
            teamInfo: { type: Object, notify: true },
            playerInfo: { type: Object, notify: true },
            colorsPalette: { type: Array },

            itemNameOld: { type: String },
            isReady: { type: Boolean, },
            hasChanged: { type: Boolean, },
            loading: { type: Boolean, value: false, notify: true },
            failure: { type: Boolean, value: false },

            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
            allowPhotosHidden: { type: Boolean, computed: '_allowPhotosHidden(item.AllowPhotos)' },
            loadingOnUpdate: { type: Boolean, value: true },

            changingCusType: { type: Boolean, value: false, notify: true },
            loadingDesignSet: { type: Boolean, computed: '_compute_loadingDesignSet(changingCusType, item)' },
            customizationTypeSelector: { type: Boolean, computed: '_compute_customizationTypeSelector(changingCusType, customizationType)' },

            _cloneBtnHide: { type: Boolean, computed: '_compute_cloneBtnHide(item.CanClone)' },
            _saveBtnHide: { type: Boolean, computed: '_compute_saveBtnHide(item.CanOverwrite)' },
            _applyBtnHide: { type: Boolean, computed: '_compute_applyBtnHide(item.CanOverwrite)' },
            _cloneBtnTitle: { type: Boolean, computed: '_compute_cloneBtnTitle(item.Store, item.CanOverwrite)' },
            _saveBtnTitle: { type: Boolean, computed: '_compute_saveBtnTitle(item.Store)' },
            _applyBtnTitle: { type: Boolean, computed: '_compute_applyBtnTitle(item.Store)' },
        }
    }

    static get observers()
    {
        return [
            '_itemVisibleChanged(item, visible)',
            '_switcherByCustomizationType(customizationType)',
            '_switcher(editingWizard)',
            '_itemChanged(item)',
            '_stick2FocusedDesignSetChanged(item.DesignOptionSetList.*)',
        ]
    }

    item: any
    isReady: any
    customizationType: string
    customizationTypeLast: string
    _loadingOnUpdateDebouncer: Debouncer
    _itemChangeDebouncer: Debouncer
    _imgP: any
    _switchingDebouncer: Debouncer
    _changingSwitcher: boolean
    _changingCustType: boolean
    route: any
    routeData: any
    editingWizard: boolean
    hasChanged: boolean
    loadingOnUpdate: boolean
    changingCusType: boolean
    queryParams: any
    visible: boolean
    _this_animationframe: any
    _s_top_observer: any
    rect_top: number
    s_top: number
    designset: any


    get contentLine2() { return this.$['content-line2'] as HTMLDivElement }
    get productData() { return this.$['productData'] as ProductData }
    get imageUploader() { return this.$['image-uploader'] as UIImageUploader }
    get imageProduct() { return this.$['image-product'] as UIImageMultiView3D }
    get imageProductImgEl() 
    {
        var ip = this.imageProduct
        if (ip)
        {
            if (!this._imgP && ip.shadowRoot) 
            {
                this._imgP = ip.shadowRoot.querySelector('img')
            }
            return this._imgP
        }
        return null
    }


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
        this.isReady = true
    }

    _stick2FocusedDesignSetChanged(v?)
    {
        if (!this.visible) { return }

        if (typeof(v.path) == 'string' && v.value)
        {
            if (v?.path == 'item.DesignOptionSetList' && this.designset?.SetName)
            {
                var customizeUI = this
                //start monitor changes
                this._s_top_observer = new FlattenedNodesObserver(this.contentLine2, (info) => 
                {
                    if (this._this_animationframe) { window.cancelAnimationFrame(this._this_animationframe) }

                    this._this_animationframe = window.requestAnimationFrame(() => 
                    {
                        var designsetUI = this.contentLine2.querySelector(`teamatical-ui-design-selector[aria-label="${this.designset.SetName}"]`) 
                        if (!designsetUI) { return }

                        // var wh = (window.innerHeight || document.documentElement.clientHeight)
                        rect = designsetUI.getBoundingClientRect()
                        var s_top = customizeUI._getScrollTop()
                        // console.log('customize 2>>>', this.designset.SetName, 0, 'scroll', s_top, 'rect-top', rect.top, 'wh', wh)
                        delete this._s_top_observer
                        this.designset = null

                        //restore position
                        var s_dest = s_top + rect.top - this.rect_top
                        this.scrollIt(s_dest, 300, 'easeInOutQuad')
                    })
                })
            }
            else 
            {
                var r = /item\.DesignOptionSetList\.(?<setinx>[0-9]+)\.DesignOptions\.(?<optinx>[0-9]+)\.Selected$/.exec(v.path)
                if (r?.groups)
                {
                    var setinx = parseInt(r.groups.setinx)
                    this.designset = this.item.DesignOptionSetList[setinx]
                    var designsetUI = this.contentLine2.querySelector(`teamatical-ui-design-selector[aria-label="${this.designset.SetName}"]`) 
                    var customizeUI = this

                    //save position
                    if (designsetUI)
                    {
                        this.s_top = customizeUI._getScrollTop()
                        var rect = designsetUI.getBoundingClientRect()
                        this.rect_top = rect.top
                        // console.log('customize 1>>>', this.designset.SetName, setinx, 'scroll', this.s_top, 'rect_top', this.rect_top, 'wh', '?')
                    }
                }
            }
        }
    }

    _compute_loadingDesignSet(changingCusType, item)
    {
        return changingCusType || !item
    }

    _compute_customizationTypeSelector(changingCusType, customizationType)
    {
        // console.log(changingCusType, customizationType)
        if (changingCusType && this.customizationTypeLast) { return this.customizationTypeLast }
        
        this.customizationTypeLast = customizationType

        return customizationType
    }

    // _panelsByIndex(inx)
    // {
    //     return this.panels[inx]
    // }

    _allowPhotosHidden(allowPhotos)
    {
        return !allowPhotos
    }

    _onToggle(e)
    {
        // console.log(e)
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
        if (!this.route || this.route.prefix !== '/customize') { return }

        this.hasChanged = true
        this.productData.reset()
        this.imageProduct.reset()
        if (this.imageUploader && this.imageUploader.reset) { this.imageUploader.reset() }
    }

    reset()
    {
        this.imageProduct.reset()
    }

    _itemVisibleChanged(item, visible)
    {
        // console.log(item ? item.ColorsPalette : '')
        if (!visible || !item) 
        { 
            this.loadingOnUpdate = true
            this.customizationType = 'customize'
            // this.customizationType = 'wizard'
            return 
        }


        let handler = () =>
        {
            if (!this.hasChanged) { return }
            this.hasChanged = false

            this._loadingOnUpdateDebouncer = Debouncer.debounce(this._loadingOnUpdateDebouncer, timeOut.after(1500), () => { this.loadingOnUpdate = false })

            this.dispatchEvent(new CustomEvent('change-section', {
                bubbles: true, composed: true, detail: {
                    //category: item ? item.category : '', 
                    title: item ? item.Product.Title : ''
                }
            }))
        }
        this._itemChangeDebouncer = Debouncer.debounce(this._itemChangeDebouncer, microTask, handler)
    }

    _formatDesc(item)
    {
        // The item description contains escaped HTML (e.g. "&lt;br&gt;"), so we need to unescape it ("<br>") and set it as innerHTML.
        let text = item && item.Product ? item.Product.Description : ''
        return text
    }

    isNotArrayOrEmpty(ar)
    {
        return !Array.isArray(ar) || ar.length < 1
    }

    _back()
    {
        var qp = {} //clean query params
        this.set('queryParams', qp)
        this._gotoProduct(this.routeData.item, this.routeData.category, qp)
    }

    _apply()
    {
        var qp = this.queryParams 
        this._gotoProduct(this.routeData?.item, this.routeData?.category, qp)
    }

    _cloneProductConfiguration()
    {
        this.productData.clone((e) =>
        {
            var qp = {} //clean query params 
            this.set('queryParams', qp)
            this._gotoProductRS(e?.id, 'customized', qp)
        })
    }

    _saveProductConfiguration()
    {
        this.productData.save((e) =>
        {
            if (e?.store)
            {
                this._gotoStore(e.store.sid, { item: e.id })
            }
            else
            {
                var qp = {} //clean query params 
                this.set('queryParams', qp)
                this._gotoProductRS(e?.id, 'customized', qp)
            }
        })
    }    

    _itemChanged(item)
    {
        if (this._changingSwitcher) { return }
        this.changingCusType = false
    }

    switchMode(e)
    {
        var switchCustomize = e.target.parentElement.querySelector('paper-toggle-button#switchCustomize')
        if (switchCustomize && !switchCustomize.disabled)
        {
            this._changingSwitcher = true
            this.changingCusType = true
            this._changingSwitcher = false
            switchCustomize.checked = !switchCustomize.checked
        }
    }

    _switcher(editingWizard)
    {
        if (this.customizationType == 'customize') { return }
        if (this._changingCustType) { return }

        var ct = editingWizard ? 'wizard' : 'coach'
        this._switchingDebouncer = Debouncer.debounce(this._switchingDebouncer, timeOut.after(200), () => { 
            this._changingSwitcher = true
            this.changingCusType = true
            this.customizationType = ct
            this._changingSwitcher = false
        })
    }

    _switcherByCustomizationType(customizationType)
    {
        // console.log('editingWizard', customizationType)
        if (this._changingSwitcher) { return }

        this._changingCustType = true
        this.editingWizard = this.customizationType == 'wizard'
        this._changingCustType = false
    }

    _allowModeSwitcherCompute(canCoach, canWizard)
    {
        return (canCoach === true|| canWizard === true)
    }

    _allowModeSwitchingCompute(canCoach, canWizard, loading)
    {
        return canCoach === true && canWizard === true && loading !== true
    }
    
    _compute_cloneBtnHide(canClone)
    {
        return !canClone
    }

    _compute_saveBtnHide(canOverwrite)
    {
        return !canOverwrite
    }

    _compute_applyBtnHide(canOverwrite)
    {
        return false
    }

    _compute_cloneBtnTitle(store, canOverwrite)
    {
        if (!canOverwrite)
        {
            return this._compute_saveBtnTitle(store)
        }
        return store ? this.localize('customize-clone-fromstore-btn') : this.localize('customize-clone-btn')
    }

    _compute_saveBtnTitle(store)
    {
        return store ? this.localize('customize-save-fromstore-btn') : this.localize('customize-save-btn')
    }

    _compute_applyBtnTitle(store)
    {
        return store ? this.localize('customize-apply-fromstore-btn') : this.localize('customize-apply-btn')
    }

    _createProduct()
    {
        //console.log('_createProduct')
    }

    _visibleChanged(v)
    {
        if (v === false)
        {
            this.item = undefined
        }
        else if (v === true)
        {
            //
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
