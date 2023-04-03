async () => {
    const url = 'https://atlas.microsoft.com/geolocation/ip/json'
    const data = { 'api-version': '1.0', 'ip': '92.63.64.162', 'subscription-key': '-PUT-KEY-HERE-' }
    var rq = { method: 'GET', headers: { 'x-ms-client-id': '4d3d0912-a9c8-450a-8ec9-93676ef02a90' }, }
    var response = await fetch(urlquery(url, data), rq)
    console.log(await response.json())
    // => { "countryRegion": { "isoCode": "RU" }, "ipAddress": "92.63.64.162" }
}