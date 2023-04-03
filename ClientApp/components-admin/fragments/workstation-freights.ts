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
import '@polymer/paper-fab/paper-fab.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import '@vaadin/vaadin-date-time-picker/vaadin-date-time-picker'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency, getArrItemSafe, convertLocalDateTimeISO } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { IAdminSignalR_FreightsProgress } from '../../components/bll/signalr-global'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import view from './workstation-freights.ts.html'
import style from './workstation-freights.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
// import '../ui/ui-progress-icon'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dialog'
import '../ui/ui-dropdown-menu'
import '../ui/production-sewing-item'
import { UIAdminDialog } from '../ui/ui-dialog'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { elementIsScrollLocked } from '@polymer/iron-overlay-behavior/iron-scroll-manager'
import { PaperItemElement } from '@polymer/paper-item/paper-item'
// import '../ui/ui-scanner-printer-settings'
// import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const AdminWorkstationFreightsBase = mixinBehaviors([IronResizableBehavior], WorkstationBase) as new () => WorkstationBase & IronResizableBehavior

@WorkstationDynamic
class AdminWorkstationFreights extends AdminWorkstationFreightsBase implements IAdminSignalR_FreightsProgress
{
    static get is() { return 'tmladmin-workstation-freights' }

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
            scrollTarget: { type: String, },

            order: { type: Object, notify: true },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/workstation/freights-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            queryParamsRequired: { type: Object, value: [] },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },

            hiddenNoItemsYet: { type: Boolean, computed: '_compute_hiddenNoItemsYet(order.CurrentFreight, loading)' },
            showManufacturers: { type: Boolean, computed: '_compute_showManufacturers(order.Manufacturers)' },
            disabledSave: { type: Boolean, computed: '_compute_disabledSave(hasUnsavedChanges, loadingAny)'},

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode

            lazyObserve: { type: Object },
            newfreight: { type: Object, },
            departureDateTime: { type: Object, },
            containerlabel: { type: Object },
        }
    }

    _lastHistState: any
    _openDebounce: Debouncer
    _setModelLock: boolean
    _suppressHistory: boolean
    _suppressReload: boolean
    newfreight: any
    hasUnsavedChanges: boolean


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
        ]
    }
    _log(v) { console.log(v) }

    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get newfreight_dialog() { return this.$['newfreight_dialog'] as UIAdminDialog }


    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))

        this.addEventListener('iron-resize', (e) => this._onResized(e))
        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())

        if (window.history)
        {
            this._openDebounce = Debouncer.debounce(this._openDebounce, microTask, () =>
            {
                this._lastHistState = window.history.state
                var url = new URL(window.location.href)
                url.hash = ''
                window.history.replaceState(null, '', url.href)
            })
        }
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this._onSaveTap()
        }
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        try { var saved = JSON.parse(orderSaved) } catch {}
        if (!saved) { return true }

        var v = false
        if (saved.CurrentFreight?.Name != order.CurrentFreight?.Name) { v = true }
        if (saved.CurrentFreight?.TrackNumber != order.CurrentFreight?.TrackNumber) { v = true }
        if (saved.CurrentFreight?.Carrier?.id != order.CurrentFreight?.Carrier?.id) { v = true }
        if (saved.CurrentFreight?.Name != order.CurrentFreight?.Name) { v = true }
        if (saved.CurrentFreight?.DepartureDateTime?.ms != order.CurrentFreight?.DepartureDateTime?.ms) { v = true }
        if (order?.CurrentFreight?.Containers && saved?.CurrentFreight?.Containers)
        {
            var otracks = order.CurrentFreight.Containers.map(i => i.TrackNumber || '')
            var stracks = saved.CurrentFreight.Containers.map(i => i.TrackNumber || '')
            if (JSON.stringify(otracks) != JSON.stringify(stracks)) { v = true }
        }
        return v
    }

    SR_FreightChangedHandler(oobj: any)
    {
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order), () =>
        {
            //
        })
    }

    SR_FreightsListChangedHandler(oobj: any)
    {
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order), () =>
        {
            //
        })
    }

    reload()
    {
        if (!this._suppressReload)
        {
            super.reload()
        }
    }

    _requestObject(order)
    {
        if (!order) { return order }

        var r = {
            // Barcode: order.Barcode,
            SubscriptionsState: order.SubscriptionsState,
            CurrentFreight: {
                ETag: order.CurrentFreight?.ETag,
                FreightID: order.CurrentFreight?.FreightID,
                DepartureDateTime: order.CurrentFreight?.DepartureDateTime,
            },
            Manufacturer: order.Manufacturer,
        }
        return r
    }

    _spdReceivePacket(e: CustomEvent)
    {
        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'barcodescanned' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.Data
            // res.DataType
            // res.ScannerID
            var efake = { target: { parentElement: { value: res.Data } } }
            // console.log(efake)
            this._barcodeTap(efake)
        }
    }

    _barcodeEnter(e)
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

    _fetchItemsActionLast: any
    _barcodeTap(e)
    {
    	super._barcodeTap(e)
        if (!e.target || !e.target.parentElement || !e.target.parentElement.value || e.target.parentElement.value.trim() == '') { return }

        var scanners = this.scannerprintersettings.getScanners()
        var scannerIndex = 0
        if (scanners && e.ScannerID)
        {
            for (var i in scanners)
            {
                if (scanners[i] && scanners[i].ID == e.ScannerID)
                {
                    scannerIndex = parseInt(i, 10)
                    break
                }
            }
        }

        var repObj = Object.assign({}, this._requestObject(this.order), {
            Barcode: e.target.parentElement.value,
            // loading: true,
            BarcodeReaderIndex: scannerIndex,
            BarcodeReadersCount: scanners ? scanners.length : 0,
        })

        repObj.index = 0
        this.api_action = 'add'
        this._fetchItemsActionLast = this._now()
        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this._setModelLock = true
                    this.set('order', r['result'])
                    this._saveOrderForUnsavedComparison(this.order)
                    this._setModelLock = false
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

        }, false)

        e.target.parentElement.value = ''
        this.showToast(repObj.Barcode)
    }

    _dis_departurelabel(loading, shippingDepartureLabelImageUrl0)
    {
        return loading || this._asBool(shippingDepartureLabelImageUrl0)
    }

    _hide_departurelabel(shippingDepartureLabelImageUrl0)
    {
        return this._asBool(shippingDepartureLabelImageUrl0)
    }

    _hide_cancel_departurelabel(shippingDepartureLabelImageUrl0)
    {
        return !this._asBool(shippingDepartureLabelImageUrl0)
    }

    _dis_cancel_departurelabel(loading, shippingDepartureLabelImageUrl0)
    {
        return loading || !this._asBool(shippingDepartureLabelImageUrl0)
    }

    _dis_departuredate(loading, shippingDepartureLabelImageUrl0)
    {
        return loading || this._asBool(shippingDepartureLabelImageUrl0)
    }

    _dis_departurecarrier(loading, shippingDepartureLabelImageUrl0)
    {
        return loading || this._asBool(shippingDepartureLabelImageUrl0)
    }

    _dis_printdeparturelabel(loading, shippingDepartureLabel)
    {
        return loading || !this._asBool(shippingDepartureLabel)
    }

    // _dis_printdeparturelabel_list(loading, containers)
    // {
    //     var hasAtLeastOneLabel = false
    //     if (Array.isArray(containers))
    //     {
    //         for (var i in containers)
    //         {
    //             if (this._asBool(containers[i]?.ShippingDepartureLabelImageUrl))
    //             {
    //                 hasAtLeastOneLabel = true
    //                 break
    //             }
    //         }
    //     }
    //     return loading || !hasAtLeastOneLabel
    // }

    _dis_buildreport(loading, shippingDepartureLabel)
    {
        return loading || !this._asBool(shippingDepartureLabel)
    }

    _dis_buildreportairfreight(loading, carrierServerID, shippingDepartureLabel)
    {
        return loading || carrierServerID == 'na' || !this._asBool(shippingDepartureLabel)
    }

    _dis_dispose(loading, isDisposable)
    {
        return loading || !isDisposable
    }

    selectFreightMenuTap(e)
    {
        //
    }

    onSelectedFreight(e)
    {
        if (!e || !e.detail || !e.detail.value || !e.detail.value.__dataHost || !e.detail.value.__dataHost.__data) { return }
        var freighti = e.detail.value.__dataHost.__data.freighti

        if (this.order?.CurrentFreight?.FreightID != freighti?.FreightID)
        {
            this.order.CurrentFreight = freighti
            this.api_action = 'get'
            this._fetchItems(3, null, this._requestObject(this.order), () =>
            {
                //
            })

            var qp = { 'frieght-pt-id': freighti.FreightID }
            window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
        }
    }

    _compute_hiddenNoItemsYet(currentItem, loading)
    {
        return this._asBool(currentItem) || loading == true
    }

    _compute_showManufacturers(manlist)
    {
        return manlist
    }

    _compute_disabledSave(hasUnsavedChanges, loadingAny)
    {
        return !hasUnsavedChanges || loadingAny
    }

    _freightMenuName(freightID, freightName)
    {
        return freightName
    }

    addNewFreightDialogTap(e?)
    {
        if (this.newfreight_dialog)
        {
            this.newfreight = {}
            this.newfreight_dialog.open()
            this.async(() => 
            {
                try
                { 
                    this.newfreight_dialog.querySelector('paper-input').focus() 
                }
                catch {}
            }, 170)
        }
    }

    addNewFreightTap(e?)
    {
        var freightnew = this.newfreight.Name
        if (!freightnew || !freightnew.trim || freightnew.trim() == '') { return }
        var freightnewTrim = freightnew.trim()
        if (freightnewTrim.indexOf("d~") == 0)
        {
            freightnewTrim = "d~" + StringUtil.replaceAll(freightnewTrim, "d~", "").toUpperCase()
        }
        else
        {
            freightnewTrim = freightnewTrim.toUpperCase()
        }

        this.api_action = 'new'
        var obj = Object.assign(this._requestObject(this.order), { 
            NewFreight: { 
                Name: freightnewTrim,
                // DepartureDateTime: freightnew.DepartureDateTime,
            },
        })
        // console.log(obj)
        this._fetchItems(1, null, obj, () => {
            ///
        })


        if (e?.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    _removeContainerTap(e)
    {
        var containeri = e.model.__data.containeri

        this.api_action = 'remove-container'
        var obj = Object.assign(this._requestObject(this.order), { 
            RemoveContainerID: containeri.ID,
        })
        this._fetchItems(1, null, obj, () => {
            ///
        })
    }

    _onDeparturedDialogTap(e)
    {
        this._openDlg(this.$.dialogdepartured as PaperDialogElement)
    }

    _onDeparturedTap(e)
    {
        this.api_action = 'departured'
        var obj = Object.assign(this._requestObject(this.order), { 
            //
        })
        this._fetchItems(1, null, obj, () => {
            ///
        })
    }

    _onCancelDepartureLabelDialogTap(e)
    {
        this._openDlg(this.$.dialogcanceldeparturelabel as PaperDialogElement)
    }

    _onCancelDepartureLabelTap(e)
    {
        this.api_action = 'ship-label-cancel'
        var obj = Object.assign(this._requestObject(this.order), { 
            //
        })
        this._fetchItems(1, null, obj, () => {
            ///
        })
    }

    _onDisposeDialogTap(e)
    {
        this._openDlg(this.$.dialogdispose as PaperDialogElement)
    }

    _onDisposeTap(e)
    {
        this.api_action = 'dispose'
        var obj = Object.assign(this._requestObject(this.order), { 
            //
        })
        this._fetchItems(1, null, obj, (order) => 
        {
            // console.log(order)
            if (order.CurrentFreight.IsDisposed)
            {
                this.reload()
            }
        })
    }

    _onDepartureLabelDialogTap(e)
    {
        this._openDlg(this.$.dialogdeparturelabel as PaperDialogElement)
    }

    _onDepartureLabelTap(e)
    {
        this.api_action = 'ship-label'
        var obj = Object.assign(this._requestObject(this.order), { })
        var curfreight = this.order?.CurrentFreight
        if (!curfreight || ! obj) { return }

        obj.CurrentFreight = Object.assign(obj.CurrentFreight, { 
            Name: curfreight.Name,
            TrackNumber: curfreight.TrackNumber,
            DepartureDateTime: curfreight.DepartureDateTime,
            Carrier: curfreight.Carrier,
            Containers: !Array.isArray(curfreight.Containers) ? [] : curfreight.Containers.map(i => { return { ID: i.ID, TrackNumber: i.TrackNumber }}),
        })

        this._fetchItems(1, null, obj, () => {
            ///
        })
    }

    _onSaveTap(e?)
    {
        this.api_action = 'save'
        var obj = Object.assign(this._requestObject(this.order), { })
        var curfreight = this.order?.CurrentFreight
        if (!curfreight || ! obj) { return }

        obj.CurrentFreight = Object.assign(obj.CurrentFreight, { 
            Name: curfreight.Name,
            TrackNumber: curfreight.TrackNumber,
            DepartureDateTime: curfreight.DepartureDateTime,
            Carrier: curfreight.Carrier,
            Containers: !Array.isArray(curfreight.Containers) ? [] : curfreight.Containers.map(i => { return { ID: i.ID, TrackNumber: i.TrackNumber }}),
        })
        
        this._fetchItems(1, null, obj, () => {
            ///
        })
    }

    async _onBuildShipInvoiceTap(e)
    {
        this.api_action = 'ship-invoice'
        var obj = Object.assign(this._requestObject(this.order), { 
            //
        })
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        await this.cmdPostDownload(this.api_url, obj)
        progress.active = false

        if (e?.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    async _onBuildReportAirFreightTap(e)
    {
        this.api_action = 'build-report-airfreight'
        var obj = Object.assign(this._requestObject(this.order), { 
            //
        })
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        await this.cmdPostDownload(this.api_url, obj)
        progress.active = false

        if (e?.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }


    _fetchItems(attempts, oid?, qp1?, callback?)
    {
        let contextFields = ['SubscriptionsState']
        if (this.api_action == 'get' && this.queryParams != undefined && !this.order?.CurrentFreight && this.queryParams['frieght-pt-id'])
        {
            qp1 = { CurrentFreight: { FreightID: this.queryParams['frieght-pt-id'] } }
        }
        super._fetchItems(attempts, oid, qp1, callback, false, contextFields)
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        //set ui by default value
        if (order.CurrentFreight)
        {
            this.async(() =>
            {
                var dt = new Date()
                this.set('order.CurrentFreight.FreightID1', order?.CurrentFreight?.FreightID)
                this.set('order.CurrentFreight.NameServer', order?.CurrentFreight?.Name)
                this.set('order.CurrentFreight.CarrierServerTitle', order?.CurrentFreight?.Carrier?.title)
                this.set('order.CurrentFreight.CarrierServerID', order?.CurrentFreight?.Carrier?.id)
                var isodt = convertLocalDateTimeISO(order?.CurrentFreight?.DepartureDateTime?.ms) //2021-12-23T03:00:00.000Z
                this.set('order.CurrentFreight.DepartureDateTime', { ms: order?.CurrentFreight?.DepartureDateTime?.ms, tz: dt.getTimezoneOffset() })
                var vaadindt = `${isodt.substr(0, 16)}` //2021-12-10T01:30
                this.set('departureDateTime', vaadindt)

                // this.set('order.CurrentFreight.Containers.0.DepartureWarningList', [
                //     { WarningKey:'1', WarningMessage: 'Hub is wrong', },
                //     { WarningKey:'1', WarningMessage: 'Container is not completed', WarningImage: order.CurrentFreight.Containers[0].ShippingLabelImageUrl},
                // ])
                
            }, 170)
        }
    }
    
    
    containerlabel: any
    showContainerLabelTap(e)
    {
        var deparwarni = e.model.__data.deparwarni
        this.containerlabel = { 
            Title: deparwarni?.WarningMessage,
            Alt: deparwarni?.WarningKey, 
            ImageUrl: deparwarni?.WarningImage,
        }
        this._openDlg(this.$.dialog_containerlabel as PaperDialogElement)
    }

    _onResized(e?)
    {
        //
    }

    onHistoryPopstate(e)
    {
        e = e || window.event

        if (this._suppressHistory) { return }
        this._suppressHistory = true

        //

        this._suppressHistory = false
    }

    _onKeydownEvent(e)
    {
        if (!this.visible) { return }

        e = e || window.event
        // console.log(e)
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!e.ctrlKey && !e.altKey && e.shiftKey && keyboardEventMatchesKeys(e, 'n'))
        {
            this.addNewFreightDialogTap()
        }
        if (keyboardEventMatchesKeys(e, 'enter') && this.newfreight_dialog && this.newfreight_dialog.opened)
        {
            this.newfreight_dialog.confirm()
            this.addNewFreightTap()
            e.preventDefault()
            e.stopPropagation()
        }
        // else if (e.ctrlKey && !e.altKey && !e.shiftKey && keyboardEventMatchesKeys(e, 'p') && this._asBool(this.order.CurrentFreight.PapersReport))
        // {
        //     this._onPapersReportTap()
        //     e.preventDefault()
        //     e.stopPropagation()
        // }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            this._onSaveTap()
            e.preventDefault()
            e.stopPropagation()
        }        
    }

    printCarrierLabelTap(e)
    {
        var containeri = e.model.__data.containeri
        this.scannerprintersettings.printCarrierLabel(containeri.ShippingDepartureLabel)
        this.showToast('Labels have been sent to printer')
    }

    printCarrierFreightLabelTap(e)
    {
        //e.target.__dataHost.__data.order
        var curfreight = this.order?.CurrentFreight
        if (curfreight?.Label)
        {
            this.scannerprintersettings.printCarrierLabel(curfreight.Label)
            this.showToast('Labels have been sent to printer')
        }
    }

    // printCarrierLabelListTap(e?)
    // {
    //     var contrs = this.order?.CurrentFreight?.Containers
    //     if (!Array.isArray(contrs)) { return }
    //     var zpl = ''
    //     for(var i in contrs)
    //     {
    //         if (typeof(contrs[i]?.ShippingDepartureLabel) == 'string') { zpl += `{contrs[i].ShippingDepartureLabel}` }
    //     }
    //     this.scannerprintersettings.printCarrierLabel(zpl)
    //     this.showToast('Label has been sent to printer')
    // }

    departureDateTimeChangedEvent(e)
    {
        var dt = new Date()
        try
        {
            var iso = e.target.value //2021-12-10T01:30
            dt.setTime(Date.parse(iso)) // + dt.getTimezoneOffset() * 60000)
            this.set('order.CurrentFreight.DepartureDateTime', { ms: dt.getTime(), tz: dt.getTimezoneOffset() })
        }
        catch
        {
            //
        }
    }

    onInputChanged(e)
    {
        var containeri = e.model?.__data?.containeri
        if (containeri)
        {
            var inx = e.model.__data.index
            this.notifyPath(`order.CurrentFreight.Containers.${inx}`)
        }

        return this._onInputChanged(e)
    }

    _useTrackNumberForAllContainersTap(e)
    {
        var track = e.target?.parentElement?.value
        if (!track) { return }
        // console.log(e)
        if (Array.isArray(this.order?.CurrentFreight?.Containers))
        {
            var shift = e.detail?.sourceEvent?.shiftKey && !e.detail?.sourceEvent?.ctrlKey && !e.detail?.sourceEvent?.altKey
            for (var i in this.order.CurrentFreight.Containers)
            {
                if (!this.order.CurrentFreight.Containers[i].TrackNumber || shift)
                {
                    this.set(`order.CurrentFreight.Containers.${i}.TrackNumber`, track)
                }
            }
        }
    }
}
