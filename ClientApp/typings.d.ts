declare module '*.html' {
	const content: string;
	export default content;
}

declare module '*.css' {
	const content: string;
	export default content;
}

declare module '*.json' {
	const content: string;
	export default content;
}


interface URL
{
	hash: string;
	host: string;
	hostname: string;
	href: string;
	toString(): string;
	readonly origin: string;
	password: string;
	pathname: string;
	port: string;
	protocol: string;
	search: string;
	readonly searchParams: URLSearchParams;
	username: string;
	toJSON(): string;
}

declare var URL: {
	prototype: URL;
	new(url: string, base?: string | URL): URL;
	createObjectURL(object: any): string;
	revokeObjectURL(url: string): void;
}

interface Navigator
{
	// share: any

	connection: any
	mozConnection: any
	webkitConnection: any

	setAppBadge: any
	clearAppBadge: any

	// vibrate: any
	mozVibrate: any
	
	wakeLock: any

	msSaveOrOpenBlob: any
	msSaveBlob: any
}

interface Window
{
	Math: typeof Math
	EventSource: any
	StyleMedia: any
	Navigator: Navigator
	URL: URL 
	// pageYOffset

	//browers compatibility
	Uint16Array: any
	webkitURL: any
	msCrypto: any
	Teamatical: TeamaticalGlobals
	clipboardData: any

	//Android Integration
	toAndroidDevice: any
	

	//external libs
	Polymer: any
	dataLayer: any
	fbq: any
	appInsights: any
	Stripe: any
	ShadyCSS: any
	google: any

	Quill: any
	ace: any
	showOpenFilePicker: any
	showSaveFilePicker: any
}

interface Document
{
	documentMode: string
	msHidden: boolean
	webkitHidden: boolean
}

interface EventInit
{
	bubbles?: boolean
	cancelable?: boolean
	scoped?: boolean
	composed?: boolean
}

declare module WebComponents
{
	export const ready: boolean;
	export const waitFor: (callback: () => Promise<any>) => void;
}

// declare module '@polymer/polymer/polymer-element' {
// 	// noinspection TsLint
// 	export const PolymerElement: any;
// 	export const html: any;
// }

interface TeamaticalGlobals
{
	//razor-aspnet
	BuildEnv: string
	BuildPath: string

	//sets in static-run for app
	_browser: any //allowPayRequest|allowLazyload|webp|iPhone|edge|msie|version|safari|chrome|evilishere

	//razor objects
	// LocaleDefault: string
	// LocaleJSON: string
	// PreloadedProductJSON: string
	// PreloadedStoreJSON: string

	//static only
	addScript: any
	scriptPath: any

	//misc
	SignalR: any

	//Android Integration
	onBarcode: any
}
