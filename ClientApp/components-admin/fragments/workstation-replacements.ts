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
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-combo-box/vaadin-combo-box.js'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { IAdminSignalR_ReplacementsProgress } from '../../components/bll/signalr-global'
import view from './workstation-replacements.ts.html'
import style from './workstation-replacements.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/paper-expansion-panel'
import '../../components/ui/ui-quantity'
import '../../components/ui/ui-select'
import '../ui/ui-scanner-printer-settings'
import '../ui/production-sewing-item'
import '../ui/ui-dropdown-menu'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { PaperCheckboxElement } from '@polymer/paper-checkbox/paper-checkbox'
const Teamatical: TeamaticalGlobals = window['Teamatical']



@WorkstationDynamic
class AdminWorkstationReplacements extends WorkstationBase implements IAdminSignalR_ReplacementsProgress
{
    static get is() { return 'tmladmin-workstation-replacements' }

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

            order: { type: Object },

            // APIPath: { type: String, value: '/admin/api/workstation/sewing-' },
            APIPath: { type: String, value: '/admin/api/workstation/replacements-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            queryParamsRequired: { type: Object, value: [] },
            queryParamsDefault: { type: Object, value: {} },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },

            tabletMode: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },

            zoomimgi: { type: Object },
            dialogconfirmreplaceroll: { type: Object },

            disabledPush: { type: Boolean, computed: '_compute_disabledPush(loadingAny, order.CurrentBatch.Items, order.CurrentBatch.IsNotAllowedPush)' },
            hiddenNoBatch: { type: Boolean, computed: '_computeHiddenNoBatch(order.CurrentBatch, loading)' },
            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers)' },
            reasonTypeList:  { type: Array, computed: '_compute_reasonTypeList(order.Reasons)' },

            dialogcount: { type: Object, value: {}, notify: true },
            dialogunfreeze_reason: { type: String },
            previewPrinting: { type: Object },
            lazyObserve: { type: Object },
        }
    }

    _netbase: any
    _observer: any
    loading: any
    env: any
    dialogunfreeze_reason: any
    previewPrinting: any
    dialogcount: any
    zoomimgi: any
    dialogconfirmreplaceroll: any


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_tabletDetection(queryParams.tablet)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
            // '_reasonUpdated(order.CurrentBatch.Items.*)',
            // '_log(dialogcount.*)',
        ]
    }
    _log(v) { console.log(v) }

    get scannerprintersettings() { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get dialogpush_spotcolors() { return this.$.dialogpush_spotcolors as PaperCheckboxElement }
    

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    SR_TaskProgressHandler(pobj: any)
    {
        if (!this.order || !this.order.CurrentBatch || !Array.isArray(this.order.CurrentBatch.Tasks) || !pobj || !pobj.TaskID) { return }

        var curB = this.order.CurrentBatch
        var inx = -1
        var task = curB.Tasks.filter((i, ix, arr) => { 
            if (i.TaskID == pobj.TaskID)
            {
                inx = ix
                return true
            }
            return false
        })
        
        if (task.length == 1 && pobj.Finished === true)
        {
            this.splice('order.CurrentBatch.Tasks', inx, 1)
            this.async(() =>
            {
                this.api_action = 'get'
                this._fetchItems(3, null, this._requestObject(this.order))
            }, 350)
        }
        // console.log(pobj)

        if (!Array.isArray(curB.Tasks)) { this.set('order.CurrentBatch.Tasks', []) }
        if (inx >= 0)
        {
            this.set('order.CurrentBatch.Tasks.' + inx + '.ExecutingOperation', pobj.ExecutingOperation)
            this.set('order.CurrentBatch.Tasks.' + inx + '.ExecutingOperationProgress', pobj.ExecutingOperationProgress)
            this.set('order.CurrentBatch.Tasks.' + inx + '.ExecutingTimeMiliseconds', pobj.ExecutingTimeMiliseconds)
        }
        else
        {
            this.push('order.CurrentBatch.Tasks', pobj)
        }
    }

    SR_OrderListHandler(oobj: any)
    {
        if (this.order?.EventSenderID && this.order?.EventSenderID == oobj?.EventSenderID) { return }
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order))
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

    //event call from tablet (app-admin)
    onBarcode(barcode)
    {
        this.async(() =>
        {
            var efake = { target: { parentElement: { value: barcode } } }
            this._barcodeTap(efake)
        })
        return true
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

    _barcodeTap(e)
    {
        super._barcodeTap(e)

        if (!e.target || !e.target.parentElement || !e.target.parentElement.value || e.target.parentElement.value.trim() == '') { return }


        var repObj = Object.assign({}, this._requestObject(this.order), {
            Barcode: e.target.parentElement.value,
            loading: true,
            index: 0
        })
        this.api_action = 'get'

        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.set('order', r['result'])
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


	_onLoadResult(order: any) 
	{
		var reasonCategorized = {}
		var reasonCategoryTitles = {}
		for (var i in order.Reasons)
		{
			if (!reasonCategorized[order.Reasons[i].categoryID])
			{
				reasonCategorized[order.Reasons[i].categoryID] = []
				reasonCategoryTitles[order.Reasons[i].categoryID] = order.Reasons[i].categoryTitle
			}
			reasonCategorized[order.Reasons[i].categoryID].push({
				id: order.Reasons[i].id,
				title: order.Reasons[i].title,
			})
		}
		order.ReasonCategorized = Object.keys(reasonCategorized).map(i => {
			return {
				id: i,
				title: reasonCategoryTitles[i],
				reasons: reasonCategorized[i],
			}
		})
		// console.log(order.ReasonCategorized)
		return order
	}

	//
    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        //set ui by default value
        if (order.CurrentBatch)
        {
            this.async(() =>
            {
                this.set('order.CurrentBatch.BatchID1', order.CurrentBatch.BatchID)
            }, 17)


            if (this.order?.CurrentBatch?.Items)
            {
                var rev = this.order.CurrentBatch.Items.reverse()
                // for (var i in rev)
                // {
                //     rev[i].ReasonType = Object.assign({}, rev[i].Reason)
                // }
                this.set('order.CurrentBatch.Items', rev)
            }
        }

        if (order.ManufactureOrders)
        {
            for (var i in order.ManufactureOrders)
            {
                order.ManufactureOrders[i].Batches = order.ManufactureOrders[i].Batches.reverse()
            }
        }
    }

    _compute_reasonTypeList(order_Reasons)
    {
        if (!Array.isArray(order_Reasons) && order_Reasons?.length < 1) { return [] }
        var types: any = {}
        var lasti = { id: '-' }
        var _prefix = (id) => {
            var l = id.indexOf('.')
            if (l >= 0) { return id.substring(0, l) }
            return id
        }
        for (var i in order_Reasons)
        {
            var prefi = _prefix(order_Reasons[i].id)
            if (prefi != _prefix(lasti.id))
            {
                var l = order_Reasons[i].title.indexOf(' - ')
                var tit =  l >=0 ? order_Reasons[i].title.substring(0, l) : order_Reasons[i].title
                var ty = { id: prefi, title: tit }
                if (ty.id == 'digital_defect') { ty.title = 'Digital Defect'}
                if (ty.id == 'fabric_defect') { ty.title = 'Fabric Defect'}
                if (ty.id == 'print_defect') { ty.title = 'Print Defect'}
                if (ty.id == 'transfer') { ty.title = 'Transfer'}
                if (!types[prefi])
                {
                    types[prefi] = ty            
                }
            }
            lasti = order_Reasons[i]
        }
        return Object.keys(types).map((key) => { return {id: types[key].id, title: types[key].title } })
    }

    _compute_disabledPush(loadingAny, repItems, disallow)
    {
        // var disallow = Array.isArray(repItems) ? repItems.filter(i => { return i.UnfrozenPDF === true }) : []
        return loadingAny || !repItems || repItems.length < 1 || disallow
    }

    _computeHiddenNoBatch(currentBatch, loading)
    {
        return this._asBool(currentBatch) || loading == true
    }


    _computeShowManufacturers(manlist)
    {
        return manlist
    }

    _batchName(batchID)
    {
        return batchID
    }

    selectBatchTap(e)
    {
        //
    }

    onSelectedBatch(e)
    {
        if (!e || !e.detail || !e.detail.value || !e.detail.value.__dataHost || !e.detail.value.__dataHost.__data) { return }
        var batchi = e.detail.value.__dataHost.__data.batchi

        if (this.order?.CurrentBatch?.BatchID != batchi.BatchID)
        {

            this.api_action = 'get'
            var obj = Object.assign({}, this._requestObject(this.order), { 
                Barcode: '',  
                CurrentBatch: batchi, 
            })
            this._fetchItems(3, null, obj)
            var qp = { 'batch-id': batchi.BatchID, 'm-id': batchi.ManufactureOrderID }
            window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
        }

        if (this.visible) 
        {
            this.async(() => 
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
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }

    _fetchItems(attempts, oid?, qp1?, callback?)
    {
        let contextFields = ['SubscriptionsState']
        
        if (this.api_action == 'get' && this.queryParams != undefined && !this.order?.CurrentBatch && this.queryParams['batch-id'] && this.queryParams['m-id'] )
        {
            this.queryParams['CurrentBatch'] = { BatchID: this.queryParams['batch-id'], ManufactureOrderID: this.queryParams['m-id'] }
        }
        
        super._fetchItems(attempts, oid, qp1, callback, false, contextFields)
    }

    _requestObject(order)
    {
        if (!order) { return order }

        var r = {
            Barcode: order.Barcode,
            SubscriptionsState: order.SubscriptionsState,
            CurrentBatch: { 
                BatchID: order.CurrentBatch?.BatchID,
                ManufactureOrderID: order.CurrentBatch?.ManufactureOrderID, 
            },
            ProductBarcode: order.ProductBarcode,
            Manufacturer: order.Manufacturer,
        }
        if (!r.CurrentBatch.BatchID) { delete r.CurrentBatch }
        // console.log(order, r)
        return r
    }

    _addRepAllTap(e)
    {
        if (this.order?.CurrentBatch?.IsAllowedCount)
        {
            this.set('dialogcount.parti', { all: true })
            this.set('dialogcount.parti.Count', 1)
            this._openDlg(this.$.dialogcount as PaperDialogElement)
        }
        else
        {
            this._addRepAll({Count: 1})
        }
    }

    _addRepAll(parti)
    {
        this.api_action = 'product-add'
        var obj = Object.assign({}, this._requestObject(this.order), {
            Count: parti.Count,
        })
        this._fetchItems(1, null, obj,
            (order) =>
            {
                // console.log(order)
            }
        )
    }

    _removeRepTap(e)
    {
        if (!Array.isArray(this.order.CurrentBatch.Items)) { return }
        var repli = e.model.__data.repli
        this.api_action = 'item-remove'
        var obj = Object.assign({}, this._requestObject(this.order), { 
            Barcode: repli.ItemID 
        })
        this._fetchItems(1, null, obj, () =>
        {
            //
        })
    }

    _addRepTap(e)
    {
        var parti = e.model.__data.parti

        if (this.order?.CurrentBatch?.IsAllowedCount)
        {
            this.set('dialogcount.parti', parti)
            this.set('dialogcount.parti.Count', 1)
            this._openDlg(this.$.dialogcount as PaperDialogElement)
        }
        else
        {
            this._addRep(parti)
        }
    }

    _addRepConfirmTap(e)
    {
        var parti = this.dialogcount.parti
        if (parti.all)
        {
            this._addRepAll(parti)
        }
        else
        {
            this._addRep(parti)
        }
        // console.log(this.dialogcount.parti)
        
    }

    _addRep(parti)
    {
        this.api_action = 'item-add'
        var obj = Object.assign({}, this._requestObject(this.order), { 
            Barcode: parti.Barcode,
            Count: parti.Count,
        })
        this._fetchItems(1, null, obj, (order) =>
        {
            if (order?.IsDuplicate)
            {
                this.showToast(this.localize('admin-ws-roll-inspection-toast-part-isduplicate', 'barcode', obj.Barcode))
            }
            else
            {
                this.showToast(this.localize('admin-ws-roll-inspection-toast-part', 'barcode', obj.Barcode))
            }
        })
    }

    pushReplacementsConfirmTap(e)
    {
        var obj = Object.assign({}, this._requestObject(this.order), { 
            spotcolors: this.dialogpush_spotcolors.checked,
        })
        this.dialogcancel_reason = ''
        this.api_action = 'push'
        this._fetchItems(1, null, obj, () =>
        {
            //
        })
    }

    pushReplacementsTap(e)
    {
        this.dialogpush_spotcolors.checked = this.order.spotcolors
        this._openDlg(this.$.dialogpush as PaperDialogElement)
    }

    _isBackBtn(backurl, ws)
    {
        // console.log(backurl, ws)
        if (!backurl || !ws) { return false }
        return backurl.indexOf(ws) >= 0
    }

    onProductPartImageTap(e)
    {
        var repli = e.model.__data.repli
        // console.log(e.model.__data)
        this.zoomimgi = repli
        this._openDlg(this.$.dialogzoom as PaperDialogElement)
    }

    _disabledReplaceRoll(loadingAny, repliDisabled)
    {
        return loadingAny || repliDisabled
    }

    _onReplaceRollTap(e)
    {
        var repli = e.model.__data.repli
        var rinx = e.model.__data.index
        this.dialogconfirmreplaceroll = { repli: repli, index: rinx }
        this._openDlg(this.$['dialogconfirm-replaceroll'] as PaperDialogElement)
    }

    replacerollConfirmTap(e)
    {
        if (!Array.isArray(this.order.CurrentBatch.Items)) { return }
        var repli = this.dialogconfirmreplaceroll.repli
        this.api_action = 'replace-roll'
        var obj = Object.assign({}, this._requestObject(this.order), { 
            ItemID: repli.ItemID,
        })
        this._fetchItems(1, null, obj, (order) =>
        {
            //
        })
    }

    _reasonSelectorChanged(e)
    {
        var repli = e?.model?.repli
        // console.log(e, repli)
        this.async(()=>
        {
            // console.log(repli)
            var repObj = Object.assign({}, repli)
            this.api_action = 'item-set-reason'
            this.cmdPost(this.api_url, repObj, (result, response, rq) =>
            {
                var setSingleItem = (curbatch, robj, result) => 
                {
                    for (var i in this._asArrayIfEmpty(curbatch.Items))
                    {
                        if (curbatch.Items[i]?.ItemID == robj.ItemID)
                        {
                            this.set(`order.CurrentBatch.Items.${i}`, result)
                            break
                        }
                    }
                }
                var r = response
                if (r)
                {
                    if (r['result'])
                    {
                        setSingleItem(this.order.CurrentBatch, repObj, r['result'])
                    }
                    else if (r['error'])
                    {
                        this._onError(null, r['error'])
                    }
                }
            }, false)
        }, 17)
    }

    _reasonIcon(reasonid)
    {
		var ricon = ''
        if (reasonid)
        {
            var reasonidAr = reasonid.split('.')
            switch (reasonidAr[0])
            {
				case 'empty':			ricon = ''; break
                case 'digital':			ricon = 'admin-hardware:memory'; break
                case 'fabric':			ricon = 'admin-icons:fabric-roll'; break
				case 'transfer':		ricon = 'admin-icons:status-transferring'; break
                case 'designer':		ricon = 'admin-image:broken-image'; break
                case 'graphic':			ricon = 'admin-icons:status-spotcolors'; break
                case 'cutting':			ricon = 'admin-icons:status-cutting'; break
                case 'sewing':			ricon = 'admin-icons:sewing-machine'; break
                case 'heat_transfer':	ricon = 'admin-icons:heat-transfer'; break
                case 'system':			ricon = 'admin-image:gradient'; break
                // case "print_defect":        ricon = 'admin-icons:print'; break 
            }

        }
        return ricon
    }

	_noneFlag(isFullRollReplacement, isDuplicate, disabled, unfrozenPDF, bounding)
	{
		return isFullRollReplacement || isDuplicate || disabled || unfrozenPDF || bounding
	}
}
