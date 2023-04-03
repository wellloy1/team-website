async () => {
    const filters = [
        { path: "Status", value: "ready\u0020for\u0020manufacture" },
        { path: "Created", value: "4/1/2020-4/7/2020" },
    ]
    const updateStatus = "manufactured"

    const processItem = async (i, result) => 
    {
        result.push(i) // to get all items list in result

        var morderid = i.id
        var api = await apiRequestGET('manufacture/order-itemset-get', { id: null, oid: morderid })
        var etag = api.result.ETag
        var data = { 
            ETag: etag, 
            ManufactureOrderID: morderid, 
            Status: { id: updateStatus } 
        }
        var api = await apiRequestPOST('manufacture/order-itemset-updatestatus', data)
    }

    return await apiList('manufacture/order-get-items', filters, processItem)
}