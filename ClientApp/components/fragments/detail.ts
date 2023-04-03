import '@polymer/iron-icon/iron-icon.js'
// import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/app-route/app-route.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
// import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
// import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
// import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
// import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, Clipboard } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { Guid } from '../utils/MathExtensions'
import { ShoppingCartItemModel } from '../dal/shopping-cart-item-model'
import { UserInfoModel } from '../dal/user-info-model'
import { ProductData } from '../bll/product-data'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { UIImageMultiView3D } from '../ui/ui-image-multiview-3d';
import { UIImageUploader } from '../ui/ui-image-uploader';
import { UIDialog } from '../ui/ui-dialog'
import '../bll/product-data'
import '../ui/ui-loader'
import '../ui/ui-image-multiview-3d'
import '../ui/ui-image-uploader'
import '../ui/ui-product-notfound'
import '../ui/ui-player-info'
import '../ui/ui-team-info'
import '../ui/ui-description'
import '../ui/ui-carousel'
import '../ui/ui-list-subcategory'
import '../ui/ui-select'
import '../ui/ui-quantity'
import '../ui/ui-button'
import '../ui/ui-button-share'
import '../ui/ui-network-warning'
import '../ui/ui-date-time'
import '../ui/ui-product-variants'
import '../ui/ui-dialog'
import '../ui/paper-expansion-panel'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './detail.ts.html'
import style from './detail.ts.css'
import { PlayerInfoModel } from '../dal/player-info-model'
const Teamatical: TeamaticalGlobals = window['Teamatical']
declare var Chart: any
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }
// const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const RosterSingleItemID = 'single_item'
const DetailBase = FragmentBase //mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
export class Detail extends DetailBase
{
    static get is() { return 'teamatical-detail' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            item: { type: Object },
            itemRedirected: { type: String, },
            route: { type: Object, },
            routeData: { type: Object, observer: '_routeDataChanged', },
            queryParams: { type: Object, notify: true },
            visible: { type: Boolean, value: false, observer: '_visibleChanged', },
            offline: { type: Boolean, observer: '_offlineChanged' },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            customizationType: { type: String },
            smallScreen: { type: Object },
            appTitleDefault: { type: String, }, // app-title-default

            //input
            cart: { type: Array, },
            cartDetails: { type: Object },
            teamInfo: { type: Object, notify: true },
            playerInfo: { type: Object, notify: true },
            colorsPalette: { type: Array },
            categories: { type: Array },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },

            detailOptions: { type: Object },
            recentProducts: { type: Array },
            nocatalogMode: { type: Boolean, computed: '_compute_nocatalogMode(userInfo.customstoreUrl)', notify: true, reflectToAttribute: true },
            dialogcheckallviews: { type: Object },

            itemNameOld: { type: String },
            hasChanged: { type: Boolean, },
            isReady: { type: Boolean, notify: true },
            needReset: { type: Boolean, notify: true },
            failure: { type: Boolean, value: false },
            loadingHires: { type: Boolean, notify: true, },
            loading: { type: Boolean, value: false, notify: true },
            quantity: { type: String, observer: '_quantityChanged', },
            debouncing: { type: Object, notify: true, value: {} },
            chartjsLoaded: { type: Boolean, value: false, notify: true },
            iszoomMobile: { type: Boolean, reflectToAttribute: true },


            // allowPhotosHidden: { type: Boolean, computed: '_allowPhotosHidden(item.AllowPhotos)' },
            loadingOnUpdate: { type: Boolean, value: true, notify: true },
            isDisabledAddToCart: { type: Boolean, computed: '_isDisabledAddToCart(loading, item.Product.ProductDisabled, debouncing.*, userInfo.isAdmin)' },
            _hideRecentlyViewed: { type: Boolean, computed: '_computeHideRecentlyViewed(loading, recentProducts)' },
            playerCustomize: { type: Boolean, computed: '_computePlayerCustomize(item.Player, item.Player.*)' },
            hideCustomizeDesc: { type: Boolean, computed: '_computeHideCustomizeDesc(item.CanCustomize, item.CustomizeCount)' },
            showCustomDesignRequestBtn: { type: Boolean, computed: '_compute_showCustomDesignRequestBtn(item.CanCustomDesignRequest, item.Product.ProductDisabled)' },
            _shareType: { type: String, computed: '_compute_shareType(item.CustomizationType, item.IsBranded)' },

            isDisabledHiresDownload: { type: Boolean, computed: '_compute_isDisabledHiresDownload(loading, loadingHires)' },
            isQtyForcedByAdmin: { type: Boolean, computed: '_compute_isQtyForcedByAdmin(userInfo.isAdmin, item.QtyStep, quantity)' },
            isAddToCartForcedByAdmin: { type: Boolean, computed: '_compute_isAddToCartForcedByAdmin(userInfo.isAdmin, item.Product.ProductDisabled, item.QtyStep, quantity)' },
            isDealProfile: { type: Boolean, computed: '_compute_isDealProfile(userInfo.isAlmighty, userInfo.isAdmin, userInfo.isPartner)' },

            hidePrices: { type: Boolean, computed: '_compute_hidePrices(item.hideprices)', reflectToAttribute: true },
            priceRegularShow: { type: Boolean, computed: '_existsPrice(item.Price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(item.Price.SalePriceFinal, item.Price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(item.Price.ListPrice, item.Price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(item.Price.SalePriceFinal, item.Price.Currency)' },
            priceDiscounts: { type: Array, computed: '_computeDisounts(item.Price.DiscountOffers, item.Price.AppliedDiscounts)' },

            showRosterEditTooltipLast: { type: Boolean, },
            showRosterEditTooltip: { type: Boolean, computed: '_compute_showRosterEditTooltip(item.Roster, item.RosterList, showRosterEditTooltipLast, detailOptions.RosterBubble)' },
        }
    }

    static get observers()
    {
        return [
            '_itemVisibleChanged(item, visible, loading)',
            '_modelQuantityChanged(item.Quantity)',
            '_modelRecentProductsChanged(item.RecentProducts)',
            '_sizesLockedCompute(item.SizesSelected, item.SizesSelected.*, item.SizesLoсkedFlag)',
            '_cartDetailsChanged(cartDetails)',
            '_buildDiscountTierChart(item.Price.TierPrices)',
        ]
    }
    _log(v) { console.log('detail', v) }


    // #region Vars

    chartjsLoaded: boolean
    visible: boolean
    itemRedirected: string
    detailOptions: any
    showRosterEditTooltipLast: boolean = false
    _showRosterEditTooltipDebouncer: Debouncer
    _debouncerAnonymousDialog: any
    _loadingOnUpdateDebouncer: Debouncer
    _recentProductsDebouncer: Debouncer
    _itemChangeDebouncer: Debouncer
    _cartReadyDebouncer: Debouncer
    _chartanimDebouncer: Debouncer
    recentProducts: any
    isReady: any
    item: any
    quantity: any
    needReset: any
    route: any
    hasChanged: any
    loadingOnUpdate: any
    routeData: any
    userInfo: UserInfoModel
    debouncing: any
    queryParams: any
    _discountTierChart: any
    dialogcheckallviews: any
    _resizeEventHandler: any
    _chartAnimationFlag = false
    smallScreen: boolean

    // #endregion Vars

    // <!-- <app-localstorage-document key="app-detail-options" data="{{detailOptions}}"></app-localstorage-document> -->
    //     <!-- <dom-if if="[[userInfo.isDesigner1]]">
    //     <template strip-whitespace>
    //       <a href="ai://artmanager.teamatical.com/?pconfid=[[item.ProductConfigurationID]]">
    //         <iron-icon icon="open-in-new" class="open-in-new"></iron-icon>
    //       </a>
    //     </template>
    //   </dom-if> -->


    get imageProduct() { return this.$['image-product'] as UIImageMultiView3D }
    get productData() { return this.$['productData'] as ProductData }
    get imageUploader() { return this.$['image-uploader'] as UIImageUploader }
    get sizeLock() { return this.$['size-lock'] }
    get discountTierChart() { return this.shadowRoot ? this.shadowRoot.querySelector('#discountTierChart') as HTMLCanvasElement : null }


    connectedCallback()
    {
        super.connectedCallback()

        this._resizeEventHandler = (e) => this._onResized(e)
        window.addEventListener('resize', this._resizeEventHandler)
    }

    disconnectedCallback()
    {
        window.removeEventListener('resize', this._resizeEventHandler)
    }

    ready()
    {
        super.ready()
        this.item = undefined
        this.isReady = true
    }

    _resizeDebouncer: Debouncer
    _onResized(e?)
    {
        if (!this.visible || !this.discountTierChart) { return }

        // console.log(this.discountTierChart.style.height)
        if (this.discountTierChart.parentElement)
        {
            this.discountTierChart.parentElement.style.height = this.discountTierChart.style.height
        }
        this.discountTierChart.style.position = 'absolute'
        this._resizeDebouncer = Debouncer.debounce(this._resizeDebouncer, timeOut.after(200), () => 
        {
            if (this.discountTierChart) { this.discountTierChart.style.position = '' }
        })
    }

    copyProductConfiguraionIDTap(e)
    {
        Clipboard.copyFromString(this.item.ProductConfigurationID)
        this._showToast(this.localize('detail-copy-pcid-toast', 'pcid', this.item.ProductConfigurationID))
        // e.stopPropagation() //prevent close
    }

    _compute_showRosterEditTooltip(itemRoster, itemRosterList, showRosterEditTooltipLast, detailOptionsRosterBubble)
    {
        let v = this._rosterSelected(itemRoster, itemRosterList)

        // console.log(v, showRosterEditTooltipLast)
        if (v && !this.showRosterEditTooltipLast && !detailOptionsRosterBubble)
        {
            this._showRosterEditTooltipDebouncer = Debouncer.debounce(this._showRosterEditTooltipDebouncer, timeOut.after(2300), () => 
            {
                // console.log('showRosterEditTooltipLast, false')
                this.set('showRosterEditTooltipLast', true)
                if (!this.detailOptions) { this.detailOptions = {} }
                this.set('detailOptions.RosterBubble', true)
            })
            return true
        }
        this.showRosterEditTooltipLast = v
        return false
    }

    _compute_nocatalogMode(customstoreUrl)
    {
        return this._asBool(customstoreUrl)
    }

    _compute_hidePrices(item_hidePrices)
    {
        return item_hidePrices === undefined ? false : item_hidePrices
    }

    _compute_isAddToCartForcedByAdmin(isAdmin, productDisabled, qtyStep, quantity)
    {
        return isAdmin && (productDisabled || this._compute_isQtyForcedByAdmin(isAdmin, qtyStep, quantity))
    }
    
    _compute_isDealProfile(isAlmighty, isAdmin, isPartner)
    {
        return isAlmighty //isAdmin || isPartner
    }

    _compute_isDisabledHiresDownload(loading, loadingHires)
    {
        return loading || loadingHires
    }
    
    _compute_isQtyForcedByAdmin(isAdmin, qtyStep, quantity)
    {
        return isAdmin && (quantity % qtyStep !== 0)
    }

    _modelRecentProductsChanged(item_RecentProducts)
    {
        if (!item_RecentProducts || this.recentProducts === undefined)
        {
            this._recentProductsDebouncer = Debouncer.debounce(this._recentProductsDebouncer, timeOut.after(300), () => 
            {
                this.recentProducts = item_RecentProducts
            })
            return //EXIT!!!
        }

        // var diff = StringUtil.compareAsJSON(item_RecentProducts, this.recentProducts)
        if (JSON.stringify(item_RecentProducts) !== JSON.stringify(this.recentProducts)) 
        {
            this._recentProductsDebouncer = Debouncer.debounce(this._recentProductsDebouncer, timeOut.after(300), () => 
            { 
                this.recentProducts = item_RecentProducts 
            })
        }
    }

    qtyCaption(qtyStep, rosterSelected, rosterList)
    {
        var isroster = this._rosterSelected(rosterSelected, rosterList)
        if (isroster) { return this.localize('ui-qty-roster') }

        if (qtyStep > 1)
        {
            return this.localize('ui-qty-step', 'step', qtyStep)
        }
        else
        {
            
            return this.localize('ui-qty')
        }
    }

    _quantityChanged(q)
    {
        if (!this.item) { return }

        this.item.Quantity = q
        this.notifyPath('item.Quantity')
    }

    _modelQuantityChanged(q)
    {
        // console.log('_modelQuantityChanged', q)
        if (!q) { return }
        
        this.quantity = q
        // this.notifyPath('quantity')
    }

    _fSize(msi)
    {
        if (!msi) { return "" }
        return msi.Code
    }

    onSizemeterTap(e)
    {
        if (!this.imageProduct) { return }
        
        var itemDrawDimensions = this.imageProduct.switchSizemeter()
        if (itemDrawDimensions)
        {
            this.scrollIt(0, 300, 'easeInOutQuad')
        }
    }

    getSizes(manufi)
    {
        return manufi.Sizes
    }

    // _allowPhotosHidden(allowPhotos)
    // {
    //     return !allowPhotos
    // }
    // <!-- <div class="image-uploader-section"
    //   hidden$="[[allowPhotosHidden]]">
    //   <h2>[[localize('detail-image-uploader-section')]]</h2>
    //   <teamatical-ui-image-uploader 
    //     id="image-uploader" 
    //     hidden$="[[allowPhotosHidden]]"
    //     website-url="[[websiteUrl]]"
    //     visible="[[visible]]"
    //     images-ids="{{item.Photos}}">
    //   </teamatical-ui-image-uploader>
    // </div> -->

    _computeHideRecentlyViewed(loading, item_RecentProducts)
    {
        let hide = !item_RecentProducts || item_RecentProducts.length < 1
        // console.log('l', loading, 'items', !(!item_RecentProducts), item_RecentProducts?.length, '>>> hide ', hide)
        return hide
    }

    _computePlayerCustomize(itemPlayer: PlayerInfoModel, itemPlayerP)
    {
        if (!itemPlayer) { return false }

        return !(itemPlayer.NotPlayerName && itemPlayer.NotPlayerNumber && itemPlayer.NotPlayerYear && itemPlayer.NotPlayerCaptain && itemPlayer.NotPlayerActivity)
    }

    _computeHideCustomizeDesc(item_CanCustomize, item_CustomizeCount)
    {
        return item_CanCustomize !== true || item_CustomizeCount <= 1
    }

    _compute_showCustomDesignRequestBtn(canCustomDesignRequest, productDisabled)
    {
        return !productDisabled && canCustomDesignRequest
    }

    _compute_shareType(customizationType, isBranded)
    {
        return `${customizationType}${isBranded ? '-branded' : ''}`
    }

    _isDisabledAddToCart(loading, disabled, debouncingP, isAdmin)
    {
        var debouncing = false
        if (this.debouncing)
        {
            var dbnc = false
            for (var i in this.debouncing)
            {
                if (this.debouncing[i] == true) 
                { 
                    dbnc = true
                    break
                }
            }
            debouncing = dbnc
        }
        return loading || (disabled && !isAdmin) || debouncing
    }

    isDisabledStore(loading, isAuth)
    {
        return loading //|| !isAuth
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

    _routeDataChanged(routeData)
    {
        if (!this.route || this.route.prefix !== '/detail') { return }

        if (this.itemRedirected) 
        { 
            this.itemRedirected = ''
        }
        else
        {
            this.reset() 
        }
    }

    reset()
    {
        // console.log('reset')
        if (ProductData && (this.productData instanceof ProductData)) { this.productData.reset() }
        if (UIImageMultiView3D && (this.imageProduct instanceof UIImageMultiView3D)) { this.imageProduct.reset() }
        if (UIImageUploader && (this.imageUploader instanceof UIImageUploader)) { this.imageUploader.reset() }

        this.hasChanged = true
    }

    item_ProductPointOfView: number
    _itemVisibleChanged(product, visible, loading)
    {
        // console.log(product, visible, loading)
        if (!visible || !product) 
        { 
            this.loadingOnUpdate = true
            return 
        }

        this.item_ProductPointOfView = this.item.ProductPointOfView
        var item = product
        let handler = () =>
        {
            // console.log(item.SizesSelected[0].Size)
            // if (item.SizesSelected.length > 1) { console.log(item.SizesSelected[1].Size) }

            if (!this.hasChanged) { return }
            this.hasChanged = false
            this.quantity = (item && item.Quantity ? item.Quantity : '1')

            this._loadingOnUpdateDebouncer = Debouncer.debounce(this._loadingOnUpdateDebouncer, timeOut.after(1500), () => { this.loadingOnUpdate = false })

            // console.log(item?.Product?.Description)
            this.dispatchEvent(new CustomEvent('change-section', {
                bubbles: true, composed: true, detail: {
                    category: 'cat:' + (item ? item.category : ''),
                    type: 'product',
                    disabled: item?.Product?.ProductDisabled,
                    title: item?.Product?.Title || '',
                    description: item?.Product?.Description || '',
                    keywords: item?.Product?.Keywords || '',
                    image: (item && item.ProductViews && item.ProductViews.length > 0 ? item.ProductViews[0].ImageUrl : ''), //todo multiple images - do we need it??
                    currency: item?.Price?.Currency || '',
                    price: this._formatPrice(item?.Price?.SalePriceFinal, item?.Price?.Currency),
                }
            }))
        }
        // console.log('title: ' + (item ? item.Product.Title : ''))
        this._itemChangeDebouncer = Debouncer.debounce(this._itemChangeDebouncer, timeOut.after(17), handler)

        this._cartReadyDebouncer = Debouncer.debounce(this._cartReadyDebouncer, timeOut.after(500), ()=> { 
            this.dispatchEvent(new CustomEvent('api-cart-getready', { bubbles: true, composed: true, detail: { item: item } }))
        })
    }

    _cartDetailsChanged(cartDetails)
    {
        if (!Array.isArray(cartDetails) || cartDetails.length < 1) { return }

        var notvalid = {}
        for (var i in cartDetails)
        {
            notvalid[cartDetails[i].Key] = cartDetails[i].Message
        }
        this.set('item.Player.notvalid', notvalid)
    }

    _hiddenDesc(desc)
    {
        // console.log('desc', desc)
        // let text = item && item.Product ? item.Product.Description : ''
        // return typeof text != 'string' || text.length < 1

        return !this._asBool(desc) || desc == '<p><br></p>' //empty html
    }

    _formatSizeTitle(manufi, mList)
    {
        // console.log(manufi)
        // if (mList && mList.length > 1)
        // {
        //     return this.localize('detail-size') + ' of ' + manufi.ProductType
        // }
        // return this.localize('detail-size')
        return manufi && manufi.SizeTitle ? manufi.SizeTitle : this.localize('detail-size')
    }

    _formatTitleOfSizesList(sizesList, currency)
    {
        if (!Array.isArray(sizesList)) { return sizesList }
        return sizesList.map((element, index, array) => 
        {
            var v = Object.assign({}, element)
            if (isFinite(v.Surcharge))
            {
                v.Name = `${v.Name} + ${this._formatPrice(v.Surcharge, currency)}`
            }
            return v
        })
    }

    _rosterSelected(roster, rosterList)
    {
        var inx = -1
        var f = rosterList && roster ? rosterList.filter((element, index, array) => {
            var v = element.id == roster.id
            if (v) { inx = index }
            return v
        }).length > 0 : false
        // console.log(roster, rosterList, f, inx)
        return f && inx > 0
    }

    _rosterEdit(e)
    {
        if (!this.item || !this.item.Roster || !this.item.Roster.id) { return }

        this.dispatchEvent(new CustomEvent('api-roster-edit', { bubbles: true, composed: true, detail: { 
            item: this.item
        } }))
    }

    _addToCart()
    {
        const addToCartHandler = () => {
            var entry = new ShoppingCartItemModel()
            entry.id = 'temp_' + Guid.newGuid() //generate guid
            entry.item = this.item
            entry.quantity = parseInt(this.quantity, 10)
    
            // This event will be handled by app.
            this.dispatchEvent(new CustomEvent('api-cart-item-add', { bubbles: true, composed: true, detail: { 
                entry: entry
            } }))
        } 

        var skipCheckPlayer = false
        if (window.localStorage)
        {
            try 
            { 
                skipCheckPlayer = JSON.parse(localStorage['playername-check-skip'])
            }
            catch 
            {
                //
            }
        }
        const DefaultPlayerNumber = this.item?.Player?.DefaultPlayerNumber || '25'
        if (!skipCheckPlayer 
            && !this.item?.Player?.NotPlayerNumber 
            && this.item?.Player?.PlayerNumber == DefaultPlayerNumber 
            && (!this.item?.Roster || this.item?.Roster?.id == RosterSingleItemID))
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('detail-playernumber-check-msg', 'default-number', DefaultPlayerNumber),
                    required: true,
                    widthauto: true,
                    buttons: [
                        {
                            title: this.localize('detail-playernumber-check-ok'),
                            icon: 'shopping-cart',
                            ontap: (e) => 
                            {
                                //playername-check-skip
                                if (localStorage)
                                {
                                    localStorage['playername-check-skip'] = 'true'
                                }
                                addToCartHandler()
                            }
                        },
                        {
                            title: this.localize('detail-playernumber-check-fix'),
                            ontap: (e) => 
                            {
                                //
                            }
                        },
                    ],
                }
            }))

            return true //EXIT
        }


        addToCartHandler()
    }

    _customizeTap(e)
    {
        var qobj: any = null
        if (this.item)
        {
            qobj = ProductData.product_query(this.item, this.queryParams, this.item.CustomizationType)
        }
        this._gotoCustomize(this.routeData.item, this.routeData.category, qobj)
    }

    _addToStore(e)
    {
        if (!this.userInfo || !this.userInfo.isAuth) 
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('detail-store-failed-isauth'),
                    buttons: [
                        {
                            title: this.localize('detail-store-failed-cancel'),
                            ontap: (e) => 
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }
                            }
                        },
                        {
                            title: this.localize('detail-store-failed-signin'),
                            ontap: (e) => 
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }
                                this.dispatchEvent(new CustomEvent('ui-user-auth', {
                                    bubbles: true, composed: true, detail: {
                                        signin: true
                                    }
                                }))
                            }
                        },
                    ],
                }
            }))

            return //EXIT
        }

        const addStore = (storeid?) => 
        {
            this.productData.addToStore(
                storeid,
                (store) => //success
                {
                    this.dispatchEvent(new CustomEvent('api-show-dialog', {
                        bubbles: true, composed: true, detail: {
                            message: this.localize('detail-store-success-msg'),
                            buttons: [
                                {
                                    title: this.localize('detail-store-success-gotostore'),
                                    ontap: (e) => 
                                    {
                                        this._gotoStore(store?.sid, { item: store?.ItemRecentlyAdded?.name })
                                    }
                                },
                                {
                                    title: this.localize('detail-store-success-continue'),
                                    ontap: (e) => 
                                    {
                                        //do nothing
                                    }
                                },
                            ],
                        }
                    }))
                },
                (e) => //failed
                {
                    var msg = this.localize('detail-store-failed-message')
                    if (e.summary) 
                    {
                        msg = msg + e.summary.Message
                    }
    
                    //It is required to be an administrator of the store, you may select your store in account page.
                    //No custom store selected, select a default store in account page.
    
                    this.dispatchEvent(new CustomEvent('api-show-dialog', {
                        bubbles: true, composed: true, detail: {
                            announce: this.localize('detail-store-failed-announce'),
                            message: msg,
                            buttons: [
                                {
                                    title: this.localize('detail-store-failed-ok'),
                                    ontap: (e) => 
                                    {
                                        if (this._debouncerAnonymousDialog)
                                        {
                                            this._debouncerAnonymousDialog.cancel()
                                            this._debouncerAnonymousDialog = null
                                        }
                                    }
                                },
                                {
                                    title: this.localize('detail-store-failed-mystores'),
                                    ontap: (e) => 
                                    {
                                        this._gotoAccountStores()
                                    }
                                }
                            ],
                        }
                    }))
                },
            )
        }

        const se = e?.detail?.sourceEvent
        if (this.userInfo?.isAuth && (this.userInfo?.isDesignerAdmin || this.userInfo?.isAdmin)
            && !se?.altKey && !se?.ctrlKey && se?.shiftKey)
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('detail-addtostore-storeid-msg'),
                    required: true,
                    inputs: [
                        { type: 'text', label: 'Store ID', name: 'StoreID', value: '', autocomplete: 'storeid', maxlength: 16, required: true, autofocus: true },
                    ],
                    buttons: [
                        {
                            confirm: true,
                            title: this.localize('detail-addtostore-storeid-add'),
                            ontap: (e) => 
                            {
                                addStore(e?.detail?.StoreID)
                            }
                        },
                        {
                            dismiss: true,
                            title: this.localize('detail-addtostore-storeid-cancel'),
                            ontap: (e) => 
                            {
                                if (this._debouncerAnonymousDialog)
                                {
                                    this._debouncerAnonymousDialog.cancel()
                                    this._debouncerAnonymousDialog = null
                                }
                            }
                        },
                    ],
                }
            }))
        }
        else
        {
            addStore()
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

        // console.log(item + ' | o:' + offline + ' | f:' + failure + ' | l:' + loading + ' => hide: ' + v)

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

    _sizesLockedCompute(sizesSelected, sizesSelectedP, sizesLoсkedFlag)
    {
        var r:any = null
        if (Array.isArray(sizesSelected) && sizesSelected.length > 1)
        {
            var s: any = null
            for (var i in sizesSelected)
            {
                if (!(sizesSelected[i] && sizesSelected[i].Size && sizesSelected[i].Size.Code)) { continue }

                if (s == null) { s = sizesSelected[i] }

                if (sizesSelected[i].Size.Code != s.Size.Code)
                {
                    r = false
                    break
                }
            }
            if (r == null) { r = true }
        }
        else
        {
            r = false
        }

        if (!r && sizesLoсkedFlag)
        {
            if (sizesSelectedP.path.indexOf('item.SizesSelected.') >= 0 && sizesSelectedP.path.indexOf('item.SizesSelected.0') < 0)
            {
                this.item.SizesLoсkedFlag = false
            }
        }

        if (this.sizeLock instanceof HTMLElement)
        {
            if (r && sizesLoсkedFlag)
            {
                this.sizeLock.removeAttribute('hidden-animated')
            }
            else
            {
                this.sizeLock.setAttribute('hidden-animated', 'true')
            }
        }
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e, 'item')
    }


    _highResImageTap(e)
    {
        this.async(() => this.productData.hiresImageDownload())
    }

    _downloadImageTap(e)
    {
        this.async(() => this.productData.imageDownload())
    }


    async _initChart()
    {
        var chartjsM = await import('chart.js/dist/Chart.js')
        Chart = chartjsM.default
    }

    async _buildDiscountTierChart(tierPrices)
    {
        var chartColors = {
            Consumer: 'rgb(30, 136, 229)',
            TierBronze: 'rgb(205,127,50)',
            TierSilver: 'rgb(190,190,190)',
            TierGold: 'rgb(233,199,61)',
            TierPlatinum: 'rgb(80,80,80)',
            TierFactoryCost: 'rgb(170,0,0)',
        }
        var minV = 200
        var maxV = 200
        var lineChartData: any = {}

        if (Array.isArray(tierPrices) && tierPrices.length > 0 && Array.isArray(tierPrices[0].Values))
        {
            lineChartData.labels = tierPrices[0].Values.map((currentValue, index, array) => {
                return '>= ' + currentValue.Quantity
            })
            lineChartData.datasets = tierPrices.map((currentValue, index, array) => {
                return {
                    label: this.localizep('detail-discount-tiers-', currentValue.ID),
                    borderColor: chartColors[currentValue.ID],
                    backgroundColor: chartColors[currentValue.ID],
                    fill: false,
                    data: currentValue.Values.map((vali, inx, arr) =>
                    {
                        var v = parseInt(vali.Price)
                        if (v > maxV) { maxV = v }
                        if (v < minV) { minV = v }
                        return v
                    }),
                }
            })
        }
        else
        {
            lineChartData.labels = []
            lineChartData.datasets = []
        }


        if (this._discountTierChart)
        {
            if (!tierPrices)
            {
                this._discountTierChart.data = lineChartData
                this._discountTierChart.options.animation = false
                this._discountTierChart.update()
                this._chartAnimationFlag = true
            }
            else if (JSON.stringify(this._discountTierChart.data) != JSON.stringify(lineChartData))
            {
                this._discountTierChart.data = lineChartData
                this._discountTierChart.options.animation = this._chartAnimationFlag
                this._discountTierChart.update()
                this._chartAnimationFlag = false
            }
        }
        else if (this.shadowRoot)
        {
            await this._initChart()

            var tierChartEl = this.discountTierChart 
            
            if (tierChartEl && Chart)
            {
                var currency = this.item?.Price?.Currency
                // var currencySymbol = this._formatPrice(0, currency).replace(new RegExp("[0-9\,\.]", "g"), "")

                var ctx = (tierChartEl as HTMLCanvasElement).getContext('2d')
                this._discountTierChart = new Chart(ctx, {
                    type: 'line',
                    data: lineChartData,
                    options: {
                        locale: this.language,
                        responsive: true,
                        maintainAspectRatio: false,
                        hoverMode: 'index',
                        stacked: false,
                        plugins: {
                            legend: {
                              position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => 
                                    {
                                        var label = context.dataset.label || ''
                                        if (label) { label += ': ' }
                                        if (context.parsed.y !== null) 
                                        {
                                            label += this._formatPrice(context.parsed.y, currency)
                                        }
                                        return label
                                    }
                                }
                            },
                        },
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    // display: true,
                                    // text: this.localize('detail-qty')
                                },
                            },
                            y: {
                                display: true,
                                title: {
                                    // display: true,
                                    // text: this.localize('detail-prices', 'currency', currencySymbol)
                                },
                                suggestedMin: minV,
                                suggestedMax: maxV,
                                ticks: {
                                    callback: (value, index, values) =>
                                    {
                                        return this._formatPrice(value, currency)
                                    }
                                },
                            }
                        },
                    }
                })

                this.chartjsLoaded = true
            }
        }
    }

    async checkAllViewsTap(e)
    {
        var obj: any = { 
            ProductConfigurationID: this.item.ProductConfigurationID,
            ProductPointOfView: this.item_ProductPointOfView, //this.item.ProductPointOfView,
            ProductPointOfViewCount: this.item.ProductPointOfViewCount,
        }

        var dialogcheckallviews = this.shadowRoot ? this.shadowRoot.querySelector('#dialogcheckallviews') as UIDialog : null
        if (dialogcheckallviews)
        {
            this.set('dialogcheckallviews', Object.assign({ }, obj, { loading: true, title: this.localize('detail-dialogcheckallviews-title') }))
            dialogcheckallviews.open()
        }
        var r = await this.productData.checkAllViews() as any
        this.set('dialogcheckallviews.loading', false)
        if (!r?.success || !r?.result?.ProductViews) { return }

        const productViews = r.result.ProductViews
        
        var ar: any = []
        for (var i in productViews)
        {
            let vi = Object.assign(productViews[i], { 
                ViewId: MD5(productViews[i].ImageUrl), 
                Selected: true,
            })
            ar.push([ vi ])
        }
        this.set('dialogcheckallviews.ProductViews', ar)
    }

    _closeDialogCheckallviewsTap(e)
    {
        //
    }

    // _formatSizesSelected(sizesSelected)
    // {
    //     if (!Array.isArray(sizesSelected)) { return '' }
    //     var r = sizesSelected.reduce((acc, x) => { 
    //         if (acc) { acc += ', ' }
    //         acc += x?.Size?.Name
    //         return acc 
    //     }, 
    //     '')
    //     return r
    // }
}
