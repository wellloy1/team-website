import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
const ptoken_empty = ""


@CustomElement
export class OrganizationsData extends NetBase
{
    static get is() { return 'teamatical-organizations-data' }

    static get template() 
    {
        return html``
        //return html`<app-localstorage-document key="organizations-cache" data="{{organizationsCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            //input
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            organizations: { type: Object, notify: true },
            organizationsCache: { type: Object, value: {} },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(organizations.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(organizationsCache, visible)',
            '_searchHandler(organizations.search)',
        ]
    }

    //#region ts_define
    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    _searchDebouncer: any
    _loaderDebouncer: any
    _loadDataTriggerFlag: any
    _loadmoreCallback: any
    _rq_start: any
    _visibleOld: any
    _setSearchingProgress: any
    _ischanging: any
    _setSaving: any
    _setFailure: any
    _setLoading: any
    api_action: any
    organizations: any
    visible: any
    api_body: any
    api_url: any
    organizationsCache: any
    websiteUrl: any
    //#endregion

    
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
    }

    refresh()
    {
        this.api_action = 'get'
        if (this.organizations) { this.organizations.ptoken = '' }
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    loadMore(callback)
    {
        this.api_action = 'get'
        this._loadmoreCallback = () => {
            this._loadmoreCallback = null
            if (callback) { callback() }
        }
        if (this.organizations) { this.organizations.pnumber += 1 }
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    save(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.api_action = 'save'
            this._fetchItems(3)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    makeAsDefault(organization)
    {
        if (!this.visible) { return }

        this.api_action = 'makedefault'
        this._setFailure(false)
        this.api_body = organization

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, 1, true)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.organizationsCache) { return }
        this.organizationsCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(organizationsP)
    {
        // console.log(this.organizations)
        if (!this.organizations) { return 0 }
        return this.organizations.totalElements
    }


    _loadDataTrigger(organizationsCache, visible)
    {
        // console.log(organizationsCache, visible)
        if (organizationsCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
        {
            this._loaderDebouncer = Debouncer.debounce(this._loaderDebouncer, timeOut.after(200), () =>
            {
                this._loadDataTriggerFlag = true
                this.refresh()
            })
        }
        if (this._visibleOld === true && visible === false)
        {
            this._loadDataTriggerFlag = false
        }
        this._visibleOld = visible
    }

    _searchHandler(search)
    {
        if (this._ischanging) { return }

        this._setSearchingProgress(true)
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1600), () =>
        {
            // console.log(search)
            this.api_action = 'get'
            this.organizations.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/user/organization-list-' + api_action
        return url
    }

    _loadingChanged(v)
    {
        // console.log(v)
        // this.dispatchEvent(new CustomEvent('api-organizations-loading', { bubbles: true, composed: true, detail: { id: this., loading: v } }));
    }

    _savingChanged(v)
    {
        // this.dispatchEvent(new CustomEvent('api-organizations-saving', { bubbles: true, composed: true, detail: { id: this., saving: v } }));
    }

    _fetchItems(attempts)
    {
        if (!this.visible) { return }

        // if (this.organizationsCache && Array.isArray(this.organizationsCache.items) && this.organizationsCache.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('organizations.items', this.organizationsCache.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)

        var obj: any = null
        if (this.api_action == 'get' && !(this.organizations && this.organizations.ptoken) && !(this.organizations && this.organizations.search))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.organizations)
        }
        obj.tz = new Date().getTimezoneOffset()

        if (this.api_action == 'get') { delete obj.items }

        this.api_body = obj

        this._setLoading(true)
        var rq = {
            url: this.api_url,
            body: this.api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponseDebounced.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, 1, true)
    }

    _onRequestResponseDebounced(e)
    {
        const d = 0
        const t = this._loadmoreCallback ? (this._now() - this._rq_start) : d
        if (t < d)
        {
            this.async(() => { this._onRequestResponse(e) }, d - t)
        }
        else
        {
            this._onRequestResponse(e)
        }
    }

    _onRequestResponse(e)
    {
        this._setLoading(false)
        this._setSaving(false)

        var r = e['response']
        if (!r || r['success'] !== true)
        {
            var summary = r ? r['summary'] : null //obj

            if (summary && summary.Key == 'not_logged')
            {
                this._setFailure(true)
                // this.setModel(this._convertJson2Class(undefined))

                var barr = [
                    {
                        title: this.localize('products-empty-ok'),
                        ontap: (e) => 
                        {
                            this._gotoAccount()
                        }
                    }
                ]

                barr.push({
                    title: this.localize('products-empty-signin'),
                    ontap: (e) => 
                    {
                        this.dispatchEvent(new CustomEvent('ui-user-auth', {
                            bubbles: true, composed: true, detail: {
                                signin: true
                            }
                        }))
                    }
                })

                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('organizations-not_logged-announce'),
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
            else
            {
                this._setFailure(true)
            }

            return  /////////////////////////////////////////////
        }

        // console.log('success-> result...')
        //TODO: temp converting for UI
        var updatedModel: any = null

        this._ischanging = true
        if (this.api_action == 'makedefault' || this.api_action == 'archive' || this.api_action == 'unarchive')
        {
            var updateditem = this._convertJson2ClassItem(r['result'])
            for (var i in this.organizations.items)
            {
                if (this.organizations.items[i].IsDefault)
                {
                    this.set('organizations.items.' + i + '.IsDefault', false)
                }

                if (this.organizations.items[i].OrganizationID == updateditem?.OrganizationID)
                {
                    this.set('organizations.items.' + i + '.IsDefault', updateditem.IsDefault)
                    var eventOrg = {
                        IsOrganizationUser: true,
                        IsOrganizationPO: updateditem?.IsOrganizationPO, 
                        OrganizationID: updateditem?.IsDefault ? updateditem.OrganizationID : '', 
                        OrganizationName: updateditem?.IsDefault && updateditem?.OrganizationID ? updateditem.OrganizationName : '', //clear name for (empty ID = personal)
                    }
                    this.dispatchEvent(new CustomEvent('api-organization-changed', { bubbles: true, composed: true,  detail: eventOrg })) //setOrganization


                    if (window.location.href !== updateditem?.RedirectUrl)
                    {
                        if (updateditem?.IsDomainChanged) 
                        {
                            var barr = [
                                {
                                    title: this.localize('app-redirect-ok'),
                                    ontap: (e) => 
                                    {
                                        window.location.href = updateditem?.RedirectUrl
                                    }
                                }
                            ]
                            let domain = updateditem?.RedirectUrl
                            try
                            {
                                let url = new URL(updateditem?.RedirectUrl)
                                domain = url.host //StringUtil.toCapitalize(url.host)
                            }
                            catch
                            {
                                //
                            }
                            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                                bubbles: true, composed: true, detail: {
                                    required: true,
                                    announce: this.localize('organizations-domain-changed-required', 'domain', domain),
                                    message: this.localize('organizations-domain-changed-required', 'domain', domain),
                                    buttons: barr,
                                    errorid: r?.errorid ? r.errorid : null,
                                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                                }
                            }))
                        }
                        else
                        {
                            this._goto(updateditem?.RedirectUrl)
                        }
                    }
                }
            }
        }
        else if (this.api_action == 'get' || this.api_action == 'addnew')
        {
            updatedModel = this._convertJson2Class(r['result'])
            if (this.api_action == 'get' && this.organizations && (updatedModel && !updatedModel.pfirst))
            {
                for (var i in updatedModel)
                {
                    if (i == 'items')
                    {
                        for (var j in updatedModel[i])
                        {
                            this.push('organizations.' + i, updatedModel[i][j])
                        }
                    }
                    else
                    {
                        this.set('organizations.' + i, updatedModel[i])
                    }
                }
            }
            else
            {
                this.set('organizations', updatedModel)
            }
        }
        this._ischanging = false

        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }

        this._setSearchingProgress(false)
        
        //save data
        // this.set('organizationsCache', updatedModel)
    }

    _onRequestError(e)
    {
        this._setSearchingProgress(false)
        this._setLoading(false)
        this._setSaving(false)
        this._setFailure(true)
    }

    _cloneModel(m)
    {
        if (m)
        {
            return this._convertJson2Class(JSON.parse(JSON.stringify(m)))
        }
        return m
    }

    _convertJson2Class(res, update?)
    {
        if (!res) { return new OrganizationListModel() }

        var slist = Object.assign((update ? update : new OrganizationListModel()), res)
        if (slist && Array.isArray(slist.items))
        {
            for (var s in slist.items)
            {
                slist.items[s] = this._convertJson2ClassItem(slist.items[s], update)
            }
        }

        return slist
    }

    _convertJson2ClassItem(res, update?)
    {
        return Object.assign((update ? update : new OrganizationListItemModel()), res)
    }

}


export class OrganizationListModel
{
    pfirst: boolean
    plast: boolean
    pnumber: number
    psize: number = 10
    ptoken: string
    search: string
    tz: number
    totalElements: number
    totalPages: number
    items: OrganizationListItemModel[]
}

export class OrganizationListItemModel
{
    OrganizationID: string = ""
    OrganizationName: string = ""
    IsDefault: boolean | null = false //Bool
    Created: object | null = null //TimeStampModel
}
