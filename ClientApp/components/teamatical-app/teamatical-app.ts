import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/iron-pages/iron-pages.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/app-route/app-location.js'
import '@polymer/app-route/app-route.js'
import '@polymer/app-layout/app-scroll-effects/effects/waterfall.js'
import '@polymer/app-layout/app-header/app-header.js'
import '@polymer/app-layout/app-toolbar/app-toolbar.js'
import '@polymer/app-layout/app-drawer/app-drawer.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-item/paper-item'
import { html } from '@polymer/polymer/polymer-element'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { scroll } from '@polymer/app-layout/helpers/helpers'
import { AppHeaderElement } from '@polymer/app-layout/app-header/app-header.js'
import { IronPagesElement } from '@polymer/iron-pages/iron-pages.js'

import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { StringUtil } from '../utils/StringUtil'
import { UserData } from '../bll/user-data'
import { ColorsData } from '../bll/colors-data'
import { CartData } from '../bll/cart-data'
import { Analytics } from '../bll/analytics'
import { OpenGraph } from '../bll/open-graph'
import { ProductData } from '../bll/product-data'
import { CheckoutData } from '../bll/checkout-data'
import { CategoryData } from '../bll/category-data'
import { StoreData } from '../bll/store-data'
import { LocalizeBehaviorBase } from '../bll/localize-behavior'
import { AppVersion } from './teamatical-app.version'
import { UIBase } from '../ui/ui-base'
import { UISnackbar } from '../ui/ui-snackbar'
import { UICartModal } from '../ui/ui-cart-modal'
import { UIModalDialog } from '../ui/ui-modal-dialog'
import '../bll/analytics'
import '../bll/user-data'
import '../bll/cart-data'
import '../bll/category-data'
import '../ui/ripple-container'
import '../ui/tabs-overlay'
import '../ui/tab'
import '../ui/tabs'
import '../ui/ui-account-button'
import '../assets'
// const WebFont = require('webfontloader')
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/checkbox-styles'
import '../shared-styles/tooltip-styles'
import localeDefault from '../../static/locales/teamatical-website-locale-en-US.json'
import view from './teamatical-app.ts.html'
import style from './teamatical-app.ts.css'
import { NetBase } from '../bll/net-base'
import { loadStripe } from '@stripe/stripe-js/pure'
import { UserInfoModel } from '../dal/user-info-model'
import { DialogPopupModel } from '../dal/dialog-popup-model'
import { CookieUtils } from '../utils/CookieUtils'

const page404 = 'h404'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const NOTABSPAGES = ['customize', 'checkout', 'cart', 'cart-roster-preview', 'signin', 'signout']
// const NOTAPAGE ={ 'build': 1, 'data': 1, 'images': 1, '.well-known': 1, }
const HOMEPAGE_CHANGESECTION_DETAILS = { category: '', title: 'Home', image: '' }
const HOMEPAGE_COBRANDS = { 'lcahl': 1, 'candjdesignllc': 1, 'bda': 1, 'decathlon-th': 1, 'decathlon-fr': 1, 'snapraise': 1, 'candgsalesinc': 1, 'fashiontv': 1, 'douglassportswear': 1, 'deploy': 1, 
    'tailgreeter': 1, 'purewear': 1, 'fanatics': 1, 'sportsium': 1 }
const no_facebooklinkedin = 'no_facebook-linkedin'
export const DECATHLON_FR = 'decathlon-fr'



// @CustomElement
export class TeamaticalApp extends UIBase
{
    static get is() { return 'teamatical-app' }
    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-checkbox-styles teamatical-tooltip-styles teamatical-customlogo-styles">${style}</style>${view}`]) }
    // static get template() { 
    //     return html`
    //         <style include="teamatical-common-styles teamatical-form-styles teamatical-checkbox-styles teamatical-tooltip-styles teamatical-customlogo-styles">
    //             ${style}
    //         </style>
    //         ${view}
    //     `
    // }

    static get properties()
    {
        return {
            env: { type: String, value: "Production" },
            localeDefault: { type: String, value: "en-US" }, //locale-default
            versionStr: { type: String, },
            apiVersion: { type: String, value: "v1.0" },
            apiColors: { type: String, value: null },
            apiGroup: { type: String, },
            apiGateway: { type: String, value: "Stripe" }, //api-gateway
            apiPubkey: { type: String },
            authDomain: { type: String, },
            authAudience: { type: String, },
            authScope: { type: String, },
            websiteUrl: { type: String, value: "https://www.teamatical.com" },
            version: { type: Object },
            customLogo: { type: Boolean, reflectToAttribute: true }, //custom-logo (works for no-catalog mode not in DOMAIN)
            // customHome: { type: Boolean, reflectToAttribute: true }, //custom-home

            //customization manifest and titles
            appTitleDefault: { type: String, value: 'Teamatical' }, // app-title-default
            appDescDefault: { type: String }, // app-desc-default
            appKeywordsDefault: { type: String }, // app-keywords-default
            appImageurlDefault: { type: String }, // app-imageurl-default
        
            //organization subdomain 
            orgSubdomain: { type: String },
            orgAllowPo: { type: Boolean, reflectToAttribute: true }, //org-allow-po
            orgCountry: { type: String },
            orgConnectedId: { type: String },

            //user's current organization
            orgUser: { type: Boolean, reflectToAttribute: true }, //org-user
            orgId: { type: String },
            orgName: { type: String },

            shoppingcartCount: { type: Number, },
            postData: { type: String },
            customstoreByQuery: { type: String }, //customstore-by-query

            route: { type: Object, observer: '_routeChanged' },
            routeData: { type: Object, notify: true, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            page: { type: String, reflectToAttribute: true, observer: '_pageChanged' },
            pageMode: { type: String, reflectToAttribute: true, computed: '_computePageMode(page, pageModes, pageModes.*)' },

            pageLoading: { type: Boolean, reflectToAttribute: true, observer: '_pageLoadingChanged'},
            pageLoadingDelayed: { type: Boolean, },
            pageUpdating: { type: Array, notify: true, value: {} },
            pageSavings: { type: Array, notify: true, value: {} },
            catalogLoading: { type: Boolean, notify: true, value: true },

            cobrand: { type: String, computed: '_compute_cobrand(orgSubdomain, customLogo)', reflectToAttribute: true, }, //logo, org-subdomain or custom-logo for main domain & branding allowed
            poweredby: { type: Boolean, computed: '_compute_poweredby(orgSubdomain)', reflectToAttribute: true, },

            paymentLoaded: { type: Boolean, notify: true, },
            auth0Loaded: { type: Boolean, },
            fontsLoaded: { type: Boolean, reflectToAttribute: true },
            offline: { type: Boolean },
            loadComplete: { type: Boolean },
            deviceInfo: { type: Object, readOnly: true, notify: true },
            createTeamAllowed: { type: Boolean, value: true },
            errorUnhandled: { type: Boolean, value: false, reflectToAttribute: true, },

            // language: { type: String, notify: true },
            // resources: { type: Object, notify: true },
            // formats: { type: Object, notify: true },
            // localizeB: { type: Function, computed: '__computeLocalize(language, resources, formats)' },

            localStorage: { type: Object, value: {} },
            userInfo: { type: Object, },
            cart: { type: Object },
            cartDetails: { type: Object },
            currency: { type: String },
            numItems: { type: Number, }, // value: 0
            colorsPalette: { type: Array },
            categories: { type: Array },
            categoriesList: { type: Array, notify: true },

            Title: { computed: '_case_title(version.app_name)' },
            TITLE_UPPER: { computed: '_case_title(version.app_name, 1)' },
            _a11yLabel: { type: String },

            supportIe: { type: Boolean, reflectToAttribute: true },
            smallScreen: { type: Object },
            drawerOpened: { type: Boolean, notify: true, reflectToAttribute: true },
            tabListCache: { type: Object, value: {} },
            tabListID: { type: String },
            tabList: { type: Array, computed: '_computeTabList(tabListCache, tabListCache.*)' },
            drawerList: { type: Array, computed: '_computeDrawers(pageMenus.*, page)' },
            pageMenuSelected: { type: String, observer: '_pageMenuSelectedChanged' },
            pageMenus: { type: Object, notify: true, value: {} },
            pageModes: { type: Object, notify: true, value: {} },
            pageTab: { computed: '_computePageTab(pageMenus.*, pageMenuSelected)' },

            shouldShowTabs: { computed: '_computeShouldShowTabs(tabListID, tabListCache, tabListCache.*, userInfo.isAuth, smallScreen)', reflectToAttribute: true, },
            _shouldRenderTabs: { computed: '_computeShouldRenderTabs(shouldShowTabs, loadComplete)' },
            _shouldRenderDrawer: { computed: '_computeShouldRenderDrawer(smallScreen)' },
            _hideProgress: { computed: '_computeHideProgress(pageLoading, pageUpdating.*)' },
            userDataProgress: { computed: '_compute_userDataProgress(pageLoading)' },
            userWaiting: { computed: '_compute_userWaiting(pageLoading, pageUpdating.*, pageSavings.*)', reflectToAttribute: true },
            loadingDrawer: { computed: '_compute_loadingDrawer(drawerList, catalogLoading)' },
            loadingTabs: { computed: '_compute_loadingTabs(tabList, catalogLoading)' },

            searchUrl: { computed: '_computeSearchUrl(userInfo, userInfo.isAuth)' },
            savingProgress: { computed: '_compute_SavingProgress(pageSavings.*)', notify: true, reflectToAttribute: true },
            nocatalogMode: { computed: '_compute_nocatalogMode(customstoreByQuery)', notify: true, reflectToAttribute: true },
            imagesPath: { computed: '_computeImagesPath(env, version)' },
            _homeUrl: { computed: '_compute_homeUrl(env, customstoreByQuery, orgSubdomain)' },
            _cartUrl: { computed: '_compute_cartUrl(env, customstoreByQuery)' },
            isAuth: { computed: '_compute_isAuth(env, userInfo.isAuth)', reflectToAttribute: true },

            allowDrawerSwipe: { type: Boolean, computed: '_compute_allowDrawerSwipe(deviceInfo)' },
            iszoomMobile: { type: Boolean },

            // This shouldn't be necessary, but the Analyzer isn't picking up
            // Polymer.Element#rootPath
            rootPath: String,
        }
    }

    static get observers()
    {
        return [
            '_versionStrAssign(versionStr, appTitleDefault)',
            '_routePageChanged(routeData.page, orgSubdomain)',
            '_computeTabs(pageMenus.*, page, pageLoading)',
            '_loadPaymentElementsObserver(page)',
            '_loadLocaleSwitcherAndScrollUpObserver(page, pageLoadingDelayed)',
            '_loadLocaleSwitcherByQueryParams(queryParams.lang)',
            '_updateCategories(categoriesList)',
            '_updateCategoriesList(categories)',
        ]
    }

    _log() { console.log('tm-app', ...arguments) }


    // #region Vars

    env: any
    routeData: any
    subroute: any
    version: AppVersion | null = null
    _shouldRenderDrawer: boolean
    localStorage: any
    apiPubkey: any
    apiVersion: any 
    apiColors: any
    deviceInfo: any
    colorsPalette: any
    apiGroup: any
    websiteUrl: any
    errorUnhandled: any
    page: any
    route: any
    drawerOpened: any
    pageLoadingDelayed: any
    pageLoading: any
    loadComplete: any
    offline: any
    tabSelected: any
    pageMenuSelected: any
    Title: any
    pageMenus: any
    tabList: any
    tabListCache: any
    tabListID: any
    pageUpdating: any 
    pageSavings: any
    auth0Loaded: any
    fontsLoaded: any
    paymentLoaded: boolean
    supportIe: any
    userInfo: UserInfoModel
    __loggedDomChange: any
    _a11yLabel: any
    _announceDebouncer: any
    _browserErrorHandler: any
    _browserRejectionHandler: any
    _listScrollTop: any
    _networkSnackbar: any
    _snackbarAppVersion: any
    _snackbarCookie: any
    _snackbarSignout: any
    _modalDialog: UIModalDialog
    _scrollDebouncer: any
    _reloadDebouncer: any
    _submenuDebouncer: any
    _submenuDrawerDebouncer: any
    _pageLoadingDelayedDebouncer: any
    _cartModal: UICartModal
    _cartModalDebouncer: any
    _toast: UISnackbar
    buttonScrollup: any
    uiLocaleSwitcher: any
    categories: []
    categoriesList: []
    _setDeviceInfo: any
    queryParams: any
    apiGateway: string
    localeDefault: string
    numItems: number
    orgId: string
    orgConnectedId: string
    orgName: string
    orgSubdomain: string
    orgUser: boolean
    orgAllowPo: boolean
    orgCountry: string
    shoppingcartCount: number
    netbase: NetBase
    catalogLoading: boolean
    customstoreByQuery: boolean
    _homeUrl: string
    appTitleDefault: string
    appDescDefault: string
    appKeywordsDefault: string
    appImageurlDefault: string
    poweredby: boolean

    // #endregion Vars


    // #region Properties

    get uiheader() { return this.$['header'] as AppHeaderElement }
    get appFooter() { return this.$['app-footer'] as HTMLDivElement }
    get userData() { return this.$['user-data'] as UserData }
    get colorsData() { return this.$['colors-data'] as ColorsData }
    get categoryData() { return this.$['category-data'] as CategoryData }
    get gaData() { return this.$['ga'] as Analytics  }
    get ogData() { return this.$['og'] as OpenGraph}
    get cartData() { return this.$['cart'] as CartData }
    get pages() { return this.$['pages'] as IronPagesElement }

    // #endregion Properties
    

    constructor()
    {
        super()

        if (window.performance && performance.mark) { window.performance && performance.mark && performance.mark('teamatical-app.created') }

        LocalizeBehaviorBase.run('website', localeDefault)
        // this.async(async()=>{
        //     await LocalizeBehaviorBase.run_async('website')
        // })
        // LocalizeBehaviorBaseLit.run('website')
        this._loadFonts()

        this._browserErrorHandler = this._browserError.bind(this)
        this._browserRejectionHandler = this._browserRejection.bind(this)
    }

    connectedCallback()
    {
        super.connectedCallback()

        let customstoreUrl = this.customstoreByQuery ? this._homeUrl : null
        this.userData.setContext(customstoreUrl)
        this.userData.setOrganization(this.orgUser, this.orgId, this.orgName, this.orgAllowPo, this.orgSubdomain)
        this._onCartCountSet({detail: { shoppingCartCount: this.shoppingcartCount ? this.shoppingcartCount : 0 } }) // this.numItems is ok, but we need one place to set - use event for it
    
        // listen for custom events
        this.addEventListener('api-organization-changed', (e) => this._onOrganizationChanged(e))
        this.addEventListener('api-cart-getready', (e) => this._onCartGetReady(e))
        this.addEventListener('api-cart-reload', (e) => this._onCartReload(e))
        this.addEventListener('api-cart-set', (e) => this._onCartSet(e))
        this.addEventListener('api-cart-group-set', (e) => this._onCartGroupSet(e))
        this.addEventListener('api-cart-count-set', (e) => this._onCartCountSet(e))
        this.addEventListener('api-cart-item-add', (e) => this._onAddCartItem(e))
        this.addEventListener('api-cart-item-added', (e) => this._onAddedCartItem(e))
        this.addEventListener('api-cart-item-set', (e) => this._onSetCartItem(e))
        this.addEventListener('api-cart-clear', (e) => this._onClearCart(e))
        this.addEventListener('api-load-colors', (e) => this._onLoadColors(e))
        this.addEventListener('api-catalog-loading', (e) => this._onCatalogLoading(e))
        this.addEventListener('api-roster-edit', (e) => this._onRosterEdit(e))

        this.addEventListener('api-catalog-loaded', async (e) => { this.gaData?.productImpressions((e as CustomEvent).detail.model) })
        this.addEventListener('api-product-loaded', async (e) => { this.gaData?.productDetails((e as CustomEvent).detail.model) })
        this.addEventListener('api-checkout-loaded', async (e) => { this.gaData?.checkout((e as CustomEvent).detail.model) })
        this.addEventListener('api-checkout-done', async (e) => { this.gaData?.purchase((e as CustomEvent).detail.model) })
        this.addEventListener('api-refund-done', async (e) => { this.gaData?.refund((e as CustomEvent).detail.model) })
        this.addEventListener('api-analytics-customdesignrequest', async (e) => { this.gaData?.customdesignrequestSubmit((e as CustomEvent).detail.model) })
        this.addEventListener('api-analytics-feedback', async (e) => { this.gaData?.feedbackSubmit((e as CustomEvent).detail.model) })

        this.addEventListener('api-report-error', (e) => { this._reportErrorServer((e as CustomEvent).detail) })
        this.addEventListener('api-user-auth-changed', (e) => this._onUserAuth(e))
        this.addEventListener('api-user-notlogged', (e) => this._onUserAuthNot(e))
        this.addEventListener('api-show-dialog', (e) => this._onShowDialog(e))
        this.addEventListener('api-show-toast', (e) => this._onShowToast(e))
        
        this.addEventListener('show-invalid-url-warning', (e) => this._onFallbackSelectionTriggered(e))

        this.addEventListener('ui-user-auth', (e) => this._onUserAuthUI(e))
        this.addEventListener('api-reload-byversion', (e) => { this._reloadWindowLocation() })

        this.addEventListener('change-section', (e) => this._onChangeSection(e))
        this.addEventListener('announce', (e) => this._onAnnounce(e))
        this.addEventListener('dom-change', (e) => this._domChange(e))
        this.addEventListener('app-ver-update', (e) => this._onAppVersionUpdate(e))
        

        this.addEventListener('locale-changed', (e) => 
        { 
            var detail = (e as CustomEvent)?.detail
            if (detail)
            {
                this.set('pageSavings.localeSwitcher', detail.loading) 

                if (detail.reloadPage)
                {
                    this._reloadWindowLocation()
                }
                // console.log('loading-changed: ' + e.detail.locale, e.detail.loading, e.detail.reloadPage)
            }
        })
        


        // listen for online/offline
        afterNextRender(this, () =>
        {
            window.addEventListener('online', (e) => this._notifyNetworkStatus(e), EventPassiveDefault.optionPrepare())
            window.addEventListener('offline', (e) => this._notifyNetworkStatus(e), EventPassiveDefault.optionPrepare())
        })
        window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())

        //events - error handling
        window.addEventListener('error', this._browserErrorHandler, EventPassiveDefault.optionPrepare())
        window.addEventListener('unhandledrejection', this._browserRejectionHandler, EventPassiveDefault.optionPrepare())



        // var hiddenField, visibilityChangeEventname;
        // if (typeof document.hidden !== "undefined")
        // { 
        //     // Opera 12.10 and Firefox 18 and later support 
        //     hiddenField = "hidden";
        //     visibilityChangeEventname = "visibilitychange";
        // } 
        // else if (typeof document.msHidden !== "undefined")
        // {
        //     hiddenField = "msHidden";
        //     visibilityChangeEventname = "msvisibilitychange";
        // } 
        // else if (typeof document.webkitHidden !== "undefined")
        // {
        //     hiddenField = "webkitHidden";
        //     visibilityChangeEventname = "webkitvisibilitychange";
        // }
        // const handleDocVisibilityChange = (e: any) => 
        // {
        //     console.log('tab is hidden ', document[hiddenField], e)
        //     this.style.display = document[hiddenField] ? 'none' : ''
        // }
        // document.addEventListener(visibilityChangeEventname, handleDocVisibilityChange, false)





        // Custom elements polyfill safe way to indicate an element has been upgraded.
        this.removeAttribute('unresolved')


        //START
        var tz = Math.round(10 * (new Date().getTimezoneOffset()) / 60) / 10
        const hasApiPubkey = this.apiPubkey ? 'OK' : '?'
        console.log(`%c ${this.version?.title()} `, 
            'color: white; background-color: #2274A5', 
            ' Env: ' + this.env + 
            ', API: ' + this.apiVersion + 
            `, ${this.apiGateway}: ${hasApiPubkey}` + 
            ', TZ: UTC' + (tz > 0 ? '+' : '') + tz + 
            ', ' + this.localeDefault
        )
        // if (this._dev) { console.log(Teamatical) }

        this.async(() => this._measureDevAndLayout())
        this.async(() => { this.auth0Loaded = true }) //for backward compatibility
        // this.async(() => this._loadFonts())
        // this.async(async () => 
        // {
        //     await import('../bll/user-data')
        // })
        // this.async(async () => 
        // {
        //     await import('../bll/cart-data')
        // })
        // this.async(async () => 
        // {
        //     await import('../bll/category-data')
        // })
        // this.async(async () =>
        // {
        //     await import('@polymer/iron-pages/iron-pages.js')
        //     await import('@polymer/iron-icon/iron-icon.js')
        //     await import('@polymer/paper-icon-button/paper-icon-button.js')
        // })
        // this.async(async () => 
        // {
        //     await import('@polymer/paper-progress/paper-progress.js')
        //     await import('@polymer/paper-spinner/paper-spinner-lite.js')
        // })
        // this.async(async () =>
        // {
        //     await import('@polymer/paper-listbox/paper-listbox')
        //     await import('@polymer/paper-item/paper-item')
        // })
        // this.async(async () =>
        // {
        //     await import('../ui/ripple-container')
        //     await import('../ui/tabs-overlay')
        //     await import('../ui/tab')
        //     await import('../ui/tabs')
        // })
        // this.async(async () => 
        // {
        //     //later load for page switching on ready..
        //     await import('@polymer/app-route/app-location.js')
        //     await import('@polymer/app-route/app-route.js')
        // })
        // this.async(async () => 
        // {
        //     await import('../assets')
        // })
        this.async(async () => 
        {
            await import('../ui/ui-snackbar')
            await import('../ui/ui-network-warning')
        }, 1600)

        //external and long
        this.async(() => this.version?.checkAppVerHandler(), 2000)
        this.async(() => this._checkAppGDPR(), 6000)

        //Home - Teamatical
        this._onChangeSection({ detail: HOMEPAGE_CHANGESECTION_DETAILS })


        //parse colors if any
        if (this.apiColors)
        {
            try
            {
                this.colorsPalette = JSON.parse(this.apiColors) //assign data
            }
            catch (e)
            {
                //
            }
        }
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()

        this.version?.stop()
        window.removeEventListener('error', this._browserErrorHandler)
        window.removeEventListener('unhandledrejection', this._browserRejectionHandler)
    }

    ready()
    {
        super.ready()
    }


    //#region Menus

    static menuCategories(fragment, categories, userInfo: UserInfoModel, userInfoP)
    {
        var { 
            isAuth,
            isBotAuth,
            isMergedNew,
            isAlmighty,
            isAdmin,
            isPrinter,
            isDesigner,
            isDesignerAdmin,
            isCustomerService,
            isPartner,
            id_token,
            access_token,
            expires_at,
            profile,
            orgUser,
            orgAllowPo,
            orgSubdomain,
            orgId,
            orgName,
            customstoreUrl,
        } = userInfo
        const poweredby = fragment._compute_poweredby(orgSubdomain)

        const localizeFunc = fragment.localize.bind(fragment)
        const localizeTabTitle = (title) => 
        {
            if (!title) { return '' }
            if (title.startsWith('tabs-')) 
            {
                var loct = localizeFunc(title)
                if (loct == title)
                {
                    title = StringUtil.toCapitalize(StringUtil.replaceAll(loct, 'tabs-', ''))
                }
                else
                {
                    title = loct
                }
            }
            // console.log(title, '=>', loct)
            return title
        }

        var page = fragment.getAttribute('name')
        //TODO: read CSS...
        var notabs = !(!NOTABSPAGES.find((v, i, arr) => { return page == v }))
        // console.log(page, notabs)

        var before = new Array()
        // if (categories && categories.length > 0 && !orgSubdomain && !customstoreUrl)
        // {
        //     before.push({
        //         id: 'href:team-create',
        //         title: localizeFunc('create-team-tab'),
        //         href: '/team/create',
        //         hideTab: notabs,
        //     })
        // }

        // if (categories && categories.length > 0 && isAuth === true && !customstoreUrl)
        // {
        //     before.push({
        //         id: 'href:store',
        //         title: localizeFunc('my-store-tab'),
        //         href: '/store/ ', //space at the end is required!
        //         hideTab: notabs,
        //     })
        // }

        var cats = new Array()
        if (categories && categories.length > 0 && !customstoreUrl)
        {
            cats.push({
                id: 'title:categories',
                istitle: true,
                title: localizeFunc('list-tab-categories-title'),
                href: '#',
                hideTab: true,
            })

            cats = cats.concat(categories.map((i) =>
            {
                var cati = {
                    title: localizeTabTitle(i?.title),
                    hideTab: notabs,
                }
                if (i.StoreID)
                {
                    cati = Object.assign(cati, {
                        id: `href:store-${i.StoreID}`,
                        href: `/store/${i.StoreID}`,
                    })
                }
                else
                {
                    cati = Object.assign(cati, {
                        id: `cat:${i.name}`,
                        href: `/list/${i.name}`,
                    })
                }
                return cati
            }))
        }

        var accounts = TeamaticalApp.menuAccount(fragment, userInfo, null, true)

        if (cats.length > 0 && accounts.length > 0) 
        {
            //add separator
            accounts.unshift({
                id: 'title:users',
                istitle: true,
                title: '',
                href: '#',
                hideTab: true,
            })
        }
        var r = before.concat(cats, accounts)
        return r
    }

    static menuAccount(fragment, userInfo: UserInfoModel, userInfoP, partof = false)
    {
        var { 
            isAuth,
            isBotAuth,
            isMergedNew,
            isAlmighty,
            isAdmin,
            isPrinter,
            isDesigner,
            isDesignerAdmin,
            isCustomerService,
            isPartner,
            id_token,
            access_token,
            expires_at,
            profile,
            orgUser,
            orgAllowPo,
            orgSubdomain,
            orgId,
            orgName,
            customstoreUrl,
        } = userInfo

        const poweredby = fragment._compute_poweredby(orgSubdomain)
        const localizeFunc = fragment.localize.bind(fragment)
        const isAccountSpace = !partof
        var owner = (orgName ? orgName : '')
        if (!owner) { owner = localizeFunc('account-title-your') }

        var tabs = new Array()

        // tabs.push({
        //     id: 'href:home',
        //     title: localizeFunc('account-tab-home-back'),
        //     href: customstoreUrl ? customstoreUrl : '/',
        // })

        const authAccountSpace = (items, hideTab = false) => 
        {
            items.push({ id: 'title:owner', istitle: true, title: localizeFunc('account-tab-owner', 'owner', owner), href: '#', hideTab: true, }) //sep

            items.push({
                id: 'href:account',
                title: localizeFunc('account-tab-orders'),
                href: '/account',
                hideTab: hideTab,
                showAccount: true,
            })

            if (isAuth !== true) { return } //EXIT !!!

            items.push({
                id: 'href:account-products',
                title: localizeFunc('account-tab-products'),
                href: '/account-products',
                hideTab: hideTab,
            })

            // items.push({
            //     id: 'href:store',
            //     title: localizeFunc('account-tab-store'),
            //     href: '/store',
            //     hideTab: hideTab,
            // })

            items.push({
                id: 'href:account-stores',
                title: localizeFunc('account-tab-stores'),
                href: '/account-stores',
                hideTab: hideTab,
                showAccount: true,
            })

            items.push({
                id: 'href:account-rosters',
                title: localizeFunc('account-tab-rosters'),
                href: '/account-rosters',
                hideTab: hideTab,
            })

            if (orgUser)
            {
                if (orgAllowPo) //!orgSubdomain && orgId
                {
                    items.push({
                        id: 'href:account-purchase-orders',
                        title: localizeFunc('account-tab-purchase-orders'),
                        href: '/account-purchase-orders',
                        hideTab: hideTab,
                    })
                }
    
                items.push({
                    id: 'href:account-organizations',
                    title: localizeFunc('account-tab-organizations'),
                    href: '/account-organizations',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
        }

        const authAdminConsoleLink = (items, hideTab = false) =>
        {
            //"admin" menu item
            if (isAdmin === true)
            {
                items.push({
                    id: 'href:admin',
                    // id: 'action:gotoadmin',
                    title: localizeFunc('account-tab-admin'),
                    external: true,
                    target: '_blank',
                    href: '/admin/orders',
                    rel: 'nofollow noindex',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
            else if (isDesignerAdmin === true)
            {
                items.push({
                    id: 'href:designadmin',
                    title: localizeFunc('account-tab-designadmin'),
                    external: true,
                    target: '_blank',
                    href: '/admin/product-configs',
                    rel: 'nofollow noindex',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
            else if (isPrinter === true)
            {
                items.push({
                    id: 'href:printer',
                    title: localizeFunc('account-tab-printer'),
                    external: true,
                    target: '_blank',
                    href: '/admin/manufacturer-orders',
                    rel: 'nofollow noindex',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
            else if (isCustomerService === true)
            {
                items.push({
                    id: 'href:customerservice',
                    title: localizeFunc('account-tab-customerservice'),
                    external: true,
                    target: '_blank',
                    href: '/admin/orders',
                    rel: 'nofollow noindex',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
            else if (isPartner === true)
            {
                items.push({
                    id: 'href:partner',
                    title: localizeFunc('account-tab-partner'),
                    external: true,
                    target: '_blank',
                    href: '/admin/organization-orders',
                    rel: 'nofollow noindex',
                    hideTab: hideTab,
                    showAccount: true,
                })
            }
        }

        const helpSection = (items, hideTab = false) =>
        {
            //add separator
            // if (items.length >= 3)
            // {
            // }
            items.push({ id: 'sep:back', istitle: true, title: '', href: '#', hideTab: true, })

            if (isAccountSpace)
            {
                tabs.push({
                    id: 'href:home',
                    title: localizeFunc('account-tab-categories'),
                    href: customstoreUrl ? customstoreUrl : '/',
                    hideTab: true,
                })
            }

            //help
            if (!poweredby)
            {
                items.push({
                    id: 'href:help',
                    title: localizeFunc('account-tab-help'),
                    href: '/help',
                    hideTab: true,
                })
            }
        }

        const signSection = (items, hideTab = false) =>
        {
            //sign
            items.push({ 
                id: 'title:sign', 
                istitle: true, 
                title: '', 
                href: '#', 
                hideTab: hideTab, 
            }) //sep
            
            if (isAuth === true)
            {
                items.push({
                    id: 'action:user-signout',
                    title: localizeFunc('account-tab-signout'),
                    href: '#',
                    hideTab: hideTab,
                })
            }
            else
            {
                items.push({
                    id: 'action:user-signin',
                    title: localizeFunc('account-tab-signin'),
                    href: '#',
                    hideTab: hideTab,
                })
            }
        }


        if (isAccountSpace)
        {
            authAccountSpace(tabs)
            authAdminConsoleLink(tabs)
            helpSection(tabs)
            signSection(tabs, true)
        }
        else //MOBILE DRAWER for CATEGORIES
        {
            var users = new Array()
            authAccountSpace(users, true)
            authAdminConsoleLink(users, true)
            signSection(users, true)
            tabs = tabs.concat(users)
        }

        return tabs
    }

    static menuHelp(fragment, userInfo: UserInfoModel, userInfoP)
    {
        var { 
            isAuth,
            isBotAuth,
            isMergedNew,
            isAlmighty,
            isAdmin,
            isPrinter,
            isDesigner,
            isDesignerAdmin,
            isCustomerService,
            isPartner,
            id_token,
            access_token,
            expires_at,
            profile,
            orgUser,
            orgAllowPo,
            orgSubdomain,
            orgId,
            orgName,
            customstoreUrl,
        } = userInfo

        var localizeFunc = fragment.localize.bind(fragment)
        var page = fragment.getAttribute('name')

        // console.log(page)
        var tabs = new Array()
        // tabs.push({
        //     id: 'href:home',
        //     title: localizeFunc('help-tab-home-back'),
        //     href: customstoreUrl ? customstoreUrl : '/',
        //     hideTab: true,
        // })

        tabs.push({
            id: 'href:help',
            title: localizeFunc('help-tab-help'),
            href: '/help/home',
            hideTab: true,
        })

        tabs.push({
            id: 'href:designmodule',
            title: localizeFunc('help-tab-designmodule'),
            href: '/help/design-module/',
            hideTab: true,
        })
        tabs.push({
            id: 'href:salesmodule',
            title: localizeFunc('help-tab-salesmodule'),
            href: '/help/sales-module/',
            hideTab: true,
        })
        tabs.push({
            id: 'href:brandmodule',
            title: localizeFunc('help-tab-brandmodule'),
            href: '/help/brand-module/',
            hideTab: true,
        })
        tabs.push({
            id: 'href:manufacturingmodule',
            title: localizeFunc('help-tab-manufacturingmodule'),
            href: '/help/manufacturing-module/',
            hideTab: true,
        })


        // tabs.push({
        //     id: 'href:placingorder',
        //     title: localizeFunc('help-tab-placingorder'),
        //     href: '/placingorder',
        // })

        // tabs.push({
        //     id: 'href:deliveryoptions',
        //     title: localizeFunc('help-tab-deliveryoptions'),
        //     href: '/deliveryoptions',
        // })

        // tabs.push({
        //     id: 'href:trackingpackage',
        //     title: localizeFunc('help-tab-trackingpackage'),
        //     href: '/trackingpackage',
        // })

        // tabs.push({
        //     id: 'href:designplugin',
        //     title: localizeFunc('help-tab-designplugin'),
        //     href: '/designplugin',
        // })

        tabs.push({
            id: 'title:termsofuse',
            istitle: true,
            title: '',
            href: '#',
            hideTab: true,
        })

        tabs.push({
            id: 'href:termsofuse',
            title: localizeFunc('help-tab-termsofuse'),
            href: '/termsofuse',
            hideTab: true,
        })

        tabs.push({
            id: 'href:privacypolicy',
            title: localizeFunc('help-tab-privacypolicy'),
            href: '/privacypolicy',
            hideTab: true,
        })

        tabs.push({
            id: 'href:feedback',
            title: localizeFunc('help-tab-feedback'),
            href: '/feedback',
            hideTab: true,
        })


        tabs.push({ id: 'title:users', istitle: true, title: '', href: '#', hideTab: true, }) //sep

        tabs.push({
            id: 'href:home',
            title: localizeFunc('help-tab-categories'),
            href: customstoreUrl ? customstoreUrl : '/',
            hideTab: true,
        })

        tabs.push({
            id: 'href:account',
            title: localizeFunc('account-tab-account'),
            href: '/account',
            hideTab: true,
        })

        tabs.push({ id: 'title:sign', istitle: true, title: '', href: '#', hideTab: true, }) //sep

        //User
        if (isAuth === true)
        {
            tabs.push({
                id: 'action:user-signout',
                title: localizeFunc('account-tab-signout'),
                href: '#',
                hideTab: true,
            })
        }
        else
        {
            tabs.push({
                id: 'action:user-signin',
                title: localizeFunc('account-tab-signin'),
                href: '#',
                hideTab: true,
            })
        }

        return tabs
    }

    //#endregion Menus


    _versionStrAssign(verstr, appTitleDefault)
    {
        //appTitle app-title - doesn't use localize due it is async-ly loading
        this.version = new AppVersion(this, appTitleDefault, verstr, this.env, this.apiGroup, this.websiteUrl)
    }

    _reportErrorServer(lpar)
    {
        //if (this.env != 'Development') { return }

        // Suppress - Application Insights is collecting errors
        // var logimg = document.createElement('img')
        // var qs = Object.keys(lpar).map(function (i) { return encodeURIComponent(i) + '=' + encodeURIComponent(lpar[i]) }).join('&')
        // logimg.src = this.websiteUrl + '/api/v1.0/health/log?' + qs
    }

    _browserError(e)
    {
        if (!e || e.type != 'error') { return }

        var lpar = {
            msg: e.message,
            url: e.filename,
            line: e.lineno,
            col: e.colno,
            stacktrace: (e.error ? e.error.stack : null),
        }
        this._reportErrorServer(lpar)

        if (Teamatical._browser.allowLazyload
            && !(Teamatical._browser.edge && Teamatical._browser.iPhone && !e.filename) // fix for strange "Script Error" happening in Edge on iPhone that has no stack info or file name in the error object
            && (e.error && e.error.message !== "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.") //name: "NotFoundError", code: 8 ==> auth0-spa-js
        )
        {
            this.errorUnhandled = true //show error for a diagnosis
        }

        var suppressErrorAlert = true
        // If you return true, then error alerts (like in older versions of
        // Internet Explorer) will be suppressed.
        return suppressErrorAlert
    }

    _browserRejection(e)
    {
        // console.log(e)
        if (!e || e.type != 'unhandledrejection') { return }
        
        var lpar = {
            url: window.location.href,
            msg: e.reason ? e.reason.message : '',
            stacktrace: e.reason ? e.reason.stack : null,
        }
        if (e instanceof PromiseRejectionEvent) { lpar.msg = e.reason.error_description }

        this._reportErrorServer(lpar)

        console.warn(e.reason)
        if (Teamatical._browser.allowLazyload
            && e.reason.error !== 'timeout'
            && e.reason.message !== "3000ms timeout exceeded"
            && e.reason.message !== 'A bad HTTP response code (304) was received when fetching the script.'
            && e.reason.message !== 'Unknown or invalid refresh token.') 
        {
            this.errorUnhandled = true //show error for a diagnosis
        }
    }

    async _onScroll(e?)
    {
        if (this.page == 'list')
        {
            this._listScrollTop = window.pageYOffset
        }

        if (this._getScrollTop() > 0 || !e)
        {
            await this._loadLocaleSwitcher()

            if (!this.buttonScrollup)
            {
                this.buttonScrollup = true
                await import('../ui/ui-button-scrollup')
            }            
        }
    }

    _routePageChanged(page, orgSubdomain)
    {
        if (this.route?.prefix != "") { return }

        let defaultPage = 'home'
        if (orgSubdomain)
        {
            defaultPage = HOMEPAGE_COBRANDS[orgSubdomain] ? `home-${orgSubdomain}` : `home-default`
        }
        if (page == 'home' && orgSubdomain) { page = defaultPage }

        page =  page || defaultPage   //assign default page
        if (this.page != page) { this.page = page }

        // console.log('this.page = ' + this.page, page)
        this.drawerOpened = false    // Close the drawer - in case the *route* change came from a link in the drawer.
    }

    _routeChanged(route, old)
    {
        // console.log(route.path)
        // if (route) 
        // {
        //     if (route.path == '/admin' || route.path.indexOf('/admin/') == 0)
        //     {
        //         this._reloadWindowLocation() //force to change application
        //     }
        // }


        //Stripe ....
        // if ((old === undefined || old.path != '/checkout') && route.path == '/checkout')
        // {
        //     // console.log('route: checkout')
        //     if (!window.ShadyDOM || !window.ShadyDOM.inUse)
        //     {
        //         // console.log('checkout enter - reload is required')
        //         this._reloadWindowLocation()
        //     }
        // }
        // else if ((old && old.path == '/checkout') && route.path != '/checkout')
        // {
        //     // console.log('route: ... other')
        //     this._reloadWindowLocation()
        // }
    }

    async _pageChanged(page, oldPage?)
    {
        if (page == null) { return }

        if (this.version?.isNew())
        {
            this._reloadDebouncer = Debouncer.debounce(this._reloadDebouncer, timeOut.after(350), () =>
            {
                this._onAppVersionUpdate({ detail: { 
                    old: this.version?.verstr, 
                    new: this.version?.verstrNew, 
                    reload: true, 
                    page: page 
                } })
            })
        }

        var handled = false
        if (page == 'i') { handled = await this.specialLinksHandler(this.routeData, this.subroute, this.queryParams) }
        if (!handled) { this._pageLoad(page, oldPage) }
    }

    _pageLoadingChanged(v, o)
    {
        if (!o && v === true)
        {
            this._pageLoadingDelayedDebouncer = Debouncer.debounce(this._pageLoadingDelayedDebouncer, timeOut.after(170), () =>
            {
                this.pageLoadingDelayed = v
            })
        }
        else
        {
            this.pageLoadingDelayed = v
            if (this._pageLoadingDelayedDebouncer) { this._pageLoadingDelayedDebouncer.cancel() }
        }
    }

    _pageLoad(page, oldPage?)
    {
        // When a load failed, it triggered a 404 which means we need to eagerly load the 404 page definition
        let pageloadedHandler = this._pageLoaded.bind(this, Boolean(oldPage))
        
        // webpackMode: "lazy" 
        // if (this._dev) { console.log('Dynamicaly - ' + page + ' is loading...') }
        this.pageLoading = true

        import(`../fragments/${page}`)
            .then(pageloadedHandler)
            .catch(pageloadedHandler)
    }

    _pageLoaded(shouldResetLayout, e)
    {
        this.pageLoading = false

        const page = this.page
        
        if (e instanceof Error) 
        { 
            this.page = page404 
            console.warn('Dynamicaly - ' + page + ' failed to load')
            return ///EXIT
        }

        // console.log('Dynamicaly - ' + page + ' has been loaded')

        this._ensureLazyLoaded()
        if (shouldResetLayout)
        {
            // The size of the header depends on the page (e.g. on some pages the tabs
            // do not appear), so reset the header's layout only when switching pages.
            timeOut.run(() =>
            {
                this.uiheader.resetLayout()
            }, 1)
        }
    }

    _ensureLazyLoaded()
    {
        if (!this.loadComplete)
        {
            afterNextRender(this, () =>
            {
                this._notifyNetworkStatus()
                this.loadComplete = true
            })
        }
    }

    async _notifyNetworkStatus(e?)
    {
        let oldOffline = this.offline
        this.offline = !navigator.onLine
        // Show the snackbar if the user is offline when starting a new session
        // or if the network status changed.
        if (this.offline || (!this.offline && oldOffline === true))
        {
            if (!this._networkSnackbar)
            {
                this._networkSnackbar = await this._newUISnackbar()
                this.shadowRoot?.appendChild(this._networkSnackbar)
            }

            this._networkSnackbar.close()
            this.async(() =>
            {
                this._networkSnackbar.strong = this.offline
                this._networkSnackbar.timeout = this.offline ? undefined : 2 * 1000
                this._networkSnackbar.innerHTML = this.offline ? this.localize('app-toast-offline') : this.localize('app-toast-online')
                this._networkSnackbar.open()
            }, 300)
        }
    }

    _changeSectionLastState: string

    // Elements in the app can notify section changes.
    // Response by a11y announcing the section and syncronizing the category.
    async _onChangeSection(event)
    {
        // console.log(event)
        let detail = event.detail
        let menu = detail.category

        // Scroll to the top of the page when navigating to a non-list page. For list view,
        // scroll to the last saved position only if the category has not changed.
        let scrollTop = 0
        if (this.page === 'list' || this.page === 'store')
        {
            if (this.tabSelected === menu)
            {
                scrollTop = this._listScrollTop ? this._listScrollTop : scrollTop
            }
            else
            {
                // Reset the list view scrollTop if the category changed.
                this._listScrollTop = 0
            }
        }

        //should be after listScrollTop region
        if (menu)
        {
            if (this.pageMenuSelected == menu) { this.set('pageMenuSelected', '') } //clear for selection event if the same was assigned
            this.set('pageMenuSelected', menu)
        }
        else
        {
            this.set('pageMenuSelected', '')
        }
        // console.log(this.pageMenuSelected)


        // Use `Polymer.AppLayout.scroll` with `behavior: 'silent'` to disable header scroll effects during the scroll.
        if (this._changeSectionLastState != JSON.stringify(event.detail) && event?.detail != HOMEPAGE_CHANGESECTION_DETAILS)
        {
            this._scrollDebouncer = Debouncer.debounce(this._scrollDebouncer, timeOut.after(17), () =>
            {
                this._changeSectionLastState = JSON.stringify(event.detail)
                scroll({ top: scrollTop, behavior: 'silent' })
            })
        }

        // Announce the page's title
        if (detail && detail.title)
        {
            var url = document.location.href
            var site_name = this.Title
            var description = StringUtil.stripHtml(detail.description) || this.appDescDefault //localize('app-desc')
            var keywords = detail.keywords || this.appKeywordsDefault //this.localize('app-keywords')
            var type = detail.type || 'website'
            var title = detail.title + (this.version ? ' - ' + this.version.appTitle() : '')
            var image = detail.image || (this.websiteUrl + this.appImageurlDefault) //this.localize('app-opengraph-imageurl-default'))
            
            if (this.ogData)
            {
                await import('../bll/open-graph')
                var ogs = {
                    'type': type,
                    'locale': this.language,
                    'site_name': site_name,
                    'url': url,
                    'title': title,
                    'description': description,
                }
                // if (image) { ogs['image'] = image }
                ogs['image'] = image //set image anyways event if it's empty (mondatory properties: og:title og:type og:image og:url)
                this.ogData.ogSetAll(ogs)

                this.ogData.metaSet('product:price:currency', detail.currency, true)
                this.ogData.metaSet('product:price:amount', detail.price, true)
                this.ogData.metaSet('robots', detail.disabled ? 'noindex, nofollow' : '', true)

                this.ogData.setCanonical(document.location.origin + document.location.pathname)
            }

            if (this.gaData)
            {
                this.gaData.pageView({
                    'type': type,
                    'locale': this.language,
                    'site_name': site_name,
                    'url': url,
                    'title': title,
                    'description': description,
                })
            }
            
            //document
            document.title = title
            var meta_desc = document.head.querySelector("meta[name='description']") as HTMLMetaElement
            meta_desc.content = description

            var meta_keywords = document.head.querySelector("meta[name='keywords']") as HTMLMetaElement
            meta_keywords.content = keywords

            this._announce(title + ', loaded')
        }

        //App version update
        if (this.version?.isNew())
        {
            this._reloadDebouncer = Debouncer.debounce(this._reloadDebouncer, timeOut.after(350), () =>
            {
                this._onAppVersionUpdate({ detail: { 
                    old: this.version?.verstr, 
                    new: this.version?.verstrNew, 
                    reload: true, 
                    category: detail.category 
                } })
            })
        }
    }

    async _onShowDialog(event)
    {
        if (!this._modalDialog)
        {
            var m = await import('../ui/ui-modal-dialog')
            this._modalDialog = new m.UIModalDialog()
            this._modalDialog.id = 'modal-dialog'
            this.shadowRoot?.appendChild(this._modalDialog)
        }

        // console.log('show _onShowDialog -> ', event.detail['message'] || '')
        var { 
            message, 
            announce, 
            inputs, 
            buttons, 
            required, 
            nowrap, 
            widthauto,
            qrcode,
            errorid,
            devErrorDetails,
        } = event.detail as DialogPopupModel
        // if (Array.isArray(inputs)) { inputs = Object.assign([], inputs) }

        if (buttons)
        {
            var btns = buttons.reduce((acc, i) => { return acc + ` [${i.title}]` }, '')
            console.log(`api-dialog: ${btns} - ${message}`)
        }

        this._modalDialog.message = message || ''
        this._modalDialog.buttons = buttons || []
        this._modalDialog.inputs = inputs || []
        this._modalDialog.required = required
        this._modalDialog.nowarp = nowrap
        this._modalDialog.widthauto = widthauto
        this._modalDialog.qrcode = qrcode || errorid
        this._modalDialog.errorid = errorid
        this._modalDialog.devErrorDetails = devErrorDetails
        this._modalDialog.open()
        this._announce(announce || '')
    }

    async _onCartGetReady(e)
    {
        await import('../ui/ui-cart-modal')
    }

    async _getCartModalDialog()
    {
        if (!this._cartModal)
        {
            var m = await import('../ui/ui-cart-modal')
            this._cartModal = new m.UICartModal()
            this._cartModal.id = 'cart-modal-dialog'
            this._cartModal.addEventListener('opened-changed', (e) => this._onAddedCartModalChanged(e))
            this.shadowRoot?.appendChild(this._cartModal)
        }
        return this._cartModal
    }

    async _onAddCartItem(event)
    {
        var cartModal = await this._getCartModalDialog()
        let entry = event.detail.entry
        await import('../bll/cart-data')
        this.cartData.addItem(entry) //fire

        this._cartModalDebouncer = Debouncer.debounce(this._cartModalDebouncer, timeOut.after(17), () =>
        {
            // console.log(entry.item, entry.quantity) //TODO message ...
            cartModal.message = this.localize('cart-modal-title')
            cartModal.adding(entry)
        })
    }

    _onAddedCartItem(event)
    {
        this._cartModalDebouncer = Debouncer.debounce(this._cartModalDebouncer, timeOut.after(17), 
        async () =>
        {
            await import('../bll/cart-data')
            var showCartModal = () =>
            {
                var d = event.detail
                if (d.failed)
                {
                    this._cartModal.type = d.summary ? d.summary.Key : ''
                    this._cartModal.message = d.summary ? d.summary.Message : this.localize('cart-modal-failed-title')
                }
                else
                {
                    this._cartModal.message = this.localize('cart-modal-done-title')
                    this._announce(this.localize('cart-modal-done-title'))
                    // this.cartData.reloadCart() //'ADD' method has all info, we don't need to call 'GET'
                }

                if (d.failed)
                {
                    this._cartModal.failed(d.summary, d.details)
                }
                else if (this.page != 'cart')
                {
                    this._cartModal.added()
                }
            }

            if (this._cartModal)
            {
                // this._cartModal.close()
                this.async(() => showCartModal(), 300)
            }
            else
            {
                await this._getCartModalDialog()
                showCartModal()
            }
        })
    }

    _onAddedCartModalChanged(e)
    {
        if (this.pages && e.detail.value === false && (e.target.type == 'customizationlocked' || e.target.type == 'customizationviolated'))
        {
            //reset type to avoid old errors
            e.target.type = ''
            try { this.currentPage?._tryReconnect() } catch { console.warn('not exists _tryReconnect()') }
        }
    }

    get currentPage(): any
    {
        return this.pages?.selectedItem
    }


    async _onSetCartItem(event)
    {
        let entry = event.detail.entry
        await import('../bll/cart-data')
        this.cartData.setItem(entry)
        if (entry.quantity === 0)
        {
            this._announce('Item deleted')
            this.gaData?.cartProductRemoveFrom(entry)
        }
        else
        {
            this._announce('Quantity changed to ' + entry.quantity)
        }
    }

    _onRosterEdit(e)
    {
        if (!e.detail.item || !e.detail.item.Roster || !e.detail.item.Roster.id) { return }
        var roster = e.detail.item.Roster
        var pconf = e.detail.item
        var qobj = {
            backurl: window.location.href,
            pid: pconf.ProductConfigurationID,
        }
        if (URL)
        {
            let url = new URL(qobj.backurl)
            url.searchParams.set('rid', roster.id)
            qobj.backurl = url.toString()
        }
        this._gotoAccountRoster(roster?.id, qobj)
    }

    _onOrganizationChanged(e)
    {
        this.userData.setOrganization(e.detail.IsOrganizationUser, e.detail.OrganizationID, e.detail.OrganizationName, e.detail.IsOrganizationPO)
    }

    async _onCartReload(e)
    {
        await import('../bll/cart-data')
        this.cartData.reloadCart(e.detail.reset)
    }

    async _onCartSet(e)
    {
        await import('../bll/cart-data')
        this.cartData.setCart(e.detail.cart)
    }

    async _onCartGroupSet(e)
    {
        await import('../bll/cart-data')
        this.cartData.setCartGroup(e.detail.cart)
    }

    async _onCartCountSet(e)
    {
        await import('../bll/cart-data')
        this.cartData.setCartCount(e.detail.shoppingCartCount)
    }

    async _onClearCart(e)
    {
        var gid = e && e.detail && e.detail.gid ? e.detail.gid : ''
        await import('../bll/cart-data')
        this.cartData.clearCart(gid)
        this._announce('Cart cleared')
    }

    async _onLoadColors(e)
    {
        const m = await import('../bll/colors-data')
        if (!this.colorsData) { return }
        this.colorsData.loadColorsPaletteAsync()
        // if (this.page === 'customize' || this.page === 'team' || this.page === 'detail')
        // {
        // }
    }

    _compute_loadingDrawerOrTabs(list, catalogLoading, type = '')
    {
        var hasItems = this.LenMore(list)
        // console.log(type, hasItems, catalogLoading, list) 
        return hasItems ? false : catalogLoading
    }

    _compute_loadingDrawer(drawerList, catalogLoading)
    {
        return this._compute_loadingDrawerOrTabs(drawerList, catalogLoading, 'drawer')
    }
    
    _compute_loadingTabs(tabList, catalogLoading)
    {
        return this._compute_loadingDrawerOrTabs(tabList, catalogLoading, 'tabs')
    }

    _onCatalogLoading(e)
    {
        var detail = (e as CustomEvent).detail
        if (detail.loading && detail.catalogCache && Object.keys(detail.catalogCache).length > 0) { return }
        
        this.set('catalogLoading', detail.loading)
    }

    async _onShowToast(e)
    {
        if (!this._toast)
        {
            this._toast = await this._newUISnackbar()
            this.shadowRoot?.appendChild(this._toast)
        }
        this._toast.timeout = e?.detail?.timeout > 0 ? e.detail.timeout : 3 * 1000
        this._toast.strong = e?.detail?.strong ? e.detail.strong : false
        this._toast.innerHTML = e?.detail?.message ? e.detail.message : 'msg ...'
        this._toast.open()
    }

    // Elements in the app can notify a change to be a11y announced.
    _onAnnounce(e)
    {
        this._announce(e.detail)
    }

    // A11y announce the given message.
    _announce(message)
    {
        this._a11yLabel = ''
        this._announceDebouncer = Debouncer.debounce(this._announceDebouncer, timeOut.after(100), () =>
        {
            this._a11yLabel = message
        })
    }

    // This is for performance logging only.
    _domChange(e)
    {
        if (window.performance && performance.mark && !this.__loggedDomChange)
        {
            let target = e.composedPath()[0]
            let host = target.getRootNode().host
            if (host && host.localName.match(this.page))
            {
                this.__loggedDomChange = true
                performance.mark(host.localName + '.domChange')
            }
        }
    }

    _onFallbackSelectionTriggered(e?)
    {
        this.page = page404
    }

    _versionReloadDebouncer: Debouncer
    _onAppVersionUpdate(e)
    {
        if (this.offline) { return }

        var vdif = -1
        try
        {
            var vnew = AppVersion.parseVersionStr(e.detail.new)
            var vold = AppVersion.parseVersionStr(e.detail.old)
            vdif = 1000*(parseInt(vnew[0]) - parseInt(vold[0]))
                + 100*(parseInt(vnew[1]) - parseInt(vold[1]))
                + 10*(parseInt(vnew[2]) - parseInt(vold[2]))
                + (parseInt(vnew[3]) - parseInt(vold[3]))
        }
        catch
        {
            vdif = 0
        }
        // console.log(e.detail.old, vold, '=>', e.detail.new, vnew)
        if (vdif <= 0) { return } //EXIT

        if (!e.detail?.reload && (this.userInfo?.isAdmin || vdif > 10))
        {
            this._versionReloadDebouncer = Debouncer.debounce(this._versionReloadDebouncer, timeOut.after(6000), async () => { //delay - to give a time to service-worker update 
                var msg = this.localize('app-toast-newversion', 'ver', e.detail.new, 'oldver', e.detail.old)
                console.warn(msg, 'build diff:', vdif)
                if (!this._snackbarAppVersion)
                {
                    this._snackbarAppVersion = await this._newUISnackbar()
                    this._snackbarAppVersion.timeout = 30 * 1000
                    this.shadowRoot?.appendChild(this._snackbarAppVersion)
                }
                this._snackbarAppVersion.innerHTML = `<span class="link" onclick="javascript:dispatchEvent(new CustomEvent('api-reload-byversion', { bubbles: true, composed: true, detail: {} }))">${msg}</span>`
                this._snackbarAppVersion.open()
            })
        }
        else if (e.detail?.reload && (e.detail?.page || e.detail?.category))
        {
            if (this._dev) 
            {
                console.warn('app version was updated - but reload was suppressed due development env')
            }
            else 
            {
                this._reloadWindowLocation()
            }
        }
    }

    async _onAppGDPR(e?)
    {
        if (this.offline) { return }

        if (!this._snackbarCookie)
        {
            this._snackbarCookie = await this._newUISnackbar()
            this._snackbarCookie.timeout = 30 * 1000
            this._snackbarCookie.strong = true
            this._snackbarCookie.addEventListener('api-ui-snackbar-closed', (e) => 
            {
                if (this.localStorage) { this.set('localStorage.GDPR', true) }
                // CookieUtils.setCookie('.Teamatical.GDPR', true, { expires: 30 * 365 * 24 * 60 * 60, path: '/', Secure: true, SameSite: 'Lax' })
            })
            this.shadowRoot?.appendChild(this._snackbarCookie)
        }
        this._snackbarCookie.innerHTML = 
            `<span>
                ${this.localize('app-toast-gdpr-message', 'apptitle', this.appTitleDefault)}
            </span>
            <span class="link" onclick="window.location='/privacypolicy'">
                ${this.localize('app-toast-gdpr-message-end')}
            </span> 
            </span>
            <br /><br /> 
            <span class="link btn">
                ${this.localize('app-toast-gdpr-btn')}
            </span>
            `
        this._snackbarCookie.open()
    }

    async _checkAppGDPR()
    {
        var gdpr = this.localStorage.GDPR
        if (gdpr == undefined)
        {
            await this._onAppGDPR()
        }
    }

    async _newUISnackbar()
    {
        const m = await import('../ui/ui-snackbar')
        return new m.UISnackbar()
    }

    _allowTab(id, id2)
    {
        return id === id2
    }

    _toArray(obj) 
    {
        var v = Object.keys(obj).map((key) =>
        {
            return {
                id: key,
                value: obj[key]
            }
        })
        return v
    }

    _formatNumItems(numItems)
    {
        if (numItems > 0)
        {
            if (navigator?.setAppBadge) { navigator.setAppBadge(numItems) }
        }
        else
        {
            if (navigator?.clearAppBadge) { navigator.clearAppBadge() }
        }
        return numItems > 99 ? "99+" : numItems
    }

    _menuHash(submenu)
    {
        return window.btoa(StringUtil.hashCode(JSON.stringify(submenu)).toString())
    }

    _updateCategories(categoriesList)
    {
        this.categoryData._setCategories(categoriesList)
    }

    _updateCategoriesList(categoriesRoot)
    {
        this.set('categoriesList', categoriesRoot)
    }

    _computeTabs(pagemenus, page, pageLoading)
    {
        if (pageLoading !== false) { return }

        var pagePath = StringUtil.toCamelClass(page)
        var submenu = this.pageMenus[pagePath]
        if (Array.isArray(submenu))
        {
            submenu = submenu.filter((i) => { return !i.hideTab })
        }
        else
        {
            submenu = null
        }

        if (submenu != null && JSON.stringify(this.tabList) != JSON.stringify(submenu) )
        {
            const id = this._menuHash(submenu)
            const prties = { tabListID: id }
            prties['tabListCache.' + id] = submenu
            this.setProperties(prties)
        }
        else 
        {
            this.tabListID = ''
        }
    }

    _loadLocaleSwitcherAndScrollUpObserver(page, pageLoadingDelayed)
    {
        if (!page || pageLoadingDelayed) { return }

        this.async(async () => 
        { 
            if (this._elementInViewportPartly(this.appFooter)) 
            {
                await this._onScroll() 
            }
        })
    }

    _loadFonts()
    {
        var link = document.createElement("link")
        link.rel = 'stylesheet'
        link.type = 'text/css'
        link.href = 'https://fonts.googleapis.com/css?family=Roboto+Mono:400,700|Roboto:400,300,300italic,400italic,500,500italic,700,700italic' + '&display=swap'
        link.setAttribute("async", "true")
        link.setAttribute("crossorigin", "anonymous")
        document.head.appendChild(link)
        this.fontsLoaded = true
        return


        // if (sessionStorage.fonts)
        // {
        //     // console.log("Fonts installed.")
        //     this.fontsLoaded = true
        // }
        // // else
        // // {
        // //     console.log("No fonts installed.")
        // // }

        // // const WebFont = await import('webfontloader')
        // WebFont.load({
        //     google: {
        //         //display: 'swap', //??
        //         families: [
        //             'Roboto+Mono:400,700', 
        //             'Roboto:400,300,300italic,400italic,500,500italic,700,700italic' + '&display=swap', //temp solution for better loading performance
        //         ]
        //     },
        //     timeout: 2000,
        //     active: () =>
        //     {
        //         sessionStorage.fonts = true
        //         this.fontsLoaded = true
        //     }
        //     // loading: function () { },
        //     // active: function () { },
        //     // inactive: function () { },
        //     // fontloading: function (familyName, fvd) { },
        //     // fontactive: function (familyName, fvd) { },
        //     // fontinactive: function (familyName, fvd) { }
        // })
    }

    _loadPaymentElementsDebouncer:Debouncer
    _loadPaymentElementsObserver(page)
    {
        var t = page == 'checkout' ? 100 : 6000
        var loadPaymentElements = () => this._loadStripeElements() //Stripe
        // if (this.apiGateway == 'PayPal') { loadPaymentElements = () => this._loadPayPalElements() } // moved to => checkout-data
        this._loadPaymentElementsDebouncer = Debouncer.debounce(this._loadPaymentElementsDebouncer, timeOut.after(t), loadPaymentElements)
    }

    async _loadStripeElements()
    {
        if (this.paymentLoaded || this.apiGateway != 'Stripe') { return }

        let stripe
        try 
        {
            stripe = await loadStripe(this.apiPubkey)
            this.paymentLoaded = true
            if (stripe) { this.paymentLoaded = true }
        } 
        catch (error) 
        {
            console.error("failed to load the Stripe JS SDK script", error)
        }
    }

    async _loadLocaleSwitcherByQueryParams(lang)
    {
        if (lang) { await this._loadLocaleSwitcher() }
    }

    async _loadLocaleSwitcher()
    {
        if (!this.uiLocaleSwitcher)
        {
            this.uiLocaleSwitcher = true

            //Initialize LitElements before loading elements
            var m = await import('../bll/localize-behavior-lit')
            const LocalizeBehaviorBaseLit = m.LocalizeBehaviorBase
            await LocalizeBehaviorBaseLit.run_async('website') //- becouse of lit-element
            var nb_lit_m = await import('../bll/net-base-lit')
            const NetBaseLit = nb_lit_m.NetBase as any
            const netBaseLit = new NetBaseLit()
            const netBase = new NetBase() as NetBase
            var ud = netBase.__static_get_userdata()
            // if (this._dev) console.log(ud?.userInfo)
            netBaseLit.__static_set_userdata(ud)

            //TODO observer for control - becouse of lit-element
            await import('../ui/ui-locale-switcher') 
        }
    }

    _computeTabList(tabListCache, tabListCacheP)
    {
        var v = this._toArray(tabListCache)
        return v
    }

    _computeDrawers(pagemenus, page)
    {
        if (!pagemenus || !page) { return [] }

        var pagePath = StringUtil.toCamelClass(page)
        var submenu = this.pageMenus[pagePath]
        
        if (Array.isArray(submenu))
        {
            submenu = submenu.filter((i) => { return !i.hideDrawer })
        }
        else
        {
            submenu = []
        }
        return submenu
    }

    _computePageTab(pageMenus, pageMenuSelected)
    {
        return pageMenuSelected
    }

    _computeShouldShowTabs(tabListID, tabListCache, tabListCacheP, isAuth, smallScreen)
    {
        const tabs = tabListCache ? tabListCache[tabListID] : []
        let v = (Array.isArray(tabs) && tabs.length > 0)
        // var v = (page === 'home' || page === 'list' || page === 'detail' || page === 'team') && !smallScreen
        // console.log(page + '.s:' + smallScreen + ' -> ' + v)
        v = v && !smallScreen
        // console.log('_computeShouldShowTabs', tabListID, tabs, smallScreen, '=>', v)
        return v
    }

    _computeShouldRenderTabs(shouldShowTabs, loadComplete)
    {
        return shouldShowTabs //&& loadComplete
    }

    _computeShouldRenderDrawer(smallScreen)
    {
        if (!smallScreen) { return false }
        let v = smallScreen
        return v
    }

    _computeShoppingCartAreaLabel(quantity)
    {
        // console.log(quantity)
        return this.localize('menu-shoppingcart-aria-label') + quantity + ' ' + (quantity === 1 ? this.localize('list-qty-item') : this.localize('list-qty-items'))
    }

    _compute_allowDrawerSwipe(deviceInfo)
    {
        return !Teamatical._browser.iPhone
    }

    _computeImagesPath(env, version)
    {
        var base = ''  // version ? version.buildPath() : ''
        return base + '/images'
    }

    _compute_homeUrl(env, customstoreByQuery, orgSubdomain)
    {
        if (StringUtil.startsWith(orgSubdomain, DECATHLON_FR)) { return '' }
        return this._asBool(customstoreByQuery) ? `/store/${customstoreByQuery}` : '/'
    }

    _compute_cartUrl(env, customstoreByQuery)
    {
        // return this._asBool(customstoreByQuery) ? StringUtil.urlquery('/cart', { store: customstoreByQuery }) : '/cart'
        return this._hrefCart()
    }

    _compute_isAuth(env, isAuth)
    {
        return this._asBool(isAuth)
    }

    _compute_cobrand(orgSubdomain, customLogo)
    {
        if (orgSubdomain) { return orgSubdomain }
        if (customLogo) { return 'custom-logo' }
    }

    _buildPageUpdatingStatus(pageUpdating)
    {
        var st = ''
        var pu = false
        var lst = pageUpdating
        if (lst)
        {
            for (var i in lst)
            {
                st += ', ' + lst[i]
                if (lst[i] === true)
                {
                    pu = true
                    break
                }
            }
        }
        return pu
    }

    _compute_userDataProgress(pageLoading)
    {
        return this._buildPageUpdatingStatus(this.pageUpdating)
    }

    _computeHideProgress(pageLoading, pageUpdatingP)
    {
        var pu = this._buildPageUpdatingStatus(this.pageUpdating)
        var v = !(pageLoading === true || pu === true)
        // console.log('loading', pageLoading, pageUpdatingP, st, v)
        return v
    }

    _compute_userWaiting(pageLoading, pageUpdatingP, pageSavingsP)
    {
        var pageProgress = !this._computeHideProgress(pageLoading, pageUpdatingP) 
            || this._compute_SavingProgress(pageSavingsP)
        return pageProgress
    }

    _compute_nocatalogMode(customstoreByQuery)
    {
        return this._asBool(customstoreByQuery)
    }

    _compute_SavingProgress(pageSavingsP)
    {
        var st = ''
        var pu = false
        var lst = this.pageSavings
        if (lst)
        {
            for (var i in lst)
            {
                st += ', ' + lst[i]
                if (lst[i] === true)
                {
                    pu = true
                    break
                }
            }
        }
        else
        {
            pu = lst
        }
        let v = (pu === true)
        // console.log('saving', pageSavingsP, v, st)

        // savingProgress
        document.body.classList.toggle('saving-progress', v)

        return v
    }

    _computeSearchUrl(userInfo, isAuth)
    {
        return '/store-list'
    }

    _toggleDrawerTap(e)
    {
        this.drawerOpened = !this.drawerOpened
    }

    _computePageMode(page, pageModes, pageModesP)
    {
        // console.log(page, pageModesP, pageModes)
        if (pageModes?.store == true)
        {
            return 'edit'
        }
        else if (pageModes?.cart == true)
        {
            return 'has-items'
        }
        return 'view'
    }

    _case_title(title, upperCase)
    {
        if (upperCase === 1 && title)
        {
            title = title.toUpperCase()
        }
        return title
    }

    _measureDevice()
    {
        var devinfo: any
        devinfo = {
            ppi: 96,
            dpr: 1,
            scr: { w: 1920, h: 1080 },
            pscr: { w: 10, h: 5.625 },
            con: 'unknown',
        }

        try
        {
            var nav: any = window.navigator
            var netInfo = nav.connection || nav.mozConnection || nav.webkitConnection
            var netcon = 'unknown'
            if (netInfo)
            {
                netcon = netInfo.type //bluetooth|cellular|ethernet|none|wifi|wimax|other|unknown
                //netInfo.addEventListener('typechange', (e) => this._onConnectionTypeChanged(e), EventPassiveDefault.optionPrepare())
            }
            var $el = document.createElement('div')
            $el.style.width = '1in'
            $el.style.height = '1in'
            $el.style.opacity = '0'
            $el.style.backgroundColor = '#ff0000'
            $el.style.position = 'absolute'
            $el.style.top = '0'
            document.body.appendChild($el)
            var ppi = $el.offsetWidth
            document.body.removeChild($el)
            var dpr = (window.devicePixelRatio || 1)

            devinfo = {
                ppi: ppi || 96,
                dpr: dpr || 1,
                scr: { w: screen.width, h: screen.height },
                con: netcon || 'unknown',
            }
            devinfo.psrc = { w: screen.width / devinfo.ppi / devinfo.dpr, h: screen.height / devinfo.ppi / devinfo.dpr }
        }
        catch (e)
        {
            //
        }

        this._setDeviceInfo(Object.assign(devinfo, { browser: Teamatical._browser, env: Teamatical.BuildEnv }))
        // console.log('Device info:', dev)
        return devinfo
    }

    _measureDevAndLayout()
    {
        this._measureDevice()
        if (this.deviceInfo.psrc.h > 3 && this.uiheader) //in
        {
            this.uiheader.condenses = true
            this.uiheader.reveals = true
        }
        this.supportIe = Teamatical._browser.msie
    }

    _pageMenuSelectedChanged(v, o)
    {
        // console.log(o + ' ~> ' + v)
        // console.log(this.pageMenus)
    }

    _onTabsTap(e)
    {
        if (e && e.model && e.model.__data && e.model.__data.tabi)
        {
            const tabi = e.model.__data.tabi
            this._submenuDebouncer = Debouncer.debounce(this._submenuDebouncer, timeOut.after(150),
                () => this._handleSubmenuAction(tabi.id, tabi.href, tabi.target)
            )
            // e.stopPropagation()
        }
    }

    _onTabsItemSelect(e)
    {
        //
    }

    _onDrawerItemTap(e)
    {
        if (!(e && e.model && e.model.__data && e.model.__data.tabi && this.drawerOpened)) { return }

        const tabi = e.model.__data.tabi
        if (tabi.href != window.location.pathname)
        {
            // this.drawerOpened = false //close due it has not navigation...(for now)
            this._submenuDrawerDebouncer = Debouncer.debounce(this._submenuDrawerDebouncer, timeOut.after(150), () => 
            {
                this._handleSubmenuAction(tabi.id, tabi.href, tabi.target)
            })
        }
    }

    async _onDrawerOrders(e)
    {
        this._gotoAccountOrders()
    }

    async _onDrawerSignout(e)
    {
        this.userData?.SignOut()
    }

    async _onDrawerSignin(e)
    {
        this.userData?.SignIn()
    }

    _searchTap(e)
    {
        //?? may be turn inline search for mobile
    }

    _backTap(e)
    {
        window.history.back()
    }

    async _onUserAuth(e)
    {
        // console.log(e)
        if (e.detail.signout)
        {
            //clean product private info
            await this._cleanPrivateInfoInCache()

            if (this.page && this.page.indexOf('account') >= 0) //account pages due there is sensitive info
            {
                //go home ...
                this._goto(this._homeUrl)
            }

            if (!this._snackbarSignout)
            {
                this._snackbarSignout = await this._newUISnackbar()
                this._snackbarSignout.timeout = 3 * 1000
                this.shadowRoot?.appendChild(this._snackbarSignout)
            }
            this._snackbarSignout.innerHTML = this.localize('app-toast-signout')
            this._snackbarSignout.open()
        }
        else if (e.detail.signin)
        {
            // console.log('reload')
            this._onCartReload({ detail: {} })
        }
    }

    async _cleanPrivateInfoInCache()
    {
        // console.log('clear')
        await import('../bll/cart-data')
        this.cartData.reloadCart() //if user was signin and signout -> server clears a shopping cart therefore

        await import('../bll/product-data')
        var productData: any = document.createElement('teamatical-product-data')
        if (productData)
        {
            document.body.appendChild(productData)
            this.async(() =>
            {
                (productData as ProductData).cleanPrivateInfoInCache()
                this.async(() =>
                {
                    document.body.removeChild(productData)
                }, 1)
            }, 1)
        }

        await import('../bll/checkout-data')
        var checkoutData: any = document.createElement('teamatical-checkout-data')
        if (checkoutData)
        {
            document.body.appendChild(checkoutData)
            this.async(() =>
            {
                (checkoutData as CheckoutData).cleanPrivateInfoInCache()
                this.async(() =>
                {
                    document.body.removeChild(checkoutData)
                }, 1)
            }, 1)
        }

        await import('../bll/store-data')
        var storeData: any = document.createElement('teamatical-store-data')
        if (storeData)
        {
            document.body.appendChild(storeData)
            this.async(() =>
            {
                (storeData as StoreData).cleanPrivateInfoInCache()
                this.async(() =>
                {
                    document.body.removeChild(storeData)
                }, 1)
            }, 1)
        }
    }

    async _onUserAuthNot(e)
    {
        await this.userData?.SignNot()
    }

    _onUserAuthUI(e)
    {
        if (e.detail.signin)
        {
            this.userData?.SignIn(e.detail.href)
        }
        else if (e.detail.signup)
        {
            this.userData?.SignUp(e.detail.href)
        }
        else if (e.detail.signout)
        {
            this.userData?.SignOut()
        }
    }

    _isaction(tabi_id)
    {
        // console.log(tabi_id)
        return tabi_id.indexOf('action:') >= 0
    }

    _customlogoCobrand(b)
    {
        if (typeof(b) == 'string')
        {
            if (StringUtil.isNumeric(b.charAt(0)))
            {
                b = `_${b}`
            }
        }
        return b
    }

    _customlogoClass(a, b, env)
    {
        b = this._customlogoCobrand(b)
        return `${a} ${b}`
    }

    _concat(a, b, c = '')
    {
        return a + b + c
    }

    _subdomain(subdomainA, subdomainB)
    {
        return subdomainA == subdomainB
    }

    _page(pageA, pageB)
    {
        return pageA == pageB
    }

    async _handleSubmenuAction(name, href, target = '')
    {
        if (name === undefined) { return }

        if (name.indexOf('action:') >= 0)
        {
            this.set('pageMenuSelected', '') //unselect

            if (name == 'action:user-signin')
            {
                this.userData?.SignIn()
            }
            else if (name == 'action:user-signout')
            {
                this.userData?.SignOut()
            }
            // else if (name == 'action:gotoadmin')
            // {
            //     this.userData?.gotoAdmin()
            // }
            else if (name == 'action:gotostore')
            {
                this._gotoStoreNull()
            }
        }
        else if (name.indexOf('cat:') >= 0 || name.indexOf('href:') >= 0)
        {
            if (target == '_blank')
            {
                window.open(href)
            }
            else
            {
                this._goto(href)
            }
        }
    }

    async specialLinksHandler(routeData, subroute, queryParams)
    {
        if (subroute?.path == '/admin-cancel-refund-order' && queryParams?.id)
        {
            this.async(() => 
            {
                if (!this.userInfo?.isAdmin) { return }
                this.gaData?.refund({ id: queryParams?.id, byAdmin: true }) 
                this._gotoRoot()
            })
            return true
        }
        else if (subroute?.path == '/no_facebook-linkedin')
        {
            this.set('pageSavings.i', true)
            if (CookieUtils.getCookie(no_facebooklinkedin) == 'true')
            {
                CookieUtils.setCookie(no_facebooklinkedin, "false", { expires: -1, path: '/', Secure: true, SameSite: 'Lax' })
            }
            else
            {
                CookieUtils.setCookie(no_facebooklinkedin, 'true', { expires: 30 * 365 * 24 * 60 * 60, path: '/', Secure: true, SameSite: 'Lax' })
            }
            
            var msg = `No Facebook & Linkedin - ${CookieUtils.getCookie(no_facebooklinkedin) == 'true' ? 'ON' : 'OFF'}` 

            await this._onShowDialog({ detail: {
                    required: true,
                    message: msg,
                    buttons: [
                        {
                            title: this.localize('app-redirect-ok'),
                            ontap: (e) => 
                            {
                                this.set('pageSavings.i', false)
                                this._gotoRoot()
                            }
                        },
                    ],
                }
            })
            return true
        }

        return false
    }

    _uiButtonScrollupHide(iszoomMobile)
    {
        return this._asBool(iszoomMobile)
    }
}
