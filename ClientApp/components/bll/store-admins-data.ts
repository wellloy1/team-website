import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { StoreAdministratorsModel, StoreAdministratorModel, StoreAdministratorInvitationModel } from '../dal/store-administrators-model'
import { CustomElement } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
const ptoken_empty = ""


@CustomElement
export class StoreAdminsData extends NetBase
{
    static get is() { return 'teamatical-store-admins-data' }

    static get template() 
    {
        return html``
    }

    static get properties()
    {
        return {
            //input
            sid: { type: Object },
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            admins: { type: Object, notify: true },
            adminsCache: { type: Object, value: {} },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(admins.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(adminsCache, visible)',
            '_searchHandler(admins.search)',
        ]
    }

    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    _searchDebouncer: any
    _loaderDebouncer: any
    _loadDataTriggerFlag: any
    _loadmoreCallback: any
    _rq_start: any
    sid: any
    queryParams: any
    websiteUrl: any
    userInfo: any
    admins: any
    adminsCache: any

    api_action: any
    api_url: any
    api_body: any

    visible: any
    loading: any
    failure: any
    saving: any
    searchingProgress: any
    numItems: any
    
    _ischanging: any
    _visibleOld: any
    _setSearchingProgress: any
    _setLoading: any
    _setSaving: any
    _setFailure: any




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
        if (this.admins) { this.admins.ptoken = '' }
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
        if (this.admins) { this.admins.pnumber += 1 }
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

    inviteAdmin(sid, email)
    {
        if (!this.visible) { return }

        this.api_action = 'invite'
        this._setFailure(false)
        // this.api_body = store
        var url = StringUtil.urlquery(this.api_url, { storeid: sid, email: email })

        this._setLoading(true)
        var rq = {
            url: url,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)

    }

    revokeInvite(sid, invitei)
    {
        if (!this.visible) { return }

        this.api_action = 'revoke'
        this._setFailure(false)
        // this.api_body = store
        var url = StringUtil.urlquery(this.api_url, { storeid: sid, email: invitei.email })

        this._setLoading(true)
        var rq = {
            url: url,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    removeAdmin(sid, admini)
    {
        if (!this.visible) { return }

        this.api_action = 'remove'
        this._setFailure(false)
        // this.api_body = store
        var url = StringUtil.urlquery(this.api_url, { storeid: sid, userid: admini.UserID })

        this._setLoading(true)
        var rq = {
            url: url,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 1, true)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.adminsCache) { return }
        this.adminsCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(adminsP)
    {
        // console.log(this.admins)
        if (!this.admins || !this.admins.Administrators) { return 0 }
        // return this.admins.totalElements
        return this.admins.Administrators.length
    }


    _loadDataTrigger(adminsCache, visible)
    {
        // console.log(adminsCache, visible)
        if (adminsCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
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

            this._ischanging = true
            this.set('admins', {})
            this._ischanging = false
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
            this.admins.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/store/administrators-' + api_action
        return url
    }

    _loadingChanged(v)
    {
        // console.log(v)
        // this.dispatchEvent(new CustomEvent('api-admins-loading', { bubbles: true, composed: true, detail: { id: this., loading: v } }));
    }

    _savingChanged(v)
    {
        // this.dispatchEvent(new CustomEvent('api-admins-saving', { bubbles: true, composed: true, detail: { id: this., saving: v } }));
    }

    _fetchItems(attempts)
    {
        if (!this.visible) { return }

        // if (this.adminsCache && Array.isArray(this.adminsCache.items) && this.adminsCache.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('admins.items', this.adminsCache.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)

        var obj: any = null
        if (this.api_action == 'get' && !(this.admins && this.admins.ptoken) && !(this.admins && this.admins.search))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.admins)
        }
        obj.tz = new Date().getTimezoneOffset()
        obj.StoreID = this.sid

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
        var summary = r ? r['summary'] : null //obj
        if (!r || r['success'] !== true)
        {
            //cant_remove_owner_or_yourself
            if (summary && summary.Key == 'not_logged')
            {
                this._setFailure(true)
                // this.setModel(this._convertJson2Class(undefined))

                var barr = [
                    {
                        title: this.localize('store-admins-message-ok'),
                        ontap: (e) => 
                        {
                            this._gotoAccount()
                        }
                    }
                ]

                barr.push({
                    title: this.localize('store-admins-message-signin'),
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
                        announce: this.localize('store-admins-announce'),
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

        if (summary && summary.Key)
        {
            var barr = [
                {
                    title: this.localize('store-admins-message-ok'),
                    ontap: (e) => 
                    {
                        // this._gotoAccount()
                    }
                }
            ]

            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: this.localize('store-admins-announce'),
                    message: summary.Message,
                    buttons: barr,
                    errorid: r?.errorid ? r.errorid : null,
                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }

        // console.log('success-> result...')
        //TODO: temp converting for UI
        var updatedModel:any = null

        if (this.api_action == 'makedefault' || this.api_action == 'archive' || this.api_action == 'unarchive')
        {
            var item = this._convertJson2ClassItem(r['result'])
            updatedModel = this._cloneModel(this.admins)
            for (var i in updatedModel.items)
            {
                if (updatedModel.items[i].isdefault)
                {
                    updatedModel.items[i].isdefault = false
                }

                if (item.sid == updatedModel.items[i].sid)
                {
                    updatedModel.items[i] = item
                }
            }
        }
        else //if (this.api_action == 'get' || this.api_action == 'addnew')
        {
            updatedModel = this._convertJson2Class(r['result'])
            // if (this.api_action == 'get' && this.admins && (updatedModel && !updatedModel.pfirst))
            // {
            //     updatedModel.items = this.admins.items.concat(updatedModel.items)
            // }
        }


        this._ischanging = true
        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }
        this.admins = updatedModel
        this._ischanging = false

        this._setSearchingProgress(false)
        
        //save data
        this.set('adminsCache', updatedModel)
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
        if (!res) { return new StoreAdministratorsModel() }

        var slist = Object.assign((update ? update : new StoreAdministratorModel()), res)
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
        return Object.assign((update ? update : new StoreAdministratorModel()), res)
    }

}
