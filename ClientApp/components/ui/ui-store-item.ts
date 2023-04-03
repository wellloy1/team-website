//@dynamicaly loading in store...
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
//
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { PaperInputBehavior } from '@polymer/paper-input/paper-input-behavior'


import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'

import { CustomElement, Currency, asBool } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from '../bll/net-base'
import { UIBase } from '../ui/ui-base'
import { UIImage } from '../ui/ui-image'
import view from './ui-store-item.ts.html'
import style from './ui-store-item.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import { UIListItem } from './ui-list-item'
const Teamatical: TeamaticalGlobals = window['Teamatical']
// import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js'


@CustomElement
export class UIStoreItem extends UIBase
{
    static get is() { return 'teamatical-ui-store-item' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            item: { type: Object, observer: '_itemLoaded' },
            storeId: { type: String },
            websiteUrl: { type: String },
            isSeparator: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            hidePrices:{ type: Boolean, value: false, reflectToAttribute: true },

            editingDetails: { type: Boolean, value: false, notify: true },
            editingDetailsAnimated: { type: Boolean, value: false, notify: true },
            editing: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            deleting: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            // branded: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            isMoving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            isProfitVal: { type: Boolean, value: false, notify: true },
            isOrganization: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            canHideItem: { type: Boolean, value: true, notify: true }, //can-hide-item
            canNobadges: { type: Boolean, value: false, notify: true }, //can-nobadges
            smallScreen: { type: Boolean, value: false, reflectToAttribute: true }, //small-screen
            smallWidth: { type: Boolean, value: false, reflectToAttribute: true }, //small-width
            addBackground: { type: Boolean, value: false, reflectToAttribute: true },

            priceRegularShow: { type: Boolean, computed: '_existsPrice(item.price.ListPrice)' },
            priceRegular: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(item.price.ListPrice, item.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            // priceDiscounts: { type: Array, computed: '_computeDisounts(item.price.DiscountOffers, item.price.AppliedDiscounts)' },
            priceDiscounts: { type: Array, value: [] },

            profitOutput: { type: String, computed: '_compute_profitOutput(isProfitVal, item.profitValue, item.profit, item.priceFee, item.priceB2B2C, item.profitBase, item.price.Currency)' },
            profitOutputLabel: { type: String, computed: '_compute_profitOutputLabel(isProfitVal, item.profit, item.profitBase, item.price.Currency)' },
            profitMROutput: { type: String, computed: '_compute_profitMROutput(isProfitVal, item.profit, item.profitBase, item.price.Currency)' },
            profitB2B2COutput: { type: String, computed: '_compute_profitB2B2COutput(isProfitVal, item.profit, item.priceB2B2C, item.price.Currency)' },
            profitFeeOutput: { type: String, computed: '_compute_profitFeeOutput(isProfitVal, item.profitValue, item.priceFee, item.price.Currency)' },
            profitStripeFeeOutput: { type: String, computed: '_compute_profitStripeFeeOutput(isProfitVal, item.profitValue, item.profit, item.price.Currency)' },
            profitSellerOutput: { type: String, computed: '_compute_profitSellerOutput(isProfitVal, item.profitValue, item.profit, item.priceFee, item.priceB2B2C, item.profitBase, item.price.Currency)' },

            _hideEditDelayed: { type: Boolean, value: true, notify: true },
            _hideEdit: { type: Boolean, computed: '_computeHideEdit(editing)' },
            hasErrors: { type: Boolean, computed: '_compute_hasErrors(item.hasErrors)', notify: true, reflectToAttribute: true },

            isCutted: { type: Boolean, value: false, reflectToAttribute: true },
            isPaste: { type: Boolean, value: false, reflectToAttribute: true },
            isLast: { type: Boolean, value: false, notify: true },
            isFirst: { type: Boolean, value: false, notify: true },
        }
    }

    static get observers()
    {
        return [
            '_editingDetailsChanged(editingDetails)',
            // '_log(editingDetailsAnimated)',
        ]
    }
    _log(v) { console.log(v) }

    constructor()
    {
        super()
    }

    _ready: any
    _editDebouncer: any
    _debouncerProfitUpdate: any
    _hideEditDelayed: any
    item: any
    deleting: any
    editing: any
    smallScreen: any
    storeId: any
    netbase: NetBase
    websiteUrl: any
    addBackground: boolean
    editingDetails: boolean
    isTouch: boolean
    isProfitVal: boolean
    // branded: boolean
    isSeparator: boolean
    backdropElement: any
    isMoving: boolean

    
    get img() { return (this.$['img'] instanceof UIImage) ? this.$['img'] : null }
    get uiprofit() { return this.$['uiprofit'] as PaperInputElement }
    

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
        this._ready = true

        this.isTouch = this.isTouchStartSupported()

        var handleStopEditingDetails = (e) => 
        {
            var epath = e.path || e.composedPath()
            var f = epath.filter(i => {
                return (i && i.classList && i.classList.contains('details-edit'))
            })
            if (this.editingDetails && f.length == 0)
            {
                // console.log('editingDetails', this.editingDetails, ' -> false')
                this.editingDetailsHide()
            }
        }
        document.body.addEventListener('tap', handleStopEditingDetails)

        // this.addEventListener('mouseout', (e) => { if (this.editingDetails) { this.editingDetailsHide() } })
    }

    formatPercent(val, m = 2)
    {
        return `~${this._formatPercent(val, 0)}`
    }


    formatTitle(item_title, item_titleEdit)
    {
        if (!item_titleEdit) { return item_title }
        return item_titleEdit
    }

    localizeTitle(isOrganization, editingDetails, itemPrice, itemProductDisabledReason)
    {
        var t = ''
        if (!itemPrice)
        {
            t = itemProductDisabledReason ? itemProductDisabledReason : this.localize('store-item-price-issues')
        }
        else //if (!(editingDetails || !itemPrice))
        {
            t = isOrganization ? this.localize('store-item-profit-mark') : this.localize('store-item-default-mark')
        }
        return t
    }

    backdropHide()
    {
        if (!this.backdropElement) { return }

        this.backdropElement.style.display = 'none'
        this.backdropElement.style.opacity = '0'
    }

    onBackdropTap(e)
    {
        this.editingDetailsHide()
        return this.eventNullStop(e)
    }

    backdropShow()
    {
        if (!this.backdropElement)
        {
            this.backdropElement = document.createElement("div") as HTMLDivElement
            // this.backdropElement.addEventListener('touchstart', (e) =>
            // {
            //     return this.eventNullStop(e)
            // })
            this.backdropElement.addEventListener('tap', this.onBackdropTap.bind(this))
            this.backdropElement.addEventListener('wheel', this.eventNullStop, { passive: false })
            this.backdropElement.addEventListener('DOMMouseScroll', this.eventNullStop, { passive: false })

            this.backdropElement.style = `
                display: none;
                top: 0px;
                left: 0px;
                right: 0px;
                background-color: black;
                opacity: 0;
                bottom: 0px;
                z-index: 10;
                transition: all 0.3s cubic-bezier(.36,-0.64,.34,1.76);
                position: fixed;`
            this.root?.appendChild(this.backdropElement)


            //!!!!!!!!!!!!!!!!!!!slider formatting feature
            var sliderVal: any = this.shadowRoot?.querySelector('paper-slider#profitSliderEditVal')
            var self = this
            if (sliderVal)
            {
                sliderVal._formatPin = function (val)
                {
                    var str = self._formatPrice(val, self.item.price.Currency)
                    // console.log(str)
                    return str
                }.bind(sliderVal)
            }
            
            var sliderPer: any = this.shadowRoot?.querySelector('paper-slider#profitSliderEdit')
            if (sliderPer)
            {
                sliderPer._formatPin = function (val)
                {
                    return self.formatPercent(val)
                }.bind(sliderPer)
            }
        }
        

        this.backdropElement.style.display = ''
        this.async(() => { this.backdropElement.style.opacity = '0.25' })
    }

    editingDetailsHide(ext?)
    {
        this.editingDetails = false
        this.backdropHide()

        if (ext) { return }

        this.dispatchEvent(new CustomEvent('api-store-item-editing-details', {
            bubbles: true, composed: true, detail: {
                editingDetails: this.editingDetails,
                dom: this,
                index: this.__dataHost?.__data?.index,
            }
        }))
    }

    editingDetailsShow()
    {
        if (this.editingDetails) { return }

        this.editingDetails = true
        this.backdropShow()

        this.dispatchEvent(new CustomEvent('api-store-item-editing-details', {
            bubbles: true, composed: true, detail: {
                editingDetails: this.editingDetails,
                dom: this,
                index: this.__dataHost?.__data?.index,
            }
        }))

        //TODO: get focus
        // var dlgEl: any = this.shadowRoot.querySelector('paper-slider#profitSliderEditVal')
        // if (dlgEl) { dlgEl.focus() }
    }

    // __dataHost: any
    _editingDetailsChangedDebouncer: Debouncer
    editingDetailsAnimated: boolean
    _editingDetailsChanged(editingDetails)
    {
        this._editingDetailsChangedDebouncer = Debouncer.debounce(this._editingDetailsChangedDebouncer, timeOut.after(350), () =>
        {
            this.editingDetailsAnimated = editingDetails
        })

        

        // console.log(this.__dataHost.__data.index, editingDetails)
        // this.dispatchEvent(new CustomEvent('api-store-item-editing-details', { bubbles: true, composed: true, detail: { 
        //     editingDetails: editingDetails,
        //     dom: this,
        //     index: this.__dataHost.__data.index,
        // } }))
    }

    _compute_profitSellerOutput(isProfitVal, profitValue, profitPP, profitFee, priceB2B2C, profitBase, itemCurrency)
    {
        if (!this._asBool(profitValue) || (itemCurrency != 'USD' && itemCurrency != 'usd')) { return '' }
        
        var stripeFee = Math.round(profitValue * 0.029 + 30) //Stripe Price - '2.9% + 30¢'
        var tmFee = Math.floor((profitValue * profitFee?.n) / profitFee?.d)
        var sellerProfit = (profitValue) - priceB2B2C - tmFee - stripeFee
        if (sellerProfit < 0) { return '' }
        var fp = this._formatPrice(sellerProfit, itemCurrency)
        var pp = `${(100 * sellerProfit / profitValue).toFixed(2)}%`
        return `${fp} (${pp})`
    }

    _compute_profitStripeFeeOutput(isProfitVal, profitValue, profitPP, itemCurrency)
    {
        if (!this._asBool(profitValue) || (itemCurrency != 'USD' && itemCurrency != 'usd')) { return '' }
        
        //Stripe Price - '2.9% + 30¢'
        var stripeFee = Math.round(profitValue * 0.029 + 30)
        var fp = this._formatPrice(stripeFee, itemCurrency)
        return `${fp}`
    }

    _compute_profitFeeOutput(isProfitVal, profitValue, profitFee, itemCurrency)
    {
        if (!Number.isFinite(profitFee?.n) || !Number.isFinite(profitFee?.d) || !profitFee || !itemCurrency) { return this.localize('store-item-profit-none') }

        var tmFee = Math.floor((profitValue * profitFee.n) / profitFee.d)
        var fp = this._formatPrice(tmFee, itemCurrency)
        return `${fp}`
    }

    _compute_profitB2B2COutput(isProfitVal, profitPP, itemProfitB2B2C, itemCurrency)
    {
        if (!itemProfitB2B2C || !itemCurrency) { return this.localize('store-item-profit-none') }
        var fp = this._formatPrice(itemProfitB2B2C, itemCurrency)
        return `${fp}`
    }

    _compute_profitMROutput(isProfitVal, profitPP, itemProfitBase, itemCurrency)
    {
        if (!Number.isFinite(profitPP) || !itemProfitBase || !itemCurrency) { return this.localize('store-item-profit-none') }

        // var pp = `${profitPP / 100}%`
        // var pp = this.formatPercent(profitPP)
        var fp = this._formatPrice(itemProfitBase, itemCurrency)
        // if (fp == '') { fp = '--' }
        // console.log(profitPP, itemSalePriceFinal, itemCurrency, '->', pp, fp)
        // return `${fp} (${pp})`
        return `${fp}`
    }

    _compute_profitOutput(isProfitVal, profitValue, profitPP, profitFee, priceB2B2C, profitBase, itemCurrency)
    {
        if (!this._asBool(profitValue)) { return this.localize('store-item-profit-none') }
        
        var pp = null
        if (itemCurrency == 'USD' && itemCurrency == 'usd')
        {
            var stripeFee = Math.round(profitValue * 0.029 + 30) //Stripe Price - '2.9% + 30¢'
            var tmFee = Math.floor((profitValue * profitFee.n) / profitFee.d)
            var sellerProfit = (profitValue) - priceB2B2C - tmFee - stripeFee
            if (sellerProfit < 0) { return this.localize('store-item-profit-none') }
            pp = `${(100 * sellerProfit / profitValue).toFixed(2)}%`
        }
        var fp = this._formatPrice(profitValue, itemCurrency)
        return pp ? `${fp} (${pp})` : `${fp}`
    }
 
    _compute_profitOutputLabel(isProfitVal, profitPP, itemProfitBase, itemCurrency)
    {
        // [[localize('store-item-profit-label')]]
        if (this.smallScreen) { return '' }
        return this.localize('store-item-profit-label')
    }

    _compute_hasErrors(itemhasErrors)
    {
        return itemhasErrors
    }

    _computeHideEdit(editing)
    {
        var v = !editing

        this._suppressSlider = true
        this._editDebouncer = Debouncer.debounce(this._editDebouncer, timeOut.after(250), () =>
        {
            this._hideEditDelayed = v
            this._suppressSlider = false
        })

        return v
    }


    closeDetailsTap(e)
    {
        this.editingDetailsHide()

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    switchProfitModeTap(e)
    {
        // var item = e.target.__dataHost.__data.item
        // this._setProfitModel('switch', !this.isProfitVal, item.profit, item.price.SalePriceFinal, item.price.Currency)
        // this.isProfitVal = !this.isProfitVal


        // var input = e.target.parentElement.parentElement
        // var focused = input.focused
        // var ev = Object.assign({}, e, { path: [input] })
        // if (focused) { this.async(() => { this._restoreFocus(ev) }) }
    }
    
    onWheel(e)
    {
        if (this.editingDetails)
        {
            return this.eventNullStop(e)
        }
    }

    onEditDetailsTap(e)
    {
        this.editingDetailsShow()
        // console.log('onEditDetailsTap', this.editingDetails, ' -> TRUE')
        this._restoreFocus(e)
    }

    _restoreFocus(e)
    {
        if (this.isTouch && this.editing)
        {
            var epath = e.path || e.composedPath()
            // console.log(epath)
            var txt = epath[0]
            if (txt.tagName == 'INPUT' || txt.tagName == 'PAPER-INPUT') 
            {
                txt.blur()
                txt.focus()

                if ('preventDefault' in e) { e.preventDefault() }
                if ('stopPropagation' in e) { e.stopPropagation() }
                return false
            }
        }

    }

    onSliderProfitValChanged(e)
    {
        if (this.deleting || this.isSeparator || this.isMoving || this._itemUpdating) { return }
        
        var newVal = e.target.value

        this.set('item.notvalid.profit', '')
        this._setProfitModel('sliderV', this.isProfitVal, 0, newVal, this.item.price?.Currency)
    }

    onSliderProfitChanged(e)
    {
        if (this.deleting || this.isSeparator || this.isMoving || this._itemUpdating) { return }

        var newPer = e.target.value
        this.set('item.notvalid.profit', '')
        this._setProfitModel('sliderP', this.isProfitVal, newPer, 0, this.item.price?.Currency)
    }

    _itemUpdating = false
    _itemLoaded(item, oldItem)
    {
        if (this._itemUpdating) { return }

        if (!item.isseparator)
        {
            this.isProfitVal = true

            this._itemUpdating = true
            this.set('item', UIStoreItem.initModel(item))
            this._itemUpdating = false
        }
        if (this.deleting) { this.set('deleting', false) }
    }

    static uif: UIStoreItem
    static initModel(item)
    {
        if ((item.profit === undefined && item.profitValue === undefined) || item.profitBase === undefined) { return item }

        var profit = item.profit
        var profitValue = item.profitValue
        var pb = item.profitBase
        var price = item.price.SalePriceFinal
        var currency = item.price.Currency
        var isProfitVal = true

        if (asBool(profitValue))
        {
            price = profitValue
            var pp = (price - pb) / pb
            profit = Math.ceil(pp * 10000)
        }
        else if (asBool(profit))
        {
            price = pb + Math.floor(pb * profit / 10000)
        }

        item.profitBaseMax = pb * 4
        item.profitMax = 300 * 100
        item.profitSliderInitial = profit
        item.profitSliderInitialVal = price
        item.profitSliderEdit = profit
        item.profitSliderEditVal = price


        if (!UIStoreItem.uif) { UIStoreItem.uif = new UIStoreItem() }
        item.profitVal = UIStoreItem.uif._formatPrice(price, currency)
        item.profitValue = price
        item.profitP = UIStoreItem.uif.formatPercent(profit)
        item.profitEdit = isProfitVal ? item.profitVal : item.profitP
        item.isProfitVal = isProfitVal
        
        item.profit = profit
        // item.price.SalePriceFinal = price

        return item
    }

    _suppressSlider: boolean
    _setProfitModel(mode, isProfitVal, profit, price, currency)
    {
        switch(mode)
        {
            case 'switch':
                this.set('item.profitEdit', isProfitVal ? this.item.profitVal : this.item.profitP)
                break

            case 'input':
                this.set('item.profitP', this.formatPercent(profit))
                this.set('item.profitVal', this._formatPrice(price, currency))
                this.set('item.profitValue', price)
                this._suppressSlider = true
                this.set('item.profitSliderEdit', profit)
                this.set('item.profitSliderEditVal', price)
                this._suppressSlider = false
                this.set('item.profit', profit)
                // this.set('item.price.SalePriceFinal', price)
                break
                
            case 'sliderP':
            case 'sliderV':
                if (!this._suppressSlider)
                {
                    var pb = this.item.profitBase
                    if (isProfitVal)
                    {
                        var pp = (price - pb) / pb
                        profit = Math.ceil(pp * 10000)
                    }
                    else
                    {
                        price = pb + Math.floor(pb * profit / 10000)
                    }

                    this.set('item.profitVal', this._formatPrice(price, currency))
                    this.set('item.profitValue', price)
                    this.set('item.profitP', this.formatPercent(profit))
                    this.set('item.profitEdit', isProfitVal ? this.item.profitVal : this.item.profitP)

                    var saveSuppressSlider = this._suppressSlider
                    this._suppressSlider = true
                    if (mode == 'sliderP')
                    {
                        this.set('item.profitSliderEditVal', price)
                    }
                    else if (mode == 'sliderV')
                    {
                        this.set('item.profitSliderEdit', profit)
                    }
                    this._suppressSlider = saveSuppressSlider

                    this.set('item.profit', profit)
                    // this.set('item.price.SalePriceFinal', price)
                }
                break
        }
    }

    onInputTitleChanged(e)
    {
        if (e.target) { e.target.invalid = false }
        this.set('item.notvalid', null)
        this.set('item.hasErrors', false)
    }
    
    onInputProfitChanged(e)
    {
        if (e.target) { e.target.invalid = false }
        this.set('item.notvalid', null)
        this.set('item.hasErrors', false)

        var epath = e.path || e.composedPath()
        var val = epath[0].value
        var valF = Currency.parse(val, this.language)

        var valFF = Math.round(valF * 100)
        var pb = this.item.profitBase
        var profit = 0
        var pp = 0
        var price = 0
        if (this.isProfitVal)
        {
            pp = 100 * (valFF - pb) / pb
            profit = Math.ceil(pp * 100)
            price = valFF
        }
        else
        {
            profit = valFF
            price = pb + Math.floor(pb * profit / 10000)
        }

        if (val && pp < 0)
        {
            this.item.notvalid = {}
            this.set('item.notvalid.profit', this.localize('store-item-profit-none'))
            this.set('item.hasErrors', true)
            if (this.uiprofit)
            {
                try
                {
                    this.uiprofit.errorMessage = this.localize('store-item-profit-none')
                    this.uiprofit.invalid = true
                }
                catch
                {
                    //
                }
            }
        }
        else
        {
            this.set('item.notvalid.profit', '')
        }
        this._setProfitModel('input', this.isProfitVal, profit, price, this.item.price?.Currency)

        // console.log(valF, this.item.price.SalePriceFinal, this.item.profitVal, this.item.profit, this.item.profitBase)
    }

    _urlItem(item, editing?)
    {
        if (editing) { return '#' }
        return item.name ? this._hrefDetail(item.name, 'store') : null
    }

    _findAndCallItem(epath, callback)
    {
        for (var i in epath)
        {
            var shopitem: any = null
            if (epath[i] instanceof UIStoreItem) 
            {
                shopitem = epath[i]
                if (shopitem && shopitem.__data)
                {
                    var data = shopitem.__data.item
                    if (callback) { callback(data) }
                }
                break
            }
        }
    }

    _deleteTap(e)
    {
        e.preventDefault()
        const epath = e.path || e.composedPath()
        this.set('deleting', true)
        this._findAndCallItem(epath, (data) => {
            this.async(() =>
            {
                this.dispatchEvent(new CustomEvent('api-store-item-delete', { bubbles: true, composed: true, detail: { id: data.id, name: data.name, } }))
            }, 17)
        })
        return false
    }

    // _upwardTap(e)
    // {
    //     e.preventDefault()
    //     const epath = e.path || e.composedPath()
    //     this._findAndCallItem(epath, (data) =>
    //     {
    //         this.dispatchEvent(new CustomEvent('api-store-item-move', { bubbles: true, composed: true, detail: { id: data.id, name: data.name, dir: 'up' } }))
    //     })
    //     return false
    // }

    // _downwardTap(e)
    // {
    //     e.preventDefault()
    //     const epath = e.path || e.composedPath()
    //     this._findAndCallItem(epath, (data) =>
    //     {
    //         this.dispatchEvent(new CustomEvent('api-store-item-move', { bubbles: true, composed: true, detail: { id: data.id, name: data.name, dir: 'down' } }))
    //     })
    //     return false
    // }

    _cutItemTap(e)
    {
        e.preventDefault()
        const epath = e.path || e.composedPath()
        this._findAndCallItem(epath, (data) =>
        {
            this.dispatchEvent(new CustomEvent('api-store-item-cut', { bubbles: true, composed: true, detail: { item: data } }))
        })
        return false
    }

    _uncutItemTap(e)
    {
        e.preventDefault()
        const epath = e.path || e.composedPath()
        this._findAndCallItem(epath, (data) =>
        {
            this.dispatchEvent(new CustomEvent('api-store-item-uncut', { bubbles: true, composed: true, detail: { item: data } }))
        })
        return false
    }

    _pasteAfterItemTap(e)
    {
        e.preventDefault()
        const epath = e.path || e.composedPath()
        this._findAndCallItem(epath, (data) =>
        {
            this.dispatchEvent(new CustomEvent('api-store-item-paste', { bubbles: true, composed: true, detail: { item: data } }))
        })
        return false
    }

    _formatPlaceholder(product_d)
    {
        return UIListItem.__formatPlaceholder(product_d, this.addBackground)
    }

    _profitSliderPP(org, val)
    {
        return org && !val
    }

    _profitSliderPV(org, val)
    {
        return org && val
    }

}
