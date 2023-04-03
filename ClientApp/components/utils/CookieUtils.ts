export class CookieUtils
{
    constructor() 
    {
    }

    static getCookie(name) 
    {
        var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
        return matches ? decodeURIComponent(matches[1]) : undefined
    }

    static getCookies(startWith?)
    {
        if (!document.cookie) { return {} }

        var cookieStrAr = document.cookie.split('; ')
        var cookiesObj = {}
        for (var i in cookieStrAr)
        {
            let ninx = cookieStrAr[i].indexOf('=')
            if (ninx >=0)
            {
                let n = decodeURIComponent(cookieStrAr[i].substr(0, ninx))
                if ((startWith && n.startsWith(startWith)) || !startWith)
                {
                    cookiesObj[n] = decodeURIComponent(cookieStrAr[i].substring(ninx + 1))
                }
            }
            
        }
        return cookiesObj
    }

    static setCookie(name, value, options) 
    {
        options = options || {}

        var expires = options.expires

        if (typeof expires == "number" && expires) 
        {
            var d = new Date()
            d.setTime(d.getTime() + expires * 1000)
            expires = options.expires = d
        }

        if (expires && expires.toUTCString) 
        {
            options.expires = expires.toUTCString()
        }

        var updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value)

        for (var propName in options) 
        {
            updatedCookie += "; " + propName
            var propValue = options[propName]
            if (propValue !== true) 
            {
                updatedCookie += "=" + propValue
            }
        }

        // console.log('updatedCookie', updatedCookie)
        document.cookie = updatedCookie
    }

    static deleteCookie(name, options: any = { expires: -1 })
    {
        CookieUtils.setCookie(name, "", options)
    }
}
