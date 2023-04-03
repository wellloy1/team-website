async () => {
    var api, moid = prompt("Please enter your mOrder", "")
    
    console_title('------------ MANUFACTURE ORDER ' + moid)
    api = await apiRequestGET('manufacture/order-itemset-get', { id: null, oid: moid })
    var manOrder = api.result
    console_log('manOrder.ManufactureOrderItemSets', manOrder.ManufactureOrderItemSets)
    
    
    ///aggregate by production order
    console_title('------------ PRODUCTION ORDERs RELATED ')
    var prodOrders = {}
    for (var i in manOrder.ManufactureOrderItemSets)
    {
        var batchidi = manOrder.ManufactureOrderItemSets[i]
        api = await apiRequestGET('manufacture/order-itemset-get', { id: batchidi, oid: moid })
        let morderseti = api.result
    
        if (morderseti.IsBulk)
        {
            for (var i in morderseti.BulkProduction)
            {
                let productsumi = morderseti.BulkProduction[i]
                prodOrders[productsumi.OrderProductionID] = true
            }
        }
        else
        {
            for (var i in morderseti.ManufactureOrderItemSetItems)
            {
                let moisii = morderseti.ManufactureOrderItemSetItems[i]
                prodOrders[moisii.OrderProductionID] = true
            }
        }
    }
    console_log('manOrder production orders related list:', Object.keys(prodOrders))
    
    var prodItems = {}
    for (var poid of Object.keys(prodOrders))
    {
        api = await apiRequestGET('orderproduction/order-get', { porderid: poid })
        let porder = api.result
        for (var mani of porder.ProductManufacturers)
        {
            for (var producti of mani.Items)
            {
                for (var itemi of producti.ManufactureOrders)
                {
                    if (itemi.ManufactureOrderID != moid) { continue }
                    prodItems[itemi.ItemID] = true
                }
            }
        }
    }
    console_log(Object.keys(prodItems))
    
    
    
    
    if (!confirm("Ws Shipping Aggregation will be reseted!, Are you sure?"))
    {
        console_err("Stoped by user request ... ")
        return ''
    }
    
    console_title('---- Prepare Labels ')
    api = await apiRequestPOST('workstation/aggregation-cells-back', { Manufacturer: { ManufacturerID: manOrder.ManufacturerID } })
    console_log('All labels', api.result.Labels)
    var backlabels = api.result.Labels.filter(i => i.BackSide).reduce((acc, x) => { acc[x.CellIndex] = { ...acc[x.CellIndex] || {}, ...x }; return acc }, {})
    console_log('Back Labels', backlabels)
    
    
    api = await apiRequestPOST('workstation/aggregation-reset', { Manufacturer: { ManufacturerID: manOrder.ManufacturerID } })
    
    console_title('---- Aggregate and Ship ... ')
    for (var i in prodItems)
    {
        console_log('--- item: ' + i)
        api = await apiRequestPOST('workstation/aggregation-get', { Barcode: i, Manufacturer: { ManufacturerID: manOrder.ManufacturerID } }) //get
        var recentcell = api.result.RecentCell[0]
        api = await apiRequestPOST('workstation/aggregation-get', { Barcode: recentcell.ExpectedBarcode, Manufacturer: { ManufacturerID: manOrder.ManufacturerID } }) //put
        var cells = api.result.Cells
        for (let celli of cells)
        {
            if (celli.IsComplete)
            {
                //let ship it
                api = await apiRequestPOST('workstation/aggregation-get', { Barcode: backlabels[celli.CellIndex].Barcode, Manufacturer: { ManufacturerID: manOrder.ManufacturerID } })
    
                var barcodes = celli.Items
                var assignedid = null
                for (var x in barcodes)
                {
                    api = await apiRequestPOST('workstation/shipping-get', { Barcode: barcodes[x].Barcode, Manufacturer: { ManufacturerID: manOrder.ManufacturerID } })
                    if (assignedid == null) { assignedid = api.result.CurrentPack.ID }
                    console_log(api.result.CurrentPack)
                }
    
                //labeling
                const data = { ID: assignedid, Weight: { Grams: 1000, Units: 'g' } }
                const retry = { count: 1, summaryKey: 'ship_svc_error' }
                api = await apiRequestPOST('workstation/shipping-getlabel', data, retry)
                console_log('Shipped ', api.result)
            }
        }
    }
    
    return 'OK'
}