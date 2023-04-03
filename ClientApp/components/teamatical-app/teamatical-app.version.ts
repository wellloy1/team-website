import { StringUtil } from '../utils/StringUtil'
// import { RandomInteger } from '../utils/MathExtensions'
import { NetBase } from '../bll/net-base'
import { HubConnectionBuilder, HubConnection, IHttpConnectionOptions, LogLevel, JsonHubProtocol } from '@microsoft/signalr'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { SignalRGlobal } from '../bll/signalr-global';
import { TeamaticalApp } from './teamatical-app';
// import { timeOut } from '@polymer/polymer/lib/utils/async.js'
const Teamatical: TeamaticalGlobals = window['Teamatical']
// const EventSource: any = window['EventSource']


export class AppVersion extends Object
{
	//#region declare vars
	app: any
	app_name: any
	appverEvent: any
	netbase: any

	verstr: any
	verstrNew: any
	websiteUrl: any

	major: any
	minor: any
	patch: any
	build: any
	aspEnv: any
	apiGroup: any

	_timer: any
	_serverSupportSSE: any
	_fallbackRequest: any = true
	_timerEventReconnect: any
	//#endregion declare vars

	constructor(app: TeamaticalApp, appname, verstr, aspEnv, apiGroup, websiteUrl)
	{
		super()
		
		this.app = app
		this.app_name = appname
		this.verstr = verstr
		this.verstrNew = undefined
		this.websiteUrl = websiteUrl

		var verAr = AppVersion.parseVersionStr(verstr)
		this.major = verAr[0]
		this.minor = verAr[1]
		this.patch = verAr[2]
		this.build = verAr[3]
		this.aspEnv = aspEnv
		this.apiGroup = apiGroup

		this._serverSupportSSE = false
	}

	static parseVersionStr(verstr)
	{
		return (typeof verstr === 'string' ? verstr.split(/[\.|-]/) : ['0', '0', '0', '0'])
	}

	stop()
	{
		if (this._timer)
		{
			// console.log(this._timer + ' has been cleared')
			clearInterval(this._timer)
		}
	}

	isNew()
	{
		return (this.verstrNew != undefined && this.verstrNew != this.verstr)
	}

	toString()
	{
		return this.short()
	}

	userAgent()
	{
		return this.format("{0}-client-html-{3}-{1}-{2}").toLowerCase()
	}

	buildPath()
	{
		return (this.aspEnv == 'Production' ? '/build/' + this.short() : '')
	}

	short()
	{
		return this.format("{1}-{2}")
	}

	shortTitle()
	{
		return this.format("v{1} ({2})")
	}

	appTitle()
	{
		return this.app_name
	}

	title()
	{
		return this.format("{0} v{1} ({2})")
	}

	format(pattern)
	{
		let pattern_default = "{0} v{1} ({2}-{3})"
		pattern = (pattern == undefined ? pattern_default : pattern)

		let ver_short = this.major + '.' + this.minor + '.' + this.patch + (this.aspEnv != 'Production' ? '~d' : '')
		let arch = (this.getBrowser() + '_') + navigator.platform
		let build = this.build //this.major * 100000000 + this.minor * 1000000 + this.patch * 10000 + this.build

		return StringUtil.format(pattern,
			this.app_name,
			ver_short,
			build,
			arch
		)
	}

	getBrowser()
	{
		var b = "unknown"
		try 
		{
			var e
			var f = e.width
		}
		catch (e) 
		{
			var err = e.toString()
			if (err.search("not an object") !== -1)
			{
				return "safari"
			} else if (err.search("Cannot read") !== -1)
			{
				return "chrome"
			} else if (err.search("e is undefined") !== -1)
			{
				return "firefox"
			} else if (err.search("Unable to get property 'width' of undefined or null reference") !== -1)
			{
				if (!(false || !!document.documentMode) && !!window.StyleMedia)
				{
					return "edge"
				} else
				{
					return "IE"
				}
			} else if (err.search("cannot convert e into object") !== -1)
			{
				return "opera"
			} else
			{
				return undefined
			}
		}
	}

	async checkAppVerHandler()
	{
		this._startTimer() //start anyways for fallback check and auth check
		
		// if (window.EventSource && this._serverSupportSSE) 
		// {
		// 	this._h2_serversideevent()
		// }

		await this._signalr()
	}

	_h2_serversideevent()
	{
		// this._fallbackRequest = false

		// if (this._timerEventReconnect) { clearInterval(this._timerEventReconnect) }

		// const apiurl = this.websiteUrl + '/api/v1.0/health/sse'
		// const qp = { app_ver: this.verstr }
		// this.appverEvent = new EventSource(StringUtil.urlquery(apiurl, qp), { withCredentials: true })
		// this.appverEvent.onmessage = (e) =>
		// {
		// 	// console.log(e)
		// }
		// this.appverEvent.addEventListener("app-ver", (e) =>
		// {
		// 	// console.log(e)
		// 	if (!e.data) { return }

		// 	var d = JSON.parse(e.data)
		// 	if (d)
		// 	{
		// 		this.verstrNew = d['app-ver']
		// 	}

		// 	// console.log(d, this.verstr)

		// 	if (this.verstrNew != this.verstr)
		// 	{
		// 		// console.log('ver update....')
		// 		this._wrongVersionHandler()
		// 		//this.app.dispatchEvent(new CustomEvent('app-ver-update', { bubbles: true, composed: true, detail: { old: this.verstr, new: this.verstrNew, } }))
		// 	}
		// })
		// this.appverEvent.onopen = (e) =>
		// {
		// 	// console.log(e)
		// }
		// this.appverEvent.onerror = (e) =>
		// {
		// 	switch (e.target.readyState)
		// 	{
		// 		case EventSource.CONNECTING:
		// 			break
		// 		case EventSource.CLOSED:
		// 			if (this._timerEventReconnect) { clearInterval(this._timerEventReconnect) }
		// 			this._timerEventReconnect = setInterval(this._checkAppVerHandler.bind(this), 5 * 1000)
		// 			break
		// 		default:
		// 			console.error(e)
		// 			break
		// 	}
		// }
	}

	_checkVersionViaAPIDebouncer: Debouncer

	async _signalr()
	{
		Teamatical.SignalR = new SignalRGlobal()

		var bindConnectionMessage = (connection) =>
		{
			var messageCallback = (name, message, group) =>
			{
				if (!message) { return }

				if (name == 'app-ver')// && group == this.apiGroup)
				{
					//seems like need to check version via API
					// this._timerHandler(true)
					this.verstrNew = message
					if (this.verstrNew != this.verstr)
					{
						// this._wrongVersionHandler()
						this._checkVersionViaAPIDebouncer = Debouncer.debounce(this._checkVersionViaAPIDebouncer, timeOut.after(200), () =>
						{
							this._checkVersionViaAPI()
						})
					}
				}
			}
			// Create a function that the hub can call to broadcast messages.
			connection.on('broadcastMessage', messageCallback)
			//connection.onreconnecting
			//console.assert(connection.state === signalR.HubConnectionState.Reconnecting)

			connection.onclose((e) =>
			{
				// setTimeout(() =>
				// {
				// 	start()
				// }, 2000 + RandomInteger(-400, 400))
				// console.log(e, connection.state)

				this._fallbackRequest = true
			})
		}

		
		var start = async () => 
		{
			const signalrModular = await import('@microsoft/signalr')
			const HubConnectionBuilder = signalrModular.HubConnectionBuilder
			// const HubConnection = signalrModular.HubConnection
			const LogLevel = signalrModular.LogLevel
			

			var netbase = NetBase.prototype
			var opt: IHttpConnectionOptions = {
				accessTokenFactory: async () =>
				{
					return await netbase._getAccessToken()
				}
			}
			var connection: HubConnection = new HubConnectionBuilder()
				.withUrl('/api-signalr/hubs/health', opt)
				// .withHubProtocol(JsonHubProtocol)
				// .AddNewtonsoftJsonProtocol()
				.withAutomaticReconnect()
				.configureLogging(this.aspEnv == 'Production' ? LogLevel.Warning : LogLevel.Warning)
				.build()
			bindConnectionMessage(connection)

			connection.serverTimeoutInMilliseconds = 1000 * 60 * 10

			connection.start()
				.then(() =>
				{
					this._fallbackRequest = false
					// console.log('connection started')
					// console.log("connectionID: " + connection.);
				})
				.catch((error) =>
				{
					// setTimeout(() =>
					// {
					// 	start()
					// }, 12000 + RandomInteger(-4000, 4000))
					this._fallbackRequest = true

					if (error)
					{
						if (error.message)
						{
							// console.error(error.message)
						}
						if (error.statusCode && error.statusCode === 401)
						{
							// appendMessage('_BROADCAST_', 'You\'re not logged in. Click <a href="/login">here</a> to login with GitHub.')
						}
					}
				})   
		}

		await start()
	}

	_wrongVersionHandler()
	{
		this.app.dispatchEvent(new CustomEvent('app-ver-update', { bubbles: true, composed: true, detail: { old: this.verstr, new: this.verstrNew, } }))
	}

	_startTimer()
	{
		this._timer = setInterval(this._timerHandler.bind(this), 240 * 1000)
	}

	_timerHandler(force:any)
	{
		// //check app-version-fallback
		// if (this._fallbackRequest || force) 
		// {
		// 	this._checkVersionViaAPI()
		// }
	}

	_checkVersionViaAPI()
	{
		if (!this.netbase) { this.netbase = new NetBase() }

		var rq = {
			url: this.websiteUrl + '/api/v1.0/health/app-ver',
			onLoad: this._onRequestResponse.bind(this),
			onError: this._onRequestError.bind(this)
		}
		this.netbase._getResource(rq, 1, true)
	}

	_onRequestResponse(event)
	{
		var r = event['response']
		if (r && r['success'])
		{
			this.verstrNew = r['result']
			// console.log('build:' + this.verstr + ' -> ' + this.verstrNew)
			if (this.verstrNew != this.verstr)
			{
				this._wrongVersionHandler()
			}
		}
		else
		{
			this._onRequestError(event)
		}
	}

	_onRequestError(event)
	{
		// console.error(event)
	}
}
