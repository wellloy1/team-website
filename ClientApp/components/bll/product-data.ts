import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { ColorModel } from '../dal/color-model'
import { DesignOptionModel } from '../dal/design-option-model'
import { DesignOptionSetModel } from '../dal/design-option-set-model'
import { PlayerInfoModel } from '../dal/player-info-model'
import { ProductConfigurationModel } from '../dal/product-configuration-model'
import { ProductPriceModel } from '../dal/product-price-model'
import { ProductCustomModel } from '../dal/product-custom-model'
import { ProductManufacturerModel } from '../dal/product-manufacturer-model'
import { StoreConfigurationModel } from '../dal/store-configuration-model'
import { SizeInfoModel } from '../dal/size-info-model'
import { SizeModel } from '../dal/size-model'
import { TeamInfoModel } from '../dal/team-info-model'
import { StringUtil } from '../utils/StringUtil'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'
import { UserInfoModel } from '../dal/user-info-model'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
// const qsd = ',' //query data separator


@CustomElement
export class ProductData extends NetBase
{
    static get is() { return 'teamatical-product-data' }

    static get template() 
    {
        return html`<app-localstorage-document key="product-cache" session-only data="{{productCache}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            productCache: { type: Object, value: {}, },

            //input
            itemName: { type: String, observer: '_itemNameChanged' },
            itemRedirected: { type: String, notify: true },
            itemModel: { type: Object, notify: true, observer: '_itemModelChanged' }, //api_model
            queryParams: { type: Object, notify: true },
            categoryName: { type: String, },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            debouncing: { type: Object, notify: true, value: {} },
            customizationType: { type: String, notify: true },

            itemModelOld: { type: Object, notify: true },
            _observers: { type: Array, },

            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(api_action, customizationType, websiteUrl)' },
            api_body: { type: Object },
            loadingHires: { type: Boolean, notify: true, readOnly: true, },
            loading: { type: Boolean, notify: true, readOnly: true, observer: '_loadingChanged' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, },

            saving: { type: Boolean, notify: true, readOnly: true, observer: '_savingChanged' },
        }
    }

    //#region Properties Declare

    api_action: any
    api_url: any
    api_body: any
    customizationType: any
    categoryName: any
    itemModel: any
    itemName: any
    productCache: any
    websiteUrl: any
    visible: any
    queryParams: any
    debouncing: any
    _observers: any
    _setLoadingHires: any
    _setLoading: any
    _setSaving: any
    _setFailure: any
    _changesTimes: any = 0
    _lastUpdateModelJson: any
    _dev: any
    itemRedirected: string

    itemModelOld: any
    _modelChangeDebouncer: any
    _saveSuccessHandler: any
    _resetDebouncer: any
    _ischanging: any
    userInfo: UserInfoModel
    

    //#endregion

    static get observers()
    {
        return [
            '_api_modelChanged(itemModel.Team.Colors.*, itemModel.Team.TeamNames.*, itemModel.Team.Sports, itemModel.Player.*, itemModel.Product.*, itemModel.ProductViews.*, itemModel.ProductPointOfView, itemModel.DesignOptionSetList.*, itemModel.SizesSelected.*, itemModel.Photos, itemModel.DrawDimensions, itemModel.Quantity, customizationType, itemModel.ProductSides.*, itemModel.Roster)',
            // '_log(itemModel.notvalid.Roster)',
        ]
    }
    _log(v) { console.log(v) }


    //@ this should be synchronized with SERVER-SIDE CODE to be solid
    static product_compare(p1, p2)
    {
        if (!p1 || !p2) { return false }

        if (p1.ProductConfigurationID !== p2.ProductConfigurationID)
        {
            return false
        }

        if (p1.Player && p2.Player)
        {
            var activityNotEqauls = true
            if (typeof p1.PlayerActivity === typeof p2.PlayerActivity)
            {
                if (typeof p1.PlayerActivity == 'string')
                {
                    activityNotEqauls = p1.PlayerActivity !== p2.PlayerActivity
                }
                else if (typeof p1.PlayerActivity == 'object')
                {
                    activityNotEqauls = p1.PlayerActivity.ID !== p2.PlayerActivity.ID
                }
            }
            var captainNotEqauls = true
            if (typeof p1.PlayerCaptain === typeof p2.PlayerCaptain)
            {
                if (typeof p1.PlayerCaptain == 'string')
                {
                    captainNotEqauls = p1.PlayerCaptain !== p2.PlayerCaptain
                }
                else if (typeof p1.PlayerCaptain == 'object')
                {
                    captainNotEqauls = p1.PlayerCaptain.ID !== p2.PlayerCaptain.ID
                }
            }

            if (p1.PlayerYear !== p2.PlayerYear || p1.PlayerNumber !== p2.PlayerNumber || p1.PlayerName !== p2.PlayerName || captainNotEqauls || activityNotEqauls)
            {
                return false
            }
        }

        if (p1.Team && p2.Team
            && Array.isArray(p1.Team.TeamNames) && Array.isArray(p2.Team.TeamNames)
            && Array.isArray(p1.Team.Colors) && Array.isArray(p2.Team.Colors))
        {
            if (p1.Team.Colors.length !== p2.Team.Colors.length || p1.Team.TeamNames.length !== p2.Team.TeamNames.length)
            {
                return false
            }

            for (var i in p1.Team.TeamNames)
            {
                if (p1.Team.TeamNames[i] !== p2.Team.TeamNames[i])
                {
                    return false
                }
            }

            for (var i in p1.Team.Colors)
            {
                if (p1.Team.Colors[i] && p2.Team.Colors[i] && p1.Team.Colors[i].i !== p2.Team.Colors[i].i)
                {
                    return false
                }
            }
        }

        if (Array.isArray(p1.SizesSelected) && Array.isArray(p2.SizesSelected))
        {
            if (p1.SizesSelected.length !== p2.SizesSelected.length)
            {
                return false
            }

            for (var i in p1.SizesSelected)
            {
                if (p1.SizesSelected[i].Size && p2.SizesSelected[i].Size && p1.SizesSelected[i].Size.Code !== p2.SizesSelected[i].Size.Code)
                {
                    return false
                }
            }
        }

        if (Array.isArray(p1.DesignOptionSetList) && Array.isArray(p2.DesignOptionSetList))
        {
            if (p1.DesignOptionSetList.length !== p2.DesignOptionSetList.length)
            {
                return false
            }

            for (var i in p1.DesignOptionSetList)
            {
                var p1i = p1.DesignOptionSetList[i].DesignOptions
                var p2i = p2.DesignOptionSetList[i].DesignOptions
                if (Array.isArray(p1i) && Array.isArray(p2i))
                {
                    var p1sel = p1i.filter((o) => { return o.Selected })
                    var p2sel = p2i.filter((o) => { return o.Selected })
                    if (p1sel.length !== p2sel.length || p1sel[0].ID !== p2sel[0].ID)
                    {
                        return false
                    }
                }
            }
        }

        return true
    }

    static product_query(obj, queryParams, customizationType, type = '')
    {
        if (!obj) { return '' }

        

        // console.log(customizationType, obj)
        var qpar = Object.assign({}, (queryParams ? queryParams : {}))
        if (customizationType == 'cart' || customizationType == 'order')
        {
            //obj is order
            var ltype = (customizationType == 'order' ? ('O|' + obj.oid + '|') : 'S|')
            qpar['lid'] = ltype + obj.id
        }
        else if (customizationType == 'share' && obj.DesignOptionSetListWizardState)
        {
            qpar['s'] = obj.DesignOptionSetListWizardState
        }
        else //if (customizationType == 'player')
        {
            if (obj.DesignOptionSetListWizardState) { qpar['s'] = obj.DesignOptionSetListWizardState }
            if (obj.lid) { qpar['lid'] = obj.lid }
        }
        // else
        // {
        //     delete qpar['s']
        // }

        if (type == 'update')
        {
            delete qpar['lid'] // when update model, lid has been disavowed
        }

        return qpar
    }

    static product_queryapply(obj, queryParams, customizationType)
    {
        if (!obj || !queryParams) { return }

        const lid = queryParams['lid']
        if (lid && typeof lid == 'string')
        {
            obj.lid = lid
        }

        ////ROSTER preselection
        const rosterid = queryParams['rid']
        if (rosterid && typeof rosterid == 'string')
        {
            obj.Roster = { ID: rosterid }
        }

        const dsState = queryParams['s']
        if (dsState && typeof dsState == 'string')
        {
            obj.DesignOptionSetListWizardState = dsState
        }
    }

    connectedCallback()
    {
        super.connectedCallback()

        if (window.localStorage) { window.localStorage?.removeItem('product-cache') }
    }

    ready()
    {
        super.ready()

        this._observers = []
    }

    refresh()
    {
        if (!this.itemName) { return }

        this.api_action = 'get'
        // Try at most 3 times to get the items.
        this._fetchItems(this.itemName, 3)
    }

    async hiresImageDownload()
    {
        this._setLoadingHires(true)
        
        try
        {
            var last_action = this.api_action
            var obj = this.cloneModel(this.itemModel)
            this.api_action = 'get-hi-res'
            var blob: any = await this._apiRequest(this.api_url, obj, 'POST', 'blob')
            var link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = blob.filename ? blob.filename : `${obj.ProductConfigurationID}.png`
            const clickHandler = () => 
            {
                setTimeout(() => 
                {
                    window.URL.revokeObjectURL(blob)
                  this.removeEventListener('click', clickHandler)
                }, 150)
            }
            link.addEventListener('click', clickHandler, false)
            link.click()
        }
        catch(e)
        {
            console.error(e)
        }
        finally
        {
            this._setLoadingHires(false)
            this.api_action = last_action
        }
    }

    async imageDownload()
    {
        // console.log(this.itemModel)
        if (!Array.isArray(this.itemModel.ProductViews)) { return }

        var pvinx = -1
        var pv = this.itemModel.ProductViews.filter((i, inx) => {
            if (i.Selected) { pvinx = inx }
            return i.Selected
        })
        if (pv.length < 1) { return }

        try
        {
            this._setLoadingHires(true)
           
            pvinx++
            var reversible = ''
            if (this.itemModel.ProductIsReversible && Array.isArray(this.itemModel.ProductSides))
            {
                var psinx = -1
                var ps = this.itemModel.ProductSides.filter((i, inx) => {
                    if (i.Selected) { psinx = inx }
                    return i.Selected
                })
                if (pv.length > 0) 
                { 
                    reversible = '-side' + (psinx + 1)
                }
            }
            
            var filename = `${this.itemModel.Product.ProductSKU}-${this.itemModel.ProductConfigurationID}${reversible}-view${pvinx}.jpeg`
            var link = document.createElement('a')
            link.href = pv[0].ImageUrlDownload
            link.download = `${filename}`
            if (!link.href.startsWith(this.websiteUrl)) 
            {
                link.target = `_blank`
            }
            const clickHandler = () => 
            {
                setTimeout(() => 
                {
                    window.URL.revokeObjectURL(pv[0].ImageUrlDownload)
                    this.removeEventListener('click', clickHandler)
                }, 150)
            }
            link.addEventListener('click', clickHandler, false)
            link.click()
        }
        catch
        {
            //
        }
        finally
        {
            this._setLoadingHires(false)
        }
    }

    clone(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.itemModelOld = this.cloneModel(this.itemModel) //clone
            this.api_action = 'clone'
            this._fetchItems(this.itemName, 3)
        }

        if (this.debouncing['textinput']) { this.set('debouncing.textinput', false) }
        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    save(successHandler)
    {
        this._saveSuccessHandler = successHandler
        this._setSaving(true)

        var handler = () =>
        {
            this.itemModelOld = this.cloneModel(this.itemModel) //clone
            this.api_action = 'save'
            this._fetchItems(this.itemName, 3)
        }

        if (this.debouncing['textinput']) { this.set('debouncing.textinput', false) }
        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer, timeOut.after(200), handler)
    }

    cleanPrivateInfoInCache()
    {
        if (!this.productCache) { return }

        this.productCache = {}

        // for (var i in this.productCache)
        // {
        //     var itemi = this.productCache[i]
        //     console.log(i)
        //     if (itemi) 
        //     {
        //         itemi = Object.assign({}, itemi)
        //         itemi['Photos'] = []
        //         this.productCache[i] = itemi
        //     }
        // }
    }

    reset()
    {
        // console.log('reset...')
        if (!this.itemName) { return }

        var handler = () =>
        {
            this.api_action = 'get'
            // console.log('GO! ... reset')
            this._fetchItems(this.itemName, 1)
        }
        this._resetDebouncer = Debouncer.debounce(this._resetDebouncer, microTask, handler)
    }

    _loadingChanged(v)
    {
        // console.log(v)
        this.dispatchEvent(new CustomEvent('api-product-loading', { bubbles: true, composed: true, detail: { id: this.itemName, loading: v } }));
    }

    _savingChanged(v)
    {
        // console.log('_savingChanged: ' + v)
        this.dispatchEvent(new CustomEvent('api-product-saving', { bubbles: true, composed: true, detail: { id: this.itemName, saving: v } }));
    }

    _computeAPIUrl(api_action, customizationType, websiteUrl)
    {
        if (!api_action || !customizationType || !websiteUrl) { return '' }

        var apiPath = '/api/v1.0/product/'
        if (customizationType == 'team') { apiPath = '/api/v1.0/team/' }
        return this.websiteUrl + apiPath + api_action
    }

    _api_modelChanged(teamcolors, teamnames, teamsports, player, productP, viewsP, pointOfView, doptions, sizes, photos, dims, qty, cusType, productSides, roster)
    {
        // if (!teamcolors || !teamnames || !teamsports || !player || !productP || !viewsP || pointOfView === undefined || !doptions || !sizes || !photos || !cusType) { return }
        if (!player || !productP || !viewsP || pointOfView === undefined || !doptions || !sizes || !photos || !cusType) { return }

        // if (this._dev) { console.log('_api_modelChanged...' + this.api_action + ' | '  + this._ischanging, player) }
        // console.log(productP.value.AccessoryVariants)

        if (this._ischanging) /// && (this.api_action != 'get' || player.path != 'itemModel.Player.PlayerName'))
        {
            // console.log('_ischanging ...')
            this.itemModelOld = this.cloneModel(this.itemModel) //clone
            return //EXIT !!!
        } //internal update..

        if (roster?.id == '_new_')
        {
            this.async(() => {
                this.dispatchEvent(new CustomEvent('api-roster-edit', { bubbles: true, composed: true, detail: { 
                    item: this.itemModel
                } }))
            }, 100)
            return //EXIT !!!
        }

        var itemModelOld = this.cloneModel(this.itemModelOld) //clone
        if (itemModelOld)
        {
            // itemModelOld.CustomizationType = this.itemModel.CustomizationType
            itemModelOld.SizesLoсkedFlag = this.itemModel.SizesLoсkedFlag
            itemModelOld.lid = this.itemModel.lid

            //ignore point of view changes
            itemModelOld.ProductPointOfView = this.itemModel.ProductPointOfView
            if (this.customizationType == 'wizard' || this.customizationType == 'coach')
            {
                if (this.itemModel.ProductViews && itemModelOld.ProductViews)
                {
                    //
                }
                else
                {
                    itemModelOld.ProductViews = Object.assign([], this.itemModel.ProductViews)
                }
            }
            else
            {
                itemModelOld.ProductViews = Object.assign([], this.itemModel.ProductViews)
            }


            // var sortBy = (arr, p) =>
            // {
            //     return arr.slice(0).sort(function (a, b)
            //     {
            //         return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
            //     });
            // }

            if (itemModelOld.Player) { itemModelOld.Player.notvalid = this.itemModel?.Player?.notvalid }
            if (itemModelOld.Team) { itemModelOld.Team.notvalid = this.itemModel?.Team?.notvalid }
            itemModelOld.notvalid = this.itemModel.notvalid

            if (this.customizationType == 'wizard')
            {
                var hasChanges = false
                for (var i in this.itemModel.DesignOptionSetList)
                {
                    if (hasChanges) { break }

                    for (var k in this.itemModel.DesignOptionSetList[i].DesignOptions)
                    {
                        if (hasChanges) { break }

                        var dopt = this.itemModel.DesignOptionSetList[i].DesignOptions[k]
                        var setiA = itemModelOld.DesignOptionSetList.filter(f => { return f.ID == this.itemModel.DesignOptionSetList[i].ID })
                        if (setiA.length > 0) 
                        {
                            var doptoA = setiA[0].DesignOptions.filter(f => { return f.ID == dopt.ID })
                            if (doptoA.length > 0 && dopt.Selected !== doptoA[0].Selected)
                            {
                                // console.log(doptoA)
                                hasChanges = true
                            }
                        }
                        if (dopt.deleting === true) { hasChanges = true }
                    }
                    
                    // var f = this.itemModel.DesignOptionSetList[i].DesignOptions
                    //     .filter(i =>
                    //     {
                    //         return i.deleting !== true
                    //     })
                    // if (f.length != itemModelOld.DesignOptionSetList[i].DesignOptions.length)
                    // {
                    //     hasChanges = true
                    // }
                }
                if (!hasChanges)
                {
                    itemModelOld.DesignOptionSetList = this.itemModel.DesignOptionSetList
                }
            }


            if (itemModelOld.Team?.TeamNames && this.itemModel.Team?.TeamNames) 
            { 
                for (var i in this.itemModel.Team.TeamNames)
                {
                    if (itemModelOld.Team.TeamNames[i] === undefined && this.itemModel.Team.TeamNames[i] === "")
                    {
                        itemModelOld.Team.TeamNames[i] = this.itemModel.Team.TeamNames[i]
                    }
                }
            }
            if (itemModelOld.DesignOptionSetListWizardState === null && this.itemModel.DesignOptionSetListWizardState === undefined)
            {
                itemModelOld.DesignOptionSetListWizardState = this.itemModel.DesignOptionSetListWizardState
            }
        }

        var newStr = JSON.stringify(this.itemModel)
        var oldStr = JSON.stringify(itemModelOld)

        // if (this._dev)
        // {
        //     var diff = StringUtil.compareAsJSON(this.itemModel, itemModelOld)
        //     if (diff) 
        //     { 
        //         console.log(this.customizationType, diff.old, diff.new) 
        //     }
        // }

        if (oldStr == newStr && itemModelOld.CustomizationType == this.customizationType) { return }
        this._changesTimes += 1
        var pvStr = JSON.parse(newStr)
        delete pvStr.ProductPointOfView
        pvStr = JSON.stringify(pvStr)
        if (this._lastUpdateModelJson == pvStr) { return }
        this._lastUpdateModelJson = pvStr


        var handler = () =>
        {
            this.set('debouncing.textinput', false)

            this.itemModelOld = this.cloneModel(this.itemModel) //clone
            if (this.api_action == 'get' && this.itemModel) { this.api_action = 'update' }

            // console.log('GO! ... api model action: ' + this.api_action, this._changesTimes)
            this._changesTimes = 0

            this._fetchItems(this.itemName, 3)
        }

        var dt = 10
        if (this.itemModel && itemModelOld
            && ((this.itemModel.Player && itemModelOld.Player 
                && (this.itemModel.Player.PlayerYear != itemModelOld.Player.PlayerYear || this.itemModel.Player.PlayerNumber != itemModelOld.Player.PlayerNumber || this.itemModel.Player.PlayerName != itemModelOld.Player.PlayerName))
                || JSON.stringify(this.itemModel?.Team?.TeamNames) != JSON.stringify(itemModelOld?.Team?.TeamNames)))
        {
            //console.log('debounce for text input')
            dt = 1450
            this.set('debouncing.textinput', true)
        }
        // if (this.itemModel && itemModelOld
        //     && (JSON.stringify(this.itemModel['DesignOptionSetList']) != JSON.stringify(itemModelOld['DesignOptionSetList'])))
        // {
        //     console.log('debounce for design options...')
        //     dt = 2450
        // }
        // console.log('_modelChangeDebouncer ' + dt)
        if (this.api_action == 'update')
        {
            this._getResourceCancel() //cancel recent request if any
        }

        this._modelChangeDebouncer = Debouncer.debounce(this._modelChangeDebouncer,
            timeOut.after(dt),
            handler
        )
    }

    _itemNameChanged(nv, ov)
    {
        // console.log('_itemNameChanged: ' + ov + ' -> ' + nv)
        // if (!ov && nv)
        // {
        //     // console.log('reset')
        //     this.reset()
        // }
        if (nv === '')
        {
            // console.log('this.itemModel = null')
            this.itemModel = null
            this._setFailure(false)
        }
    }

    _itemModelChanged(v)
    {
        if (!(v && ProductConfigurationModel && v instanceof ProductConfigurationModel && v.CustomizationType == 'player')) { return }

        this.dispatchEvent(new CustomEvent('api-product-loaded', { bubbles: true, composed: true, detail: { id: this.itemName, model: v } }));
    }

    _fetchItems(itemName, attempts)
    {
        // if (this._dev) { console.log('_fetchItems ', this.customizationType, itemName) }
        
        if (!this.visible) 
        {
            // console.log('_fetchItems -> !visible | api: ' + this.api_action + " -> SKIP!")
            return
        }

        if (!this.productCache) { this.productCache = {} }
        var cacheItem = this.productCache[this._getCacheID(this.customizationType, this.itemName)]
        var allowCache = true
        if (this.customizationType == 'coach' && cacheItem && cacheItem.CanCustomize === false) { allowCache = false }
        if (this.itemModel) { allowCache = false }

        if (cacheItem && allowCache)
        {
            this._ischanging = true
            this.itemModel = cacheItem
            this._ischanging = false
        }

        this._setFailure(false)

        var obj = (this.api_action == 'get' ? this._convertJson2Class(undefined) : this.cloneModel(this.itemModel))

        obj.ProductConfigurationID = this.itemName
        obj.CustomizationType = this.customizationType


        // if (this.api_action == 'get' && this.itemModel)
        // {
        //     this.itemModel.sizesLoсkedFlag = true
        // }

        if (this.customizationType == 'player' && this.api_action == 'update' && obj.SizesLoсkedFlag && Array.isArray(obj.SizesSelected))
        {
            this._ischanging = true
            var s:any = null
            for (var i in obj.SizesSelected)
            {
                if (s == null) 
                {
                    s = obj.SizesSelected[i]
                }
                else
                {
                    this.itemModel.SizesSelected[i].Size = s.Size
                    this.notifyPath('itemModel.SizesSelected.' + i + '.Size')
                }
            }
            this._ischanging = false
        }

        if (this.customizationType == 'wizard' || this.customizationType == 'coach') //allow coach for switching modes
        {
            for (var i in obj.DesignOptionSetList)
            {
                obj.DesignOptionSetList[i].DesignOptions = obj.DesignOptionSetList[i].DesignOptions
                    .filter(i => { 
                        return i.deleting !== true 
                    })
                    .sort(function (x, y)
                    {
                        var a = (!Number.isInteger(x.newindex) ? Number.MAX_SAFE_INTEGER : x.newindex)
                        var b = (!Number.isInteger(y.newindex) ? Number.MAX_SAFE_INTEGER : y.newindex)
                        if (a < b) { return -1 }
                        if (a > b) { return 1 }
                        return 0
                    })
            }
        }

        // console.log(this.customizationType, this.queryParams, window.location.href)
        ///queryParams - parse
        if (this.api_action == 'get' && this.queryParams != undefined)
        {
            ProductData.product_queryapply(obj, this.queryParams, this.customizationType)
        }


        ///cleanup due: Application Gateway, traffic optimization
        if (this.api_action !== 'get')
        {
            if (Array.isArray(obj.ProductViews))
            {
                for(var i in obj.ProductViews)
                {
                    obj.ProductViews[i] = { 
                        ViewId: obj.ProductViews[i].ViewId,
                        Selected: obj.ProductViews[i].Selected,
                    }
                }
            }
            
            //cleanup huge data fields
            for (var i in obj.DesignOptionSetList)
            {
                obj.DesignOptionSetList[i].DesignOptions = obj.DesignOptionSetList[i].DesignOptions.map(i => { return { ID: i.ID, Selected: i.Selected, OptionName: i.OptionName } })
            }

            if (obj.ProductSides) { obj.ProductSides = obj.ProductSides.map(i => { return { ID: i.ID, Selected: i.Selected } }) }

            if (obj.Product?.AccessoryVariants)
            {
                var productAccVar = obj.Product.AccessoryVariants.find(i => i.Selected)
                obj.Product = { AccessoryVariants: [productAccVar] }
            }

            delete obj.ColorsPalette
            delete obj.Store
            delete obj.Price
            delete obj.SportsList
            delete obj.RosterList
            delete obj.ProductOverlays
            delete obj.PlayerCaptainOptions
            delete obj.RecentProducts
        }
        obj.tz = new Date().getTimezoneOffset()

        this.api_body = obj

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

    _onRequestResponse(e)
    {
        this._setLoading(false)
        this._setSaving(false)

        var validationHndl = () => 
        {
            var path = 'itemModel'
            if (Array.isArray(r['details']) && r.details.length > 0)
            {
                var notvalid = {}
                var notvalidPlayerInfo = {}
                var notvalidTeamInfo = {}
                for (var i in r.details)
                {
                    var fname = r.details[i].Key
                    var message = r.details[i].Message
                    var inx = fname.lastIndexOf('.')
                    var pname = inx >= 0 ? fname.substr(inx + 1) : ''
                    // var prefix = inx >= 0 ? fname.substring(0, inx) : ''
                    if (pname && fname.indexOf('Player.') >= 0)
                    {
                        notvalidPlayerInfo[pname] = message
                    }
                    else if (pname && fname.indexOf('Team.') >= 0)
                    {
                        notvalidTeamInfo[pname] = message
                    }
                    else //no root path
                    {
                        notvalid[fname] = message
                    }
                }
                if (Object.keys(notvalidPlayerInfo).length > 0) { this.set(path + '.Player.notvalid', notvalidPlayerInfo) }
                if (Object.keys(notvalidTeamInfo).length > 0) { this.set(path + '.Team.notvalid', notvalidTeamInfo) }
                if (Object.keys(notvalid).length > 0) 
                { 
                    this.set(`${path}.notvalid`, notvalid)
                }
            }
        }

        var customizationLocked = (type, message) => 
        {
            var barr: any = []

            if (type == 'customizationlocked')
            {
                barr.push({
                    title: this.localize('product-notfound-ok-btn'),
                    ontap: (e) => 
                    {
                        const customizeAndAllModes = this.customizationType == 'customize' || this.customizationType == 'coach' || this.customizationType == 'wizard'
                        if (customizeAndAllModes) 
                        { 
                            this._gotoProduct(this.itemName, this.categoryName) 
                        }
                        else
                        {
                            this._gotoRoot()
                        }
                    }
                })
            }
            else
            {
                barr.push({
                    title: this.localize('product-notfound-ok-btn'),
                        ontap: (e) => 
                        {
                            //
                        }
                })
            }
            
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: message,
                    message: message,
                    buttons: barr,
                    errorid: r?.errorid ? r.errorid : null,
                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }

        // console.log(e)
        var r = e['response']
        if (!r || r['success'] !== true)
        {
            if (!r || r['success'] === false)
            {
                var summary = r ? r['summary'] : null //obj

                if (summary && (summary.Key == 'customizationlocked' || summary.Key == 'customizationviolated'))
                {
                    this.itemModel = undefined
                    customizationLocked(summary.Key, summary.Message)
                }
                else if (summary && summary.Key == 'validation_fail') 
                {
                    validationHndl()
                }
                else
                {
                    this.itemModel = null
                }
            }
            else
            {
                this._setFailure(true)
            }

            if (this.api_action == 'save' || this.api_action == 'clone')
            {
                this.api_action = 'update'
            }
            return  /////////////////////////////////////////////
        }

        if (r['summary'])
        {
            var summary = r['summary'] //obj
            if (summary && (summary.Key == 'customizationlocked' || summary.Key == 'customizationviolated'))
            {
                customizationLocked(summary.Key, summary.Message)
            }
        }

        // console.log('success-> result...')
        var updatedModel = this._convertJson2Class(r['result'])//, this.itemModel)
        // if (this.itemModel && updatedModel)
        // {
        //     updatedModel.sizesLoсkedFlag = this.itemModel.sizesLoсkedFlag //UI only therefore need to be transfered
        // }


        if (this.customizationType == 'coach' && updatedModel && updatedModel.CanCustomize === false)
        {
            this.itemModel = null
            return ///EXIT
        }

        //TEMP: FIX
        // delete updatedModel.Player
        // if (this.api_action == 'save')
        // {
        //     updatedModel.lid = null 
        // }
        // updatedModel.lid = (this.queryParams && this.api_action != 'save' ? this.queryParams['lid'] : null)

        // if (this.customizationType == 'player')
        // {
        //     updatedModel.RosterList = [{ ID: '', Title: 'Single Item' }, { ID: '1IEAUI5RCBZGUEHWAWZ4QVOTJ1B', Title: 'My Roster 1 (10)' }, { ID: '7NLQ0CGGZUXLKUDGF103HOULUHE', Title: 'My Roster 2 (32)' }, { ID: '2CCXWQMGH34MPE50SMVEEHGEUGH', Title: 'My Roster 3 (91)' }, ]
        //     updatedModel.Roster = this.queryParams['rid'] ? updatedModel.RosterList.filter(i => i.ID == this.queryParams['rid'])[0] : updatedModel.RosterList[0]
        // }


        // if (this.api_action != 'get' && this.productCache && this.productCache[updatedModel.ProductConfigurationID])
        // {
        //     console.log('restore SportsList from cache', this.productCache[updatedModel.ProductConfigurationID].SportsList)
        //     updatedModel.SportsList = this.productCache[updatedModel.ProductConfigurationID].SportsList
        // }

        if (updatedModel.CanClone === undefined) 
        { 
            // updatedModel.CanClone = true 
        }


        this._ischanging = true
        this.itemModel = updatedModel
        if ((r && r['summary'] && r.summary.Key == 'validation_fail') || (r && r['details']))
        {
            validationHndl()
        }
        var updatedModelID = updatedModel && updatedModel.ProductConfigurationID ? updatedModel.ProductConfigurationID : ''
        if (this.itemName != updatedModelID && this.itemName != "href:team-create")
        {
            // console.warn(this.itemName, '=>', updatedModelID)
            this.set('itemRedirected', this.itemName)

            this._gotoProductRS(updatedModelID, this.categoryName)
        }
        else if (this.itemRedirected)
        {
            this.set('itemRedirected', '')
        }
        this._ischanging = false


        //save data
        if (!this.productCache) { this.productCache = {} }
        var cacheID = this._getCacheID(this.customizationType, updatedModelID)
        this.productCache[cacheID] = this._getCacheItem(updatedModel)
        this.notifyPath('productCache.' + cacheID)

        //update objects back
        this.customizationType = this.itemModel?.CustomizationType


        ///queryParams - build
        if (this.api_action == 'update' && this.queryParams != undefined)
        {
            var qp = ProductData.product_query(updatedModel, this.queryParams, this.customizationType, 'update')
            window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            this.set('queryParams', qp)
        }
        else if (this.api_action == 'save' || this.api_action == 'clone')
        {
            this.api_action = 'update'

            // console.log('Save Succeed!')
            if (this._saveSuccessHandler) { this._saveSuccessHandler.call(undefined, { id: updatedModelID, store: updatedModel.Store }) }
        }

    }

    _onRequestError(e)
    {
        this._setLoading(false)
        this._setSaving(false)
        this._setFailure(true)
    }

    _getCacheID(customizationType, itemID)
    {
        var cacheKey = customizationType
        switch (customizationType)
        {
            case 'customize':
            case 'coach':
            case 'wizard':
                cacheKey = 'customize'
                break

            // case 'player':
            // case 'team':
            default:
                cacheKey = customizationType
                break
        }

        return cacheKey + '|' + itemID
    }

    _getCacheItem(updatedModel)
    {
        //clean
        var pobj = Object.assign({}, updatedModel)
        delete pobj.DesignOptionSetListWizardState
        delete pobj.RecentProducts
        return pobj
    }

    //addToCart() - is in cart-data >>>> addItem(entry)

    addToStore(storeID, success, failed)
    {
        var api_action = 'add-to-store'
        const ex = this.userInfo.isAdmin && storeID
        if (ex)
        {
            api_action = 'add-to-store-ex'
        }
        
        const api_url = this._computeAPIUrl(api_action, this.customizationType, this.websiteUrl)
        var api_body = this.cloneModel(this.itemModel)
        if (ex)
        {
            api_body = Object.assign(api_body, { StoreID: storeID })
        }

        var rq = {
            url: api_url,
            body: api_body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: (e) =>
            {
                if (e.response && e.response.result)
                {
                    var store = Object.assign(new StoreConfigurationModel(), e.response.result)
                    if (success) { success(store) }
                }
                else
                {
                    if (failed) { failed(e.response) }
                }
                this._setSaving(false)
            },
            onError: (e) =>
            {
                this._setSaving(false)
            }
        }

        this._setSaving(true)
        this._getResource(rq, 1, true)
    }


    cloneModel(m)
    {
        if (m)
        {
            return this._convertJson2Class(JSON.parse(JSON.stringify(m)))
        }
        return m
    }

    _fillAbsUrl(item)
    {
        return item
    }

    _convertJson2Class(res, update?)
    {
        if (!res) { return new ProductConfigurationModel() }


        res.category = this.categoryName

        // console.log(res)

        var obj: any = null
        if (update)
        {
            obj = Object.assign(update, res)
        }
        else
        {
            obj = Object.assign(new ProductConfigurationModel(), res)
        }

        obj.Price = Object.assign(new ProductPriceModel(), obj.Price)
        obj.Product = Object.assign(new ProductCustomModel(), obj.Product)
        //obj.Product.Description = null
        obj.Product = this._fillAbsUrl(obj.Product)
        var pmlist = obj.Product.ProductManufacturers
        for (var i in pmlist)
        {
            pmlist[i] = Object.assign(new ProductManufacturerModel(), pmlist[i])
            //pmlist[i].Sizes = null
            var jlist = pmlist[i].Sizes
            if (!Array.isArray(jlist)) { continue }
            for (var j in jlist)
            {
                jlist[j] = Object.assign(new SizeModel(), jlist[j])
            }
        }

        if (obj.Player)
        {
            obj.Player = Object.assign(new PlayerInfoModel(), obj.Player) 
        }
        
        if (obj.Team)
        {
            obj.Team = Object.assign(new TeamInfoModel(), obj.Team)
            for (var i in obj.Team.Colors)
            {
                obj.Team.Colors[i] = Object.assign(new ColorModel(), obj.Team.Colors[i])
            }
        }

        var ilist = obj.DesignOptionSetList
        for (var i in ilist)
        {
            ilist[i] = Object.assign(new DesignOptionSetModel(), ilist[i])
            if (<any>i == 0) { ilist[i].isCollapsed = false }

            var jlist = obj.DesignOptionSetList[i].DesignOptions
            for (var j in jlist)
            {
                jlist[j] = Object.assign(new DesignOptionModel(), jlist[j])
                jlist[j] = this._fillAbsUrl(jlist[j])
            }
        }

        // obj.SizesSelected = null
        var slist = obj.SizesSelected
        if (Array.isArray(jlist))
        {
            for (var s in slist)
            {
                slist[s] = Object.assign(new SizeInfoModel(), slist[s])
                slist[s].Size = Object.assign(new SizeModel(), slist[s].Size)
            }
        }


        // console.log(obj)

        return obj
    }

    async checkAllViews()
    {
        var last_action = this.api_action
        var obj = this.cloneModel(this.itemModel)
        this.api_action = 'get-sidebyside'
        var result = await this._apiRequest(this.api_url, obj)
        this.api_action = last_action
        return result
    }
}