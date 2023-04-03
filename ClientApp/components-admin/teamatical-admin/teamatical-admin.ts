import '@polymer/iron-pages/iron-pages.js'
import '@polymer/iron-selector/iron-selector.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog'
import '@polymer/paper-item/paper-item.js'
import '@polymer/app-route/app-location.js'
import '@polymer/app-route/app-route.js'
import '@polymer/app-layout/app-scroll-effects/effects/waterfall.js'
import '@polymer/app-layout/app-header/app-header.js'
import '@polymer/app-layout/app-toolbar/app-toolbar.js'
import '@polymer/app-layout/app-drawer/app-drawer.js'
import '@polymer/app-layout/app-drawer-layout/app-drawer-layout.js'
import '@polymer/app-layout/app-header-layout/app-header-layout.js'
import '@vaadin/vaadin-grid/vaadin-grid'
import '@vaadin/vaadin-grid/vaadin-grid-filter'
import '@vaadin/vaadin-grid/vaadin-grid-sorter'
import '@vaadin/vaadin-context-menu/vaadin-context-menu'
import { AppHeaderElement } from '@polymer/app-layout/app-header/app-header.js'
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer.js'
import { IronPagesElement } from '@polymer/iron-pages/iron-pages.js'
import { html } from '@polymer/polymer/polymer-element'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { HubConnectionBuilder, HubConnection, IHttpConnectionOptions, LogLevel } from '@microsoft/signalr'
import view from './teamatical-admin.ts.html'
import style from './teamatical-admin.ts.css'
import '../assets'
import { UIBase } from '../ui/ui-base'
import { UIModalDialog } from '../../components/ui/ui-modal-dialog'
import { IAdminSignalR, 
    IAdminSignalR_PrintingProgress, 
    IAdminSignalR_RollInspectionProgress, 
    IAdminSignalR_ReplacementsProgress, 
    IAdminSignalR_ShippingProgress, 
    IAdminSignalR_FreightsProgress,  
    IAdminSignalR_VersionUpdated} from '../../components/bll/signalr-global'
import '../../components/bll/net-base'
import '../../components/bll/user-data'
import '../../components/bll/colors-data'
import '../../components/utils/jwt-decode.js' //related with user-data - load jwt statically
import * as USER from '../../components/bll/user-data'
import '../../components/utils/CommonUtils'
import { sleep } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { NetBase } from '../../components/bll/net-base'
import { ColorsData } from '../../components/bll/colors-data'
import { SignalRGlobal } from '../../components/bll/signalr-global'
import { UISnackbar } from '../../components/ui/ui-snackbar'
import '../../components/ui/ui-locale-switcher'
import '../../components/ui/ui-button-scrollup'
import '../../components/ui/ui-pages'
import { WorkstationBase } from '../fragments/workstation-base'
import { LocalizeBehaviorBase } from '../../components/bll/localize-behavior'
import { LocalizeBehaviorBase as LocalizeBehaviorBaseLit } from '../../components/bll/localize-behavior-lit'
import { UserInfoModel } from '../../components/dal/user-info-model'
import { DialogPopupModel } from '../../components/dal/dialog-popup-model'
import '../ui/ui-automation-scripts'
import '../ui/ui-dropdown-menu'
import { FragmentBase } from '../fragments/fragment-base'
import localeDefault from '../../static/locales/teamatical-website-locale-en-US.json'
import localeAdminDefault from '../../static/locales/teamatical-wsadmin-locale-en-US.json'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const page404 = 'h404'
const defaultPage = 'orders'
const defaultPagePartner = 'organization-orders'
const defaultPageManuf = 'manufacturer-orders'



//scrollTops
//document.body.querySelector('#tmadmin').shadowRoot.querySelector('app-drawer').shadowRoot.querySelector('#contentContainer').scrollTop
//document.body.querySelector('#tmadmin').shadowRoot.querySelector('app-header-layout').shadowRoot.querySelector('#contentContainer').scrollTop


export class TeamaticalAdmin extends UIBase
{
    static get is() { return 'teamatical-admin' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties() 
    {
        return {
            env: { type: String, value: "Production" },
            versionStr: { type: String, observer: "_versionStrAssign", },
            apiVersion: { type: String, value: "v1.0" },
            apiPubkey: { type: String },
            apiGroup: { type: String, },
            apiColors: { type: String, value: null },
            authDomain: { type: String, value: "teamatical.auth0.com" },
            authAudience: { type: String, },
            authScope: { type: String, },
            websiteUrl: { type: String, },
            version: { type: String },
            versionStrNew: { type: String },
            queryParams: { type: Object, notify: true, },
            smallScreen: { type: Object },

            userInfo: { type: Object, },
            colorsPalette: { type: Array },
            auth0Loaded: { type: Boolean, notify: true, },
            offline: { type: Boolean },
            dhlExtensionLoaded: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            fullscreen: { type: Boolean, value: false, reflectToAttribute: true },
            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode

            defaultPage: { type: String, value: defaultPage }, //user-data fix is required
            page: { type: String, observer: '_pageChanged' },
            pageMenu: { type: String, computed: '_compute_pageMenu(page)' },
            pageLoading: { type: Boolean, notify: true, },
            pageUnsaved: { type: Array, notify: true, value: {} },
            pageUpdating: { type: Array, notify: true, value: {} },
            pageSavings: { type: Array, notify: true, value: {} },
            pageTitle: { type: String, computed: '_compute_pageTitle(page, pageObjectTitle.*)' },
            pageObjectTitle: { type: Array, notify: true, value: {} },
            route: Object,
            routeData: Object,
            subroute: String,
            // This shouldn't be neccessary, but the Analyzer isn't picking up
            // Polymer.Element#rootPath
            rootPath: String,

            menu: { type: Array, value: [] },
            hasUnsavedChanges:{ computed: '_compute_hasUnsavedChanges(page, pageUnsaved, pageUnsaved.*)' },
            _hideProgress: { computed: '_computeHideProgress(pageLoading, pageUpdating.*)' },
            userWaiting: { computed: '_compute_userWaiting(pageLoading, pageUpdating.*, pageSavings.*)', reflectToAttribute: true },
            savingProgress: { computed: '_compute_SavingProgress(pageSavings.*)', notify: true, reflectToAttribute: true },

            workstation: { type: Boolean, computed: '_compute_workstation(page)', reflectToAttribute: true },
            noDrawer: { computed: '_computeNoDrawer(page)' },
            noHeader: { computed: '_computeNoHeader(page)' },

            scrollTarget: { computed: '_compute_scrollTarget(page, pageLoading)' },
            allowDrawerSwipe: { type: Boolean, computed: '_compute_allowDrawerSwipe(narrow)' },

            userType: { type: String, },
            userTypeList: { type: Array, value: [ 
                { id: 'isAlmighty', title: 'All' }, 
                { id: 'isAdmin', title: 'Admin' }, 
                { id: 'isCustomerService', title: 'Customer Service' }, 
                { id: 'isDesigner', title: 'Designer' }, 
                { id: 'isDesignerAdmin', title: 'Designer Admin' }, 
                { id: 'isPrinter', title: 'Manufacturer' }, 
                { id: 'isPartner', title: 'Partner' },
            ] },

            _countdownAppVersionSec: { type: Number },
            _searchableStr: { type: String },
            _searchStart: { type: Boolean }
        }
    }

    static get observers() 
    {
        return [
            '_routePageChanged(routeData.page)',
            '_routeChanged(route, userInfo)',
            '_signalRonAuth(userInfo, userInfo.*)',
            '_userTypeInitial(userInfo, userTypeList)',
            '_buildMenuSearch(userInfo, userType.id, _searchableStr)',
            // '_log(savingProgress)'
        ]
    }
    _log(v) { console.log(v) }

    _modalDialog: any
    _submenuDebouncer: any
    _signalrDebouncer: any
    _reloadDebouncer: Debouncer
    _signalrStarter: any
    _networkSnackbar: any
    _isWsBefore: boolean
    pageLoading: any
    colorsData: any
    env: any
    auth0Loaded: any
    defaultPage: any
    page: any
    pageUpdating: any 
    pageSavings: any
    pages: any
    apiPubkey: any
    apiVersion: any
    apiGroup: any
    versionStr: string
    versionStrNew: string
    _snackbarAppVersion: UISnackbar
    offline: any
    queryParams: any
    userInfo: UserInfoModel
    dhlExtensionLoaded: boolean
    _dontCheckUnsaved = false
    fullscreen: boolean
    dialogMode: boolean
    suppressAutoreload: boolean | null
    userType: any
    websiteUrl: string
    menu: any
    _countdownAppVersionSec: number
    _countdownAppVersionTimer: any
    _searchMenuIndex: any
    _searchStartOpening: boolean
    parentTapHandler: any
    userWaiting: boolean


    get ui() { return { 
            header: this.$['header'] as AppHeaderElement, 
            drawer: this.$['drawer'] as AppDrawerElement,
            pages: this.$['pages'] as IronPagesElement,
        }
    }

    get bll() { return { 
            user: this.$['user-data'] as USER.UserData, 
            colorsData: this.$['colors-data'] as ColorsData,
        }
    }

    constructor()
    {
        LocalizeBehaviorBase.run('wsadmin', localeDefault, localeAdminDefault)
        LocalizeBehaviorBaseLit.run('wsadmin', localeDefault, localeAdminDefault)

        super()

        this. _signalrStarter = true

        // this._browserErrorHandler = this._browserError.bind(this)
        // this._browserRejectionHandler = this._browserRejection.bind(this)
    }

    
    connectedCallback()
    {
        this.versionStrNew = this.versionStr //!before super impl.

        super.connectedCallback()

        // listen for custom events
        this.addEventListener('api-user-auth-changed', (e) => this._onUserAuth(e))
        this.addEventListener('ui-user-auth', (e) => this._onUserAuthUI(e))
        this.addEventListener('api-show-dialog', (e) => this._onShowDialog(e))
        this.addEventListener('api-show-toast', (e) => this._onShowToast(e))

        this.addEventListener('tmladmin-ui-dialog-opening', (e) => this._onModalDialog(e))
        this.addEventListener('tmladmin-ui-dialog-closed', (e) => this._onModalDialog(e))

        this.addEventListener('api-suppress-autoreload', (e) => { if (!(e as CustomEvent).detail.autoload) { this.suppressAutoreload = true } })
        this.addEventListener('api-reload-byversion', (e) => { this._reloadWindowLocation() })

        // listen for online/offline
        afterNextRender(this, () =>
        {
            window.addEventListener('online', (e) => this._notifyNetworkStatus(e), EventPassiveDefault.optionPrepare())
            window.addEventListener('offline', (e) => this._notifyNetworkStatus(e), EventPassiveDefault.optionPrepare())
        })

        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        this.parentTapHandler = (e) => 
        {
            if (this._searchStartOpening) { return }

            var epath = e.path || e.composedPath()
            // console.log(epath)
            var el = epath ? epath.filter(i => {  return i?.classList?.contains('menu-search-text') }) : []
            if (el?.length < 1 && this._searchStart)
            {
                this._searchStart = false
                this._searchableStr = ''
            }
        }
        document.addEventListener('tap', this.parentTapHandler, EventPassiveDefault.optionPrepare())
        window.addEventListener('beforeunload', (e) => this._onBeforeUnload(e))
        window.addEventListener("popstate", (e) => this._onHistoryPopstate(e), EventPassiveDefault.optionPrepare())

        //events - error handling 
        // this._browserErrorHandler = this._browserError.bind(this)
        // this._browserRejectionHandler = this._browserRejection.bind(this)
        // window.addEventListener('error', this._browserErrorHandler, EventPassiveDefault.optionPrepare())
        // window.addEventListener('unhandledrejection', this._browserRejectionHandler, EventPassiveDefault.optionPrepare())


        // Custom elements polyfill safe way to indicate an element has been upgraded.
        this.removeAttribute('unresolved')


        //START
        var tz = Math.round(10 * (new Date().getTimezoneOffset()) / 60) / 10
        const hasApiPubkey = this.apiPubkey ? 'OK' : '?'
        console.log('%c Teamatical ADMIN ', 'color: white; background-color: #2274A5', ' Env: ' + this.env + ', API: ' + this.apiVersion + ', TZ: UTC' + (tz > 0 ? '+' : '') + tz)


        this.async(() => { this.auth0Loaded = true }) //for backward compatibility
        // this.detectExtension((success) => { this.dhlExtensionLoaded = success })

        Teamatical.onBarcode = (b) => { this.onBarcode(b) }
    }

    _onModalDialog(e)
    {
        // this.fullscreen = this._asBool(e.detail.opening)
        this.dialogMode = this._asBool(e.detail.opening)
    }

    _resetColumnsSettings(e)
    {
        if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['_resetColumnsSettings'])
        {
            var recentPage = this.ui.pages.selectedItem as FragmentBase
            recentPage._resetColumnsSettings()
        }
    }

    _compute_hasUnsavedChanges(page, pageUnsaved, pageUnsavedP)
    {
        // if (this._dev) console.log(page, pageUnsaved, pageUnsaved[page])
        return pageUnsaved[page] == undefined ? false : pageUnsaved[page]
    }

    _compute_allowDrawerSwipe(narrow)
    {
        return narrow && !Teamatical._browser.iPhone
    }

    _compute_scrollTarget(page, pageLoading)
    {
        if (page === undefined || pageLoading === undefined || pageLoading === true) { return null }

        var layout = this.root?.querySelector('app-header-layout')
        if (!layout) { return 'document.body' }
        var contentContainer = layout?.shadowRoot ? layout.shadowRoot.querySelector('#contentContainer') : null
        if (!contentContainer) { return 'document.body' }
        // console.log(contentContainer)
        return contentContainer

    }

    _signalRonAuth(userInfo, userInfoP)
    {
        if (userInfo == undefined) { return }
        // if (userInfo == undefined || !this.ui.pages || !this.ui.pages.selectedItem) { return }
        // if (this.ui.pages.selectedItem['machineAuthorization'] && !userInfo.isBotAuth) { return }
        // console.log(userInfo.isAuth, userInfo.isBotAuth, pageLoading, this.ui.pages?.selectedItem['machineAuthorization'])
        //!this.ui.pages?.selectedItem['machineAuthorization']
        if (userInfo.isAuth || userInfo.isBotAuth)
        {
            this._signalrDebouncer = Debouncer.debounce(this._signalrDebouncer, timeOut.after(150), 
                async () => await this._signalr()
            )
        }
    }

    _userTypeInitial(userInfo: UserInfoModel, userTypeList)
    {
        if (userInfo?.isAlmighty)
        {
            this.set('userType', userTypeList[0]) // { id: 'isAlmighty', title: 'All' }
        }
    }

    _onHistoryPopstate(e)
    {
        e = e || window.event
        this.async(() =>
        {
            var pages = this.ui.pages
            var pagei: any = (pages ? pages.selectedItem : null)
            var gridi: any = pagei ? pagei.$?.grid : null

            if (pagei && gridi && typeof (pagei._refresh) == 'function')
            {
                pagei._refresh(1, 'history-pop')
                if (e.preventDefault)
                {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
            else if (pagei && !gridi && typeof (pagei.reload) == 'function' && !this.suppressAutoreload)
            {
                pagei.reload()
                if (e.preventDefault)
                {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }

            this.suppressAutoreload = null

        }, 17)
    }

    _onKeydownEvent(e)
    {
        // console.log(e, document.activeElement)
        var keycode
        var pages = this.ui.pages
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (Teamatical._browser.msie)
        {
            if ((!wevent.ctrlKey && !wevent.altKey && keycode == 116) || (wevent.ctrlKey && !wevent.altKey && keycode == 82))
            {
                if (pages && pages.selectedItem && pages.selectedItem['_refresh']) 
                {
                    var si:any = pages.selectedItem
                    si._refresh(1)

                    wevent.returnValue = false
                    wevent.keyCode = 0
                    window.status = "Refresh is disabled"
                }
            }
        }
        else
        {
            // if (e.ctrlKey && Teamatical.BuildEnv == 'Development')
            // {
            //     switch(keycode)
            //     {
            //         case 122:
            //             window.Teamatical.onBarcode('122')
            //             break
            //         case 123:
            //             window.Teamatical.onBarcode('123')
            //             break
            //     }
            // }

            var pagei: any = (pages ? pages.selectedItem : null)
            var gridi: any = pagei ? pagei.$?.grid : null

            if ((e.ctrlKey && !e.altKey && !e.shiftKey && keycode == 83))
            {
                // console.log('%c HOTKEY ', 'color: white; background-color: #95B46A', 'Ctrl+S')
                
                if (pagei && !gridi && typeof(pagei.save) == 'function')
                {
                    pagei.save()
                    if (e.preventDefault)
                    {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }
            }

            if ((!e.ctrlKey && !e.altKey && keycode == 116) || (!e.shiftKey && !e.altKey && e.ctrlKey && keycode == 82))
            {
                if (pagei && gridi && typeof (pagei._refresh) == 'function')
                {
                    pagei._refresh(1)
                    if (e.preventDefault)
                    {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }
                else if (pagei && !gridi && typeof (pagei.reload) == 'function')
                {
                    pagei.reload()
                    if (e.preventDefault)
                    {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }
            }

            // console.log(e)
            if (e.shiftKey && !e.altKey && !e.ctrlKey && e.code == 'Slash' && pagei && typeof (pagei._help) == 'function')
            {
                this.showToast(pagei._help())
                
                if (e.preventDefault)
                {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }

            if (gridi && !e.shiftKey && e.altKey && !e.ctrlKey && (keyboardEventMatchesKeys(e, 'left') || keyboardEventMatchesKeys(e, 'right')))
            {
                var pagefg = pagei as FragmentBase
                if (keyboardEventMatchesKeys(e, 'left') && typeof (pagefg._prev) == 'function')
                {
                    pagefg._prev()
                } 
                else if (keyboardEventMatchesKeys(e, 'right') && typeof (pagefg._next) == 'function')
                {
                    pagefg._next()
                }

                if (e.preventDefault)
                {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
        }

        this._searchMenuHandler(e)
    }

    _onBeforeUnload(e)
    {
        if (this._dev) { return }
        var pages = this.ui.pages
        var pagei: any = (pages ? pages.selectedItem : null)
        var gridi: any = pagei ? pagei.$.grid : null
        // console.log(pagei?.visible, pagei?.hasUnsavedChanges, pagei?.loadingAny)
        if (!this._dontCheckUnsaved && pagei && !gridi && pagei?.visible && (pagei?.hasUnsavedChanges === true || pagei?.loading === true || pagei?.loadingCmd === true))
        {
            var confirmationMessage = this.localize('admin-onclosed-unsaved')
            var e = e || window.event
            e.returnValue = confirmationMessage  //Gecko + IE
            return confirmationMessage  //Gecko + Webkit, Safari, Chrome etc.
        }
    }

    _versionStrAssign(str, old)
    {
        //appTitle app-title - doesn't use localize due it is async-ly loading
        // this.version = new Version(this, "Teamatical", str, this.env, this.websiteUrl)
    }

    _routeChanged(route, userInfo)
    {
        if (!route || !userInfo || !userInfo.access_token) { return }

        if (route.path.indexOf('/admin') == -1)
        {
            //force to change application
            this._reloadWindowLocation()
        }
        else if (route.path.toLowerCase() == '/admin' || route.path.toLowerCase() == '/admin/')
        {
            if (this.userInfo?.isPrinter && !this.userInfo?.isAdmin)
            {
                window.location.href = `/admin/${defaultPageManuf}`
            }
            else if (this.userInfo?.isAdmin)
            {
                window.location.href = `/admin/${defaultPage}`
            }
            else if (this.userInfo?.isCustomerService || this.userInfo?.isPartner)
            {
                var page = defaultPage
                if (!this.userInfo.isAlmighty && this.userInfo.isPartner) { page = defaultPagePartner }
                window.location.href = `/admin/${page}`
            }

            this._gotoRS('/admin/manufacturer-orders')
        }
    }

    _routePageChanged(page) 
    {
        // If no page was found in the route data, page will be an empty string.
        // Default to 'orders' in that case.
        this.page = page || this.defaultPage

        // Close a non-persistent drawer when the page & route are changed.
        if (!this.ui.drawer.persistent) 
        {
            this.ui.drawer.close()
        }

        if (this.page === 'product-accessory')
        {
            this.bll.colorsData.loadColorsPaletteAsync()
        }
    }

    _pageChanged(page, oldPage)
    {
        if (page == null) { return }

        if (this.versionStr !== this.versionStrNew)
        {
            this._reloadDebouncer = Debouncer.debounce(this._reloadDebouncer, timeOut.after(100), () =>
            {
                this._reloadWindowLocation()
            })
            return
        }

        this._pageLoad(page, oldPage)
    }

    // _pageLoad(page, oldPage)
    // {
    //     // When a load failed, it triggered a 404 which means we need to eagerly load the 404 page definition
    //     let pageloadedHandler = this._pageLoaded.bind(this, Boolean(oldPage))
    //     let pageUrl = this.resolveUrl('../fragments/' + page + '.html')
    //     this.pageLoading = true
    //     // console.log(page)
    //     Polymer.importHref(pageUrl, pageloadedHandler, pageloadedHandler, true)
    // }
    
    _pageLoad(page, oldPage?)
    {
        // When a load failed, it triggered a 404 which means we need to eagerly load the 404 page definition
        let pageloadedHandler = this._pageLoaded.bind(this, Boolean(oldPage))
        this.pageLoading = true
        /* webpackMode: "lazy" */
        // console.log('Dynamicaly - ' + page + ' is loading...')
        import(`../fragments/${page}`).then(pageloadedHandler).catch(pageloadedHandler)
    }

    _pageLoadedDebouncer: Debouncer
    _pageLoaded(shouldResetLayout, e)
    {
        this.pageLoading = false

        if (e && e.type == 'error') { this.page = page404 }

        // this._pageLoadedDebouncer = Debouncer.debounce(this._pageLoadedDebouncer, timeOut.after(157), () =>
        // {
        //page title
        let doctitle = this.page + ' | teamatical'
        if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['queryParamsRequired'])
        {
            var recentPage:any = this.ui.pages.selectedItem
            for (var i in recentPage.queryParamsRequired)
            {
                let id = this.queryParams[recentPage.queryParamsRequired[i]]
                if (id)
                {
                    doctitle = id + ' | ' + doctitle
                }
            }
        }
        document.title = doctitle

        //admin <-> workstation navigation fixes
        if (this.ui.pages && this.ui.pages.selectedItem)
        {
            var recentPage: any = this.ui.pages.selectedItem
            var isWs = recentPage instanceof WorkstationBase
            if ((this._isWsBefore == true && !isWs) || (this._isWsBefore == false && isWs)) 
            {
                this._dontCheckUnsaved = true
                this._reloadWindowLocation()
            }
            this._isWsBefore = isWs
        }
        else if (typeof(this.page) == 'string')
        {
            if (!this.page.startsWith('workstation-') || this.page == 'workstation-hub')
            {
                if (this.page == 'workstation-hub') { alert(this.localize('admin-nopage-noauth')) }
                this.bll.user.SignIn()
            }
        }

        // this._ensureLazyLoaded()
        if (shouldResetLayout)
        {
            // The size of the header depends on the page (e.g. on some pages the tabs
            // do not appear), so reset the header's layout only when switching pages.
            timeOut.run(() => { this.ui.header.resetLayout() }, 1)
        }
    }


    _onShowDialog(event)
    {
        if (!this._modalDialog)
        {
            this._modalDialog = new UIModalDialog()
            this._modalDialog.adminMode = true
            this.shadowRoot?.appendChild(this._modalDialog)
        }

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

        if (buttons)
        {
            var btns = buttons.reduce((acc, i) => { return acc + ` [${i.title}]` }, '')
            console.log(`api-dialog: ${btns} - ${message}`)
        }
        this._modalDialog.message = message || ''
        this._modalDialog.buttons = buttons || []
        this._modalDialog.inputs = inputs || []
        this._modalDialog.required = required || false
        this._modalDialog.nowarp = nowrap
        this._modalDialog.widthauto = widthauto
        this._modalDialog.qrcode = qrcode || errorid
        this._modalDialog.errorid = errorid
        this._modalDialog.devErrorDetails = devErrorDetails
        this._modalDialog.open()
    }

    _onShowToast(e)
    {
        const timeout = e?.detail?.timeout > 0 ? e.detail.timeout : 3 * 1000
        const strong = e?.detail?.strong ? e.detail.strong : false
        const msg = e?.detail?.message ? e.detail.message : 'msg ...'
        this.showToast(msg, timeout, strong)
    }

    _toast: any
    showToast(msg, timeout = 3 * 1000, strong = false)
    {
        if (!this._toast)
        {
            this._toast = new UISnackbar()
            this._toast.strong = strong
            this._toast.timeout = timeout
            this.shadowRoot?.appendChild(this._toast)
        }
        this._toast.innerHTML = msg
        this._toast.open()
    }

    _onUserAuth(e)
    {
        // console.log(e)
        if (e.detail.signout)
        {
            // //clean product private info
            // this._cleanPrivateInfoInCache()

            // if (this.page && this.page.indexOf('account') >= 0) //account pages due there is sensitive info
            // {
            //     //go home ...
            //     this._gotoRoot()
            // }

            // if (!this._snackbarSignout)
            // {
            //     this._snackbarSignout = new UISnackbar()
            //     this._snackbarSignout.timeout = 3 * 1000
            //     this.shadowRoot?.appendChild(this._snackbarSignout)
            // }
            // this._snackbarSignout.innerHTML = this.localize('app-toast-signout')
            // this._snackbarSignout.open()
        }
        else if (e.detail.signin)
        {
            // // console.log('reload')
            // this._onCartReload({ detail: {} })
        }
    }

    _onUserAuthUI(e)
    {
        if (e.detail.signin)
        {
            this.bll.user.SignIn(e.detail.href)
        }
        else if (e.detail.signup)
        {
            this.bll.user.SignUp(e.detail.href)
        }
        else if (e.detail.signout)
        {
            this.bll.user.SignOut()
        }
    }

    _isaction(tabi_id)
    {
        return tabi_id.indexOf('action:') >= 0
    }

    _onTabsTap(e)
    {
        // console.log(e)
        if (e && e.model && e.model.__data && e.model.__data.menui)
        {
            const menui = e.model.__data.menui
            // console.log(menui)
            this._submenuDebouncer = Debouncer.debounce(this._submenuDebouncer, timeOut.after(150),
                () => this._handleSubmenuAction(menui.name, menui.href)
            )
            // e.stopPropagation()
        }
    }

    _handleSubmenuAction(name, href, target = '', hrefHandle = false)
    {
        if (name === undefined) { return }

        if (name.indexOf('action:') >= 0)
        {
            if (name == 'action:user-signin')
            {
                this.bll.user.SignIn()
            }
            else if (name == 'action:user-signout')
            {
                this.bll.user.SignOut('/')
            }
            // else if (name == 'action:gotoadmin')
            // {
            //     this.bll.user.gotoAdmin()
            // }
            else if (name == 'action:gotostore')
            {
                this._gotoStoreNull()
            }
        }
        else if (href && hrefHandle)
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

    _computeNoHeader(page)
    {
        return this._computeNoDrawer(page)
    }

    _computeNoDrawer(page)
    {
        return this._compute_workstation(page)
    }

    _compute_workstation(page)
    {
        if (typeof (page) == 'string' && page.startsWith('workstation-')) { return true }
        return false

        // switch(page)
        // {
        //     case 'workstation-printing':
        //     case 'workstation-roll-inspection':
        //     case 'workstation-cutting':
        //         return true
        //     default:
        //         return false
        // }
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

    _computeHideProgress(pageLoading, pageUpdatingP)
    {
        var pu = this._buildPageUpdatingStatus(this.pageUpdating)
        var v = !(pageLoading === true || pu === true)
        // console.log('loading', pageLoading, pageUpdatingP, st, v)
        return v

        var st = ''
        var pu:any = false
        // var lst = this.pageUpdating
        // if (lst)
        // {
        //     for (var i in lst)
        //     {
        //         st += ', ' + lst[i]
        //         if (lst[i] === true)
        //         {
        //             pu = true
        //             break
        //         }
        //     }
        // }
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

    _asBoolTargetBlank(target)
    {
        return (target == '_blank')
    }

    _compute_pageTitle(page, pageObjectTitleP)
    {
        var pageobjtitle = ''
        if (pageObjectTitleP.path == `pageObjectTitle.${page}`) { pageobjtitle = pageObjectTitleP.value }
        var padd = ''
        if (pageobjtitle) { padd = ` - ${pageobjtitle}` }
        return `${this.localizepv('admin-page-title-', page)}${padd}`
    }

    _compute_pageMenu(page)
    {
        const nonListPages = { 'dev-image-url': 1, 'dev-info': 1, 'dev-bot-user': 1, 'task-planner': 1, 'entity-viewer': 1, 'history-viewer': 1, }
        var ps = page
        if (nonListPages[page]) { }
        else if (ps == 'manufacturer-order-batch') { ps = 'manufacturer-orders' }
        else if (typeof(ps) == 'string' && ps.lastIndexOf('y') == (ps.length - 1)) { ps = ps.substr(0, ps.length - 1) + 'ies' }
        else if (typeof(ps) == 'string' && ps.lastIndexOf('s') !== (ps.length - 1)) { ps = ps + 's' }
        // console.log(page, '->', ps)
        return ps
    }

    _allowPages(userInfo: UserInfoModel, userTypeId, client_secret) //, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10
    {
        var namePrefixes: any = []
        for (var i in arguments) { namePrefixes[i] = arguments[i] }
        namePrefixes = namePrefixes.slice(3)
        // console.log(client_secret, '_allowPages -------------', namePrefixes.join('|'))

        for (var a in namePrefixes)
        {
            if (namePrefixes[a] == 'workstation-h503' 
                || namePrefixes[a] == 'h503' 
                || namePrefixes[a] == 'h404'
                || (namePrefixes[a].startsWith('workstation-') && client_secret))
            {
                // console.log('_allowPages ------------- ====>>>>', true)
                return true
            }
        }

        var allow = false
        var menu = this._buildMenu(userInfo, userTypeId)
        var nameRegex = []
        for (var i in menu)
        {
            for (var a in namePrefixes)
            {
                if (!nameRegex[a]) { nameRegex[a] = new RegExp(namePrefixes[a]  + '$') }
                var regex = nameRegex[a]
                var r = regex.exec(menu[i].name)
                if (r != null && r.index == 0)
                {
                    // console.log(r)
                    allow = true
                    break
                }
            }
        }
        // console.log('_allowPages ------------- ====>>>>', allow)
        return allow
    }

    _searchMenuFocus()
    {
        this._searchStartOpening = true
        this.async(() =>
        {
            var el = this.shadowRoot?.querySelector('.menu-search-text') as HTMLElement
            if (el) { el.focus() }
            this._searchStartOpening = false
        })
    }

    _searchMenuTap(e)
    {
        this._searchStart = true
        // this._searchableStr = ''
        e.target.blur()
        this._searchMenuFocus()
    }

    _searchableStr = ''
    _searchStart = false
    _searchDebouncer: Debouncer
    _searchMenuHandler(e)
    {
        if (e.altKey || !e?.key
            || !this.ui.drawer.opened 
            || this.userWaiting) { return }

        var hasFocus = document.activeElement == document.body
        var epath = e.path || e.composedPath()
        var el = epath ? epath.filter((i, inx) => { return i?.id == 'usertype-selector' || (i?.classList?.contains('drawer-list')) }) : null
        if (el?.length > 0) 
        { 
            epath[0].blur()
            this._searchMenuFocus()
            hasFocus = true 
        }
        if (!hasFocus) { return }

        var ekey = e.key
        if (keyboardEventMatchesKeys(e, 'backspace') && this._searchableStr?.length > 0)
        {
            this._searchableStr = e.ctrlKey ? '' : this._searchableStr.substring(0, this._searchableStr.length - 1)
        }
        else if (!e.ctrlKey && keyboardEventMatchesKeys(e, 'esc'))
        {
            this._searchStart = false
            this._searchableStr = ''
        }
        else if (!e.ctrlKey && keyboardEventMatchesKeys(e, 'enter') && this._searchableStr)
        {
            // console.log('go to ... impl.', this._searchableStr)
            let menu = this.menu
            if (Array.isArray(menu))
            {
                var r = menu.filter(i => 
                {
                    return i.name.lastIndexOf('-sep') < 0 
                })
                if (r?.length > 0)
                {
                    let menui = r[0]
                    // console.warn(menui)
                    this._handleSubmenuAction(menui.name, menui.href, menui.target, true)
                    this._searchStart = false
                    this._searchableStr = ''
                }
            }
        }
        else if (!e.ctrlKey && ekey?.length === 1)
        {
            this._searchableStr += ekey
        }


        if (this._searchableStr?.length >= 1 && !this._searchStart) 
        { 
            this._searchStart = true
        }

        // var t = 3600
        // this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(t), () =>
        // {
        //     this._searchStart = false
        //     this._searchableStr = '' //start over
        // })
    }
    
    async _buildMenuSearch(userInfo: UserInfoModel, userTypeId, searchStr = '')
    {
        var arr = this._buildMenu(userInfo, userTypeId)
        if (searchStr)
        {
            if (!this._searchMenuIndex)
            {
                const module = await import('../../components/utils/elasticlunr.js')
                const elasticlunr = module.default
                elasticlunr.clearStopWords()
                var qsindex: any = elasticlunr(function ()
                {
                    this.setRef('n')
                    this.addField('t')
                })
                for (var i in arr)
                {
                    if (arr[i].name.lastIndexOf('-sep') >= 0) { continue }

                    qsindex.addDoc({
                        n: arr[i].name,
                        t: arr[i].title.trim(),
                    })
                }
                this._searchMenuIndex = qsindex
            }
            else
            {
                await sleep(0)
            }

            if (this._searchMenuIndex)
            {
                var r = this._searchMenuIndex.search(searchStr.trim(), {
                    fields: {
                        t: { boost: 10 },
                    },
                    expand: true,
                })

                // console.log('qsindex', r)
                arr = arr.reduce((accumulator, i, index, array) => 
                {
                    let sep = i.name.lastIndexOf('-sep') >= 0
                    let sepNext = (((index + 1) < array.length) && (array[index + 1].name.lastIndexOf('-sep') >= 0)) || ((index + 1) == array.length)
                    let find = r.filter(j => { return j.doc.n == i.name })?.length > 0
                    if (find || (sep && !sepNext)) { accumulator.push(i) }
                    return accumulator
                }, [])
            }
            else
            {
                arr = arr.reduce((accumulator, i, index, array) => 
                {
                    let sep = i.name.lastIndexOf('-sep') >= 0
                    let sepNext = (((index + 2) < array.length) && (array[index + 1].name.lastIndexOf('-sep') >= 0)) || ((index + 1) == array.length)
                    let user = i.name.indexOf('action:user') >= 0
                    let find = i.title.trim().toLowerCase().startsWith(searchStr.trim())
                    if (find || user || (sep && !sepNext)) { accumulator.push(i) }
                    return accumulator
                }, [])
            }

            //clean separators
            arr = arr.reduce((accumulator, i, index, array) => 
            {
                let sep = i.name.lastIndexOf('-sep') >= 0
                let sepNext = (((index + 1) < array.length) && (array[index + 1].name.lastIndexOf('-sep') >= 0)) || ((index + 1) == array.length)
                let userNext = false //((index + 1) < array.length) && (array[index + 1].name.indexOf('action:user') >= 0)
                if (!sep || (sep && !(sepNext || userNext))) { accumulator.push(i) }
                return accumulator
            }, [])
        }
        else
        {
            await sleep(0)
        }

        // console.log('menu', arr)
        this.set('menu', arr)
    }

    _buildMenu(userInfo: UserInfoModel, userTypeId)
    {
        if (!this.bll?.user || !userInfo) { return [] }

        const sep_title: any = '  »  ' //»→
        var arr: any = []

        if (userInfo.isAlmighty && userTypeId != 'isAlmighty')
        {
            var newuserInfo = new UserInfoModel()
            newuserInfo[userTypeId] = true
            newuserInfo.isAuth = userInfo.isAuth
            userInfo = newuserInfo
        }
        let u_Almighty = userInfo.isAlmighty
        let u_Admin = userInfo.isAdmin
        let u_CustomerService = userInfo.isCustomerService
        let u_Printer = userInfo.isPrinter
        let u_DesignerAdmin = userInfo.isDesignerAdmin
        let u_Partner = userInfo.isPartner
        // u_Almighty = false; u_Admin = false; u_CustomerService = false; u_Printer = false; u_DesignerAdmin = false; u_Partner = false; u_CustomerService = true //TEST
        
        //Customers Service
        if (u_Admin || u_CustomerService || u_Partner)
        {
            if (u_Admin || u_CustomerService)
            {
                arr.push({ name: 'customerservice-sep', href: '', title: sep_title + ' Customers Service ', css: 'separator' })

                arr.push({ name: 'orders', href: this.rootPath + 'orders', title: ' Orders ' })
                arr.push({ name: 'custom-stores', href: this.rootPath + 'custom-stores' + '?sort=Created,desc', title: ' Custom Stores ' })
                arr.push({ name: 'custom-design-requests', href: this.rootPath + 'custom-design-requests' + '?sort=Created,desc', title: ' Design Requests ' })

                arr.push({ name: 'group-shippings', href: this.rootPath + 'group-shippings', title: ' Group Orders ' })
                arr.push({ name: 'purchase-orders', href: this.rootPath + 'purchase-orders', title: ' Purchase Orders  ' })
            }
        }
        if (u_Admin || u_CustomerService || u_DesignerAdmin)
        {
            arr.push({ name: 'product-configs', href: this.rootPath + 'product-configs', title: ' Product Configurations ' })
        }


        //Product Data
        if (u_Admin)
        {
            arr.push({ name: 'product-sep', href: '', title: sep_title + " Products  Data ", css: 'separator' })

            arr.push({ name: 'product-colors', href: this.rootPath + 'product-colors', title: ' Colors ' })
            arr.push({ name: 'product-fonts', href: this.rootPath + 'product-fonts', title: ' Fonts ' })
            arr.push({ name: 'product-sizecategories', href: this.rootPath + 'product-sizecategories', title: ' Size Categories  ' })
            arr.push({ name: 'product-views', href: this.rootPath + 'product-views', title: ' Views of Products ' })
        }

        //Marketing
        if (u_Admin)
        {
            arr.push({ name: 'market-sep', href: '', title: sep_title + ' Marketing ', css: 'separator' })

            arr.push({ name: 'products', href: this.rootPath + 'products', title: ' Marketing Products ' })
            arr.push({ name: 'brands', href: this.rootPath + 'brands', title: ' Brands ' })
            arr.push({ name: 'organizations', href: this.rootPath + 'organizations', title: ' Organizations ' })
            arr.push({ name: 'currency-regions', href: this.rootPath + 'currency-regions', title: ' Currency Regions ' })
            arr.push({ name: 'deal-profiles', href: this.rootPath + 'deal-profiles', title: ' Deal Profiles' })

            arr.push({ name: 'catalog-products', href: this.rootPath + 'catalog-products', title: ' Website Catalogs ' })
            arr.push({ name: 'catalog-plugin-products', href: this.rootPath + 'catalog-plugin-products', title: ' Art Manager Catalog ' })
        }


        //Manufacturing
        if (u_Admin || u_Printer)
        {
            arr.push({ name: 'man-sep', href: '', title: sep_title + ' Manufacturing ', css: 'separator' }) //sep
            arr.push({ name: 'manufacturer-orders', href: this.rootPath + 'manufacturer-orders', title: ' Manufacturing Orders ' })
            arr.push({ name: 'production-orders', href: this.rootPath + 'production-orders', title: ' Production Orders ' })
            if (u_Printer && !u_Almighty)
            {
                arr.push({ name: 'man-sep', href: '', title: sep_title + ' Shipping ', css: 'separator' }) //sep
            }
            arr.push({ name: 'shipping-containers', href: this.rootPath + 'shipping-containers', title: ' Shipping Containers' })
            arr.push({ name: 'shipping-freights', href: this.rootPath + 'shipping-freights', title: ' Shipping Freights' })
        }

        if (u_Admin)
        {
            arr.push({ name: 'shipping-hubs', href: this.rootPath + 'shipping-hubs', title: ' Shipping Hubs ' })
            arr.push({ name: 'product-labels', href: this.rootPath + 'product-labels', title: ' Product Labels ' })
            arr.push({ name: 'product-threads', href: this.rootPath + 'product-threads', title: ' Product Threads ' })
            arr.push({ name: 'product-accessories', href: this.rootPath + 'product-accessories', title: ' Product Accessories ' })
            arr.push({ name: 'product-manufacturers', href: this.rootPath + 'product-manufacturers', title: ' Manufacturer Products ' })
        }
        if (u_Printer && !u_Almighty)
        {
            arr.push({ name: 'man-sep', href: '', title: sep_title + ' Settings ', css: 'separator' }) //sep

            arr.push({ name: 'manufacturer-brands', href: this.rootPath + 'manufacturer-brands', title: ' Brands ' })
        }
        if (u_Admin || u_Printer)
        {
            let title = u_Printer && !u_Almighty ? ' Settings ' : ' Manufacturers Settings '
            arr.push({ name: 'manufacturers', href: `${this.rootPath}manufacturers?as-manuf=1`, title: title })
        }
        

        //Organization Tools
        if (u_Partner && !u_Almighty)
        {
            arr.push({ name: 'org-sep', href: '', title: sep_title + ' Organization ', css: 'separator' })

            arr.push({ name: 'organization-orders', href: this.rootPath + 'organization-orders', title: ' Orders ' })
            arr.push({ name: 'organization-custom-stores', href: this.rootPath + 'organization-custom-stores' + '?sort=Created,desc', title: ' Custom Stores ' })
            arr.push({ name: 'organization-custom-design-requests', href: this.rootPath + 'organization-custom-design-requests' + '?sort=Created,desc', title: ' Design Requests ' })
        }


        //Manufacturer's Workstations
        if (u_Printer)
        {
            //WS
            arr.push({ name: 'ws-sep', href: '', title: sep_title + ' Workstations ', css: 'separator' })

            arr.push({ name: 'workstation-planning', href: this.rootPath + 'workstation-planning', title: ' Planning Ws ', target: '_blank' })
            arr.push({ name: 'workstation-printing', href: this.rootPath + 'workstation-printing', title: ' Printing Ws ', target: '_blank' })
            arr.push({ name: 'workstation-roll-inspection', href: this.rootPath + 'workstation-roll-inspection', title: ' Roll Inspection Ws ', target: '_blank' })
            arr.push({ name: 'workstation-replacements', href: this.rootPath + 'workstation-replacements', title: ' Parts Replacements Ws ', target: '_blank' })
            arr.push({ name: 'workstation-stacking', href: this.rootPath + 'workstation-stacking', title: ' Stacking Ws ', target: '_blank' })
            arr.push({ name: 'workstation-cutting', href: this.rootPath + 'workstation-cutting', title: ' Cutting Ws ', target: '_blank' })
            arr.push({ name: 'workstation-sizelabel', href: this.rootPath + 'workstation-sizelabel', title: ' Labeling Ws ', target: '_blank' })
            arr.push({ name: 'workstation-sorting', href: this.rootPath + 'workstation-sorting', title: ' Sorting Ws ', target: '_blank' })
            arr.push({ name: 'workstation-bundling', href: this.rootPath + 'workstation-bundling', title: ' Bundling', target: '_blank' })
            arr.push({ name: 'workstation-sewing', href: this.rootPath + 'workstation-sewing', title: ' Sewing Ws ', target: '_blank' })
            arr.push({ name: 'workstation-qa', href: this.rootPath + 'workstation-qa', title: ' QA Ws ', target: '_blank' })
            arr.push({ name: 'workstation-aggregation', href: this.rootPath + 'workstation-aggregation', title: ' Aggregation Ws ', target: '_blank' })
            arr.push({ name: 'workstation-shipping', href: this.rootPath + 'workstation-shipping', title: ' Shipping Labels Ws ', target: '_blank' })
            arr.push({ name: 'workstation-containerizing', href: this.rootPath + 'workstation-containerizing', title: ' Containerizing Ws ', target: '_blank' })
            arr.push({ name: 'workstation-freights', href: this.rootPath + 'workstation-freights', title: ' Freights Ws ', target: '_blank' })
            if (this._dev) arr.push({ name: 'workstation-freightforward', href: this.rootPath + 'workstation-freightforward', title: ' Freight Forward Ws ~d ', target: '_blank' })
        }
        if (u_Partner)
        {
            arr.push({ name: 'workstation-hub', href: this.rootPath + 'workstation-hub', title: ' Parcel Hub Ws ', target: '_blank' })
        }
        

        //DEV Tools
        if (u_Admin || u_Partner || u_Printer)
        {
            const title = u_Almighty ? ' Developer Tools ' : ' Tools '
            arr.push({ name: 'dev-sep', href: '', title: sep_title + title, css: 'separator' }) 
        }

        if (u_Almighty)
        {
            arr.push({ name: 'dev-info', href: this.rootPath + 'dev-info', title: ' DEV Information ' })
            arr.push({ name: 'task-planner', href: this.rootPath + 'task-planner', title: ' Tasks Planner ' })
            arr.push({ name: 'entity-viewer', href: this.rootPath + 'entity-viewer', title: ' Entity Viewer ' })
            arr.push({ name: 'history-viewer', href: this.rootPath + 'history-viewer', title: ' History Viewer ' })
            arr.push({ name: 'dev-bot-user', href: this.rootPath + 'dev-bot-user', title: ' Create Bot User ' })
            arr.push({ name: 'nesting-requests', href: this.rootPath + 'nesting-requests', title: ' Nesting Requests ' })
        }

        if (u_Admin)
        {
            arr.push({ name: 'dev-image-url', href: this.rootPath + 'dev-image-url', title: ' Image URL ' })
        }
        if (u_Admin || u_Partner || u_Printer)
        {
            arr.push({ name: 'website-locales', href: this.rootPath + 'website-locales', title: ' Website Locales ' })
        }

        
        if (userInfo.isAuth === true)
        {
            arr.push({ name: 'action:user-signout', title: 'Sign Out', href: '#', css: 'action signout' })
        }
        else 
        {
            arr.push({ name: 'action:user-signin', title: 'Sign In', href: '#', css: 'action signin' })
        }

        // arr.push({ name: 'home', href: '/', title: ' Public Home ', css: 'public-home', target: '_blank' })

        return arr
    }

    _notifyNetworkStatus(e?)
    {
        let oldOffline = this.offline
        this.offline = !navigator.onLine
        // Show the snackbar if the user is offline when starting a new session
        // or if the network status changed.
        if (this.offline || (!this.offline && oldOffline === true))
        {
            if (!this._networkSnackbar)
            {
                this._networkSnackbar = new UISnackbar()
                this._networkSnackbar.addEventListener('api-ui-snackbar-closed', (e) => 
                {
                    //
                })
                this.shadowRoot?.appendChild(this._networkSnackbar)
            }
            this._networkSnackbar.close()
            this.async(() => {
                this._networkSnackbar.strong = this.offline
                this._networkSnackbar.timeout = this.offline ? undefined : 2 * 1000
                this._networkSnackbar.innerHTML = this.offline ? "You are offline" : "You are online"
                this._networkSnackbar.open()
            }, 300)
        }
    }

    onBarcode(barcode)
    {
        if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['onBarcode'])
        {
            var recentPage = this.ui.pages.selectedItem as WorkstationBase
            recentPage.onBarcode(barcode)
        }
    }
    
    _checkVersionViaAPIDebouncer: Debouncer
    async _signalr()
    {
        if (!this._signalrStarter) { return }
        this._signalrStarter = false

        // console.log('_signalr', this.userInfo)
        Teamatical.SignalR = new SignalRGlobal()
        
        var bindConnectionMessage = (connection) =>
        {
            var connectionIdAssignedCallback = (str) => 
            {
                var pobj: any = null
                try { pobj = JSON.parse(str) } catch { }
                // if (pobj && pobj.AppVer && pobj.AppVer !== this.versionStr)
                // {
                //     this._checkVersionViaAPIDebouncer = Debouncer.debounce(this._checkVersionViaAPIDebouncer, timeOut.after(2400), () =>
                //     {
                //         this._checkVersionViaAPI()
                //     })
                // }
                
                if (pobj && pobj.ConnectionId)
                {
                    NetBase.prototype.__static_set_signalr_connid(pobj.ConnectionId)

                    if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_ReconnectHandler'])
                    {
                        var recentPage = this.ui.pages.selectedItem as IAdminSignalR
                        recentPage.SR_ReconnectHandler()
                    }
                }
            }

            var messageCallback = (name, message, group) =>
			{
				if (!message) { return }

                // {"type":1,"target":"broadcastMessage","arguments":["app-ver","1.0.0-3648","Production"]}
				if (name == 'app-ver')
				{
                    this._checkVersionViaAPIDebouncer = Debouncer.debounce(this._checkVersionViaAPIDebouncer, timeOut.after(2400), () =>
                    {
                        this._checkVersionViaAPI()
                    })

                    if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_VersionUpdated'])
                    {
                        var recentPage = this.ui.pages.selectedItem as IAdminSignalR_VersionUpdated
                        var vobj: any = {
                            current: this.versionStr,
                            version: message,
                            env: group,
                        }
                        recentPage.SR_VersionUpdated(vobj)
                    }
                }
			}

            var manufactureOrderProgressCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_TaskProgressHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_PrintingProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch {}
                    recentPage.SR_TaskProgressHandler(pobj)
                }
            }
            
            var manufactureOrderListChangedCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_OrderListHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_PrintingProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_OrderListHandler(pobj)
                }
            }

            var replacementsOrderProgressCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_TaskProgressHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_ReplacementsProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_TaskProgressHandler(pobj)
                }
            }

            var replacementsOrderListChangedCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_OrderListHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_ReplacementsProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_OrderListHandler(pobj)
                }
            }
            
            var printingTuningReplacementsProcessedCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_PrintingTuningProcessedHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_RollInspectionProgress
                    // var pobj: any = null
                    // try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_PrintingTuningProcessedHandler(str)
                }
            }
            
            var shippingAggregationCellCompleteCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_ShippingAggregationCellCompleteHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_ShippingProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_ShippingAggregationCellCompleteHandler(pobj)
                }
            }

            var freightsListChangedCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_FreightsListChangedHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_FreightsProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_FreightsListChangedHandler(pobj)
                }
            }
            var freightChangedCallback = (str) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_FreightChangedHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR_FreightsProgress
                    var pobj: any = null
                    try { pobj = JSON.parse(str) } catch { }
                    recentPage.SR_FreightChangedHandler(pobj)
                }
            }

            // 

            // Create a function that the hub can call to broadcast messages.
            connection.on('broadcastMessage', messageCallback)
            connection.on('connectionIdAssigned', connectionIdAssignedCallback)
            connection.on('manufactureOrderProgress', manufactureOrderProgressCallback)
            connection.on('manufactureOrderListChanged', manufactureOrderListChangedCallback)
            connection.on('printingTuningReplacementsProcessed', printingTuningReplacementsProcessedCallback)
            connection.on('shippingAggregationCellComplete', shippingAggregationCellCompleteCallback)
            connection.on('replacementsOrderProgress', replacementsOrderProgressCallback)
            connection.on('replacementsOrderListChanged', replacementsOrderListChangedCallback)
            connection.on('freightsListChanged', freightsListChangedCallback)
            connection.on('freightChanged', freightChangedCallback)
            
            
            
            
            //connection.onreconnecting
			//console.assert(connection.state === signalR.HubConnectionState.Reconnecting)

            connection.onclose((e) =>
            {
                if (this.ui.pages && this.ui.pages.selectedItem && this.ui.pages.selectedItem['SR_DisconnectHandler'])
                {
                    var recentPage = this.ui.pages.selectedItem as IAdminSignalR
                    recentPage.SR_DisconnectHandler()
                }

                // setTimeout(() =>
                // {
                //     start()
                // }, 2000 + RandomInteger(-400, 400))
                // console.log(e, connection.state)

                // this._fallbackRequest = true
            })
        }


        // var start = () => 
        // {
        // console.log('hub start')
        var netbase = NetBase.prototype
        var opt: IHttpConnectionOptions = {
            accessTokenFactory: async () =>
            {
                return await netbase._getAccessToken()
            }
        }
        var connection:HubConnection = new HubConnectionBuilder()
            .withUrl('/api-signalr/hubs/admin-progress', opt)
            // .withHubProtocol(JsonHubProtocol)
            // .AddNewtonsoftJsonProtocol()
            .withAutomaticReconnect()
            .configureLogging(this.env == 'Production' ? LogLevel.Warning : LogLevel.Warning)
            .build()

        bindConnectionMessage(connection)

        // connection.serverTimeoutInMilliseconds = 1000 * 60 * 10

        connection.start()
            .then(() =>
            {
                // this._fallbackRequest = false
                // console.log('connection started', connection.id)
            })
            .catch((error) =>
            {
                // setTimeout(() =>
                // {
                //     start()
                // }, 12000 + RandomInteger(-4000, 4000))
                // this._fallbackRequest = true

                // if (error)
                // {
                //     if (error.message)
                //     {
                //         // console.error(error.message)
                //     }
                //     if (error.statusCode && error.statusCode === 401)
                //     {
                //         // appendMessage('_BROADCAST_', 'You\'re not logged in. Click <a href="/login">here</a> to login with GitHub.')
                //     }
                // }
            })
        // }
        // start()
    }

    netbaseVersion: NetBase
    _checkVersionViaAPI()
	{
		if (!this.netbaseVersion) { this.netbaseVersion = new NetBase() }

		var rq = {
			url: this.websiteUrl + '/api/v1.0/health/app-ver',
			onLoad: this._onRequestResponse.bind(this),
			onError: this._onRequestError.bind(this)
		}
		this.netbaseVersion._getResource(rq, 1, true)
	}

	_onRequestResponse(event)
	{
		var r = event['response']
		if (r && r['success'])
		{
			this.versionStrNew = r['result']
			if (this.versionStrNew != this.versionStr)
			{
				this._wrongVersionHandler()
			}
		}
		else
		{
			this._onRequestError(event)
		}
	}

    _onRequestError(event)
	{
		// console.error(event)
	}

    _wrongVersionHandler()
    {
        var msg = this.localize('admin-app-toast-newversion', 'ver', this.versionStrNew, 'oldver', this.versionStr)
        console.warn(msg)
        if (!this._snackbarAppVersion)
        {
            this._snackbarAppVersion = new UISnackbar()
            this._snackbarAppVersion.timeout = 30 * 1000
            this.shadowRoot?.appendChild(this._snackbarAppVersion)
        }
        this._snackbarAppVersion.innerHTML = `<span class="link" onclick="javascript:dispatchEvent(new CustomEvent('api-reload-byversion', { bubbles: true, composed: true, detail: {} }))">${msg}</span>`
        this._snackbarAppVersion.open()

        //start countdown
        this._countdownAppVersionSec = 30
        if (this._countdownAppVersionTimer) { clearInterval(this._countdownAppVersionTimer) }
        this._countdownAppVersionTimer = setInterval((e) => this._countdownAppVersionTimerHandler(e), 1000)
    }

    _countdownAppVersionTimerHandler(e)
    {
        this._countdownAppVersionSec--
        if (this._countdownAppVersionSec <= 0)
        {
            if (this._countdownAppVersionTimer) { clearInterval(this._countdownAppVersionTimer) }
            
            this._reloadWindowLocation()
        }
    }

    newVersionTap(e)
    {
        this._reloadWindowLocation()
    }

    detectExtension(callback)
    {
        const extensionId = 'lecbnjgllcdkchpnlekoaklhgijkfegi'
        // Code from https://groups.google.com/a/chromium.org/d/msg/chromium-extensions/8ArcsWMBaM4/2GKwVOZm1qMJ
        if (!callback) callback = () => { }

        var img = new Image()
        img.onload = () => { callback(true) }
        img.onerror = () => { callback(false) }
        img.src = "chrome-extension://" + extensionId + "/manifest/icon-16x16.png"
    }
}
