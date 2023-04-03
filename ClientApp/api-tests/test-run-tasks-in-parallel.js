async () => 
{
    var processHndls = []
	await apiList('view/get-items', [], (i, result) => 
	{
		var viewId = i.ViewID
		var s = randomint(300, 6000)
		console.log('task scheduled ', s)
		var taski = new Promise(async (resolve, reject) => 
		{
			await runsleep(s)
			var api = await apiRequestGET('view/view-get', { pviewid: viewId })
			resolve(api.result)
		})
		processHndls.push(taski)
	})
	var res = await Promise.allSettled(processHndls)
	const errorMessages = res.filter(({status}) => status == 'rejected').map(({reason}) => reason)
	console_err(errorMessages)
	return res
}