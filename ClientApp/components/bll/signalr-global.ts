// import { NetBase } from "./net-base"

export class SignalRGlobal extends Object
{
    // _negotiationResponse: any
    // connectionID: any

    // set negotiationResponse(val) 
    // {
    //     // this._negotiationResponse = val
    //     var nr: any = null
    //     try
    //     {
    //         nr = JSON.parse(val)
    //     }
    //     catch (e)
    //     {
    //         console.warn(e)
    //     }

    //     if (nr && nr.connectionId)
    //     {
    //         // this.connectionID = nr.connectionId
    //         NetBase.prototype.__static_set_signalr_connid(nr.connectionId)
    //         // console.log(NetBase.prototype.__static_get_signalr_connid())
    //     }
    // }

}

export interface IAdminSignalR
{
    SR_ReconnectHandler()
    SR_DisconnectHandler()
}

export interface IAdminSignalR_VersionUpdated
{
    SR_VersionUpdated(vobj: any)
}

export interface IAdminSignalR_PrintingProgress
{
    SR_TaskProgressHandler(pobj: any)

    SR_OrderListHandler(oobj: any)
}

export interface IAdminSignalR_ReplacementsProgress
{
    SR_TaskProgressHandler(pobj: any)

    SR_OrderListHandler(oobj: any)
}

export interface IAdminSignalR_RollInspectionProgress
{
    SR_PrintingTuningProcessedHandler(oobj: any)
}

export interface IAdminSignalR_ShippingProgress
{
    SR_ShippingAggregationCellCompleteHandler(pobj: any)
}

export interface IAdminSignalR_FreightsProgress
{
    SR_FreightChangedHandler(pobj: any)
    SR_FreightsListChangedHandler(pobj: any)
}
