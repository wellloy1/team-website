import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@polymer/paper-tabs/paper-tab'
import '@polymer/paper-tabs/paper-tabs'
import '@polymer/paper-tabs/paper-tabs-icons'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-grid/vaadin-grid-selection-column.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { TierFactoryCost, FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, deepClone } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { Clipboard } from '../../components/utils/CommonUtils'
import { NetBase } from '../../components/bll/net-base'
import view from './product-manufacturer.ts.html'
import style from './product-manufacturer.ts.css'
import style_shared from './shared-styles.css'
import { UICSVImport } from '../../components/ui/ui-csv-import'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dialog'
import '../ui/ui-product-item'
import '../ui/ui-changes-history'
import '../ui/ui-richtext-editor'
import '../../components/ui/ui-quantity'
import '../../components/ui/ui-description'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-image'
import '../../components/ui/ui-csv-import'
import '../../components/ui/paper-expansion-panel'
import '../../components/ui/ui-select'
import 'multiselect-combo-box'
import '../shared-styles/common-styles'
import { UICOLORS } from '../../components/utils/ColorUtils'
import 'chart.js/dist/Chart.js'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const UICOLORS_KEYS = Object.keys(UICOLORS)
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }


@FragmentDynamic
class AdminProductManufacturer extends FragmentBase
{
    static get is() { return 'tmladmin-product-manufacturer' }

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

            APIPath: { type: String, value: '/admin/api/productmanufacturer/product-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['pmid'] }, //, 'productid'

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            loadingWS: { type: Boolean, notify: true },
            connectedWS: { type: Boolean, notify: true },
            activeWS: { type: Boolean, notify: true },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            edititem: { type: Object, value: {}, notify: true },
            editTitle: { type: String },
            editBtn: { type: String },

            editLayoutItem: { type: Object, value: {}, notify: true },

            activeItem: { type: Object },
            selectedProductionTemplateSvg: { type: String, value: '', notify: true },

            gridCellClassNameGenerator: { type: Object },
            debouncing: { type: Object, notify: true, value: {} },

            importedItems: { type: Array },
            importedMapping: { type: Array },
            mappingKeys: { type: Array, value: ['NA', 'Step', 'Description EN', 'Description TH', 'Description MY', 'Machine Type', 'Stitch ISO'] },

            importedPriceTableItems: { type: Array },
            importedPriceTableMapping: { type: Array },
            importedPriceTableMappingKeys: { type: Array, value: [ //need to be sync with source text (CSV)
                "NA", //0
                "Quantity", //1
                "Manufacturer Price", //2
                "Description", 
                "Description Applied"
            ] },

            keymeasurementsItems: { type: Array },
            keymeasurementsMapping: { type: Array },
            keymeasurementsMappingKeys: { type: Array, computed: '_compute_keymeasurementsMappingKeys(order.Sizes)' },

            disableImportSewingInst: { type: Boolean, computed: '_computeDisableImportSewingInst(importedItems, loading)' },
            disableImportKeyMeasurements: { type: Boolean, computed: '_compute_disableImportKeyMeasurements(keymeasurementsItems, loading)' },

            anchorTabs: { type: Array, value: [ 
                { id: 'sizes', variant: false },
                { id: 'details', variant: false },
                // { id: 'pricelinks', variant: false }, 
                // { id: 'currencyregions', variant: false },
                // { id: 'pricetables', variant: false },
                { id: 'manufacturer', variant: true },
                { id: 'viewids', variant: true },
                { id: 'packinglabel', variant: true },
                { id: 'sizeidentif', variant: true },
                { id: 'accessories', variant: true },
                { id: 'accessoriesoptions', variant: true },
                { id: 'fabricoverrides', variant: true },
                { id: 'customs', variant: false },
                { id: 'keymeasurements', variant: false },
                { id: 'stockoptions', variant: false },
                { id: 'manufacturingdesc', variant: false },
                { id: 'layouts', variant: false }, 
                { id: 'product-history', variant: false }, ] 
            },
            anchorTabsColors: { type: Array, value: UICOLORS_KEYS },

            editVariantTitle: { type: String, computed: "_compute_arrayObjectField(order.editVariant, order.Variants, order.Variants.*, 'ID', 'Code')", },
            editVariantID: { type: String, computed: "_compute_arrayObjectField(order.editVariant, order.Variants, order.Variants.*, 'ID', 'ID')", },
            editVariantIndex: { type: String, computed: "_compute_arrayIndex(order.editVariant, order.Variants, order.Variants.*, 'ID', '0')", },

            editPriceTable: { type: String, },
            editPriceTableTitle: { type: String, computed: '_compute_arrayObjectTitle(editPriceTable, order.PriceTables)', },
            editPriceTableID: { type: String, computed: '_compute_arrayObjectID(editPriceTable, order.PriceTables, order.PriceTables.*)', },

            editCurrencyRegion: { type: String, },
            editCurrencyRegionTitle: { type: String, computed: '_compute_arrayObjectTitle(editCurrencyRegion, order.CurrencyRegions)', },
            editCurrencyRegionCurrencyID: { type: String, computed: '_compute_arrayObjectID(editCurrencyRegion, order.CurrencyRegions, order.CurrencyRegions.*)', },

            editManItem: { type: Object },

            dialogprintlabels: { type: Object },
            dialog_layout: { type: Object },
            dialog_tier: { type: Object },
        }
    }

    //#region Vars

    editCurrencyRegion: string
    editCurrencyRegionCurrencyID: string

    editVariantID: string
    editVariantIndex: string

    editPriceTable: string
    editPriceTableID: string

    editTierItem_IP: any
    editPriceType: boolean

    importedPricesItems: any
    importedPricesMapping: any
    importedPricesMappingKeys: any

    importedPriceTableItems: any
    importedPriceTableMapping: any
    importedPriceTableMappingKeys: any

    dialog_tier: any
    dialogprintlabels: any
    dialog_layout: any
    _netbase: any
    _observer: any
    importedMapping: any
    importedItems: []
    keymeasurementsMapping: any
    keymeasurementsItems: []
    Mapping
    loading: any
    hasUnsavedChanges: boolean
    edititem: any
    editTitle: any
    editBtn: any
    editLayoutItem: any
    editLayoutItem_A: any
    editLayoutItem_I: any
    editManItem: any
    editManItem_Edit: any
    editManItem_A: any
    editManItem_I: any
    editManTitle: any
    editManBtn: any    
    gridCellClassNameGenerator: any
    api_action: any
    order: any
    selectedProductionTemplateSvg: any
    _grid_LayoutsEvent: any
    _badgeDesignSourceNameDebouncer: any
    _accessIDChangedDebouncer: any
    _samChangedDebouncer: Debouncer
    loadingAny: boolean

    //#endregion


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_gridLayoutReset(order.Layout.*)',
            '_loaded(order)',
            '_buildChartPriceTables(editPriceTable, order.PriceTables, order.PriceTables.*, order.UseFlatFactoryPrice, order.CurrencyFactory.id)',
            '_activeItemChanged(activeItem)',
        ]
    }

    _log(v) { console.log(v) }

    get scannerprintersettings() { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get csvImportPricetable() { return this.shadowRoot?.querySelector('#csv-import-pricetable') as UICSVImport }
    get csvImportManInstr() { return this.shadowRoot?.querySelector('#csv-import-maninstr') as UICSVImport }
    get csvImportKeyMeas() { return this.shadowRoot?.querySelector('#csv-import-keymeas') as UICSVImport }


    connectedCallback()
    {
        super.connectedCallback()

        this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl

        document.addEventListener("keydown", (e) => this._onKeydown(e))
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

        // order.Notes = "[{\"insert\":\"sdfgsdfgs\\n\"},{\"insert\":\"13241\\n\\n\",\"attributes\":{\"align\":\"center\"}}]"


        // order.CurrencyRegions = [
        //     {
        //         "id": "ESEDGCOFKT3E0UBCO124VC3GY2H",
        //         "title": "Global",
        //         "Currency": {
        //             "id": "USD",
        //             "title": "USD"
        //         },
        //         "Tiers": [
        //             {
        //                 "ID": "TierFactoryCost",
        //                 "Values": [
        //                     {
        //                         "Quantity": "1",
        //                         "Price": "1328"
        //                     },
        //                     {
        //                         "Quantity": "25",
        //                         "Price": "1328"
        //                     },
        //                     {
        //                         "Quantity": "50",
        //                         "Price": "1291"
        //                     },
        //                     {
        //                         "Quantity": "100",
        //                         "Price": "1267"
        //                     },
        //                     {
        //                         "Quantity": "200",
        //                         "Price": "1207"
        //                     },
        //                     {
        //                         "Quantity": "500",
        //                         "Price": "1183"
        //                     },
        //                     {
        //                         "Quantity": "1000",
        //                         "Price": "1171"
        //                     },
        //                     {
        //                         "Quantity": "2000",
        //                         "Price": "1147"
        //                     },
        //                     {
        //                         "Quantity": "5000",
        //                         "Price": "1123"
        //                     },
        //                     {
        //                         "Quantity": "10000",
        //                         "Price": "1086"
        //                     }
        //                 ],
        //                 "ProductManufacturerID": "XRGE2FSE50SZBE4CWQF5V4XBUCE"
        //             }
        //         ]
        //     }
        // ]
        // order.AvailableCurrencyRegions = [
        //     {
        //         "id": "VRHG3BGEQJL20ULS2WXJPPNEFDF",
        //         "title": "USD_Region",
        //         "Currency": {
        //             "id": "USD",
        //             "title": "USD"
        //         },
                
        //     },
        //     {
        //         "id": "KWSXLT5ZJUPBXUSSP3DGQKHIFSE",
        //         "title": "EUR_Region",
        //         "Currency": {
        //             "id": "EUR",
        //             "title": "EUR"
        //         },
        //     },
        //     {
        //         "id": "FEUJ4N32DR3XOUHCYR3GVVOIR3H",
        //         "title": "THB_Region",
        //         "Currency": {
        //             "id": "THB",
        //             "title": "THB"
        //         }
        //     },
        //     {
        //         "id": "WBJM4KN3CRV0SEMGRCPDMHQAGAF",
        //         "title": "AUD_Region",
        //         "Currency": {
        //             "id": "AUD",
        //             "title": "AUD"
        //         }
        //     },
        //     {
        //         "id": "DDK3GXZGG4523EV44NXJT50YE3D",
        //         "title": "PHP_Region",
        //         "Currency": {
        //             "id": "PHP",
        //             "title": "PHP"
        //         }
        //     },
        //     {
        //         "id": "MV2XOHZCISD4DUJ4ENPZCMB5FSA",
        //         "title": "GBP_Region",
        //         "Currency": {
        //             "id": "GBP",
        //             "title": "GBP"
        //         }
        //     }
        // ]
        // order.Sizes.push({Code: "ALL", Name: "ALL"})
        // order.PriceTables = JSON.parse(JSON.stringify(order.CurrencyRegions))
        // if (order.CurrencyRegions?.length) 
        // { 
        //     // set to have difference
        //     order.CurrencyRegions[0].Variants = [] 
        //     order.PriceLinks = [
        //         {
        //             id: 'var1',
        //             title: 'var1',
        //             SizeLinks: [
        //                 {
        //                     Sizes:  [],
        //                     CurrencyRegions: JSON.parse(JSON.stringify(order.CurrencyRegions)),
        //                 }
        //             ],
        //         }
        //     ]
        //     for (var i in order.PriceLinks)
        //     {
        //         for (var k in order.PriceLinks[i].SizeLinks)
        //         {
        //             for (var j in order.PriceLinks[i].SizeLinks[k].CurrencyRegions)
        //             {
        //                 order.PriceLinks[i].SizeLinks[k].CurrencyRegions[j].PriceTable = { id: 'Global',  title: 'Global', Currency: {id:'USD', title: 'USD'}, }
        //             }
        //         }
        //     }
        // }
        // order.Currencies = [
        //     {
        //         "id": "USD",
        //         "title": "USD"
        //     },
        //     {
        //         "id": "THB",
        //         "title": "THB"
        //     },
        //     {
        //         "id": "AUD",
        //         "title": "AUD"
        //     },
        //     {
        //         "id": "EUR",
        //         "title": "EUR"
        //     },
        //     {
        //         "id": "PHP",
        //         "title": "PHP"
        //     },
        //     {
        //         "id": "GBP",
        //         "title": "GBP"
        //     }
        // ]
        // order.CurrencyFactory = {
        //     "id": "USD",
        //     "title": "USD"
        // }



        if (order?.Variants?.length && order.Variants[0]) 
        {
            for (var i in order.Variants) 
            {
                if (!order.Variants[i].BadgeDesignSourceName) { order.Variants[i].BadgeDesignSourceName = "" }
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

    _loaded(order)
    {
        this.set('selectedProductionTemplateSvg', '')
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()

            // this.saveProductTap()
        }
    }

    _visibleChanged(visible)
    {
        if (!visible) 
        { 
            // this.set('order.editVariant', '')
            return 
        }
    }

    _anchorTabsVisible(tabs, editVariant)
    {
        if (!tabs) { return tabs }
        // var editVariantIndex = this._compute_arrayIndex(editVariant, this.order?.Variants, this.order?.Variants, 'ID', '0')
        return editVariant ? tabs : tabs.filter(i => !i.variant)
    }

    isAnchorVisible(anchor)
    {
        var varindex = anchor.__dataHost.__data.varindex
        return !this._asBool(varindex) || this.editVariantIndex == varindex.toString()
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path.indexOf('order.editVariant') >= 0) { return false }
        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
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

    _dis_print_stocklabels(loadingAny, orderStockColorsLength)
    {
        return loadingAny || !orderStockColorsLength
    }

    copyAccess2ClipboardTap(e)
    {
        // var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var accessi = e.model.__data.accessi
        if (accessi)
        {
            this.showToast('Accessory has been copied to Clipboard...')
            Clipboard.copyFromString(JSON.stringify([accessi], null, "\t"))
        }
    }

    _removeAccessoryTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var accessinx = e.model.__data.accessinx

        this.splice(`order.Variants.${varindex}.Accessories`, accessinx, 1)
        this.notifyPath(`order.Variants.${varindex}.Accessories`)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addAccessoryTap(e)
    {
        var useridInput = e.target.parentElement
        var oid = e.target.getAttribute('oid')
        var newid = useridInput.value
        if (!newid || !newid.trim || newid.trim() == '') { return }
        var newidTrim = newid.trim()
        if (newidTrim.indexOf("d~") == 0)
        {
            newidTrim = "d~" + StringUtil.replaceAll(newidTrim, "d~", "").toUpperCase()
        }
        else
        {
            newidTrim = newidTrim.toUpperCase()
        }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'accessory-new'
        var newidObj: any = { ProductAccessoryID: newidTrim, ProductManufacturerID: oid }

        this.cmdPost(this.api_url, newidObj, (r, response) =>
        {
            progress.active = false
            useridInput.disabled = false

            var r = response
            if (r)
            {
                var varindex= this.editVariantIndex
                if (r['success'] === true)
                {
                    var newItem = r['result']
                    useridInput.value = ''

                    this.push(`order.Variants.${varindex}.Accessories`, newItem)
                    this.notifyPath(`order.Variants.${varindex}.Accessories`)
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors(`order`, r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }
    
    copyAccessTap(e)
    {
        this.showToast('Accessories has been copied to Clipboard...')
        var varindex= this.editVariantIndex
        Clipboard.copyFromString(JSON.stringify(this.order.Variants[varindex].Accessories, null, "\t"))
    }

    async pasteAccessTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : {}
            if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not an array') }
            for (var i in model)
            {
                if (!model[i]['Items']) { throw new Error('model has no Items') }
                if (Array.isArray(model[i]['Items']))
                {
                    for (var itemi of model[i]['Items'])
                    {
                        if (!itemi['ProductAccessoryID']) { throw new Error('model items has no Product Accessory ID') }
                        if (!itemi['Name']) { throw new Error('model items has no Name') }
                        if (!itemi['Size'] || !itemi['Size']['Code'] || !itemi['Size']['Name']) { throw new Error('model items has no Size') }
                    }
                }
            }
            var varindex= this.editVariantIndex
            var mixed = JSON.parse(JSON.stringify(this.order.Variants[varindex].Accessories))
            if (!Array.isArray(mixed)) { mixed = [] }
            mixed.push(...model)
            
            try //check sizes
            {
                const sizes = this.order.Sizes
                for(var acci of mixed)
                {
                    acci.Items = sizes.map(i => 
                    { 
                        var rj = acci.Items.find(j => j.Size.Code == i.Code)
                        return { 
                            Size: i,
                            ProductAccessoryID: rj?.ProductAccessoryID,
                            Name: rj?.Name,
                            Quantity: rj?.Quantity,
                            Units: rj?.Units,
                        } 
                    })
                }
            }
            catch 
            {
                //
            }
            this.set(`order.Variants.${varindex}.Accessories`, mixed)
            this.notifyPath(`order.Variants.${varindex}.Accessories`)
            this.showToast('Accessories has been pasted from Clipboard...')
        }
        catch(e)
        {
            this.showToast('Accessories paste was failed - ' + e.message)
        }
    }

    _disable_SewingInstructions(manufactoringDescriptionList, loading)
    {
        return loading || !(manufactoringDescriptionList?.length > 0)
    }

    async _exportSewingInstructionsTap(e)
    {
        var data = this.order?.ManufactoringDescriptionList
        if (Array.isArray(data) && data.length > 0)
        { 
            const exportItems = data.map(i => i)
            const exportHeaders = Object.keys(exportItems[0])
            const exportFilename = `Sewing Instructions for PMID - ${this.order.ProductManufacturerID}`
            const dataToConvert = {
                data: exportItems,
                headers: exportHeaders,
                filename: exportFilename,
            }
            await this.csvImportPricetable.csvDownload(dataToConvert, this.language)

            this.showToast('Sewing Instructions has been builded and download...')
            return; ///EXIT
        }

        this.showToast('Sewing Instructions has no data ...')
    }

    copySewingInstructionsTap(e)
    {
        Clipboard.copyFromString(JSON.stringify(this.order.ManufactoringDescriptionList, null, "\t"))
        this.showToast('Sewing instructions has been copied to Clipboard...')
    }

    async pasteSewingInstructionsTap(e)
    {
        try
        {

            var json: any = await Clipboard.readFromClipboard()
            var model = JSON.parse(json)
            if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not array') }
            // console.log(model)
            for (var i in model)
            {
                if (!model[i]['DescriptionEN']) { throw new Error('model has no DescriptionEN') }
                if (!model[i]['Step']) { throw new Error('model has no Step') }
            }
            this.set('order.ManufactoringDescriptionList', model)
            this.showToast('Sewing instructions has been pasted from Clipboard...')
        }
        catch(e)
        {
            this.showToast('Sewing instructions paste was failed - ' + e.message)
        }
    }

    onCloseEditLayoutDialog(e)
    {
        const grid: any = this.shadowRoot?.querySelector('vaadin-grid#grid_Layouts')
        if (grid) { grid.clearCache() }
    }

    hideAll(selectedProductionTemplateSvg)
    {
        return selectedProductionTemplateSvg != ''
    }

    

    _activeItemChanged(activeItem)
    {
        this.selectedProductionTemplateSvg = activeItem ? activeItem.PartSvg : ''
    }

    _gridLayoutReset(layoutP) 
    {
        const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Layouts')

        if (layoutP.path.indexOf('.notvalid') >= 0)
        {
            if (grid) { grid.clearCache() }
        }

        if (grid && !this._grid_LayoutsEvent)
        {
            this._grid_LayoutsEvent = true
            grid.addEventListener('active-item-changed', function (event)
            {
                const item = event.detail.value
                grid.selectedItems = item ? [item] : []
            })
        }
    }

    hideSaveBtn(product)
    {
        return false
    }

    saveProductTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)//, this.shadowRoot.querySelector('div'))
    }

    _computeDisableImportSewingInst(importedItems, loading)
    {
        return loading === true || !Array.isArray(importedItems) || importedItems.length < 1
    }

    importManDescTap(e, obj, loading = true)
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

        // var items = Object.assign([], this.roster.Items)
        this.set('order.ManufactoringDescriptionList', [])

        for (var i in this.importedItems)
        {
            var ii = this.importedItems[i]
            // console.log(ii)
            var itemi = {
                Step: ii[mapping['Step']],
                DescriptionEN: ii[mapping['Description EN']],
                DescriptionTH: ii[mapping['Description TH']],
                DescriptionMY: ii[mapping['Description MY']],
                MachineType: ii[mapping['Machine Type']],
                StitchISO: ii[mapping['Stitch ISO']],
                StitchImg: '/images/sewing-instructions/stitch-iso-' + (ii[mapping['Stitch ISO']] || '')  + '.jpg'
            }
            this.push('order.ManufactoringDescriptionList', itemi)
        }
        this.notifyPath('order.ManufactoringDescriptionList')
        // console.log(this.order.ManufactoringDescriptionList)

        this.csvImportManInstr.reset()
    }

    saveProductConfirm(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) =>
        {
            if (oldmodel?.ProductManufacturerID != newmodel?.ProductManufacturerID)
            {
                var qp = { pmid: newmodel?.ProductManufacturerID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    

    gridCellClassNameGeneratorImpl(column, rowData)
    {
        var classes = ''
        if (rowData.item.notvalid !== undefined)
        {
            classes = ' notvalid'
        }
        return classes
    }


    upwardLayoutTap(e)
    {
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el = this.splice('order.Layouts', inx, 1)
        this.splice('order.Layouts', inxto, 0, el[0])
    }

    downwardLayoutTap(e)
    {
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.Sizes.length) { return }

        var el = this.splice('order.Layouts', inx, 1)
        this.splice('order.Layouts', inxto, 0, el[0])
    }

    editLayoutTap(e)
    {
        var item = e.model.__data.item
        var inx = e.model.__data.index

        this.editLayoutItem = Object.assign({}, item)
        this.editLayoutItem.NestingRotations = Object.assign({}, item.NestingRotations)
        this.editLayoutItem_A = item
        this.editLayoutItem_I = inx
        //this._openDlg(this.$.dialog_layout as PaperDialogElement)//, this.shadowRoot.querySelector('div.order'))

        var obj: any = { }
        var dialog_layout = this.$.dialog_layout as UIAdminDialog
        if (dialog_layout)
        {
            this.set('dialog_layout', Object.assign({ loading: true }, obj))
            dialog_layout.open()
        }
        this.async(()=> 
        {
            this.set('dialog_layout.loading', false)

        }, 170)
    }

    saveLayoutForAllTheSameFabricName(e)
    {
        this.saveLayoutForAllTheSame(e, 'FabricName')
    }

    saveLayoutForAllTheSameStockPart(e)
    {
        this.saveLayoutForAllTheSame(e, 'StockPart')
    }

    saveLayoutForAllTheSame(e, forAllTheSameField)
    {
        if (this.order) 
        {
            if (!this.order.Layouts) { this.set('order.Layouts', {}) }
        }
        var items = this.order.Layouts
        if (this.editLayoutItem_I != null)
        {
            var wasfn = items[this.editLayoutItem_I].FabricName
            items[this.editLayoutItem_I] = Object.assign(items[this.editLayoutItem_I], this.editLayoutItem)
            items[this.editLayoutItem_I].NestingRotations = Object.assign(items[this.editLayoutItem_I].NestingRotations, this.editLayoutItem.NestingRotations)
            this.notifyPath('order.Layouts.' + this.editLayoutItem_I)

            //Apply FabricName ForAllTheSame
            for (var i in items)
            {
                if (i == this.editLayoutItem_I) { continue }
                if (items[i].FabricName == wasfn)
                {
                    // this.set('order.Layouts.' + i + '.FabricName', items[this.editLayoutItem_I].FabricName)
                    this.set(`order.Layouts.${i}.${forAllTheSameField}`, items[this.editLayoutItem_I][forAllTheSameField])
                }
            }
        }
        else
        {
            items.push(Object.assign({}, this.editLayoutItem))
            this.notifyPath('order.Layouts')
        }
    }

    saveLayout(e)
    {
        if (this.order) 
        {
            if (!this.order.Layouts) { this.set('order.Layouts', {}) }
        }
        var items = this.order.Layouts
        if (this.editLayoutItem_I != null)
        {
            items[this.editLayoutItem_I] = Object.assign(items[this.editLayoutItem_I], this.editLayoutItem)
            items[this.editLayoutItem_I].NestingRotations = Object.assign(items[this.editLayoutItem_I].NestingRotations, this.editLayoutItem.NestingRotations)
            this.notifyPath('order.Layouts.' + this.editLayoutItem_I)
        }
        else
        {
            items.push(Object.assign({}, this.editLayoutItem))
            this.notifyPath('order.Layouts')
        }
    }



    onInputCountChanged(e)
    {
        //return this.onInputChanged(e)
    }

    onAccessSizeInputChanged(e)
    {
        var d = e?.model?.__data
        var accessinx = d?.accessinx
        var accessi = d?.accessi
        var varindex = d?.varindex
		var dh = e?.model?.__dataHost?.__dataHost?.__data
		var accessoptinx = dh?.accessoptinx

        if (accessi?.UseFirstForAll)
        {
            this.async(() =>{ this._useFirstForAll(varindex, accessi, accessinx, this._asBool(accessoptinx) ? accessoptinx : null) })
        }
        return this.onInputChanged(e)
    }

    _useFirstForAll(varindex, accessi, accessinx, accessoptinx: any = null)
    {
		// console.log('_useFirstForAll', accessoptinx)
        for (var i in accessi.Items)
        {
            if (i == '0') { continue }

            for (var k of Object.keys(accessi.Items[0]))
            {
                if (k == 'Size' || k == 'Units') { continue }
				if (accessoptinx == null)
				{
					this.set(`order.Variants.${varindex}.Accessories.${accessinx}.Items.${i}.${k}`, accessi.Items[0][k])
				}
				else
				{
					this.set(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}.Options.${accessinx}.Items.${i}.${k}`, accessi.Items[0][k])
				}
            }

			if (accessoptinx == null)
			{
				this.set(`order.Variants.${varindex}.Accessories.${accessinx}.Items.${i}.notvalid`, {})
			}
			else
			{
				this.set(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}.Options.${accessinx}.Items.${i}.notvalid`, {})
			}
        }
    }

    onUseFirstForAllInputChanged(e)
    {
        var d = e?.model?.__data
        var accessinx = d?.accessinx
        var accessi = d?.accessi
        var varindex = d?.varindex
		var dh = e?.model?.__dataHost?.__dataHost?.__data
		var accessopti = dh?.accessopti
		var accessoptinx = dh?.accessoptinx

		if (accessi?.UseFirstForAll)
		{
			this._useFirstForAll(varindex, accessi, accessinx, accessopti ? accessoptinx : null)
		}

        return this.onInputChanged(e)
    }

    _dis_access_size(accessiUseFirstForAll, sizeinx, loadingAny)
    {
        return loadingAny || (accessiUseFirstForAll && sizeinx > 0)
    }

    _variantCodeDebouncer: Debouncer
    onInputChanged(e)
    {
        if (e.target.tagName == "PAPER-INPUT") 
        {
            var varindex = e?.model?.__dataHost.__dataHost.__data.varindex || e?.model?.__data.varindex
            if (this._asBool(varindex))
            {
                if (e.target.name == 'Code')
                {
                    this._variantCodeDebouncer = Debouncer.debounce(this._variantCodeDebouncer, timeOut.after(950), () =>
                    {
                        if (this.loading) { return }

                        var tables = JSON.parse(JSON.stringify(this.order.Variants))
                        this.set('order.Variants', tables)
                    })
                }

                this.notifyPath(`order.Variants`)
                this.notifyPath(`order.Variants.${varindex}`)

                var sami = e?.model?.__data?.sami
                if (sami)
                {
                    this.set(`order.Variants.${varindex}.notvalid.StandardAllocatedMinutes`, null)
                }
            }
        }


        if (e?.model?.__data?.accessi && (e.target.tagName == "PAPER-CHECKBOX")) 
        {
            var d = e?.model?.__data
            var accessinx = d.accessinx
            var accessi = d.accessi
            var varindex = d.varindex
            var pmid = this.order.ProductManufacturerID

            this._accessIDChangedDebouncer = Debouncer.debounce(this._accessIDChangedDebouncer, timeOut.after(1500), () =>
            {
                if (accessoptinx === undefined)
                {
                    this._getAccessoryObj(accessinx, accessi, varindex, pmid)
                }
                else
                {
                    this._getAccessoryOptionObj(accessoptinx, accessopti, varindex, pmid)
                }
            })
        }


        if (e?.model?.__dataHost?.__dataHost?.__data?.sizei && (e.target.tagName == "PAPER-INPUT")) 
        {
            var dh = e.model.__dataHost.__dataHost.__data
            var accessinx = dh.accessinx
            var accessi = dh.accessi
            var hd = e.model.__dataHost.__dataHost.__dataHost.__dataHost.__data
            var accessoptinx = hd.accessoptinx
            var accessopti = hd.accessopti
            var pmid = this.order.ProductManufacturerID
            var varindex = dh.__dataHost.__data.varindex

            this._accessIDChangedDebouncer = Debouncer.debounce(this._accessIDChangedDebouncer, timeOut.after(1500), () =>
            {
                if (accessoptinx === undefined)
                {
                    this._getAccessoryObj(accessinx, accessi, varindex, pmid)
                }
                else
                {
                    this._getAccessoryOptionObj(accessoptinx, accessopti, varindex, pmid)
                }
            })
        }


        if (e?.model?.__dataHost?.__dataHost?.__data?.accessi && (e.target.tagName == "PAPER-INPUT")) 
        {
            var dh = e.model.__dataHost.__dataHost.__data
            var accessinx = dh.accessinx
            var accessi = dh.accessi
            var varindex = dh.varindex

            var hd = e.model.__dataHost.__dataHost.__dataHost.__dataHost.__data
            var accessoptinx = hd.accessoptinx
            var accessopti = hd.accessopti
            var varindex = hd.varindex
            var pmid = this.order.ProductManufacturerID

            this._accessIDChangedDebouncer = Debouncer.debounce(this._accessIDChangedDebouncer, timeOut.after(1500), () =>
            {
                if (accessoptinx === undefined)
                {
                    this._getAccessoryObj(accessinx, accessi, varindex, pmid)
                }
                else
                {
                    this._getAccessoryOptionObj(accessoptinx, accessopti, varindex, pmid)
                }
            })
        }
        

        if (e && e.model && e.model.__data && (e.target.tagName == "TEAMATICAL-UI-QUANTITY")) 
        {
            var dh = e.model.__data
            var accessinx = dh.accessinx
            var accessi = dh.accessi
            var accessoptinx = dh.accessoptinx
            var accessopti = dh.accessopti
            var pmid = this.order.ProductManufacturerID

            this._accessIDChangedDebouncer = Debouncer.debounce(this._accessIDChangedDebouncer, timeOut.after(1500), () =>
            {
                if (accessinx !== undefined && accessi !== undefined) 
                {
                    this._getAccessoryObj(accessinx, accessi, varindex, pmid)
                }
                if (accessoptinx !== undefined && accessopti !== undefined)
                {
                    this._getAccessoryOptionObj(accessoptinx, accessopti, varindex, pmid)
                }
            })
        }

        
        if (e?.model?.__dataHost?.__dataHost?.__data?.vari && (e.target.tagName == "PAPER-DROPDOWN-MENU"))
        {
            var varindex = e?.model?.__dataHost.__dataHost.__data.varindex
            this.notifyPath(`order.Variants`)
            this.notifyPath(`order.Variants.${varindex}`)

        }

        return this._onInputChanged(e)
    }

    _getAccessoryObj(accessinx, accessi, varindex, pmid)
    {
        this.api_action = 'accessory-update'
        var newidObj: any = accessi
        newidObj.ProductManufacturerID = pmid
        var qp = { validationPrefix: `Variants.${varindex}.Accessories.${accessinx}` }
        var apiurl = StringUtil.urlquery(this.api_url, qp)
        var useFirstForAll: any = accessi.UseFirstForAll


        this.cmdPost(apiurl, newidObj, (r, response) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var newItem = r['result']
                    this.set(`order.Variants.${varindex}.Accessories.${accessinx}`, Object.assign(newItem, { UseFirstForAll: useFirstForAll }))
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        var newItem = r['result']
                        this.set(`order.Variants.${varindex}.Accessories.${accessinx}`, Object.assign(newItem, { UseFirstForAll: useFirstForAll }))
                        this._applyDetailsErrors(`order`, r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })
    }

    _getAccessoryOptionObj(accessoptinx, accessopti, varindex, pmid)
    {
        this.api_action = 'accessory-option-update'
        var newidObj: any = accessopti
        newidObj.ProductManufacturerID = pmid
        var qp = { validationPrefix: `Variants.${varindex}.AccessoriesOptions.${accessoptinx}` }
        var apiurl = StringUtil.urlquery(this.api_url, qp)
        var useFirstForAll: any = []
		for (var i in accessopti.Options)
		{
			useFirstForAll[i] = accessopti.Options[i].UseFirstForAll
		}

        this.cmdPost(apiurl, newidObj, (r, response) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var newItem = r['result']
					for (var i in newItem.Options)
					{
						newItem.Options[i].UseFirstForAll = useFirstForAll.length > i ? useFirstForAll[i] : false
					}
                    this.set(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}`, newItem)
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        var newItem = r['result']
						for (var i in newItem.Options)
						{
							newItem.Options[i].UseFirstForAll = useFirstForAll.length > i ? useFirstForAll[i] : false
						}
                        this.set(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}`, newItem)
                        this._applyDetailsErrors(`order`, r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })
    }

    _badgeDesignChanged(varindex, vari, progressDom?)
    {
        if (this.orderUpdating)
        {
            if (this._badgeDesignSourceNameDebouncer) { this._badgeDesignSourceNameDebouncer.cancel() }
            return 
        } 

        var progress = progressDom
        // this._badgeDesignSourceNameDebouncer = Debouncer.debounce(this._badgeDesignSourceNameDebouncer, timeOut.after(3200), () =>
        // {
            var newidObj: any = { 
                BadgeDesignSourceName: vari.BadgeDesignSourceName,
                AccessoriesOptions: vari.AccessoriesOptions,
            }
            this.api_action = 'accessory-generate'
            var url = StringUtil.urlquery(this.api_url, { 
                validationPrefix: `Variants.${varindex}.AccessoriesOptions`, 
            })
            if (progress) { progress.active = true }

            this.cmdPost(url, newidObj, (r, response) =>
            {
                if (progress) { this.async(() => { progress.active = false }, 300) }

                var r = response
                if (r)
                {
                    if (r['success'] === true)
                    {
                        var order = r['result']
                        if (order.AccessoriesOptions)
                        {
                            this.set(`order.Variants.${varindex}.AccessoriesOptions`, order.AccessoriesOptions) 
                        }
                    }
                    else if (r['success'] === false)
                    {
                        var s = r['summary']
                        if (s && (s.Key == 'validation_fail'))
                        {
                            this._applyDetailsErrors(`order`, r['details'])
                        }
                    }
                    else if (r['error'])
                    {
                        this._onError(null, r['error'])
                    }
                }
            })
        // })

    }

    viewAccessoryTap(e)
    {
        //todo
    }

    viewAccessoryOptionTap(e)
    {
        //todo
    }
    
    _removeStockTap(e)
    {
        var stocki = e.model.__data.stocki
        for (var i in this.order.StockColors)
        {
            if (this.order.StockColors[i] && stocki && this.order.StockColors[i] === stocki)
            {
                var inx = this.order.StockColors.indexOf(this.order.StockColors[i])
                this.splice('order.StockColors', inx, 1)
                this.notifyPath('order.StockColors')
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addStockTap(e)
    {
        var useridInput = e.target.parentElement
        var newid = useridInput.value
        if (!newid || !newid.trim || newid.trim() == '') { return }
        var newidTrim = newid.trim()
        if (newidTrim.indexOf("d~") == 0)
        {
            newidTrim = "d~" + StringUtil.replaceAll(newidTrim, "d~", "")//.toUpperCase()
        }
        else
        {
            newidTrim = newidTrim//.toUpperCase()
        }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'stock-color-new'
        var newItem = {
            ProductManufacturerID: this.order.ProductManufacturerID,
            StockDesignSource: "",
            StockID: newidTrim,
            StockName: `stockname:${newidTrim}`,
        }
        this.cmdPost(this.api_url, newItem, (r, response) =>
        {
            progress.active = false
            useridInput.disabled = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var resultItem = r['result']
                    useridInput.value = ''

                    if (this.order && !this.order.StockColors) { this.order.StockColors = [] }
                    this.push('order.StockColors', resultItem)
                    this.notifyPath('order.StockColors')
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _regenerateOptionsTap(e)
    {
        if (!this.order) { return }
        
        var vari = e.model.__data.vari
        var varindex = e.model.__data.varindex
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        this._badgeDesignChanged(varindex, vari, progress)
    }

    _addAccessoryOptionTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex

        var useridInput = e.target.parentElement
        var oid = e.target.getAttribute('oid')
        var aoid = e.model.__data.accessopti.AccessoryOptionID
        var newid = useridInput.value
        if (!newid || !newid.trim || newid.trim() == '') { return }
        var newidTrim = newid.trim()
        if (newidTrim.indexOf("d~") == 0)
        {
            newidTrim = "d~" + StringUtil.replaceAll(newidTrim, "d~", "").toUpperCase()
        }
        else
        {
            newidTrim = newidTrim.toUpperCase()
        }
        
        
        var accessopti = e.model.__data.accessopti
        var inx = ''
        for (var i in this.order.Variants[varindex].AccessoriesOptions)
        {
            if (this.order.Variants[varindex].AccessoriesOptions[i] && accessopti 
                && this.order.Variants[varindex].AccessoriesOptions[i] === accessopti)
            {
                inx = this.order.Variants[varindex].AccessoriesOptions.indexOf(this.order.Variants[varindex].AccessoriesOptions[i])
            }
        }


        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'accessory-new-option'
        var newidObj: any = { ProductAccessoryID: newidTrim, AccessoryOptionID: aoid, ProductManufacturerID: oid }

        this.cmdPost(this.api_url, newidObj, (r, response) =>
        {
            progress.active = false
            useridInput.disabled = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var newItem = r['result']
                    useridInput.value = ''
                    this.push(`order.Variants.${varindex}.AccessoriesOptions.${inx}.Options`, newItem)
                    this.notifyPath(`order.Variants.${varindex}.AccessoriesOptions`)
                    this.notifyPath(`order.Variants.${varindex}.AccessoriesOptions.${inx}.Options`)
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        var details = r['details']
                        for (var i in details)
                        {
                            if (details[i].Key == 'ProductAccessoryID')
                            {
                                details[i].Key = `AccessoriesOptions.${inx}.ProductAccessoryID`
                            }
                        }
                        this._applyDetailsErrors(`order`, details)
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeAccessoryOptionTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var accessopti = e.model.__dataHost.__dataHost.__data.accessopti
        var opti = e.model.__data.accessi
        
        for (var i in this.order.Variants[varindex].AccessoriesOptions)
        {
            if (this.order.Variants[varindex].AccessoriesOptions[i] 
                && accessopti 
                && this.order.Variants[varindex].AccessoriesOptions[i] === accessopti)
            {
                var inx = this.order.Variants[varindex].AccessoriesOptions.indexOf(this.order.Variants[varindex].AccessoriesOptions[i])
                var options = this.order.Variants[varindex].AccessoriesOptions[inx].Options
                for (var j in options)
                {
                    if (options && opti && options[j] === opti)
                    {
                        var jnx = options.indexOf(options[j])
                        this.splice(`order.Variants.${varindex}.AccessoriesOptions.${inx}.Options`, jnx, 1)
                        this.notifyPath(`order.Variants.${varindex}.AccessoriesOptions.${inx}.Options`)
                        break
                    }
                }
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    copyAccessOption2ClipboardTap(e)
    {
        // var varindex = e.model.__dataHost.__dataHost.__data.varindex
        // var accessopti = e.model.__dataHost.__dataHost.__data.accessopti
        var accessi = e.model.__data.accessi
        if (accessi)
        {
            this.showToast('Accessory Option has been copied to Clipboard...')
            Clipboard.copyFromString(JSON.stringify([accessi], null, "\t"))
        }
    }

    copyAccessOptionsTap(e)
    {
        this.showToast('Accessories Options has been copied to Clipboard...')
        var varindex= this.editVariantIndex
        Clipboard.copyFromString(JSON.stringify(this.order.Variants[varindex].AccessoriesOptions, null, "\t"))
    }

    async pasteAccessOptionsTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : {}
            if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not an array') }
            for (var i in model)
            {
                if (!model[i]['Name']) { throw new Error('model has no Accessories Option Name') }
                if (!model[i]['Options']) { throw new Error('model has no Accessories Options') }
                if (Array.isArray(model[i]['Options']))
                {
                    for (var accessopti of model[i]['Options'])
                    {
                        if (!accessopti['Items']) { throw new Error('model Options has no Items') }
                        if (Array.isArray(accessopti['Items']))
                        {
                            for (var itemi of accessopti['Items'])
                            {
                                if (!itemi['ProductAccessoryID']) { throw new Error('model items has no Product Accessory ID') }
                                if (!itemi['Name']) { throw new Error('model items has no Name') }
                                if (!itemi['Size'] || !itemi['Size']['Code'] || !itemi['Size']['Name']) { throw new Error('model items has no Size') }
                            }
                        }
                    }
                }
            }
            var varindex= this.editVariantIndex
            var mixed = model //replace

            this.set(`order.Variants.${varindex}.AccessoriesOptions`, mixed)
            this.notifyPath(`order.Variants.${varindex}.AccessoriesOptions`)
            this.showToast('Accessories Options has been pasted from Clipboard...')
        }
        catch(e)
        {
            this.showToast('Accessories Options paste was failed - ' + e.message)
        }
    }

    async pasteAccessOptionTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : {}
            if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not an array') }
            for (var i in model)
            {
                // if (!model[i]['OptionName']) { throw new Error('model has no Option Name') } //do not check option name due to able copy accessories to accessories options items and vice versa
                if (!model[i]['Items']) { throw new Error('model has no Items') }
                if (Array.isArray(model[i]['Items']))
                {
                    for (var itemi of model[i]['Items'])
                    {
                        if (!itemi['ProductAccessoryID']) { throw new Error('model items has no Product Accessory ID') }
                        if (!itemi['Name']) { throw new Error('model items has no Name') }
                        if (!itemi['Size'] || !itemi['Size']['Code'] || !itemi['Size']['Name']) { throw new Error('model items has no Size') }
                    }
                }
            }
            var varindex = this.editVariantIndex
            var accessoptinx = e.model.__data.accessoptinx
            var mixed = deepClone(this.order.Variants[varindex].AccessoriesOptions[accessoptinx].Options)
            if (!Array.isArray(mixed)) { mixed = [] }
            mixed.push(...model)
            
            this.set(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}.Options`, mixed)
            this.notifyPath(`order.Variants.${varindex}.AccessoriesOptions.${accessoptinx}.Options`)
            this.showToast('Accessories Options has been pasted from Clipboard...')
        }
        catch(e)
        {
            this.showToast('Accessories Options paste was failed - ' + e.message)
        }
    }

    _convertSwColor(hex)
    {
        return 'fill:#' + hex + ';'
    }


    //#region KeyMeasurements

    _compute_disableImportKeyMeasurements(keymeasurementsItems, loading)
    {
        return loading === true || !Array.isArray(keymeasurementsItems) || keymeasurementsItems.length < 1
    }

    _compute_keymeasurementsMappingKeys(sizes)
    {
        var keyMeasurementsTitles = ['Name', 'Name TH']
        if (Array.isArray(sizes))
        {
            for (var i in sizes)
            {
                keyMeasurementsTitles.push(sizes[i].Name)
            }
        }
        keyMeasurementsTitles = keyMeasurementsTitles.concat(['Tolerance', 'Units'])
        // console.log(keyMeasurementsTitles)
        return keyMeasurementsTitles
    }

    _formatSizeValue(keymeasureValues, sizeCode)
    {
        const NA = 'n/a'
        if (!Array.isArray(keymeasureValues)) { return NA }
        // console.log(sizeCode, keymeasureValues)

        var ss = keymeasureValues.filter(i => i.Size.Code == sizeCode)
        if (ss.length > 0)
        {
            return ss[0].Value ? ss[0].Value : NA
        }
        return NA
    }

    _keymeasureSizes(sizeArr, keymeasureiValues, keymeasureiValuesP)
    {
        if (!Array.isArray(sizeArr)) { return [] }
        var r = sizeArr.map((sizei, sizeinx, sizearr) =>  
        {
            var sr = {
                Value: this._formatSizeValue(keymeasureiValues, sizei.Code),
            }
            if (keymeasureiValues[sizeinx]?.notvalid)
            { 
                sr['notvalid'] = keymeasureiValues[sizeinx]?.notvalid
            }
            return sr
        })
        return r
    }

    importKeyMeasurementsTap(e, obj, loading = true)
    {
        var mapping = this.keymeasurementsMapping.reduce((map, obj) =>
        {
            map[obj.To] = obj.From
            return map
        }, {})

        if (!this.loading && loading) 
        {
            this.loading = true
            var d = Math.max(250, Math.min(3000, this.keymeasurementsItems.length * 15))
            this.async(() => { this.loading = false }, d)
        }

        // var items = Object.assign([], this.roster.Items)
        this.set('order.KeyMeasurements', [])

        
        for (var i in this.keymeasurementsItems)
        {
            var ii = this.keymeasurementsItems[i]
            // console.log(ii)
            var values:any = []
            for (var k in this.order.Sizes)
            {
                let sizek = JSON.parse(JSON.stringify(this.order.Sizes[k]))
                values.push({
                    Size: sizek,
                    Value: ii[mapping[sizek.Code]],
                })
            }
            var itemi = {
                Name: ii[mapping['Name']],
                NameTH: ii[mapping['Name TH']],
                Values: values,
                Tolerance: ii[mapping['Tolerance']],
                Units: ii[mapping['Units']],
            }
            this.push('order.KeyMeasurements', itemi)
        }
        this.notifyPath('order.KeyMeasurements')
        // console.log(this.order.KeyMeasurements)

        this.csvImportKeyMeas.reset()
    }

    _disable_KeyMeasurements(keyMeasurements, loading)
    {
        return loading || !(keyMeasurements?.length > 0)
    }

    async _exportKeyMeasurementsTap(e)
    {
        var data = this.order?.KeyMeasurements
        if (Array.isArray(data) && data.length > 0)
        { 
            const exportItems = data.map(i => i)
            const exportHeaders = Object.keys(exportItems[0])
            const exportFilename = `Key Measurements for PMID - ${this.order.ProductManufacturerID}`
            const dataToConvert = {
                data: exportItems,
                headers: exportHeaders,
                filename: exportFilename,
            }
            await this.csvImportPricetable.csvDownload(dataToConvert, this.language)

            this.showToast('Key Measurements has been builded and download...')
            return; ///EXIT
        }

        this.showToast('Key Measurements has no data ...')
    }

    copyKeyMeasurementsTap(e)
    {
        this.showToast('Key Measurements has been copied to Clipboard...')
        Clipboard.copyFromString(JSON.stringify(this.order.KeyMeasurements, null, "\t"))
    }

    async pasteKeyMeasurementsTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            if (!json) { return }

            var model = JSON.parse(json)
            if (!Array.isArray(model) || model.length < 1) { throw new Error('model is not array') }
            // console.log(model)
            for (var i in model)
            {
                if (!model[i]['Name']) { throw new Error('model has no Name') }
            }
            this.set('order.KeyMeasurements', model)
            this.showToast('Key Measurements has been pasted from Clipboard...')
        }
        catch(e)
        {
            this.showToast('Key Measurements paste was failed - ' + e.message)
        }
    }

    //#endregion


    qalabelImage(QALabelList, QALabel_id)
    {
        if (!Array.isArray(QALabelList)) { return '' }
        var f = QALabelList.filter(i => i.id == QALabel_id)
        if (f.length > 0)
        {
            // console.log(f[0].id)
            return f[0].imageUrl
        }
        return ''
    }

    printStockLabelsTap(e)
    {
        var labels = this.dialogprintlabels.StockColors.reduce((acci, i) => 
        {
            var bars = i.Barcodes.reduce((accj, j) => 
            { 
                if (j.ZPL)
                {
                    var cnt = 1
                    try
                    {
                        cnt = j.Count ? parseInt(j.Count) : 1
                    }
                    catch
                    {
                        //
                    }
                    accj = accj.concat(Array(cnt).fill({ ZPL: j.ZPL }))
                }
                return accj
            }, 
            [])
            acci = acci.concat(bars)
            return acci
        }, 
        [])
        this.scannerprintersettings.printStockOptions('', labels)
    }

    printStockLabelsDialogTap(e)
    {
        var obj: any = { 
            StockColors: JSON.parse(JSON.stringify(this.order.StockColors))
        }

        var dialogprintlabels = this.$.dialogprintlabels as UIAdminDialog
        if (dialogprintlabels)
        {
            this.set('dialogprintlabels', Object.assign({ loading: true }, obj, { title: 'Print Stock Options Labels' }))
            dialogprintlabels.open()
        }

        this.async(()=> 
        {
            this.set('dialogprintlabels.loading', false)

        }, 170)
    }

    _brandName(defaultName, recentName)
    {
        return recentName ? recentName : defaultName
    }

    _notvalidProductAccessoryID(productAccessoryID, notvalidProductAccessoryID)
    {
        return !this._asBool(productAccessoryID) || productAccessoryID.length < 27 || this._asBool(notvalidProductAccessoryID)
    }

    hideAddTierBtn(order)
    {
        return false
    }

    _tierTitle(tieri_ID, tieri_ProductManufacturerID = null)
    {
        // Name: "Jersey"
        // ProductManufacturerID: "XRGE2FSE50SZBE4CWQF5V4XBUCE"
        // Quantity: "1"
        // SKU: "BKJ150M1"
        // SizeCategory: {id: "JERSEY", title: "Jersey"}
        // Sizes: [{Code: "2XL", Name: "2XL", Surcharge: "", CustomsWeightGrams: ""},…]
        // Type: "basketball jersey"
        const tierTitle = this.localizep('admin-tiers-', this._tierType(tieri_ID))
        const pmanf: any = null
        return pmanf 
            ? `${tierTitle} - ${pmanf.Name}, ${pmanf.SKU}`
            : `${tierTitle}`
    }

    _tierType(tieri_ID)
    {
        if (typeof tieri_ID == 'string') 
        { 
            var r = tieri_ID.replace(TierFactoryCost, '')
            if (tieri_ID != r)
            {
                return TierFactoryCost
            }
        }
        return tieri_ID
    }



    _addNewViewTap(e)
    {
        var newidTrim = '_new_'
        
        var varindex = this.editVariantIndex
        var inx = -1
        for (var i in this.order.Variants[varindex].ViewIDs)
        {
            if (this.order.Variants[varindex].ViewIDs[i] && newidTrim && this.order.Variants[varindex].ViewIDs[i] === newidTrim)
            {
                inx = this.order.Variants[varindex].ViewIDs.indexOf(this.order.Variants[varindex].ViewIDs[i])
                this._applyDetailsErrors(`order`, [{ Key: "ViewIDs", Message: "Duplicate View ID", Type: "e" }])
                return
            }
        }

        this.push(`order.Variants.${varindex}.ViewIDs`, { ViewID: newidTrim })
        this.notifyPath(`order.Variants.${varindex}.ViewIDs`)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addViewIdTap(e)
    {
        var useridInput = e.target.parentElement
        var newid = useridInput.value
        if (!newid || !newid.trim || newid.trim() == '') { return }
        var newidTrim = newid.trim()
        if (newidTrim.indexOf("d~") == 0)
        {
            newidTrim = "d~" + StringUtil.replaceAll(newidTrim, "d~", "").toUpperCase()
        }
        else
        {
            newidTrim = newidTrim.toUpperCase()
        }

        
        var varindex = this.editVariantIndex
        var inx = -1
        for (var i in this.order.Variants[varindex].ViewIDs)
        {
            if (this.order.Variants[varindex].ViewIDs[i] && newidTrim && this.order.Variants[varindex].ViewIDs[i] === newidTrim)
            {
                inx = this.order.Variants[varindex].ViewIDs.indexOf(this.order.Variants[varindex].ViewIDs[i])
                this._applyDetailsErrors(`order`, [{ Key: "ViewIDs", Message: "Duplicate View ID", Type: "e" }])
                return
            }
        }

        useridInput.value = ''
        this.push(`order.Variants.${varindex}.ViewIDs`, { ViewID: newidTrim })
        this.notifyPath(`order.Variants.${varindex}.ViewIDs`)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeViewIdTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var viewi = e.model.__data.viewi
        for (var i in this.order.Variants[varindex].ViewIDs)
        {
            if (this.order.Variants[varindex].ViewIDs[i] && viewi && this.order.Variants[varindex].ViewIDs[i] === viewi)
            {
                var inx = this.order.Variants[varindex].ViewIDs.indexOf(this.order.Variants[varindex].ViewIDs[i])
                this.splice(`order.Variants.${varindex}.ViewIDs`, inx, 1)
                this.notifyPath(`order.Variants.${varindex}.ViewIDs`)
                break
            }
        }

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _upwardViewIdTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var viewi = e.model.__data.viewi
        var inx = -1
        for (var i in this.order.Variants[varindex].ViewIDs)
        {
            if (this.order.Variants[varindex].ViewIDs[i] && viewi && this.order.Variants[varindex].ViewIDs[i] === viewi)
            {
                inx = this.order.Variants[varindex].ViewIDs.indexOf(this.order.Variants[varindex].ViewIDs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el: any = this.splice(`order.Variants.${varindex}.ViewIDs`, inx, 1)
        this.splice(`order.Variants.${varindex}.ViewIDs`, inxto, 0, el[0])
    }

    _downwardViewIdTap(e)
    {
        var varindex = e.model.__dataHost.__dataHost.__data.varindex
        var viewi = e.model.__data.viewi
        var inx = -1
        for (var i in this.order.Variants[varindex].ViewIDs)
        {
            if (this.order.Variants[varindex].ViewIDs[i] && viewi && this.order.Variants[varindex].ViewIDs[i] === viewi)
            {
                inx = this.order.Variants[varindex].ViewIDs.indexOf(this.order.Variants[varindex].ViewIDs[i])
                break
            }
        }

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.Variants[varindex].ViewIDs.length) { return }

        var el: any = this.splice(`order.Variants.${varindex}.ViewIDs`, inx, 1)
        this.splice(`order.Variants.${varindex}.ViewIDs`, inxto, 0, el[0])
    }


    _disRemoveVariant(length, loading)
    {
        return loading || length <= 1
    }

    _removeVariantTap(e)
    {
        var inx = ''
        for (var i in this.order.Variants)
        {
            if (this.order.Variants[i].ID == this.order.editVariant)
            {
                inx = i
                break
            }
        }
        if (inx)
        {
            this.order.Variants.splice(inx, 1)
            this.set('order.Variants', Object.assign([], this.order.Variants))
            if (this.order.Variants?.length)
            {
                var linx = (this.order.Variants.length - 1)
                if (parseInt(inx) > linx) { inx = linx.toString() }
                this.set('order.editVariant', this.order.Variants[inx].ID)
            }
            else
            {
                this.set('order.editVariant', '')
            }
        }
    }

    _addVariantTap(e)
    {
        var variantTitle = e.target?.parentElement?.value
        if (!variantTitle || !variantTitle.trim || variantTitle.trim() == '') { return }
        var variantTitleTrim = variantTitle.trim()

        e.target.parentElement.value = ''
        var variantNew: any = { 
            ID: MD5((new Date()).getMilliseconds().toString() + variantTitleTrim), 
            Code: variantTitleTrim 
        }
        if (this.order.Variants?.length)
        {
            var baseVar = this.order.Variants[this.order.Variants.length - 1]
            if (this._asBool(this.editVariantIndex)) { baseVar = this.order.Variants[this.editVariantIndex] }

            variantNew = Object.assign(deepClone(baseVar), 
            { 
                ID: MD5((new Date()).getMilliseconds().toString() + variantTitleTrim), 
                Code: variantTitleTrim,
            })
            if (Array.isArray(variantNew.Tiers))
            {
                for (var i in variantNew.Tiers)
                {
                    variantNew.Tiers[i].Values = []
                }
            }
        }

        // this.push('order.Variants', variantNew)
        var tables = JSON.parse(JSON.stringify(this.order.Variants))
        tables.push(variantNew)
        this.set('order.Variants', tables)


        // this.notifyPath('order.Variants')
        this.async(()=> 
        {
            this.set('order.editVariant', variantNew.ID)
        }, 150)
    }


    //#region PriceTABELS
    
    numberQtyRegexp = new RegExp('[^0-9]+', 'g')
    _importTap(e, obj, loading = true)
    {
        var mapping = this.importedPriceTableMapping.reduce((map, obj) =>
        {
            map[obj.To] = obj.From
            return map
        }, {})

        if (!this.loading && loading) 
        {
            this.loading = true
            var d = Math.max(250, Math.min(3000, this.importedPriceTableItems.length * 15))
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
            for (var i in this.importedPriceTableItems)
            {
                var ii = this.importedPriceTableItems[i]
                var tieritemnew = {
                    Quantity: ii[mapping['Quantity']],
                    Price: -1,
                    Description: ii[mapping['Description']] ? ii[mapping['Description']] : "Get %percent% discount for %count% items",
                    DescriptionApplied: ii[mapping['Description Applied']] ? ii[mapping['Description Applied']] : "Get %percent% discount",
                }
                for (var ti of tierModel)
                {
                    var tierid = ti.ID
                    if (tierid.indexOf(TierFactoryCost) == 0) { tierid = this.importedPriceTableMappingKeys[2] } //factory price id has product man. id (need to clean)
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

            var model = { Tiers: tierModel }
            this.applyPriceTableValidation(model, ptableindex)
            this.showToast('Tier Model has been imported from Clipboard...')
        }
        catch (e)
        {
            this.showToast('Tier Model import was failed - ' + e.message)
        }

        if (this.csvImportPricetable) { this.csvImportPricetable.reset() }
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
        
        var obj: any = { }
        var dialog_tier = this.$.dialog_tier as UIAdminDialog
        if (dialog_tier)
        {
            this.set('dialog_tier', Object.assign({ 
                loading: true,
                editTierTitle: 'Add New Price Item',
                editTierBtn: 'Add New Price Item',
                editTierItem: { ID: TierFactoryCost },
                editTierType: false,
                editTierItem_AP: ptablei,
            }, obj))
            this.editTierItem_IP = ptableindex
            // this.notifyPath('editTierItem_AP.Currency')
            dialog_tier.open()
        }
        this.async(()=> 
        {
            this.set('dialog_tier.loading', false)
        }, 170)
    }

    async _exportPriceTableTap(e)
    {
        if (Array.isArray(this.order.PriceTables)) 
        { 
            var r = this.order.PriceTables.filter(i => i.id == this.editPriceTable)
            if (r?.length) 
            { 
                var data = r[0]?.Tiers[0]?.Values
                if (Array.isArray(data) && data.length > 0)
                {
                    // r[0]?.Currency?.title
                    // r[0]?.Tiers[0]?.ID
                    const exportItems = data.map(i => i)
                    const exportHeaders = Object.keys(exportItems[0])
                    const exportFilename = `price table ${r[0]?.title}`
                    const dataToConvert = {
                    	data: exportItems,
                    	headers: exportHeaders,
                    	filename: exportFilename,
                    }
                    await this.csvImportPricetable.csvDownload(dataToConvert, this.language)

                    this.showToast('Price Table Model has been builded and download...')
                    return; ///EXIT
                }
            }
        }

        this.showToast('Price Table Model has no data ...')
    }

    copyPriceTableModelTap(e)
    {
        if (Array.isArray(this.order.PriceTables)) 
        { 
            var r = this.order.PriceTables.filter(i => i.id == this.editPriceTable)
            if (r?.length) 
            { 
                Clipboard.copyFromString(JSON.stringify(r[0], null, "\t"))
                this.showToast('Price Table Model has been copied to Clipboard...')
            }
        }
    }

    async pastePriceTableModelTap(e)
    {
        try
        {
            var json = await Clipboard.readFromClipboard()
            var model = json ? JSON.parse(json) : null
            // if (model && Array.isArray(this.order.ProductManufacturers) && this.order.ProductManufacturers.length == 1)
            // {
            //     var pmid = this.order.ProductManufacturers[0].ProductManufacturerID
            //     for(var i in model)
            //     {
            //         if (typeof(model[i].ID) == 'string' && model[i].ID.indexOf(TierFactoryCost) == 0)
            //         {
            //             model[i].ProductManufacturerID = pmid
            //         }
            //     }
            // }
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



        var priceTableNew: any = { id: MD5((new Date()).getMilliseconds().toString() + priceTableTitleTrim), title: priceTableTitleTrim }
        if (this.order.PriceTables?.length)
        {
            priceTableNew = Object.assign(JSON.parse(JSON.stringify(this.order.PriceTables[this.order.PriceTables.length - 1])), 
            { 
                id: MD5((new Date()).getMilliseconds().toString() + priceTableTitleTrim), 
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
        this.async(()=> 
        {
            this.set('editPriceTable', priceTableNew.id)
        }, 150)
        
    }

    _buildTitles(list, listP)
    {
        return list
    }

    _firstPriceLink(plinkinx, slinkinx)
    {
        return plinkinx == 0 && slinkinx == 0
    }

    _disRemovePriceTable(length, loading)
    {
        return loading || length <= 1
    }

    _disableImportPriceTableTiers(importedItems, loading)
    {
        return loading === true || !Array.isArray(importedItems) || importedItems.length < 1
    }

    _disable_PriceTableTiers(tiers, tiersP, loading)
    {
        var hasitems = tiers?.length > 0 ? tiers[0].Values?.length > 0 : false
        return loading || !hasitems
    }

    _showRemoveSize(plinkiSizeLinksLength, slinkinx)
    {
        return plinkiSizeLinksLength > 1
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

    _tiersList(orderPriceTables)
    {
        if (orderPriceTables?.length)
        {
            var v = orderPriceTables.filter(i => i.id == this.editPriceTable)
            return v?.length ? v[0].Tiers : []
        }
        return []
    }

    onCloseSaveDialogTier(e)
    {
        //grid_[[ptableindex]]_[[index]]
        // const grid: any = this.shadowRoot.querySelector('vaadin-grid#grid_Layouts')
        // if (grid) { grid.clearCache() }
    }

    //#endregion

}
