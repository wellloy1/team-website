async () => {
	const fromCatalog = "<default>"
	const toCatalog = "playerlayer"
    
	var originalCatalog = (await apiRequestGET('catalog/get', { id: fromCatalog })).result
	var destCatalog = (await apiRequestGET('catalog/get', { id: toCatalog })).result
	
	destCatalog.Entries = []
	for (var ei in originalCatalog.Entries)
	{
		var entry = originalCatalog.Entries[ei]
		var newEntry = {}
		newEntry.Category = entry.Category
		newEntry.ProductConfigurations = []
		for (var pi in entry.ProductConfigurations)
		{
			var pcId = pi.ID
			var pc = (await apiRequestGET('productconfiguration/pc-get', { pconfigid: entry.ProductConfigurations[pi].ID })).result
			var prepareId = pc.ProductConfigurationParentID
			if (!prepareId)
			{
				var pcModel = (await apiRequestPOST('/api/v1.0/product/get', { ProductConfigurationID: pc.ProductConfigurationID, CustomizationType: 'customize' })).result
				pcModel = (await apiRequestPOST('/api/v1.0/product/clone', pcModel)).result
				prepareId = pcModel.ProductConfigurationID
				console.log('clone ' + pc.ProductConfigurationID + ' to ' + prepareId)
			}
			var newPc = (await apiRequestPOST('catalog/createitem', { ID: prepareId })).result
			newEntry.ProductConfigurations.push(newPc)
		}
		destCatalog.Entries.push(newEntry)
	}
	await apiRequestPOST('catalog/save', destCatalog)
	return destCatalog;
}