async () => {
	const storeFrom = 'XB683'
	const storeTo = 'd~UN2145'
	const headers = { 
		organization: 'NKT2E3HGYDCRVEI4WGFKXPIA5GE' 
	}
	const retry = { count: 1, summaryKey: '-' }

	

	var api = await apiRequestPOST('/api/v1.0/store/get', { sid: storeFrom }, retry, headers)
	var originalStore = api.success ? api.result : null
	for (var itemi of originalStore.items)
	{
	    if (itemi.isseparator) continue
	    
	    var configApi = await apiRequestPOST('/api/v1.0/product/get', { ProductConfigurationID: itemi.name }, retry, headers)
	    var config = configApi.result
	    config = Object.assign(config, { StoreID: storeTo })
	    await apiRequestPOST('/api/v1.0/product/add-to-store-ex', config, retry, headers)
	}



	api = await apiRequestPOST('/api/v1.0/store/get', { sid: storeTo }, retry, headers) 
	var newStore = api.success ? api.result : null
	newStore.title = `Copy of ${originalStore.title} (${storeFrom})`
	
	var newItems = []
	var k = 0
	for (var itemi of newStore.items)
	{
	    if (itemi.isseparator) 
		{
			newItems.push(itemi)
		}
	    else
	    {
			newStore.items[k] = Object.assign(newStore.items[k], {
				titleEdit: itemi.title,
				quickcustomize: itemi.quickcustomize,
				nobadges: itemi.nobadges,
			})
	        newItems.push(newStore.items[k])
	        ++k;
	    }
	}
	newStore.items = newItems
	api = await apiRequestPOST('/api/v1.0/store/save', newStore, retry, headers)
	newStore = api.success ? api.result : null
	
	return newStore
}