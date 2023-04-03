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
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { WorkstationBase, WorkstationDynamic } from './workstation-base'
import { Currency, getArrItemSafe, sleep } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { IAdminSignalR_PrintingProgress } from '../../components/bll/signalr-global'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import view from './workstation-printing.ts.html'
import style from './workstation-printing.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/ui-user-inline'
import '../ui/ui-progress-icon'
import '../ui/ui-dropdown-menu'
import '../ui/ui-dialog'
import ResizeObserver from 'resize-observer-polyfill'
import { UIAdminDialog } from '../ui/ui-dialog'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { RandomInteger } from '../../components/utils/MathExtensions'
import { elementIsScrollLocked } from '@polymer/iron-overlay-behavior/iron-scroll-manager'
import { PaperItemElement } from '@polymer/paper-item/paper-item'
// import '../ui/ui-scanner-printer-settings'
// import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const AdminWorkstationPrintingBase = mixinBehaviors([IronResizableBehavior], WorkstationBase) as new () => WorkstationBase & IronResizableBehavior


@WorkstationDynamic
class AdminWorkstationPrinting extends AdminWorkstationPrintingBase implements IAdminSignalR_PrintingProgress
{
    static get is() { return 'tmladmin-workstation-printing' }

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

            APIPath: { type: String, value: '/admin/api/workstation/print-' },
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
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd, loadingWS)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged2' },

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode
            dialogcancel_reason: { type: String },
            disableReprocess: { type: Boolean, value: true },
            disableShipping: { type: Boolean, value: true },
            labelsSeparator: { type: String, value: ",\n" },

            zoomimgi: { type: Object },
            checkboxAll: { type: Boolean },
            lensOn: { type: Boolean, },
            switchingAnimation: { type: Boolean, },
            paperReportPrepair: { type: Boolean, reflectToAttribute: true },

            disabledPapers: { type: Boolean, computed: '_computeDisabledPapers(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*)' },
            disabledGenerate: { type: Boolean, computed: '_computeDisabledGenerate(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*)' },
            disabledFreeze: { type: Boolean, computed: '_computeDisabledFreeze(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*)' },
            disabledUnfreeze: { type: Boolean, computed: '_computeDisabledUnfreeze(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*)' },
            disabledDownload: { type: Boolean, computed: '_computeDisabledDownload(loadingAny, order.CurrentBatch.IsPDFsFrozen, userInfo.isAdmin)' },
            disabledDownloadToManufacturer: { type: Boolean, computed: '_computeDisabledDownloadToManufacturer(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.ManufacturerStorageConfigured, userInfo.isAdmin, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*)' },
            disabledPushToPrinter: { type: Boolean, computed: '_computeDisabledPushToPrinter(loadingAny, order.CurrentBatch.IsPDFsFrozen, order.CurrentBatch.ManufacturerStorageConfigured, userInfo.isAdmin, order.CurrentBatch.Tasks, order.CurrentBatch.Tasks.*, order.CurrentBatch.Fabrics, allowReprinting, order.CurrentBatch.Fabrics.*)' },
            disabledPapersReport: { type: Boolean, computed: '_compute_disabledPapersReport(loadingAny, order.CurrentBatch.PrintReport)' },

            hiddenFreeze: { type: Boolean, computed: '_computeHiddenFreeze(loadingAny, order.CurrentBatch.IsPDFsFrozen, userInfo.isAdmin)' },
            hiddenUnfreeze: { type: Boolean, computed: '_computeHiddenUnfreeze(loadingAny, order.CurrentBatch.IsPDFsFrozen, userInfo.isAdmin)' },
            hiddenNestingQuality: { type: Boolean, computed: '_computeHiddenNestingQuality(userInfo.isAdmin)' },
            hiddenNoBatch: { type: Boolean, computed: '_computeHiddenNoBatch(order.CurrentBatch, loadingAny)' },

            showManufacturers: { type: Boolean, computed: '_computeShowManufacturers(order.Manufacturers)' },
            countReplacements: { type: Number, computed: '_compute_countReplacements(userInfo.isAdmin, order.ManufactureOrders)' },
            orderCurrentBatchPagesCount: { type: Number, computed: '_compute_orderCurrentBatchPagesCount(order.CurrentBatch.Fabrics, allowReprinting)' },

            dialogunfreeze_reason: { type: String },
            previewPrinting: { type: Object },
            previewPrintingSize: { type: Object },
            showPreviewPrinting: { type: Boolean, value: false, observer: '_showPreviewPrintingChanged' },
            printReport: { type: Object },
            paperImgs: { type: Object },

            imgZoomResult: { type: Boolean, reflectToAttribute: true, computed: '_compute_imgZoomResult(showPreviewPrinting, lensOn)' },
            imgZoom: { type: Boolean, reflectToAttribute: true, value: false },


            lazyObserve: { type: Object },
            allowReprinting: { type: Object },
            dialogpagecopies: { type: Object },

            _searchableStr: { type: String },
            _searchStart: { type: Boolean },
            batchFilter: { type: String, },
            batchFilterList: { type: Array, value: [ 
                { id: 'ALL', title: 'ALL' }, 
				{ id: 'SPOT', title: 'SPOT COLOR' }, 
                { id: 'FREEZED', title: 'FREEZED' }, 
                { id: 'PUSHEDTOFTP', title: 'PUSHED TO FTP' }, 
                { id: 'RASTERIZED', title: 'RASTERIZED' }, 
                { id: 'PRINTED', title: 'PRINTED' }, 
                { id: 'TRANSFERRED', title: 'TRANSFERRED' }, 
                { id: 'CUTTED', title: 'CUTTED' }, 
				{ id: 'TEST', title: 'TEST' }, 
            ] },
            batchMenu: { type: Array, value: [] },
        }
    }

    dialogpagecopies: any
    _netbase: any
    _observer: any
    loading: any
    env: any
    scrollTarget: any
    dialogunfreeze_reason: any
    previewPrinting: any
    previewPrintingData: any
    orderCurrentBatchPagesCount: number
    showPreviewPrinting: boolean
    checkboxAll: boolean
    disabledPapers: boolean
    switchingAnimation: boolean
    _lastPaperId: any = {}
    paperReportPrepair: boolean
    printReport: any
    paperImgs: any = {}
    frameResizeObserver: ResizeObserver
    previewPrintingSize: any
    parentTapHandler: any

    _openDebounce: any
    _suppressHistory: any
    _suppressReload: any
    _lastState: any
    previewID = 'preview'
    _firstOrderLoaded = true


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderLoaded(order)',
            '_manSelected(order.Manufacturer.ManufacturerID)',
            '_batchSearchInitial(batchFilterList)',
            '_buildBatchSearch(order.ManufactureOrders, batchFilter.id, _searchableStr)',
        ]
    }
    _log(v) { console.log(v) }

    get previewpagescontainer() { return this.$['preview-pages-container'] as HTMLElement }
    get papersreportprint() { return this.$['papers-report-print'] as HTMLElement }
    // get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        this.scheduleAutoReload(true)

        this._initLens()

        this.addEventListener('iron-resize', (e) => this._onResized(e))
        // this.scannerprintersettings.addEventListener('api-scanner-printer-packet', this._spdReceivePacket.bind(this))
        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        document.addEventListener('mousemove', (e) => this._moveLens(e))
        document.addEventListener('touchmove', (e) => this._moveLens(e))
        window.addEventListener('afterprint', (e) => this._onPapersAfterPrint(e))
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())

        this.frameResizeObserver = new ResizeObserver(entries =>
        {
            for (let entry of entries)
            {
                var pps = {
                    rect: entry.target.getBoundingClientRect(),
                    // img: this.previewPrinting.Pages[0].PreviewImages[0],
                }
                this.previewPrintingSize = pps
            }
        })
        this.frameResizeObserver.observe(this.previewpagescontainer)

        // this.previewpagescontainer.querySelector('iron-list').scrollTarget = this.previewpagescontainer

        if (window.history)
        {
            this._openDebounce = Debouncer.debounce(this._openDebounce, microTask, () =>
            {
                this._lastState = window.history.state
                var url = new URL(window.location.href)
                url.hash = ''
                window.history.replaceState(null, '', url.href)
            })
        }


        this.parentTapHandler = (e) => 
        {
            if (this._searchStartOpening) { return }
            var epath = e.path || e.composedPath()
            var el = epath ? epath.filter(i => {  return i?.classList?.contains('batch-search-text') }) : []
            if (el?.length < 1 && this._searchStart)
            {
                this._searchStart = false
                this._searchableStr = ''
            }
        }
        document.addEventListener('tap', this.parentTapHandler, EventPassiveDefault.optionPrepare())
    }

    disconnectedCallback()
    {
        if (this.frameResizeObserver)
        {
            this.frameResizeObserver.disconnect()
        }

        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    reload()
    {
        if (!this._suppressReload)
        {
            super.reload()
        }
    }

    _imgWidth(previewPrintingSize)
    {
        return `${previewPrintingSize?.rect?.width}`
    }

    _imgHeight(previewPrintingSize, imagei)
    {
        // console.log(previewPrintingSize, imagei)
        // var imagei = previewPrintingSize.img
        if (!imagei?.Height || !imagei?.Width || !previewPrintingSize?.rect) { return `0` }
        var h = Math.ceil(imagei.Height * (previewPrintingSize.rect.width / imagei.Width))
        return `${h}`
    }

    _requestObjectWidthFabrics(order)
    {
        return this._requestObject(order, true)
    }

    _requestObject(order, addFabrics?)
    {
        // return order
        if (!order) { return order }

        var r = {
            // Barcode: order.Barcode,
            SubscriptionsState: order.SubscriptionsState,
            CurrentBatch: {
                ETag: order.CurrentBatch?.ETag,
                BatchID: order.CurrentBatch?.BatchID,
                ManufactureOrderID: order.CurrentBatch?.ManufactureOrderID,
                ManufacturePrintingTuningID: order.CurrentBatch?.ManufacturePrintingTuningID,
            },
            ProductBarcode: order.ProductBarcode,
            Manufacturer: order.Manufacturer,
        }
        if (addFabrics) 
        { 
            r.CurrentBatch['Fabrics'] = order?.CurrentBatch?.Fabrics 
            r.CurrentBatch['PrintLocation'] = order?.CurrentBatch?.PrintLocation 
        }
        return r
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
        if (pobj.ManufacturePrintingTuningID != this.order.CurrentBatch.ManufacturePrintingTuningID) { return }

        
        if (task.length == 1 && pobj.Finished === true)
        {
            this.splice('order.CurrentBatch.Tasks', inx, 1)
            this.async(() =>
            {
                this.api_action = 'get'
                this._fetchItems(3, null, this._requestObjectWidthFabrics(this.order), () =>
                {
                    //
                })
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
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObjectWidthFabrics(this.order), () =>
        {
            //
        })
    }

    _spdReceivePacket(e: CustomEvent)
    {
        if (e.detail.pkt && e.detail.pkt.CommandResult && e.detail.pkt.CommandResult.Command == 'barcodescanned' && e.detail.pkt.CommandResult.ResultCode == 'success')
        {
            var res = e.detail.pkt
            // res.Data
            // res.DataType
            // res.ScannerID
            // var efake = { target: { parentElement: { value: res.Data } } }
            // this._addRepTap(efake)
            this.showToast(res.Data)
        }
    }
    
    selectBatchTap(e)
    {
        //
    }

    _computeDisabledPapers(loadingAny, isPDFsFrozen, tasks, tasksP)
    {
        return loadingAny || !isPDFsFrozen || (tasks && tasks.length > 0)
    }

    _computeDisabledGenerate(loading, isPDFsFrozen, tasks, tasksP)
    {
        return loading || isPDFsFrozen || (tasks && tasks.length > 0)
    }

    _computeDisabledFreeze(loading, isPDFsFrozen, tasks, tasksP)
    {
        return loading || isPDFsFrozen || (tasks && tasks.length > 0)
    }

    _computeDisabledUnfreeze(loading, isPDFsFrozen, tasks, tasksP)
    {
        return loading || !isPDFsFrozen || (tasks && tasks.length > 0)
    }

    _computeDisabledDownload(loading, isPDFsFrozen, isAdmin)
    {
        return loading || (!isPDFsFrozen) // && isAdmin !== true
    }

    _computeDisabledDownloadToManufacturer(loading, isPDFsFrozen, manufacturerStorageConfigured, isAdmin, tasks, tasksP)
    {
        return loading || (!isPDFsFrozen) || (!manufacturerStorageConfigured) || (tasks && tasks.length > 0)
        // && isAdmin !== true
    }

    _computeDisabledPushToPrinter(loading, isPDFsFrozen, manufacturerStorageConfigured, isAdmin, tasks, tasksP, fabrics, allowReprinting, fabricsP)
    {
        var orderCurrentBatchPagesCount = this._compute_orderCurrentBatchPagesCount(fabrics, allowReprinting)
        return loading || (!isPDFsFrozen) || (!manufacturerStorageConfigured) || (tasks && tasks.length > 0) || orderCurrentBatchPagesCount < 1
    }

    _compute_disabledPapersReport(loading, currentBatchPrintReport)
    {
        return loading || !this._asBool(currentBatchPrintReport)
    }


    _computeHiddenFreeze(loading, isPDFsFrozen, tasks)
    {
        return isPDFsFrozen
    }

    _computeHiddenUnfreeze(loading, isPDFsFrozen, tasks)
    {
        return !isPDFsFrozen
    }

    _computeHiddenNestingQuality(isAdmin)
    {
        return !isAdmin
    }

    _computeHiddenNoBatch(currentBatch, loading)
    {
        return this._asBool(currentBatch) || loading == true
    }


    _computeShowManufacturers(manlist)
    {
        return manlist
    }

    _compute_orderCurrentBatchPagesCount(orderCurrentBatchFabrics, allowReprinting)
    {
        if (!Array.isArray(orderCurrentBatchFabrics)) { return '--' }
        // console.log(orderCurrentBatchFabrics)

        var cnt = orderCurrentBatchFabrics.reduce((acc, i, index, array) =>
        {
            var pagescount = i.Files.reduce((accj, j, jindex, jarray) =>
            {
                return accj + j.Pages.filter(k => {
                    var kCopies = k.Copies
                    try { kCopies = parseInt(kCopies) } catch { }
                    return kCopies > 0
                }).length - 2
            }, 0)
            return acc + pagescount
        }, 0)
        return cnt.toString()
    }

    _zoomDebouncer: Debouncer
    imgZoom: boolean
    _compute_imgZoomResult(showPreviewPrinting, lensOn)
    {
        var r = showPreviewPrinting && lensOn
        if (r)
        {
            this._zoomDebouncer = Debouncer.debounce(this._zoomDebouncer, timeOut.after(100), () =>
            {
                this.imgZoom = r
            })
        }
        else
        {
            this.imgZoom = r
        }

        return r
    }

    _compute_countReplacements(isAdmin, manufactureOrders)
    {
        if (!Array.isArray(manufactureOrders)) { return '--' }

        var cnt = manufactureOrders.reduce((acc, i, index, array) => {
            var bs = i.Batches.filter(i => this._batchReplacementCounter(i.BatchID, i.ReplacementIteration, i?.PrintStatus?.IsCompleted))
            return acc + bs.length
        }, 0)
        return cnt.toString()
    }    

    _batchReplacement(batchID, replacementIteration)
    {
        return replacementIteration > 0
    }
    
    _batchReplacementCounter(batchID, replacementIteration, printStatusIsCompleted)
    {
        // console.log(replacementIteration, printStatusIsCompleted)
        return replacementIteration > 0 && !printStatusIsCompleted
    }

    _batchName(batchID, replacementIteration)
    {
        if (replacementIteration == 0)
        {
            return batchID // + '-' + replacementIteration
        }
        else if (replacementIteration > 0)
        {
            return batchID + '‑R' + replacementIteration
        }
    }

    findReplacementsTap(e)
    {
        var menu = this.$['menu']
        var scrollEl = menu.parentElement
        var printJobs = this.shadowRoot?.querySelectorAll('paper-item[replacement]:not([printed])')
        // console.log(printJobs)
        var found = false
        for (var i in printJobs)
        {
            var recti = printJobs[i] && typeof(printJobs[i].getBoundingClientRect) == 'function' ? printJobs[i].getBoundingClientRect() : null
            if (!recti) { continue }

            // console.log(recti.top, recti.height, scrollEl.scrollTop)
            var recti_anchor = recti.top - recti.height

            if (recti_anchor > 10 && scrollEl)
            {
                var scrollTo =  scrollEl.scrollTop + recti_anchor
                // this.scrollIt(scrollTo, 300, 'easeInOutQuad', null, null, scrollEl)
                var itempaper = printJobs[i] as PaperItemElement
                this.scrollIt(scrollTo, 300, 'easeInOutQuad', 
                (callback) => 
                {
                    itempaper.setAttribute('finded', 'true')
                    setTimeout(()=>{ itempaper.removeAttribute('finded') }, 2000)
                },
                (anim) => 
                {
                }, 
                scrollEl)
                found = true
                break
            }
            else
            {
                // console.log('skip ' + i)
            }
        }
        if (!found) { this.scrollIt(0, 300, 'easeInOutQuad', null, null, scrollEl) }
        // console.log(menu, r, scrollEl.scrollTop)
    }

    gotoBatchMenuItem(batchi)
    {
        // console.log('gotoBatchMenuItem', batchi?.ManufacturePrintingTuningID)
        var menu = this.$['menu']
        var scrollEl = menu.parentElement
        var printJobs: any = []
        try { printJobs = this.shadowRoot?.querySelectorAll(`paper-item#${batchi?.ManufacturePrintingTuningID}`) } catch (ex) { console.error(ex) }
        // console.log(printJobs)
        var found = false
        for (var i in printJobs)
        {
            var recti = printJobs[i] && typeof(printJobs[i].getBoundingClientRect) == 'function' ? printJobs[i].getBoundingClientRect() : null
            if (!recti) { continue }

            // console.log(recti.top, recti.height, scrollEl.scrollTop)
            var recti_anchor = recti.top - recti.height

            if (recti_anchor > 10 && scrollEl)
            {
                var scrollTo =  scrollEl.scrollTop + recti_anchor
                // this.scrollIt(scrollTo, 300, 'easeInOutQuad', null, null, scrollEl)
                var itempaper = printJobs[i] as PaperItemElement
                this.scrollIt(scrollTo, 300, 'easeInOutQuad', 
                (callback) => 
                {
                    itempaper.setAttribute('finded', 'true')
                    setTimeout(()=>{ itempaper.removeAttribute('finded') }, 2000)
                },
                (anim) => 
                {
                }, 
                scrollEl)
                found = true
                break
            }
            else
            {
                // console.log('skip ' + i)
            }
        }
        if (!found) { this.scrollIt(0, 300, 'easeInOutQuad', null, null, scrollEl) }
    }
        
    needToGoToBatchMenuItem: any
    onSelectedBatch(e)
    {
        if (!e || !e.detail || !e.detail.value || !e.detail.value.__dataHost || !e.detail.value.__dataHost.__data) { return }
        var batchi = e.detail.value.__dataHost.__data.batchi

        if (this.order.CurrentBatch.ManufacturePrintingTuningID != batchi?.ManufacturePrintingTuningID)
        {
            this.order.CurrentBatch = batchi
            this.dialogcancel_reason = ''
            this.api_action = 'get'
            this._fetchItems(3, null, this._requestObject(this.order), () =>
            {
                //
            })
            var qp = { 'batch-pt-id': batchi.ManufacturePrintingTuningID }
            window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
        }
    }

    _onDownloadTap(e) 
    {
        var d_id = e.target.getAttribute('d-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        
        //  File API checks
        // if (window['File'] && window['FileReader'] && window['FileList'] && window['Blob'])
        // {
        //     var filelist = []
        //     let fabrics = this.order.CurrentBatch.Fabrics
        //     for (var i in fabrics)
        //     {
        //         var ar = []
        //         if (!Array.isArray(fabrics[i].Files)) { continue }
        //         ar = fabrics[i].Files.map((currentValue, index, array) =>
        //         {
        //             return { PDFFileName: currentValue.PDFFileName }
        //         })
        //         filelist = filelist.concat(ar)
        //     }
        //     this.getOrderFiles({ ManufacturePrintingTuningID: d_id, Files: filelist }, progress)
        // } 
        // else
        {
            this.getOrderFile({ d_id: d_id }, progress)
        }

    
        e.preventDefault()
        return false
    }

    _onPushReprintToManufacturerConfirmTap(e)
    {
        this._openDlg(this.$.dialogpushreprint as PaperDialogElement)
    }

    _onPushToManufacturerConfirmTap(e)
    {
        this._openDlg(this.$.dialogpush as PaperDialogElement)
    }

    _onPushReprintToManufacturerTap(e)
    {
        var d_id = e.target.getAttribute('d-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        /////////////////////////////////////////////////////////////////////////////////////
        
        if (progress) { progress.active = true }
        this.api_action = 'replace-pages'
        var obj = this._requestObjectWidthFabrics(this.order)
        this._fetchItems(1, null, obj, () => {
            if (progress) { this.async(() => { progress.active = false }, 300) }
        })

        e.preventDefault()
        return false        
    }

    _onPushToManufacturerTap(e)
    {
        var d_id = e.target.getAttribute('d-id')
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')

        // console.log(this.order)
        // return
        /////////////////////////////////////////////////////////////////////////////////////
        
        if (progress) { progress.active = true }
        this.api_action = 'push'
        var obj = this._requestObjectWidthFabrics(this.order)
        this._fetchItems(1, null, obj, () => {
            if (progress) { this.async(() => { progress.active = false }, 300) }
        })

        e.preventDefault()
        return false        
    }

    // _onGenerateConfirmTap(e)
    // {
    //     this._openDlg(this.$.dialoggenerate as PaperDialogElement)
    // }

    // _onGenerateTap(e)
    // {
    //     this._convertYards2Meters(this.order)
    //     this.api_action = 'generate'
    //     this._fetchItems(3, null, this._requestObjectWidthFabrics(this.order), () =>
    //     {
    //         //
    //     })
    // }

    _onPapersTap(e)
    {
        this._convertYards2Meters(this.order)
        this.api_action = 'paper-apply'
        this._fetchItems(1, null, this._requestObjectWidthFabrics(this.order), () =>
        {
            //
        })
    }

    onPaperLoaded(e)
    {
        this.paperImgs[e.target.src] = (e.type == "load")
        this._paperImageObserver(this.paperImgs)
    }

    onPaperLoadError(e)
    {
        this.paperImgs[e.target.src] = e
        this._paperImageObserver(this.paperImgs)
    }

    onHistoryPopstate(e)
    {
        e = e || window.event

        // console.log(this.previewID + ' ... ' + JSON.stringify(this._lastState) + ' ~~~~ ' + JSON.stringify(e['state']))

        if (this._suppressHistory) { return }
        this._suppressHistory = true

        if (this._lastState && this._lastState['print-preview'] == this.previewID)
        {
            this._lastState = e['state']
            this.closePreview()
        }
        else if (e && e['state'] && e.state['print-preview'] == this.previewID)
        {
            this._lastState = e['state']
            this.showPreviewTap()
        }

        this._suppressHistory = false
    }

    _onPapersAfterPrint(e?)
    {
        this.printReport = null
        this.paperImgs = {}
    }

    async _onPapersReportTap(e?)
    {
        if (!this.order.CurrentBatch.PrintReport) { return }

        this.paperImgs = {}
        
        this.loadingCmd = true
        var url = this._computeAPIUrl(this.websiteUrl, this.APIPath, 'get-paper-images')
        var qpars = { 
            ptid: this.order?.CurrentBatch?.ManufacturePrintingTuningID, 
        }
        if (!this._netbaseCmd) { this._netbaseCmd = new NetBase() }
        var response = await this._netbaseCmd._apiRequest(url, qpars, 'GET')
        var result = response?.result
        try
        {
            //load
            this.loadingCmd = false
            if (response?.success)
            {
                for (var prinx in this.order.CurrentBatch.PrintReport)
                {
                    if (!result[prinx]) { throw new Error('Print Report is inconsistant') }

                    var paperi = this.order.CurrentBatch.PrintReport[prinx]
                    for (var finx in paperi.Files)
                    {
                        if (!result[prinx].Files[finx]) { throw new Error('Print Report is inconsistant') }

                        var filei = paperi.Files[finx]
                        if (filei.ManufacturePDFID == result[prinx].Files[finx].ManufacturePDFID)
                        {
                            for (var pageinx in filei.Pages)
                            {
                                if (!result[prinx].Files[finx].Pages[pageinx]) { throw new Error('Print Report is inconsistant') }
                                filei.Pages[pageinx] = Object.assign({}, filei.Pages[pageinx], result[prinx].Files[finx].Pages[pageinx])
                            }
                        }
                    }
                }
            }
            else
            {
                throw new Error('success = false')
            }

            //build
            this.printReport = this._buildPaperReport(this.order.CurrentBatch.PrintReport)
            this.paperReportPrepair = true
            if (Object.keys(this.paperImgs).length > 0)
            {
                this._paperPrint()
            }
        }
        catch (ex)
        {
            this.showToast('Failed to build Paper Report', 3000)
        }
    }

    _paperPrint()
    {
        this.paperReportPrepair = false
        this.async(() => {  window.print() })
    }

    _paperImageObserver(paperImgs)
    {
        // console.log(paperImgs)
        if (this.paperReportPrepair && this.printReport)
        {
            var imgEls = [...this.papersreportprint.querySelectorAll('img')]
            var imgs = [...new Set(imgEls.map(i => i.src))] 
            // console.log(imgs.length, Object.keys(paperImgs).length)
            if (Object.keys(paperImgs).length >= imgs.length)
            {
                this._paperPrint()
            }
        }
    }


    _onFreezeConfirmTap(e)
    {
        this._openDlg(this.$.dialogfreeze as PaperDialogElement)
    }

    _onFreezeTap(e)
    {
        this.api_action = 'freeze'
        this._fetchItems(3, null, this._requestObject(this.order), () =>
        {
            //
        })
    }

    _onUnfreezeConfirmTap(e)
    {
        this._openDlg(this.$.dialogunfreeze as PaperDialogElement)
    }

    _onUnfreezeTap(e)
    {
        if (!this.order || !this.order.CurrentBatch) { return }

        var ro = this._requestObject(this.order)
        ro['UnfreezeDescription'] = this.dialogunfreeze_reason
        this.dialogunfreeze_reason = ''

        this.api_action = 'unfreeze'
        this._fetchItems(3, null, ro, () =>
        {
            //
        })
    }

    onInputPageCopiesChanged(e)
    {
        var n = 0
        try
        {
            var fabricindex = e.target.getAttribute('data-fabricindex')
            var printingindex = e.target.getAttribute('data-printingindex')
            n = parseInt(e?.target?.value)
            if (fabricindex === null)
            {
                fabricindex = this.previewPrintingData?.fabricindex
                printingindex = this.previewPrintingData?.printingindex
            }
        }
        catch
        {
            //
        }
        
        var sel = isFinite(n) && n > 0
        this.set(`order.CurrentBatch.Fabrics.${fabricindex}.Files.${printingindex}.selected`, sel)
        this.set('allowReprinting', false)
        this.async(()=>{
            this.set('allowReprinting', true)
        }, 17)

        return this._onInputChanged(e)
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _addRollTap(e)
    {
        //var list = e.model.__data.fabrici.PreferedRollLengthsYards
        var finx = e.model.__data.fabricindex
        var len = e.target.parentElement.value
        var width = e.target.parentElement.parentElement.querySelector('#newrollw')?.value
        if (!width || !len) { return }

        if (!this.order.CurrentBatch.Fabrics[finx].PreferedRollLengthsYards) { this.set('order.CurrentBatch.Fabrics.' + finx + '.PreferedRollLengthsYards', []) }
        this.push('order.CurrentBatch.Fabrics.' + finx + '.PreferedRollLengthsYards', { Length: len, Width: width })
        this.notifyPath('order.CurrentBatch.Fabrics.' + finx + '.PreferedRollLengthsYards')
        e.target.parentElement.value = ''
    }

    _removeRollTap(e)
    {
        // console.log(e)
        var finx = e.model.__dataHost.__dataHost.__data.fabricindex //fabrici
        var list = e.model.__data.rolli
        var rinx = e.model.__data.index
        this.splice('order.CurrentBatch.Fabrics.' + finx + '.PreferedRollLengthsYards', rinx, 1)
        this.notifyPath('order.CurrentBatch.Fabrics.' + finx + '.PreferedRollLengthsYards')
    }

    

    _fetchItems(attempts, oid?, qp1?, callback?)
    {
        let contextFields = ['SubscriptionsState']
        if (this.api_action == 'get' && this.queryParams != undefined && !this.order?.CurrentBatch && this.queryParams['batch-pt-id'])
        {
            qp1 = { CurrentBatch: { ManufacturePrintingTuningID: this.queryParams['batch-pt-id'] } }
        }
        super._fetchItems(attempts, oid, qp1, callback, false, contextFields)
    }

    _onLoad(callback, e)
    {
        // console.log(e)
        var r = e['response']
        if (r)
        {
            if (r['success'] === true)
            {
                var order = r['result']

                if (this.api_action == 'get' && this.order && (order && !order.pfirst))
                {
                    //override input ...
                    if (order && order.CurrentBatch && this.order && this.order.CurrentBatch) 
                    {
                        if (this.order.CurrentBatch.NestingQualityValue) { order.CurrentBatch.NestingQualityValue = this.order.CurrentBatch.NestingQualityValue }
                        for (var i in order.CurrentBatch.Fabrics)
                        {
                            if (this.order.CurrentBatch.Fabrics && this.order.CurrentBatch.Fabrics[i] && this.order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters)
                            {
                                order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters = this.order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters
                            }
                        }
                    }

                    this._convertMeters2Yards(order)

                    this.set('order', order)
                }
                else
                {
                    this._convertMeters2Yards(order)

                    this.set('order', order)
                }
                this._setLoading(false)

                if (callback) { callback(order) }
            }
            else if (r['success'] === false)
            {
                var order = r['result']
                this._convertMeters2Yards(order)
                // this.order = order

                this._setLoading(false)
                var s = r['summary']
                if (s && (s.Key == 'validation_fail'))
                {
                    this._applyDetailsErrors('order', r['details'].map(i => { return Object.assign({}, i, { Key: i.Key.replace('PreferedRollLengthsMeters', 'PreferedRollLengthsYards') }) }))
                    if (callback) { callback(order) }
                }
                else if (s && (s.Key == 'internal_server_error' || s.Key == 'concurrent_access'))
                {
                    this._onError(callback, { 
                        message: s.Message,
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

            if (this.api_action == 'cancel') 
            {
                this.api_action = 'get'
            }


            if (r && r['summary'])
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

    _convertM2In(widthmm)
    {
        return (widthmm / 0.0254).toString()
    }

    _convertMeters2Yards(order)
    {
        if (order && order.CurrentBatch) 
        {
            for (var i in order.CurrentBatch.Fabrics)
            {
                var meters = order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters
                order.CurrentBatch.Fabrics[i].PreferedRollLengthsYards = []
                for (var m in meters)
                {
                    var lenmm = 0, widthmm = 0
                    try { lenmm = Number.parseFloat(meters[m].Length) } catch { }
                    try { widthmm = Number.parseFloat(meters[m].Width) } catch { }
                    order.CurrentBatch.Fabrics[i].PreferedRollLengthsYards[m] = { 
                        Length: (lenmm / 0.9144).toString(), //Meters -> Yards
                        Width: (widthmm / 0.0254).toString(), //Meters -> Inches
                    }
                }
            }
        }

        // console.log('_convertMeters2Yards', order)
    }

    _convertYards2Meters(order)
    {
        if (order && order.CurrentBatch) 
        {
            for (var i in order.CurrentBatch.Fabrics)
            {
                var yards = order.CurrentBatch.Fabrics[i].PreferedRollLengthsYards
                order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters = []
                for (var y in yards)
                {
                    var lenyy = 0, widthin = 0
                    try { lenyy = Number.parseFloat(yards[y].Length) } catch { }
                    try { widthin = Number.parseFloat(yards[y].Width) } catch { }
                    order.CurrentBatch.Fabrics[i].PreferedRollLengthsMeters[y] = { 
                        Length: (lenyy * 0.9144).toString(), //Yards -> Meters
                        Width: (widthin * 0.0254).toString(), //Inches -> Meters
                    }
                }
            }
        }

        // console.log('_convertYards2Meters', order)
    }

    _allowEditCopies(pageindex, pageCopiesLength)
    {
        // console.log(pageindex, pageCopiesLength)
        return pageindex > 0 && pageindex < pageCopiesLength - 1
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this._manSelectOnOrderLoaded(order)

        //set ui by default value
        if (order.CurrentBatch)
        {
            // this.printReport = this.order.CurrentBatch?.PrintReport //test

            this.async(() =>
            {
                if (order.CurrentBatch.ManufacturePrintingTuningID != order.CurrentBatch.ManufacturePrintingTuningID1)
                {
                    this.set('order.CurrentBatch.ManufacturePrintingTuningID1', order.CurrentBatch.ManufacturePrintingTuningID)
                    if (this._firstOrderLoaded)
                    {
                        this.needToGoToBatchMenuItem = { ManufacturePrintingTuningID : order.CurrentBatch.ManufacturePrintingTuningID }
                        this._firstOrderLoaded = false
                    }
                }
            }, 17)

            var allpages = 0
            for (var fabi of order.CurrentBatch.Fabrics)
            {
                for (var printingi of fabi.Files)
                {
                    // console.log(printingi.PDFFileName)
                    this._lastPaperId[printingi.PDFFileName] = printingi.Paper.id

                    var pages = 0
                    if (printingi.Pages)
                    {
                        for (var pagei of printingi.Pages)
                        {
                            pages += !pagei.Copies ? 0 : parseInt(pagei.Copies)
                            pagei._oldCopies = pagei.Copies
                        }
                    }
                    printingi.selected = (pages != 0)
                    allpages += pages
                }
            }
            this.checkboxAll = allpages > 0
        }

        if (order.ManufactureOrders)
        {
            for (var i in order.ManufactureOrders)
            {
                order.ManufactureOrders[i].Batches = order.ManufactureOrders[i].Batches.reverse()
            }

            //TEST: menu
            // var temp = order.ManufactureOrders[0]
            // var arr = Array(45).fill(0)
            // for (var i in arr)
            // {
            //     var tempi = JSON.parse(JSON.stringify(temp))
            //     tempi.ManufactureOrderID += '_' + i
            //     tempi.Batches[0].BatchID += '_' + i
            //     tempi.Batches[0].ReplacementIteration = RandomInteger(0, 1)

            //     order.ManufactureOrders.push(tempi)
            // }

        }
        this._searchMenuIndex = ''
    }


    selectAllPagesHandler(e?)
    {
        const printingi = e.model.__data.printingi //order/printingindex
        if (printingi.selected)
        {
            this.restorePagesInFilesOfFabrics(printingi)
        }
        else
        {
            this.resetPagesInFilesOfFabrics(printingi)
        }
    }

    selectAllPagesForAllHandler(e?)
    {
        const checkboxAll = this.checkboxAll

        for (var fabi of this.order.CurrentBatch.Fabrics)
        {
            for (var printingi of fabi.Files)
            {
                printingi.selected = checkboxAll
            }
        }

        if (checkboxAll)
        {
            this.restorePagesInFilesOfFabrics()
        }
        else
        {
            this.resetPagesInFilesOfFabrics()
        }
    }

    restorePagesInFilesOfFabrics(printingi = null)
    {
        if (Array.isArray(this.order.CurrentBatch.Fabrics))
        {
            var fabrics = Object.assign([], this.order.CurrentBatch.Fabrics)
            var props = {}
            for (var fabi in fabrics)
            {
                if ((printingi && printingi.FabricName != fabrics[fabi].FabricName) || !fabrics[fabi].Files) { continue }

                for (var filei in fabrics[fabi].Files)
                {
                    if ((printingi && printingi.PDFFileName != fabrics[fabi].Files[filei].PDFFileName) || !fabrics[fabi].Files[filei].Pages) { continue }

                    for (var pageinx in fabrics[fabi].Files[filei].Pages)
                    {
                        // var pagei = fabrics[fabi].Files[filei].Pages[pageinx]
                        // this.order.CurrentBatch.Fabrics[fabi].Files[filei].Pages[pageinx].Copies = pagei._oldCopies
                    }
                }
            }
            this.set(`order.CurrentBatch`, JSON.parse(JSON.stringify(this.order.CurrentBatch)))
        }
    }

    resetPagesInFilesOfFabrics(printingi = null)
    {
        if (Array.isArray(this.order.CurrentBatch.Fabrics))
        {
            var fabrics = Object.assign([], this.order.CurrentBatch.Fabrics)
            var props = {}
            for (var fabi in fabrics)
            {
                if (printingi && printingi.FabricName != fabrics[fabi].FabricName) { continue }

                for (var filei in fabrics[fabi].Files)
                {
                    if (printingi && printingi.PDFFileName != fabrics[fabi].Files[filei].PDFFileName) { continue }

                    for (var pagei in fabrics[fabi].Files[filei].Pages)
                    {
                        var pp = parseInt(pagei)
                        var ll = fabrics[fabi].Files[filei].Pages.length - 1
                        if (pagei == '0' || pp == ll) { continue }
                        this.order.CurrentBatch.Fabrics[fabi].Files[filei].Pages[pagei].Copies = '0'
                    }
                }
            }
            this.set(`order.CurrentBatch`, JSON.parse(JSON.stringify(this.order.CurrentBatch)))
        }
    }

    validatePagesCopies(e, previewPrinting)
    {
        // if (!Array.isArray(orderCB_Fabrics)) { return false }

        var pagesErr = false
        var errMsg = ''
        // for (var i in this.order.CurrentBatch.Fabrics)
        // {
        //     var fabi = this.order.CurrentBatch.Fabrics[i]
        //     for (var j in fabi.Files)
        //     {
        //         var filej = fabi.Files[j]
        var filej = previewPrinting
        for (var k in filej.Pages)
        {
            var pagek = filej.Pages[k]
            var copeis = 0
            try
            {
                copeis = parseInt(pagek.Copies.trim())
                if (!Number.isFinite(copeis) || copeis < 0) { throw new Error(this.localize('admin-validation-number0')) }
            }
            catch (err)
            {
                errMsg = err.message + ' ' + (copeis)
                pagesErr = true
                this.set(`previewPrinting.Pages.${k}.notvalid`, {})
                this.set(`previewPrinting.Pages.${k}.notvalid.Copies`, err.message)
            }
        }

        //         // var pages2Print = filej.Pages2Print || ''
        //         // var copeis2Print = filej.Copies2Print || '0'
        //         // try
        //         // {
        //         //     var copeis = 0
        //         //     try
        //         //     {
        //         //         copeis = parseInt(copeis2Print)
        //         //     }
        //         //     catch (err)
        //         //     {
        //         //         this.set(`order.CurrentBatch.Fabrics.${i}.Files.${j}.notvalid`, {})
        //         //         this.set(`order.CurrentBatch.Fabrics.${i}.Files.${j}.notvalid.Copies2Print`, err.message)
        //         //         // console.log(`order.CurrentBatch.Fabrics.${i}.Files.${j}.notvalid.Copies2Print`, this.order.CurrentBatch.Fabrics[i].Files[j].notvalid)
        //         //     }
        //         //     var pages = pages2Print.split(',')
        //         //     var pagesErr = false
        //         //     for (var pi of filej.Pages) { pi.Copies = 0 }
        //         //     for (var pi of pages)
        //         //     {
        //         //         var pagei = -1
        //         //         try 
        //         //         { 
        //         //             pagei = parseInt(pi.trim())
        //         //         } 
        //         //         catch 
        //         //         { 
        //         //             pagesErr = true
        //         //         }
        //         //         var page = filej.Pages[pagei - 1]
        //         //         if (page && copeis > 0) 
        //         //         { 
        //         //             page.Copies = copeis 
        //         //         }
        //         //         else
        //         //         {
        //         //             pagesErr = true
        //         //         }
        //         //         // console.log(i + '-p' + pagei + ' = ' + copeis + '')
        //         //     }
        //         //     if (pagesErr) { throw new Error('Bad pages') }
        //         // }
        //         // catch (err)
        //         // {
        //         //     this.set(`order.CurrentBatch.Fabrics.${i}.Files.${j}.notvalid`, {})
        //         //     this.set(`order.CurrentBatch.Fabrics.${i}.Files.${j}.notvalid.Pages2Print`, err.message)

        //         //     this.showToast(err.message)
        //         //     e.preventDefault()
        //         //     e.stopPropagation()
        //         //     return false
        //         // }
        //     }
        // }

        if (pagesErr)
        {
            this.showToast(errMsg)
            if (e)
            {
                e.preventDefault()
                e.stopPropagation()
            }
            return false
        }

        return true
    }

    _onPagesRestoreTap(e)
    {
        this._reloadTap(e)
    }

    _onPagesResetTap(e)
    {
        this.resetPagesInFilesOfFabrics()
        this.checkboxAll = false
        this.selectAllPagesForAllHandler()
    }

    _showPreviewPrintingChanged(a, b)
    {
        // console.log(a, b)
        if (b == false && a == true) //show
        {
            if (!this._suppressHistory)
            {
                var state = { 'print-preview': this.previewID }
                var title = 'print-preview'
                var url = window.location.href.replace(window.location.hash, "") + '#' + this.previewID
                window.history.pushState(state, title, url)
                this._lastState = state
            }
        }

        if (b == true && a == false)
        {
            //
            this.lensOn = false

            if (window.history.length > 0 && !this._suppressHistory) 
            {
                // console.log('history: ' + window.history.length)
                window.history.back()
            }
        }
    }

    async showPreviewTap(e?)
    {
        if (!e) { this.showPreviewPrinting = true }

        var printingi_data = e.model.__data
        var fabrici_data = e.model.__dataHost.__dataHost.__data
        this.previewPrintingData = { printingindex: printingi_data.printingindex, fabricindex: fabrici_data.fabricindex }
        var url = this._computeAPIUrl(this.websiteUrl, this.APIPath, 'file-get-images')
        var qpars = { 
            pdfid: printingi_data.printingi.ManufacturePDFID, 
        }
        
        this.loadingCmd = true
        this.cmdGet(url, qpars, (result, response, rq) => 
        {
            if (response?.success)
            {
                var previewPrinting = JSON.parse(JSON.stringify(printingi_data.printingi))
                for (var i in previewPrinting.Pages)
                {
                    previewPrinting.Pages[i] = Object.assign({}, previewPrinting.Pages[i], result.Pages[i])
                }
                this.previewPrinting = previewPrinting
                this.showPreviewPrinting = true
            }
        })
    }

    async showBackPreviewTap(e?)
    {
        if (!e) { this.showPreviewPrinting = true }

        var printingi_data = e.model.__data
        var fabrici_data = e.model.__dataHost.__dataHost.__data
        this.previewPrintingData = { printingindex: printingi_data.printingindex, fabricindex: fabrici_data.fabricindex }
        var url = this._computeAPIUrl(this.websiteUrl, this.APIPath, 'file-get-images')
        var qpars = { 
            pdfid: printingi_data.printingi.ManufacturePDFID, 
        }
        
        this.loadingCmd = true
        this.cmdGet(url, qpars, (result, response, rq) => 
        {
            if (response?.success)
            {
                var previewPrinting = JSON.parse(JSON.stringify(printingi_data.printingi.SandwichBack))
                for (var i in previewPrinting.Pages)
                {
                    previewPrinting.Pages[i] = Object.assign({}, previewPrinting.Pages[i], result.SandwichBack.Pages[i])
                }
                this.previewPrinting = previewPrinting
                this.showPreviewPrinting = true
            }
        })
    }

    _closeDebouncer: Debouncer
    closePreview()
    {
        //this._suppressHistory = true
        this._suppressReload = true
        this.showPreviewPrinting = false
        this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(100), () =>
        {
            this._suppressReload = false
        })
        //this._suppressHistory = false
    }

    closePreviewByHistory()
    {
        if (window.history.length > 0) { window.history.back() }
    }

    closePreviewTap(e?)
    {
        this.closePreviewByHistory()
    }

    applyPreviewTap(e?)
    {
        if (!this.previewPrintingData || !this.previewPrinting) { return }
        
        var fabi = this.previewPrintingData.fabricindex
        var filei = this.previewPrintingData.printingindex
        // console.log(this.previewPrinting, this.order.CurrentBatch.Fabrics[fabi].Files[filei])

        if (this.validatePagesCopies(e, this.previewPrinting))
        {
            for (var i in this.previewPrinting.Pages)
            {
                var pathi = `order.CurrentBatch.Fabrics.${fabi}.Files.${filei}.Pages.${i}.Copies`
                // console.log(pathi, this.previewPrinting.Pages[i].Copies)
                this.set(pathi, this.previewPrinting.Pages[i].Copies)
            }
            this.set(`order.CurrentBatch`, JSON.parse(JSON.stringify(this.order.CurrentBatch)))

            // var pathi = `order.CurrentBatch.Fabrics.${this.previewPrintingData.fabricindex}.Files.*`
            // this.notifyPath(pathi)
            //preview is closed
            this.set('previewPrinting', { Pages: [] })

            this.showToast(this.localize('admin-ws-printing-toast-pagescopies'))
            this.closePreview()
        }
        else
        {
            //back
        }


        if (this.previewPrinting == this.order.CurrentBatch.Fabrics[fabi].Files[filei])
        {
            // this.showToast('Pages copies are reverted ...')
        }
        else
        {

            // validatePagesCopies(e, orderCB_Fabrics)
        }
    }


    _formatPageIndex(inx)
    {
        return super._formatIndex(inx - 1)
    }

    _formathPagesLength(length)
    {
        return length - 2
    }

    // resultRect: ClientRect
    cx: number
    cy: number
    lens: any
    lensOn: boolean = false

    _initLens()
    {
        this.lens = document.createElement("div")
        this.lens.setAttribute("class", "img-zoom-lens")
        this.previewpagescontainer.appendChild(this.lens)
    }

    _tapLens(e)
    {
        this._moveLens(e, null, true)
        this.lensOn = !this.lensOn
    }

    _lensImageTransitionend(e)
    {
        var epath = e.path || e.composedPath()
        var img = (epath && epath[0] && epath[0].tagName == 'IMG') ? epath[0] : null
        // console.log(e)
        // console.log(this.switchingAnimation, '=>', false)
        this.switchingAnimation = false
        // console.log(img.getBoundingClientRect())
    }

    lensimg: any
    lensSfx: any
    lensSfy: any
    lensImg: any

    _moveLens(e, b: null | undefined = undefined, switching = false) 
    {
        var pos, x, y
        var epath = e.path || e.composedPath()
        var img = (epath && epath[0] && epath[0].tagName == 'IMG') ? epath[0] : null
        this.lens.style.display = this.lensOn ? 'block' : 'none'
        if (img && this.lensimg != img) { this.lensimg = img }
        if (!img && this.lensimg) { img = this.lensimg }
        if (!img || this.previewpagescontainer.style.display == 'none' || !this.showPreviewPrinting) { return }

        var pageindex = this._findPageIndex(this.previewPrinting.Pages, img.src)
        if (pageindex == -1) { return }

        var imgs = this.previewPrinting.Pages[pageindex].PreviewImages
        var imageindex = -1
        var imageLastIndex = imgs.length - 1 
        for (var i in imgs)
        {
            if (imgs[i] == img.src)
            {
                imageindex = parseInt(i)
                break
            }
        }

        pos = this.getCursorPos(e)

        // calculate the position of the lens:
        x = pos.x - this.lens.offsetWidth
        y = pos.y - this.lens.offsetHeight * 3 / 2 + this.previewpagescontainer.scrollTop 
        this.lens.style.left = x + "px"
        this.lens.style.top = y + "px"

        if (switching)
        {
            this.switchingAnimation = true
            var imageindex2 = -1
            for (var i in imgs)
            {
                if (imgs[i] == img.src)
                {
                    imageindex2 = parseInt(i)
                    break
                }
            }
            
            //get the cursor's x and y positions:
            img.style = ''
            this.lensImg = null
            var imgRect = img.getBoundingClientRect()
            this.lensImg = {
                imageindex: imageindex2,
            }
            if (this.lensOn)
            {
                this.lensImg = Object.assign(this.lensImg, {
                    x2: imgRect.x,
                    y2: imgRect.y,
                    width2: img.width,
                    height2: img.height,
                    scalef: 1,
                })
            }
            else
            {
                this.lensImg = Object.assign(this.lensImg, {
                    x: imgRect.x,
                    y: imgRect.y,
                    width: img.width,
                    height: img.height,
                    scalef: img.naturalWidth / img.width,  
                })
            }
            
            var imgElements = this.previewpagescontainer.querySelectorAll('img')
            this.lensImg['imgrects'] = {}
            for (var i of Object.keys(imgElements))
            {
                this.lensImg['imgrects'][imgElements[i].src] = imgElements[i].getBoundingClientRect()
            }
        }

        if (this.lensImg)
        {
            var recti = this.lensImg['imgrects'][img.src]
            // var sf = img.naturalWidth / this.lensImg.height
            var posx = (pos.x - this.lensImg.x)
            var posy = (pos.y - recti?.y)
            var sfx = 100 * posx / this.lensImg.width
            var sfy = 100 * posy / this.lensImg.height
            // console.log(`${pos.y}px`)

            if (sfx > 100) { sfx = 100 }
            if (sfx < 0) { sfx = 0 }
            if (sfy > 100) { sfy = 100 }
            if (sfy < 0) { sfy = 0 }

            img.style.transformOrigin = `${sfx}% ${sfy}%`
            img.style.setProperty('--page-image-zoomfactor',  `${this.lensImg.scalef}`)
            // console.log('-movelens 1', img?.style?.transformOrigin, this.lensImg?.scalef)
        }
        else
        {
            img.style.transformOrigin = `50% 50%`
            img.style.setProperty('--page-image-zoomfactor',  `2`)
            // console.log('-movelens 2', img?.style?.transformOrigin, this.lensImg?.scalef)
        }


        //prevent any other actions that may occur when moving over the image:
        e.preventDefault()
    }

    _findPageIndex(pages, imgsrc)
    {
        var pinx = -1
        for (var i in pages)
        {
            var ri = pages[i].PreviewImages.filter(k => k.Source == imgsrc)
            if (ri.length > 0)
            {
                pinx = parseInt(i)
                break
            }
        }
        return pinx
    }

    getCursorPos(e) 
    {
        var x = 0, y = 0
        e = e || window.event
        x = e.pageX
        y = e.pageY
        if (x === undefined) 
        {
            x = e.detail.sourceEvent.pageX
            y = e.detail.sourceEvent.pageY
        }
        x = x - window.pageXOffset
        y = y - window.pageYOffset
        return {
          x: x,
          y: y
        }
    }

    _onResized(e?)
    {
        this.lensImg = null
        this.lensOn = false
    }

    _pageSliceStyle(imagei, arrImages, lengthMeters, widthMeters)
    {
        // <!--Copies: 1
        // Image:
        // "https://wwwdev.teamatical.com/api/v1.0/image/get?i0x=jE.y.4mEh4pWWiF7u6JeHHlh0eCEEeRaa.gKHCXIurC_TaS9Xsr9AqHzLy9TQOrTSycpu.2F57ydmG7yiVXGD.t_ecCKdDlEI0qRcbZDiEA"
        // LengthMeters: 0.09863899999999998
        // WidthMeters: 1.8288
        // RasterizationTimeTicks: 15541390

        // var ratio = pagei.WidthMeters / pagei.LengthMeters
        //var ratio = pagei.LengthMeters / pagei.WidthMeters
        var rh = lengthMeters / arrImages.length
        var rw = widthMeters
        var r = (rw / rh) * 100 

        var st = ''
        // st += `padding-top:${r}%;`
        // padding-top: 56.25%; /* 16:9 Aspect Ratio (divide 9 by 16 = 0.5625) */
        // cursor: crosshair;"
        st += 'object-fit: cover; '
        st += 'width: 100%; '
        // st += 'height: auto !important; '
        // st += `aspect-ratio: ${rh} / ${rw}; `
        // st += "height: " + ratio + "vw;"
        return st
    }

    _pageTitle(pagei)
    {
        var ms = pagei?.RasterizationTimeTicks / 10000
        var s = 0
        var loc_units = 'ms'
        if (ms > 100)
        {
            s = ms / 1000
            loc_units = 's'
        }
        var ts = s ? this._formatDouble(s) : this._formatDouble(ms)
        return this.localize(`admin-ws-printing-rasterizationtime-${loc_units}`, 'ts', ts)
    }

    _notFirstOrLast(fileinx, filei_pages, fn)
    {
        return (fileinx != 0 && fileinx != (filei_pages.length - 1))
    }

    //filei.Type, pagei.ImagesBegin, pagei.ImagesEnd
    // _getHasSkippedItems(type, images, pageCopyLengthMeters)
    // {
    //     // var b = this._getBeginOfPage(images, pageCopyLengthMeters)
    //     // var e = this._getEndOfPage(images, pageCopyLengthMeters)
    //     // var r = false
    //     // if (Array.isArray(r) && Array.isArray(e) && Array.isArray(images))
    //     // {
    //     //     r = images.length !== (b.length + e.length)
    //     // }
    //     // return r

    //     // var r = this._getEndOfPage(images, pageCopyLengthMeters)
    //     // return Array.isArray(r) && r.length > 0 ? true : false

    //     // return this._getSkippedLengthOfPage(type, images, pageCopyLengthMeters) > 0
    //     return true
    // }

    // //filei.Type, pagei.ImagesBegin, pagei.ImagesEnd, pagei.LengthMeters, 'yd'
    // _getSkippedLengthOfPage(type, images, pageCopyLengthMeters, units = 'yd')
    // {
    //     // var lenSlice = (pageCopyLengthMeters / images.length)
    //     // var beginImgs = this._getBeginOfPage(type, images, pageCopyLengthMeters)
    //     // var endImgs = this._getEndOfPage(images, pageCopyLengthMeters, beginImgs)
    //     // var skipedMeters = pageCopyLengthMeters - beginImgs.length * lenSlice - endImgs.length * lenSlice
    //     // return this._formatMeters(skipedMeters, units)
    //     return ''
    // }

    // _getBeginOfPage(type, images, pageCopyLengthMeters)
    // {
    //     if (!Array.isArray(images) || images.length < 2) { return images }

    //     var lenSlice =  Math.round(0.35 / (pageCopyLengthMeters / images.length))
    //     if (lenSlice < 1) { lenSlice = 1 }
    //     return images.slice(0, lenSlice)
    // }

    // _getEndOfPage(type, images, pageCopyLengthMeters, beginImgs = null)
    // {
    //     if (!Array.isArray(images)) { return images }

    //     var b = beginImgs == null
    //     beginImgs = beginImgs ? beginImgs : this._getBeginOfPage(type, images, pageCopyLengthMeters)
    //     var endImgs = images

    //     // console.log(images?.length, pageCopyLengthMeters)
    //     if (images.length > 1)
    //     {
    //         var lenSlice =  Math.round(0.35 / (pageCopyLengthMeters / images.length))
    //         if (lenSlice < 1) { lenSlice = 1 }
    //         lenSlice = lenSlice * -1
    //         endImgs = images.slice(lenSlice)
    //         if (b) { console.log('endImgs-1', endImgs) }
    //     }
    //     if (Array.isArray(beginImgs))
    //     {
    //         var mergeImgs = []
    //         for (var imgi of endImgs)
    //         {
    //             var has = beginImgs.filter(i => i == imgi)
    //             if (has.length < 1)
    //             {
    //                 mergeImgs.push(imgi)
    //             }
    //         }
    //         endImgs = mergeImgs
    //     }
    //     // console.log('_getEndOfPage', pageCopyLengthMeters, endImgs, beginImgs)
    //     return endImgs
    // }
    // _getSliceLength(type, images_length, pageCopyLengthMeters)
    // {

    // }

    _buildPaperReport(raperReportArr)
    {
        // if (!Array.isArray(images) || images.length < 2) { return images }

        // var lenSlice =  Math.round(0.35 / (pageCopyLengthMeters / images.length))
        // if (lenSlice < 1) { lenSlice = 1 }
        // return images.slice(0, lenSlice)

        // raperReportArr = raperReportArr.slice(1,2) //TEST

        for (var pinx in raperReportArr)
        {
            var paperi = raperReportArr[pinx]
            for (var finx in paperi.Files)
            {
                var filei = paperi.Files[finx]
                for (var pageinx in filei.Pages)
                {
                    var pagei = filei.Pages[pageinx]
                    var h_px = pagei.PreviewImagesLow.reduce((acc, i) => {
                        return acc + i.Height
                    }, 0)
                    var dpm = h_px / pagei.LengthMeters
                    var maxSliceM = filei.Type == 'SublimationBindings' ? 0.10 : 0.35
                    // console.log(finx, pageinx, dpm, `${maxSlice}m`)
                    // const sum = array.reduce((accumulator, element) => {
                    //     return accumulator + element;
                    //   }, 0);

                    if (pagei.PreviewImagesLow.length > 2 && (2 * maxSliceM < pagei.LengthMeters))
                    {
                        // var lenSlice =  Math.round(0.35 / (pageCopyLengthMeters / images.length))
                        // if (lenSlice < 1) { lenSlice = 1 }
                        // return images.slice(0, lenSlice)
                        pagei.ImagesBegin = []
                        pagei.ImagesEnd = []
                        var h = 0, hb = 0, he = 0
                        for (var i in pagei.PreviewImagesLow)
                        {
                            var imgi = pagei.PreviewImagesLow[i]
                            var d = imgi.Height / dpm
                            if (h < maxSliceM)
                            {
                                pagei.ImagesBegin.push(imgi)
                                hb += d
                            }
                            else if ((h + d) >= maxSliceM && (h + d) >= (pagei.LengthMeters - maxSliceM))
                            {
                                pagei.ImagesEnd.push(imgi)
                                he += d
                            }
                            h += d
                        }
                        var hz = pagei.LengthMeters - hb - he
                        // console.log(`${hb}m | ~ ${hz}m ~ | ${he}m --- s: ${pagei.LengthMeters}m`)
                        pagei.ImagesBreak = hz
                    }
                    else
                    {
                        pagei.ImagesBegin = [...pagei.PreviewImagesLow]
                        pagei.ImagesEnd = []
                        pagei.ImagesBreak = ''
                    }
                    // console.log(pagei.ImagesBegin, pagei.ImagesBreak, pagei.ImagesEnd)
                }
            }
        }
        return raperReportArr
    }

    _onKeydownEvent(e)
    {
        if (!this.visible) { return }

        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!e.ctrlKey && !e.altKey && !e.shiftKey && keyboardEventMatchesKeys(e, 'esc') && this.previewPrintingData && this.previewPrinting)
        {
            this.closePreview()
        }
        else if (keyboardEventMatchesKeys(e, 'enter') && this.previewPrintingData && this.previewPrinting)
        {
            this.applyPreviewTap()
        }
        else if (e.ctrlKey && !e.altKey && !e.shiftKey && keyboardEventMatchesKeys(e, 'p') && this._asBool(this.order.CurrentBatch.PapersReport))
        {
            this._onPapersReportTap()
            e.preventDefault()
            e.stopPropagation()
        }

        this._searchBatchHandler(e)
    }

    _inputPagesInline(plength)
    {
        return plength <= (2 + 2) //first and last not showing
    }

    applyDialogpagecopiesTap(e)
    {
        if (!this.dialogpagecopies?.printingi) { return }
        
        var fabi = this.dialogpagecopies.fabricindex
        var filei = this.dialogpagecopies.printingindex
        if (true) //this.validatePagesCopies(e, this.dialogpagecopies.printingi))
        {
            for (var i in this.dialogpagecopies.printingi.Pages)
            {
                var pathi = `order.CurrentBatch.Fabrics.${fabi}.Files.${filei}.Pages.${i}.Copies`
                this.set(pathi, this.dialogpagecopies.printingi.Pages[i].Copies)
            }
            this.set(`order.CurrentBatch`, JSON.parse(JSON.stringify(this.order.CurrentBatch)))

            this.showToast(this.localize('admin-ws-printing-toast-pagescopies'))
        }
        else
        {
            //back
        }
    }

    showDialogPageCopiesTap(e)
    {
        var dialogpagecopies = this.$.dialogpagecopies as UIAdminDialog
        if (dialogpagecopies)
        {
            var printingi: any = e.model.__data.printingi
            var printingindex: any = e.model.__data.printingindex
            var fabricindex = e.model.__dataHost.__dataHost.__data.fabricindex

            this.set('dialogpagecopies', { 
                loading: false, 
                printingi: printingi,
                fabricindex: fabricindex,
                printingindex: printingindex,
            })
            dialogpagecopies.open()
        }
    }


    _searchMenuIndex: any
    _searchStartOpening: boolean
    _searchBatchFocus()
    {
        this._searchStartOpening = true
        this.async(() =>
        {
            var el = this.shadowRoot?.querySelector('.batch-search-text') as HTMLElement
            if (el) { el.focus() }
            this._searchStartOpening = false
        })
    }

    _searchBatchTap(e)
    {
        this._searchStart = true
        e.target.blur()
        this._searchBatchFocus()
    }

    _searchableStr = ''
    _searchStart = false
    _searchDebouncer: Debouncer
    _searchBatchHandler(e)
    {
        if (e.altKey || !e?.key || this.loadingAny || !this.visible) { return }

        var hasFocus = document.activeElement == document.body
        var epath = e.path || e.composedPath()
        var el = epath ? epath.filter((i, inx) => { return i?.id == 'batch-selector' }) : null
        if (el?.length > 0) 
        { 
            epath[0].blur()
            this._searchBatchFocus()
            hasFocus = true 
        }
        if (!hasFocus) { return }

        var ekey = e.key
        if (keyboardEventMatchesKeys(e, 'backspace') && this._searchableStr?.length > 0)
        {
            this._searchableStr = e.ctrlKey ? '' : this._searchableStr.substring(0, this._searchableStr.length - 1)
        }
        else if (!e.ctrlKey && keyboardEventMatchesKeys(e, 'esc'))
        {
            this._searchStart = false
            this._searchableStr = ''
        }
        else if (!e.ctrlKey && keyboardEventMatchesKeys(e, 'enter') && this._searchableStr)
        {
            let morders = this.order.ManufactureOrders
			let strlower = this._searchableStr.toLowerCase()
            if (Array.isArray(morders) && strlower)
            {
				let found = false
				for (var morderi of morders)
				{
					for (var batchi of morderi.Batches)
					{
						var bname = this._batchName(batchi.BatchID, batchi.ReplacementIteration)?.toLowerCase()
						if (bname.indexOf(strlower) >= 0)
						{
							// console.log('go to ... impl.', this._searchableStr, bname)
							found = true
							this._searchStart = false
							this._searchableStr = ''
							this.onSelectedBatch({detail: { value: { __dataHost: { __data: { batchi: batchi } } } } })
                            this.needToGoToBatchMenuItem = batchi
							break
						}
					}
					if (found) { break }
				}
            }
        }
        else if (!e.ctrlKey && ekey?.length === 1)
        {
            this._searchableStr += ekey
        }


        if (this._searchableStr?.length >= 1 && !this._searchStart) 
        { 
            this._searchStart = true
        }
    }

    _batchSearchInitial(batchFilterList)
    {
        if (Array.isArray(batchFilterList))
        {
            this.set('batchFilter', batchFilterList[0])
        }
    }

    batchMenuLASTSTR: string
    _buildBatchSearchDebouncer: Debouncer
    async _buildBatchSearchHandler(orderManufactureOrders, batchFilterID, searchStr)
    {
        // console.log('_buildBatchSearchHandler', orderManufactureOrders, batchFilterID, searchStr)
        var batchMenu: any = []
        if (Array.isArray(orderManufactureOrders))
        {
            for (var morderi of orderManufactureOrders)
            {
                for (var batchi of morderi.Batches)
                {
                    batchMenu.push(Object.assign({ }, batchi, 
                        {
                            ManufactureOrderID: morderi.ManufactureOrderID,
                            name: batchi.ManufacturePrintingTuningID,
                            title: this._batchName(batchi.BatchID, batchi.ReplacementIteration),
                        }))
                }
            }
        }
        
        // console.log(batchMenu.map(i => i.title))
        if (batchFilterID != 'ALL')
        {
            batchMenu = batchMenu.filter(batchi => 
            {
                if (batchFilterID == 'TEST' && batchi.Sandbox) { return true }
                if (batchFilterID == 'SPOT' && this._asBool(batchi.SpotColors)) { return true }
                if (batchFilterID == 'FREEZED' && this._asBool(batchi.FreezeStatus?.IsCompleted)) { return true }
                if (batchFilterID == 'PUSHEDTOFTP' && this._asBool(batchi.PushStatus?.IsCompleted)) { return true }
                if (batchFilterID == 'RASTERIZED' && this._asBool(batchi.RasterizeStatus?.IsCompleted)) { return true }
                if (batchFilterID == 'PRINTED' && this._asBool(batchi.PrintStatus?.IsCompleted)) { return true }
                if (batchFilterID == 'TRANSFERRED' && this._asBool(batchi.TransferringStatus?.IsCompleted)) { return true }
                if (batchFilterID == 'CUTTED' && this._asBool(batchi.CuttingStatus?.IsCompleted)) { return true }
                return false
            })
        }

        if (searchStr)
        {
            if (!this._searchMenuIndex)
            {
                const module = await import('../../components/utils/elasticlunr.js')
                const elasticlunr = module.default
                elasticlunr.clearStopWords()
                var qsindex: any = elasticlunr(function ()
                {
                    this.setRef('n')
                    this.addField('t')
                })
                for (var batchi of batchMenu)
                {
                    if (batchi.name.lastIndexOf('-sep') >= 0) { continue }
                    qsindex.addDoc({
                        n: batchi.name,
                        t: batchi.title,
                    })
                }
                this._searchMenuIndex = qsindex
            }

            if (this._searchMenuIndex)
            {
                var r = this._searchMenuIndex.search(searchStr.trim(), {
                    fields: { t: { boost: 1 } },
                    expand: true,
                })
                batchMenu = batchMenu.reduce((accumulator, i, index, array) => 
                {
                    let findexact = r.filter(f => { return f.doc.n == i.name })?.length > 0
                    if (findexact) { accumulator.push(i) }
                    return accumulator
                }, [])

            }
        }

        if (JSON.stringify(batchMenu) != this.batchMenuLASTSTR)
        {
            this.set('batchMenu', batchMenu)
        }
        this.batchMenuLASTSTR = JSON.stringify(batchMenu)

        if (this.needToGoToBatchMenuItem)
        {
            var batchi = this.needToGoToBatchMenuItem
            this.needToGoToBatchMenuItem = null
            this.async(() => {
                this.set('order.CurrentBatch.ManufacturePrintingTuningID1', this.order.CurrentBatch.ManufacturePrintingTuningID)
                this.gotoBatchMenuItem(batchi)
            })
        }
    }

    async _buildBatchSearch(orderManufactureOrders, batchFilterID, searchStr)
    {
        // console.log('_buildBatchSearch', orderManufactureOrders, batchFilterID, searchStr)
        this._buildBatchSearchDebouncer = Debouncer.debounce(this._buildBatchSearchDebouncer, timeOut.after(200), 
            async () => { await this._buildBatchSearchHandler(orderManufactureOrders, batchFilterID, searchStr) }
        )
    }

}
