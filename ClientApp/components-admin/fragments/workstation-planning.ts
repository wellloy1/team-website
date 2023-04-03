import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import '@vaadin/vaadin-date-time-picker/vaadin-date-time-picker'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency, deepClone } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { IAdminSignalR_PrintingProgress } from '../../components/bll/signalr-global'
import view from './workstation-planning.ts.html'
import style from './workstation-planning.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../ui/ui-product-item'
import '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import { UIAdminDialog } from '../ui/ui-dialog'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/ui-date-time'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { IronListElement } from '@polymer/iron-list/iron-list.js'
import { RandomInteger } from '../../components/utils/MathExtensions'
// import '../ui/ui-scanner-printer-settings'
// import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
import { UICOLORS } from '../../components/utils/ColorUtils'
const COLORS_KEYS = Object.keys(UICOLORS)
const AdminWorkstationPlanningBase = mixinBehaviors([IronResizableBehavior], WorkstationBase) as new () => WorkstationBase & IronResizableBehavior


@WorkstationDynamic
class AdminWorkstationPlanning extends AdminWorkstationPlanningBase //implements IAdminSignalR_PrintingProgress
{
    static get is() { return 'tmladmin-workstation-planning' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true },
            env: { type: String },
            smallScreen: { type: Object },
            mobileScreen: { type: Object },
            scrollTarget: { type: String, observer: 'scrollTargetChanged'},

            order: { type: Object },
            now: { type: Object, readOnly: true, },
            filters: { type: Object, value: { Sandbox: false, Search: "", } }, //Teamatical.BuildEnv == 'Development'
            sort: { type: Object, value: {} },

            APIPath: { type: String, value: '/admin/api/workstation/planning-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            queryParamsDefault: { type: Object, },
            queryParamsRequired: { type: Object, value: [] },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, notify: true, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableRequestBatchOrder: { type: Boolean, value: true },
            countQtyRequestBatchOrder: { type: Number, value: 0 },
            countRequestBatchOrder: { type: Number, value: 0 },
            countOrderItems: { type: Number, value: 0 },
            labelsSeparator: { type: String, value: ",\n" },

            hiddenNoItems: { type: Boolean, computed: '_computeHiddenNoItems(order.Items.content, loading)' },

            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers)' },
            disabledRequestBatchOrder: { type: Boolean, computed: '_compute_disabledRequestBatchOrder(loadingAny, disableRequestBatchOrder)' },
            disabledFiltersNotValid: { type: Boolean, computed: '_compute_disabledFiltersAsMan(loadingAny, filters.AdminAsManufacturer)' },
            disabledFiltersSandbox: { type: Boolean, computed: '_compute_disabledFiltersAsMan(loadingAny, filters.AdminAsManufacturer)' },
            Items: { type: Boolean, value: true },
            selectOrderRelated: { type: Boolean, value: false },
            selectPOGORelated: { type: Boolean, value: false },

            recentUnderScroll: { type: Boolean, value: false },
            allowUnderScroll: { type: Boolean, value: true },
            recentUnderScrollRectTop: { type: Number },
            recentUnderScrollRectHeight: { type: Number },

            targetDateFrom: { type: String, observer: '_orderTargetDateFromChanged' },
            targetDateTo: { type: String, observer: '_orderTargetDateToChanged' },

            dialogsearchhelp: { type: Object },
            dialogrequestbatch: { type: Object },

            lazyObserve: { type: Object },
        }
    }

    dialogrequestbatch: any
    dialogsearchhelp: any
    scrollTarget: any
    _netbase: any
    _observer: any
    loading: any
    env: any
    _lastManId: any
    dialogunfreeze_reason: any
    previewPrinting: any
    _setNow: any
    selfReloading: any
    filters: any
    sort: any
    disableRequestBatchOrder: boolean
    showTimeInterval: any
    countQtyRequestBatchOrder: number
    countRequestBatchOrder: number
    countOrderItems: number
    _shiftKey: boolean = false
    _shiftKeyOnly: boolean = false
    recentUnderScrollRectTop: number
    recentUnderScrollRectHeight: number
    recentUnderScroll: boolean
    allowUnderScroll: boolean
    onScrollHandler: any
    smallScreen: boolean
    mobileScreen: boolean


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
            // '_log(disableRequestBatchOrder)',
        ]
    }
    _log(v) { console.log(v) }

    // get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get productList() { return this.$['list'] as IronListElement }
    get productListVirtual() { return this.$['list-virtual'] as IronListElement }


    constructor()
    {
        super()
        
        var n = new Date()
        var ts = { ms: n.getTime(), tz: n.getTimezoneOffset() }
        this._setNow(ts)

        this.queryParamsDefault = { ItemListRequest: this._buildItemListRequest() }
    }

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.showTimeInterval = setInterval(() =>
        {
            var n = new Date()
            this._setNow({ ms: n.getTime(), tz: n.getTimezoneOffset() })
        }, 1000)


        document.addEventListener("keyup", (e) => this._onKeyup(e))
        document.addEventListener("keydown", (e) => this._onKeydown(e))

        this._observerGrid = new FlattenedNodesObserver(this.productList, (info: any) =>
        {
            // console.log('FlattenedNodesObserver ... ')
            if (this.visible) 
            {
                var ilists = this.root ? this.root.querySelectorAll('iron-list') : null
                if (ilists)
                {
                    for (var i of ilists)
                    {
                        // console.log(i)
                        this.async(()=> { 
                            i.fire('iron-resize')
                        }, 150)
                    }
                }
            }
        })

        this.onScrollHandler = this.onScroll.bind(this)
    }

    disconnectedCallback()
    {
        if (this.showTimeInterval) { clearInterval(this.showTimeInterval) }
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }


    _requestObject(order)
    {
        if (!order) { return order }

        var r = {
            Manufacturer: order.Manufacturer, 
            ItemListRequest: order.ItemListRequest, 
            Settings: order.Settings, 
            SubscriptionsState: order.SubscriptionsState,
        }
        return r
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    onScroll(e)
    {
        var st = this.scrollTarget.scrollTop
        var recentUnderScroll = (st > this.recentUnderScrollRectTop) && !this.mobileScreen
        if (this.recentUnderScroll != recentUnderScroll) { this.recentUnderScroll = recentUnderScroll }
        // console.log('onScroll', st, this.recentUnderScrollRectTop)
    }

    scrollTargetChanged(t, ot)
    {
        if (!t) { return }

        if (ot) { ot.removeEventListener('scroll', this.onScrollHandler) }
        t.addEventListener('scroll', this.onScrollHandler)
    }

    loadMoreTap(e)
    {
        this.showToast('Not impelemented...yet.')
    }
    
    progress: any
    requestBatchOrderConfirmTap(e)
    {
        var progress = this.progress

        progress.active = true

        var newObj: any = {
            Manufacturer: this.order.Manufacturer,
            Settings: this.dialogrequestbatch,
            Items: {
                content: this.order.Items.content.filter(i => i.selected).map(i => { return { id: i.id } })
            },
            ItemListRequest: this._buildItemListRequest(),
        }

        this.api_action = 'request-batch-order'
        this.cmdPost(this.api_url, newObj, (r, response) =>
        {
            progress.active = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.order = r['result']
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

        // e.preventDefault()
        // e.stopPropagation()
        // return false
    }

    requestBatchOrderTap(e)
    {
        this.progress = e.target.parentElement.querySelector('paper-spinner-lite')

        this.set('dialogrequestbatch', {})
        this.set('dialogrequestbatch.ProductionOnHold', false)
        this.set('dialogrequestbatch.SpotColors', false)
        this.set('dialogrequestbatch.IsDraft', false)
        this.set('dialogrequestbatch.MaxItemsPerBatch', '')

        this.set('dialogrequestbatch.ProcessTypeList', deepClone(this.order.ProcessTypeList))
        this.set('dialogrequestbatch.ProcessType', this.order.ProcessTypeList?.length ? deepClone(this.order.ProcessTypeList[0]) : this.order.Settings.ProcessType)

        this._openDlg(this.$.dialogrequestbatch as PaperDialogElement)
    }

    productItemTap(e)
    {
        // console.log(e)
        var inx = e.model.__data.index
        this.set('order.Items.content.' + inx + '.selected', !this.order.Items.content[inx].selected)
        this.checkboxChangeHandler(e)
    }

    _itemTitleStyle(poID)
    {
        if (typeof(poID) != 'string') { return '' }

        const max = COLORS_KEYS.length - 1
        
        var hash = 0, i, chr
        for (i = 0; i < poID.length; i++)
        {
            chr = poID.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32bit integer
        }
        
        var inx = Math.abs(hash) % max // RandomInteger(0, max)
        // console.log(inx, hash, max, poID)
        var color = COLORS_KEYS[inx]
        return `background-color: var(${color});`
    }

    _onKeyup(e)
    {
        this._onKeydown(e)
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        this._shiftKey = e.shiftKey
        this._shiftKeyOnly = e.shiftKey && !e.altKey && !e.ctrlKey
        // console.log('key', this._shiftKey, this._shiftKeyOnly)


        if (this._shiftKeyOnly && keyboardEventMatchesKeys(e, '?'))
        {
            this._searchHelpTap()
        }

        // if (keyboardEventMatchesKeys(e, 'esc') && this.draggingTabs)
        // {
        //     e.preventDefault()
        //     e.stopPropagation()
        //     this.draggingTabs = !this.draggingTabs
        // }
    }

    checkboxChangeHandler(e?)
    {
        var isallowed = true
        var itemSetItems = this.order?.Items?.content || []

        var entry = e?.model?.__data?.entry
        var shiftKey = this._shiftKeyOnly //e?.detail?.sourceEvent?.shiftKey || 

        if (shiftKey && entry?.OrderProductionID) //(entry.PurchaseOrderID || entry.GroupShippingID || entry.OrderProductionID))
        {
            // console.log(e)
            // if (entry.PurchaseOrderID || entry.GroupShippingID)
            // {
            //     for (var i in itemSetItems)
            //     {
            //         if (itemSetItems[i].PurchaseOrderID == entry.PurchaseOrderID
            //             || itemSetItems[i].GroupShippingID == entry.GroupShippingID)
            //         {
            //             this.set(`order.Items.content.${i}.selected`, entry.selected)
            //             // itemSetItems[i].selected = entry.selected
            //         }
            //     }
            // }
            // else
            // {
            for (var i in itemSetItems)
            {
                if (itemSetItems[i].OrderProductionID == entry.OrderProductionID)
                {
                    this.set(`order.Items.content.${i}.selected`, entry.selected)
                    // itemSetItems[i].selected = entry.selected 
                }
            }
            // }
        }

        var cnt = 0
        var qty = 0
        for (var i in itemSetItems)
        {
            if (itemSetItems[i].selected === true)
            {
                cnt++
                qty += itemSetItems[i].Quantity
                // console.log(itemSetItems[i])
                if (itemSetItems[i].IsNotValid === true)
                {
                    isallowed = false
                }
            }
        }

        this.countQtyRequestBatchOrder = qty
        this.countRequestBatchOrder = cnt
        this.disableRequestBatchOrder = (cnt < 1 || !isallowed)
        this.set('order.checkboxAll', (itemSetItems.length > 0 && itemSetItems.length == cnt)) 
    }

    checkboxAllChangeHandler(e)
    {
        var items = this.order?.Items?.content ?? []

        // console.log('all check:', e.target.checked, 'allthesame:', allthesame)
        for (var i in items)
        {
            items[i].selected = e.target.checked //(allthesame ? e.target.checked :  true)
            this.notifyPath('order.Items.content.' + i + '.selected')
        }

        this.checkboxChangeHandler(e)
    }

    _buildItemListRequest()
    {
        var filters = {
            Sandbox: this.filters?.Sandbox,
            NotValid: this.filters?.NotValid,
            AdminAsManufacturer: this.filters?.AdminAsManufacturer,
            Search: this.filters?.Search,
        }
        if (this.filters?.TargetDateFrom)
        {
            filters['TargetDateFrom'] = this.filters.TargetDateFrom
        }
        if (this.filters?.TargetDateTo)
        {
            filters['TargetDateTo'] = this.filters.TargetDateTo
        }

        var sorts = {}
        if (this.sort.ManufacturingHash) 
        {
            sorts['ManufacturingHash'] = 'asc'
        }
        else
        {
            sorts['OrderID'] = 'asc'
        }

        var sort = ''
        for (var i in sorts)
        {
            if (sort != '') { sort += ';' }
            sort += i + ',' + sorts[i]
        }

        var farr = Object.keys(filters).map(i => { return { path: i, value: filters[i] } })

        return {
            ps: 900000,
            filters: JSON.stringify(farr),
            sort: sort,
            pn: 0,
            pt: "",
            tz: new Date().getTimezoneOffset(),
        }
    }

    _searchDebouncer: Debouncer
    _searchChanged(e)
    {
        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(1600), () =>
        {
            this.onScopeChanged()
        })
    }

    _dataReloadOnAuthChanged(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth, api_subscribe)
    {
        if (this._searchDebouncer) { this._searchDebouncer.cancel() }
        super._dataReloadOnAuthChanged(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth, api_subscribe)
    }

    _searchEnter(e)
    {
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if ((!e.ctrlKey && !e.altKey && keycode == 13) && e.target == this.$['newbarcode'])
        {
            var efake = { target: { parentElement: e.target } }
            this._barcodeTap(efake)
        }
    }

    onScopeChanged(e?)
    {
        if (!this.order) { return }
        
        this.order.ItemListRequest = this._buildItemListRequest()
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order), () => {
            //
        })
    }

    _loadedDebouncer: Debouncer
    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        this.countOrderItems = Number.isFinite(order?.Items?.content?.length) ? order.Items.content.length : '0'
        this.checkboxChangeHandler() // this.countRequestBatchOrder = 0

        // this._loadedDebouncer = Debouncer.debounce(this._loadedDebouncer, timeOut.after(150), () =>
        // {
        //     if (this.visible && this.productListVirtual) { this.productListVirtual.fire('iron-resize') }
        //     // _refreshAll
        // })

        if (!this._observer)
        {
            this._observer = new FlattenedNodesObserver(this.shadowRoot, (info: any) =>
            {
                if (!this._asBool(this.recentUnderScrollRectTop))
                {
                    var anchor = this.shadowRoot ? this.shadowRoot.querySelector('#recent-cell-container') : null
                    var st = 0//this.scrollTarget.scrollTop

                    this.async(()=>
                    {
                        var rect = anchor ? anchor.getBoundingClientRect() : { top: 0, height: 0 }
                        this.recentUnderScrollRectTop = rect.top + st + 60
                        this.recentUnderScrollRectHeight = Math.max(rect.height, 242)
                    })
                }
            })
        }
    }

    _computeHiddenNoItems(arr, loading)
    {
        return this._asBool(arr?.length) || loading == true
    }

    _computeShowManufacturers(manlist)
    {
        return manlist
    }

    _compute_disabledRequestBatchOrder(loadingAny, disableRequestBatchOrder)
    {
        return loadingAny || disableRequestBatchOrder
    }

    _compute_disabledFiltersAsMan(loadingAny, filters_AdminAsManufacturer)
    {
        return loadingAny || filters_AdminAsManufacturer
    }

    _formatLength(length)
    {
        // console.log(length)
        return Number.isFinite(length) ? length : '0'
    }

    _sandboxToggleHide(isAdmin, isPrinter)
    {
        return !(isAdmin || isPrinter)
    }


    _lockTargetDateFrom: boolean
    _orderTargetDateFromChanged(v, o)
    {
        var dt = new Date()
        try
        {
            dt.setTime(Date.parse(v))
        }
        catch
        {
            //
        }

        if (this.order)
        {
            this._lockTargetDateFrom = true
            this.set('filters.TargetDateFrom', {})
            this.set('filters.TargetDateFrom.ms', dt.getTime())
            this.set('filters.TargetDateFrom.tz', dt.getTimezoneOffset())
            this._lockTargetDateFrom = false

            this.onScopeChanged()
        }
    }

    _lockTargetDateTo: boolean
    _orderTargetDateToChanged(v, o)
    {
        var dt = new Date()
        try
        {
            dt.setTime(Date.parse(v))
        }
        catch
        {
            //
        }

        if (this.order)
        {
            this._lockTargetDateTo = true
            this.set('filters.TargetDateTo', {})
            this.set('filters.TargetDateTo.ms', dt.getTime())
            this.set('filters.TargetDateTo.tz', dt.getTimezoneOffset())
            this._lockTargetDateTo = false

            this.onScopeChanged()
        }
    }

    _searchHelpTap(e?)
    {
        var obj: any = {}
        var dialogsearchhelp = this.$.dialogsearchhelp as UIAdminDialog
        if (dialogsearchhelp)
        {
            this.set('dialogsearchhelp', Object.assign({ loading: true }, obj, { title: 'Search Help' }))
            dialogsearchhelp.open()
        }
        this.async(() =>
        {
            this.set('dialogsearchhelp.loading', false)
        }, 350)
    }
}
