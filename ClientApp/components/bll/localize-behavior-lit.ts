//---lit---
import { LitElement } from 'lit'
//---component---
import IntlMessageFormat from 'intl-messageformat'
// import localeDefault from '../../static/locales/teamatical-website-locale-en-US.json'
// import localeAdminDefault from '../../static/locales/teamatical-wsadmin-locale-en-US.json'
//---consts---
const Teamatical: TeamaticalGlobals = window['Teamatical']
const defaultLanguage = "en-US"
const STORAGEKEY_LANG = "lang-"
const STORAGEKEY_DATA = "lang-data-"



export abstract class LocalizeBehaviorBase extends LitElement
{
    __localizationCache: any = {
        requests: {},  /* One iron-request per unique resources path. */
        messages: {},  /* Unique localized strings. Invalidated when the language, formats or resources change. */
        ajax: null     /* Global iron-ajax object used to request resource files. */
    }

    static getLang()
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        var lang = defaultLanguage
        if (sessionStorage) 
        {
            let saved = sessionStorage.getItem(STORAGEKEY_LANG + proto.scope)
            lang = saved ? saved : defaultLanguage
        }
        return lang
    }

    static async run_async(scope)
    {
        let m = await import('../../static/locales/teamatical-website-locale-en-US.json')
        const localeDefault = m.default
        var localeAdminDefault: object | null = null
        if (scope == 'wsadmin')
        {
            let m = await import('../../static/locales/teamatical-wsadmin-locale-en-US.json')
            localeAdminDefault = m.default
        }
        LocalizeBehaviorBase.run(scope, localeDefault, localeAdminDefault)
    }

    static run(scope, localeDefault: object | null = null, localeAdminDefault: object | null = null)
    {
        // LocalizeBehaviorBase.__loadLocale(LocalizeBehaviorBase.getLang(), null)
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        proto.scope = scope
        proto.resources = localeDefault
        proto.language = LocalizeBehaviorBase.getLang()
        proto.formats = {}

        if (proto.scope == 'wsadmin') 
        {
            proto.resources[defaultLanguage]= Object.assign(proto.resources[defaultLanguage], localeAdminDefault ? localeAdminDefault[defaultLanguage] : '')
        }

        if (proto.language != defaultLanguage) 
        {
            if (sessionStorage) 
            {
                let cached = sessionStorage.getItem(STORAGEKEY_DATA + proto.scope)
                if (cached !== null)
                {
                    try
                    {
                        cached = JSON.parse(cached)
                        if (cached && cached[proto.language])
                        {
                            let plang = proto.resources[proto.language] ? proto.resources[proto.language] : {}
                            proto.resources[proto.language] = Object.assign(plang, cached[proto.language])
                        }
                    }
                    catch{}
                }
            }
            LocalizeBehaviorBase.__loadLocale(proto.language)
        }
    }

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    get defaultLanguage()
    {
        return defaultLanguage
    }

    get language()
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        return proto.language
    }

    localizeLang(...args)
    {
        let lang = args.shift()
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        return this.__computeLocalize(lang, proto.resources, proto.formats)(args)
    }

    localizepv(...args)
    {
        if (args.length >= 2)
        {
            const prefix = args.shift()
            const type = args[0]
            const key = args[0] = prefix + type
            const locv = this.localize(...args)
            if (locv == key && Teamatical.BuildEnv == 'Development' && key.indexOf('admin-page-title-') != 0) { console.warn('it seems like key is the same loc_value', key) }
            return locv == key ? type : locv
        }
        else
        {
            return this.localize(...args)
        }
    }

    localizep(...args)
    {
        if (args.length >= 2)
        {
            var prefix = args.shift()
            args[0] = prefix + args[0]
        }
        return this.localize(...args)
    }

    localize(...args)
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        return this.__computeLocalize(proto.language, proto.resources, proto.formats)(args)
    }

    localizeGetKeys(prefix)
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        var msgs = proto.resources[proto.language]
        if (msgs)
        {
            return Object.keys(msgs).filter(i => i.startsWith(prefix))
        }
        return []
    }

    async loadLocale(locale)
    {
        if (!locale) { return }

        await LocalizeBehaviorBase.__loadLocale(locale)
    }

    saveRecentLocale()
    {
        LocalizeBehaviorBase.__saveRecentLocale()
    }


    static __saveRecentLocale()
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        if (sessionStorage) { sessionStorage.setItem(STORAGEKEY_LANG + proto.scope, proto.language) }
    }

    static async __loadLocale(locale)
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        let locale_data = await import(`../../static/locales/teamatical-${proto.scope}-locale-${locale}.json`)
        LocalizeBehaviorBase.__localeLoaded(locale, locale_data.default)
        if (proto.scope == 'wsadmin') 
        {
            let locale_data = await import(`../../static/locales/teamatical-website-locale-${locale}.json`)
            LocalizeBehaviorBase.__localeLoaded(locale, locale_data.default)
        }
    }

    static __localeLoaded(locale, locale_data)
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor
        proto.resources[locale] = locale_data[locale]
        // console.log('localize', proto.language, ' => ', locale)
        proto.language = locale

        if (sessionStorage) 
        {
            let cached: any = sessionStorage.getItem(STORAGEKEY_DATA + proto.scope)
            if (cached !== null)
            {
                try
                {
                    cached = JSON.parse(cached)
                }
                catch{ }
            }
            else
            {
                cached = {}
            }

            var citem = {}
            citem[locale] = (cached[locale] ? Object.assign(cached[locale], proto.resources[locale]) : proto.resources[locale])
            sessionStorage.setItem(STORAGEKEY_DATA + proto.scope, JSON.stringify(citem))
            proto.resources[locale] = citem[locale]
        }
    }    

    // OVERRIDED: Added use default locale for missed strings and ID if default is missed too...
    protected __computeLocalize(language, resources, formats)
    {
        var proto: any = LocalizeBehaviorBase.prototype.constructor //this.constructor.prototype
        const localizationCacheKey = '__localizationCache-' + language


        // Check if localCache exist just in case.
        // this.__checkLocalizationCache(proto, localizationCacheKey)
        // do nothing if proto is undefined.
        // In the event proto not have __localizationCache object, create it.
        if (proto[localizationCacheKey] === undefined)
        {
            proto[localizationCacheKey] = { requests: {}, messages: {}, ajax: null }
        }


        // Everytime any of the parameters change, invalidate the strings cache.
        if (!proto[localizationCacheKey])
        {
            proto[localizationCacheKey] = { requests: {}, messages: {}, ajax: null }
        }
        proto[localizationCacheKey].messages = {}

        // useBubbleEvent: boolean = false
        const useDefaultLanguage = true
        const useKeyIfMissing = true

        return function (args)
        {
            var key = args[0]
            // if (key == 'order-paymenthistory-kind-refund')
            // {
            //     console.log(key, resources, language)
            // }

            if (!key || !resources || !language) { return }

            if (!resources[language])
            {
                if (useDefaultLanguage)
                {
                    resources[language] = {} //auto set lang -> to use default Lang
                }
                else
                {
                    return
                }
            }

            // Cache the key/value pairs for the same language, so that we don't
            // do extra work if we're just reusing strings across an application.
            let lang = language
            var translatedValue = resources[lang][key]
            // console.log(lang + ' -> ' + key + ' -> ' + translatedValue)

            if (translatedValue == undefined && useDefaultLanguage)
            {
                if (Teamatical.BuildEnv == 'Development' && key.indexOf('admin-page-title-') != 0) { console.warn(`Localize fallback: [${language}] -> [${defaultLanguage}].'${key}'`) }
                lang = defaultLanguage
                translatedValue = resources[lang][key]
            }

            if (translatedValue == undefined)
            {
                return useKeyIfMissing ? key : ''
            }

            var messageKey = key + translatedValue
            var translatedMessage = proto[localizationCacheKey].messages[messageKey]

            if (!translatedMessage)
            {
                // translatedMessage = { format: () => { return translatedValue } }
                translatedMessage = new IntlMessageFormat(translatedValue, lang, formats)
                proto[localizationCacheKey].messages[messageKey] = translatedMessage
            }

            var lst = {}
            for (var i = 1; i < args.length; i += 2)
            {
                lst[args[i]] = args[i + 1]
            }
            
            var fmsg = key
            try
            {
                fmsg = translatedMessage.format(lst)
            }
            catch
            {
                if (Teamatical.BuildEnv == 'Development') { console.error(`Localize format failed: [${language}].'${key}' -> '${translatedValue}'`, lst) }
            }
            return fmsg
        }
    }
}
