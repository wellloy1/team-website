export class StringUtil
{
    static cyrb53(str, seed = 0) 
    {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
        for (let i = 0, ch; i < str.length; i++) 
        {
            ch = str.charCodeAt(i)
            h1 = Math.imul(h1 ^ ch, 2654435761)
            h2 = Math.imul(h2 ^ ch, 1597334677)
        }
        h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909)
        h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909)
        return 4294967296 * (2097151 & h2) + (h1>>>0)
    }

    static hashCode(str)
    {
        var hash = 0
        if (!str || str.length == 0) return hash
        for (var i = 0; i < str.length; i++)
        {
            let char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
            // Convert to 32bit integer
        }
        return hash
    }    

    static format(...args: any[])
    {
        var formatted = args[0]
        for (var i = 0; i < args.length - 1; i++)
        {
            var regexp = new RegExp('\\{' + i + '\\}', 'gi')
            formatted = formatted.replace(regexp, args[i + 1])
        }

        return formatted
    }

    static __nativeReplaceAll = false
    static replaceAll(_this, search, replace)
    {
        if (StringUtil.__nativeReplaceAll)
        {
            return (_this as any).replaceAll(search, replace)
        }
        else
        {
            if (typeof(_this) == 'string' && _this['replaceAll'])
            {
                StringUtil.__nativeReplaceAll = true
                return (_this as any).replaceAll(search, replace)
            }
            //polyfill
            return _this.split(search).join(replace)
        }
    }

    static trimSafe(str)
    {
        return typeof(str) == 'string' ? str.trim() : str
    }

    static startsWith(_this, search)
    {
        return typeof(_this) == 'string' ? _this.startsWith(search) : false
    }

    static isNumeric(value) 
    {
        return /^-?\d+$/.test(value)
    }
    
    static isEmpty(_this)
    {
        return (!_this || 0 === _this.length);
    }

    static isNotEmpty(_this)
    {
        return !_this.isEmpty()
    }

    static urlquery(pathname, qpar, nullValueAsFlag = false)
    {
        var qs = ''
        if (qpar) 
        {
            qs = Object.keys(qpar).map((key) => 
            { 
                if (!qpar[key] && qpar[key] !== 0 && nullValueAsFlag)
                {
                    return encodeURIComponent(key)
                }
                return encodeURIComponent(key) + '=' + encodeURIComponent(qpar[key]) 
            }).join('&')
        }
        var first = (pathname && pathname.indexOf('?') >= 0 ? false : true)
        return pathname + (qs ? (first ? '?' : '&') + qs : '')
    }

    static parsequery(queryString) 
    {
        var query = {}
        var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
        for (var i = 0; i < pairs.length; i++) 
        {
            var pair = pairs[i].split('=')
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
        }
        return query
    }

    static formatPlayer(player)
    {
        if (!player) { return '' }

        let p = ''
        if (player.PlayerName) { p = player.PlayerName }
        
        if (player.PlayerNumber)
        {
            if (p) { p += ' / ' }
            p += player.PlayerNumber
        }

        if (player.PlayerYear)
        {
            if (p) { p += ' / ' }
            p += player.PlayerYear
        }

        if (player.PlayerActivity)
        {
            if (p) { p += ' / ' }

            p += (typeof player.PlayerActivity == 'object') ? player.PlayerActivity.Name : player.PlayerActivity
        }

        if (player.PlayerCaptain)
        {
            if (p) { p += ' / ' }
            
            p += (typeof player.PlayerCaptain == 'object') ? player.PlayerCaptain.Name : player.PlayerCaptain
        }
        return p
    }

    // _formatSizes(sizes)
    // {
    //     if (!Array.isArray(sizes)) { return '' }

    //     // return sizes.map((i, index, array) => { return 'ID# ' + i.ProductManufacturerID + ' [' + i.ProductType + '] - Size: ' + i.Size.Name }).join(",\n")
    //     return sizes.map((i, index, array) => { return i.Size.Name }).join("/\n")
    // }

    static formatSizes(sizes)
    {
        if (!Array.isArray(sizes)) { return '' }

        var ss = ''
        var cl = (sizes.length > 0 && sizes[0].Size ? sizes[0].Size.Code : '')
        var same = true
        for (var i in sizes)
        {
            if (!sizes[i].Size) { continue }

            var ci = sizes[i].Size.Code
            //console.log(cl + ' ~ ' + ci)
            if (cl != ci) { same = false }
            if (ss != "") { ss += ' / ' }
            ss += ci
            cl = ci
        }

        if (same && sizes.length > 0 && sizes[0].Size) { ss = sizes[0].Size.Code }
        return ss
    }

    static formatTimeSpan(seconds)
    {
        const getPaddedIntString = (n, numDigits) =>
        {
            var nPadded = n
            for (; nPadded.length < numDigits;)
            {
                nPadded = "0" + nPadded
            }
            return nPadded
        }

        var s = ""
        var days = Math.floor((seconds / 3600) / 24)
        if (days >= 1)
        {
            s += days.toString() + " day" + ((days == 1) ? "" : "s") + " + "
            seconds -= days * 24 * 3600
        }

        var hours = Math.floor(seconds / 3600)
        s += getPaddedIntString(hours.toString(), 2) + ":"
        seconds -= hours * 3600

        var minutes = Math.floor(seconds / 60)
        s += getPaddedIntString(minutes.toString(), 2) + ":"
        seconds -= minutes * 60
        s += getPaddedIntString(Math.floor(seconds).toString(), 2)

        return s
    }

    static toCamelClass(str)
    {
        if (typeof str != 'string') { return str }
        return str.replace(/[-_]([a-z])/g, (g) => {
            return g.length > 0 ? g[1].toLocaleUpperCase() : g
        })
    }

    static toCapitalize(str)
    {
        if (typeof str != 'string' || str.length < 1) { return str }
        str = str.toLocaleLowerCase()
        str = str.charAt(0).toUpperCase() + str.slice(1)
        return str.replace(/[-_., ]([a-z])/g, (g) => {
            // console.log(g)
            return g.length > 1 ? g.toLocaleUpperCase() : g
        })
    }

    static escapeHtml(str)
    {
        if (typeof (str) !== 'string') { return str}

        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }
        return str.replace(/[&<>]/g, function (tag)
        {
            return tagsToReplace[tag] || tag
        })
    }

    static stripHtml(html)
    {
        if (!html) { return "" }
        var doc = new DOMParser().parseFromString(html, 'text/html')
        return doc.body.textContent || ""
    }

    
    // static formatSizesOrderItem(sizes)
    // {
    //     if (!Array.isArray(sizes)) { return '' }
    //     var ss = ''
    //     var cl = sizes.length > 0 ? sizes[0].Size.Code : ''
    //     var same = true
    //     for (var i in sizes)
    //     {
    //         var ci = sizes[i].Size.Code
    //         //console.log(cl + ' ~ ' + ci)
    //         if (cl != ci) { same = false }
    //         if (ss != "") { ss += ' / ' }
    //         ss += ci
    //         cl = ci
    //     }
    //     if (same && sizes.length > 0) { ss = sizes[0].Size.Code }
    //     return ss
    // }

    static compareAsJSONRegex = /\s*(?:\"|\')(?<key>[^"]*)(?:\"|\')(?=:)(?:\:\s*)(?<value>(true|false|[0-9]+)|((\"|\')(.+)(\"|\')))(,?)/i
    static compareAsJSON(obj1, obj2)
    {
        if (!obj1 || !obj2) { return null }

        var newStrAr = JSON.stringify(obj1, null, "\t").split("\n")
        var oldStrAr = JSON.stringify(obj2, null, "\t").split("\n")

        var getkeyval = (str) => 
        {
            var m = StringUtil.compareAsJSONRegex.exec(str)
            var key = m?.groups?.key
            var val = m?.groups?.value
            return { key: key == null ? '' : key, val: val }
        }

        var newAr = {}
        for (var i in newStrAr)
        {
            var kv = getkeyval(newStrAr[i])
            newAr[kv.key] = kv.val
        }

        var oldAr = {}
        for (var i in oldStrAr)
        {
            var kv = getkeyval(oldStrAr[i])
            oldAr[kv.key] = kv.val
        }

        for (var i in newAr)
        {
            if (newAr[i] === oldAr[i])
            {
                delete newAr[i]
                delete oldAr[i]
            }
        }

        var isEmpty = (obj) =>
        {
            for (var key in obj)
            {
                if (obj.hasOwnProperty(key))
                    return false
            }
            return true
        }

        if (isEmpty(newAr) && isEmpty(oldAr)) { return null }

        return { old: oldAr, new: newAr }
    }

}