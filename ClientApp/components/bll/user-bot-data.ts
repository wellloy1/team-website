import { html } from '@polymer/polymer/polymer-element'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { UserInfoModel } from '../dal/user-info-model'
import { NetBase } from './net-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { CustomElement } from '../utils/CommonUtils'
import '../utils/jwt-decode.js'
import { RandomInteger } from '../utils/MathExtensions'
import { UserData } from './user-data'
declare const jwt_decode: any //?
// const Teamatical: TeamaticalGlobals = window['Teamatical']
const QUERY_CLIENTSECRET = 'client_secret'

class UserBotInfoModel
{
    bot_name: string
    
    scope: string
    token_type: string
    access_token: string
    expires_in: number
    issued_at: number
}


@CustomElement
export class UserBotData extends NetBase
{
    static get is() { return 'teamatical-user-bot-data' }

    static get template()
    {
        return html``
    }

    static get properties()
    {
        return {
            bot: { type: String },
            visible: { type: Boolean, },
            queryParams: { type: Object },
            userInfo: { type: Object, notify: true },
        }
    }

    static get observers()
    {
        return [
            '_readyToAuth0(bot, visible, queryParams)'
        ]
    }

    //#region vars
    bot: any
    visible: any
    websiteUrl: any
    queryParams: Object
    userInfo: any
    isAuthChanging: any
    _auth0Debouncer: any
    _renewalDebouncer: any
    clientSecret: string
    //#endregion

    
    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    _readyToAuth0(bot, visible, queryParams)
    {
        // console.log(bot, visible, queryParams)
        if (this.isAuthChanging === true || bot === undefined || visible === undefined || queryParams === undefined) { return }

        if (visible === true && typeof (this.queryParams[QUERY_CLIENTSECRET]) == 'string' && this.queryParams[QUERY_CLIENTSECRET] !== '')
        {
            var kioskTms = this._dev ? 0 : RandomInteger(2000, 3000)
            this._auth0Debouncer = Debouncer.debounce(this._auth0Debouncer, timeOut.after(kioskTms), () => 
                this.auth0Start(bot)
            )
        }
        else if (this.userInfo?.isAuth !== true)
        {
            // console.warn('bot error 401')
            var barr = [{
                title: this.localize('admin-app-ok'),
                ontap: (e) => 
                {
                    this.async(() => { this._readyToAuth0(this.bot, this.visible, this.queryParams) }, 500)
                    // this.dispatchEvent(new CustomEvent('ui-user-auth', {
                    //     bubbles: true, composed: true, detail: {
                    //         signin: true
                    //     }
                    // }))
                }
            }]
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    // announce: this.localize('admin-bot-authorization-failed'),
                    message: this.localize('admin-bot-authorization-failed'),
                    buttons: barr,
                }
            }))
        }
    }

    async auth0Completed(botinfo: UserBotInfoModel, saveToLocalStorage = false)
    {
        this.isAuthChanging = true
        const userdata = this.__static_get_userdata() as UserData
        if (userdata) { await userdata.setBotAccessToken(this, botinfo.access_token, botinfo.expires_in) }
        this.isAuthChanging = false

        if (this.queryParams && this.queryParams[QUERY_CLIENTSECRET]) //clean client_secret
        {
            var qp = this.queryParams
            this.clientSecret = qp[QUERY_CLIENTSECRET] //save in memory
            // delete qp[QUERY_CLIENTSECRET]
            // window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))

            if (window.localStorage && saveToLocalStorage)
            {
                var locid = `workstation-m2m-${StringUtil.cyrb53(this.clientSecret)}`
                botinfo.issued_at = this._now()
                botinfo.bot_name = this.bot
                localStorage.setItem(locid, JSON.stringify(botinfo))
            }
        }


        //renewal...
        if (this.clientSecret && botinfo.expires_in)
        {
            var delay = (botinfo.expires_in - 5 * 60 * 60) * 1000 //ms
            if (botinfo.issued_at)
            {
                delay = delay - (this._now() - botinfo.issued_at)
            }
            if (delay < 0) { delay = 0 }
            // console.log(delay, 'ms', r.expires_in, r.access_token)
            this._renewalDebouncer = Debouncer.debounce(this._renewalDebouncer, timeOut.after(delay), () =>
            {
                this.auth0M2mRequest(this.bot)
            })
        }
    }

    async auth0Start(bot)
    {
        var client_secret = this.queryParams[QUERY_CLIENTSECRET] || this.clientSecret
        if (window.localStorage)
        {
            var locid = `workstation-m2m-${StringUtil.cyrb53(client_secret)}`
            var botinfo: UserBotInfoModel
            var locitem = localStorage.getItem(locid)
            if (locitem)
            {
                try
                {
                    botinfo = JSON.parse(locitem)
                    if (botinfo?.access_token && botinfo?.expires_in)
                    {
                        this.async(async () => {
                            await this.auth0Completed(botinfo)
                        }, 650)
                        return //EXIT
                    }
                }
                catch
                {
                    localStorage.removeItem(locid)
                }
            }
        }

        this.auth0M2mRequest(bot)
    }

    async _onRequestResponse(e)
    {
        var r = e['response'] as UserBotInfoModel

        if (r)
        {
            if (r.access_token && r.expires_in)
            {
                await this.auth0Completed(r, true)
            }
            else
            {
                this._onRequestError({ message: 'no accesss token' })
            }
        }
        else
        {
            this._onRequestError({ message: 'no response' })
        }
    }

    _onRequestError(e)
    {
        var barr = [
            {
                title: this.localize('admin-netbase-bot-dlg-ok'),
                ontap: (te) => 
                {
                    this._auth0Debouncer = Debouncer.debounce(this._auth0Debouncer, timeOut.after(RandomInteger(1000, 5000)), () => this.auth0M2mRequest(this.bot))
                    // this.dispatchEvent(new CustomEvent('ui-user-auth', {
                    //     bubbles: true, composed: true, detail: {
                    //         signin: true,
                    //         href: window.location.href,
                    //     }
                    // }))
                }
            }
        ]

        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                required: true,
                announce: '',
                message: this.localize('admin-netbase-bot-auth-failed'),
                buttons: barr,
            }
        }))


        // console.error(e)
    }

    auth0M2mRequest(bot)
    {
        var client_id = ''
        switch(bot)
        {
            //userid - client_id@clients
            case 'planning':
            case 'printing':
                client_id = "weeKBni5Kzw6twPN52DxHld0A0xpMYSF"
                break

            case 'cutting':
            case 'stacking':
                client_id = "c6FizdDSZtyfUN8zcfNXqHDcJHTe3fYG"
                break

            case 'sewing':
                client_id = "rEO3Z4NVv2D68UCqlTrnbfzPFqvy6CEZ"
                break

            case 'sizelabel':
                client_id = "M1NZ9Ht3il4m6NZ92KW0VunRRJ9gJysh"
                break

            case 'replacements':
            case 'roll-inspection':
                client_id = 'CZKOhiIyIM47ypwV9eCxJdQa42k6x0Mf'
                break

            case 'bundling':
            case 'sorting':
                client_id = 'kFwoGfuqrPm18DVdusMcityAdqC6QpsB'
                break

            case 'qa':
                client_id = 'ypwQxXG5F01IeTEVENbN5M3nwQHUTtxC' 
                break

            case 'aggregation':
                client_id = "oT70ZjHG8Rq6zS33p6ePTIrXTx06TtmC"
                break                

            case 'shipping':
            case 'containerizing':
            case 'freights':
            case 'freightforward':
                client_id = "oJRp6FxL1l0gJugoRHPnQXDUlAbWbDZe"
                break

            case 'hub':
                client_id = "oJRp6FxL1l0gJugoRHPnQXDUlAbWbDZe" //need separate...!!!!!!!!
                break

            default:
                client_id = ''
        }

        var client_secret = this.queryParams[QUERY_CLIENTSECRET] || this.clientSecret
        var body = { 
            "client_id": client_id,
            "client_secret": client_secret ? client_secret : 'notpassed', 
            "audience": "https://www.teamatical.com/api/v1.0", 
            "grant_type": "client_credentials" 
        }

        var rq = {
            url: 'https://teamatical.auth0.com/oauth/token',
            external: true,
            body: body,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }

        this._getResource(rq, 3, true)
    }

}