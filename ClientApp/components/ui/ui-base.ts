import { timeOut } from '@polymer/polymer/lib/utils/async.js'
import { LocalizeBehaviorBase } from '../bll/localize-behavior'
//---component---
import { Easings } from '../utils/MathExtensions'
import { Currency, Clipboard } from '../utils/CommonUtils'
import { Color } from '../utils/ColorUtils'
import { StringUtil } from '../utils/StringUtil'
import { CheckoutData } from '../bll/checkout-data'
import { PaymentHistoryItem } from '../dal/order-model'

//---consts---
const Teamatical: TeamaticalGlobals = window['Teamatical']
const Stripe = "SP"
const Test = "testPayment"
const ChargeFree = "chargeFreePayment"
const PurchaseOrder = "PO"
const Payment2C2P = "2C2P"



export class UIBase extends LocalizeBehaviorBase
{
    _dev: boolean

    constructor()
    {
        super()

        this._dev = (Teamatical.BuildEnv == 'Development')
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
    }



    //#region  Common Helpers

    _copyTap(e)
    {
        const cont = e?.target ? e.target.getAttribute('copy-content') : null
        const id = e?.target?.innerHTML
        if (!id && !cont) { return }

        var contmsg = e?.target ? e.target.getAttribute('copy-message') : null
        if (contmsg)
        {
            contmsg = StringUtil.replaceAll(contmsg, '{id}', id)
        }
        else
        {
            contmsg = `ID: '${id}' copied to clipboard...`
        }

        const copyd = this._asBool(cont) ? cont : id
        // console.log(copyd)
        Clipboard.copyFromString(copyd)
        this.showToast(contmsg)

        if (e?.stopPropagation) { e.stopPropagation() }
        if (e?.preventDefault) { e.preventDefault() }
        return false
    }

    showToast(msg, timeout = 3000)
    {
        this.dispatchEvent(new CustomEvent('api-show-toast', {
            bubbles: true, composed: true, detail: {
                timeout: timeout,
                //strong: true,
                message: msg,
            }
        }))
    }

    
    async(func, t: number | undefined = 0)
    {
        timeOut.run(func, t)
    }

    _log(v) { console.log(v) }

    _nowperf()
    {
        return window.performance && 'now' in window.performance ? performance.now() : new Date().getTime()
    }

    _now()
    {
        return new Date().getTime()
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

    _hrefDetail(pid, catName, queryParams = {})
    {
        return pid ? StringUtil.urlquery(['/detail', catName, pid].join('/'), queryParams) : ''
    }

    _hrefCustomize(pid, catName, queryParams = {})
    {
        return pid ? StringUtil.urlquery(['/customize', catName, pid].join('/'), queryParams) : ''
    }

    _hrefStore(sid, queryParams = {})
    {
        return sid ? StringUtil.urlquery(['/store', sid].join('/'), queryParams) : ''
    }

    _hrefList(cid)
    {
        return cid ? ['/list', cid].join('/') : ''
    }

    _hrefCartRosterPreview(rid, queryParams = {})
    {
        return rid ? StringUtil.urlquery(['/cart-roster-preview', rid].join('/'), queryParams) : ''
    }

    // for account console..
    _hrefCart()
    {
        return '/cart'
    }

    _hrefCheckout(gid, queryParams = {})
    {
        queryParams = Object.assign(queryParams, { gid: gid })
        return gid ? StringUtil.urlquery(['/checkout'].join('/'), queryParams) : ''
    }

    _hrefSignIn()
    {
        return '/signin'
    }

    _hrefAccount()
    {
        return '/account'
    }

    _hrefAccountOrders()
    {
        return this._hrefAccount()
    }

    _hrefAccountOrder(orderid, queryParams = {})
    {
        queryParams = Object.assign(queryParams, { orderid: orderid })
        return orderid ? StringUtil.urlquery(['/account'].join('/'), queryParams) : ''
    }

    _hrefAccountStores()
    {
        return '/account-stores'
    }

    _hrefAccountOrganizations()
    {
        return '/account-organizations'
    }

    _hrefAccountPurchaseOrders()
    {
        return '/account-purchase-orders'
    }

    _hrefAccountOrderRoster(rid, queryParams = {})
    {
        return rid ? StringUtil.urlquery(['/account-order-roster', rid].join('/'), queryParams) : ''
    }

    _hrefAccountOrganizationAdmins(orgid, queryParams = {})
    {
        return orgid ? StringUtil.urlquery(['/account-organization-admins', orgid].join('/'), queryParams) : ''
    }

    _hrefAccountStoreGroup(gsid, queryParams = {})
    {
        return gsid ? StringUtil.urlquery(['/account-store-group', gsid].join('/'), queryParams) : ''
    }

    _hrefAccountStoreGroups(sid, queryParams = {})
    {
        return sid ? StringUtil.urlquery(['/account-store-groups', sid].join('/'), queryParams) : ''
    }

    _hrefAccountStoreAdmins(sid, queryParams = {})
    {
        return sid ? StringUtil.urlquery(['/account-store-admins', sid].join('/'), queryParams) : ''
    }

    _hrefAccountRoster(rid, queryParams = {})
    {
        return rid ? StringUtil.urlquery(['/account-roster', rid].join('/'), queryParams) : ''
    }

    _hrefAccountRosters()
    {
        return '/account-rosters'
    }

    _hrefAccountOrderAdmins(poid, queryParams = {})
    {
        return poid ? StringUtil.urlquery(['/account-order-admins', poid].join('/'), queryParams) : ''
    }

    _hrefAccountPurchaseOrder(oid, queryParams = {})
    {
        return oid ? StringUtil.urlquery(['/account-purchase-order', oid].join('/'), queryParams) : ''
    }

    _hrefAccountPurchaseInvoice(inid, queryParams = {})
    {
        return inid ? StringUtil.urlquery(['/account-purchase-invoice', inid].join('/'), queryParams) : ''
    }


    //for admin console..
    _hrefAdminOrganization(orgid, queryParams = {})
    {
        queryParams = Object.assign(queryParams, { orgid: orgid })
        return orgid ? StringUtil.urlquery(['/admin', 'organization'].join('/'), queryParams) : ''
    }

    _hrefAdminProduct(pid, queryParams = {})
    {
        queryParams = Object.assign(queryParams, { productid: pid })
        return pid ? StringUtil.urlquery(['/admin', 'product'].join('/'), queryParams) : ''
    }
    
    _hrefAdminOrderRoster(queryParams = {})
    {
        return StringUtil.urlquery(['/admin', 'order-roster'].join('/'), queryParams)
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

    _gotoProduct(pid, catName, queryParams = {}, replaceState = false)
    {
        var href = this._hrefDetail(pid, catName, queryParams)
        if (href && replaceState)
        {
            this._gotoRS(href)
        }
        else if (href && !replaceState)
        {
            this._goto(href)
        }
    }

    _gotoProductRS(pid, catName, queryParams = {})
    {
        return this._gotoProduct(pid, catName, queryParams, true)
    }

    _gotoCustomize(pid, catName, queryParams = {})
    {
        this._goto(this._hrefCustomize(pid, catName, queryParams))
    }

    _gotoStoreNull()
    {
        this._goto('/store')
    }

    _gotoStore(sid = '', queryParams = {})
    {
        this._goto(this._hrefStore(sid, queryParams))
    }

    _gotoList(catName)
    {
        this._goto(this._hrefList(catName))
    }

    _gotoCart()
    {
        this._goto(this._hrefCart())
    }

    _gotoAccount()
    {
        this._goto(this._hrefAccount())
    }

    _gotoAccountOrders()
    {
        this._goto(this._hrefAccountOrders())
    }
    
    _gotoAccountOrder(orderid, queryParams = {})
    {
        this._goto(this._hrefAccountOrder(orderid, queryParams))
    }

    _gotoAccountOrganizationAdmins(orgid, queryParams = {})
    {
        this._goto(this._hrefAccountOrganizationAdmins(orgid, queryParams))
    }

    _gotoAccountStoreGroup(gsid = '')
    {
        this._goto(this._hrefAccountStoreGroup(gsid))
    }

    _gotoAccountStores(sid = '')
    {
        this._goto(this._hrefAccountStores())
    }

    _gotoAccountStoreGroups(sid = '', queryParams = {})
    {
        this._goto(this._hrefAccountStoreGroups(sid, queryParams))
    }

    _gotoAccountStoreAdmins(sid = '', queryParams = {})
    {
        this._goto(this._hrefAccountStoreAdmins(sid, queryParams))
    }

    _gotoAccountRoster(rid = '', queryParams = {})
    {
        this._goto(this._hrefAccountRoster(rid, queryParams))
    }

    _gotoAccountRosters()
    {
        this._goto(this._hrefAccountRosters())
    }

    _gotoAccountOrderAdmins(poid = '', queryParams = {})
    {
        this._goto(this._hrefAccountOrderAdmins(poid, queryParams))
    }

    _goSignIn(href = '')
    {
        if (!href) { href = window.location.href }

        this.dispatchEvent(new CustomEvent('ui-user-auth', {
            bubbles: true, composed: true, detail: {
                signin: true,
                href: href,
            }
        }))
    }

    _goSignUp(href = '')
    {
        if (!href) { href = window.location.href }

        this.dispatchEvent(new CustomEvent('ui-user-auth', {
            bubbles: true, composed: true, detail: {
                signup: true,
                href: href,
            }
        }))
    }

    _goSignOut(href = '')
    {
        if (!href) { href = window.location.href }

        this.dispatchEvent(new CustomEvent('ui-user-auth', {
            bubbles: true, composed: true, detail: {
                signout: true,
                href: href,
            }
        }))
    }

    //#endregion


    //#region  Common Formater & Logic

    _or(a, b, c = undefined, d = undefined)
    {
        return a || b || c || d
    }

    _bool(v)
    {
        // console.log(v, typeof v)
        return v === undefined ? '' : v.toString()
        // return v === 'true' ? true : false
    }

    _asString(v)
    {
        return (v == undefined || v == null) ? '' : v
    }

    _hasString(v, s)
    {
        if (!v || !s) { return false }

        var str = v.toString()
        return str.indexOf(s) >= 0

    }

    _morethen(i, l)
    {
        if (i === undefined || i === null) { return false }
        return i > l
    }

    _equal(a, b)
    {
        return a === b
    }

    _equals()
    {
        const s = arguments[0]
        for (var i in arguments)
        {
            if (i == '0') { continue }
            if (s == arguments[i]) { return true}
        }
        return false
    }

    _equalNotZero(a, b)
    {
        return a === b && a !== 0
    }

    _asBool(v)
    {
        if (v === 0) { return true }
        return new Boolean(v) == true
    }

    _asArrayIfEmpty(arr_or_not)
    {
        return Array.isArray(arr_or_not) ? arr_or_not : []
    }

    Not(v)
    {
        return this._bool(!v)
    }

    _notLast(arr, index)
    {
        return Array.isArray(arr) && (index + 1) < arr.length
    }

    LenLess(arr, len = 1)
    {
        return !Array.isArray(arr) || arr.length < len
    }

    LenMore(arr, morelen = 0)
    {
        return Array.isArray(arr) && arr.length > morelen
    }

    _noItems(arr, arrP)
    {
        return !this.LenMore(arr, 0)
    }
    
    _yesItems(arr, arrP)
    {
        return this.LenMore(arr, 0)
    }

    _classBool(v, classTrue = '', classFalse = '', classUndefined = '')
    {
        // console.log('_classBool', v, classTrue, classFalse, classUndefined)
        if (v === undefined || v === null) { return classUndefined }
        return v ? classTrue : classFalse
    }

    _className(subclass, baseclass = '')
    {
        if (!subclass || typeof(subclass) != 'string') { return '' }
        var classes = StringUtil.replaceAll(subclass.toLowerCase(), ' ', '-')
        if (baseclass) { classes = `${baseclass} ${classes}`}
        return classes
    }
    
    eventNull(e) 
    {
        e.preventDefault()
        return false
    }

    eventNullStop(e)
    {
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    isNumber(value)
    {
        if ((undefined === value) || (null === value)) { return false }
        if (typeof (value) == 'number') { return true }
        return Number.isFinite(value)
    }

    //#endregion


    //#region Common Formaters

    _tabindexConverter(bool, index)
    {
        if (bool)
        {
            return index
        }

        return ""
    }

    _stringOrLocalize(locmsg, def_locid)
    {
        return locmsg ? locmsg : this.localize(def_locid)
    }

    _formatArray(arr)
    {
        if (!Array.isArray(arr)) { return arr }

        return arr.join(', ')
    }

    _formatFileSize(b)
    {
        // var u = 0, s = 1024
        // while (b >= s || -b >= s)
        // {
        //     b /= s
        //     u++
        // }
        // return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B'

        var exp = Math.log(b) / Math.log(1024) | 0
        var result = (b / Math.pow(1024, exp)).toFixed(2)
        return result + ' ' + (exp == 0 ? 'bytes' : 'KMGTPEZY'[exp - 1] + 'B')


        //return (b = Math, c = b.log, d = 1e3, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes')
        // return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'KMGTPEZY'[--e] + 'iB' : 'Bytes')
    }

    _formatPercent(val, m = 2)
    {
        const floatOptions = { minimumFractionDigits: m, maximumFractionDigits: m, useGrouping: true, }
        if (typeof (val) == 'string')
        {
            try
            {
                val = parseInt(val, 10)
            }
            catch
            {
                //
            }
        }
        var pp = (val / 100)
        return pp.toLocaleString(this.language, floatOptions) + '%'
    }

    _formatPrice(price, currency)
    {
        if (typeof(price) == 'string')
        {
            try
            {
                price = parseInt(price, 10)
            }
            catch
            {
                //
            }
        }
        return Currency.format(price, currency, this.language)
    }
    
    _formatShipment(sobj)
    {
        return sobj?.title ? sobj.title : ''
    }

    _formatN(index)
    {
        return '' + (parseInt(index) + 1)
    }

    _formatDomain(url, partinx = -1)
    {
        try
        {
            var uobj = new URL(url)
            if (partinx > 0)
            {
                var parr = uobj.hostname.split('.').reverse()
                if (partinx > parr.length) { return url }
                return parr[partinx - 1]
            }
            return uobj.hostname
        }
        catch
        {
            return url
        }
    }
    
    _formatDate(o, locale)
    {
        if (!o) { return '' }

        if (!locale) { locale = this.language }

        //o.tz
        // console.log(locale)
        var formatter = new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
        })
        var d = new Date().setTime(o.ms)

        // console.log(o.ms + ' ' + o.tz)
        // console.log(o)
        // var d = new Date(2017, 12, 8, 12, 30, 0)
        return formatter.format(d)
    }

    // _formatAddress(address, address2, address3, city, country, state, zip, firstname, lastname)
    // {
    //     if (!address2) { address2 = '' }
    //     if (typeof country == 'object') { country = country.title }
    //     if (!address || !city || !country || !state || !zip || !firstname || !lastname) { return '' }
    //     var v = this.localize('order-address',
    //         'address', address,
    //         'address2', (address2 ? ', ' + address2 : ''),
    //         'address3', (address3 ? ', ' + address3 : ''),
    //         'city', city,
    //         'country', country,
    //         'state', state,
    //         'zip', zip,
    //         'name', firstname + ' ' + lastname
    //     )
    //     // console.log(v)
    //     return v
    // }

    _formatPayKind(kind, amount, currency)
    {
        switch (kind)
        {
            case 'refund':
                return this.localize('order-paymenthistory-kind-refund', 'amount', this._formatPrice(amount, currency))
            case 'payment':
                return this.localize('order-paymenthistory-kind-payment', 'amount', this._formatPrice(amount, currency))
            default:
                return ''
        }
    }

    _formatReason(reason)
    {
        return this.localize('order-paymenthistory-reason-' + (reason ? reason : 'other'))
    }

    _convertPayType(payhist: PaymentHistoryItem[] | null = null)
    {
        var paytype = ''
        if (Array.isArray(payhist))
        {
            var payhisti = payhist.filter(i => { return i.Kind == 'payment'})
            if (payhisti?.length > 0)
            {
                paytype = `${payhisti[0]?.PaymentMethod?.id}-` ?? ''
            }
            if (paytype == `${Stripe}-`) { paytype = '' }
            if (paytype == `${Payment2C2P}-`) { paytype = '' }
        }
        return paytype
    }

    _formatPayStatus(status, payhist: PaymentHistoryItem[] | null = null)
    {
        var paytype = this._convertPayType(payhist)
        return status ? this.localizepv(`order-paymenthistory-status-${paytype}`, status) : ''
    }

    _formatOrderStatus(status, payhist: PaymentHistoryItem[] | null = null)
    {
        var paytype = this._convertPayType(payhist)
        return status ? this.localizepv(`order-status-${paytype}`, status) : ''
    }

    _formatUserinfo(userinfo)
    {
        var s = ''
        var profile = userinfo?.profile
        //email email_verified given_name name nickname picture sub updated_at locale
        if (profile && profile.name) { s += profile.name }
        if (profile && profile.name && profile.email && profile.name !== profile.email) { s += " <" + profile.email + ">" }
        else if (profile && profile.email && profile.name !== profile.email) { s += profile.email }
        if (profile && s == '') { s += '[' + profile.sub + ']' }

        return s
    }

    _formatUser(user, addUserID?)
    {
        var s = ''
        if (user && user.Name) { s += user.Name }
        if (user && user.Name && user.Email) { s += (user.Name === user.Email ? "" : " <" + user.Email + ">") }
        else if (user && user.Email) { s += user.Email }

        if (user?.Organization?.OrganizationName)
        {
            s += ` ${user.Organization.OrganizationName}`
        }

        if (user && user.UserID) 
        {
            if (s == '') 
            { 
                s += '[' + user.UserID + ']' 
            }
            else if (addUserID)
            {
                s = '[' + user.UserID + ']\n ' + s
            }
        }

        return s
    }

    _formatTotalsItem(id, amount, currency)
    {
        var r = ''
        // console.log(id, amount, currency)
        if (id == 'cf.totals.shipment' && amount == 0)
        {
            return this.localize('checkout-total-item-free')
        }
        else
        {
            r = this._formatPrice(amount, currency)
        }
        return r
    }

    localizeByCountry(id, countryCode)
    {
        var profile = CheckoutData._compute_countryProfile(countryCode)
        var locid = ''
        switch(id)
        {
            case 'order-title-state':
                locid = profile.ShipState
                break

            case 'order-title-zip':
                locid = profile.ShipZip
                break
        }
        return this.localize(locid)
    }

    _convertBkgColor(hex)
    {
        var bkg = '#' + hex
        var clr = Color.invertColor(hex, true)
        return 'color:' + clr + ';' + 'background-color:' + bkg + ';'
    }

    _invalidFor(notvalid, path, index)
    {
        if (!notvalid) { return false }
        return this._asBool(this._errorMessageFor(notvalid, path, index))
    }

    _invalidId(path, index)
    {
        var key = path ? path.replace('{i}', index) : undefined
        return key
    }

    _errorMessageFor(notvalid, path, index)
    {
        if (!notvalid) { return undefined }

        var key = this._invalidId(path, index)
        var msg = notvalid[key]
        // console.log(msg)
        return msg
    }

    _existsPrice(price)
    {
        return !price
    }

    _computeProductImagesA(title, imgsUrls, autotitles = false)
    {
        if (!Array.isArray(imgsUrls)) { return imgsUrls }
        return imgsUrls.map((i, inx, arr) => 
        { 
            // let titlei = title
            let titlei = (inx % 2 == 0) ? this.localize('ui-image-frontview') : this.localize('ui-image-backview')
            if (arr.length > 2)
            {
                let vi = Math.ceil((inx + 1) / 2)
                titlei = `${titlei} ${vi}`
            }
            return { 
                title: titlei, 
                imgUrl: i 
            }
        })
    }

    _computeProductImagesHA(title, imgsUrls, imgsUrlsHires?)
    {
        if (!Array.isArray(imgsUrls)) { return imgsUrls }
        return imgsUrls.map((currentValue, index, array) =>
        {
            return { title: title, imgUrl: currentValue, imgHiresUrl: (imgsUrlsHires && imgsUrlsHires[index] ? imgsUrlsHires[index] : '') }
        })
    }

    _computeProductImagesZ(title, imgsUrls, imgsUrlsZoomin?)
    {
        if (!Array.isArray(imgsUrls)) { return imgsUrls }
        return imgsUrls.map((currentValue, index, array) => { 
            return { title: title, imgUrl: currentValue, imgZoomUrl: (imgsUrlsZoomin && imgsUrlsZoomin[index] ? imgsUrlsZoomin[index] : '') } 
        })
    }

    _computeDisounts(discountOffers, appliedDiscounts)
    {
        // console.log(discountOffers ? discountOffers : appliedDiscounts)
        return discountOffers ? discountOffers : appliedDiscounts
    }

    _computeTotalsVisible(totals)
    {
        if (Array.isArray(totals))
        {
            var r = totals.filter((i) =>
            {
                // console.log(i.id)
                return i.id != 'cf.totals.woshipment_total'
            }).map((entry, i, arr) =>
            {
                var cl = StringUtil.replaceAll(entry.id, '.', '-')
                if (entry.id == 'cf.totals.shipment' && entry.amount == 0)
                {
                    cl += " free"
                }
                return Object.assign({}, entry, {
                    'class': cl,
                })
            })
            // console.log(r)
            return r
        }
        return null
    }

    __detailsResposeHandler(details, basepath)
    {
        if (!Array.isArray(details) && details.length < 1) { return }

        var notvalid = {}
        var notvalidArr = {}
        for (var i in details)
        {
            var acc = details[i]
            if (/\.([0-9]*)\./.test(acc.Key))
            {
                // console.log(acc.Key)
                var ix = acc.Key.lastIndexOf('.')
                var fieldName = acc.Key.substr(ix + 1)
                var prefix = acc.Key.substring(0, ix)
                var notvalidi = notvalidArr[prefix]
                if (notvalidi == undefined) { notvalidi = {} }
                notvalidi[fieldName] = acc.Message
                notvalidArr[prefix] = notvalidi
            }
            else //non-array fields
            {
                notvalid[acc.Key] = acc.Message
            }
        }

        //apply arrays' notvalid
        for (var i in notvalidArr)
        {
            var pathi = basepath + '.' + i + '.notvalid'
            this.set(pathi, notvalidArr[i])
            // console.log(pathi, i, notvalidArr[i])
        }

        this.set(basepath + '.notvalid', notvalid)
    }    
    // addEventListener(type, listener, options)
    // {
    //     return super.addEventListener(type, listener, EventPassiveDefault.optionPrepare(options))
    // }

    //#endregion


    //#region UI helpers

    _compute_poweredby(orgSubdomain)
    {
        return this._asBool(orgSubdomain)
    }

    _elementInViewport(el)
    {
        var rect = el.getBoundingClientRect()
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        )
    }

    _elementInViewportPartly(el, ve?)
    {
        const rect = el.getBoundingClientRect()  // DOMRect { x: 8, y: 8, width: 100, height: 100, top: 8, right: 108, bottom: 108, left: 8 }
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight)
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth)
        // http://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
        const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0)
        const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0)
        return (vertInView && horInView)
    }

    _focusAndScroll(pi, shiftY = 0)
    {
        if (!pi || typeof pi.getBoundingClientRect != 'function') 
        { 
            console.warn(pi) 
            return
        }

        //focus and scroll
        var r = pi.getBoundingClientRect()
        if (r && (r.top || r.top === 0))
        {
            this.scrollIt(Math.max(r.top + shiftY + document.documentElement.scrollTop, 0), 650, 'easeInOutCubic',
                (callback) => { },
                (animation) =>
                {
                    if (!animation)
                    {
                        pi.focus()
                    }
                }
            )
        }
        
        // if (pi.scrollIntoViewIfNeeded)
        // {
        //     // safari, chrome
        //     pi.scrollIntoViewIfNeeded()
        // }
        // else
        // {
        //     // firefox, edge, ie
        //     pi.scrollIntoView(false)
        // }
        // 
        
    }

    _getScrollTop()
    {
        if (typeof pageYOffset != 'undefined')
        {
            //most browsers except IE before #9
            return pageYOffset
        }
        else
        {
            var B: any = document.body //IE 'quirks'
            var D: any = document.documentElement //IE with doctype
            D = (D.clientHeight) ? D : B
            return D.scrollTop
        }
    }

    scrollIt(destination, duration = 200, easing = 'linear', callback: any = null, animating: any = null, target: any = null)
    {
        // var eventNullStop = (e) => {
        //     e.preventDefault()
        //     e.stopPropagation()
        //     return false
        // }

        // console.log('scrollIt', target)
        if (!target) { target = window }


        // var pointerEvents = target == window ? document.body.style.pointerEvents : target.style.pointerEvents
        // target == window ? document.body.style.pointerEvents = 'none' : target.style.pointerEvents = 'none'
        // target.addEventListener('wheel', eventNullStop, { passive: false })
        // target.addEventListener('DOMMouseScroll', eventNullStop, { passive: false })

        const getScrollTop = () => 
        {
            var v = 0
            if (target == window) { v = window.pageYOffset }
            else if (target) { v = target.scrollTop }
            // console.log('--', v)
            return v
        }

        const th = window.devicePixelRatio * 2
        const easings = Easings
        const start = getScrollTop()
        const startTime = this._now()
        const documentHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight)
        const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
        const scrollHeight = (target == window ? documentHeight : target.scrollHeight) 
        const viewportHeight = (target == window ? windowHeight : target.clientHeight) 
        const destinationOffset = typeof destination === 'number' ? destination : (destination instanceof HTMLBodyElement ? destination.offsetTop : 0)
        var destinationOffsetToScroll = Math.round(scrollHeight - destinationOffset < viewportHeight ? scrollHeight - viewportHeight : destinationOffset)
        const scrollDir = Math.sign(destinationOffsetToScroll - start)
        // console.log(start, '=>', destinationOffsetToScroll, scrollDir )
    
        if (animating) { animating(true) }
        const self = this

        if ('requestAnimationFrame' in window === false)
        {
            target.scroll(0, destinationOffsetToScroll)
            if (callback) { callback() }
            return
        }

        function scroll()
        {
            const now = self._now()
            const time = Math.min(1, ((now - startTime) / duration))
            const timeFunction = easings[easing](time)
            target.scroll(0, Math.ceil((timeFunction * (destinationOffsetToScroll - start)) + start))

            // if ((Math.abs(getScrollTop() - destinationOffsetToScroll) <= th) || (now - startTime) > duration * 1.5)
            var recentPos = scrollDir * (destinationOffsetToScroll - getScrollTop())
            // console.log(recentPos)
            if (recentPos <= th || (now - startTime) > 1.2 * duration)
            {
                if (animating) 
                { 
                    // target == window ? document.body.style.pointerEvents = pointerEvents : target.style.pointerEvents = pointerEvents //restore
                    // target.removeEventListener('wheel', eventNullStop)
                    // target.removeEventListener('DOMMouseScroll', eventNullStop)
                    animating(false) 
                }
                if (callback) { callback() }
                // console.log('scroll it out', (now - startTime), duration, recentPos)
                return
            }

            requestAnimationFrame(scroll)
        }

        scroll()

        return target
    }

    isTouchStartSupported()
    {
        return ("ontouchstart" in document.documentElement)
    }

    isTouchActionSupported()
    {
        let prevTA = this.style.touchAction
        this.style.touchAction = "pan-x"
        if (this.style.touchAction == "pan-x")
        {
            this.style.touchAction = prevTA
            return true
        }
        return false
    }

    _onInputChanged(e, modelName = 'order', attrName = 'name')
    {
        var epath = e.path || e.composedPath()
        var fname = epath[0].getAttribute(attrName)
        if ((typeof fname == 'string') && fname.indexOf('.') >= 0)
        {
            var inx = fname.lastIndexOf('.')
            var pname = fname.substr(inx)
            var prefix = fname.substring(0, inx)
            // console.log(prefix + '.notvalid' + pname)
            this.set(prefix + '.notvalid' + pname, null)
        }
        else //no root path
        {
            this.set(modelName + '.notvalid.' + fname, null)
        }
    }

    //#endregion


    //#region LitElement->PolymerElement backward Helpers


    //#endregion

}
