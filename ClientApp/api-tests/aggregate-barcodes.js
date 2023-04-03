async () => {
	var qabarcodes = [
	]
	for (var i in qabarcodes)
	{
		let curBarcode = qabarcodes[i]
		let agResponce = await apiRequestPOST('workstation/aggregation-get', { Barcode: curBarcode, SubscriptionsState: null })
		let expectedBarcode = agResponce.result.RecentCell[0].ExpectedBarcode
		await apiRequestPOST('workstation/aggregation-get', { Barcode: expectedBarcode })
	}

	return 'OK'
}