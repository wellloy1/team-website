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
import { FragmentBase } from '../fragments/fragment-base'
import view from './workstation-bundling.ts.html'
import style from './workstation-bundling.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import { UIScannerPrinterSettings } from '../ui/ui-scanner-printer-settings'
import '../ui/ui-scanner-printer-settings'
import '../ui/production-sewing-item'
import '../../components/bll/user-bot-data'
import '../../components/ui/ui-image'
import '../../components/ui/ui-image-multiview-3d'
import '../../components/ui/ui-image-svg'
import '../../components/ui/ui-order-item'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
// const Teamatical: TeamaticalGlobals = window['Teamatical']
import { Md5 } from "md5-typescript"
const MD5 = (str) => { return Md5.init(str).toUpperCase() }


@WorkstationDynamic
class AdminWorkstationBundling extends WorkstationBase
{
    static get is() { return 'tmladmin-workstation-bundling' }

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

            APIPath: { type: String, value: '/admin/api/workstation/bundling-' },
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

            dialogMode: { type: Boolean, value: false, reflectToAttribute: true }, // dialog-mode

            zoompconfi: { type: Object },
            zoompconfiVisible: { type: Boolean, value: false },
        }
    }

    _netbase: any
    _observer: any
    loading: any
    env: any
    approveCount: string
    printCount: string
    groupLabels: any
    zoompconfi: any
    zoompconfiVisible: boolean


    static get observers()
    {
        return [
            '_dataReloadOnAuthChanged(visible, queryParams, userInfo.isBotAuth, userInfo.isAuth, api_subscribe)',
            '_orderChanged(order)',
        ]
    }

    // _log(v) { console.log(v) }

    get scannerprintersettings(): UIScannerPrinterSettings { return this.$['scanner-printer-settings'] as UIScannerPrinterSettings }


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

    _orderChanged(order)
    {
        if (!order) { return }

        // order.Shapes = [
        // ]
    }

    onBarcode(barcode)
    {
        this.async(() =>
        {
            var efake = { target: { parentElement: { value: barcode } } }
            this._barcodeTap(efake)
        })
        return true
    }

    onInputChanged(e)
    {
        this.set('order.Invalid', false)
        return this._onInputChanged(e)
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
        })

        // this.push('order.Replacements', repObj)
        // repObj.index = this.order.Replacements.length - 1
        // this.unshift('order.Replacements', repObj)
        repObj.index = 0
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

    partsColumnStyle(partHeaders)
    {
        var columns = (partHeaders?.length ?? 0) + 1
        return `--product-parts-colnum: ${columns};`
        // grid-row-gap: 16px;
    }

    // partsProductStyle(partHeaders, productsArr, productIndex)
    // {
    //     var columns = (partHeaders?.length ?? 1) + 1
    //     var rowsBegin = 0
    //     for (var i in productsArr)
    //     {
    //         if (i == productIndex) { break }
    //         rowsBegin += productsArr[i].Parts?.length
    //     }
    //     rowsBegin += 2 //0 + header
    //     var rowsEnd = rowsBegin
    //     return `grid-column-start: ${columns}; grid-column-end: ${columns}; grid-row-start: ${rowsBegin}; grid-row-end: ${rowsEnd};`
    // }

    partsProductImgStyle(partHeaders, productsArr, productIndex)
    {
        var columns = (partHeaders?.length ?? 1) + 1
        var rowsBegin = 0
        for (var i in productsArr)
        {
            if (i == productIndex) { break }
            rowsBegin += productsArr[i].Parts?.length
        }
        rowsBegin += 2 //0 + header
        var rowsEnd = rowsBegin + (productsArr[productIndex]?.Parts?.length) 
        return `grid-column-start: ${columns}; grid-column-end: ${columns}; grid-row-start: ${rowsBegin}; grid-row-end: ${rowsEnd};`
    }

    _getPartName(partsHeader, index)
    {
        // console.log(partsHeader, index)
        return partsHeader ? partsHeader[index]?.PartName : ''
    }


    onOpenZoomDialog(e)
    {
        this.zoompconfiVisible = true
        // console.log(e)
    }

    onCloseZoomDialog(e)
    {
        this.zoompconfiVisible = false
        // console.log(e)
    }

    onProductImageTap(e)
    {
        var producti = e.model.__dataHost.__dataHost.__data.producti

        if (!producti || !producti.ProductConfiguration) { return }

        this.zoompconfi = producti.ProductConfiguration
        for (var i in this.zoompconfi.ProductViews)
        {
            if (i == '0')
            {
                this.zoompconfi.ProductViews[i].Selected = true
            }
            this.zoompconfi.ProductViews[i].ViewId = MD5(this.zoompconfi.ProductViews[i].ImageUrl)
        }
        // console.log(this.zoompconfi)
        FragmentBase.__openDlg(this, this.$.dialogzoom as PaperDialogElement)
    }

    checkboxCompletedChangeHandler(e)
    {
        // var shapei = e.model.__data.shapei
        var producti = e.model.__data.producti
        var repObj: any = {
            Barcode: this.order.Barcode,
            id: producti.id,
            etag: producti.etag,
            completed: producti.completed,
        }
        this.api_action = 'completed'
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
        // this.showToast('Product mark as completeed: ' + producti.completed)
    }
    
}
