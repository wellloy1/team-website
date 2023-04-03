async () => {
	var localeJS = {
	    "country-AF": "Afghanistan",
        "country-AX": "Åland Islands",
        "country-AL": "Albania",
        "country-DZ": "Algeria",
        "country-ZW": "Zimbabwe"
	}
	
	const options = { to: "th", }
	var text = Object.values(localeJS)
    let [translations] = await translate.translate(text, options)
    translations = Array.isArray(translations) ? translations : [translations]
    console.log('Translations:');
    translations.forEach((translation, i) => 
    {
        console.log(`${text[i]} => (${target}) ${translation}`)
    })
}