async () => 
{
    const filters = [
        { path: "Type", value: "SendEmail" },
    ]
    var processHndls = []
	await apiList('planner/planner-items', filters, (i, result) => 
	{
		if (i?.IsRetriable)
		{
			var s = randomint(300, 6000)
			var ptskID = i.ID
			console.log('task scheduled ', ptskID, s)
			var taski = new Promise(async (resolve, reject) => 
			{
				await runsleep(s)
				var api = await apiRequestGET('planner/retry-item', { itemID: ptskID })
				resolve(api.result)
			})
			processHndls.push(taski)
		}
	})
	if (processHndls?.length > 0)
	{
		var res = await Promise.allSettled(processHndls)
		const errorMessages = res.filter(({status}) => status == 'rejected').map(({reason}) => reason)
		console_err(errorMessages)
		return res
	}
	return 'FOUND NO TASKS'
}