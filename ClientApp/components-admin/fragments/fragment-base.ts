import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { UIBase } from '../ui/ui-base'
import { PaperDialogElement } from '@polymer/paper-dialog'
import { UIAdminDialog } from '../ui/ui-dialog'

const ptoken_empty = ""
export const TierFactoryCost = 'TierFactoryCost'
declare const Chart: any //?



export class FragmentBase extends UIBase
{
    constructor()
    {
        super()
    }

    //#region Variables
    
    checkboxAutoRefresh: boolean
    machineAuthorization: any
    columnsSettings: any
    queryParamsRequired: any
    queryParamsAsObject: any
    queryParamsDefault: any
    pageSize: any
    page: any
    pages_reset: boolean = false
    pfirst: any
    ptoken: any
    ptoken_next: any
    plast: any
    totalElements: any
    totalPages: any
    loadingAny: boolean
    pages: any 
    detailsOpenedItems: any
    websiteUrl: any
    APIPath: any
    dataProvider: any
    oldSort: any 
    oldFilters: any 
    queryParams: any 
    api_url: any 
    url: any 
    loadingCmd: any
    _observerGrid: any
    _pagesUpdating: any
    _fields: any
    _netbaseCombo: any
    _netbase: NetBase
    _netbaseCmd: any
    order: any
    orderSaved: string
    _columnsMightBeChanged: any
    _setSaving: any
    _setLoading: any
    _setFailure: any
    dialogcancel_reason: any
    api_summary_keys_hide: any
    api_summary_keys_toast: any
    api_summary_keys_popup: any
    api_action: any
    visible: any
    api_loadMore: any
    orderUpdating: any
    _toast: any
    anchorTabsColors: any

    //#endregion


    //#region Chart.js Helpers

    _discountTierChart: any
    _buildPriceModelChart(uiChartSelector, orderTiers, orderTiersP, orderUseFlatFactoryPrice, curfactory, curmarket)
    {
        var chartColors = {
            TierBronze: 'rgb(205,127,50)',
            TierSilver: 'rgb(190,190,190)',
            TierGold: 'rgb(233,199,61)',
            TierPlatinum: 'rgb(80,80,80)',
            TierFactoryCost: 'rgb(170,0,0)',
        }
        const PRICEMAX_DEFAULT = 1100
        const datasetsOptions = {
            fill: false,
            cubicInterpolationMode: 'monotone',
        }
        var min = Number.MAX_SAFE_INTEGER, max = 0
        var fmin = Number.MAX_SAFE_INTEGER, fmax = 0
        var lineChartData: any = {}
        var supposeMultiMProductCount = 0
        var flatFactoryPrice: number | null = null
        var factorySumCurveValues = [] as any
        const accamulateMinMax = (pp, tieriType) => 
        {
            if (tieriType == TierFactoryCost)
            {
                if (fmin > pp) { fmin = pp}
                if (fmax < pp) { fmax = pp}
            }
            else
            {
                if (min > pp) { min = pp}
                if (max < pp) { max = pp}
            }
        }
        lineChartData.labels = orderTiers[0].Values.map((currentValue, index, array) => { return `>= ${currentValue.Quantity}` })
        lineChartData.datasets = orderTiers.map((tieri, index, array) => 
        {
            var tieriType = this._tierType(tieri.ID)
            if (tieriType == TierFactoryCost && tieri.ProductManufacturerID) 
            { 
                supposeMultiMProductCount++
            }

            var r = Object.assign({
                label: this._tierTitle(tieriType, tieri.ProductManufacturerID),
                borderColor: chartColors[tieriType],
                backgroundColor: chartColors[tieriType], //Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),
                data: tieri.Values.map((vali, inx, arr) =>
                {
                    var pp = parseInt(vali.Price)
                    accamulateMinMax(pp, tieriType)

                    if (tieriType == TierFactoryCost && tieri.ProductManufacturerID) 
                    {
                        var pcount = 1
                        const pmanf = Array.isArray(this.order?.ProductManufacturers) 
                            ? this.order.ProductManufacturers.find(i => i.ProductManufacturerID == tieri.ProductManufacturerID) 
                            : null
                        try { pcount = parseInt(pmanf.Quantity) } catch { }
                        var sumi = factorySumCurveValues[inx] || 0
                        sumi += pp * pcount
                        factorySumCurveValues[inx] = sumi
                        accamulateMinMax(sumi, tieriType)
                        if (vali.Quantity == '1') { flatFactoryPrice = pp }
                        if (flatFactoryPrice != null && orderUseFlatFactoryPrice) { pp = flatFactoryPrice }
                    }
                    return pp
                }),
                yAxisID: (tieriType == TierFactoryCost ? 'y2' : 'y1'),
            }, datasetsOptions)

            return r
        })

        if (supposeMultiMProductCount > 1)
        {
            lineChartData.datasets.push(Object.assign({ 
                label: this._tierTitle(TierFactoryCost),
                borderColor: chartColors[TierFactoryCost],
                backgroundColor: chartColors[TierFactoryCost],
                data: factorySumCurveValues,
                yAxisID: 'y2',
            }, datasetsOptions))
        }

        //calc min/max for consumer + gap
        if (min == Number.MAX_SAFE_INTEGER && max == 0) { min = PRICEMAX_DEFAULT }
        min = Math.floor(min * 0.9 / 100) * 100
        max = Math.ceil(max * 1.1 / 100) * 100

        //calc min/max for factory + gap
        if (fmin == Number.MAX_SAFE_INTEGER && fmax == 0) { fmin = PRICEMAX_DEFAULT }
        fmin = Math.floor(fmin * 0.9 / 100) * 100
        fmax = Math.ceil(fmax * 1.1 / 100) * 100

        //normalize min/max for consumer/factory
        fmin = Math.min(min, fmin)
        fmax = Math.max(max, fmax)

        //the same consumer & factory
        min = fmin
        max = fmax

        
        var tierChartEl = this.shadowRoot?.querySelector(uiChartSelector)

        if (this._discountTierChart)
        {
            //update
            this._discountTierChart.data = lineChartData
            this._discountTierChart.options.scales.y1.min = min
            this._discountTierChart.options.scales.y1.max = max
            this._discountTierChart.options.scales.y1.title.text = this.localize('admin-tiers-axis-consumer', 'currency', Currency.unitSymbol(curmarket, this.language))
            this._discountTierChart.options.scales.y2.min = fmin
            this._discountTierChart.options.scales.y2.max = fmax
            this._discountTierChart.options.scales.y2.title.text = this.localize('admin-tiers-axis-factory', 'currency', Currency.unitSymbol(curfactory, this.language))
            this._discountTierChart.options.animation = false
            this._discountTierChart.update()
        }
        else if (tierChartEl as HTMLCanvasElement)
        {
            //create
            // Chart.defaults.global.elements.line.fill = false
            var ctx = (tierChartEl as HTMLCanvasElement).getContext('2d')

            const formatTickY1 = (value, index, values) => 
            {
                return Currency.isZeroDecimal(curmarket) 
                    ? `${Currency.format(value, curmarket, this.language)}` 
                    : Currency.formatSubunit(value, curmarket, this.language)
            }
            const formatTickY2 = (value, index, values) => 
            {
                return Currency.isZeroDecimal(curfactory) 
                    ? `${Currency.format(value, curfactory, this.language)}` 
                    : Currency.formatSubunit(value, curfactory, this.language)
            }
            const tooltip_footer = (tooltipItems) => 
            {
                return ''
                // let sum = 0
                // tooltipItems.forEach(function(tooltipItem) {
                //     console.log(tooltipItem)
                //     sum += tooltipItem.parsed.y
                // })
                // return 'Sum: ' + sum
            }

            const chartConf = {
                type: 'line',
                data: lineChartData,
                options: {
                    responsive: true,
                    stacked: false,
                    hover: {
                        mode: 'index',
                        intersec: false
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                              footer: tooltip_footer,
                            }
                        },
                        legend: {
                            display: true,
                        },
                    },

                    scales: {
                        y1: {
                            display: !(lineChartData.datasets?.length == 1 && lineChartData.datasets[0].yAxisID == 'y2'),
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            position: 'left',
                            title: {
                                display: true,
                                text: this.localize('admin-tiers-axis-consumer', 'currency', Currency.unitSymbol(curmarket, this.language)),
                            },

                            // beginAtZero: true,
                            min: min,
                            max: max,
                            ticks: {
                                callback: formatTickY1
                            }
                        }, 
                        y2: {
                            display: true,
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            position: 'right',
                            title: {
                                display: true,
                                text: this.localize('admin-tiers-axis-factory', 'currency', Currency.unitSymbol(curfactory, this.language)),
                            },

                            // beginAtZero: true,
                            min: fmin,
                            max: fmax,
                            ticks: {
                                callback: formatTickY2
                            },
                            grid: {
                                drawOnChartArea: false, // only want the grid lines for one axis to show up
                            },
                        },
                    }
                }
            }

            this._discountTierChart = new Chart(ctx, chartConf)
        }
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
        const pmanf = Array.isArray(this.order?.ProductManufacturers) 
            ? this.order.ProductManufacturers.find(i => i.ProductManufacturerID == tieri_ProductManufacturerID) 
            : null
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

    _subunitCurrencyWithTitle(template, cur, factoryCur = null, tieri_ID = '')
    {
        if (tieri_ID && factoryCur && this._tierType(tieri_ID) == TierFactoryCost)
        {
            cur = factoryCur
        }
        var formatTemplateSubunit = Currency.subunitFormatTemplate(cur, this.language).replace('{value}', '')
        var res = template.replace('{subunit}', formatTemplateSubunit)
        res = res.replace('{curid}', cur)
        return res
    }

    _compute_arrayIndex(curid, list, listP, field_id = 'id', defaultIndex = '')
    {
        if (!Array.isArray(list)) { return '' }
        var varindex = defaultIndex
        for (var i in list)
        {
            if (list[i] && list[i][field_id] == curid)
            {
                varindex = i
                break
            }
        }
        return varindex
    }

    _compute_arrayObjectField(curid, list, listP, field_id = 'id', field_return = 'title')
    {
        // console.log(curid, list, field_id, '=>', field_return)
        if (!Array.isArray(list)) { return '' }
        var r = list.filter(i => { return  i && i[field_id] == curid })
        if (r?.length) { return r[0][field_return] }
        return ''
    }

    _compute_arrayObjectTitle(curid, list, field = 'id')
    {
        if (!Array.isArray(list)) { return '' }
        var r = list.filter(i => i?.id == curid)
        if (r?.length) { return r[0].title }
        return ''
    }

    _compute_arrayObjectID(curid, list, listP = null)
    {
        if (!Array.isArray(list)) { return '' }
        var r = list.filter(i => i?.id == curid)
        if (r?.length) { return r[0].Currency?.id }
        return ''
    }    

    //#endregion


    //#region HELPERS

    _attachFonts(innerHTML, id = "")
    {
        this._attachHeadStyle(innerHTML, id)
    }
    
    _attachHeadStyle(innerHTML, id = "")
    {
        var css, cssnew = false
        try
        {
            if (id) { css = document.querySelector(`style#${id}`) }
        }
        catch
        {
            //
        }
        if (!css) 
        {
            cssnew = true
            css = document.createElement("style") 
        }
        css.id = id
        css.innerHTML = innerHTML

        if (cssnew) { document.head.appendChild(css) }
    }

    _svgFlagUrl(countryCode2) 
    {
        return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode2}.svg`
    }

    hidden_tasksFlag(order_Tasks)
    {
        if (!Array.isArray(order_Tasks)) { return true }

        for (var taski of order_Tasks)
        {
            //!taski?.FinishedSuccessfully
            if (!taski?.FinishedTimestamp)
            {
                return false
            }
        }

        return true //all OK
    }

    openBundlingTap(e)
    {
        if (this.queryParams.backurl)
        {
            // window.location.href = this.queryParams.backurl
            let url = this.queryParams.backurl
            window.history.replaceState({}, '', url)
            this._reloadWindowLocation()
        }
        else
        {
            var path = ['/admin/workstation-bundling'].join('/')
            // var url = new URL(window.location.href)
            // url.searchParams.delete('backurl')
            var qpar = Object.assign({}, this.queryParams, { backurl: window.location.href })
            if (qpar['client_secret3'])
            {
                qpar['client_secret'] = qpar['client_secret3']
                delete qpar['client_secret3']
            }
            var urlgo = StringUtil.urlquery(path, qpar)
            window.history.replaceState({}, '', urlgo)
            this._reloadWindowLocation()
        }
        
    }

    openStackingTap(e)
    {
        if (this.queryParams.backurl)
        {
            // window.location.href = this.queryParams.backurl
            let url = this.queryParams.backurl
            window.history.replaceState({}, '', url)
            this._reloadWindowLocation()
        }
        else
        {
            var path = ['/admin/workstation-stacking'].join('/')
            // var url = new URL(window.location.href)
            // url.searchParams.delete('backurl')
            var qpar = Object.assign({}, this.queryParams, { backurl: window.location.href })
            if (qpar['client_secret3'])
            {
                qpar['client_secret'] = qpar['client_secret3']
                delete qpar['client_secret2']
                delete qpar['client_secret3']
            }
            var urlgo = StringUtil.urlquery(path, qpar)
            window.history.replaceState({}, '', urlgo)
            this._reloadWindowLocation()
        }
    }

    openReplacementsTap(e)
    {
        var path = ['/admin/workstation-replacements'].join('/')
        var qpar = Object.assign({}, this.queryParams, { backurl: window.location.href })
        if (qpar['client_secret2'])
        {
            qpar['client_secret'] = qpar['client_secret2']
            delete qpar['client_secret2']
            delete qpar['client_secret3']
        }
        var url = StringUtil.urlquery(path, qpar)
        // window.location.href = url
        window.history.replaceState({}, '', url)
        this._reloadWindowLocation()
    }

    backReplacementsTap(e)
    {
        if (this.queryParams.backurl)
        {
            // window.location.href = this.queryParams.backurl
            // var url = new URL(this.queryParams.backurl)
            // if (this.queryParams.backurl2)
            // {
            //     url.searchParams.set('backurl', this.queryParams.backurl2)
            // }
            window.history.replaceState({}, '', this.queryParams.backurl)
            this._reloadWindowLocation()
        }
    }

    _saveOrderForUnsavedComparison(order)
    {
        if (!order) { return }

        this.orderSaved = this._saveOrderSerialize(order)
    }

    _saveOrderSerialize(order, orderSaved?)
    {
        if (orderSaved && this._dev)
        {
            // var diff = StringUtil.compareAsJSON(order, JSON.parse(orderSaved))
            // console.log(diff?.old, diff?.new)
        }

        return JSON.stringify(order)
    }

    _compute_pageObjectTitle(order, orderP)
    {
        return order?.Name ? order.Name : ''
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        var hasChanges = false

        // if (this._dev) console.log(orderP)
        if (order && orderSaved)
        {
            var jsonOrder = this._saveOrderSerialize(order, orderSaved)
            if (jsonOrder != orderSaved)
            {
                hasChanges = true
            }
        }
        // if (this._dev) console.log(order, orderP, 'orderSaved', !(!orderSaved))

        return hasChanges
    }

    _newItemIDPrepare(newitem)
    {
        if ((!newitem && newitem != null) || !newitem.trim || newitem.trim() == '') { return }
        var mprodnewTrim = newitem.trim()
        if (mprodnewTrim.indexOf("d~") == 0)
        {
            mprodnewTrim = "d~" + StringUtil.replaceAll(mprodnewTrim, "d~", "").toUpperCase()
        }
        else
        {
            mprodnewTrim = mprodnewTrim.toUpperCase()
        }
        return mprodnewTrim
    }

    _openDlg(dlg: PaperDialogElement, posElement?, fitElement?)
    {
        FragmentBase.__openDlg(this, dlg, posElement, fitElement)
    }

    _openDialog(dlgelement: UIAdminDialog)
    {
        if (!dlgelement) { return }
        var appDrawerLayout = FragmentBase.__appDrawerLayout(self)
        var cont = appDrawerLayout?.shadowRoot?.querySelector('#contentContainer')

        dlgelement.scrollTarget = cont
        dlgelement.open()
    }

    static __appDrawerLayout(self)
    {
        var appDrawerLayout: any = self.parentElement?.parentElement?.parentElement
        if (appDrawerLayout == null || appDrawerLayout.tagName !== 'APP-DRAWER-LAYOUT') 
        {
            var tmadmin = document.body.querySelector('teamatical-admin#tmadmin')
            appDrawerLayout = tmadmin?.shadowRoot?.querySelector('app-header-layout')
        }

        return appDrawerLayout
    }

    static __closeDlg(self:HTMLElement, dlg: PaperDialogElement)
    {
        dlg.close()
    }

    static __openDlg(self: HTMLElement, dlg: PaperDialogElement, posElement?, fitElement?)
    {
        //fragment.iron-pages.app-header-layout.app-drawer-layout.shadowRoot
        var appDrawerLayout = FragmentBase.__appDrawerLayout(self)
        var cont = appDrawerLayout?.shadowRoot?.querySelector('#contentContainer')
        if (!cont) { console.warn('did find a page container ...') }
        if (!dlg) { console.warn('did find a dialog ...'); return }
        
        if (posElement) 
        {
            dlg.positionTarget = posElement 
        }
        else
        {
            dlg.positionTarget = cont
        }

        if (fitElement)
        {
            dlg.fitInto = fitElement
        }
        else
        {
            dlg.fitInto = cont
        }
        
        dlg.style.zIndex = '1000'
        dlg.open()
    }

    // _formatSizes(sizes)
    // {
    //     if (!Array.isArray(sizes)) { return '' }

    //     // return sizes.map((i, index, array) => { return 'ID# ' + i.ProductManufacturerID + ' [' + i.ProductType + '] - Size: ' + i.Size.Name }).join(",\n")
    //     return sizes.map((i, index, array) => { return i.Size.Name }).join("/\n")
    // }

    _formatSize(size)
    {
        return size?.Name
    }

    _formatPageN(n, obj)
    {
        return this.pageSize * this.page + n + 1
    }

    _formatFeeDistributionMode(feeDistributionMode)
    {
        return this.localizepv('admin-organization-fee-mode-', feeDistributionMode)
    }

    _disabled(loadingAny, isOption)
    {
        return loadingAny || !isOption
    }

    _size(size)
    {
        return size.Name
    }

    _sizes(sizes, cur?)
    {
        if (!Array.isArray(sizes)) { return 'NA' }

        return sizes.map((i) => { return i.Name + (i.Surcharge ? "+" + this._formatPrice(i.Surcharge, cur) : "") })
    }

    _qty(items)
    {
        var c = 0
        items.forEach(i => { c = c + i.quantity })
        return c
    }

    _priceObjectV(priceObj)
    {
        if (!priceObj) { return priceObj }
        return this._priceV(priceObj.Value, priceObj.Currency)
    }
    
    _priceV(price, cur)
    {
        return this._formatPrice(price, cur)
    }
    
    _price(item)
    {
        return this._formatPrice(item.Price, item.Currency)
    }

    _viewTestOrders(isAdmin, isPrinter)
    {
        return (isAdmin || isPrinter)
    }

    _totals(item)
    {
        var l = item.Totals.filter(i => { return i.id == 'cf.totals.total' })
        return this._formatPrice(l[0].amount, item.Currency)
    }

    _urlDownloadManOrderFile(orderid, itemsetid)
    {
        return '/admin/manufacturer-order-file?id=' + encodeURI(itemsetid) + '&oid=' + encodeURI(orderid)
    }

    _urlDownloadOrderFile(order)
    {
        return '/admin/order-file?id=' + encodeURI(order.id)
    }

    _urlViewDealProfile(dealid)
    {
        if (!dealid) { return '' }
        return '/admin/deal-profile?dealid=' + encodeURI(dealid)
    }

    _urlViewOrder(orderid)
    {
        if (!orderid) { return '' }
        return '/admin/order?orderid=' + encodeURI(orderid)
    }

    _urlViewOrderProduction(porderid)
    {
        if (!porderid) { return '' }
        return '/admin/production-order?porderid=' + encodeURI(porderid)
    }

    _urlViewGroupShipping(ordershipid)
    {
        if (!ordershipid) { return '' }
        return '/admin/group-shipping?ordershipid=' + encodeURI(ordershipid)
    }

    _urlDownloadOrderProduction(orderid)
    {
        return '/admin/production-order-file?id=' + encodeURI(orderid)
    }

    _urlDownloadOrderProductionItem(id)
    {
        return '/admin/production-order-item-file?id=' + encodeURI(id)
    }

    _urlViewManOrderItemSet(orderid, itemsetid, itemid?)
    {
        var path = ['/admin/manufacturer-order-batch'].join('/')
        var qobj = {
            tabid: 'Summary',
            id: itemsetid,
            oid: orderid,
        }
        if (itemid) 
        { 
            qobj['iid'] = itemid 
            qobj['tabid'] = 'BulkProduction'
        }
        return StringUtil.urlquery(path, qobj)
    }

    _urlViewStore(storeid)
    {
        var path = ['admin', 'custom-store'].join('/')
        var qobj = { custstoreid: storeid, }
        return StringUtil.urlquery(path, qobj)
    }

    _urlConsumerViewStore(storeid, baseUrl)
    {
        var href = [baseUrl, 'store', storeid].join('/')
        return href
    }

    _urlViewCustomDesignRequest(custdesignreqid, baseUrl)
    {
        var path = [baseUrl, 'admin', 'custom-design-request'].join('/')
        var qobj = {
            custdesignreqid: custdesignreqid,
        }
        return StringUtil.urlquery(path, qobj)
    }

    _urlViewPConfiguration(pconfigid, clonepconfigid?)
    {
        var path = ['admin', 'product-config'].join('/')
        var qobj = { pconfigid: pconfigid }
        if (clonepconfigid) { qobj['clonepconfigid'] = clonepconfigid }
        return StringUtil.urlquery(path, qobj)
    }
    
    _urlConsumerViewPConfiguration(pconfigid, baseUrl)
    {
        var path = [baseUrl, 'detail', 'configurations', pconfigid].join('/')
        var qobj = {}
        return StringUtil.urlquery(path, qobj)
    }
    
    _urlViewPurchaseOrder(pcoid)
    {
        if (!pcoid) { return '' }
        return '/admin/purchase-order?pcoid=' + encodeURI(pcoid)
    }

    _urlViewManufacturer(manid)
    {
        if (!manid) { return '' }
        return '/admin/manufacturer?manid=' + encodeURI(manid)
    }

    _urlViewProductFont(pfontid, clonefontid?)
    {
        if (!pfontid) { return '' }
        return '/admin/product-font?pfontid=' + encodeURI(pfontid) 
            + (clonefontid ? '&clonefontid=' + encodeURI(clonefontid) : '')
    }

    _urlViewProductView(pviewid, productid?, cloneviewid?)
    {
        if (!pviewid) { return '' }
        return '/admin/product-view?pviewid=' + encodeURI(pviewid) 
            + (productid ? '&productid=' + encodeURI(productid) : '')
            + (cloneviewid ? '&cloneviewid=' + encodeURI(cloneviewid) : '')
    }

    _urlViewBrand(brandid, clonebrandid?)
    {
        if (!brandid) { return '' }
        var qpars = { brandid: brandid, }
        if (clonebrandid) { qpars[clonebrandid] = clonebrandid }
        return StringUtil.urlquery('/admin/brand', qpars)
    }

    _urlViewProductLabel(labelid, clonelabelid?)
    {
        if (!labelid) { return '' }
        return '/admin/product-label?labelid=' + encodeURI(labelid)
        + (clonelabelid ? '&clonelabelid=' + encodeURI(clonelabelid) : '')
    }

    _urlViewNestingRequest(nestingid)
    {
        if (!nestingid) { return '' }
        return '/admin/nesting-request?nestingid=' + encodeURI(nestingid)
    }

    _urlViewShippingHub(hubid)
    {
        if (!hubid) { return '' }
        return '/admin/shipping-hub?hubid=' + encodeURI(hubid)
    }

    _urlViewCurrencyRegion(curregid)
    {
        if (!curregid) { return '' }
        return '/admin/currency-region?curregid=' + encodeURI(curregid)
    }

    _urlViewShippingContainer(shipcontid)
    {
        if (!shipcontid) { return '' }
        return '/admin/shipping-container?shipcontid=' + encodeURI(shipcontid)
    }

    _urlViewWorkstationHub(id)
    {
        if (!id) { return '' }
        return '/admin/workstation-hub/' + encodeURI(id)
    }

    _urlViewShippingFreight(shipfrghtid)
    {
        if (!shipfrghtid) { return '' }
        return '/admin/shipping-freight?shipfrghtid=' + encodeURI(shipfrghtid)
    }
    

    _urlViewProductAccessory(accessoryid, cloneaccessoryid?)
    {
        if (!accessoryid) { return '' }
        return '/admin/product-accessory?accessoryid=' + encodeURI(accessoryid)
        + (cloneaccessoryid ? '&cloneaccessoryid=' + encodeURI(cloneaccessoryid) : '')
    }

    _urlViewProductThread(threadid)
    {
        if (!threadid) { return '' }
        return '/admin/product-thread?threadid=' + encodeURI(threadid)
    }

    _urlViewOrganization(orgid)
    {
        if (!orgid) { return '' }
        return '/admin/organization?orgid=' + encodeURI(orgid)
    }

    _urlUploadProduct()
    {
        return '/admin/upload-product'
    }

    _urlViewProduct(productid)
    {
        if (!productid) { return '' }
        return '/admin/product?productid=' + encodeURI(productid)
    }

    _urlViewProductManufacturer(pmid, productid?)
    {
        if (!pmid) { return '' }
        return '/admin/product-manufacturer?pmid=' + encodeURI(pmid) + (productid ? '&productid=' + encodeURI(productid) : '')
    }

    _urlViewSizeCategory(pscid)
    {
        if (!pscid) { return '' }
        return '/admin/product-sizecategory?pscid=' + encodeURI(pscid)
    }

    _urlViewColor(pcolorid, clonepcolorid?)
    {
        if (!pcolorid) { return '' }
        return '/admin/product-color?pcolorid=' + encodeURI(pcolorid)
            + (clonepcolorid ? '&clonepcolorid=' + encodeURI(clonepcolorid) : '')
    }

    _urlViewLocale(wlocaleid, clonewlocaleid?)
    {
        if (!wlocaleid) { return '' }
        return '/admin/website-locale?wlocaleid=' + encodeURI(wlocaleid)
            + (clonewlocaleid ? '&clonewlocaleid=' + encodeURI(clonewlocaleid) : '')
    }

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        if (!websiteUrl || !APIPath || !api_action) { return '' }
        return websiteUrl + APIPath + api_action
    }

    _computeLoadingAny(loading, loadingCmd, loadingWS = false)
    {
        return loading == true || loadingCmd == true || loadingWS == true
    }

    _multiSelect(selectedItems)
    {
        if (!Array.isArray(selectedItems) || selectedItems.length < 1) { return '' }
        return selectedItems.toString()
    }

    queryColorHandler(col, queryParams) { this.set('order.Color', col) }
    _colorqueryDebouncer: Debouncer
    _queryColor(queryParams_Color, queryParams)
    {
        try
        {
            var col = JSON.parse(queryParams_Color)
            if (col.i && col.n)
            {
                this._colorqueryDebouncer = Debouncer.debounce(this._colorqueryDebouncer, timeOut.after(250), () =>
                {
                    if (typeof(this.queryColorHandler) == 'function') 
                    {
                        this.queryColorHandler(col, queryParams)
                    }

                    //remove - Color
                    var backurl = window.location.href
                    if (URL)
                    {
                        let url = new URL(backurl)
                        url.searchParams.delete('Color')
                        backurl = url.pathname + url.search
                    }
                    window.history.replaceState({}, '', backurl)
                })
            }
        }
        catch
        {
            //
        }
    }
     
    //#endregion


    //#region Anchors Helpers

    gotoAnchor(e, b, stepover = 10)
    {
        var anchorStr = e.target.getAttribute('anchor')
        var anchors = this.root ? this.root.querySelectorAll(anchorStr) : []
        var anchor: HTMLElement | null = null
        for (var i in Object.keys(anchors))
        {
            if (this.isAnchorVisible(anchors[i]))
            {
                anchor = anchors[i]
                break
            }
        }
        if (anchor)
        {
            //scroll to...
            var rect = anchor.getBoundingClientRect()
            var parent2: any = this.parentElement?.parentElement
            if (parent2?.$)
            {
                var t = parent2.$.contentContainer
                this.scrollIt(rect.top - stepover, 300, 'easeInOutQuad', null, null, t)
            }
        }
    }

    isAnchorVisible(anchor)
    {
        return true
    }

    anchorSelector(tabi)
    {
        return `#${tabi}`
    }

    anchorTabStyle(anchorID)
    {
        if (typeof(anchorID) != 'string' || !Array.isArray(this.anchorTabsColors)) { return '' }

        const max = this.anchorTabsColors.length - 1
        
        var hash = 0, i, chr
        for (i = 0; i < anchorID.length; i++)
        {
            chr = anchorID.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32bit integer
        }
        
        var inx = Math.abs(hash) % max // RandomInteger(0, max)
        // console.log(inx, hash, max, poID)
        var color = this.anchorTabsColors[inx]
        return `background-color: var(${color});`
    }

    //#endregion


    //#region /////////////////////////////////////////--GRID DATA--///////////////////////////////////////////////

    _onActiveItemChanged(e)
    {
        var grid: any = this.$.grid
        if (grid)
        {
            grid.detailsOpenedItems = [e.detail.value]
            this.async(() => { grid.notifyResize() }, 17)
        }
    }

    _buildCombos()
    {
        if (this._fields) { return }

        var url = this.websiteUrl + this.APIPath + 'get-fields'
        url = StringUtil.urlquery(url, {})
        var rq = {
            url: url,
            body: null,
            method: "GET",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: (e) =>
            {
                var response = e.response

                if (response['success'] === true && response['result'])
                {
                    let combosJson = this._fields = response['result']

                    for (var i in combosJson)
                    {
                        let itemsi = combosJson[i]
                        const comboi: any = this.$.grid.querySelector('vaadin-combo-box#' + i + 'Combo')
                        const multicomboi: any = this.$.grid.querySelector('multiselect-combo-box#' + i + 'Combo')
                        if (!comboi && !multicomboi) { continue }
                        //console.log(i, itemsi)
                        if (comboi) { comboi.items = itemsi }
                        if (multicomboi) { multicomboi.items = itemsi }
                        
                        // comboi.value = comboi.items[0] //preselect
                    }
                }
                else
                {
                    //
                }
            },
            onError: (e) =>
            {

            },
        }
        if (!this._netbaseCombo) { this._netbaseCombo = new NetBase() }
        this._netbaseCombo._getResource(rq, 1, true)
    }

    _itemsChanged(pages, page)
    {
        if (this._pagesUpdating) { return }
        if (pages === undefined || page === undefined) { return }

        var grid: any = this.$.grid
        if (grid && this.visible) 
        {
            grid.changePageTo(page)
        }
    }

    _refreshTap(e)
    {
        this._refresh(1)
    }

    _refreshGridData(visible, queryParams)
    {
        if (visible !== true || queryParams == undefined) { return }

        this._refresh(1, 'refresh-grid')
    }

    _refreshGridDataDebouncer: Debouncer
    _refresh(details?, type?)
    {
        // this.$.grid.getDataProvider().refreshAll()
        var grid: any = this.$.grid
        if (details && grid && grid.detailsOpenedItems) 
        {
            this.detailsOpenedItems = grid.detailsOpenedItems 
        }

        if (grid)
        {
            this._refreshGridDataDebouncer = Debouncer.debounce(this._refreshGridDataDebouncer, timeOut.after(200), () =>
            {
                this._firstBuildDataProvider++
                // console.log('_refresh', type, this._firstBuildDataProvider)
                if (this._firstBuildDataProvider > 2)
                {
                    grid.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }))
                }
            })

            if (!details) 
            {
                this.detailsOpenedItems = null
                grid.detailsOpenedItems = []
            }
        }

        if (type == 'refresh-grid')
        {
            this._scrollGrid2Top()
        }
    }

    _scrollGrid2Top()
    {
        // var parent2: any = this.parentElement.parentElement
        // var t = parent2.$.contentContainer
        // t.scrollTop = 0

        var gridUI = this.$.grid ? this.$.grid['$'] : null
        if (gridUI) { gridUI.table.scrollTo(0, 0) }
    }

    _firstBuildDataProvider = 0
    _firstBuildFilter = true
    _filterObjBefore: any
    _buildDataProviderFilters(filterObj)
    {
        return JSON.stringify(Object.keys(filterObj).map((i) => { return { path: i, value: filterObj[i] } }))
    }

    _buildDataProvider(hasInitialFilter:boolean | object = false)
    {
        if (hasInitialFilter)
        {
            var grid = this.$.grid as any
            grid._hasData = true //prevent auto reload
        }

        this.dataProvider = (params, callback) =>
        {
            this._firstBuildDataProvider++
            // console.log('_buildDataProvider', this._firstBuildDataProvider, params, hasInitialFilter)

            var qpar = {
                'pn': this.page,
                'ps': params.pageSize,
                'pt': this.ptoken,
                'tz': new Date().getTimezoneOffset(),
            }


            ///--------------SORT

            if (params.sortOrders && params.sortOrders.length > 0) 
            {
                var sort = ''
                for (var i in params.sortOrders)
                {
                    var sorti = params.sortOrders[i]
                    if (sorti?.path && sorti?.direction)
                    {
                        if (sort != '') { sort += ';' }
                        sort += sorti['path'] + "," + sorti['direction']
                    }
                }
                qpar['sort'] = sort

                if (this.oldSort !== undefined && this.oldSort !== qpar['sort'])
                {
                    qpar['pn'] = 0
                    qpar['pt'] = ptoken_empty
                    this.ptoken = ptoken_empty
                }
                this.oldSort = qpar['sort']
            }
            else if (this.queryParams['sort'])
            {
                qpar['sort'] = this.queryParams['sort']
                this.oldSort = qpar['sort']
            }

            ///--------------FILTER

            var filterObj = {}
            if (this.queryParams && Object.keys(this.queryParams).length > 0)
            {
                var qpf = Object.assign({}, this.queryParams)
                delete qpf['sort']
                filterObj = Object.assign(filterObj, qpf)
            }

            if (params.filters && params.filters.length > 0)
            {
                var fltrs = params.filters.filter(i => { return i.path !== undefined })
                for (var flti of fltrs)
                {
                    filterObj[flti.path] = flti.value
                }
            }
            if (this._firstBuildDataProvider >= 2 
                && this.oldFilters != undefined
                && JSON.stringify(this._filterObjBefore) != JSON.stringify(filterObj))
            {
                this._firstBuildFilter = false
            }
            this._filterObjBefore = filterObj

            if (typeof(hasInitialFilter) == 'object')
            {
                qpar['filters'] = this._buildDataProviderFilters(Object.assign({}, hasInitialFilter, filterObj)) 
            }
            else
            {
                qpar['filters'] = this._buildDataProviderFilters(filterObj)
            }
            if (this.oldFilters !== undefined && this.oldFilters !== qpar['filters'])
            {
                qpar['pn'] = 0
                qpar['pt'] = ptoken_empty
                this.ptoken = ptoken_empty
            }
            this.oldFilters = qpar['filters']


            // if (this.queryParams) { qpar = Object.assign(qpar, this.queryParams) }
            // console.log(this.queryParams, qpar)
            

            const gridGetCallback = (result) =>
            {
                if (!result) 
                {
                    callback([], 0)
                    return //EXIT!!!
                }

                //TODO: move to appropriate pages
                if (this.queryParams['as-manuf'] == '1' && result.content?.length == 1)
                {
                    this._goto(this._urlViewManufacturer(result.content[0].ManufacturerID))
                }

                this.pfirst = result.pfirst
                this.plast = result.plast
                this.pageSize = result.psize
                this.totalElements = result.pfirst ? result.totalElements : this.totalElements
                this.totalPages = result.totalPages
                this.page = result.pnumber
                this.ptoken = result.ptoken ? result.ptoken : ptoken_empty
                this.ptoken_next = result.ptoken_next ? result.ptoken_next : ptoken_empty
                // console.log(result)


                this.async(() =>
                {
                    if (this.detailsOpenedItems && this.detailsOpenedItems.length > 0)
                    {
                        var grid: any = this.$.grid
                        grid.openItemDetails(this.detailsOpenedItems[0])
                        grid.notifyResize()
                        // this.async(() => { this.$.grid.notifyResize() }, 17)
                    }
                    //this._scrollGrid2Top()
                }, 117)

                callback(result.content, result.content.length)


                //build pages
                if (this.pfirst && (!this.pages || this.pages.length < 1 || this.pages[0].ptoken != this.ptoken || this.pages_reset))
                {
                    this.pages_reset = false
                    
                    this._pagesUpdating = true
                    const minVisiblePages = 5 //20
                    var totalElementsPages = this._asBool(this.totalElements) ? Math.min(minVisiblePages * this.pageSize, this.totalElements) : this.totalElements
                    var pagescount = (!totalElementsPages || !this.pageSize || totalElementsPages < this.pageSize) ? 1 : Math.ceil(totalElementsPages / this.pageSize)
                    this.pages = Array.from({ length: pagescount}, (i, inx) => 
                    { 
                        var ptokeni = null
                        if (inx == this.page) { ptokeni = this.ptoken }
                        if (inx == (this.page + 1)) { ptokeni = this.ptoken_next }
                        return {
                            t: inx + 1,
                            i: inx,
                            ptoken: ptokeni,
                        }
                    })
                    this._pagesUpdating = false
                }
                else if (this.ptoken_next)
                {
                    this._pagesUpdating = true
                    this.set(`pages.${this.page}.ptoken`, this.ptoken)
                    if (this.pages.length > (this.page + 1))
                    {
                        this.set(`pages.${this.page + 1}.ptoken`, this.ptoken_next)
                    }
                    else
                    {
                        var inx = this.page + 1
                        this.push('pages', {
                            t: inx + 1,
                            i: inx,
                            ptoken: this.ptoken_next,
                        })
                        if (this.pageSize * inx > this.totalElements)
                        {
                            this.set('totalElements', this.totalElements + result.content.length)
                        }
                    }
                    this._pagesUpdating = false
                }
                else if (this.plast)
                {
                    this.splice('pages', this.page + 1, this.pages.length - this.page - 1)
                    this.set('totalElements', (this.pages.length - 1) * this.pageSize + result.content.length)
                }
            }

            this.gridGet(gridGetCallback, this._computeAPIUrl(this.websiteUrl, this.APIPath, this.api_action), qpar, 'POST')
        }

        if (this.$.grid)
        {
            var grid: any = this.$.grid
            grid.$.scroller.addEventListener('mousemove', (e) => this._gridMouseMove(e), EventPassiveDefault.optionPrepare())
            grid.addEventListener('mousemove', (e) => this._gridMouseMove(e), EventPassiveDefault.optionPrepare())
            grid.addEventListener('mouseup', (e) => this._gridMouseUp(e), EventPassiveDefault.optionPrepare())
            
            var contextMenu: any = FragmentBase.__appDrawerLayout(this)?.nextElementSibling // ctx.querySelector('#contextMenu') //as ContextMenuElement
            if (contextMenu && this.$.grid && this.$.grid.shadowRoot) 
            { 
                var header = this.$.grid.shadowRoot.querySelector('#header')
                contextMenu.listenOn = header
            }

            this._observerGrid = new FlattenedNodesObserver(grid, (info: any) =>
            {
                // console.log('FlattenedNodesObserver ... ', info)
                this._restoreColumnsSettings(this.queryParams)
            })
        }
    }

    _pagesUpdatingChanged(pagesUpdating)
    {
        // console.log(pagesUpdating)
        if (pagesUpdating) { return }
        this.async(() => { this._buildCombos() })
    }    

    _gridMouseMove(e)
    {
        var grid: any = this.$.grid
        if (grid.hasAttribute('reordering') || grid.$.scroller.hasAttribute('column-resizing'))
        {
            // console.log('_columnsMightBeChanged')
            this._columnsMightBeChanged = true
        }
    }

    _gridMouseUp(e)
    {
        // console.log('_gridMouseUp')
        if (this._columnsMightBeChanged)
        {
            this._columnsMightBeChanged = false
            this._saveColumnSettings()
        }
    }

    _saveColumnSettings()
    {
        var grid: any = this.$.grid
        if (grid)
        {
            var columns:any = grid._getColumns()
            var columnsSettings = {}
            var columnsOrder: any = []
            for (var i in columns)
            {
                columnsOrder.push(columns[i].id)
                columnsSettings[columns[i].id] = {
                    width : columns[i].width,
                    order: columns[i]._order,
                }

            }
            this.columnsSettings = columnsSettings
            // console.log(columnsSettings)
        }
    }

    _resetColumnsSettings(e?)
    {
        this.columnsSettings = {}
        this.async(() => { this._reloadWindowLocation() })
    }

    _restoreColumnsSettings(qpars)
    {
        if (!this.columnsSettings) { return }

        var sort = qpars['sort'] ? qpars['sort'].split(',') : []
        // console.log(qpars)

        var columnsSettings = this.columnsSettings
        var grid: any = this.$.grid
        if (!grid) { return }

        var columns = grid._getColumns()
        for (var i in columns)
        {
            if (!columns[i].id) { continue }

            var clmS = columnsSettings[columns[i].id]
            if (clmS)
            {
                columns[i].width = clmS.width
                columns[i]._order = clmS.order
            }

            var columnHeader = columns[i].__data._headerCell._content

            if (columns[i].id != '#' && qpars[columns[i].id])
            {
                var input = columnHeader.querySelector(`vaadin-combo-box#${columns[i].id}Combo`)
                if (!input) { input = columnHeader.querySelector(`vaadin-grid-filter[path='${columns[i].id}']`) }
                if (input)
                {
                    input._lastCommittedValue = qpars[columns[i].id]
                    input.value = qpars[columns[i].id]
                }
            }

            if (columns[i].id != '#' && sort.length == 2 && columns[i].id == sort[0])
            {
                var sorter = columnHeader.querySelector(`vaadin-grid-sorter[path='${columns[i].id}']`)
                if (sorter) 
                { 
                    sorter.direction = sort[1]
                    // console.log(sorter, sort[0], sort[1])
                }
            }
        }
    }

    gridGet(callback, url, data: object | null = null, method = 'GET')
    {
        this.url = url
        if (method == 'GET') { this.url = StringUtil.urlquery(url, data) }

        var rq = {
            url: this.url,
            body: data,
            method: method,
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this, callback),
            onError: this._onRequestError.bind(this, callback)
        }
        if (!this._netbase) { this._netbase = new NetBase() }
        this._netbase._getResource(rq, 1, true)
    }

    _onRequestResponse(callback, e)
    {
        var response = e.response
        if (!response) { return }

        if (response['success'] === true)
        {
            if (callback && response['result']) { callback(response['result']) }
        }
        else
        {
            callback(null) //to stop loading ...
        }


        if (response && response['summary'])
        {
            var summary = response['summary']
            var barr = [
                {
                    title: this.localize('admin-app-ok'),
                    ontap: (te) => 
                    {
                        this._reloadWindowLocation()
                    }
                }
            ]
            var r = response
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: '',
                    message: summary.Message,
                    buttons: barr,
                    errorid: r?.errorid ? r.errorid : null,
                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }
    }

    _onRequestError(callback, e)
    {
        this._onErrorDialog(e)

        if (callback) { callback() }
    }

    _select(pinx, ptoken) 
    {
        if (this.loadingAny) { return }

        this.ptoken = ptoken
        this.page = pinx
        this._scrollGrid2Top()
    }

    _prev(e?)
    {
        var np = this.page - 1
        if (this.pages[np])
        {
            this._select(this.pages[np].i, this.pages[np].ptoken)
        }
    }

    _next(e?) 
    {
        var np = this.page + 1
        if (this.pages[np])
        {
            this._select(this.pages[np].i, this.pages[np].ptoken)
        }
    }

    _startover(e?) 
    {
        this.ptoken = ptoken_empty
        this.page = 0
        this.pages_reset = true
        this._scrollGrid2Top()
    }

    //#endregion


    //#region /////////////////////////////////////////--COMMANDs--///////////////////////////////////////////////

    async cmdPostDownload(url, obj)
    {
        if (!this._netbaseCmd) { this._netbaseCmd = new NetBase() }
        this.loadingCmd = true
        var response
        try
        {
            response = await this._netbaseCmd._apiRequest(url, obj, 'POST', 'blobjson')
        }
        catch(ex)
        {
            this._onRequestCmdError(null, ex, null)
        }
        this.loadingCmd = false

        if (response && response?.success === undefined)
        {
            const blob = response
            try
            {
                this._downloadAsClickFile(window.URL.createObjectURL(blob), 
                    blob.filename ? blob.filename : `1.xlsx`, 
                    () => { window.URL.revokeObjectURL(blob) }
                )
            }
            catch
            {
                //
            }
        }
        else if (response?.summary)
        {
            this._handleCmdSummaryKey(response?.summary, response)
        }
    }

    cmdPost(url, obj, callback?, cancelable = true, attempts = 1, airstrike = false)
    {
        this.loadingCmd = true
        var rq = {
            url: url,
            body: obj,
            airstrike: airstrike,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestCmdResponse.bind(this, callback),
            onError: this._onRequestCmdError.bind(this, callback)
        }
        if (!this._netbaseCmd) { this._netbaseCmd = new NetBase() }
        this._netbaseCmd._getResource(rq, attempts, cancelable)
    }

    cmdGet(urlpath, qpars, callback?, cancelable = true, attempts = 1)
    {
        var url = StringUtil.urlquery(urlpath, qpars)
        this.cmd(callback, url, cancelable, attempts)
    }

    cmd(callback, url: string | null = null, cancelable = true, attempts = 1, airstrike = false)
    {
        // this._setLoading(true)
        this.loadingCmd = true
        var rq = {
            url: (url ? url : this.url),
            body: null,
            airstrike: airstrike,
            method: "GET",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestCmdResponse.bind(this, callback),
            onError: this._onRequestCmdError.bind(this, callback)
        }
        if (!this._netbaseCmd) { this._netbaseCmd = new NetBase() }
        this._netbaseCmd._getResource(rq, attempts, cancelable)
    }


    _onRequestCmdResponse(callback, e, rq)
    {
        // console.log(arguments)
        // this._setLoading(false)
        this.loadingCmd = false
        var response = e.response

        if (response && response['success'] === true)
        {
            // if (this._dev)
            // {
            //     var diff = StringUtil.compareAsJSON(response['result'], this.order)
            //     if (diff) { console.log('morder', diff.old, diff.new) }
            // }

            if (callback) { callback(response['result'], response, rq) }
        }
        else
        {
            if (callback) { callback(null, response, rq) }//to stop loading ... 
        }
        
        this._handleCmdSummaryKey(response?.summary, response)
    }

    _onRequestCmdError(callback, e, rq)
    {
        // this._setLoading(false)
        this.loadingCmd = false

        this._onErrorDialog(e)

        if (callback) { callback(null, null, rq) }
    }

    _downloadAsClickFile(href, filename:string | null = null, successHandler: any = null)
    {
        var link = document.createElement('a')
        link.href = href
        if (filename)
        {
            link.download = filename
        }
        const clickHandler = () => 
        {
            setTimeout(() => 
            {
                if (successHandler) { successHandler() }
                this.removeEventListener('click', clickHandler)
            }, 150)
        }
        link.addEventListener('click', clickHandler, false)
        link.click()
    }

    //#endregion


    //#region /////////////////////////////////////////--DESIGN FILES DOWNLOAD--///////////////////////////////////////////////

    getDesignFile(qobj, progress)
    {
        if (progress) { progress.active = true }
        // var orderID = this.queryParams ? this.queryParams['id'] : ''
        // item.isdownloading = true

        var rq = {
            url: StringUtil.urlquery(this.websiteUrl + this.APIPath + 'design-file-prepare', qobj),
            body: null,
            method: "GET",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onDesignFileRequestResponse.bind(this, progress),
            onError: this._onDesignFileRequestError.bind(this, progress)
        }
        if (!this._netbase) { this._netbase = new NetBase() }

        // this.async(()=>{
        this._netbase._getResource(rq, 1, true)
        // }, 4000)
    }

    _onDesignFileRequestResponse(progress, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 2000) }

        var response = e.response
        var result = response['result']
        if (response['success'] === true && result)
        {
            var token = result['token']
            window.location.href = this.websiteUrl + this.APIPath + 'design-file?token=' + encodeURI(token)
        }
        else
        {
            this._onOrderFileRequestError(progress, null, e)
        }
    }

    _onDesignFileRequestError(progress, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 300) }

        var e_message = ''
        if (e instanceof Error) 
        {
            e_message = e.message
        }
        else if (e.response && e.response.summary)
        {
            e_message = e.response.summary.Message
        }

        this._onErrorDialog(e, e_message)
    }

    //#endregion


    //#region  ///////////////////////////////////////--FILESDOWNLOAD--///////////////////////////////////////////////

    getOrderFile(qobj, progress, callbackHandler?)
    {
        if (progress) { progress.active = true }
        // var orderID = this.queryParams ? this.queryParams['id'] : ''
        // item.isdownloading = true

        var rq = {
            url: StringUtil.urlquery(this.websiteUrl + this.APIPath + 'file-prepare', qobj),
            body: null,
            method: "GET",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onOrderFileRequestResponse.bind(this, progress, callbackHandler),
            onError: this._onOrderFileRequestError.bind(this, progress, callbackHandler)
        }
        if (!this._netbase) { this._netbase = new NetBase() }

        // this.async(()=>{
        this._netbase._getResource(rq, 1, true)
        // }, 4000)
    }

    getOrderFiles(qobj, progress)
    {
        if (progress) { progress.active = true }
        // var orderID = this.queryParams ? this.queryParams['id'] : ''
        // item.isdownloading = true

        var rq = {
            url: StringUtil.urlquery(this.websiteUrl + this.APIPath + 'file-prepare-list', {}),
            body: qobj,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onOrderFilesRequestResponse.bind(this, progress),
            onError: this._onOrderFilesRequestError.bind(this, progress)
        }
        if (!this._netbase) { this._netbase = new NetBase() }

        this._netbase._getResource(rq, 1, true)
    }

    _onOrderFileRequestResponse(progress, callbackHandler, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 2000) }

        var response = e.response
        var result = response['result']
        if (response['success'] === true && result)
        {
            var token = result['token']
            var url = result['Url']
            if (token)
            {
                url = this.websiteUrl + this.APIPath + 'file?token=' + encodeURI(token)
            }

            if (url)
            {
                if (callbackHandler)
                {
                    callbackHandler(url)
                }
                else
                {
                    // window.location.href = url
                    this._downloadAsClickFile(url, 'true')
                }
            }
            else
            {
                this._onOrderFileRequestError(progress, callbackHandler, e)
            }
        }
        else
        {
            this._onOrderFileRequestError(progress, callbackHandler, e)
        }
    }

    _onOrderFileRequestError(progress, callbackHandler, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 300) }

        var e_message = ''
        if (e instanceof Error) 
        {
            e_message = e.message
        }
        else if (e.response && e.response.summary)
        {
            e_message = e.response.summary.Message
        }
        
        this._onErrorDialog(e, e_message)
    }

    _onOrderFilesRequestResponse(progress, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 2000) }

        var response = e.response
        var result = response['result']
        if (response['success'] === true && result)
        {
            // BatchID: "D5"
            // Files: Array(2)
            // 0: { PDFFileName: "D5.d~JG015.7B.pdf", Url: "https://wwwdev.teamatical.com/admin/api/workstatio…H3XCzsgIlcTLmEvQJlBni5h8us8A6_BHkQxe7mSMcWrQ9rJP4" }
            // 1: { PDFFileName: "D5.d~JG015.8B.pdf", Url: "https://wwwdev.teamatical.com/admin/api/workstatio…EHAGiokpU4kwiaTq4fQLniA.Ai.Zyy2PY4RXYObju4wga6H5E" }
            // length: 2
            // __proto__: Array(0)
            // ManufactureOrderID: "d~JG015"

            //TODO: downloading 
        }
        else
        {
            this._onOrderFileRequestError(progress, null, e)
        }
    }

    _onOrderFilesRequestError(progress, e)
    {
        if (progress) { this.async(() => { progress.active = false }, 300) }

        var e_message = ''
        if (e instanceof Error) 
        {
            e_message = e.message
        }
        else if (e.response && e.response.summary)
        {
            e_message = e.response.summary.Message
        }

        this._onErrorDialog(e, e_message)
    }

    //#endregion


    //#region /////////////////////////////////////////--SINGLE OBJ--///////////////////////////////////////////////

    _visibleChanged(visible)
    {
        if (!visible) { return }

        //
    }

    _datareloadDebouncer: Debouncer
    _dataReloadChanged(visible, queryParams)
    {
        // console.log('_dataReloadChanged', visible, queryParams)
        if (visible !== true || queryParams == undefined) { return }

        //_dataReloadChanged <=> _fetchItems
        this._setUINotLoadedState()

        //check vars
        if (this.queryParamsRequired)
        {
            for (var i in this.queryParamsRequired) 
            {
                var v = this.queryParamsRequired[i]
                // console.log(v)
                if (queryParams[v] == undefined) { return }
            }
        }

        // console.log('reload - fire')
        this._datareloadDebouncer = Debouncer.debounce(this._datareloadDebouncer, timeOut.after(200), () =>
        {
            // console.log('reload - fire', queryParams)
            this.reload()
        })        
    }

    _reloadTap(e)
    {
        this.reload()
    }

    _requestObject(order)
    {
        return order
    }

    reload(reset?)
    {
        if (reset) { this.order = null }

        this.dialogcancel_reason = ''
        this.api_action = 'get'
        var robj = this.queryParamsAsObject ? this._requestObject(this.order) : null
        // console.log('reload - fire', robj)
        this._fetchItems(3, null, robj)
    }

    loadMoreItems(callback)
    {
        this.api_action = 'get'
        this.api_loadMore = true
        
        if (this.order && Number.isInteger(this.order.pnumber)) { this.order.pnumber += 1 }
        // Try at most 3 times to get the items.
        var obj = this._requestObject(this.order)
        this._fetchItems(3, null, obj, () =>
        {
            if (callback) { callback() }
        })
    }

    _setUINotLoadedState(fetch_callback?, isfetch = false)
    {
        if (!this.shadowRoot) { return }

        var progress = this.shadowRoot.querySelector('#progress')
        var selector = progress ? ( this.$['catItems'] ? '.catalog' : '.order') : 'div'
        var mdiv = this.shadowRoot.querySelector(selector) as HTMLElement 

        if (!this.order && mdiv != null)
        {
            mdiv.style.filter = 'blur(0.2rem) grayscale(100%)'
            if (isfetch)
            {
                var callback_ = fetch_callback
                fetch_callback = (e) =>
                {
                    if (mdiv) { mdiv.style.filter = '' }
                    if (callback_) { callback_(e) }
                }
            }
        }

        return fetch_callback
    }

    _fetchItems(attempts, oid?, qp1?, callback?, abort = true, contextFields = [])
    {
        if (!this.visible && attempts != -1) //-1 means force
        {
            // console.log('fetchItems -> !visible | api: ' + this.api_action + " -> SKIP!")
            return
        }

        //_dataReloadChanged <=> _fetchItems
        callback = this._setUINotLoadedState(callback, true)

        this._setFailure(false)

        var qp = JSON.parse(JSON.stringify(this.queryParams))
        if (oid)
        {
            qp['orderid'] = oid
        }
        if (qp1)
        {
            for (var i in qp1)
            {
                qp[i] = qp1[i]
            }
        }

        var apiurl = this.queryParamsAsObject ? this.api_url : StringUtil.urlquery(this.api_url, qp)
        // console.log(this.api_action, apiurl)

        this._setLoading(true)
        var rq: any = {
            url: apiurl,
            onLoad: this._onLoad.bind(this, callback),
            onError: this._onError.bind(this, callback)
        }

        if (this.queryParamsAsObject)
        {
            var defaultQp = this.queryParamsDefault ? this.queryParamsDefault : { } //{ psize: 25 }

            var obj = {}
            if (qp1)
            {
                obj = Object.assign({}, qp)
            }
            else
            {
                obj = this.order ? Object.assign({}, this.order) : Object.assign(defaultQp, qp)
            }

            rq = {
                url: this.api_url,
                body: obj,
                contextFields: contextFields,
                method: "POST",
                handleAs: "json",
                debounceDuration: 300,
                onLoad: this._onLoad.bind(this, callback),
                onError: this._onError.bind(this, callback)
            }
        }

        if (!this._netbase) { this._netbase = new NetBase() }
        this._netbase._getResource(rq, attempts, true, abort)
    }

    _postData(data, callback?, attempts = 1)
    {
        if (!this.visible)
        {
            return
        }

        this._setFailure(false)
        var apiurl = StringUtil.urlquery(this.api_url, {})

        this._setLoading(true)
        var rq = {
            url: apiurl,
            body: data,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onLoad.bind(this, callback),
            onError: this._onError.bind(this, callback)
        }

        if (!this._netbase) { this._netbase = new NetBase() }
        this._netbase._getResource(rq, attempts, true)
    }

    _onLoad(callback, e)
    {
        var r = e['response']
        if (r)
        {
            if (r['success'] === true)
            {
                var order = r['result']

                if (this.api_loadMore)
                {
                    this.orderUpdating = true
                    if (this.api_action == 'get' && this.order && (order && !order.pfirst))
                    {
                        for (var i in order)
                        {
                            if (i == 'items')
                            {
                                for (var j in order[i])
                                {
                                    this.push('order.' + i, order[i][j])
                                }
                            }
                            else
                            {
                                this.set('order.' + i, order[i])
                            }
                        }
                    }
                    else
                    {
                        this.set('order', this._onLoadResult(order))
                    }                    
                    this.orderUpdating = false

                    this.api_loadMore = false //disable
                }
                else
                {
                    this.orderUpdating = true
                    this.set('order', this._onLoadResult(order))
                    this.orderUpdating = false
                }
                this._setLoading(false)

                if (callback) { callback(this.order, r) }

                //after save and callback
                this._saveOrderForUnsavedComparison(this.order)
            }
            else if (r['success'] === false)
            {
                var order = r['result']
                this.orderUpdating = true
                this.set('order', this._onLoadResult(order))
                this.orderUpdating = false
                this._setLoading(false)
                var s = r['summary']
                if (s && (s.Key == 'validation_fail'))
                {
                    this._applyDetailsErrors('order', r['details'])
                    if (callback) { callback(order, r) }
                }
                else if (s && (s.Key == 'invalid_barcode') && this.order)
                {
                    this.orderUpdating = true
                    this.set('order.Invalid', true)
                    this.orderUpdating = false
                }
                else if (s && s.Key && s.Message) //(s.Key == 'internal_server_error' || s.Key == 'concurrent_access' || object_not_found))
                {
                    this._onError(callback, { 
                        message: s.Message, 
                        key: s.Key,
                        errorid: r ? r['errorid'] : null, 
                        devErrorDetails: r ? r['_devErrorDetails'] : null 
                    })
                }
                else
                {
                    this._onError(callback, null)
                }
            }
            else if (r['error'])
            {
                this._onError(callback, r['error'])
            }

            if (this.api_action == 'cancel')  { this.api_action = 'get' }
            
            if (r && r['success'] === true && r['summary'] && r['summary'].Key != 'invalid_barcode')
            {
                var summary = r['summary']
                var barr = [
                    {
                        title: this.localize('admin-app-ok'),
                        ontap: (te) => 
                        {
                            //do nothing due it is may be a validation_failed...or sothing UI preserve is required
                            // window.location.href = window.location.href
                        }
                    }
                ]
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: '',
                        message: summary.Message,
                        buttons: barr,
                        errorid: r?.errorid ? r.errorid : null,
                        devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                    }
                }))
            }
        }
        else
        {
            this._onError(callback, null)
        }
    }

    _onLoadResult(order)
    {
        return order
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

    _onError(callback, e)
    {
        this._setFailure(true)
        this._setLoading(false)

        this._onErrorDialog(e)

        if (callback) { callback(undefined, e) }
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _onInputChanged(e)
    {
        var epath = e.path || e.composedPath()
        var fname = epath[0].name
        if (!fname) { return }
        if (fname.indexOf('.')>=0)
        {
            var inx = fname.lastIndexOf('.')
            var pname = fname.substr(inx)
            var prefix = fname.substring(0, inx)
            // console.log(prefix + '.notvalid' + pname)
            this.set(prefix + '.notvalid' + pname, null)
        }
        else //no root path
        {
            this.set('order.notvalid.' + fname, null)
        }
    }

    //#endregion


    //#region Common Error Handling

    _onErrorDialog(e, e_message?, e_key?)
    {
        if (!e_key && e) { e_key = e.key }
        if (!e_message && e)  { e_message = e.message }
        if (!e_message) { e_message = this.localize('admin-netbase-error-unknown')}
        var errorid = e?.errorid ? e.errorid : null
        var devErrorDetails = e?.devErrorDetails ? e.devErrorDetails : null

        if (navigator && !navigator.onLine)
        {
            e_message = this.localize('admin-netbase-error-offline')
        }
        console.error(e_key, e)


        var auth = false
        var service_unvailable = false
        var workstation = window.location.pathname.startsWith('/admin/workstation-')
        if (e_message == 'The request failed with status code: 401')
        {
            auth = true

            e_message = this.localize('h401-title')
        }
        else if (e_message == 'The request failed with status code: 503')
        {
            service_unvailable = true

            // console.warn('backend reload request ...')
            if (workstation)
            {
                // path503 = '/admin/workstation-h503'
                e_message = this.localize('h503-title')
            }
            else
            {
                this._goto('/admin/h503')
                return //EXIT
            }
        }
        else if (e_key == "object_not_found")
        {
            this._goto('/admin/h404')
            // return //EXIT
        }

        var barr = [
            {
                title: this.localize('admin-app-ok'),
                ontap: (te) => 
                {
                    if (auth && !this.machineAuthorization) { this._goSignIn() }
                    else if (service_unvailable) { this._reloadWindowLocation() }
                }
            }
        ]


        var show = true
        if (this.machineAuthorization && auth) { show = false }
        if (show)
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: '',
                    message: e_message,
                    buttons: barr,
                    errorid: errorid,
                    devErrorDetails: devErrorDetails,
                }
            }))
        }
    }

    _handleCmdSummaryKey(summary, r: any = null)
    {
        var api_summary_keys_hide: any = { 'validation_fail': 1, }
        if (this.api_summary_keys_hide) { api_summary_keys_hide = this.api_summary_keys_hide }

        var api_summary_keys_toast: any = { 'show_toast': 1, }
        if (this.api_summary_keys_toast) { api_summary_keys_toast = this.api_summary_keys_toast }

        var api_summary_keys_popup: any = { 'show_popup': 1, 'filter-required': 1 }
        if (this.api_summary_keys_popup) { api_summary_keys_popup = this.api_summary_keys_popup }


        if (summary?.Key && api_summary_keys_toast[summary.Key])
        {
            this.showToast(summary.Message)
        }
        else if (summary?.Key && api_summary_keys_popup[summary.Key])
        {
            var barr = [
                {
                    title: this.localize('admin-app-ok'),
                    ontap: (te) => 
                    {
                        //none
                    }
                }
            ]
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: '',
                    message: summary.Message,
                    buttons: barr,
                    errorid: r?.errorid ? r.errorid : null,
                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }
        else if (summary?.Key && !api_summary_keys_hide[summary.Key])
        {
            var barr = [
                {
                    title: this.localize('admin-app-ok'),
                    ontap: (te) => 
                    {
                        //RELOAD UNKNOWN KEYS
                        this._reloadWindowLocation()
                    }
                }
            ]
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: '',
                    message: summary.Message,
                    buttons: barr,
                    errorid: r?.errorid ? r.errorid : null,
                    devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }
    }

    //#endregion
}


//#region decorators

export const FragmentDynamic = (superClass) =>
{
    window.customElements.define(superClass.is, superClass)
}

export const FragmentStatic = (superClass) =>
{
    //do nothing
}

//#endregion