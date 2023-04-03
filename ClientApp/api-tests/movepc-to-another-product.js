const organizationId = 'OD5XLSRU1UETMEJGZKBLRJJXNIB'

const oldProductId = '1EC4IW43DE4RSUZKFLKZWD13XFE'
const newProductId = 'OVFJNGSXDAZILUIGCJQENOV51KH'

async () => {
    const filters = [
        { path: 'SellerOrganizationID', value: organizationId },
        { path: 'ProductID', value: oldProductId },
    ]
    
    const processItem = async (i, result) => 
    {
        result.push(i) // to get all items list in result
        
        var api = (await apiRequestGET('productconfiguration/pc-get', { pconfigid: i.ProductConfigurationID })).result
        api.ProductID = newProductId

        await apiRequestPOST('productconfiguration/pc-save', api)
    }

    return await apiList('productconfiguration/get-items', filters, processItem)
}