async () => {
    const filters = [
        
    ]
    
    const processItem = async (i, result) => 
    {
        result.push(i) // to get all items list in result
        
        var api = (await apiRequestGET('productmanufacturer/product-get', { pmid: i.ProductManufacturerID })).result
        await apiRequestPOST('productmanufacturer/product-save', api)
    }

    return await apiList('productmanufacturer/get-items', filters, processItem)
}