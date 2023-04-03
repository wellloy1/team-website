import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { UserInfoModel, UserInfoModelFirstloadList } from '../dal/user-info-model'
import { NetBase } from './net-base'
import { StringUtil } from '../utils/StringUtil'
import { CookieUtils } from '../utils/CookieUtils'
import { CustomElement, sleep } from '../utils/CommonUtils'
import { Auth0Client } from '@auth0/auth0-spa-js'
import { Auth0ClientOptions, GetTokenSilentlyOptions } from '@auth0/auth0-spa-js/dist/typings/global'
import { UserBotData } from './user-bot-data'
declare const jwt_decode: any //?

export const ALMIGHTY_ACCESS_MODE = 'all:data'
export const ADMIN_ACCESS_READ = 'read:data'
export const ADMIN_ACCESS_WRITE = 'write:data'
export const MANUFACTURER_ACCESS_READ = 'read:orders'
export const MANUFACTURER_ACCESS_WRITE = 'write:orders'
export const DESIGNER_ACCESS_PUBLISH = 'publish:patterns'
export const DESIGNER_ACCESS_ADMIN = 'admin:patterns'
export const CUSTOMERSERVICE_ACCESS_READ = 'read:customers'
export const CUSTOMERSERVICE_ACCESS_WRITE = 'write:customers'
export const PARTNER_ACCESS_READ = 'read:partner'
export const PARTNER_ACCESS_WRITE = 'write:partner'
const LOCALSTORAGE_AUTH0KEY = `@@auth0spajs@@::4MOEJneIgipqW1agZrmO2WpYMY3Uv4cc::{AUTH_AUDIENCE}::{ACCESS_SIGNIN_SCOPE} offline_access`
const responseType = 'token id_token'
const SIGNINPAGE = 'signin'
const SIGNOUTPAGE = 'signout'


@CustomElement
export class UserData extends NetBase
{
    static get is() { return 'teamatical-user-data' }

    static get template()
    {
        return html`<app-localstorage-document key="user-auth-info" data="{{userInfoCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            auth0Loaded: { type: Boolean, notify: true, },
            userInfo: { type: Object, notify: true,  }, //value: null - due to setOrganization
            userInfoCache: { type: Object, notify: true }, //, value: null
            queryParams: { type: Object, notify: true },
            auth0: { type: Object },
            authDomain: { type: String, value: "teamatical.auth0.com" },
            authAudience: { type: String, value: "https://www.teamatical.com/api/v1.0" },
            authScope: { type: String, value: "openid profile email all:data write:data read:data read:orders write:orders read:customers write:customers publish:patterns admin:patterns read:partner write:partner" },
            websiteUrl: { type: String },
            homeUrl: { type: String }, //home-url
            selectedPage: { type: String },
            pageProgress: { type: Boolean },
            env: { type: String },
            offline: { type: Boolean },

            authSaving: { type: Boolean, notify: true, readOnly: true }, //auth-saving

            _firstCacheLoad: { type: Boolean, notify: true, value: true }, //userInfoCacheReady
        }
    }

    static get observers()
    {
        return [
            '_selectedPageChanged(selectedPage, pageProgress, userInfo.isAuth, userInfo.customstoreUrl)',
            '_userinfoChanged(userInfo, userInfo.*)',
            '_userInfoCacheChanged(userInfoCache)',
            // '_log(_firstCacheLoad)'
        ]
    }
    _log(v) { console.log(v) }


    //most used fields: 2020-02-06
    // isAuth, 47
    // isAdmin, 42
    // isPrinter, 7
    // isMergedNew, 4 
    // profile, 8
    // access_token, 6
    // expires_at, 4
    // id_token, 1


    //#region vars

    _setAuthSaving: any
    // _tokenRenewalTimeout: any
    // _scheduleRenewalTokenDebouncer: Debouncer
    _firstCacheLoad: boolean
    _siginDebouncer: Debouncer
    auth0Loaded: boolean
    userInfo: UserInfoModel
    auth0: Auth0Client | null = null
    websiteUrl: string
    homeUrl: string
    selectedPage: string
    pageProgress: any
    env: string
    offline: boolean
    _userinfolock: boolean
    _userinfoCachelock: boolean
    queryParams: any
    _lock: boolean
    authDomain: string
    authAudience: string
    authScope: string

    //#endregion


    get auth0Options()
    {
        return {
            client_id: '4MOEJneIgipqW1agZrmO2WpYMY3Uv4cc',
            scope: this.authScope,
            response_type: responseType,
            redirect_uri: this.websiteUrl + this._hrefSignIn(),
            domain: this.authDomain, 
            audience: this.authAudience, 
            // issuer
            // leeway
            // id_token_hint
            cacheLocation: 'localstorage',
            useRefreshTokens: true,
        } as Auth0ClientOptions
    }

    constructor()
    {
        super()

        this.__static_set_userdata(this)

        //need to check is login progress is going
        var qp: any = StringUtil.parsequery(window.location.search)
        if (qp?.code && qp?.state)
        {
            this._setAuthSaving(true) //to make sure signin in progress...
        }
        
        //this._log('1')
        window.addEventListener('load', async () =>
        {
            //when large localcache it might be need to wait for
            for (var i of [...Array(50).keys()])
            {
                console.log('auth ' + i)
                if (!this._firstCacheLoad) { break }
                await sleep(17)
            }
            //this._log('2')
            await this._handleAuth()
        })
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    async _selectedPageChanged(selectedPage, pageProgress, isAuth, customstoreUrl)
    {
        if (this._lock) { return }
        var signoutFlag = window.history.state ? (window.history.state['signout'] === true && window.history.state['auth0'] === true) : false
        var signinFlag = window.history.state ? (window.history.state['signin'] === true && window.history.state['auth0'] === true) : false
        var signupFlag = window.history.state ? (window.history.state['signup_page'] === true && window.history.state['auth0'] === true) : false
        var returnUrl = window.history.state ? (window.history.state['returnUrl'] || window.location.href) : window.location.href

        // var flags = ''
        // if (signoutFlag) { flags += `| sign OUT` }
        // if (signinFlag) { flags += `| sign IN` }
        // if (signupFlag) { flags += `| sign UP` }
        // console.log('_selectedPageChanged =>', flags, pageProgress ? 'pageProgress ... ,' : 'pageProgress DONE,', `isAuth: ${isAuth},`, ` p: ${selectedPage},`, `returnUrl: ${returnUrl}`)

        if (selectedPage == SIGNOUTPAGE && signoutFlag)
        {
            this._setAuthSaving(true)
            if (pageProgress === false)
            {
                try
                {
                    var auth0ReturnUrl = StringUtil.urlquery(window.location.href, { returnUrl: returnUrl })
                    // console.log('_selectedPageChanged =>', `auth0.logout`)
                    var auth0 = await this._getAuth()
                    await auth0?.logout({
                        returnTo: auth0ReturnUrl,
                        client_id: this.auth0Options.client_id,
                    })
                }
                catch (ex)
                {
                    console.log(ex)
                }
            }
        }
        else if (selectedPage == SIGNOUTPAGE && this.queryParams['returnUrl'])
        {
            const redirectUri = this.queryParams['returnUrl'] 

            this._lock = true
            this.set('userInfo', Object.assign({}, new UserInfoModel(), { customstoreUrl: customstoreUrl }))
            this._lock = false

            this.dispatchEvent(new CustomEvent('api-user-auth-changed', { bubbles: true, composed: true, detail: { 
                signin: this.userInfo.isAuth, 
                signout: true 
            } }))

            // window.history.pushState(window.history.state, '', redirectUri) // --- Edge 18 issue
            window.history.replaceState(null, '', redirectUri) 
            window.dispatchEvent(new CustomEvent('location-changed'))

            this._serverSignoutNotify()
        }
        else if (selectedPage == SIGNINPAGE && signinFlag)
        {
            this._setAuthSaving(true)
            if (pageProgress === false)
            {
                var ui_locales = `${this.language.substr(0, 2)}`
                var auth0ReturnUrl = StringUtil.urlquery(window.location.href, { returnUrl: returnUrl })

                var opt = {
                    ui_locales: ui_locales,
                    redirect_uri: auth0ReturnUrl,
                    prompt: undefined,
                    screen_hint: undefined,
                } as any
                if (signupFlag)
                {
                    opt.prompt = 'login'
                    opt.screen_hint = 'signup'
                }

                //     this._siginDebouncer = Debouncer.debounce(this._siginDebouncer, timeOut.after(this.asyncWSignInStart), async () =>
                try
                {
                    var auth0 = await this._getAuth()
                    await auth0?.loginWithRedirect(opt)
                }
                catch (ex)
                {
                    console.error(ex)
                    // e.reason.message !== 'Unknown or invalid refresh token.')
                }
            }
        }
    }

    async _handleAuth()
    {
        var auth0 = await this._getAuth()
        if (!auth0) { return }

        if (this.selectedPage == SIGNINPAGE)
        {
            if (this.queryParams && this.queryParams['code'] && this.queryParams['state'])
            {
                this._setAuthSaving(true)

                var qp = this.queryParams
                try
                {
                    await auth0.handleRedirectCallback() //handle Auth
                    var isauth = await auth0.isAuthenticated()
                    if (isauth)
                    {
                        const accessToken = await auth0.getTokenSilently({ audience: this.auth0Options.audience } as GetTokenSilentlyOptions)
                        if (accessToken)
                        {
                            var user = await auth0.getUser() //{ audience: this.auth0Options.audience } as GetUserOptions
                            var claims = await auth0.getIdTokenClaims()
                            await this._saveAuth(accessToken, null, claims?.__raw, user, claims?.exp)
                            this._serverSigninNotify() //-> wait for user transfer -> after done -> redirect to initial page
                        }
                        this._clearOldNonces()
                    }

                    var returnUrl = qp['returnUrl']
                    delete qp['code']
                    delete qp['state']
                    delete qp['returnUrl']
                    window.history.replaceState({ auth0Done: true }, '', returnUrl)
                    window.dispatchEvent(new CustomEvent('location-changed'))
                    this._setAuthSaving(false)
                }
                catch (ex)
                {
                    if (this._dev)
                    {
                        console.warn('auth0 failed', ex)
                    }
                    else
                    {
                        delete qp['code']
                        delete qp['state']
                        delete qp['returnUrl']
                        window.history.replaceState({ }, '', StringUtil.urlquery(document.location.pathname, qp))
                    }

                    var url = returnUrl ? returnUrl : this.homeUrl
                    window.history.replaceState({}, '', url)
                    window.dispatchEvent(new CustomEvent('location-changed'))
                    this._setAuthSaving(false)
                }
            }
            else if (this.queryParams && this.queryParams['error'] && this.queryParams['state'])
            {
                var qp = this.queryParams
                var returnUrl = qp['returnUrl']
                let err = qp['error']
                let err_msg = qp['error_description']

                delete qp['returnUrl']
                delete qp['error']
                delete qp['error_description']
                delete qp['state']
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))

                var barr = [
                    {
                        title: this.localize('app-access-denied-ok'),
                        ontap: (e) => 
                        {
                            var path = this.homeUrl
                            window.history.pushState({}, '', path)
                            window.dispatchEvent(new CustomEvent('location-changed'))
                        }
                    }
                ]

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: err,
                        message: err_msg,
                        buttons: barr,
                    }
                }))
            }
        } 
        else //if (this.selectedPage != SIGNOUTPAGE)
        {
            var isauth = await auth0.isAuthenticated()
            if (this.userInfo?.isAuth && !isauth)
            {
                this._saveAuth(null)
            }
        }
    }

    SignIn(redirect?, signup_page = false)
    {
        const recentPath = window.location.pathname
        const signinPath = this._hrefSignIn()

        if (recentPath.indexOf(signinPath) >= 0) //already signin page
        {
            window.history.replaceState({ auth0: true, signin: true, returnUrl: redirect, signup_page: signup_page }, 'auth0', signinPath)
            this._selectedPageChanged(this.selectedPage, this.pageProgress, this.userInfo.isAuth, this.userInfo.customstoreUrl)
        }
        else //other page or url
        {
            redirect = redirect ? redirect : window.location.href.replace('#app-drawer', '')
            if (window.location.hash == '#app-drawer')
            {
                window.history.replaceState({ auth0: true, signin: true, returnUrl: redirect, signup_page: signup_page }, 'auth0', signinPath)
            }
            else
            {
                window.history.pushState({ auth0: true, signin: true, returnUrl: redirect, signup_page: signup_page }, 'auth0', signinPath)
            }
            window.dispatchEvent(new CustomEvent('location-changed'))

            if (recentPath.startsWith('/admin') || !this.auth0) 
            {
                console.warn('auth0 = null or goes to /admin')
                this._reloadWindowLocation()
            }
        }
    }

    SignOut(redirect?)
    {
        const signoutPath = this._hrefSignOut()
        redirect = redirect ? redirect : window.location.href.replace('#app-drawer', '')

        if (window.location.pathname.indexOf(signoutPath) >= 0) 
        {
            window.history.replaceState({ auth0: true, signout: true, returnUrl: redirect }, 'auth0', signoutPath)
            this._selectedPageChanged(this.selectedPage, this.pageProgress, this.userInfo.isAuth, this.userInfo.customstoreUrl)
        }
        else
        {
            if (window.location.hash == '#app-drawer')
            {
                window.history.replaceState({ auth0: true, signout: true, returnUrl: redirect }, 'auth0', signoutPath)
            }
            else
            {
                window.history.pushState({ auth0: true, signout: true, returnUrl: redirect }, 'auth0', signoutPath)
            }
        }
        window.dispatchEvent(new CustomEvent('location-changed'))
    }

    SignUp(redirect?)
    {
        return this.SignIn(redirect, true)
    }

    async SignNot()
    {
        await this._saveAuth(null)
    }

    checkAccess(accessObj, accessList, atLeast = true)
    {
        if (!accessObj) { return false }

        var scopearr = (accessObj.scope || '').split(' ')
        var permissions = (accessObj.permissions ? accessObj.permissions : scopearr)
        var allowarr = permissions.filter((item) =>
        {
            return accessList.find((element, index, array) => { return element == item })
        })
        // console.log(atLeast, allowarr.length, accessList.length)
        return (atLeast ? allowarr.length > 0 : allowarr.length == accessList.length)
    }

    _userInfoCacheChanged(userInfoCache)
    {
        if (userInfoCache === undefined || this._userinfoCachelock) { return }
       
        var userInfo = this.userInfo
        if (this._firstCacheLoad && userInfo)
        {
            let keep = {}
            for (var keyi of UserInfoModelFirstloadList)
            {
                keep[keyi] = userInfo[keyi]
            }
            userInfo = userInfo ? Object.assign({}, userInfoCache, keep) : userInfoCache
        }
        else
        {
            userInfo = Object.assign({}, userInfoCache)
            for (var keyi of UserInfoModelFirstloadList)
            {
                delete userInfo[keyi]
            }
        }
        this.set('userInfo', userInfo)
        this._firstCacheLoad = false
    }

    _userinfoChanged(userInfo, userInfoP)
    {
        // console.log('userinfo', userInfoP)
        //set static value for all net-base successors
        if (userInfo?.isBotAuth === true)
        {
            //do nothing
        }
        else
        {
            this._userinfoCachelock = true
            this.set('userInfoCache', this.userInfo)
            this._userinfoCachelock = false
        }
    }

    async _getAuth()
    {
        var createAuth0Client: any = null
        if (!createAuth0Client)
        {
            const module = await import('@auth0/auth0-spa-js')
            createAuth0Client = module.default
        }
        const tryGetAuth = async (t = 0) => 
        {
            try
            {
                if (t > 0) 
                {
                    //Woops something wrong with Auth0 - let's start over
                    await this._saveAuth(null)
                    var lstorage = StringUtil.replaceAll(LOCALSTORAGE_AUTH0KEY, '{AUTH_AUDIENCE}', this.authAudience) 
                    lstorage = StringUtil.replaceAll(lstorage, '{ACCESS_SIGNIN_SCOPE}', this.authScope) 
                    window.localStorage.removeItem(lstorage) 
                }
                this.auth0 = await createAuth0Client(this.auth0Options)
                return this.auth0
            }
            catch (ex)
            {
                console.error(ex)
                if (ex.error !== 'login_required')
                {
                    await this._saveAuth(null)
                    this.SignIn(window.location.href)
                    return null
                }
                if (t > 0)
                {
                    await this._saveAuth(null)
                    return null
                }
            }
        }

        var r = await tryGetAuth(0)
        if (!r) { r = await tryGetAuth(1) }
        return r
    }

    _clearOldNonces(start?)
    {
        // if (CookieUtils.getCookie('auth0.is.authenticated') !== undefined)
        // {
        //     // console.log('try delete cookie - auth0.is.authenticated')
        //     CookieUtils.deleteCookie('auth0.is.authenticated') //to avoid issues
        // }

        var cookies = CookieUtils.getCookies('a0.spajs.')
        if (this._dev) console.log('a0.spajs.*', cookies)
        for (var i in cookies)
        {
            // console.log('try delete cookie - ', i)
            CookieUtils.deleteCookie(i, { expires: -1, path: '/' })
        }
    }

    _lastUserBotData: UserBotData
    async setBotAccessToken(userBotData, accessToken, expires_in)
    {
        this._lastUserBotData = userBotData
        await this._saveAuth(accessToken, true, null, null, expires_in)
    }

    async getNetBaseAccessToken()
    {
        if (this.userInfo?.isBotAuth && this.userInfo?.access_token)
        {
            return this.userInfo.access_token
        }

        const awaitAuth = async () => {
            for (var i = 0; i < 1000; i++)
            {
                if (this.auth0) { return this.auth0 }
                await sleep(5)
            }
        }
        // var a = this._now()
        var thisauth0 = await awaitAuth() //need for m2m auth (workstations)
        // console.log(this._now() - a)
        if (thisauth0 == null) { return null }

        var isauth = await thisauth0.isAuthenticated()
        if (!isauth) { return null }

        try
        {
            const accessToken = await thisauth0.getTokenSilently({ audience: this.auth0Options.audience } as GetTokenSilentlyOptions)
            if (accessToken)
            {
                var user = await thisauth0.getUser() //{ audience: this.auth0Options.audience } as GetUserOptions
                var claims = await thisauth0.getIdTokenClaims()
                await this._saveAuth(accessToken, null, claims?.__raw, user, claims?.exp)
            }
            return accessToken
        }
        catch(ex)
        {
            console.log(ex)
            await this._saveAuth(null)
            if (ex.error == "login_required")
            {
                // this.SignIn(window.location.href)
            }
            return null
        }
    }

    async _saveAuth(accessToken, isBotAuth: boolean | null = null, id_token: string | null = null, profile: any = null, expires_in: number | null = null)
    {
        if (!accessToken) 
        { 
            this.set('userInfo', new UserInfoModel()) 
            if (this._dev) console.log('auth0 - has no authorization flag -> RESET!!!')
            return //EXIT!!!
        }

        var userInfo = Object.assign(new UserInfoModel(), this.userInfo ? this.userInfo : {})
        var userInfoWas = JSON.stringify(userInfo)
        if (this._dev) 
        {
            if (userInfo.access_token && userInfo.access_token !== accessToken) { console.log('auth0 - new access token:', StringUtil.cyrb53(userInfo.access_token), '=>', StringUtil.cyrb53(accessToken)) }
            // else { console.log('auth0 - token THE SAME') }
        }

        // Set the time that the access token will expire at
        if (id_token) { userInfo.id_token = id_token }
        if (expires_in) { userInfo.expires_at = expires_in * 1000 }
        if (profile) { userInfo.profile = profile }
        if (isBotAuth !== null) { userInfo.isBotAuth = isBotAuth }
        userInfo.isAuth = true
        userInfo.access_token = accessToken

        
        var accessObj = await this.decodeAccess(userInfo.access_token)
        if (userInfo.isAuth && accessObj)
        {
            userInfo.isAlmighty = this.checkAccess(accessObj, [ALMIGHTY_ACCESS_MODE], true)
            userInfo.isAdmin = this.checkAccess(accessObj, [ADMIN_ACCESS_READ], true)
            userInfo.isPrinter = this.checkAccess(accessObj, [MANUFACTURER_ACCESS_READ], true)
            userInfo.isDesigner = this.checkAccess(accessObj, [DESIGNER_ACCESS_PUBLISH], true)
            userInfo.isDesignerAdmin = this.checkAccess(accessObj, [DESIGNER_ACCESS_ADMIN], true)
            userInfo.isCustomerService = this.checkAccess(accessObj, [CUSTOMERSERVICE_ACCESS_READ], true)
            userInfo.isPartner = this.checkAccess(accessObj, [PARTNER_ACCESS_READ], true)
        }

        // console.log(userInfoWas, JSON.stringify(userInfo))
        if (userInfoWas != JSON.stringify(userInfo))
        {
            this.set('userInfo', userInfo)
        }
    }

    private async decodeAccess(access_token)
    {
        await import('../utils/jwt-decode.js')

        if (typeof (access_token) == 'string' && access_token != '')
        {
            return jwt_decode(access_token)
        }
        return null
    }

    getOrganizationID()
    {
        return this.userInfo?.orgId
    }

    getContext()
    {
        return {
            customstoreUrl: this.userInfo?.customstoreUrl,
        }
    }
    
    setContext(customstoreUrl)
    {
        if (!this.userInfo)  { this.userInfo = new UserInfoModel() }
        this.setProperties({
            'userInfo.customstoreUrl': customstoreUrl,
        })
    }

    setOrganization(orgUser, orgId, orgName, orgAllowPo = false, orgSubdomain: string | null = null)
    {
        const orgUserSelected = (new Boolean(orgId) == true)
        // if (this._dev) console.log('userdata.setOrganization -> id: ', orgId, ' | name: ', orgName, ' | subdomain: ', orgSubdomain, ' | orgUser:', orgUser, ' | orgUserSelected:', orgUserSelected, ' | orgAllowPo: ', orgAllowPo)

        if (!this.userInfo)  { this.userInfo = new UserInfoModel() }

        this.setProperties({
            //user's current organization
            'userInfo.orgUser': orgUser,
            'userInfo.orgUserSelected': orgUserSelected,
            'userInfo.orgId': orgId,
            'userInfo.orgName': orgName,

            //organization subdomain 
            'userInfo.orgAllowPo': orgAllowPo, //related to Org Subdomain
        })

        //organization subdomain 
        if (orgSubdomain !== null) { this.set('userInfo.orgSubdomain', orgSubdomain) }
    }

    _serverSigninNotify()
    {
        var rq = {
            url: this.websiteUrl + '/api/v1.0/user/signin-done',
            onLoad: this._onSiginDoneRequest.bind(this),
            onError: this._onSiginDoneRequest.bind(this)
        }
        this._getResource(rq, 1, true)
    }

    _onSiginDoneRequest(e)
    {
        var r = e['response']
        if (r && r['success'])
        {
            var result = r['result']
            // console.log(result)
            if (this.userInfo && result['CartMerge'] === true)
            {
                this.userInfo.isMergedNew = true
            }
            if (this.userInfo && result['IsOrganizationUser'] !== undefined && result['OrganizationID'] !== undefined && result['OrganizationName'] !== undefined)
            {
                this.setOrganization(result['IsOrganizationUser'], result['OrganizationID'], result['OrganizationName'], result['IsOrganizationPO'])
            }
            if (result['ShoppingCartCount'])
            {
                this.dispatchEvent(new CustomEvent('api-cart-count-set', { bubbles: true, composed: true, detail: { shoppingCartCount: result['ShoppingCartCount']  } }))
            }
        }
        else
        {
            console.error(e)
            // this._onSiginDoneError(event)
        }

        //page|signin#auth0|-auth0-|signin#XXX->[go-3|page]
        // if (this.userInfo && this.userInfo.redirectUri)
        // {
        //     this.async(() =>
        //     {
        //         window.history.replaceState({}, '', this.userInfo.redirectUri)
        //         window.dispatchEvent(new CustomEvent('location-changed'))
        //     }, this.asyncWSignInDone)
        // }

        this.dispatchEvent(new CustomEvent('api-user-auth-changed', { bubbles: true, composed: true, detail: { signin: this.userInfo.isAuth } }))
    }

    _serverSignoutNotify()
    {
        var rq = {
            url: this.websiteUrl + '/api/v1.0/user/signout-done',
            onLoad: this._onSigoutDoneRequest.bind(this),
            onError: this._onSigoutDoneRequest.bind(this)
        }
        this._getResource(rq, 1, true)
    }

    _onSigoutDoneRequest(e)
    {
        //none
    }

}