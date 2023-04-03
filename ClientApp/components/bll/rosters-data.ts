import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { RosterListModel } from '../dal/roster-list-model'
import { RosterListItemModel } from '../dal/roster-list-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class RostersData extends NetBase
{
    static get is() { return 'teamatical-rosters-data' }

    static get template() 
    {
        return html``
        //return html`<app-localstorage-document key="rosters-cache" data="{{rostersCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            //input
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            rosters: { type: Object, notify: true },
            rostersCache: { type: Object, value: {} },

            APIPath: { type: String, value: '/api/v1.0/user/roster-list-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(rosters.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(rostersCache, visible)',
            '_searchHandler(rosters.search)',
        ]
    }

    api_action: any
    rosters: any
    rostersCache: any
    visible: any 
    api_body: any 
    api_url: any
    _setSaving: any
    _setFailure: any
    _setLoading: any 
    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    _searchDebouncer: any
    _loaderDebouncer: any
    _loadDataTriggerFlag: any
    _loadmoreCallback: any
    _rq_start: any
    _visibleOld: any
    _ischanging: any 
    _setSearchingProgress: any 



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
        if (this.rosters) { this.rosters.ptoken = '' }
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
        if (this.rosters) { this.rosters.pnumber += 1 }
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

    makeAsDefault(roster)
    {
        if (!this.visible) { return }

        this.api_action = 'makedefault'
        this._setFailure(false)
        this.api_body = roster

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

    addNew()
    {
        if (!this.visible) { return }

        this.api_action = 'addnew'
        this._setFailure(false)
        this.api_body = null

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

        this._getResource(rq, 1, true)
    }

    archiveStore(roster)
    {
        if (!this.visible) { return }

        this.api_action = 'archive'
        this._setFailure(false)
        this.api_body = roster

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

        this._getResource(rq, 1, true)
    }

    unarchiveStore(roster)
    {
        if (!this.visible) { return }

        this.api_action = 'unarchive'
        this._setFailure(false)
        this.api_body = roster

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

        this._getResource(rq, 1, true)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.rostersCache) { return }
        this.rostersCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(rostersP)
    {
        // console.log(this.rosters)
        if (!this.rosters) { return 0 }
        return this.rosters.totalElements
    }


    _loadDataTrigger(rostersCache, visible)
    {
        // console.log(rostersCache, visible)
        if (rostersCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
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
            this.rosters.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _loadingChanged(v)
    {
        // console.log(v)
        // this.dispatchEvent(new CustomEvent('api-rosters-loading', { bubbles: true, composed: true, detail: { id: this., loading: v } }));
    }

    _savingChanged(v)
    {
        // this.dispatchEvent(new CustomEvent('api-rosters-saving', { bubbles: true, composed: true, detail: { id: this., saving: v } }));
    }

    _fetchItems(attempts)
    {
        if (!this.visible) { return }

        // if (this.rostersCache && Array.isArray(this.rostersCache.items) && this.rostersCache.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('rosters.items', this.rostersCache.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)

        var obj = null
        if (this.api_action == 'get' && !(this.rosters && this.rosters.ptoken) && !(this.rosters && this.rosters.search))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.rosters)
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
                        announce: this.localize('rosters-announce'),
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
        var updatedModel: any = null
        this._ischanging = true
        if (this.api_action == 'makedefault' || this.api_action == 'archive' || this.api_action == 'unarchive')
        {
            var item = this._convertJson2ClassItem(r['result'])
            for (var i in this.rosters.items)
            {
                if (this.rosters.items[i].IsDefault)
                {
                    this.set('rosters.items.' + i + '.IsDefault', false)
                }

                if (item.RosterID == this.rosters.items[i].RosterID)
                {
                    for (var j in item)
                    {
                        this.set('rosters.items.' + i + '.' + j, item[j])
                    }
                }
            }
        }
        else if (this.api_action == 'get' || this.api_action == 'addnew')
        {
            updatedModel = this._convertJson2Class(r['result'])
            if (this.api_action == 'get' && this.rosters && (updatedModel && !updatedModel.pfirst))
            {
                for (var i in updatedModel)
                {
                    if (i == 'items')
                    {
                        for (var j in updatedModel[i])
                        {
                            this.push('rosters.' + i, updatedModel[i][j])
                        }
                    }
                    else
                    {
                        this.set('rosters.' + i, updatedModel[i])
                    }
                }
            }
            else
            {
                this.set('rosters', updatedModel)
            }
        }
        this._ischanging = false

        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }

        this._setSearchingProgress(false)
        
        //save data
        // this.set('rostersCache', updatedModel)
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
        if (!res) { return new RosterListModel() }

        var slist = Object.assign((update ? update : new RosterListModel()), res)
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
        return Object.assign((update ? update : new RosterListItemModel()), res)
    }

}
