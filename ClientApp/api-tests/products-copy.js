async () => {
    const ids = [
    ]
    
    var result = []
    
    for (var i in ids)
    {
        var api = (await apiRequestGET('product/product-get', { productid: ids[i] })).result
        var res = (await apiRequestPOST('product/product-deep-copy', api)).result
        
        result.push(ids[i] + ' -> ' + res.id)
    }
    
    return result
}