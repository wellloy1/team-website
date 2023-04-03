async () => {
	const filters = []

	const processItem = async (i, result) => 
	{
		var viewId = i.ViewID
		var api = await apiRequestGET('view/view-get', { pviewid: viewId })
		var view = api.result
		view.SkipUvSpaceCheck = true
		//try
		//{
			api = await apiRequestPOST('view/view-save', view)
			result.push(viewId) // to get all items list in result
		//}
		//catch
		//{
		//	
		//}
	}

	return await apiList('view/get-items', filters, processItem)
}