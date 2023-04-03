async () => {
	var api, moid = prompt("Please enter your mOrder", "")

	console_title('------------ MANUFACTURE ORDER ' + moid)
	api = await apiRequestGET('manufacture/order-itemset-get', { id: null, oid: moid })
	var manOrder = api.result
	console_log('manOrder.ManufactureOrderItemSets', manOrder.ManufactureOrderItemSets)

	var itemBarcodes = []
	var qaBarcodes = []

	for (var i in manOrder.ManufactureOrderItemSets)
	{
		var batchidi = manOrder.ManufactureOrderItemSets[i]
		api = await apiRequestGET('manufacture/order-itemset-get', { id: batchidi, oid: moid })
		let morderseti = api.result
		for (var i in morderseti.BulkProduction)
			for (var j in morderseti.BulkProduction[i].Barcodes)
				itemBarcodes.push(morderseti.BulkProduction[i].Barcodes[j].Barcode)
			
		for (var i in morderseti.PrintingTuning)
		{
			let tuni = morderseti.PrintingTuning[i]
			if (tuni.IsPDFsFrozen) continue;
			api = await apiRequestGET('manufacture/order-itemset-freeze', { printingid : tuni.ManufacturePrintingTuningID })
		}
	}

	console_log('' + itemBarcodes.length + ' item barcodes collected')

	for (var i in itemBarcodes)
	{
		let itemBarcode = itemBarcodes[i]
		api = await apiRequestPOST('workstation/qa-get', { Barcode: itemBarcode })
		let qaResult = api.result
		let theFirstLabel = qaResult.LabelItems[0]
		api = await apiRequestPOST('workstation/qa-get', { Barcode: theFirstLabel.Barcode })
		qaBarcodes.push(theFirstLabel.Barcode)
	}

	console_log('items are qa approved now')

	return qaBarcodes
}