import '@polymer/iron-ajax/iron-ajax.js'
import '@polymer/iron-ajax/iron-request.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
//---component---
import { RandomInteger } from '../utils/MathExtensions'
import { StringUtil } from '../utils/StringUtil'
import { CustomElement, sleep } from '../utils/CommonUtils'
import { LocalizeBehaviorBase } from '../bll/localize-behavior'
import { UserData } from '../bll/user-data'
//---consts---
const Teamatical = window['Teamatical'] as TeamaticalGlobals
const __signalRConnKey = '__signalRConnKey'
const __userdataKey = '__userDataKey'
const AUTH_HEADERNAME = 'Authorization'
const TM_HREF_HEADERNAME = 'X-TM-HREF'
const TM_TIMEZONE_HEADERNAME = 'X-TM-TZ'
const SIGNALR_HEADERNAME = 'SignalR'
// const LANG_HEADERNAME = 'language'
const ORG_HEADERNAME = 'organization'
const CUSTOMSTORECONTEXT_HEADERNAME = 'CustomstoreContext'



@CustomElement
export class NetBase extends LocalizeBehaviorBase
{
    static get is() { return 'teamatical-netbase' }

    ajax: any = null
    recentrq: any = null
    requests: any = []
    _getResourceDebouncer: any
    _dev: boolean


    constructor()
    {
        super()

        this._dev = Teamatical.BuildEnv == 'Development'
    }


    //#region  Common Helpers

    async(func, t: number | undefined = 0)
    {
        timeOut.run(func, t)
    }

    _nowperf()
    {
        return window.performance && 'now' in window.performance ? performance.now() : new Date().getTime()
    }

    _now()
    {
        return new Date().getTime()
    }

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        if (!websiteUrl || !APIPath || !api_action) { return '' }
        return websiteUrl + APIPath + api_action
    }

    //#endregion


    //#region  Navigation Helpers

    _reloadWindowLocation()
    {
        if (window?.toAndroidDevice?.reloadPage)
        {
            try
            {
                window.toAndroidDevice.reloadPage()
            }
            catch (ex)
            {
                // window.location.reload()
            }
        }
        else
        {
            window.location.reload()
        }
    }

    _hrefCart()
    {
        return '/cart'
    }

    _hrefDetail(pid, catName, queryParams = {})
    {
        return pid ? StringUtil.urlquery(['/detail', catName, pid].join('/'), queryParams) : ''
    }

    _hrefSignIn()
    {
        return '/signin'
    }

    _hrefSignOut()
    {
        return '/signout'
    }

    _hrefAccount()
    {
        return '/account'
    }

    _hrefAccountOrders()
    {
        return this._hrefAccount()
    }

    _hrefAccountPurchaseInvoice(inid, queryParams = {})
    {
        return inid ? StringUtil.urlquery(['/account-purchase-invoice', inid].join('/'), queryParams) : ''
    }


    // GO TO ..
    _goto(href)
    {
        if (!href) { return }
        window.history.pushState({}, '', href)
        window.dispatchEvent(new CustomEvent('location-changed'))
    }

    _gotoRS(href)
    {
        if (!href) { return }
        window.history.replaceState({}, '', href)
        window.dispatchEvent(new CustomEvent('location-changed'))
    }
    
    _gotoRoot()
    {
        this._goto('/')
    }

    _gotoCart()
    {
        this._goto(this._hrefCart())
    }

    _gotoProduct(pid, catName, queryParams = {}, replaceState = false)
    {
        var href = this._hrefDetail(pid, catName, queryParams)
        if (href && replaceState)
        {
            this._gotoRS(href)
        }
        else if (href && replaceState)
        {
            this._goto(href)
        }
    }

    _gotoProductRS(pid, catName, queryParams = {})
    {
        return this._gotoProduct(pid, catName, queryParams, true)
    }

    _gotoAccount()
    {
        this._goto(this._hrefAccount())
    }

    _gotoAccountOrganizations()
    {
        this._goto('/account-organizations')
    }

    _gotoAccountOrders()
    {
        this._goto(this._hrefAccountOrders())
    }

    _gotoAccountPurchaseInvoice(inid, queryParams = {})
    {
        this._goto(this._hrefAccountPurchaseInvoice(inid, queryParams = {}))
    }

    _gotoAccountPurchaseOrders()
    {
        this._goto('/account-purchase-orders')
    }

    //#endregion


    //#region  Queue Request API Methods

    _getResourceCancel()
    {
        //cancel recent request if any
        if (this.requests.length > 0) 
        {
            // console.log('cancelable ... recent rq: ' + this.requests.length)
            do 
            {
                var rqi = this.requests.shift()
                if (!rqi) 
                {
                    // console.log('this.requests.shift returns UNDEFINED')
                    break
                }
                rqi.canceled = true
                // console.log('canceled ' + JSON.stringify(rqi))
                if (rqi.request && rqi.request.__netbase_abort) { rqi.request.abort() }
            }
            while (this.requests.length < 1)
        }

        if (this.ajax.loading && this.recentrq)
        {
            // console.log('cancelable ... recent rq CURRENT!')
            this.recentrq.__netbase_canceled = true
            if (this.recentrq.request && this.recentrq.__netbase_abort) { this.recentrq.request.abort() }
        }
    }

    _getResource(rq, attempts:number = 1, cancelable:boolean = true, abort = true)
    {
        // if (this._dev) { console.log('net-base', rq.url) }
        // if (rq.body && rq.body.DesignOptionSetList)
        // {
        //     console.logDumpProductSelection(rq.body, 'request ')
        // }

        if (rq === undefined) { rq = {} }
        if (attempts === undefined) { attempts = 1 }
        if (cancelable === undefined) { cancelable = true }
        if (!this.ajax) { this.ajax = document.createElement('iron-ajax') }


        rq['__netbase_attempts'] = attempts
        rq['__netbase_cancelable'] = cancelable
        rq['__netbase_abort'] = abort

        if (cancelable)
        {
            this._getResourceCancel()
        }

        //clone BODY before add to queue
        if (rq.body) { rq.body = JSON.parse(JSON.stringify(rq.body)) }

        this.requests.push(rq)
        if (rq.airstrike == true && !cancelable)
        {
            // console.log('air strike!!!')
            this.__requestsHandleNext()
        }
        else
        {
            if (!this.ajax.loading || (cancelable && abort))
            {
                // console.log('__requestsHandleNext', JSON.parse(JSON.stringify(this.requests)))
                this.__requestsHandleNext()
            }
        }
    }

    __requestsHandleRetry(rq)
    {
        this.__requestsHandle(rq)
    }

    __requestsHandleNext(lastResponse?, lastRQ?)
    {
        if (this.requests.length < 1) { return }

        var rq = this.requests.shift()
        this.async(async () =>
        {
            await this.__requestsHandle(rq, lastResponse, lastRQ)
        })
    }

    async __requestsHandle(rq, lastResponse?, lastRQ?)
    {
        this.recentrq = rq
        if (Array.isArray(rq.contextFields) && rq.contextFields.length > 0
            && lastResponse && lastResponse.success && lastResponse.result
            && rq.__netbase_cancelable && !rq.__netbase_abort)
        {
            for (var i in rq.contextFields)
            {
                let fi = rq.contextFields[i]
                if (lastResponse.result[fi])
                {
                    // console.log(rq.body[fi], ' <=== ', lastResponse.result[fi])
                    rq.body[fi] = lastResponse.result[fi]
                }
            }
            // console.log(rq.contextFields, lastResponse, lastRQ)
        }

        // console.log('_getResource ' + rq.url)
        this.ajax.url = rq.url
        this.ajax.method = rq.method || 'GET'
        this.ajax.handleAs = rq.handleAs || 'json'
        this.ajax.contentType = (rq.contentType === undefined ? 'application/json' : rq.contentType)
        this.ajax.debounceDuration = rq.debounceDuration || 0
        this.ajax.body = rq.body || undefined

        this.ajax.headers = {} //clear
        if (!rq.external) { await this.__setAuthAndHeaders(this.ajax, 'polyajax') }
        if (rq.headers) 
        {
            for (var i in rq.headers)
            {
                this.ajax.headers[i] = rq.headers[i]
            }
        }

        rq.request = this.ajax.generateRequest()
        rq.request.completes.then(this.__onSuccess.bind(this, rq), this.__onError.bind(this, rq))
    }

    __onSuccess(rq, e)
    {
        // console.log('__onSuccess', rq)
        //callback
        if (rq.__netbase_cancelable && rq.__netbase_canceled)
        {
            //
        }
        else
        {
            rq.onLoad.call(undefined, e, rq)
            this.__errorsResponseHandler(e)
        }
        this.__requestsHandleNext(e.response, rq)
    }

    __onError(rq, e)
    {
        // console.log('__onError', rq, e)
        rq.__netbase_attempts -= 1

        if (rq.__netbase_cancelable && rq.__netbase_canceled)
        {
            //rq was canceled by user -> do nothing
        }
        else
        {
            var response = rq.request.__data.response
            if (response && response['error'] && response.error.ReloadPage)
            {
                console.warn('backend reload request ...')
                this._reloadWindowLocation()
            }

            if (e.message == 'The request failed with status code: 403')
            {
                rq.onError.call(undefined, e, rq)

                if (!response || response['success'] !== true)
                {
                    var summary = response ? response['summary'] : null //obj
                    var barr = [
                        {
                            title: this.localize('app-access-denied-ok'),
                            ontap: (e) => 
                            {
                                this._reloadWindowLocation()
                            }
                        },
                        {
                            title: this.localize('app-access-denied-organizations'),
                            ontap: (e) => 
                            {
                                this._gotoAccountOrganizations()
                            }
                        },
                    ]
                    var r = response
                    this.dispatchEvent(new CustomEvent('api-show-dialog', {
                        bubbles: true, composed: true, detail: {
                            required: true,
                            announce: this.localize('app-access-denied-announce'),
                            message: (summary?.Message ? summary.Message : this.localize('app-access-denied-announce')),
                            buttons: barr,
                            errorid: r?.errorid ? r.errorid : null,
                            devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                        }
                    }))
                }
            }
            else if (rq.__netbase_attempts >= 1) // Flaky connections might fail fetching resources
            {
                var rqloop = rq
                rqloop._getResourceDebouncer = Debouncer.debounce(
                    rqloop._getResourceDebouncer,
                    timeOut.after(2200 + RandomInteger(-400, 400)),
                    () =>
                    {
                        this.__requestsHandleRetry(rqloop)
                    }
                )
            }
            else
            {
                rq.onError.call(undefined, e, rq)
                if (e.message == 'The request failed with status code: 503')
                {
                    // console.warn('backend reload request ...')

                    var path503 = '/h503'
                    if (window.location.pathname.startsWith('/admin/workstation-'))
                    {
                        // path503 = '/admin/workstation-h503'
                    }
                    else if(window.location.pathname.startsWith('/admin'))
                    {
                        // path503 = '/admin/h503'
                    }
                    else
                    {
                        this._goto(path503)
                    }
                }
            }
        }
    }

    __errorsResponseGlobalKeys = { 
        'access_denied': true, 
    }

    __errorsResponseHandler(e)
    {
        //called after onLoad handler
        var r = e['response']
        var redirect = r ? r['redirect'] : null
        var summary = r ? r['summary'] : null
        var errorid = r ? r['errorid'] : null
        var devErrorDetails = r ? r['_devErrorDetails'] : null

        if (!r || r['success'] !== true)
        {
            if (summary && (summary.Key == 'access_denied' || summary.Key == 'concurrent_access'))
            {
                var barr = [
                    {
                        title: this.localize('app-access-denied-ok'),
                        ontap: (e) => 
                        {
                            if (summary.Key == 'concurrent_access')
                            {
                                // console.log('concurrent_access -> reload')
                                this._reloadWindowLocation()
                            }
                            else if (summary.Key == 'access_denied')
                            {
                                var path = (window.location.pathname && window.location.pathname.startsWith('/account')) ? ['/account'].join('/') : '/'
                                this._goto(path)
                            }
                        }
                    },
                    // {
                    //     title: this.localize('app-access-denied-signin'),
                    //     ontap: (e) => 
                    //     {
                    //         this.dispatchEvent(new CustomEvent('ui-user-auth', {
                    //             bubbles: true, composed: true, detail: {
                    //                 signin: true
                    //             }
                    //         }))
                    //     }
                    // }
                ]

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('app-access-denied-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
            else if (summary && (summary.Key == 'not_logged'))
            {
                this.dispatchEvent(new CustomEvent('api-user-notlogged', {
                    bubbles: true, composed: true, detail: {
                    }
                }))
            }
            else if ((!summary || (summary.Key != 'subdomain_mismatch')) && redirect && redirect.Url)
            {
                window.location.href = redirect.Url
            }
            else if (summary && (summary.Key == 'subdomain_mismatch') && redirect && redirect.Url)
            {
                var barr = [
                    {
                        title: this.localize('app-redirect-ok'),
                        ontap: (e) => 
                        {
                            window.location.href = redirect.Url
                        }
                    },
                ]
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('app-access-denied-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
        }
    }

    //#endregion


    //#region  Alternative API methods

    async __uploadFileWithProgress(rq)
    {
        const xhr: any = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => 
        {
            if (rq.onProgress) { rq.onProgress(e) }
        }

        xhr.onload = xhr.onerror = (e) => 
        {
            if (xhr.status == 200)
            {
                if (rq.onLoad) { rq.onLoad(e) }
            }
            else
            {
                if (rq.onError) { rq.onError(e) }
            }
        }

        xhr.open(rq.method, rq.url, true)

        await this.__setAuthAndHeaders(xhr, 'xhr')

        xhr.send(rq.body)

        return xhr
    }

    async _apiRequest(url = '', data = {}, method = 'POST', responseType = 'json', retry = { count: 1, summaryKey: '-' }, headers = {})
    {
        if (!url) { return }

        // Default options are marked with *
        var rq = {
            method: method, // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'include', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json',
                // 'Content-Type': 'application/x-www-form-urlencoded',
            } as HeadersInit,
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *client
        } as RequestInit

        await this.__setAuthAndHeaders(rq, 'fetch-api') //implementation for fetch-api
        if (rq.headers)
        {
            for (var h in headers)
            {
                rq.headers[h] = headers[h]
            }
        }

        if (method == 'GET') 
        { 
            url = StringUtil.urlquery(url, data) 
        }
        else if (data instanceof FormData)
        {
            rq.body = data
            if (rq.headers)
            {
                delete rq.headers['Content-Type'] //= 'multipart/form-data'
            }
        }
        else if (method == 'POST')
        {
            // body data type must match "Content-Type" header
            rq.body = JSON.stringify(data)
        }

        if (!retry) { retry = { count: 1, summaryKey: '-' } }

        var r: any = null, response
        for (var i = 0; i <= retry.count; i++)
        {
            response = await fetch(url, rq)
            if (!response.ok) 
            {
                throw new Error(response.status + " failed fetch")
            }
            try
            {
                if (responseType == 'blob' || responseType == 'blobjson')
                {
                    if (responseType == 'blobjson')
                    {
                        try
                        {
                            r = await response.clone().json()
                        }
                        catch
                        {
                            //
                        }
                    }
                    
                    if (!r)
                    {
                        r = await response.blob()
                        var disposition = response.headers.get("content-disposition")
                        if (disposition && disposition.indexOf('inline') === -1) 
                        {
                            var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
                            var matches = filenameRegex.exec(disposition)
                            if (matches != null && matches[1] && r) 
                            { 
                                r.filename = matches[1].replace(/['"]/g, '')
                            }
                        }
                    }
                }
                else
                {
                    r = await response.json()
                }
            }
            catch
            {
                throw new Error("JSON wrong format, it might be GET/POST missing")
            }
            if (r?.summary?.Key === retry.summaryKey) { continue }
            break
        }

        return r
    }

    //#endregion


    //#region  Common Requests Data Helpers (AccessToken, Userdata)

    async _getAccessToken()
    {
        const auth = this.__static_get_userdata() as UserData
        if (!auth) 
        { 
            // if (this._dev) console.log('getAccessToken = null due NO Auth')
            return null 
        }

        var accessToken = await auth.getNetBaseAccessToken()
        if (!accessToken) 
        {
            var i = 0
            // if (this._dev) console.log('getAccessToken ... await')
            while (i < 10) 
            {
                await sleep(17)
                accessToken = await auth.getNetBaseAccessToken()
                if (accessToken) { break }
                i++
            }
        }
        // if (this._dev) console.log('getAccessToken = ' + !(!accessToken))
        return accessToken
    }

    __setHeaderValue(header, value, obj, type = '')
    {
        if ((type == 'polyajax' || type == 'fetch-api') && obj.headers)
        {
            obj.headers[header] = value
        }
        if (type == 'xhr')
        {
            obj.setRequestHeader(header, value)
        }
    }

    _tz = new Date().getTimezoneOffset()
    async __setAuthAndHeaders(obj, type = '')
    {
        this.__setHeaderValue(TM_HREF_HEADERNAME, window.location.href, obj, type) //href for logger
        this.__setHeaderValue(TM_TIMEZONE_HEADERNAME, this._tz, obj, type)

        var accessToken = await this._getAccessToken()
        if (accessToken)
        {
            obj.withCredentials = true
            this.__setHeaderValue(AUTH_HEADERNAME, 'Bearer ' + accessToken, obj, type)
            const userdata = this.__static_get_userdata() as UserData
            const orgId =  userdata ? userdata.getOrganizationID() : ''
            if (orgId)
            {
                this.__setHeaderValue(ORG_HEADERNAME, orgId, obj, type)
            }
            const userContext: any = userdata ? userdata.getContext() : {}
            if (userContext?.customstoreUrl)
            {
                this.__setHeaderValue(CUSTOMSTORECONTEXT_HEADERNAME, userContext.customstoreUrl, obj, type)
            }
        }
        else if ((type == 'polyajax' || type == 'fetch-api') && obj.headers)
        {
            obj.withCredentials = false
            delete obj.headers[AUTH_HEADERNAME]
        }

        var signalr_connid = this.__static_get_signalr_connid()
        if (signalr_connid)
        {
            //'ConnectionID ' + signalr_connid
            this.__setHeaderValue(SIGNALR_HEADERNAME, signalr_connid, obj, type)
        }
    }


    __static_set_userdata(auth)
    {
        // if (this._dev) console.log('__static_set_userdata(this)', this)
        var proto = NetBase.prototype.constructor
        if (!proto[__userdataKey]) { proto[__userdataKey] = null }
        proto[__userdataKey] = auth
    }
    
    __static_get_userdata()
    {
        var proto = NetBase.prototype.constructor
        if (!proto[__userdataKey]) { proto[__userdataKey] = null }
        return proto[__userdataKey]
    }

    __static_set_signalr_connid(val)
    {
        var proto = NetBase.prototype.constructor

        if (!proto[__signalRConnKey]) { proto[__signalRConnKey] = '' }

        proto[__signalRConnKey] = val
    }

    __static_get_signalr_connid()
    {
        var proto = NetBase.prototype.constructor

        if (!proto[__signalRConnKey]) { proto[__signalRConnKey] = '' }

        return proto[__signalRConnKey]
    }

    //#endregion

}
