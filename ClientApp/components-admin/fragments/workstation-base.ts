import { FragmentBase, FragmentDynamic } from './fragment-base'
import { IAdminSignalR } from '../../components/bll/signalr-global'



export class WorkstationBase extends FragmentBase implements IAdminSignalR
{
    constructor()
    {
        super()
    }

    _modalDialogHandler: any
    loading: any
    _reloadHandler: any
    _lastManId: any
    tabletMode: boolean
    api_subscribe: boolean
    dialogMode: boolean


    connectedCallback()
    {
        super.connectedCallback()

        if (!this._modalDialogHandler) { this._modalDialogHandler = (e) =>  { this.dialogMode = this._asBool(e?.detail?.opening) } }
        this.addEventListener('tmladmin-ui-dialog-opening', this._modalDialogHandler)
        this.addEventListener('tmladmin-ui-dialog-closed', this._modalDialogHandler)
    }

    disconnectedCallback()
    {
        if (this._reloadHandler) { clearTimeout(this._reloadHandler) }
        if (this._modalDialogHandler)
        {
            this.removeEventListener('tmladmin-ui-dialog-opening', this._modalDialogHandler)
            this.removeEventListener('tmladmin-ui-dialog-closed', this._modalDialogHandler)
        }

        super.disconnectedCallback()
    }

    _formatInvalid(invalid, invalidMessage, locale_msg)
    {
        if (!invalid) { return '' }

        return this._asBool(invalidMessage) ? invalidMessage : this.localize(locale_msg)
    }

    _requestObject(order)
    {
        if (!order) { return order }

        var r: any = {
            Barcode: order.Barcode,
            SubscriptionsState: order.SubscriptionsState,
        }
        if (order.Manufacturer) { r.Manufacturer = order.Manufacturer }
        return r
    }

    _visibleChanged2(visible, ov)
    {
        if (ov == true && visible == false && this.order) 
        {
            this.api_action = 'end'
            this._fetchItems(-1, null, this._requestObject(this.order))
        }
    }

    _tabletDetection(queryParams_tablet)
    {
        if (queryParams_tablet === '' || queryParams_tablet == 'true')
        {
            this.tabletMode = true
        }
    }

    _scannerUIVisible(visible, tabletMode)
    {
        return visible && !tabletMode
    }

    _manSelectOnOrderLoaded(order)
    {
        if (!order) { return }

        if (order.Manufacturer && order.Manufacturer.ManufacturerID)
        {
            this._lastManId = order.Manufacturer.ManufacturerID
        }
    }

    _manSelected(manid)
    {
        // console.log(manid)
        if (this.loading) { return }
        if (this._lastManId == manid) { return }
        this._lastManId = manid

        // this.order.Manufacturer.ManufacturerID = manid
        this.dialogcancel_reason = ''
        delete this.order.Barcode //need to clean  because Manufacturer change
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order))
    }


    SR_ReconnectHandler()
    {
        this.set('api_subscribe', true)
        // console.log('SR_ReconnectHandler => api_subscribe = true')
    }

    SR_DisconnectHandler()
    {
        this.set('api_subscribe', false)
    }

    scheduleAutoReload(initial = false)
    {
        return 
        // // if (this.env == 'Development') { return }

        // var signalr_connid = NetBase.prototype.__static_get_signalr_connid()
        // if (signalr_connid)
        // {
        //     //connection has been established
        // }
        // else
        // {
        //     if (this._reloadHandler) { clearTimeout(this._reloadHandler) }
        //     this._reloadHandler = setTimeout((e) => this.simpleReload(e), initial ? 6000 : 2000)
        // }
    }

    simpleReload(e)
    {
        this.dialogcancel_reason = ''
        this.api_action = 'get'
        this._fetchItems(3, null, this._requestObject(this.order), () =>
        {
            this.scheduleAutoReload()
        })
    }

    __dataReloadOnAuthChanged_State = { userInfo_isBotAuth: undefined as undefined | boolean, userInfo_isAuth: undefined as undefined | boolean, api_subscribe: undefined as undefined | boolean }
    _dataReloadOnAuthChanged(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth, api_subscribe)
    {
        // console.log(visible, queryParams, userInfo_isBotAuth, userInfo_isAuth)
        if (visible !== true || queryParams == undefined) { return }
        if (this.machineAuthorization && !userInfo_isBotAuth && queryParams['client_secret']) { return }
        if (!this.machineAuthorization && !userInfo_isAuth) { return }
        if (this.__dataReloadOnAuthChanged_State.userInfo_isBotAuth === userInfo_isBotAuth 
            && this.__dataReloadOnAuthChanged_State.userInfo_isAuth === userInfo_isBotAuth
            && this.__dataReloadOnAuthChanged_State.api_subscribe === api_subscribe) { return }
        this.__dataReloadOnAuthChanged_State = { userInfo_isBotAuth: userInfo_isBotAuth, userInfo_isAuth: userInfo_isBotAuth, api_subscribe: api_subscribe }
        
        //check vars
        if (this.queryParamsRequired)
        {
            for (var i in this.queryParamsRequired) 
            {
                var v = this.queryParamsRequired[i]
                if (queryParams[v] == undefined) { return }
            }
        }
        this._setLoading(false)

        if (api_subscribe === true && !this.order?.SubscriptionsState) 
        {
            this.api_action = 'subscribe'
            this._fetchItems(3, null, this._requestObject(this.order))
            // console.log('_dataReloadOnAuthChanged => subscribe...')
        }
        else
        {
            this.reload()
            // console.log('_dataReloadOnAuthChanged => reload...')
        }
        // console.log(visible, queryParams, userInfo_isAuth)
    }

    onBarcode(barcode)
    {
        return false //no barcode handler implementation
    }

    _barcodeTap(e)
    {
        var barcodeStr = e?.target?.parentElement?.value
        if (barcodeStr)
        {
            // console.log('w-base', barcodeStr)
            barcodeStr = barcodeStr.trim()
            //parse url-w-barcode
            try
            {
                //https://wwwdev.teamatical.com/admin/workstation-sewing?Barcode=WGPUP
                var url = new URL(barcodeStr)
                const urlParams = new URLSearchParams(window.location.search)
                const barcodePar = urlParams.get('Barcode') || urlParams.get('id')
                //? or url.hash
                if (barcodePar)
                {
                    barcodeStr = barcodePar
                }
                // console.log('w-base - from url', barcodeStr)
            } 
            catch (_)
            {
                //
            }
            e.target.parentElement.value = barcodeStr
        }
    }


    //#region /////////////////////////////////////////--OVERRIDE NET DATA--///////////////////////////////////////////////

    //cmdPost
    // getOrderFile
    //getOrderFiles
    //_fetchItems
    
    //#endregion
}

//#region decorators

export const WorkstationDynamic = FragmentDynamic

//#endregion