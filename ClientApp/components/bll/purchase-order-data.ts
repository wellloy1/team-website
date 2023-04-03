import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { GroupShippingParticipantListModel, GroupShippingParticipantListPersonModel } from '../dal/groupshipping-participant-list-model'
import { CustomElement } from '../utils/CommonUtils'
const ptoken_empty = ""


@CustomElement
export class PurchaseOrderData extends NetBase
{
    static get is() { return 'teamatical-purchase-order-data' }

    static get template() 
    {
        return html``
    }

    static get properties()
    {
        return {
            //input
            gid: { type: Object },
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            participants: { type: Object, notify: true },
            participantsCache: { type: Object, value: {} },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
            searchingProgress: { type: Boolean, notify: true, readOnly: true },
            numItems: { type: Number, notify: true, computed: '_computeNumItems(participants.*)', },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(participantsCache, visible)',
            '_searchHandler(participants.search)',
        ]
    }

    _saveSuccessHandler: any
    _modelChangeDebouncer: any
    _searchDebouncer: any
    _loaderDebouncer: any
    _loadDataTriggerFlag: any
    _loadmoreCallback: any
    _rq_start: any
    _setSearchingProgress: any
    _setLoading: any
    _setSaving: any
    _setFailure: any
    _ischanging: any
    _visibleOld: any
    visible: any
    gid: any
    websiteUrl: any
    participantsCache: any
    participants: any
    api_action: any
    api_body: any
    api_url: any


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
        if (this.participants) { this.participants.ptoken = '' }
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
        if (this.participants) { this.participants.pnumber += 1 }
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    cancelAllOrders(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.api_action = 'cancel'
            this._fetchItems(1)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }
    closeToken(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.api_action = 'close'
            this._fetchItems(1)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    approveSelected(successHandler)
    {
        // var itemSetItems = this.participants.items || []
        // var approvedList = []
        // for (var i in itemSetItems)
        // {
        //     for (var j in itemSetItems[i].Items)
        //     {
        //         var orders = itemSetItems[i].Items
        //         console.log(i + ' - ' + j + '  => ' + orders[j].approved)
        //         approvedList.push(orders[j].OrderID)
        //         // this.notifyPath('participants.items.' + i + '.Items.' + j + '.approved')
        //     }
        // }
        // console.log(approvedList)

        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.api_action = 'invoice'
            this._fetchItems(1)
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    // save(successHandler)
    // {
    //     this._saveSuccessHandler = successHandler
    //     this._setSaving(true)

    //     var handler = () =>
    //     {
    //         this.api_action = 'save'
    //         this._fetchItems(3)
    //     }

    //     this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    // }

    cleanPrivateInfoInCache()
    {
        if (!this.participantsCache) { return }
        this.participantsCache = {}

        this.async(() =>
        {
            this.refresh()
        })
    }

    _computeNumItems(participantsP)
    {
        // console.log(this.participants)
        if (!this.participants) { return 0 }
        return this.participants.totalElements
    }


    _loadDataTrigger(participantsCache, visible)
    {
        // console.log(participantsCache, visible)
        if (participantsCache !== undefined && visible !== undefined && !this._loadDataTriggerFlag)
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
            this.set('participants', null)
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
            this.participants.ptoken = ptoken_empty //reset token for newer requests
            this._fetchItems(3)
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/user/purchaseorder-' + api_action
        return url
    }

    _loadingChanged(v)
    {
        // console.log(v)
    }

    _savingChanged(v)
    {
        // console.log(v)
    }

    _fetchItems(attempts)
    {
        if (!this.visible) { return }

        // if (this.participantsCache && this.participantsCache[this.gid] && Array.isArray(this.participantsCache[this.gid].items) && this.participantsCache[this.gid].items.length > 0)
        // {
        //     this._ischanging = true
        //     this.set('participants.items', this.participantsCache[this.gid].items)
        //     this._ischanging = false
        // }
        
        this._setFailure(false)

        var obj: any = null
        if (this.api_action == 'get' && !(this.participants && this.participants.ptoken) && !(this.participants && this.participants.search))
        {
            obj = this._convertJson2Class(undefined)
        }
        else
        {
            obj = this._cloneModel(this.participants)
        }
        obj.tz = new Date().getTimezoneOffset()
        obj.PurchaseOrderID = this.gid
        
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
                        announce: this.localize('store-groupshipping-announce'),
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

        if (this.api_action == 'invoice')
        {
            updatedModel = this._convertJson2Class(r['result'])
        }
        else //get | close | cancel
        {
            updatedModel = this._convertJson2Class(r['result'])
            
            // updatedModel.pfirst = true
            // updatedModel.plast = false
            // updatedModel.pnumber = 0
            updatedModel.totalElements = updatedModel.items ? updatedModel.items.length : 0
            // updatedModel.psize = 
            // updatedModel.ptoken: string
            // updatedModel.search: string
            // updatedModel.tz: number
            // updatedModel.totalPages: number

            // if (this.api_action == 'get' && this.participants && (updatedModel && !updatedModel.pfirst))
            // {
            //     updatedModel.items = this.participants.items.concat(updatedModel.items)
            // }
        }


        this._ischanging = true
        if (this.api_action == 'get' && this._loadmoreCallback) { this._loadmoreCallback() }
        this.participants = updatedModel
        this._ischanging = false

        // console.log(this.participants)

        this._setSearchingProgress(false)
        
        //save data
        if(this.api_action == 'invoice')
        {
            this.api_action = 'get'

            if (updatedModel.InvoiceID)
            {
                if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, { id: updatedModel.InvoiceID }) }
                this._gotoAccountPurchaseInvoice(updatedModel.InvoiceID)
            }
            else
            {
                var summary = r ? r['summary'] : null //obj

                // if (summary)// && summary.Key == 'not_logged')
                // {
                //     var barr = [
                //         {
                //             title: this.localize('products-empty-ok'),
                //             ontap: (e) => 
                //             {
                //                 this._gotoAccount()
                //             }
                //         }
                //     ]

                //     barr.push({
                //         title: this.localize('products-empty-signin'),
                //         ontap: (e) => 
                //         {
                //             this.dispatchEvent(new CustomEvent('ui-user-auth', {
                //                 bubbles: true, composed: true, detail: {
                //                     signin: true
                //                 }
                //             }))
                //         }
                //     })

                //     this.dispatchEvent(new CustomEvent('api-show-dialog', {
                //         bubbles: true, composed: true, detail: {
                //             required: true,
                //             announce: this.localize('store-groupshipping-announce'),
                //             message: summary.Message,
                //             buttons: barr,
                //             errorid: r?.errorid ? r.errorid : null,
                //             devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                //         }
                //     }))
                // }
            }
        }
        else if (this.api_action == 'cancel')
        {
            this.api_action = 'get'
            if (updatedModel.Status == 'Cancelled')
            {
                if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, {  }) }
                this._gotoAccountPurchaseOrders()
            }
            this.set('participantsCache.' + updatedModel.PurchaseOrderID, updatedModel)
        }
        else //get | close | cancel
        {
            this.set('participantsCache.' + updatedModel.PurchaseOrderID, updatedModel)
        }
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
        if (!res) { return new GroupShippingParticipantListModel() }

        var slist = Object.assign((update ? update : new GroupShippingParticipantListModel()), res)
        if (slist && Array.isArray(slist.items))
        {
            for (var s in slist.items)
            {
                slist.items[s] = this._convertJson2ClassItem(slist.items[s], update)
            }
        }

        // slist.HasPendingOrders = true //TEST
        // slist.Sandbox = true //TEST

        return slist
    }

    _convertJson2ClassItem(res, update?)
    {
        return Object.assign((update ? update : new GroupShippingParticipantListPersonModel()), res)
    }

}
