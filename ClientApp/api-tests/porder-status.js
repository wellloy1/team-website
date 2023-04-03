async () => {
    const filters = [
        { path: "Status", value: "in\u0020production" },
        { path: "Created", value: "4/1/2020-4/7/2020" },
    ]
    const updateStatus = "shipped"

    const processItem = async (i, result) => 
    {
        result.push(i) // to get all items list in result
        
        var porderid = i.id
        var orderid = i.OrderID
        console.log(porderid, orderid)

        var api = await apiRequestGET('orderproduction/order-get', { porderid: porderid })
        var porder = api.result
        porder.Status = { id: updateStatus }
        api = await apiRequestPOST('orderproduction/order-save', porder)

        var api = await apiRequestGET('order/order-get', { orderid: orderid })
        var order = api.result
        api = await apiRequestGET('order/order-status-update', { orderid: orderid, etag: order.ETag, statusid: updateStatus })
        
    }

    return await apiList('orderproduction/get-items', filters, processItem)
}