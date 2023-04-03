import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-list/iron-list.js';
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-tabs/paper-tab'
import '@polymer/paper-tabs/paper-tabs'
import '@polymer/paper-tabs/paper-tabs-icons'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import '@vaadin/vaadin-date-time-picker/vaadin-date-time-picker'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { Currency, Clipboard, convertLocalDateTimeISO } from '../../components/utils/CommonUtils'
import view from './manufacturer-order-batch.ts.html'
import style from './manufacturer-order-batch.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/ui/ui-image'
import '../../components/ui/ui-image-multiview-3d'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-description'
import '../../components/ui/ui-date-time'
import '../../components/ui/ui-user-inline'
import { Color, UICOLORS } from '../../components/utils/ColorUtils'
import '../ui/ui-richtext-editor'
import '../ui/ui-dialog'
import '../ui/ui-progress-icon'
import { UIAdminDialog } from '../ui/ui-dialog'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { PaperTabsElement } from '@polymer/paper-tabs/paper-tabs';
import { IronListElement } from '@polymer/iron-list/iron-list.js';
import 'multiselect-combo-box'
import 'chart.js/dist/Chart.js'
declare const Chart: any //?
const targetShipDateOffset = 3
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const AdminManufactureOrderItemSetBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior
const COLORS_KEYS = Object.keys(UICOLORS)


@FragmentDynamic
class AdminManufactureOrderItemSet extends AdminManufactureOrderItemSetBase
{
    static get is() { return 'tmladmin-manufacturer-order-batch' }

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
            smallScreen: { type: Object },
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title


            APIPath: { type: String, value: '/admin/api/manufacture/order-itemset-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_summary_keys_hide: { type: Object, value: { 'invalid_input': 1, 'invalid_item_count': 1, } }, //'validation_fail': 1,
            queryParamsRequired: { type: Object, value: ['id', 'oid'] },

            saving: { type: Boolean, notify: true, readOnly: true, },
            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd, saving)' },


            dialogdispose: { type: Object, value: { reason: '', notvalid: {} } },
            dialogreprocess_pt: { type: Object, },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },

            zoomimgi: { type: Object },
            zoompconfi: { type: Object },
            DHL_address: { type: Object },
            previewPrinting: { type: Object },
            recentTrack: { type: Object },
            doUncheckGrabForProduction: { type: Boolean },

            productsSummary: { type: Object, computed: '_compute_productsSummary(order.BulkProduction)' },
            productsSummaryHeader: { type: Array, value: [] },
            designSummary: { type: Object, computed: '_compute_designSummary(order.BulkProduction)' },

            orderTabIndex: {type: Number },
            orderTabs: { type: Array },

            dialogproductinfo: { type: Object },
            dialogreplacementreasons: { type: Object },

            targetShipDate: { type: String, observer: '_orderTargetShipDateChanged' },
        }
    }

    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_modelStatusUpdated(order.Status)',
            '_orderUpdated(order)',
            '_orderUpdateTargetShipDate(order.TargetShipDate.ms)',
            '_buildChart(order.StandardAllocatedMinutes, order.StandardAllocatedMinutes.*)',
            // '_log(order.*)',
        ]
    }

    _log(v) { console.log(v) }


    get trackid() { return this.$['trackid'] as PaperInputElement }
    get carrier() { return this.$['carrier'] as PaperInputElement }
    get place() { return this.$['place'] as PaperInputElement }

    get bulktrackid() { return this.$['bulktrackid'] as PaperInputElement }
    get bulkcarrier() { return this.$['bulkcarrier'] as PaperInputElement }
    get bulkplace() { return this.$['bulkplace'] as PaperInputElement }
    get bulkcount() { return this.$['bulkcount'] as PaperInputElement }
    get orderBulkProductionList() { return this.$['orderBulkProductionList'] as IronListElement }


    previewPrinting: any
    _netbase: any
    _observer: any
    zoomimgi: any
    zoompconfi: any
    smallScreen: any
    disableReprocess: any
    disableShipping: any
    DHL_address: any
    recentTrack: any
    _track2remove: any
    hasUnsavedChanges: boolean
    doUncheckGrabForProduction: boolean
    order_ProcessTypeSelected: any
    order_SpotColors: boolean
    orderTabs: any
    orderTabIndex: number
    dialogdispose: any
    dialogreprocess_pt: any
    dialogproductinfo: any
    dialogreplacementreasons: any
    targetShipDate: string
    _setSaving: any


    
    connectedCallback()
    {
        super.connectedCallback()

        this._attachFonts(fonts)

        document.addEventListener("keydown", (e) => this._onKeydown(e))
        window.addEventListener("popstate", (e) => this._onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveDetailTap()
        }
    }

    _initalNotes = ''
    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path.indexOf('order.Status.title') >= 0) { return false }
        if (orderP && orderP.path == 'order') { this._initalNotes = this.order?.Notes }
        if (orderP && orderP.path == 'order.Notes' && orderP.value == '<p><br></p>' && this._initalNotes == undefined) { return false }
     
        try
        {
            var orderSavedObj = JSON.parse(orderSaved)
            orderSavedObj.Status = order.Status
            orderSaved = JSON.stringify(orderSavedObj)
        }
        catch
        {
        }
        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    _compute_pageObjectTitle(order, orderP)
    {
        var title = ''
        if (order?.ManufactureOrderID) { title += `${order?.ManufactureOrderID}` }
        if (order?.ManufactureItemSetID) { title += ` - batch: ${order?.ManufactureItemSetID}` }
        return title
    }

    saveDetailTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveDetailConfirmTap(e)
    {
        this.api_action = 'save'
        // var oldmodel = Object.assign({}, this.order)
        this._setSaving(true)
        this._postData(this.order, (newmodel) =>
        {
            this._setSaving(false)
            // if (oldmodel.id != newmodel.id)
            // {
            //     var qp = { productid: newmodel.id }
            //     this.queryParams = qp
            //     window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            // }
        })
    }

    updateOrderStatusTap(e)
    {
        this.api_action = 'updatestatus'

        this._postData(this.order, (order) =>
        {
            //
        })
        // this.queryParamsAsObject = true
        // this._fetchItems(1, this.order.ManufactureOrderID, null, () =>
        // {
        //     this.queryParamsAsObject = false
        // })
    }


    hideSaveBtn(product)
    {
        return false
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _tabSelection: boolean
    _dataReloadChanged(visible, queryParams)
    {
        // console.log(visible, queryParams, this.queryParamsLatest)
        var hasToBeReloaded = this.queryParamsLatest?.id != queryParams?.id || this.queryParamsLatest?.oid != queryParams?.oid
        if (this._tabSelection && !hasToBeReloaded) { return }
        this.queryParamsLatest = JSON.parse(JSON.stringify(queryParams))
        return super._dataReloadChanged(visible, queryParams)
    }

    queryParamsLatest: any
    onOrderTabSelected(e)
    {
        var seti = e.model?.__data?.seti
        if (seti)
        {
            var tabsel = this.shadowRoot ? this.shadowRoot.querySelector('.order-tabs') as PaperTabsElement : null
            if (tabsel) { tabsel.selected = 0 }
            // console.log(tabsel)
            return
        }

        var tabi = e.detail.item.__dataHost.__data.tabi
        if (this.visible) 
        { 
            var qp = Object.assign({}, this.queryParams, { 'tabid': tabi.ID })
            
            this._tabSelection = true
            window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            this.queryParams = qp
            this._tabSelection = true
        }

        if (this.visible) 
        {
            this._ironlist_resize()
        }
    }

    _ironlist_resize_debouncer: Debouncer
    _ironlist_resize()
    {
        this._ironlist_resize_debouncer = Debouncer.debounce(this._ironlist_resize_debouncer, timeOut.after(250), () =>
        {
            var ilists = this.root ? this.root.querySelectorAll('iron-list') : null
            if (ilists)
            for (var i of ilists)
            {
                if (i?.parentElement)
                {
                    var visiblei = getComputedStyle(i.parentElement).display
                    if (visiblei != 'none') { i.fire('iron-resize') }
                }
            }
        })
    }

    onDesignSummaryItemTap(e)
    {
        var tabiID = 'BulkProduction'
        var designi = e?.model?.__data?.designi
        var designinx = e?.model?.__data?.index

        var tabinx = -1
        var tablst = this.orderTabs.filter((i, index) => 
        {
            var v = i.ID == tabiID
            if (v) { tabinx = index }
            return v
        })
        var tabi
        if (tablst?.length == 1) { tabi = tablst[0] }
        if (tabi && designi && tabinx >= 0)
        {
            this.set('orderTabIndex', tabinx)

            var qp = Object.assign({}, this.queryParams, { 'tabid': tabiID })
            this._tabSelection = true
            window.history.pushState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            this.queryParams = qp
            this._tabSelection = true

            console.log(designi)
            if (designi.OrderProductionIDs?.length > 0)
            {
                this.tryScrollToBulkProductionItem(designi.OrderProductionIDs[0]?.ID, this.order)
            }

            e.stopPropagation()
            e.preventDefault()
            return false
        }
    }


    isTabActive(orderTabs, orderTabIndex, tabID, is_data = true)
    {
        // console.log(...arguments)
        if (!orderTabs) { return false }

        var is_tab = (orderTabs[orderTabIndex]?.ID == tabID ? true : false)
        if (tabID.indexOf('|') >= 0)
        {
            var tabs = tabID.split('|')
            for (var tabi of tabs)
            {
                is_tab = (orderTabs[orderTabIndex]?.ID == tabi ? true : false)
                if (is_tab) { break }
            }
        }
        return (is_tab && this._asBool(is_data))
    }

    _visibleChanged(visible)
    {
        if (!visible) 
        { 
            // this.orderTabIndex = 0
        }
    }

    
    disableStatusSelection(loading)
    {
        return loading
    }

    localizeStatus(statusi_id)
    {
        // console.log(statusi_id)
        return this.localizep('admin-morder-status-', statusi_id)
    }

    // _getTargetShipDate(order)
    // {
    //     //|| (order.History && order.History.length > 0 ? order.History[0].Timestamp : null)
    //     if (order && order.Created && order.Created.ms)
    //     {
    //         var d = new Date()
    //         d.setTime(order.Created.ms + targetShipDateOffset * 24 * 60 * 60 * 1000)
    //         d.setHours(d.getHours() + Math.round(d.getMinutes() / 60));
    //         d.setMinutes(0, 0, 0); // Resets also seconds and milliseconds            
    //         return d
    //     }
    //     return null
    // }

    // _isTargetShipDateOver(order)
    // {
    //     var d = this._getTargetShipDate(order)
    //     return d ? new Date().getTime() > d.getTime() : false
    // }

    // _getFormatTargetShipDate(order)
    // {
    //     var d = this._getTargetShipDate(order)
    //     return d ? this._formatDate({ ms: d.getTime() }) : ''
    // }

    _modelStatusUpdated(status)
    {
        if (this.order?.Status?.title)
        {
            this.set('order.Status.title', this.localizep('admin-morder-status-', this.order.Status.title))
        }
    }

    _lockTargetShipDate: boolean
    _orderTargetShipDateChanged(v, o)
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
            this._lockTargetShipDate = true
            this.set('order.TargetShipDate', {})
            this.set('order.TargetShipDate.ms', dt.getTime())
            this.set('order.TargetShipDate.tz', dt.getTimezoneOffset())
            this._lockTargetShipDate = false
        }
    }

    _orderUpdateTargetShipDate(ms)
    {
        if (this._lockTargetShipDate) { return }
        this.targetShipDate = convertLocalDateTimeISO(ms).substr(0, 16)
    }

    _lastOrderUpdate: any
    _orderUpdated(order)
    {
        if (!order) { return }
        // console.log(order)

        this.set('order.Status.title', this.localizep('admin-morder-status-', this.order.Status.id))

        // if (!this.order?.StandardAllocatedMinutes)
        // {
        //     //test
        //     this.set('order.StandardAllocatedMinutes', [
        //         { ID: 'C1', minutes: 1300 },
        //         { ID: 'C2', minutes: 2300 },
        //         { ID: 'C3', minutes: 3300 },
        //     ])
        // }

        this.order_ProcessTypeSelected = order.ProcessTypeSelected
        this.order_SpotColors = false

        var tabs = [{ ID: '', Title: '', Class: '', Icon: '', IconClass: '' }]
        tabs = []
        tabs.push({ ID: 'Summary', Title: this.localize('admin-morder-batchsummary-title'), Class: 'order-summary-tab', Icon: 'admin-icons:home', IconClass: '' })
        if (order.PrintingTuning) { tabs.push({ ID: 'PrintingTuning', Title: this.localize('admin-morder-printing-title'), Class: 'order-printing-tab', Icon: 'admin-icons:print', IconClass: '' }) }
        if (order.BulkProduction) 
        { 
            var menuitem = { ID: 'BulkProduction', Title: this.localize('admin-morder-items-title'), Class: 'order-reprocess-tab', Icon: 'admin-icons:sewing-machine', IconClass: '' }
            // if (this._equal(order.ProcessTypeSelected.id, 'Bulk'))
            // {
            //     menuitem.Icon = 'admin-image:burst-mode'
            //     menuitem.IconClass = 'bulk'
            // }
            // else if (this._equal(order.ProcessTypeSelected.id, 'Stacking'))
            // {
            //     menuitem.Icon = 'admin-image:filter'
            //     menuitem.IconClass = 'stacking'
            // }
            tabs.push(menuitem) 
        }
        if (order.AccessoryReport) 
        {
            tabs.push({ ID: 'AccessoryReport', Title: this.localize('admin-morder-accessories-title'), Class: 'order-accessories-tab', Icon: 'admin-icons:accessory-zipper', IconClass: '' })
        }
        if (order.StockReport) 
        {
            tabs.push({ ID: 'StockReport', Title: this.localize('admin-morder-stocks-title'), Class: 'order-stocks-tab', Icon: 'admin-icons:dns', IconClass: '' })
        }


        if (order.Shipping) { tabs.push({ ID: 'Shipping', Title: this.localize('admin-morder-shipping-title'), Class: 'order-shipping-tab', Icon: 'admin-maps:local-shipping', IconClass: '' }) }
        if (order.ShippingAggregated) { tabs.push({ ID: 'ShippingAggregated', Title: this.localize('admin-morder-shippingaggregated-title'), Class: 'order-shippingaggregated-tab', Icon: 'admin-maps:local-shipping', IconClass: '' }) }

        this.set('orderTabs', tabs)

        // if (!this._asBool(this.orderTabIndex) && this.queryParams['tabid'])
        if (this.queryParams['tabid'])
        {
            var inx = 0
            var tabsel = tabs.filter((i, ii) => { 
                if (i.ID == this.queryParams['tabid'])
                {
                    inx = ii
                    return true
                }
                return false
            })
            if (tabsel.length > 0) { this.set('orderTabIndex', inx)  }
        }
        else if ((!this._asBool(this.orderTabIndex) || this.orderTabIndex >= this.orderTabs.length) && (JSON.stringify(this._lastOrderUpdate) != JSON.stringify(order)))
        {
            this.set('orderTabIndex', 0)
        }

        this._lastOrderUpdate = order


        if (this.queryParams['iid'])
        {
            this.tryScrollToBulkProductionItem(this.queryParams['iid'], order)
        }

        this._ironlist_resize()
    }

    tryScrollToBulkProductionItem(iid, order)
    {
        if (!order?.BulkProduction) { return }

        var vinx = -1
        var vi = order.BulkProduction.filter((i, index, array) => 
        {
            var vj = i.OrderProductionIDs ? i.OrderProductionIDs.filter(j => { return j.ID == iid }) : null
            if (vj?.length > 0)
            {
                vinx = index
                return true
            }
            return false
        })
        this.async(()=> 
        { 
            if (vinx >=0 && this.orderBulkProductionList) 
            { 
                this.orderBulkProductionList.scrollToIndex(vinx) 
            }
        }, 370)
    }

    onOpenZoomDialog(e)
    {
        // console.log(e)
    }

    onCloseZoomDialog(e)
    {
        // console.log(e)
    }

    onProductImageTap(e)
    {
        //show zoom
        var producti = e.model.__dataHost.__dataHost.__data.producti
        var rpi = e.model.__dataHost.__dataHost.__data.rpi
        var imgi = e.model.__data.imgi
        // console.log(imgi, imgi.imgZoomUrl)

        this.zoomimgi = imgi
        this.zoompconfi = producti ? producti.ProductConfiguration : rpi.ProductConfiguration
        // for (var i in this.zoompconfi.ProductViews)
        // {
        //     if (i == '0')
        //     {
        //         this.zoompconfi.ProductViews[i].Selected = true
        //     }
        //     this.zoompconfi.ProductViews[i].ViewId = MD5(this.zoompconfi.ProductViews[i].ImageUrl)
        // }
        // console.log(this.zoompconfi)
        this._openDlg(this.$.dialogzoom3d as PaperDialogElement)//, (this.smallScreen ? this.querySelector('div') : e.target))
    }

    onProductPartImageTap(e)
    {
        var parti = e.model.__data.parti
        // console.log(e.model.__data)
        this.zoomimgi = parti
        this._openDlg(this.$.dialogzoom as PaperDialogElement)
    }
    onProductPartImageBackTap(e)
    {
        var parti = e.model.__data.parti
        // console.log(e.model.__data)
        this.zoomimgi = parti
        this._openDlg(this.$.dialogzoomback as PaperDialogElement)
    }

    onProductAccessoryImageTap(e)
    {
        var acci = e.model.__data.acci
        // console.log(e.model.__data)
        this.zoomimgi = acci
        this._openDlg(this.$.dialogzoom as PaperDialogElement)
    }

    checkboxChangeHandler(e?)
    {
        var reprocess = null
        var shipping = null
        var itemSetItems = this.order.ManufactureOrderItemSetItems || []

        // console.log(e.model.__data.rpi)
        for (var i in itemSetItems)
        {
            if (itemSetItems[i].reprocess == true) 
            {
                reprocess = reprocess === false ? false : itemSetItems[i].CanBeReprocessed
                shipping = shipping === false ? false : itemSetItems[i].CanBeShipped
                // break
            }
        }

        this.disableReprocess = !reprocess
        this.disableShipping = !shipping
    }

    checkboxAllChangeHandler(e)
    {
        var itemSetItems = this.order.ManufactureOrderItemSetItems || []

        // var selected = itemSetItems.filter(i => { return i.reprocess === true })
        // var allthesame = itemSetItems.length == selected.length || selected.length == 0
        // console.log('all check:', e.target.checked, 'allthesame:', allthesame)
        for (var i in itemSetItems)
        {
            itemSetItems[i].reprocess = e.target.checked //(allthesame ? e.target.checked :  true)
            this.notifyPath('order.ManufactureOrderItemSetItems.' + i + '.reprocess')
        }

        this.checkboxChangeHandler()
    }

    disposeOrderConfirmTap(e)
    {
        var dialogdispose_reason = this.dialogdispose.reason
        if (!dialogdispose_reason || dialogdispose_reason.length < 5) 
        { 
            this.set('dialogdispose.notvalid.DisposeReason', 'Dispose reason is mandatory (a few words)')
            e.preventDefault()
            e.stopPropagation()
            return 
        }

        this.set('dialogdispose.reason', '')
        this.api_action = 'dispose'
        this._fetchItems(1, this.order.ManufactureOrderID, { 
            // ptype: this.order.ProcessTypeSelected.id,
            reason: dialogdispose_reason,
            douncheck_gfp: this.doUncheckGrabForProduction,
        })
    }

    disposeOrderTap(e)
    {
        this.doUncheckGrabForProduction = false
        this._openDlg(this.$.dialogdispose as PaperDialogElement)
    }

    fixassignmentOrderTap(e)
    {
        this.api_action = 'fixassignment'
        this._fetchItems(1, this.order.ManufactureOrderID, { })
    }

    reprocessOrderConfirmTap(e)
    {
        this.api_action = 'allreprocess'
        this._fetchItems(1, this.order.ManufactureOrderID, { 
            ptype: this.order.ProcessTypeSelected.id,
            spotcolors: this.order_SpotColors, 
        })
    }

    reprocessOrderTap(e)
    {
        this._openDlg(this.$.dialogreprocess as PaperDialogElement)
    }

    reprocessMulti(e)
    {
        var btn = e.target
        var lst: any = []
        var itemSetItems: any = this.order.ManufactureOrderItemSetItems || []

        for (var i in itemSetItems)
        {
            if (itemSetItems[i].reprocess == true) 
            {
                lst.push(itemSetItems[i].ID)
            }
        }

        
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        var url = this.websiteUrl + this.APIPath + 'reprocess'
        this.url = StringUtil.urlquery(url, { oid: this.order.ManufactureOrderID, id: this.order.ManufactureItemSetID, items: lst.join(',') })
        btn.disabled = true
        if (progress) { progress.active = true }
        this.cmd((result) =>
        {
            btn.disabled = false
            if (progress) { progress.active = false }
            this._saveOrderForUnsavedComparison(result)
            this.order = result //UPDATE RECENT MODEL
        })
    }

    hideReprocess(order, isAdmin)
    {
        return !order //|| !isAdmin 
    }
    
    hideDispose(order, isAdmin)
    {
        return !order //|| !isAdmin 
    }

    hideFixassignment(order, isAdmin)
    {
        return !order //|| !isAdmin 
    }

    hideDescBtn(orderi)
    {
        return false
    }

    dis_reprocess_all(loading, printingTuningsP)
    {
        var arr = printingTuningsP.value
        var disabled = false
        for (var i in arr)
        {
            if (arr[i].IsPDFsFrozen) 
            {
                disabled = true
            }
        }
        // console.log(printingTuningsP)
        return loading || disabled
    }

    dis_dispose(loading, printingTuningsP)
    {
        return this.dis_reprocess_all(loading, printingTuningsP)
    }

    dis_fixassignment(loading, printingTuningsP)
    {
        return this.dis_reprocess_all(loading, printingTuningsP)
    }

    dis_reprocess(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen, ReprocessProperties)
    {
        return loadingAny || IsProcessing || IsPDFsFrozen || !this._asBool(ReprocessProperties) // || IsOnHold
    }

    dis_download(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen, outputResultSource)
    {
        return !outputResultSource
        // return loadingAny || IsProcessing || !outputResultSource || IsOnHold || IsPDFsFrozen
    }

    dis_freeze(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return loadingAny || IsProcessing || IsPDFsFrozen || IsOnHold
    }

    dis_unfreeze(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return loadingAny || IsProcessing || !IsPDFsFrozen || IsOnHold
    }

    hid_freeze(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return false //!IsPDFsFrozen
    }

    hid_unfreeze(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return false //IsPDFsFrozen
    }

    dis_hold(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return loadingAny || IsProcessing || IsOnHold || IsPDFsFrozen
    }

    dis_unhold(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return loadingAny || IsProcessing || !IsOnHold || IsPDFsFrozen
    }

    hid_hold(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return false //!IsOnHold
    }

    hid_unhold(loadingAny, IsProcessing, IsOnHold, IsPDFsFrozen)
    {
        return false //IsOnHold
    }

    show_replacement(printingi_ReplacementIteration)
    {
        return this._morethen(printingi_ReplacementIteration, 0)
    }

    viewProdOrder(e)
    {
        var rpi = e.model.__data.rpi
        var url = this._urlViewOrderProduction(rpi.OrderProductionID)
        this._goto(url)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    showHistDetails(e)
    {
        var histi = e.model.__data.histi
        var dialogdump: any = this.$.dialogdump
        var pre = dialogdump.querySelector('pre')
        pre.innerText = histi.Details
        this._openDlg(dialogdump)//, this.shadowRoot.querySelector('div'))
    }

    _onReprocessPreview(e)
    {
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'repreview-printing'
        this.url = StringUtil.urlquery(url, { 
            printingid: id,
        })
        this.cmd((result) =>
        {
            progress.active = false
            this._saveOrderForUnsavedComparison(result)
            this.order = result //UPDATE RECENT MODEL
        })
    }

    dialogreprocess_pt_onProductConfigurationOverridesRemoved(e)
    {
        //
    }

    dialogreprocess_pt_onProductConfigurationOverridesonLocalesRemovedAll(e)
    {
        //
    }

    _onReprocess(e)
    {
        this.dialogreprocess_pt_id = e.target.getAttribute('data-id')
        this.dialogreprocess_pt_progress = e.target.parentElement.querySelector('paper-spinner-lite')
        var printingi = e.model.__data.printingi
        var orderbatch = e.model.__dataHost.__dataHost.__data.order

        var dialogreprocess_pt = this.$.dialogreprocess_pt as UIAdminDialog
        if (dialogreprocess_pt)
        {
            var pcidsDistinct = [...new Set(orderbatch.BulkProduction.map(x => x?.ProductConfiguration?.ProductConfigurationID))]
            var pcids = pcidsDistinct.map(i => { return { id: i, title: i} })
            this.set('dialogreprocess_pt', Object.assign({}, printingi.ReprocessProperties, { 
                notvalid: {},
                ProductConfigurationList: pcids,
                ProductConfigurationOverrides: [],
            }))
            dialogreprocess_pt.open()
        }

        e.preventDefault()
        return false
    }

    dialogreprocess_pt_id: any
    dialogreprocess_pt_progress: any

    _onReprocessConfirm(e)
    {
        var id = this.dialogreprocess_pt_id
        var progress = this.dialogreprocess_pt_progress

        progress.active = true
        this.api_action = 'reprocess-printing'
        var obj: any = Object.assign({}, this.dialogreprocess_pt)
        delete obj.notvalid
        delete obj.FabricList
        delete obj.ProductConfigurationList

        this.cmdPost(this.api_url, obj, (r, response) => 
        {
            progress.active = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    var result = r['result']
                    this._saveOrderForUnsavedComparison(result)
                    this.order = result //UPDATE RECENT MODEL
                }
            }
        })
    }

    _onDownload(e) 
    {
        // var oid = e.target.getAttribute('data-oid')
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        // console.log(oid, id, progress)
        this.getOrderFile({ printingid: id }, progress)
        e.preventDefault()
        return false
    }

    _onReasonTap(e) 
    {
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        progress.active = true
        var path = this.websiteUrl + this.APIPath + 'replacementstats'
        var qpars = { printingid: id }

        var dialogreplacementreasons = this.$.dialogreplacementreasons as UIAdminDialog
        if (dialogreplacementreasons)
        {
            this.set('dialogreplacementreasons', Object.assign({ 
                loading: true,
                title: 'Replacement Reasons',
            }, {}))
            dialogreplacementreasons.open()
        }

        this.cmdGet(path, qpars, (result, r) =>
        {
            progress.active = false
            this.set('dialogreplacementreasons.loading', false)

            // console.log(result, r)
            if (!r) { return }

            if (r['success'] === true)
            {
                this.set('dialogreplacementreasons', Object.assign(result, { title: this.dialogreplacementreasons.title }))
            }
            else if (r['success'] === false)
            {
                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }
        })

        e.preventDefault()
        return false
    }

    _ptAction(e, action)
    {
        // var oid = e.target.getAttribute('data-oid')
        var id = e.target.getAttribute('data-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        // console.log(oid, id, progress)

        progress.active = true
        var url = this.websiteUrl + this.APIPath + action
        this.url = StringUtil.urlquery(url, { printingid: id })
        this.cmd((result) =>
        {
            progress.active = false
            this._saveOrderForUnsavedComparison(result)
            this.order = result //UPDATE RECENT MODEL
            //response['result'], response, rq
            // li.setAttribute('hidden', true)
            // this._refresh(true)
        })

        e.preventDefault()
        return false
    }

    ptUnfreezeTap(e)
    {
        return this._ptAction(e, 'unfreeze')
    }

    ptFreezeTap(e)
    {
        return this._ptAction(e, 'freeze')
    }

    ptHoldTap(e)
    {
        return this._ptAction(e, 'hold')
    }

    ptUnHoldTap(e)
    {
        return this._ptAction(e, 'unhold')
    }


    show_DHL_addressTap(e)
    {
        this.DHL_address = e.model.__data.shippingi

        var addressStr = this.build_DHL_address()
        // addressStr = addressStr.replace('Thailand', 'USA')
        if (true)
        {
            Clipboard.copyFromString(addressStr)
            this.showToast(this.localize('admin-morder-dhl-copied-toast'))
        }
        else
        {
            this._openDlg(this.$.dialog_dhl as PaperDialogElement)
        }
    }

    copy_DHL_addressTap(e)
    {
        var addressStr = this.build_DHL_address()
        Clipboard.copyFromString(addressStr)
        this.showToast(this.localize('admin-morder-dhl-copied-toast'))
    }


    build_DHL_address()
    {
        const phoneParser = parsePhoneNumberFromString(this.DHL_address.Phone, 'US')
        if (phoneParser)
        {
            this.DHL_address.PhoneType = phoneParser.getType()
            this.DHL_address.PhoneCode = phoneParser.countryCallingCode
            this.DHL_address.PhoneNumber = phoneParser.nationalNumber
            this.DHL_address.PhoneExt = phoneParser.ext
        }
        else
        {
            this.DHL_address.PhoneNumber = this.DHL_address.Phone
        }
        this.DHL_address = Object.assign({}, this.DHL_address)

        //build this.DHL_address
        var addressAr: any = []
        addressAr.push(this.DHL_address.ShipFirstName + ' ' + this.DHL_address.ShipLastName)
        addressAr.push(this.DHL_address.ShipCountry)
        addressAr.push(this.DHL_address.ShipAddress)
        addressAr.push(this.DHL_address.ShipAddress2)
        addressAr.push(this.DHL_address.ShipAddress3)

        addressAr.push(this.DHL_address.ShipZip)
        addressAr.push(this.DHL_address.ShipCity)
        addressAr.push(this.DHL_address.ShipState)
        addressAr.push(this.DHL_address.PhoneType)
        addressAr.push(this.DHL_address.PhoneCode)

        addressAr.push(this.DHL_address.PhoneNumber)
        addressAr.push(this.DHL_address.PhoneExt)
        addressAr.push(this.DHL_address.Email)

        addressAr.push(this.DHL_address.IsCompany ? this.DHL_address.ShipCompany : this.DHL_address.ShipFirstName + ' ' + this.DHL_address.ShipLastName)
        addressAr.push(this.DHL_address.ShipTaxID)
        addressAr.push(this.DHL_address.ShipEORI)
        addressAr.push(this.DHL_address.IsCompany)
        addressAr.push(this.DHL_address.IsResidential)

        var addressStr = addressAr.join("\t")
        return addressStr
    }


    showBarcodesTap(e)
    {
        var pdfi = e.model.__data.pdfi
        var rpi = e.model.__data.rpi

        var pr = pdfi || { Content: rpi.Barcodes }
        pr = Object.assign(pr, { dlgTitle: this.localize('admin-ws-printing-dlg-barcodes') })
        this.previewPrinting = pr
        var dialogbarcodes = this.$.dialogbarcodes as PaperDialogElement
        this._openDlg(dialogbarcodes)
    }

    showBarcodesQaTap(e)
    {
        var rpi = e.model.__data.rpi
        this.previewPrinting = { Content: rpi.BarcodesQa, dlgTitle: this.localize('admin-ws-printing-dlg-qa-barcodes') }
        var dialogbarcodes = this.$.dialogbarcodes as PaperDialogElement
        this._openDlg(dialogbarcodes)
    }

    onClosePreviewDialog(e)
    {
        //
    }

    onOpenPreviewDialog(e)
    {
        this.previewPrinting = this.previewPrintingPDF
    }

    _isPdfPreviewBtn(loadingAny, pdfiImages)
    {
        return loadingAny || !this._asBool(pdfiImages)
    }

    previewPrintingPDF: any
    maindivRect: DOMRect
    async showPreviewTap(e, calle, back = false)
    {
        var pdfi = e.model.__data.pdfi
        var previewPrintingPDF = back ? pdfi.SandwichBack : pdfi

        this.previewPrinting = null
        this.previewPrintingPDF = {}
        
        var dialogpreview = this.$.dialogpreview as PaperDialogElement
        var maindiv =  this.shadowRoot ? this.shadowRoot.querySelector('.maindiv') : null
        this.maindivRect = maindiv ? maindiv.getBoundingClientRect() : new DOMRect()
        // dialogpreview.style = "max-height:" + window.innerHeight + "px"
        var minw = Math.min(1445, (this.maindivRect.width - 50))
        var maxw = Math.min(1445, (this.maindivRect.width - 50))
        var minh = Math.min(960, window.innerHeight - 350)
        var maxh = window.innerHeight - 150
        dialogpreview.style.minWidth = minw + "px"
        dialogpreview.style.maxWidth = maxw + "px"
        dialogpreview.style.minHeight = minh + "px"
        dialogpreview.style.maxHeight = maxh + "px"


        var url = this._computeAPIUrl(this.websiteUrl, this.APIPath, 'file-get-images')
        var qpars = { 
            pdfid: pdfi.ManufacturePDFID, 
        }
        
        this.loadingCmd = true
        this._setSaving(true)
        this.cmdGet(url, qpars, (result, response, rq) => 
        {
            this._setSaving(false)
            if (response?.success)
            {
                var previewPrinting = JSON.parse(JSON.stringify(previewPrintingPDF))
                for (var i in previewPrinting.Pages)
                {
                    previewPrinting.Pages[i] = Object.assign({}, previewPrinting.Pages[i], back ? result.SandwichBack.Pages[i] : result.Pages[i])
                }
                this.previewPrintingPDF = previewPrinting
                this._openDlg(dialogpreview)
            }
        })
    }

    async showBackPreviewTap(e, calle)
    {
        await this.showPreviewTap(e, calle, true)
    }

    _pageStyle(pagei)
    {
        // <!--Copies: 1
        // Image:
        // "https://wwwdev.teamatical.com/api/v1.0/image/get?i0x=jE.y.4mEh4pWWiF7u6JeHHlh0eCEEeRaa.gKHCXIurC_TaS9Xsr9AqHzLy9TQOrTSycpu.2F57ydmG7yiVXGD.t_ecCKdDlEI0qRcbZDiEA"
        // LengthMeters: 0.09863899999999998
        // WidthMeters: 1.8288
        // RasterizationTimeTicks: 15541390

        // var ratio = pagei.WidthMeters / pagei.LengthMeters
        // var ratio = pagei.LengthMeters / pagei.WidthMeters
        var st = ""
        st += "object-fit: cover; width:100%;"
        // st += "height: " + ratio + "vw;"
        if (this.maindivRect)
        {
            var maxw = this.maindivRect.width - 100
            st += `max-width: ${maxw}px;`
            // st += `min-width: ${maxw}px;`
        }
        return st
    }

    _pageTitle(pagei)
    {
        var ts = this._formatDouble(pagei?.RasterizationTimeTicks / 10000)
        return `Rasterization Time: ${ts} (ms)`
    }

    productsSummaryHeader: any
    _compute_productsSummary(bulkProduction)
    {
        if (!Array.isArray(bulkProduction)) { return bulkProduction }

        var sizesGrid = bulkProduction.reduce((acc, i, inx, arr) => {
            var ii = acc[i.Size]
            if (!ii) { acc[i.Size] = 0 }
            return acc
        },
        {})
        //TODO sort sizes
        this.productsSummaryHeader = Object.keys(sizesGrid)

        var productsSummary = bulkProduction.reduce(
            (acc, i, inx, arr) => 
            {
                var ii = acc[i.ManufactureProductInternalID]
                if (ii)
                {
                    ii.TotalCount += i.Count
                    ii.Sizes[i.Size] = ii.Sizes[i.Size] + i.Count
                }
                else
                {
                    var sizes = Object.assign({}, sizesGrid)
                    sizes[i.Size] = i.Count
                    ii = {
                        SKU: i.SKU,
                        TotalCount: i.Count,
                        Sizes: sizes,
                    }
                    acc[i.ManufactureProductInternalID] = ii
                }
                return acc
            }, 
            {}
        )

        productsSummary = Object.keys(productsSummary).map(i => { 
            return {
                ManufactureProductInternalID: i,
                SKU: productsSummary[i].SKU,
                Sizes: Object.keys(productsSummary[i].Sizes).map(j => {
                    return productsSummary[i].Sizes[j]
                }),
                TotalCount: productsSummary[i].TotalCount,
            }
        })

        // console.log(bulkProduction, sizesGrid, productsSummary)
        return productsSummary
    }

    _compute_designSummary(bulkProduction)
    {
        return bulkProduction
        // if (!Array.isArray(bulkProduction)) { return bulkProduction }

        // var designsSummary = bulkProduction.map(i => {
        //     return {
        //         ImageUrl: i.ImageUrls ? i.ImageUrls[0] : '',
        //         Size: i.Size,
        //         ManufactureProductInternalID: i.ManufactureProductInternalID,
        //         Count: i.Count,
        //     }
        // })

        // return designsSummary
    }

    _asBoolPushed(printingi_PushList)
    {
        if (!Array.isArray(printingi_PushList)) { return false }

        return printingi_PushList.length > 0
    }

    _formatPushedDate(printingi_PushList)
    {
        if (!Array.isArray(printingi_PushList)) { return false }

        var last = printingi_PushList[printingi_PushList.length - 1]
        return this._formatDate(last?.Timestamp)
    }


    _help()
    {
        return `
        F5 / Ctrl+R - refresh data.
        Alt + Left/Right - change tab
        `
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (!e.ctrlKey && e.altKey && !e.shiftKey && this.orderTabs && this.orderTabs.length > 1 && 
            (keyboardEventMatchesKeys(e, 'left') || keyboardEventMatchesKeys(e, 'right')))
        {
            var step = keyboardEventMatchesKeys(e, 'right') ? 1 : -1
            var inx = this.orderTabIndex
            inx += step
            if (inx >= this.orderTabs.length) { inx = 0 }
            if (inx < 0) { inx = this.orderTabs.length - 1 }
            this.orderTabIndex = inx

            e.preventDefault()
            e.stopPropagation()
        }
    }


    _onHistoryPopstate(e)
    {
        // console.log(e)
    }


    showProductDetailsTap(e)
    {
        // console.log(e)

        var rpi = e.model.__data.rpi
        this.api_action = 'itemsinfo'
        var obj: any = { 
            ManufactureOrderID: this.order.ManufactureOrderID, 
            ManufactureItemSetID: this.order.ManufactureItemSetID,
            ID: rpi.ID,
        }

        var dialogproductinfo = this.$.dialogproductinfo as UIAdminDialog
        if (dialogproductinfo)
        {
            this.set('dialogproductinfo', Object.assign({ loading: true }, obj, { title: this.localize('admin-morder-dialogproductinfo-title') }))
            dialogproductinfo.open()
        }

        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            this.set('dialogproductinfo.loading', false)

            // console.log(result, r)
            if (!r) { return }

            if (r['success'] === true)
            {
                // console.log(result)
                // result.Items = result.Items.slice(0, 1)
                this.set('dialogproductinfo', this._prepare_dialogproductinfo(Object.assign(result, { title: this.dialogproductinfo.title })))
            }
            else if (r['success'] === false)
            {
                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }
        })
    }

    _prepare_dialogproductinfo(dialogproductinfo)
    {
        if (!Array.isArray(dialogproductinfo?.Items)) { return }

        var qaConfirm = false, qaApproved = false
        for (var i in dialogproductinfo.Items)
        {
            var rpi = dialogproductinfo.Items[i]
            if (!this.disabledDisapprove(false, rpi.QAApprovedConfirmed, rpi.QAApproved))
            {
                qaApproved = true
                break
            }
        }
        dialogproductinfo.QAApprovedConfirmed = false
        dialogproductinfo.QAApproved = qaApproved
        return dialogproductinfo
    }

    disabledDisapprove(loadingAny, rpiQAApprovedConfirmed, rpiQAApproved)
    {
        return loadingAny || rpiQAApprovedConfirmed || !rpiQAApproved
    }

    disabledDisapproveAll(loadingAny, qaApprovedConfirmed, qaApproved)
    {
        return loadingAny || qaApprovedConfirmed || !qaApproved
    }


    productItemDisapproveConfirmTap(e)
    {
        // var rpi = e.model.__data.rpi
        var rpinx = e.model.__data.rpindex
        this.set(`dialogproductinfo.Items.${rpinx}.QAApprovedConfirmed`, true)
    }
    
    productItemDisapproveAllConfirmTap(e)
    {
        for (var rpinx in this.dialogproductinfo.Items)
        {
            if (this.dialogproductinfo?.Items[rpinx]?.QAApproved)
            {
                this.set(`dialogproductinfo.Items.${rpinx}.QAApproved`, false)
            }
        }

        this.set('dialogproductinfo.QAApprovedConfirmed', true)
    }

    productItemDisapproveTap(e)
    {
        var rpi = e?.model?.__data?.rpi
        // var rpinx = e.model.__data.rpindex
        this.api_action = 'itemsinfo-save'
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        // this.set(`dialogproductinfo.Items.${rpinx}.QAApprovedConfirmed`, true)
        if (rpi) { rpi.QAApproved = false }
        var obj: any = {
            ManufactureOrderID: this.dialogproductinfo.ManufactureOrderID,
            ManufactureItemSetID: this.dialogproductinfo.ManufactureItemSetID,
            ID: this.dialogproductinfo.ID,
            Items: this.dialogproductinfo.Items,
        }

        // this.set('dialogproductinfo.loading', true)
        if (progress) { progress.active = true }
        this.cmdPost(this.api_url, obj, (result, r) =>
        {
            if (progress) { progress.active = false }
            // this.set('dialogproductinfo.loading', false)

            // console.log(result, r)
            if (!r) { return }

            if (r['success'] === true)
            {
                // console.log(result)
                // result.Items = result.Items.slice(0, 1)
                this.set('dialogproductinfo', this._prepare_dialogproductinfo(result))
            }
            else if (r['success'] === false)
            {
                // var s = r['summary']
                // if (s && (s.Key == 'validation_fail'))
                // {
                //     this._applyDetailsErrors('order', r['details'])
                // }
            }
            else if (r['error'])
            {
                this._onError(null, r['error'])
            }
        })
    }


    _itemIsDefect(rpi)
    {
        return this._asBool(rpi.DefectedReason)
    }

    _processTitle(id)
    {
        return id
    }

    _processColor(id)
    {
        return id
    }

    _batchSamChart: any
    _buildChart(orderStandardAllocatedMinutes, orderStandardAllocatedMinutesP)
    {
        if (!Array.isArray(orderStandardAllocatedMinutes)) { return }

        var chartColors = {}
        var chartColorsBkg = {}
        for (var sami in orderStandardAllocatedMinutes)
        {
            var samID = orderStandardAllocatedMinutes[sami].ID
            
            const max = COLORS_KEYS.length - 1
            var hash = 0, i, chr
            for (i = 0; i < samID.length; i++)
            {
                chr = samID.charCodeAt(i)
                hash = ((hash << 5) - hash) + chr
                hash |= 0 // Convert to 32bit integer
            }
            
            var inx = Math.abs(hash * (i + 1) * 6) % max
            var colorkey = COLORS_KEYS[inx]
            chartColors[samID] = Color.css_hex2rbg(UICOLORS[colorkey])
            chartColorsBkg[samID] = Color.css_hex2rbg(UICOLORS[colorkey], 0.3)
        }

        var barChartData: any = {}
        barChartData.labels = orderStandardAllocatedMinutes.map((processi, index, array) => 
        {
            return this._processTitle(processi.ID)
        })
        barChartData.datasets = [{
            axis: 'y',
            label: 'Standard Allocated Minutes',
            data: orderStandardAllocatedMinutes.map((processi, index, array) => { return processi.minutes }),
            fill: false,
            backgroundColor: orderStandardAllocatedMinutes.map((processi, index, array) => { return chartColorsBkg[processi.ID] }),
            borderColor: orderStandardAllocatedMinutes.map((processi, index, array) => { return chartColors[processi.ID] }),
            borderWidth: 1
        }]

        if (this._batchSamChart)
        {
            //update
            this._batchSamChart.data = barChartData
            this._batchSamChart.options.animation = false
            this._batchSamChart.update()
        }
        else
        {
            //create
            var tierChartEl = this.shadowRoot?.querySelector('#batchSAMChart')
            var ctx = (tierChartEl as HTMLCanvasElement).getContext('2d')

            const chartConf = {
                type: 'bar',
                data: barChartData,
                options: {
                    indexAxis: 'y',
                    responsive : true,
                    // Elements options apply to all of the options unless overridden in a dataset
                    // In this case, we are setting the border of each horizontal bar to be 2px wide
                    elements: {
                      bar: {
                        borderWidth: 2,
                      }
                    },
                    plugins: {
                        legend: false,
                        title: {
                            display: true,
                            text: 'Processes Standard Allocated Minutes'
                        }
                    },
                },
            }

            this._batchSamChart = new Chart(ctx, chartConf)
        }
    }
}
