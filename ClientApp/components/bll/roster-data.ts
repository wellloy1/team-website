import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { RosterModel } from '../dal/roster-model'
import { RosterItemModel } from '../dal/roster-model'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class RosterData extends NetBase
{
    static get is() { return 'teamatical-roster-data' }

    static get template() 
    {
        return html``
        // return html`<app-localstorage-document key="roster-cache" data="{{rosterCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            rid: { type: Object },
            roster: { type: Object, notify: true },
            queryParams: { type: Object, notify: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(roster.*)', },
            userInfo: { type: Object },
            websiteUrl: { type: String },

            APIPath: { type: String, value: '/api/v1.0/user/roster-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_body: { type: Object },

            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },

            searchingProgress: { type: Boolean, notify: true, readOnly: true },
        }
    }
   
    static get observers()
    {
        return [
            '_dataReloadChanged(visible, rid, queryParams.*)',
            // '_log(roster)',
        ]
    }

    _log(v) { console.log(v) }

    api_action: any
    api_url: any
    websiteUrl: any
    visible: any
    rid: any
    roster: any
    rosterOld: any
    _searchDebouncer: any
    _rq_start: any
    _ischanging: any
    _setSearchingProgress: any
    _setFailure: any
    _setLoading: any
    _roster_last: any
    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    queryParams: any
    _setSaving: any
    _loadmoreCallback: any



    connectedCallback()
    {
        super.connectedCallback()
    }

    reload(reset?)
    {
        if (reset) { this.roster = null }

        this.api_action = 'get'
        this._fetchItems(3)
    }

    save(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            // this.rosterOld = this._cloneModel(this.roster) //clone
            this.api_action = 'save'
            this._fetchItems(3)
        }
        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    cleanPrivateInfoInCache()
    {
        this.async(() =>
        {
            this.reload()
        })
    }

    hasChanges()
    {
        var recent_json = JSON.stringify(this.roster)
        if (this._roster_last == recent_json)
        {
            return false
        }
        return true
    }

    _dataReloadDebouncer: Debouncer
    _dataReloadChanged(visible, rid, queryParams)
    {
        if (this._ischanging || visible !== true || rid == undefined || queryParams == undefined) { return }

        // console.log('_dataReloadChanged', visible, rid, queryParams)
        this._dataReloadDebouncer = Debouncer.debounce(this._dataReloadDebouncer, timeOut.after(200), ()=>{this.reload(true)})
    }

    _visibleChanged(v, vo)
    {
        if (vo === true && v !== true) 
        { 
            // this.roster = undefined
        }
    }

    _loadingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-roster-loading', { bubbles: true, composed: true, detail: { loading: v } }));
    }

    _savingChanged(v)
    {
        this.dispatchEvent(new CustomEvent('api-roster-saving', { bubbles: true, composed: true, detail: { id: this.rid, saving: v } }));
    }

    _computeNumItems(rosterP)
    {
        if (!this.roster) { return 0 }
        return this.roster.totalElements
    }

    _computeCurrency()
    {
        if (!this.roster || !Array.isArray(this.roster.Items) || this.roster.Items.length < 1) { return '' }

        //TODO: convert if different along of roster
        return this.roster.Items[0].Currency
    }

    _fetchItems(attempts, oid?)
    {
        if (!this.visible) { return }
        

        this._setFailure(false)

        var obj:any = null
        var qp:any = {}
        if (!this.roster)
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.roster)
        }
        obj.RosterID = this.rid
        obj.ProductConfigurationID = this.queryParams['pid']

        var apiurl = StringUtil.urlquery(this.api_url, qp)
        var apimethod = "POST" //this.api_action == 'get' ? "GET" : "POST"
        var apibody = obj

        this._setLoading(true)
        var rq = {
            url: apiurl,
            body: apibody,
            method: apimethod,
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onLoadDebounced.bind(this, oid),
            onError: this._onError.bind(this)
        }

        this._rq_start = this._now()
        this._getResource(rq, attempts, true)
    }

    _onLoadDebounced(oid, e)
    {
        // const d = 0
        // const t = 400 //this._loadmoreCallback ? (this._now() - this._rq_start) : d
        // if (t < d)
        // {
        // this.async(() => { this._onLoad(oid, e) }, 400)
        // }
        // else
        // {
            this._onLoad(oid, e)
        // }
    }

    _onLoad(oid, e)
    {
        var r = e['response']
        
        if (r)
        {
            if (r['success'] === true && r['result'])
            {
                var updatedModel = this._convertJson2Class(r['result'])
                this.setModel(updatedModel)
            }
            else if (r['success'] === false)
            {
                var summary = r['summary'] //obj

                if (summary && summary.Key == 'not_logged')
                {
                    this.setModel(this._convertJson2Class(undefined))

                    var barr = [
                        {
                            title: this.localize('roster-empty-ok'),
                            ontap: (e) => 
                            {
                                this._gotoAccount()
                            }
                        }
                    ]

                    barr.push({
                        title: this.localize('roster-empty-signin'),
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
                            announce: this.localize('roster-roster-announce'),
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
            }
            else if (r['error'])
            {
                this._onError(r['error'])
            }

            var details = r['details']
            if (details) 
            {
                this._applyDetailsErrors('roster', details)
            }

            if (this.api_action == 'cancel') 
            {
                this.api_action = 'get'
            }

            this._setSearchingProgress(false)
            this._setLoading(false)
            this._setSaving(false)
        }
        else
        {
            this._onError(r)
        }
    }

    _applyDetailsErrors(prefix = 'order', details)
    {
        if (!Array.isArray(details) || details.length < 1) { return }
        
        var notvalid = {}
        var notvalidArr = {}
        for (var i in details)
        {
            var acc = details[i]
            if (/\.([0-9]*)\./.test(acc.Key)) //arrays handler //// .indexOf('DiscountPolicy.Discounts.') >= 0)
            {
                // console.log(acc.Key)
                var ix = acc.Key.lastIndexOf('.')
                var fieldName = acc.Key.substr(ix + 1)
                var fprefix = acc.Key.substring(0, ix)
                var notvalidi = notvalidArr[fprefix]
                if (notvalidi == undefined) { notvalidi = {} }
                notvalidi[fieldName] = acc.Message
                notvalidArr[fprefix] = notvalidi
            }
            else //non-array fields
            {
                notvalid[acc.Key] = acc.Message
            }
        }

        //apply arrays' notvalid
        for (var i in notvalidArr)
        {
            var pathi = prefix + '.' + i + '.notvalid'
            try
            {
                this.set(pathi, notvalidArr[i])
                for (var k in notvalidArr[i])
                {
                    this.notifyPath(`${pathi}.${k}`)
                }
            }
            catch
            {
                //
            }
            // console.log(pathi, notvalidArr[i])
        }

        this.set(prefix + '.notvalid', notvalid)
    }

    _onError(e)
    {
        this._setSearchingProgress(false)
        this._setFailure(true)
        this._setLoading(false)
        this._setSaving(false)
    }

    setModel(roster)
    {
        if (!roster) { return }

        // //TODO: remove on backend ready...
        // roster.PlayerCaptainOptions = [
        //     { ID: "Not captain",  Name: "Not captain" },
        //     { ID: "C", Name: "C" },
        //     { ID: "A", Name: "A" },
        //     { ID: "K", Name: "K" },
        // ]

        // if (Array.isArray(roster.Items))
        // {
        //     Object.keys(roster.Items).forEach((i) =>
        //     {
        //         roster.Items[i].animIndex = parseInt(i, 10)
        //         roster.Items[i].added = false
        //         // Items[i].item.Product.ImageUrlSwap = Items[i].item.Product.ImageUrl
        //         // //TODO: add temp data 
        //         // Items[i].Cancelable = (Math.random() > 0.5)
        //         // Items[i].Canceled = (Math.random() > 0.5)
        //     })
        // }

        //ui update
        this._ischanging = true
        // this.set('roster', roster)
        if (this.api_action == 'get' || this.api_action == 'save')
        {
            var updatedModel = roster
            if (this.api_action == 'get' && this.roster && (updatedModel && !updatedModel.pfirst))
            {
                for (var i in updatedModel)
                {
                    this.set('roster.' + i, updatedModel[i])
                }
            }
            else
            {
                this.set('roster', updatedModel)

                // var items = updatedModel.Items
                // updatedModel.Items = []
                // this.set('roster', updatedModel)
                // this.async(() => 
                // {
                //     for (var j in items)
                //     {
                //         this.push('roster.Items', items[j])
                //     }
                // })
            }
        }
        this._ischanging = false
        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }


        this._roster_last = JSON.stringify(roster)

        if (this.api_action == 'save')
        {
            this.api_action = 'update'
            // console.log('Save Succeed!')
            if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, { id: this.rid }) }
        }
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
        if (!res) { return new RosterModel() }

        var slist = Object.assign((update ? update : new RosterModel()), res)
        if (slist && Array.isArray(slist.Items))
        {
            for (var s in slist.Items)
            {
                slist.Items[s] = this._convertJson2ClassItem(slist.Items[s], update)
            }
        }

        return slist
    }

    _convertJson2ClassItem(res, update?)
    {
        return Object.assign((update ? update : new RosterItemModel()), res)
    }

}
