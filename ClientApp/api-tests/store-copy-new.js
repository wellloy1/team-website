async () => {
/*+===================================+*/
/*+===================================+*/
	//const storeToCopy = prompt("Please enter a store id to copy", "")
	const storeToCopy = 'EM1715'
	const headers = {organization: 'IBLZJHVTKJY5CCEVH3KJS512LXG'}
	const retry = { count: 1, summaryKey: '-' }
/*+===================================+*/
/*+===================================+*/
	
	var storeListApi = await apiRequestPOST('/api/v1.0/store/list-addnew', {}, retry, headers)
	var store = storeListApi.result.items[0];
	
	var storeId = store.sid
	
	var originalStoreApi = await apiRequestPOST('/api/v1.0/store/get', { sid: storeToCopy }, retry, headers)
	var originalStore = originalStoreApi.result
	
	for (var i in originalStore.items)
	{
	    var item = originalStore.items[i]
	    if (item.isseparator) continue
	    
	    var configApi = await apiRequestPOST('/api/v1.0/product/get', { ProductConfigurationID: item.name }, retry, headers)
	    var config = configApi.result
	    
	    await apiRequestPOST('/api/v1.0/product/add-to-store', config, retry, headers)
	}
	
	var newStoreApi = await apiRequestPOST('/api/v1.0/store/get', { sid: storeId }, retry, headers) 
	var newStore = newStoreApi.result
	
	newStore.title = 'copyof ' + originalStore.title + '('+ storeToCopy + ')'
	
	var newItems = []
	var k = 0
	for (var i in originalStore.items)
	{
	    var item = originalStore.items[i]
	    if (item.isseparator) newItems.push(item)
	    else
	    {
	        newStore.items[k].titleEdit = item.title
	        newStore.items[k].quickcustomize = item.quickcustomize
	        newStore.items[k].nobadges = item.nobadges
	        newItems.push(newStore.items[k])
	        ++k;
	    }
	}
	newStore.items = newItems
	newStoreApi = await apiRequestPOST('/api/v1.0/store/save', newStore, retry, headers)
	newStore = newStoreApi.result
	
	return newStore
}