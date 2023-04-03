export const sleep = (ms) => 
{ 
    return new Promise(resolve => setTimeout(resolve, ms)) 
}

export const asBool = (v) => 
{ 
    if (v === 0) { return true }
    return new Boolean(v) == true
}

export const deepClone = (obj) => 
{ 
    return JSON.parse(JSON.stringify(obj))
}

export const css_time_to_milliseconds = (time_string) =>
{
    var num = parseFloat(time_string),
        unit = time_string.match(/m?s/),
        milliseconds

    if (unit)
    {
        unit = unit[0]
    }

    switch (unit)
    {
        case "s": // seconds
            milliseconds = num * 1000
            break

        case "ms": // milliseconds
            milliseconds = num
            break
            
        default:
            milliseconds = 0
            break
    }

    return milliseconds
}

const ZeroDecimalCurrencies = { 'BIF': 1, 'CLP': 1, 'DJF': 1, 'GNF': 1, 'JPY': 1, 'KMF': 1, 'KRW': 1, 'MGA': 1, 'PYG': 1, 'RWF': 1, 'UGX': 0, 'VND': 1, 'VUV': 1, 'XAF': 1, 'XOF': 1, 'XPF': 1, }
const SubUnitsCurrencies = { } // 'THB': 'สตางค์', //default for: 'USD', 'AUD', 'EUR',

export class Currency
{
    static format(amount, currecy_id = 'USD', locale = 'en-US')
    {
        const defaultR = '' //when cannot convert - return default value
        if (!Number.isInteger(amount) || isNaN(amount)) { return defaultR }
        if (!currecy_id || typeof(currecy_id) != 'string') { currecy_id = 'USD' }
        const zeroDec = ZeroDecimalCurrencies[currecy_id.toUpperCase()]
        const divider = (zeroDec ? 1 : 100)
        var amount_cur = amount / divider
        var options = {
            style: 'currency',
            minimumFractionDigits: (zeroDec ? 0 : 2), 
            useGrouping: true, 
            currency: currecy_id,
            currencyDisplay: 'narrowSymbol', //code, name, none, symbol, narrowSymbol
            currencySign: 'accounting', //standard, accounting
        }
        var f = defaultR
        try 
        {
            f = amount_cur.toLocaleString(locale, options)
        }
        catch(ex)
        {
            console.error(ex, amount_cur, options)
        }
        return f
    }

    static formatSubunit(amount, currecy_id = 'USD', locale = 'en-US')
    {
        if (typeof amount != 'number') { return '' }
        if (!currecy_id || typeof(currecy_id) != 'string') { currecy_id = 'USD' }

        const defaultR = ''
        var formatStr = Currency.subunitFormatTemplate(currecy_id, locale)
        var options = {
            style: 'currency',
            minimumFractionDigits: 0, 
            useGrouping: true, 
            currency: currecy_id,
            currencyDisplay: 'code',
        }

        var f = defaultR
        try 
        {
            f = amount.toLocaleString(locale, options).replace(currecy_id, '').trim()
        }
        catch(ex)
        {
            console.error(ex, amount, options)
        }
        return formatStr.replace('{value}', f)
    }

    static _symbol_cache = {}
    static _symbol_subunit_cache = {}
    static unitSymbol(currecy_id, locale = 'en-US')
    {
        if (!currecy_id || typeof(currecy_id) != 'string') { return '' }
        currecy_id = currecy_id.toUpperCase()
        
        var loc_cache = Currency._symbol_cache[locale]
        if (typeof loc_cache == 'object')
        {
            var s = loc_cache[currecy_id]
            if (typeof s == 'string') { return s }
        }
        
        //extract & cache
        const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: currecy_id, currencyDisplay: 'narrowSymbol' }).formatToParts(3.50)
        const cs = parts.find(i => i.type == "currency")
        if (cs?.value)
        {
            if (!Currency._symbol_cache[locale]) { Currency._symbol_cache[locale] = {} }
            Currency._symbol_cache[locale][currecy_id] = cs.value
            return cs.value
        }
        return ''
    }

    static subunitFormatTemplate(currecy_id, locale = 'en-US')
    {
        if (!currecy_id || typeof(currecy_id) != 'string') { return '' }
        currecy_id = currecy_id.toUpperCase()
        
        var loc_cache = Currency._symbol_subunit_cache[locale]
        if (typeof loc_cache == 'object')
        {
            var s = loc_cache[currecy_id]
            if (typeof s == 'string') { return s }
        }
        
        //extract & cache
        const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: currecy_id, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0,  }).formatToParts(1)
        if (parts)
        {
            var cs = SubUnitsCurrencies[currecy_id] || '¢'
            var v = parts.map((parti, index, array) => { 
                if (parti.type == 'currency') { return cs }
                if (parti.type == 'integer') { return '{value}' }
                return parti.value
            }).join('')
            // var curinx = parts.findIndex(i => i.type == "currency")
            // var v = (curinx == 0) ? `${cs}{value}` : `{value}${cs}`
            
            if (!Currency._symbol_subunit_cache[locale]) { Currency._symbol_subunit_cache[locale] = {} }
            Currency._symbol_subunit_cache[locale][currecy_id] = v
            return v
        }
        return '¢{value}' //default
    }

    static isZeroDecimal(currecy_id)
    {
        if (!currecy_id || typeof(currecy_id) != 'string') { return false }
        currecy_id = currecy_id.toUpperCase()
        return ZeroDecimalCurrencies[currecy_id] == 1
    }

    static numberRegexp: RegExp
    static parse(val, language = 'en-US')
    {
        var valF = 0.0
        try
        {
            if (Currency.numberRegexp == undefined)
            {
                var numberDelimiterRegexp = '\\.,'
                const testN = 3.14
                const floatOptions = { minimumFractionDigits: 2, useGrouping: true, }
                var numberDelimiter = testN.toLocaleString(language, floatOptions).replace('3', '').replace('14', '')
                numberDelimiterRegexp = (numberDelimiter !== '.' ? ',' : '\\.')

                // if (this._dev)
                // {
                //     try { var testK = parseFloat('3.14') } catch { }
                //     try { var testK2 = parseFloat('3,14') } catch { }
                //     console.log('parseFloat: "', numberDelimiter, '" | 0.15 => ', testK, ' | 0,15 => ', testK2)
                // }
                Currency.numberRegexp = new RegExp('[^0-9-' + numberDelimiterRegexp + ']+', 'g')
            }
            val = val.replace(Currency.numberRegexp, "")
            valF = Number.parseFloat(val)
            if (!Number.isFinite(valF)) { valF = 0 }
        }
        catch
        {
            //
        }
        return valF
    }
}


export const detectCVSDelimeter = (language = 'en-US') =>
{
    var cvsDelimeter = ','
    
    const testN = 3.14
    const floatOptions = { minimumFractionDigits: 2, useGrouping: true, }
    var numberDelimiter = testN.toLocaleString(language, floatOptions).replace('3', '').replace('14', '')
    if (numberDelimiter == ',') { cvsDelimeter = ';' }

    return cvsDelimeter
}


export class Clipboard
{
    static copy()
    {
        var r = false
        try 
        {
            r = document.execCommand('copy')
        }
        catch (err) 
        {
            r = false
        }
        return r
    }

    static async readFromClipboard()
    {
        try
        {
            const text = await navigator.clipboard.readText()
            return text
        } 
        catch (error)
        {
            console.error(error)
            return null
        }
    }

    static copyFromString(text)
    {
        const el = document.createElement('textarea')  // Create a <textarea> element
        el.value = text                                 // Set its value to the string that you want copied
        el.setAttribute('readonly', '')                // Make it readonly to be tamper-proof
        el.style.position = 'absolute'
        el.style.left = '-9999px'                      // Move outside the screen to make it invisible
        document.body.appendChild(el)                  // Append the <textarea> element to the HTML document
        const selected =
            document.getSelection().rangeCount > 0        // Check if there is any content selected previously
                ? document.getSelection().getRangeAt(0)     // Store selection if found
                : false                                    // Mark as false to know no selection existed before
        el.select()                                    // Select the <textarea> content
        
        Clipboard.copy()                               // Copy - only works as a result of a user action (e.g. click events)

        document.body.removeChild(el)                  // Remove the <textarea> element
        if (selected)
        {                                                  // If a selection existed before copying
            document.getSelection().removeAllRanges()    // Unselect everything on the HTML document
            document.getSelection().addRange(selected)   // Restore the original selection
        }
    }
}

export class Vibrator
{
    static init()
    {
        if ('vibrate' in window.navigator) { return true }

        const canVibrate = "vibrate" in window.navigator || "mozVibrate" in window.navigator
        if (canVibrate && !("vibrate" in window.navigator))
        {
            navigator.vibrate = navigator.mozVibrate
            return true
        }
        return false
    }

    static imageSwitch()
    {
        if (!Vibrator.init()) { return }
        window.navigator.vibrate([20])
    }
    static imageSwitchFailed()
    {
        if (!Vibrator.init()) { return }
        window.navigator.vibrate([40, 15, 15])
    }

    static sortableItemSwitch()
    {
        if (!Vibrator.init()) { return }
        window.navigator.vibrate([30, 10])
    }
}

//decorators:
export const CustomElement = (superClass) =>
{
    // console.log('Self registered - ' + superClass.is)
    window.customElements.define(superClass.is, superClass)
}

export const getArrItemSafe = (arr, inx) =>
{
    if (!Array.isArray(arr)) { return null }

    if (inx < 0) { inx = 0 }
    if (inx >= arr.length) { inx = arr.length - 1 }

    var v = null
    try { v = arr[inx] } catch {}

    return v 
}

export const getArrItemByID = (arr, id_name, id_value) =>
{
    if (!Array.isArray(arr)) { return null }

    var vi = - 1
    var v = arr.filter((i, inx) => 
    {
        if (i[id_name] == id_value) 
        {
            vi = inx
            return true
        }
        return false
    })

    return {i: vi, v: v}
}



export const getComputedStyleValue = (el, prop) =>
{
    var style 
    if (window.ShadyCSS)
    {
        style = window.ShadyCSS.getComputedStyleValue(el, prop)
    } 
    else
    {
        style = window.getComputedStyle(el).getPropertyValue(prop)
    }
    return style
}



export const b64toBlob = (b64Data, contentType, sliceSize = 512) =>
{
    contentType = contentType || ''
    sliceSize = sliceSize || 512

    var byteCharacters = atob(b64Data)
    var byteArrays = []

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize)
    {
        var slice = byteCharacters.slice(offset, offset + sliceSize)

        var byteNumbers = new Array(slice.length)
        for (var i = 0; i < slice.length; i++)
        {
            byteNumbers[i] = slice.charCodeAt(i)
        }

        var byteArray = new Uint8Array(byteNumbers)

        byteArrays.push(byteArray)
    }

    var blob = new Blob(byteArrays, { type: contentType })
    return blob
}


export const convertLocalDateTimeISO = (ms?) =>
{
    var dd = new Date()
    if (ms !== undefined) { dd.setTime(ms) }
    var localISOTime = new Date(dd.getTime() - (dd.getTimezoneOffset() * 60000)) //offset in milliseconds
    var v = localISOTime.toISOString()
    return v
}
export const convertLocalDateISO = (ms?) =>
{
    var dd = new Date()
    if (ms !== undefined) { dd.setTime(ms) }
    var localISOTime = new Date(dd.getTime() - (dd.getTimezoneOffset() * 60000)) //offset in milliseconds
    var v = localISOTime.toISOString().substr(0, 10)
    return v
}
export const convertLocalTimeISO = (ms?) =>
{
    var dd = new Date()
    if (ms !== undefined) { dd.setTime(ms) }
    var localISOTime = new Date(dd.getTime() - (dd.getTimezoneOffset() * 60000)) //offset in milliseconds
    var v = localISOTime.toISOString().substr(11, 8)
    return v
}
export const convertDateISO = (ms?) =>
{
    var dd = new Date()
    if (ms !== undefined) { dd.setTime(ms) }
    var localISOTime = new Date(dd.getTime())
    var v = localISOTime.toISOString().substr(0, 10)
    // console.log(v, ms, localISOTime)
    return v
}
export const convertTimeISO = (ms?) =>
{
    var dd = new Date()
    if (ms !== undefined) { dd.setTime(ms) }
    var localISOTime = new Date(dd.getTime())
    var v = localISOTime.toISOString().substr(11, 8)
    return v
}


// const inBrowser = typeof window !== 'undefined'
// const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
// const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
// const UA = inBrowser && window.navigator.userAgent.toLowerCase()
// const isIE = UA && /msie|trident/.test(UA)
// const isIE9 = UA && UA.indexOf('msie 9.0') > 0
// const isEdge = UA && UA.indexOf('edge/') > 0
// const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android')
// const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios')
// const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
// const isPhantomJS = UA && /phantomjs/.test(UA)
// const isFF = UA && UA.match(/firefox\/(\d+)/)



var Crc16Tab = new Array(
    0x0000,0x1021,0x2042,0x3063,0x4084,0x50A5,0x60C6,0x70E7,0x8108,0x9129,0xA14A,0xB16B,0xC18C,
    0xD1AD,0xE1CE,0xF1EF,0x1231,0x0210,0x3273,0x2252,0x52B5,0x4294,0x72F7,0x62D6,0x9339,0x8318,
    0xB37B,0xA35A,0xD3BD,0xC39C,0xF3FF,0xE3DE,0x2462,0x3443,0x0420,0x1401,0x64E6,0x74C7,0x44A4,
    0x5485,0xA56A,0xB54B,0x8528,0x9509,0xE5EE,0xF5CF,0xC5AC,0xD58D,0x3653,0x2672,0x1611,0x0630,
    0x76D7,0x66F6,0x5695,0x46B4,0xB75B,0xA77A,0x9719,0x8738,0xF7DF,0xE7FE,0xD79D,0xC7BC,0x48C4,
    0x58E5,0x6886,0x78A7,0x0840,0x1861,0x2802,0x3823,0xC9CC,0xD9ED,0xE98E,0xF9AF,0x8948,0x9969,
    0xA90A,0xB92B,0x5AF5,0x4AD4,0x7AB7,0x6A96,0x1A71,0x0A50,0x3A33,0x2A12,0xDBFD,0xCBDC,0xFBBF,
    0xEB9E,0x9B79,0x8B58,0xBB3B,0xAB1A,0x6CA6,0x7C87,0x4CE4,0x5CC5,0x2C22,0x3C03,0x0C60,0x1C41,
    0xEDAE,0xFD8F,0xCDEC,0xDDCD,0xAD2A,0xBD0B,0x8D68,0x9D49,0x7E97,0x6EB6,0x5ED5,0x4EF4,0x3E13,
    0x2E32,0x1E51,0x0E70,0xFF9F,0xEFBE,0xDFDD,0xCFFC,0xBF1B,0xAF3A,0x9F59,0x8F78,0x9188,0x81A9,
    0xB1CA,0xA1EB,0xD10C,0xC12D,0xF14E,0xE16F,0x1080,0x00A1,0x30C2,0x20E3,0x5004,0x4025,0x7046,
    0x6067,0x83B9,0x9398,0xA3FB,0xB3DA,0xC33D,0xD31C,0xE37F,0xF35E,0x02B1,0x1290,0x22F3,0x32D2,
    0x4235,0x5214,0x6277,0x7256,0xB5EA,0xA5CB,0x95A8,0x8589,0xF56E,0xE54F,0xD52C,0xC50D,0x34E2,
    0x24C3,0x14A0,0x0481,0x7466,0x6447,0x5424,0x4405,0xA7DB,0xB7FA,0x8799,0x97B8,0xE75F,0xF77E,
    0xC71D,0xD73C,0x26D3,0x36F2,0x0691,0x16B0,0x6657,0x7676,0x4615,0x5634,0xD94C,0xC96D,0xF90E,
    0xE92F,0x99C8,0x89E9,0xB98A,0xA9AB,0x5844,0x4865,0x7806,0x6827,0x18C0,0x08E1,0x3882,0x28A3,
    0xCB7D,0xDB5C,0xEB3F,0xFB1E,0x8BF9,0x9BD8,0xABBB,0xBB9A,0x4A75,0x5A54,0x6A37,0x7A16,0x0AF1,
    0x1AD0,0x2AB3,0x3A92,0xFD2E,0xED0F,0xDD6C,0xCD4D,0xBDAA,0xAD8B,0x9DE8,0x8DC9,0x7C26,0x6C07,
    0x5C64,0x4C45,0x3CA2,0x2C83,0x1CE0,0x0CC1,0xEF1F,0xFF3E,0xCF5D,0xDF7C,0xAF9B,0xBFBA,0x8FD9,
    0x9FF8,0x6E17,0x7E36,0x4E55,0x5E74,0x2E93,0x3EB2,0x0ED1,0x1EF0)
function Crc16Add(crc, c)
{
    //'crc' should be initialized to 0x0000.
    return Crc16Tab[((crc >> 8) ^ c) & 0xFF] ^ ((crc << 8) & 0xFFFF)
}
function Crc16Str(str)
{
    var n
    var len = str.length
    var crc

    crc = 0
    for (n = 0; n < len; n++)
    {
        crc = Crc16Add(crc, str.charCodeAt(n))
    }
    return crc
}
function Hex16(val) //Convert value as 16-bit unsigned integer to 4 digit hexadecimal number prefixed with "0x".
{
    var n = val & 0xFFFF
    var str = n.toString(16).toUpperCase()
    n = str.length
    if (n < 2) str = "000" + str
    else if (n < 3) str = "00" + str
    else if (n < 4) str = "0" + str;
    return str
}
export const crc16CCITT = (s) => 
{
    return Hex16(Crc16Str(s))
}
