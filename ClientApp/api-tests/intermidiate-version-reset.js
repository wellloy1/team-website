var porderId = 'BX0WCZ21FRA0VUM05LIUBOQEFZE'

async () => {
    
    var total = 0
	var porderApi = await apiRequestGET('orderproduction/order-get', { porderid: porderId })
	var porder = porderApi.result
	for (var itemi in porder.ProductionItems)
	{
		var itemId = porder.ProductionItems[itemi].id
		console.log('reset intermidiate version for ' + itemId)
		await apiRequestGET('orderproduction/item-intermidiateversion-reset', { porderitemid: itemId, emptyresult: 'true'})
		++total
	}

	return total
}
