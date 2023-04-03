async () => {
    const filters = [
        //{ path: "Status", value: "in\u0020production" },
        //{ path: "Created", value: "4/1/2020-4/7/2020" },
    ]

    const processItem = async (i, result) => 
    {
        var api = await apiRequestGET('product/product-get', { productid: i.id })
        var product = api.result
        if (!product.Tiers || product.Tiers[0].Values.length < 1) { return }
        
        try
        {
            var silver = product.Tiers[0]
            var gold = product.Tiers[1]
            var platinum = product.Tiers[2]
            var factory = product.Tiers[3]

            if (silver.ID != 'TierSilver' || gold.ID != 'TierGold' || platinum.ID != 'TierPlatinum' || factory.ID != 'TierFactoryCost') 
            {
                throw new Error('model is broken')
            }
            product.Tiers[1] = Object.assign({}, silver, { ID: 'TierGold' })
            product.Tiers[2] = Object.assign({}, gold, { ID: 'TierPlatinum' })
            
            if (product.Tiers[0].ID != 'TierSilver' || product.Tiers[1].ID != 'TierGold' || product.Tiers[2].ID != 'TierPlatinum' || product.Tiers[3].ID != 'TierFactoryCost') 
            {
                throw new Error('model was broken')
            }
            
            //console.table(JSON.parse(JSON.stringify(product.Tiers)))
            //api = await apiRequestPOST('product/product-save', product)
            console_log('migrated SUCCEEDED', product.id)
        }
        catch (ex)
        {
            console_err('FAILED', product.id)
        }
    }

    return await apiList('product/get-items', filters, processItem)
}
