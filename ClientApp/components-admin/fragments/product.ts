import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-pages/iron-pages.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { TierFactoryCost, FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, deepClone } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './product.ts.html'
import style from './product.ts.css'
import style_shared from './shared-styles.css'
import '../shared-styles/common-styles'
import { Clipboard } from '../../components/utils/CommonUtils'
import '../ui/ui-product-item'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../../components/ui/ui-csv-import'
import '../../components/ui/paper-expansion-panel'
import '../../components/ui/ui-select'
import '../ui/ui-richtext-editor'
import '../ui/ui-changes-history'
import '../ui/ui-dropdown-menu'
import 'multiselect-combo-box'
import { UserInfoModel } from '../../components/dal/user-info-model'
import { UICSVImport } from '../../components/ui/ui-csv-import'
import { UICOLORS } from '../../components/utils/ColorUtils'
import 'chart.js/dist/Chart.js'

const UICOLORS_KEYS = Object.keys(UICOLORS)
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const AnchorTabsList = [ 'product-views', 'details', 'pricelinks', 'pricetables', 'locales',  'product-history' ]
const PriceTableNAID =  "_N/A"


@FragmentDynamic
class AdminProduct extends FragmentBase
{
    static get is() { return 'tmladmin-product' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/product/product-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['productid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTierItem_IP: { type: Number },
            editPriceType: { type: Boolean, value: false },

            gridCellClassNameGenerator: { type: Object },

            importedItems: { type: Array },
            importedMapping: { type: Array },
            importMappingKeys: { type: Array, value: [ //need to be sync with source text (CSV)
                "NA", //0
                "Quantity", //1
                "Public Price", //2
                "Minimum Retail Price", //3
                "B2B Retail Price", //4
                "Teamatical Online B2B2C Price", //5
                "Manufacturer Price", //6
                "Description", 
                "Description Applied"
            ] },

            anchorTabs: { type: Array, value: AnchorTabsList },
            anchorTabsColors: { type: Array, value: UICOLORS_KEYS },

            editLocale: { type: String, value: 'en-US' },

            editCurrencyRegion: { type: String, },
            editCurrencyRegionTitle: { type: String, computed: '_compute_arrayObjectTitle(editCurrencyRegion, order.CurrencyRegions)', },
            editCurrencyRegionCurrencyID: { type: String, computed: '_compute_arrayObjectID(editCurrencyRegion, order.CurrencyRegions, order.CurrencyRegions.*)', },

            editPriceTable: { type: String, },
            editPriceTableTitle: { type: String, computed: '_compute_arrayObjectTitle(editPriceTable, order.PriceTables)', },
            editPriceTableID: { type: String, computed: '_compute_arrayObjectID(editPriceTable, order.PriceTables, order.PriceTables.*)', },

            dialog_tier: { type: Object },
        }
    }

    //#region Vars

    dialog_tier: any
    editLocale: string
    editCurrencyRegion: string
    editCurrencyRegionCurrencyID: string
    editPriceTable: string
    editPriceTableID: string
    loading: boolean
    importedItems: any
    importedMapping: any
    _netbase: any
    _observer: any
    hasUnsavedChanges: boolean
    editTierItem_IP: any
    editPriceType: boolean
    gridCellClassNameGenerator: any
    api_action: any
    order: any
    importMappingKeys: any
    userInfo: UserInfoModel

    //#endregion


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_buildChartCurrencyRegion(editCurrencyRegion, order.CurrencyRegions, order.CurrencyRegions.*, order.UseFlatFactoryPrice, order.CurrencyFactory.id)',
            '_buildChartPriceTables(editPriceTable, order.PriceTables, order.PriceTables.*, order.UseFlatFactoryPrice, order.CurrencyFactory.id)',
            '_localesAdded(order.Locales.*)',
            '_orderLoaded(order)',
            // '_log(dialog_tier.editTierItem.ID)',
            // '_log(dialog_tier.editTierItemTiersList)',
        ]
    }

    get csvImport() { return this.shadowRoot?.querySelector('#csv-import') as UICSVImport }
    
    _log(v) { console.log(AdminProduct.is, v) }

    connectedCallback()
    {
        super.connectedCallback()

        this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveProductTap()
        }
    }

    

    _onLoadResult(order)
    {
        if (!order) { return order }
        
        if (!order?.CurrencyFactory) { order.CurrencyFactory = order.Currency }
            
        delete order.Description
        delete order.DescriptionSrc
        if (Array.isArray(order.Locales))
        {
            for (var i in order.Locales)
            {
                if (order.Locales[i].DescriptionSrc)
                {
                    delete order.Locales[i].SizingTip
                    delete order.Locales[i].Description
                }
                else if (order.Locales[i].Description)
                {
                    order.Locales[i].SizingTipHtml = order.Locales[i].SizingTip
                    order.Locales[i].DescriptionHtml = order.Locales[i].Description
                    delete order.Locales[i].SizingTip
                    delete order.Locales[i].Description
                }
            }
        }


        if (order.CurrencyRegions?.length) 
        {
            this.async(()=> { this.set('editCurrencyRegion', order.CurrencyRegions[0].id) }, 150)
        }
        if (order.PriceTables?.length) 
        {
            this.async(()=> { this.set('editPriceTable', order.PriceTables[0].id) }, 150)
        }
        return order
    }

    _orderLoaded(order)
    {
        this._saveOrderForUnsavedComparison(order)
    }

    _tiersList(orderCurrencyRegions, orderPriceTables, editTierItemID, editTierType)
    {
        if (orderPriceTables?.length)
        {
            var v = orderPriceTables.filter(i => i.id == this.editPriceTable)
            if (editTierType)
            {
                return v?.length ? v[0].Tiers.filter(i => i.ID == editTierItemID) : []
            }
            else
            {
                return v?.length ? v[0].Tiers : []
            }
        }
        else if (orderCurrencyRegions?.length)
        {
            var v = orderCurrencyRegions.filter(i => i.id == this.editCurrencyRegion)
            if (editTierType)
            {
                return v?.length ? v[0].Tiers.filter(i => i.ID == editTierItemID) : []
            }
            else
            {
                return v?.length ? v[0].Tiers : []
            }
        }
        return []
    }

    _hiddenNAAlert(priceTableID)
    {
        return priceTableID != PriceTableNAID
    }

    _priceTablesAddNA(arr)
    {
        if (!Array.isArray(arr)) { return arr }
        arr = arr.map(i => {
            var clone = Object.assign({}, i)
            delete clone.Tiers
            return clone
        })
        arr.unshift({ id: PriceTableNAID, title: 'N/A'})
        return arr
    }

    _showRemoveSize(plinkiSizeLinksLength, slinkinx)
    {
        return plinkiSizeLinksLength > 1
    }

    _sizesFilter(selSizes, orderSizes, plinki, slinkinx, plinkSizeLinks)
    {
        if (!orderSizes) { return orderSizes }
        var sizesUsed = {}
        for (var i in plinki.SizeLinks)
        {
            if (i == slinkinx.toString()) { continue }

            var slinki = plinki.SizeLinks[i]
            for (var k in slinki.Sizes)
            {
                sizesUsed[slinki.Sizes[k].Code] = 1
            }
        }
        return orderSizes.filter(i => { return !sizesUsed[i.Code] })
    }

    _buildCurrencyRegions(orderPriceLinks)
    {
        var curregs = {}
        for (var i in orderPriceLinks)
        {
            for (var ii in orderPriceLinks[i].Variants)
            {
                if (!curregs[orderPriceLinks[i].Variants[ii].id])
                {
                    curregs[orderPriceLinks[i].Variants[ii].id] = orderPriceLinks[i].Variants[ii].id
                }
            }
        }
        // return curregs.
    }

    _firstPriceLink(plinkinx, slinkinx)
    {
        return slinkinx == 0 //plinkinx == 0 &&
    }

    _removeSizeLinkTap(e)
    {
        var plinkinx = e.model.__data.plinkinx
        var slinkinx = e.model.__data.slinkinx
        this.splice(`order.PriceLinks.${plinkinx}.SizeLinks`, slinkinx, 1)
        this.notifyPath(`order.PriceLinks.${plinkinx}.SizeLinks`)
    }

    _addSizeLinkTap(e)
    {
        var plinkinx = e.model.__data.plinkinx
        var slinkinx = e.model.__data.slinkinx
        var sizeLinks = deepClone(this.order.PriceLinks[plinkinx].SizeLinks)
        var slinki = this.order.PriceLinks[plinkinx].SizeLinks[slinkinx]
        slinki.Sizes = []
        sizeLinks.push(slinki)
        this.set(`order.PriceLinks.${plinkinx}.SizeLinks`, sizeLinks)
        // console.log(e)
    }

    _saveOrderForUnsavedComparison(order)
    {
        if (!order) { return }

        if (this.api_action != 'syncpm')
        {
            this.orderSaved = this._saveOrderSerialize(order)
        }
    }

    _buildChartDebouncer: Debouncer
    _buildChartCurrencyRegion(editCurrencyRegion, orderCurrencyRegions, orderCurrencyRegionsP, orderUseFlatFactoryPrice, orderCurrencyFactoryID)
    {
        if (!Array.isArray(orderCurrencyRegions) || (orderCurrencyRegions.length && orderCurrencyRegions[0].Variants) || !this.visible) { return }

        var curregi = orderCurrencyRegions.filter(i => { return i.id == editCurrencyRegion })
        if (!curregi?.length && orderCurrencyRegions?.length)
        {
            curregi = [orderCurrencyRegions[0]]
        }

        if (curregi?.length && curregi[0].Tiers)
        {
            this._buildChartDebouncer = Debouncer.debounce(this._buildChartDebouncer, timeOut.after(150), () => 
            {
                const curmarket = this._compute_arrayObjectID(editCurrencyRegion, orderCurrencyRegions)
                this._buildPriceModelChart('#discountTierChart', curregi[0].Tiers, curregi[0].Tiers, orderUseFlatFactoryPrice, orderCurrencyFactoryID, curmarket)
            })
        }
    }

    _buildPriceTableChartDebouncer: Debouncer
    _buildChartPriceTables(editPriceTable, orderPriceTables, orderPriceTablesP, orderUseFlatFactoryPrice, orderCurrencyFactoryID)
    {
        if (!Array.isArray(orderPriceTables) || !this.visible) { return }

        var ptablei = orderPriceTables.filter(i => { return i.id == editPriceTable })
        if (!ptablei?.length && orderPriceTables?.length)
        {
            ptablei = [orderPriceTables[0]]
        }

        if (ptablei?.length && ptablei[0].Tiers)
        {
            this._buildPriceTableChartDebouncer = Debouncer.debounce(this._buildPriceTableChartDebouncer, timeOut.after(150), () => 
            {
                const curmarket = this._compute_arrayObjectID(editPriceTable, orderPriceTables)
                this._buildPriceModelChart('#priceTableChart', ptablei[0].Tiers, ptablei[0].Tiers, orderUseFlatFactoryPrice, orderCurrencyFactoryID, curmarket)
            })
        }
    }

    _svgFlagUrlByList(editLocale, orderLocales)
    {
        if (!orderLocales) { return this._svgFlagUrl('US') }
        var loc = orderLocales.filter(u => u.id == editLocale)
        if (loc?.length > 0) { return this._svgFlagUrl(loc[0].country) }
        return this._svgFlagUrl('US')
    }

    saveProductConfirm(e)
    {
        this.api_action = 'save'
        var order = deepClone(this.order)
        
        delete order.Description
        delete order.DescriptionSrc
        if (Array.isArray(order.Locales))
        {
            for (var i in order.Locales)
            {
                //reset delta before load new updated model - to force HTML regeneration
                var ds: any = []; try { ds = JSON.parse(order.Locales[i].DescriptionSrc) } catch(ex) {} ds.push({ insert: '...' })
                var ss: any = []; try { ss = JSON.parse(order.Locales[i].SizingTipSrc) } catch(ex) {} ss.push({ insert: '...' })
                this.set(`order.Locales.${i}.DescriptionSrc`, JSON.stringify(ds))
                this.set(`order.Locales.${i}.SizingTipSrc`, JSON.stringify(ds))
            }
        }

        var oldmodel = Object.assign({}, order)
        this._postData(order, (newmodel) =>
        {
            if (oldmodel && newmodel && oldmodel?.id != newmodel?.id)
            {
                var qp = { productid: newmodel.id }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
    }

    _syncpmTap(e)
    {
        this.api_action = 'syncpm'
        var order = deepClone(this.order)
        var oldmodel = Object.assign({}, order)
        this._postData(order, (newmodel) =>
        {
            if (oldmodel?.id != newmodel?.id)
            {
                var qp = { productid: newmodel?.id }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })        
        
    }

    _localesAdded(orderLocalesP)
    {
        // console.log(orderLocalesP)
        if (orderLocalesP.path == 'order.Locales' && this.order.Locales.length > 0)
        {
            this.editLocale = this.order.Locales[0].id
        }
    }

    onLocalesRemoved(e)
    {
        if (this.editLocale == e.detail?.item?.id)
        {
            this.editLocale = this.order?.Locales?.length > 0 ? this.order.Locales[0].id : ''
        }
    }

    onLocalesRemovedAll(e)
    {
        this.editLocale = ''
    }

    _selectedLocale(editLocale, loci)
    {
        return !(loci?.id == editLocale)
    }

    _changedCurrencyRegions()
    {
        // this.notifyPath(`order.PriceLinks.0.SizeLinks.0.CurrencyRegions`)
    }

    onCurrencyRegionsChanged(e)
    {
        this._changedCurrencyRegions()
    }

    onCurrencyRegionsBlur(e)
    {
        this._changedCurrencyRegions()
    }

    onCurrencyRegionsRemoved(e)
    {
        if (this.editCurrencyRegion == e.detail?.item?.id)
        {
            this.editCurrencyRegion = this.order?.CurrencyRegions?.length > 0 ? this.order.CurrencyRegions[0].id : ''
        }
        this._changedCurrencyRegions()
    }

    onCurrencyRegionsRemovedAll(e)
    {
        this.editCurrencyRegion = ''
        this._changedCurrencyRegions()
    }

    onSizesBlur(e)
    {
        var plinkinx = e.model.__data.plinkinx
        this.notifyPath(`order.PriceLinks.${plinkinx}.SizeLinks`)
    }

    onSizesChanged(e)
    {
    }

    onSizesRemoved(e)
    {
        // var plinkinx = e.model.__data.plinkinx
        // this.notifyPath(`order.PriceLinks.${plinkinx}.SizeLinks`)
    }

    onSizesRemovedAll(e)
    {
        // var plinkinx = e.model.__data.plinkinx
        // this.notifyPath(`order.PriceLinks.${plinkinx}.SizeLinks`)
    }

    hideSaveBtn(product)
    {
        return false
    }

    saveProductTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    hideAddBtn(order)
    {
        return false
    }

    hideAddTierBtn(order)
    {
        return false
    }

    hideMinCount(type)
    {
        return type != 'QuantityDiscount'
    }

    gridCellClassNameGeneratorImpl(column, rowData)
    {
        var classes = ''
        if (rowData.item.notvalid !== undefined)
        {
            classes = ' notvalid'
        }
        // console.log(rowData, classes)
        return classes
    }

    saveDialogTierTap(e)
    {
        if (this._asBool(this.order.PriceTables))
        {
            this.saveDialogPriceTableTierTap(e)
        }
        else
        {
            this.saveDiscountTier(e)
        }
    }

    onCloseSaveDialogTier(e)
    {
        this.set('dialog_tier', { editTierItem: {ID: 'None' } })
        //grid_[[ptableindex]]_[[index]]
        // const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Layouts')
        // if (grid) { grid.clearCache() }
    }

    numberQtyRegexp = new RegExp('[^0-9]+', 'g')
    _importTap(e, obj, loading = true)
    {
        var mapping = this.importedMapping.reduce((map, obj) =>
        {
            map[obj.To] = obj.From
            return map
        }, {})

        if (!this.loading && loading) 
        {
            this.loading = true
            var d = Math.max(250, Math.min(3000, this.importedItems.length * 15))
            this.async(() => { this.loading = false }, d)
        }

        if (Object.keys(mapping).length < 1) { return } //EXIT due mapping is empty


        var tieri = this.order.Tiers
        var curregindex = ''
        var ptableindex = ''
        if (Array.isArray(this.order.PriceTables) && this.editPriceTable)
        {
            for (var i in this.order.PriceTables)
            {
                if (this.order.PriceTables[i].id == this.editPriceTable)
                {
                    ptableindex = i
                    break
                }
            }
            tieri = this.order.PriceTables[ptableindex].Tiers
        }
        else if (Array.isArray(this.order.CurrencyRegions) && this.editCurrencyRegion)
        {
            for (var i in this.order.CurrencyRegions)
            {
                if (this.order.CurrencyRegions[i].id == this.editCurrencyRegion)
                {
                    curregindex = i
                    break
                }
            }
            tieri = this.order.CurrencyRegions[curregindex].Tiers
        }


        var tierModel = JSON.parse(JSON.stringify(tieri))
        try
        {
            //clean
            for (var ti of tierModel) { ti.Values = [] }
            //fulfil
            for (var i in this.importedItems)
            {
                var ii = this.importedItems[i]
                var tieritemnew = {
                    Quantity: ii[mapping['Quantity']],
                    Price: -1,
                    Description: ii[mapping['Description']] ? ii[mapping['Description']] : "Get %percent% discount for %count% items",
                    DescriptionApplied: ii[mapping['Description Applied']] ? ii[mapping['Description Applied']] : "Get %percent% discount",
                }
                for (var ti of tierModel)
                {
                    var tierid = ti.ID
                    if (tierid.indexOf(TierFactoryCost) == 0) { tierid = this.importMappingKeys[6] } //factory price id has product man. id (need to clean)
                    else if (tierid.indexOf('TierPlatinum') == 0) { tierid = this.importMappingKeys[5] }
                    else if (tierid.indexOf('TierGold') == 0) { tierid = this.importMappingKeys[4] }
                    else if (tierid.indexOf('TierSilver') == 0) { tierid = this.importMappingKeys[3] }
                    else if (tierid.indexOf('TierBronze') == 0) { tierid = this.importMappingKeys[2] }
                    var tiprice = ii[mapping[tierid]]
                    tiprice = Math.round(Currency.parse(tiprice) * 100)
                    var qty = tieritemnew['Quantity']
                    try
                    {
                        qty = qty.replace(this.numberQtyRegexp, "")
                        var qtyN = Number.parseInt(qty)
                        if (Number.isFinite(qtyN))
                        { 
                            tieritemnew['Quantity'] = qty.toString()
                        }
                    }
                    catch
                    {
                        //
                    }
                    ti.Values.push(Object.assign({}, tieritemnew, { Price: tiprice, Quantity: qty }))
                }
            }

            if (Array.isArray(this.order.PriceTables))
            {
                var model = { Tiers: tierModel }
                this.applyPriceTableValidation(model, ptableindex)
                this.showToast('Tier Model has been imported from Clipboard...')
            }
            else
            {
                var model = { Tiers: tierModel }
                this.applyPriceModelValidation(model, curregindex)
                this.showToast('Tier Model has been imported from Clipboard...')
            }
        }
        catch (e)
        {
            this.showToast('Tier Model import was failed - ' + e.message)
        }

        if (this.csvImport) { this.csvImport.reset() }
    }


    //#region Currency Regions

    _importPriceTap(e, obj, loading = true)
    {
        this._importTap(e, obj, loading)
    }

    editPricePointTap(e)
    {
        // console.log(e)
        var item = e.model.__data.item
        var inx = e.model.__data.index
        var curregi = e.model.__dataHost.__dataHost.__data.curregi
        var curregindex = e.model.__dataHost.__dataHost.__data.curregindex

        
        var eobj: any = {}
        var epath = e.path || e.composedPath()
        for (var i in epath)
        {
            if (epath[i].tagName == 'VAADIN-GRID')
            {
                var tieri = epath[i].__dataHost.__data.tieri
                // console.log(tieri)
                eobj.ID = tieri.ID
                break
            }
        }

        var obj: any = { }
        var dialog_tier = this.$.dialog_tier as UIAdminDialog
        if (dialog_tier)
        {
            this.set('dialog_tier', Object.assign({ 
                loading: true,
                editTierTitle: 'Edit Tier Item',
                editTierBtn: 'Apply Tier Item',
                editTierItem: Object.assign(eobj, item),
                editTierItem_A: item,
                editTierItem_I: inx,
                editTierType: true,
                editTierItem_AP: curregi,
            }, obj))
            this.set('dialog_tier.editTierItemTiersList', 
                this._tiersList(this.order.CurrencyRegions, this.order.PriceTables, this.dialog_tier.editTierItem.ID, this.dialog_tier.editTierType)
            )
            // this.notifyPath('dialog_tier.editTierItem.ID')

            this.editPriceType = true
            this.editTierItem_IP = curregindex
            // this.notifyPath('editTierItem_AP.Currency')
            dialog_tier.open()
        }
        this.async(()=> 
        {
            this.set('dialog_tier.loading', false)
        }, 170)
    }

    deletePricePointTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index
        var eobj = {}
        var epath = e.path || e.composedPath()
        for (var i in epath)
        {
            if (epath[i].tagName == 'VAADIN-GRID')
            {
                var curregi = epath[i].__dataHost.__data.curregi
                var curregindex = epath[i].__dataHost.__data.curregindex
                var tieri = epath[i].__dataHost.__data.tieri
                for (var ti in this.order.CurrencyRegions[curregindex].Tiers)
                {
                    this.splice(`order.CurrencyRegions.${curregindex}.Tiers.${ti}.Values`, inx, 1)
                    if (this.order.CurrencyRegions[curregindex].Tiers[ti].ID == tieri.ID)
                    var grid:any = this.shadowRoot?.querySelector(`#grid_${curregindex}_${ti}`)
                    if (grid) { grid.clearCache() }
                }
                break
            }
        }
    }

    addNewPriceItemTap(e)
    {
        var curregi = e.model.__data.curregi
        var curregindex = e.model.__data.curregindex
        
        var obj: any = { }
        var dialog_tier = this.$.dialog_tier as UIAdminDialog
        if (dialog_tier)
        {
            this.set('dialog_tier', Object.assign({ 
                loading: true,
                editTierTitle: 'Add New Price Item',
                editTierBtn: 'Add New Price Item',
                editTierItem: { ID: 'TierSilver' },
                editTierType: false,
                editTierItem_AP: curregi,
            }, obj))
            this.editPriceType = true
            this.set('dialog_tier.editTierItemTiersList', 
                this._tiersList(this.order.CurrencyRegions, this.order.PriceTables, this.dialog_tier.editTierItem.ID, this.dialog_tier.editTierType)
            )
            this.editTierItem_IP = curregindex
            // this.notifyPath('editTierItem_AP.Currency')
            dialog_tier.open()
        }
        this.async(()=> 
        {
            this.set('dialog_tier.loading', false)
        }, 170)
    }

    copyPriceModelTap(e)
    {
        this.showToast('Price Model has been copied to Clipboard...')

        if (Array.isArray(this.order.CurrencyRegions)) 
        { 
            var r = this.order.CurrencyRegions.filter(i => i.id == this.editCurrencyRegion)
            if (r?.length) 
            { 
                // var rcopy = JSON.parse(JSON.stringify(r[0]))
                // delete rcopy.id
                // delete rcopy.title
                Clipboard.copyFromString(JSON.stringify(r[0], null, "\t"))
            }
        }
    }

    async pastePriceModelTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : null
            if (this.order.ProductManufacturerID && model?.Tiers)
            {
                for(var i in model.Tiers)
                {
                    if (typeof(model.Tiers[i].ID) == 'string' && model.Tiers[i].ID.indexOf(TierFactoryCost) == 0)
                    {
                        model.Tiers[i].ProductManufacturerID = this.order.ProductManufacturerID
                    }
                }
            }
            this.applyPriceModelValidation(model)
            this.showToast('Price Model has been pasted from Clipboard...')
            // var grid:any = this.shadowRoot?.querySelector(`#grid_${this.editTierItem_IP}_${i}`)
            // if (grid) { grid.clearCache() }
        }
        catch (e)
        {
            this.showToast('Price Model paste was failed - ' + e.message)
        }
    }

    applyPriceModelValidation(model, inx = '')
    {
        if (typeof(model) != 'object') { throw new Error('model is not an object') }
        if (!model['Tiers']) { throw new Error('model has no Tiers') }

        if (!this._asBool(inx))
        {
            if (Array.isArray(this.order.CurrencyRegions)) 
            { 
                for (var i in this.order.CurrencyRegions)
                {
                    if (this.order.CurrencyRegions[i].id == this.editCurrencyRegion)
                    {
                        inx = i
                        break
                    }
                }
            }
        }

        this.set(`order.CurrencyRegions.${inx}.Tiers`, model.Tiers)
    }

    saveDiscountTier(e)
    {
        if (this.editPriceType)
        {
            if (this.dialog_tier.editTierType)
            {
                var ID = this.dialog_tier.editTierItem.ID
                for (var i in this.order.CurrencyRegions[this.editTierItem_IP].Tiers)
                {
                    if (this.order.CurrencyRegions[this.editTierItem_IP].Tiers[i].ID == ID)
                    {
                        this.dialog_tier.editTierItem_A.Quantity = this.dialog_tier.editTierItem.Quantity
                        this.dialog_tier.editTierItem_A.Price = this.dialog_tier.editTierItem.Price
                        this.dialog_tier.editTierItem_A.Description = this.dialog_tier.editTierItem.Description
                        this.dialog_tier.editTierItem_A.DescriptionApplied = this.dialog_tier.editTierItem.DescriptionApplied
                        
                        this.notifyPath(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}`)
                        var grid:any = this.shadowRoot?.querySelector(`#grid_${this.editTierItem_IP}_${i}`)
                        if (grid) { grid.clearCache() }
                        break
                    }
                }

            }
            else if (this.order?.CurrencyRegions?.length && this.order.CurrencyRegions[0].Tiers) //add
            {
                var tier = Object.assign({}, this.dialog_tier.editTierItem)
                var ID = tier.ID
                delete tier.ID

                for (var i in this.order.CurrencyRegions[this.editTierItem_IP].Tiers)
                {
                    var inx = "0"
                    var find = false
                    var vals = this.order.CurrencyRegions[this.editTierItem_IP].Tiers[i].Values
                    for (var ti in vals)
                    {
                        var a = parseInt(vals[ti].Quantity)
                        var b = parseInt(tier.Quantity)
                        inx = ti
                        if (a > b)
                        {
                            find = true
                            break
                        }
                    }
                    if (!find) { inx = '' + (parseInt(inx) + 1) }

                    this.splice(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}.Values`, parseInt(inx), 0, Object.assign({}, tier))
                    this.notifyPath(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}.Values`)
                }
                
                const grids: any = this.shadowRoot?.querySelectorAll('vaadin-grid[aria-label="DiscountTiers"]')
                if (grids) { for (var i in grids) { if (grids[i] && grids[i].clearCache) { grids[i].clearCache() } } }
            }
        }
        else
        {
            if (this.dialog_tier.editTierType)
            {
                var ID = this.dialog_tier.editTierItem.ID
                for (var i in this.order.Tiers)
                {
                    if (this.order.Tiers[i].ID == ID)
                    {
                        this.dialog_tier.editTierItem_A.Quantity = this.dialog_tier.editTierItem.Quantity
                        this.dialog_tier.editTierItem_A.Price = this.dialog_tier.editTierItem.Price
                        this.dialog_tier.editTierItem_A.Description = this.dialog_tier.editTierItem.Description
                        this.dialog_tier.editTierItem_A.DescriptionApplied = this.dialog_tier.editTierItem.DescriptionApplied
                        
                        this.notifyPath('order.Tiers.' + i)
                        var grid:any = this.shadowRoot?.querySelector('#grid_' + i)
                        if (grid) { grid.clearCache() }
                        break
                    }
                }

            }
            else //add
            {
                if (this.order && this.order.Tiers)
                {
                    var tier = Object.assign({}, this.dialog_tier.ditTierItem)
                    var ID = tier.ID
                    delete tier.ID

                    for (var i in this.order.Tiers)
                    {
                        var inx = "0"
                        var find = false
                        var vals = this.order.Tiers[i].Values
                        for (var ti in vals)
                        {
                            var a = parseInt(vals[ti].Quantity)
                            var b = parseInt(tier.Quantity)
                            inx = ti
                            if (a > b)
                            {
                                find = true
                                break
                            }
                        }
                        if (!find) { inx = '' + (parseInt(inx) + 1) }

                        this.splice('order.Tiers.' + i + '.Values', parseInt(inx), 0, Object.assign({}, tier))
                        this.notifyPath('order.Tiers.' + i + '.Values')
                    }
                    
                    const grids: any = this.shadowRoot?.querySelectorAll('vaadin-grid[aria-label="DiscountTiers"]')
                    if (grids) { for (var i in grids) { if (grids[i] && grids[i].clearCache) { grids[i].clearCache() } } }
                }
            }
        }
    }

    //#endregion


    //#region Price Tables

    _disableImportPriceTableTiers(importedItems, loading)
    {
        return loading === true || !Array.isArray(importedItems) || importedItems.length < 1
    }

    _importPriceTableTap(e, obj, loading = true)
    {
        this._importTap(e, obj, loading)
    }

    editPriceTablePointTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index
        var ptablei = e.model.__dataHost.__dataHost.__data.ptablei
        var ptableindex = e.model.__dataHost.__dataHost.__data.ptableindex

        
        var eobj: any = {}
        var epath = e.path || e.composedPath()
        for (var i in epath)
        {
            if (epath[i].tagName == 'VAADIN-GRID')
            {
                var tieri = epath[i].__dataHost.__data.tieri
                // console.log(tieri)
                eobj.ID = tieri.ID
                break
            }
        }

        var obj: any = { }
        var dialog_tier = this.$.dialog_tier as UIAdminDialog
        if (dialog_tier)
        {
            this.set('dialog_tier', Object.assign({ 
                loading: true,
                editTierTitle: 'Edit Tier Item',
                editTierBtn: 'Apply Tier Item',
                editTierItem: Object.assign(eobj, item),
                editTierItem_A: item,
                editTierItem_I: inx,
                editTierType: true,
                editTierItem_AP: ptablei,
            }, obj))
            this.set('dialog_tier.editTierItemTiersList', 
                this._tiersList(this.order.CurrencyRegions, this.order.PriceTables, this.dialog_tier.editTierItem.ID, this.dialog_tier.editTierType)
            )
            this.notifyPath('dialog_tier.editTierItem.ID')


            this.editTierItem_IP = ptableindex
            // this.notifyPath('editTierItem_AP.Currency')
            dialog_tier.open()
        }
        this.async(()=> 
        {
            this.set('dialog_tier.loading', false)
        }, 170)
    }

    deletePriceTablePointTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index
        var eobj = {}
        var epath = e.path || e.composedPath()
        for (var i in epath)
        {
            if (epath[i].tagName == 'VAADIN-GRID')
            {
                var ptableindex = epath[i].__dataHost.__data.ptableindex
                var tieri = epath[i].__dataHost.__data.tieri
                for (var ti in this.order.PriceTables[ptableindex].Tiers)
                {
                    this.splice(`order.PriceTables.${ptableindex}.Tiers.${ti}.Values`, inx, 1)
                    if (this.order.PriceTables[ptableindex].Tiers[ti].ID == tieri.ID)
                    var grid:any = this.shadowRoot?.querySelector(`#grid_${ptableindex}_${ti}`)
                    if (grid) { grid.clearCache() }
                }
                break
            }
        }
    }

    addNewPriceTableItemTap(e)
    {
        var ptablei = e.model.__data.ptablei
        var ptableindex = e.model.__data.ptableindex
        var tieri = e.model.__data.tieri
        
        var obj: any = { }
        var dialog_tier = this.$.dialog_tier as UIAdminDialog
        if (dialog_tier)
        {
            this.set('dialog_tier', Object.assign({ 
                loading: true,
                editTierTitle: 'Add New Price Item',
                editTierBtn: 'Add New Price Item',
                editTierItem: { ID: tieri.ID },
                editTierType: false,
                editTierItem_AP: ptablei,
            }, obj))
            this.set('dialog_tier.editTierItemTiersList', 
                this._tiersList(this.order.CurrencyRegions, this.order.PriceTables, this.dialog_tier.editTierItem.ID, this.dialog_tier.editTierType)
            )

            this.editTierItem_IP = ptableindex
            // this.notifyPath('editTierItem_AP.Currency')
            dialog_tier.open()
        }
        this.async(()=> 
        {
            this.set('dialog_tier.loading', false)
        }, 170)
    }

    _disable_PriceTable(list, loading)
    {
        return loading || !(list?.length > 0)
    }

    async _exportPriceTableTap(e)
    {
        var data
        if (Array.isArray(this.order.PriceTables)) 
        { 
            var r = this.order.PriceTables.filter(i => i.id == this.editPriceTable)
            if (r?.length > 0)  {  data = r[0] }
        }
        
        if (Array.isArray(data?.Tiers) && data.Tiers?.length > 0)
        { 
            const exportItems:any = []
            var tierFactoryCostValues = [], tierPlatinumValues = [], tierGoldValues = [], tierSilverValues = [], tierBronzeValues = []
            for (var i in data.Tiers)
            {
                var tierid = data.Tiers[i].ID
                if (tierid.indexOf(TierFactoryCost) == 0)	{ tierFactoryCostValues = data.Tiers[i].Values }
                else if (tierid.indexOf('TierPlatinum') == 0) { tierPlatinumValues = data.Tiers[i].Values }
                else if (tierid.indexOf('TierGold') == 0)	{ tierGoldValues = data.Tiers[i].Values }
                else if (tierid.indexOf('TierSilver') == 0)	{ tierSilverValues = data.Tiers[i].Values }
                else if (tierid.indexOf('TierBronze') == 0)	{ tierBronzeValues = data.Tiers[i].Values }

            }
            for (var i in data.Tiers[0].Values)
            {
                exportItems.push({
                    "Quantity": data.Tiers[0].Values[i]?.Quantity,
                    
					"Public Price": this._formatPrice(tierBronzeValues[i]?.Price, data?.Currency?.id),
                    "Minimum Retail Price": this._formatPrice(tierSilverValues[i]?.Price, data?.Currency?.id),
                    "B2B Retail Price": this._formatPrice(tierGoldValues[i]?.Price, data?.Currency?.id),
                    "Teamatical Online B2B2C Price": this._formatPrice(tierPlatinumValues[i]?.Price, data?.Currency?.id),
                    "Manufacturer Price": this._formatPrice(tierFactoryCostValues[i]?.Price, data?.Currency?.id),

                    "Description": tierBronzeValues[i]?.Description,
                    "Description Applied": tierBronzeValues[i]?.DescriptionApplied,
                })
            }
            const exportHeaders = Object.keys(exportItems[0])
            const exportFilename = `Price Table '${data?.title}' for PID - ${this.order.id}`
            const dataToConvert = {
                data: exportItems,
                headers: exportHeaders,
                filename: exportFilename,
            }
            await this.csvImport.csvDownload(dataToConvert, this.language)

            this.showToast('Price Table has been builded and download...')
            return; ///EXIT
        }

        this.showToast('Price Table has no data ...')
    }

    copyPriceTableModelTap(e)
    {
        this.showToast('Price Table Model has been copied to Clipboard...')

        if (Array.isArray(this.order.PriceTables)) 
        { 
            var r = this.order.PriceTables.filter(i => i.id == this.editPriceTable)
            if (r?.length) 
            { 
                Clipboard.copyFromString(JSON.stringify(r[0], null, "\t"))
            }
        }
    }

    async pastePriceTableModelTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : null
            if (this.order.ProductManufacturerID && model?.Tiers)
            {
                for(var i in model.Tiers)
                {
                    if (typeof(model.Tiers[i].ID) == 'string' && model.Tiers[i].ID.indexOf(TierFactoryCost) == 0)
                    {
                        model.Tiers[i].ProductManufacturerID = this.order.ProductManufacturerID
                    }
                }
            }
            this.applyPriceTableValidation(model)
            this.showToast('Price Table Model has been pasted from Clipboard...')
            // var grid:any = this.shadowRoot?.querySelector(`#grid_${this.editTierItem_IP}_${i}`)
            // if (grid) { grid.clearCache() }
        }
        catch (e)
        {
            this.showToast('Price Model paste was failed - ' + e.message)
        }
    }

    applyPriceTableValidation(model, inx = '')
    {
        // console.log(model)
        if (typeof(model) != 'object') { throw new Error('model is not an object') }
        // if (!model['Currency']) { throw new Error('model has no Currency') }
        if (!model['Tiers']) { throw new Error('model has no Tiers') }

        if (!this._asBool(inx))
        {
            if (Array.isArray(this.order.PriceTables)) 
            { 
                for (var i in this.order.PriceTables)
                {
                    if (this.order.PriceTables[i].id == this.editPriceTable)
                    {
                        inx = i
                        break
                    }
                }
            }
        }

        this.set(`order.PriceTables.${inx}.Tiers`, model.Tiers)
    }

    savePriceTableItem(e)
    {
        if (this.editPriceType)
        {
            if (this.dialog_tier.editTierType)
            {
                var ID = this.dialog_tier.editTierItem.ID
                for (var i in this.order.CurrencyRegions[this.editTierItem_IP].Tiers)
                {
                    if (this.order.CurrencyRegions[this.editTierItem_IP].Tiers[i].ID == ID)
                    {
                        this.dialog_tier.editTierItem_A.Quantity = this.dialog_tier.editTierItem.Quantity
                        this.dialog_tier.editTierItem_A.Price = this.dialog_tier.editTierItem.Price
                        this.dialog_tier.editTierItem_A.Description = this.dialog_tier.editTierItem.Description
                        this.dialog_tier.editTierItem_A.DescriptionApplied = this.dialog_tier.editTierItem.DescriptionApplied
                        
                        this.notifyPath(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}`)
                        var grid:any = this.shadowRoot?.querySelector(`#grid_${this.editTierItem_IP}_${i}`)
                        if (grid) { grid.clearCache() }
                        break
                    }
                }

            }
            else if (this.order?.CurrencyRegions?.length && this.order.CurrencyRegions[0].Tiers) //add
            {
                var tier = Object.assign({}, this.dialog_tier.editTierItem)
                var ID = tier.ID
                delete tier.ID

                for (var i in this.order.CurrencyRegions[this.editTierItem_IP].Tiers)
                {
                    var inx = "0"
                    var find = false
                    var vals = this.order.CurrencyRegions[this.editTierItem_IP].Tiers[i].Values
                    for (var ti in vals)
                    {
                        var a = parseInt(vals[ti].Quantity)
                        var b = parseInt(tier.Quantity)
                        inx = ti
                        if (a > b)
                        {
                            find = true
                            break
                        }
                    }
                    if (!find) { inx = '' + (parseInt(inx) + 1) }

                    this.splice(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}.Values`, parseInt(inx), 0, Object.assign({}, tier))
                    this.notifyPath(`order.CurrencyRegions.${this.editTierItem_IP}.Tiers.${i}.Values`)
                }
                
                const grids: any = this.shadowRoot?.querySelectorAll('vaadin-grid[aria-label="DiscountTiers"]')
                if (grids) { for (var i in grids) { if (grids[i] && grids[i].clearCache) { grids[i].clearCache() } } }
            }
        }
        else
        {
            if (this.dialog_tier.editTierType)
            {
                var ID = this.dialog_tier.editTierItem.ID
                for (var i in this.order.Tiers)
                {
                    if (this.order.Tiers[i].ID == ID)
                    {
                        this.dialog_tier.editTierItem_A.Quantity = this.dialog_tier.editTierItem.Quantity
                        this.dialog_tier.editTierItem_A.Price = this.dialog_tier.editTierItem.Price
                        this.dialog_tier.editTierItem_A.Description = this.dialog_tier.editTierItem.Description
                        this.dialog_tier.editTierItem_A.DescriptionApplied = this.dialog_tier.editTierItem.DescriptionApplied
                        
                        this.notifyPath('order.Tiers.' + i)
                        var grid:any = this.shadowRoot?.querySelector('#grid_' + i)
                        if (grid) { grid.clearCache() }
                        break
                    }
                }

            }
            else //add
            {
                if (this.order && this.order.Tiers)
                {
                    var tier = Object.assign({}, this.dialog_tier.ditTierItem)
                    var ID = tier.ID
                    delete tier.ID

                    for (var i in this.order.Tiers)
                    {
                        var inx = "0"
                        var find = false
                        var vals = this.order.Tiers[i].Values
                        for (var ti in vals)
                        {
                            var a = parseInt(vals[ti].Quantity)
                            var b = parseInt(tier.Quantity)
                            inx = ti
                            if (a > b)
                            {
                                find = true
                                break
                            }
                        }
                        if (!find) { inx = '' + (parseInt(inx) + 1) }

                        this.splice('order.Tiers.' + i + '.Values', parseInt(inx), 0, Object.assign({}, tier))
                        this.notifyPath('order.Tiers.' + i + '.Values')
                    }
                    
                    const grids: any = this.shadowRoot?.querySelectorAll('vaadin-grid[aria-label="DiscountTiers"]')
                    if (grids) { for (var i in grids) { if (grids[i] && grids[i].clearCache) { grids[i].clearCache() } } }
                }
            }
        }
    }

    saveDialogPriceTableTierTap(e)
    {
        if (this.dialog_tier.editTierType)
        {
            var ID = this.dialog_tier.editTierItem.ID
            for (var i in this.order.PriceTables[this.editTierItem_IP].Tiers)
            {
                if (this.order.PriceTables[this.editTierItem_IP].Tiers[i].ID == ID)
                {
                    this.dialog_tier.editTierItem_A.Quantity = this.dialog_tier.editTierItem.Quantity
                    this.dialog_tier.editTierItem_A.Price = this.dialog_tier.editTierItem.Price
                    this.dialog_tier.editTierItem_A.Description = this.dialog_tier.editTierItem.Description
                    this.dialog_tier.editTierItem_A.DescriptionApplied = this.dialog_tier.editTierItem.DescriptionApplied
                    
                    this.notifyPath(`order.PriceTables.${this.editTierItem_IP}.Tiers.${i}`)
                    var grid:any = this.shadowRoot?.querySelector(`#grid_${this.editTierItem_IP}_${i}`)
                    if (grid) { grid.clearCache() }
                    break
                }
            }

        }
        else if (this.order?.PriceTables?.length && this.order.PriceTables[0].Tiers) //add
        {
            var tier = Object.assign({}, this.dialog_tier.editTierItem)
            var ID = tier.ID
            delete tier.ID

            for (var i in this.order.PriceTables[this.editTierItem_IP].Tiers)
            {
                var inx = "0"
                var find = false
                var vals = this.order.PriceTables[this.editTierItem_IP].Tiers[i].Values
                for (var ti in vals)
                {
                    var a = parseInt(vals[ti].Quantity)
                    var b = parseInt(tier.Quantity)
                    inx = ti
                    if (a > b)
                    {
                        find = true
                        break
                    }
                }
                if (!find) { inx = '' + (parseInt(inx) + 1) }

                this.splice(`order.PriceTables.${this.editTierItem_IP}.Tiers.${i}.Values`, parseInt(inx), 0, Object.assign({}, tier))
                this.notifyPath(`order.PriceTables.${this.editTierItem_IP}.Tiers.${i}.Values`)
            }
            
            const grids: any = this.shadowRoot?.querySelectorAll('vaadin-grid[aria-label="DiscountTiers"]')
            if (grids) { for (var i in grids) { if (grids[i] && grids[i].clearCache) { grids[i].clearCache() } } }
        }
    }

    //#endregion


    onInputChanged(e)
    {
        // console.log(e)
        if (e.model?.__data?.paccessi)
        {
            // console.log('order.ProductAccessories.' + e.model.__data.index)
            this.notifyPath('order.ProductAccessories.' + e.model.__data.index)
            return //exit
        }


        if (e.model?.__data?.accessvari)
        {
            // this.notifyPath(`order.AccessoryVariants.${e.model.__data.accessvarinx}.${e.target.name}`)
            this.notifyPath(`order.AccessoryVariants.${e.model.__data.accessvarinx}`)
            return //exit
        }

        if (e.model?.__data?.accessvarcompi)
        {
            this.notifyPath(`order.AccessoryVariants.${e.model.__dataHost.__dataHost.__data.accessvarinx}.Components.${e.model?.__data?.accessvarcompinx}`)
            return //exit
        }

        if (e.model?.__data?.loci)
        {
            this.notifyPath(`order.Locales.${e.model?.__data?.locindex}`)
            return //exit
        }

        if (e.model?.__data?.curregi)
        {
            this.notifyPath(`order.CurrencyRegions.${e.model?.__data?.curregindex}`)
        }

        if (e.model?.__data?.ptablei)
        {
            this.notifyPath(`order.PriceTables.${e.model?.__data?.ptableindex}`)
        }
        
        return this._onInputChanged(e)
    }

    _dis_syncpm(loading, orderProductManufacturerID)
    {
        return loading || !orderProductManufacturerID || !orderProductManufacturerID.trim()
    }

    _initalDescription = ''
    _initalSizeTips = ''
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path == 'order') { this._initalDescription = this.order?.Description;  this._initalSizeTips = this.order?.SizingTip; }
        if (orderP && orderP.path == 'order.Description' && orderP.value == '<p><br></p>' && this._initalDescription == undefined) { return false }
        if (orderP && orderP.path == 'order.SizingTip' && orderP.value == '<p><br></p>' && this._initalSizeTips == undefined) { return false }

        var orderSavedObj = orderSaved ? JSON.parse(orderSaved) : {}
        if (orderSavedObj.Locales)
        {
            for (var i in orderSavedObj.Locales)
            {
                if (orderSavedObj.Locales[i]) { orderSavedObj.Locales[i].Description = order.Locales ? order.Locales[i]?.Description : '' }
                if (orderSavedObj.Locales[i]) { orderSavedObj.Locales[i].SizingTip = order.Locales ? order.Locales[i]?.SizingTip : '' }
            }
        }
        orderSavedObj.GroupQuantityID = order?.GroupQuantityID

        orderSaved = JSON.stringify(orderSavedObj)

        var v = super._computeHasUnsavedChanges(order, orderP, orderSaved)
        // console.log('_computeHasUnsavedChanges =>', v)
        // if (v)
        // {
        //     console.log(JSON.parse(orderSaved), order)
        // }
        return v
    }

    _sizeTitle(sizei, addtitle)
    {
        return sizei.Name + addtitle
    }

    _sizeSurchargeTitle(sizei, addtitle, cur, factoryCur = null, tieri_ID = '')
    {
        return this._subunitCurrencyWithTitle(sizei.Name + addtitle, cur, factoryCur, tieri_ID)
    }

    _removePriceTableTap(e)
    {
        var inx = ''
        for (var i in this.order.PriceTables)
        {
            if (this.order.PriceTables[i].id == this.editPriceTable)
            {
                inx = i
                break
            }
        }
        if (inx)
        {
            this.order.PriceTables.splice(inx, 1)
            this.set('order.PriceTables', Object.assign([], this.order.PriceTables))
            if (this.order.PriceTables?.length)
            {
                this.set('editPriceTable', this.order.PriceTables[this.order.PriceTables.length - 1].id)
            }
            else
            {
                this.set('editPriceTable', '')
            }
        }
    }

    _addPriceTableTap(e)
    {
        var priceTableTitle = e.target?.parentElement?.value
        if (!priceTableTitle || !priceTableTitle.trim || priceTableTitle.trim() == '') { return }
        var priceTableTitleTrim = priceTableTitle.trim()
        e.target.parentElement.value = ''


        var newid = MD5((new Date()).getMilliseconds().toString() + priceTableTitleTrim)
        var priceTableNew: any = { id: `_${newid}`, title: priceTableTitleTrim }
        if (this.order.PriceTables?.length)
        {
            priceTableNew = Object.assign(JSON.parse(JSON.stringify(this.order.PriceTables[this.order.PriceTables.length - 1])), 
            { 
                id: `_${newid}`,
                title: priceTableTitleTrim,
            })
            if (Array.isArray(priceTableNew.Tiers))
            {
                for (var i in priceTableNew.Tiers)
                {
                    priceTableNew.Tiers[i].Values = []
                }
            }
        }

        var tables = JSON.parse(JSON.stringify(this.order.PriceTables))
        tables.push(priceTableNew)
        this.set('order.PriceTables', tables)
        this.notifyPath('order.PriceTables')
        this.async(() => { this.set('editPriceTable', priceTableNew.id) }, 150)
    }

    _disRemovePriceTable(length, loading)
    {
        return loading || length <= 1
    }

    _buildTitles(list, listP)
    {
        return list
    }

    _notvalidPriceTables(notvalid, notvalidP, ptableindex)
    {
        return notvalid ? notvalid[`PriceTables.${ptableindex}`] : ''
    }
}
