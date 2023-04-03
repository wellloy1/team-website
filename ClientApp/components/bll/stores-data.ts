import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { StoreListModel } from '../dal/store-list-model'
import { StoreListItemModel } from '../dal/store-list-item-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class StoresData extends NetBase
{
    static get is() { return 'teamatical-stores-data' }

    static get template() 
    {
        return html``
        //return html`<app-localstorage-document key="stores-cache" data="{{storesCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            //input
            isPublicCatalog: { type: Boolean, notify: true, reflectToAttribute: true }, // is-public-catalog

            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            stores: { type: Object, notify: true },
            storesCache: { type: Object, value: {} },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(stores.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(storesCache, visible)',
            '_searchHandler(stores.search, stores.letter)',
        ]
    }

    //#region ts_define
    isPublicCatalog: boolean
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
    stores: any
    visible: any
    api_body: any
    api_url: any
    storesCache: any
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
        if (this.stores) { this.stores.ptoken = '' }
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
        if (this.stores) { this.stores.pnumber += 1 }
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

    makeAsDefault(store)
    {
        if (!this.visible) { return }

        this.api_action = 'makedefault'
        this._setFailure(false)
        this.api_body = store

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

    archiveStore(store)
    {
        if (!this.visible) { return }

        this.api_action = 'archive'
        this._setFailure(false)
        this.api_body = store

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

    unarchiveStore(store)
    {
        if (!this.visible) { return }

        this.api_action = 'unarchive'
        this._setFailure(false)
        this.api_body = store

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
        if (!this.storesCache) { return }
        this.storesCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(storesP)
    {
        // console.log(this.stores)
        if (!this.stores) { return 0 }
        return this.stores.totalElements
    }


    _loadDataTrigger(storesCache, visible)
    {
        // console.log(storesCache, visible)
        if (storesCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
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

    oldSearch: any
    _searchHandler(search, letter)
    {
        if (this._ischanging) { return }

        this._setSearchingProgress(true)
        const issearching = search && this.oldSearch?.search != search
        const islettering = letter && this.oldSearch?.letter != letter
        const t = (letter && !issearching ? 17 : 1600)
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(t), () =>
        {
            if (issearching)
            {
                letter = ''
                this.stores.letter = letter
            }
            if (islettering)
            {
                search = ''
                this.stores.search = search
            }
            this.oldSearch = { search: search, letter: letter }
            // console.log(search)
            this.api_action = 'get'
            this.stores.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/store/list-' + api_action
        return url
    }

    _loadingChanged(v)
    {
        // console.log(v)
        // this.dispatchEvent(new CustomEvent('api-stores-loading', { bubbles: true, composed: true, detail: { id: this., loading: v } }));
    }

    _savingChanged(v)
    {
        // this.dispatchEvent(new CustomEvent('api-stores-saving', { bubbles: true, composed: true, detail: { id: this., saving: v } }));
    }

    _fetchItems(attempts)
    {
        if (!this.visible) { return }

        // if (this.storesCache && Array.isArray(this.storesCache.items) && this.storesCache.items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('stores.items', this.storesCache.items)
        //     this._ischanging = false
        // }
        this._setFailure(false)

        var obj: any = null
        if (this.api_action == 'get' && !(this.stores && this.stores.ptoken) && !(this.stores && (this.stores.search || this.stores.letter)))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.stores)
        }
        obj.tz = new Date().getTimezoneOffset()

        if (this.api_action == 'get') { delete obj.items }

        if (this.isPublicCatalog) 
        {
            obj.inpubliccatalog = true
        }
        if (Array.isArray(obj.letters))
        {
            obj.letters = obj.letters.map(i => i.id)
        }
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
                        announce: this.localize('stores-announce'),
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
            var item = this._convertJson2ClassItem(r['result'])
            for (var i in this.stores.items)
            {
                if (this.stores.items[i].isdefault)
                {
                    this.set('stores.items.' + i + '.isdefault', false)
                }

                if (item.sid == this.stores.items[i].sid)
                {
                    for (var j in item)
                    {
                        this.set('stores.items.' + i + '.' + j, item[j])
                    }
                }
            }
        }
        else if (this.api_action == 'get' || this.api_action == 'addnew')
        {
            updatedModel = this._convertJson2Class(r['result'])
            if (this.api_action == 'get' && this.stores && (updatedModel && !updatedModel.pfirst))
            {
                for (var i in updatedModel)
                {
                    if (i == 'items')
                    {
                        for (var j in updatedModel[i])
                        {
                            this.push('stores.' + i, updatedModel[i][j])
                        }
                    }
                    else
                    {
                        this.set('stores.' + i, updatedModel[i])
                    }
                }
            }
            else
            {
                this.set('stores', updatedModel)
            }
        }
        this._ischanging = false

        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }

        this._setSearchingProgress(false)
        
        //save data
        // this.set('storesCache', updatedModel)
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
        if (!res) { return new StoreListModel() }

        var slist = Object.assign((update ? update : new StoreListModel()), res)
        if (slist && Array.isArray(slist.items))
        {
            for (var s in slist.items)
            {
                slist.items[s] = this._convertJson2ClassItem(slist.items[s], update)
            }
        }

        // String.fromCharCode(...Array(123).keys()).slice(97).split('')
        if (slist?.letters?.length > 0 && typeof(slist.letters[0]) == 'string')
        {
            slist.letters = slist.letters.map(i => { return { id: i, title: i, selected: slist.letter == i } })
        }
        return slist
    }

    _convertJson2ClassItem(res, update?)
    {
        return Object.assign((update ? update : new StoreListItemModel()), res)
    }

}
