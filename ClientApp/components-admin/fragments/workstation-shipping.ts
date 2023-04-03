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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './workstation-shipping.ts.html'
import style from './workstation-shipping.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../ui/ui-scanner-printer-settings'
import '../ui/ui-dropdown-menu'
import '../ui/ui-barcode-input'
import { UIAdminBarcodeInput } from '../ui/ui-barcode-input'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { PaperSliderElement } from '@polymer/paper-slider/paper-slider.js'
// const Teamatical: TeamaticalGlobals = window['Teamatical']


@WorkstationDynamic
class AdminWorkstationShipping extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-shipping' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true, },
            env: { type: String },
            smallScreen: { type: Object },

            order: { type: Object },
            selectedBatchID: { type: Object },

            APIPath: { type: String, value: '/admin/api/workstation/shipping-' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            api_keepupdated: { type: Boolean, value: true },
            api_subscribe: { type: Boolean },
            api_summary_keys_hide: { type: Object, value: { 'validation_fail': 1, 'ship_svc_error': 1, 'cant_cancel': 1, 'bad_pack_for_split': 1, 'bad_pack_for_ship_label': 1 } },

            queryParamsRequired: { type: Object, value: [] },
            queryParamsAsObject: { type: Boolean, value: true },
            machineAuthorization: { type: Boolean, value: true, reflectToAttribute: true },

            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },
            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingWS: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_compute_loadingAnyOrBuffered(loading, loadingCmd, scannedBarcodes, scannedBarcodes.*)' },
            disabledBarcodeInput: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            scannedBarcodes: { type: Array, value: [] },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },
            recentWeight: { type: Number, value: -1, readOnly: true, },
            weightUnits: { type: String, notify: true },

            zoomimgi: { type: Object },
            dialogdisposepackage: { type: Object, value: {} },

            disabledDownload: { type: Boolean, computed: '_computeDisabledDownload(loading, order.Url, userInfo.isAdmin)' },
            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers, order.NoManufacturers)' },

            _hideSplit: { type: Boolean, computed: '_compute_hideSplit(order.CurrentPack.IsSplittable)' },
            _hideFinish: { type: Boolean, computed: '_compute_hideFinish(order.CurrentPack.IsSplittable, order.CurrentPack.NotPackedItemCount, order.CurrentPack.Items, order.PackageList)' },
            _hideFinishSingle: { type: Boolean, computed: '_compute_hideFinishSingle(order.CurrentPack.IsSingleItemsBucket, order.CurrentPack.IsSplittable, order.CurrentPack.Items)' },
            _hideShippingDropCurrent: { type: Boolean, computed: '_compute_hideShippingDropCurrent(order.CurrentPack.Items)' },

            _disabledSplit: { type: Boolean, computed: '_compute_disabledSplit(loadingAny, order.CurrentPack.IsSplittable)' },
            _disabledFinish: { type: Boolean, computed: '_compute_disabledFinish(loadingAny, order.CurrentPack.IsSplittable, order.CurrentPack.NotPackedItemCount, order.CurrentPack.Items, order.PackageList)' },
            _disabledFinishSingle: { type: Boolean, computed: '_compute_disabledFinishSingle(loadingAny, order.CurrentPack.IsSingleItemsBucket, order.CurrentPack.IsSplittable, order.CurrentPack.Items)' },
            _disabledShippingDropCurrent: { type: Boolean, computed: '_compute_disabledShippingDropCurrent(loadingAny, order.CurrentPack.Items)' },


            ShippingLabelImageFailedUrl: { type: String, value: '/images/workstations/shipping-label-failed.png' },

            relatedBarcodes: { type: Array, computed: '_compute_relatedBarcodes(order.CurrentPack.Items, order.PackageList)' },
        }
    }

    _netbase: any
    _observer: any
    loading: any
    env: any
    dialogdisposepackage: any
    relatedBarcodes: string[]

    
    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_currentPackChanged(order, order.CurrentPack)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
            // '_log(relatedBarcodes)',
        ]
    }
    _log(v) { console.log(v) }
    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }
    get barcodeinput() { return this.shadowRoot?.querySelector('#barcodeinput') as UIAdminBarcodeInput }


    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))

        if (this.barcodeinput)
        {
            this.barcodeinput.beforeBarcodePush = (barcode, scannerID) => { return this._barcodeBeforePush(barcode, scannerID) }
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

    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        // if (!this.order.PackageList)
        // {
        //     this.order.CurrentPack.Items
        //     var packageList = [
        //         { ID: '123', Barcode: '123b', N: 1, Items: JSON.parse(JSON.stringify(this.order.CurrentPack.Items)) },
        //         { ID: '456', Barcode: '456b', N: 2, Items: JSON.parse(JSON.stringify(this.order.CurrentPack.Items)) }
        //     ]
        //     this.set('order.PackageList', packageList)
        // }
    }    

    _spdReceivePacket(e: CustomEvent)
    {
        var cmd = e.detail.pkt && e.detail.pkt.CommandResult ? e.detail.pkt.CommandResult : null

        if (cmd && cmd.Command == 'barcodescanned' && cmd.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.DataType
            this._barcodeInputPush(res.Data, res.ScannerID)
        }
        else if (cmd && cmd.Command == 'signalscanner' && cmd.ResultCode == 'fail')
        {
            this.showToast(this.localize('admin-ws-shipping-scanner-fail', 'desc', cmd.Description))
        }
        else if (cmd && cmd.Command == 'weightresult' && cmd.ResultCode == 'success' && e.detail.pkt.Weight !== undefined)
        {
            // console.log(cmd, e.detail.pkt.Weight)
            this.set('order.CurrentPack.Weight.Grams', e.detail.pkt.Weight)
        }
    }

    onBarcode(barcode) //android
    {
        this._barcodeInputPush(barcode)
        return true
    }

    _barcodeInputPush(barcode, scannerID: any = null)
    {
        if (this.barcodeinput) { this.barcodeinput.barcodePush(barcode, scannerID) }
    }

    _barcodeDialogLock = false
    _barcodeBeforePush(barcode, scannerID)
    {
        var pushAllow = true
        if (this._barcodeDialogLock)
        {
            pushAllow = false //NO PUSH
            this.scannerprintersettings.shippingBarcodeInvalid(scannerID) 
        }
        else if (this.relatedBarcodesHash[barcode]) //has related barcode (means has context and valid barcode)
        {
            //push allowed
        }
        else if (this.order?.CurrentPack && this.order?.CurrentPack?.Items?.length == 0) //has context and all packed
        {
            //push allowed
        }
        else if (!this.order?.CurrentPack && !this.loadingCmd) //NO context and ready to send
        {
            //push allowed
        }
        else if (!this.order?.CurrentPack && this.loadingCmd) //NO context but LOADING
        {
            pushAllow = false //NO PUSH
            this.scannerprintersettings.shippingBarcodeInvalid(scannerID) 
        }
        else
        {
            pushAllow = false //NO PUSH
            this.scannerprintersettings.shippingBarcodeInvalid(scannerID) 

            //show dialog to switch context or stay on
            this._barcodeDialogLock = true
            var barr = [
                {
                    title: 'Switch',
                    ontap: (te) => 
                    {
                        if (this.barcodeinput) { this.barcodeinput._barcodePush(barcode, scannerID) } // push by internal

                        this._barcodeDialogLock = false
                    }
                },
                {
                    title: 'Stay and Try Another',
                    ontap: (te) => 
                    {
                        this._barcodeDialogLock = false

                        //do nothing
                    }
                }
            ]
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: '',
                    message: 'Recent barcode is from another package, are about to switch context to or want to try another parcel?',
                    buttons: barr,
                    // errorid: r?.errorid ? r.errorid : null,
                    // devErrorDetails: r?._devErrorDetails ? r._devErrorDetails : null,
                }
            }))
        }

        return pushAllow
    }

    _barcodeLoadingDebouncer: Debouncer
    onBarcodeInputEnter(e)
    {
        var scanners:{ID:''}[] = this.scannerprintersettings.getScanners()
        var scannerID = e.ScannerID
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
        if (scanners && !this._dev) 
        { 
            if (scannerIndex >= scanners.length)
            {
                this.showToast(this.localize('admin-ws-aggregation-scanner-notfound'))
                return //EXIT!!!
            }
            scannerID = scanners[scannerIndex]?.ID 
        }


        if (e?.detail?.invalid)
        { 
            // console.warn('onBarcodeInputEnter - invalid')
            this.scannerprintersettings.shippingBarcodeInvalid(scannerID)
            return //EXIT!!!
        }
        var barcodes = e?.detail?.barcodes
        if (!Array.isArray(barcodes)) { return } //EXIT!!!



        // if (!Array.isArray(this.order.Replacements)) { this.set('order.Replacements', []) }
        var repObj = Object.assign({}, this._requestObject(this.order), {
            Barcodes: barcodes.map(i => i.barcode),
            loading: true,
            BarcodeReaderIndex: scannerIndex,
            BarcodeReadersCount: scanners ? scanners.length : 0,
            index: 0,
        })
        delete repObj.Barcode
        if (this.order.CurrentPack) 
        { 
            repObj.CurrentPack = { 
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
                Provider: this.order?.CurrentPack?.Provider,
                Weight: this.order?.CurrentPack?.Weight,
            }
        }


        this.api_action = 'get'

        this.set('loadingCmd', true)
        if (this._barcodeLoadingDebouncer) { this._barcodeLoadingDebouncer.cancel() }
       
        this.cmdPost(this.api_url, repObj, (result, response, rq) =>
        {
            this.set('loadingCmd', true)
            this._barcodeLoadingDebouncer = Debouncer.debounce(this._barcodeLoadingDebouncer, timeOut.after(600), () =>
            {
                this.set('loadingCmd', false)
            })
            
            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.set('order', r['result'])

                    // if (this.order.Discarded || this.order.Invalid)
                    // {
                    //     this.scannerprintersettings.qaBarcodeInvalid(scannerID)
                    // }
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
        }, 
        false)
    }

    _compute_disabledProviderSelection(packageiShippingData, loadingAny)
    {
        return this._asBool(packageiShippingData) || loadingAny
    }

    _computeDisabledDownload(loading, Url, isAdmin)
    {
        return loading || !Url
    }

    _computeShowManufacturers(manlist, noManufacturers)
    {
        return manlist && !noManufacturers
    }


    _compute_loadingAnyOrBuffered(loading, loadingCmd, scannedBarcodes, scannedBarcodesP)
    {
        return this._computeLoadingAny(loading, loadingCmd) || scannedBarcodes?.length > 0
    }

    _compute_hideSplit(isSplittable)
    {
        return isSplittable !== true
    }

    _compute_hideShippingDropCurrent(items)
    {
        return !items?.length
    }

    _compute_hideFinishSingle(isSingleItemsBucket, isSplittable, items)
    {
        return !(isSingleItemsBucket && (items && items.filter(i => i.IsPacked).length == 1))
    }

    _compute_hideFinish(isSingleItemsBucket, isSplittable, notPackedItemCount, items, packageList)
    {
        return isSplittable || notPackedItemCount !== 0 || (!items || items.length == 0) || packageList.length < 1
    }


    _compute_disabledSplit(loading, isSplittable)
    {
        return loading || this._compute_hideSplit(isSplittable)
    }

    _compute_disabledShippingDropCurrent(loading, items)
    {
        return loading || this._compute_hideShippingDropCurrent(items)
    }

    _compute_disabledFinishSingle(loading, isSingleItemsBucket, isSplittable, items)
    {
        return loading || this._compute_hideFinishSingle(isSingleItemsBucket, isSplittable, items)
    }

    _compute_disabledFinish(loading, isSingleItemsBucket, isSplittable, notPackedItemCount, items, packageList)
    {
        return loading || this._compute_hideFinish(isSingleItemsBucket, isSplittable, notPackedItemCount, items, packageList)
    }


    relatedBarcodesHash = {}
    _compute_relatedBarcodes(orderCurrentPackItems, orderPackageList)
    {
        var relatedBarcodes:any = []
        if (orderCurrentPackItems && Array.isArray(orderCurrentPackItems))
        {
            relatedBarcodes = relatedBarcodes.concat(orderCurrentPackItems.map(i => i.Barcode))
        }
        if (Array.isArray(orderPackageList))
        {
            for (var pi in orderPackageList)
            {
                relatedBarcodes = relatedBarcodes.concat(orderPackageList[pi].Items.map(i => i.Barcode))
            }
        }

        //hash
        this.relatedBarcodesHash = {}
        for (var i in relatedBarcodes)
        {
            this.relatedBarcodesHash[relatedBarcodes[i]] = 1
        }
        return relatedBarcodes
    }

    async _showBarcodeDetailsTap(e)
    {
        var barcode = e.model?.__data?.producti?.Barcode
        await this.barcodeinput.showBarcodeDetails(barcode)
    }

    onTestScaleTap(e)
    {
        var testWeight = this.order?.CurrentPack?.WeightEstimated?.Grams// | RandomInteger(10, 2000)
        var efake = { detail: { pkt: { 
            CommandResult: { Command: 'weightresult', ResultCode: 'success' },
            Weight: testWeight, 
        } } } as CustomEvent
        this._spdReceivePacket(efake)
    }

    onCancelShippingSingleTap(e)
    {
        var packagei = e.model.__data.packagei
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        this.api_action = 'cancel-label'
        var obj: any = {
            CurrentPack: {
                //ID: this.order?.CurrentPack?.ID,
                PackID: packagei?.ID,
            },
        }

        this._fetchItems(1, null, obj, (order) => 
        {
            progress.active = false
            if (order?.CurrentPack)
            {
                this.showToast(this.localize('admin-ws-shipping-toast-cancellabel'))
            }
        })

        return false
    }

    onPrintShippingSingleTap(e)
    {
        var packagei = e.model.__data.packagei
        // console.log(e)

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        this.api_action = 'getlabel'
        var obj: any = {
            CurrentPack: {
                // ID: this.order?.CurrentPack?.ID, ??
                PackID: packagei?.ID,
                Weight: packagei?.Weight,
                Provider: packagei?.Provider,
            },
        }

        this._fetchItems(1, null, obj, (order) => 
        {
            progress.active = false
            var pgi = order.PackageList.filter(i => i.ID == packagei?.ID)
            if (Array.isArray(pgi) && pgi.length > 0 && pgi[0]?.ShippingData)
            {
                var shippingData = pgi[0].ShippingData
                this.scannerprintersettings.printShippingLabel(Object.assign({}, shippingData, { Weight: shippingData?.Weight }))
                this.showToast(this.localize('admin-ws-shipping-toast-label'))
            }
        })

        return false
    }

    onPrintShippingTap(e)
    {
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        this.api_action = 'getlabel'
        var obj: any = {
            CurrentPack: {
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
                Provider: this.order?.CurrentPack?.Provider,
                Weight: this.order?.CurrentPack?.Weight,
            },
        }

        this._fetchItems(1, null, obj, (order) => 
        {
            progress.active = false            
            if (order?.CurrentPack?.ShippingData)
            {
                var shippingDataAr = order?.CurrentPack?.ShippingData
                if (!Array.isArray(shippingDataAr)) { shippingDataAr = [shippingDataAr] }
                for (var sdi of shippingDataAr)
                {
                    this.scannerprintersettings.printShippingLabel(Object.assign({}, sdi, { Weight: sdi?.Weight }))
                }
                this.showToast(this.localize('admin-ws-shipping-toast-label'))
            }
        })

        return false
    }

    progressCancelShipping: PaperSliderElement
    onCancelShippingTap(e)
    {
        var dialogcancel = this.shadowRoot?.querySelector('#dialogcancel')
        this.progressCancelShipping = e?.target?.parentElement?.querySelector('paper-spinner-lite') as PaperSliderElement
        this._openDlg(dialogcancel as PaperDialogElement)
    }

    onCancelShippingConfirmTap(e)
    {
        var progress = this.progressCancelShipping
        if (!progress) { return }

        if (progress) { progress.active = true }
        this.api_action = 'cancel-label'
        var obj: any = {
            CurrentPack: {
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
            },
        }

        this._fetchItems(1, null, obj, (order) => 
        {
            if (progress) { progress.active = false }
            if (order?.CurrentPack)
            {
                this.showToast(this.localize('admin-ws-shipping-toast-cancellabel'))
            }
        })

        return false
    }

    onDisposeShippingTap(e)
    {
        var dialogcancel = this.shadowRoot?.querySelector('#dialogdispose')
        this._openDlg(dialogcancel as PaperDialogElement)
    }

    onDisposeShippingConfirmTap(e)
    {
        this.api_action = 'dispose'
        var obj: any = {
            CurrentPack: { 
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
            },
        }

        this._fetchItems(1, null, obj, (order) => 
        {
            //
        })
    }

    _onDownloadTap(e) 
    {
        var moid = e.target.getAttribute('mo-id')
        var batchid = e.target.getAttribute('batch-id')
        var pdf = e.target.getAttribute('pdf-id')
        var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
        this.getOrderFile({ moid: moid, batchid: batchid, pdf: pdf }, progress)
        
        // window.location.href = this.order.Url

        e.preventDefault()
        return false
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
    }

    _currentPackChanged(order, order_CurrentPack)
    {
        //
    }


    onShippingDropCurrentTap(e)
    {
        var dialogdrop = this.shadowRoot?.querySelector('#dialogdrop')
        this._openDlg(dialogdrop as PaperDialogElement)
    }

    onShippingDropCurrentConfirmTap(e)
    {
        this.api_action = 'drop-current'

        var obj: any = {
            CurrentPack: { 
                ID: this.order?.CurrentPack?.ID, 
                PackID: this.order?.CurrentPack?.PackID, 
                Weight: this.order?.CurrentPack?.Weight, 
            },
        }
        this._fetchItems(1, null, obj, (order) => 
        {
            //
        })
    }

    onSplitShippingTap(e)
    {
        var dialogsplit = this.shadowRoot?.querySelector('#dialogsplit')
        this._openDlg(dialogsplit as PaperDialogElement)
    }

    onSplitShippingConfirmTap(e)
    {
        this.api_action = 'split-package'

        var obj: any = {
            CurrentPack: { 
                ID: this.order?.CurrentPack?.ID, 
                PackID: this.order?.CurrentPack?.PackID, 
                Weight: this.order?.CurrentPack?.Weight, 
            },
        }

        var last_num = this.order?.PackageList?.length
        this._fetchItems(1, null, obj, (order) => 
        {
            var recent_num = order.PackageList?.length
            if (recent_num > last_num && order.PackageList?.length > 0)
            {
                //print the last (first)
                this.scannerprintersettings.printShippingPackageTempLabel(Object.assign({}, order.PackageList[0])) //TempLabelZPL
            }
        })
    }

    onFinishSingleShippingTap(e)
    {
        this.api_action = 'split-package'

        var obj: any = {
            CurrentPack: {
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
                Weight: this.order?.CurrentPack?.Weight,
            },
        }
        this._fetchItems(1, null, obj, (order) => 
        {
            //
        })
    }

    onFinishShippingTap(e)
    {
        this.api_action = 'split-package'

        var obj: any = {
            CurrentPack: {
                ID: this.order?.CurrentPack?.ID,
                PackID: this.order?.CurrentPack?.PackID,
                Weight: this.order?.CurrentPack?.Weight,
            },
        }
        this._fetchItems(1, null, obj, (order) => 
        {
            //
        })
    }

    onDisposePackageTap(e)
    {
        this.dialogdisposepackage.packagei = e.model.__data.packagei

        var dialogdisposepackage = this.shadowRoot?.querySelector('#dialogdisposepackage')
        this._openDlg(dialogdisposepackage as PaperDialogElement)
    }

    onDisposePackageConfirmTap(e)
    {
        this.api_action = 'dispose-package'
        var obj: any = {
            CurrentPack: {
                ID: this.order?.CurrentPack?.ID,
                PackID: this.dialogdisposepackage?.packagei?.ID,
            },
        }
        // console.log(obj)

        this._fetchItems(1, null, obj, (order) => 
        {
            //
        })
    }
    
    onPrintLabelPackageTap(e)
    {
        var packagei = e.model.__data.packagei
        this.scannerprintersettings.printShippingPackageTempLabel(Object.assign({}, packagei))
        this.showToast(this.localize('admin-ws-shipping-templabel-toast'))
    }
}
