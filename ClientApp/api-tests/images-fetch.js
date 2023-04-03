async () => {
    const filters = []
    var tasklist = {}
    var executing = 0
    
    const processItem = async (i, resultout) => 
    {
        
    	if (i.ProductConfiguration && i.ProductConfiguration.Product && i.ProductConfiguration.Product.ImageUrls)
    	{
    		var fetchtask = async (imageUrl, execution) =>
    		{
    			var rq = { method: 'GET' }
    			await fetch(imageUrl, rq)
    			return execution
    		}
    
    		for (var ui in i.ProductConfiguration.Product.ImageUrls)
    		{
		    	var values = Object.values(tasklist)
				while (values.length >= 10)
				{
					var result = await Promise.race(values);
					delete tasklist[result]
					values = Object.values(tasklist)
				}
				let exec = ++executing;
    			var url = i.ProductConfiguration.Product.ImageUrls[ui]
    			tasklist[exec] = fetchtask(url, exec)
    			console.log(url)
    		}
    		resultout.push(i.ProductConfigurationID)
    	}
    }
    
    await apiList('productconfiguration/get-items', filters, processItem)
}
