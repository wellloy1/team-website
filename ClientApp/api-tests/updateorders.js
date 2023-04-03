var allorders = []
const filters = [ { path: 'id', value: 'd~LQ2164' } ]
const updatePc = 
[
	{ from: 'd~MM6431', to: 'd~MM6431' }
]

async () => {
    
	if (allorders.length == 0)
	{
		const processItem = async (i, resultout) => 
		{
			allorders.push(i.id)
		}
		await apiList('order/get-items', filters, processItem)
	}
	
	var total = 0
	for (var i in allorders)
	{
		var orderApi = await apiRequestGET('order/order-get?orderid=' + allorders[i])
		var order = orderApi.result
		
		var items = []
		
		for (var j in order.items)
		{
			var item = order.items[j]
			if (item.item.Roster === undefined) items.push(item)
			else
			{
				var rosterRequest = 
				{
					rosterid: item.id,
					orderid: order.id,
					ptoken: null,
				}
				while (true)
				{
					var rosterPageApi = await apiRequestPOST('order/order-rosteritems-get', rosterRequest)
					var rosterPage = rosterPageApi.result
					rosterRequest.ptoken = rosterPage.ptoken
					
					for (var k in rosterPage.items)
						items.push(rosterPage.items[k])
					
					if (rosterPage.plast) break
				}
			}
		}
		
		var current = 0
		for (var j in items)
		{
			var item = items[j]
			var replace = null
			for (var k in updatePc)
				if (updatePc[k].from === item.item.ProductConfigurationID)
					replace = updatePc[k].to
			
			if (replace)
			{
				item.replacepcid = replace
				++current
				++total
			}
		}
		order.items = items
		if (current > 0)
		{
			console.log(order.id + ' : ' + order.AccountEmail + '; ' + current + ' configurations')
			//if (order.OrderProductionID && order.Status.id === 'in production')
			//{
			//	var porderApi = await apiRequestGET('orderproduction/order-get', { porderid: order.OrderProductionID })
			//	var porder = porderApi.result
			//	
			//	for (var itemi in porder.ProductionItems)
			//	{
			//		var itemId = porder.ProductionItems[itemi].id
			//		console.log('reset intermidiate version for ' + itemId)
			//		await apiRequestGET('orderproduction/item-intermidiateversion-reset', { porderitemid: itemId, emptyresult: 'true'})
			//	}
			//}
			orderApi = await apiRequestPOST('order/order-save', order)
		}
	}
	return total
}
