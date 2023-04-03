import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
import { ProductConfigurationModel } from '../dal/product-configuration-model'
import { StringUtil } from '../utils/StringUtil'
const DESCRIPTION_SEP = "\n-------------------------------\n"

@CustomElement
export class CustomDesignRequestData extends NetBase
{
    static get is() { return 'teamatical-custom-design-request-data' }

    static get template() 
    {
        return html``
    }

    static get properties()
    {
        return {
            //input
            pcid: { type: Object },
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            
            customDesignRequest: { type: Object, notify: true },
            itemModel: { type: Object, notify: true },


            api_action: { type: String, value: 'get', notify: true },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, websiteUrl)' },
            api_body: { type: Object },

            visible: { type: Boolean, notify: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
        }
    }

    static get observers()
    {
        return [
            '_loadDataTrigger(pcid, visible)',
            '_api_modelChanged(itemModel.ProductSides.*)',
        ]
    }

    _loaderDebouncer: Debouncer
    _updateDebouncer: Debouncer
    itemModel: ProductConfigurationModel
    _rq_start: any
    customDesignRequest: any // DAL
    _ischanging: any
    _setFailure: any
    _setLoading: any
    _setSaving: any
    api_action: any
    websiteUrl: any
    visible: any
    api_url: any
    api_body: any
    pcid: any


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
        // this._setLoading(true)
    }


    ready()
    {
        super.ready()
    }

    refresh()
    {
        this.api_action = 'get'
        // Try at most 3 times to get the items.
        this._fetchItems(3)
    }

    submit()
    {
        this.api_action = 'save'
        this.set('customDesignRequest.notvalid', [])
        this._fetchItems()
    }

    _loadDataTrigger(pcid, visible)
    {
        // console.log(pcid, visible)
        if (!(this.customDesignRequest?.ProductConfigurationID && this.customDesignRequest?.ProductConfigurationID === pcid))
        {
            this.customDesignRequest = undefined
            this.itemModel = undefined
        }

        if (!visible) { return }

        this._setLoading(true) //to set it for luck ... to avoid 'no product' screen 

        this._loaderDebouncer = Debouncer.debounce(this._loaderDebouncer, timeOut.after(17), () =>
        {
            this.refresh()
        })
    }

    _api_modelChanged(productSides)
    {
        if (this._ischanging || !productSides) { return }

        this._updateDebouncer = Debouncer.debounce(this._updateDebouncer, timeOut.after(170), () =>
        {
            this.api_action = 'update'
            this.set('customDesignRequest.notvalid', [])
            this._fetchItems()
        })
    }

    _computeAPIUrl(api_action, websiteUrl)
    {
        if (!api_action || !websiteUrl) { return '' }

        var url = this.websiteUrl + '/api/v1.0/customdesignrequest/' + api_action
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

    _fetchItems(attempts = 1)
    {
        if (!this.visible) 
        { 
            this._setLoading(false) //reset flag of luck
            return 
        }

        this._setFailure(false)
        this._setLoading(true)

        const type_other = 'other'
        var obj: any = {}
        if (this.api_action == 'get')
        {
            //
        }
        else if (this.api_action == 'save' || this.api_action == 'update')
        {
            obj = Object.assign({}, this.customDesignRequest)
            obj.Description = obj.DescriptionPrefix 
                + DESCRIPTION_SEP 
                + (obj.Description || '')
            delete obj.DescriptionPrefix

            obj.Assets = obj.Assets
                .filter(i => { return i.Files?.length > 0 })
                .map(i => { return Object.assign({}, {
                    Asset: i.Files[0].Asset,
                    AssetID: i.Files[0].AssetID,
                    FileName: i.Files[0].FileName,
                    Type: i.Type.id == type_other ? i.TypeOther : i.Type.title,
                    Position: i.Position.id == type_other ? i.PositionOther : i.Position.title,
                    Description: i.Description,
                }) 
            })
            if (this.api_action == 'save') { this._setSaving(true) }
        }
        obj.tz = new Date().getTimezoneOffset()
        obj.ProductConfigurationID = this.pcid

        this.api_body = obj
        
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
        
        if (this.api_action == 'save')
        {
            this.dispatchEvent(new CustomEvent('api-analytics-customdesignrequest', { bubbles: true, composed: true, detail: { action: 'submit', model: obj } }))
        }
    }

    gobackdialog(msg, addBtns: any[] = [])
    {
        var barr = [
            {
                title: this.localize('products-empty-ok'),
                ontap: (e) => 
                {
                    this._gotoProduct(this.pcid, 'back')
                }
            }
        ]
        barr = barr.concat(addBtns)

        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                required: true,
                message: msg,
                buttons: barr,
            }
        }))

    }

    _onRequestResponse(e)
    {
        var r = e['response']

        // console.log('success-> result...')
        var updatedModel: any = null

        if (r)
        {
            var summary = r['summary'] //obj

            if (summary && summary.Key == 'not_availible')
            {
                this.gobackdialog(this.localize('custom-design-request-not_availible'))
            }

            if (r['success'] === true && r['result'])
            {
                if (this.api_action == 'get')
                {
                    updatedModel = r['result']
                }
                else if (this.api_action == 'save')
                {
                    updatedModel = r['result']
                    this.gobackdialog(this.localize('custom-design-request-success'))
                }
                else
                {
                    updatedModel = r['result']
                }
            }
            else if (r['success'] === false)
            {
                if (summary && summary.Key == 'not_logged')
                {
                    this.gobackdialog(summary.Message, [
                        {
                            title: this.localize('products-empty-signin'),
                            ontap: (e) => 
                            {
                                this.dispatchEvent(new CustomEvent('ui-user-auth', {
                                    bubbles: true, composed: true, detail: {
                                        signin: true
                                    }
                                }))
                            }
                        }
                    ])
                }
                else if (summary && summary.Key == 'validation_fail')
                {
                    updatedModel = r['result']
                    updatedModel.errorMessage = summary.Message

                    if (Array.isArray(r['details']) && r.details.length > 0)
                    {
                        var notvalid = {}
                        for (var i in r.details)
                        {
                            var acc = r.details[i]
                            notvalid[acc.Key] = acc.Message
                        }
                        updatedModel.notvalid = notvalid
                    }
                }
                else if (summary && summary.Key == 'not_availible')
                {
                    //
                }
                else
                {
                    this._setFailure(true)
                }
            }
            else if (r['error'])
            {
                this._onRequestError(r['error'])
            }

            ///...

            // if (this.api_action == 'cancel') 
            // {
            //     this.api_action = 'get'
            // }
        }
        else
        {
            this._onRequestError(r)
        }
        
        this._setLoading(false)
        this._setSaving(false)

        this._ischanging = true
        if (updatedModel?.Description)
        {
            var ar = updatedModel.Description.split(DESCRIPTION_SEP)
            if (ar.length > 1)
            {
                updatedModel.Description = ar[1]
            }
        }
        this.customDesignRequest = updatedModel
        this.itemModel = updatedModel?.ProductConfiguration
        this._ischanging = false
    }

    _onRequestError(e)
    {
        this._setLoading(false)
        this._setSaving(false)

        this._setFailure(true)
    }
}
