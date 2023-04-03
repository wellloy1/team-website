async () => 
{
	const filters = [
		{ path: "OrganizationID", value: "OD5XLSRU1UETMEJGZKBLRJJXNIB" },
	]
	const processItem = async (i, result) => 
	{
		var api = await apiRequestPOST('/api/v1.0/store/get', { 'sid': i.StoreID }, { count: 1, summaryKey: '-'}, { organization: 'OD5XLSRU1UETMEJGZKBLRJJXNIB' })
		var store = api.result
		for (var i in store.items)
		{
			store.items[i].profitValue = store.items[i].profitBase
		}
		// api = await apiRequestPOST('/api/v1.0/store/save', store)
		result.push(store.sid + ' : ' + api.success)
	}

	return await apiList('store/get-items', filters, processItem)
}