import '@polymer/iron-flex-layout/iron-flex-layout.js'
import 'intersection-observer/intersection-observer.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import view from './ui-image.ts.html'
import style from './ui-image.ts.css'
const __imageWebpKey = '__imageWebpKey'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const elementObservers = new WeakMap()

@CustomElement
export class UIImage extends UIBase
{
	static get is() { return 'teamatical-ui-image' }

	static get template() { return html([`<style>${style}</style>${view}`])}
	//   <!-- <div class="back-container">
	//   <img 
	//     id="img2" 
	//     alt="img-back" 
	//     draggable="false"
	//     unselectable="on"
	//     on-selectstart="eventNull"
	//     on-dragstart="eventNull">
	// </div> -->

	static get properties()
	{
		return {
			src: { type: String, },
			alt: { type: String, },
			label: { type: String, },
			loadingOnUpdate: { type: Boolean, value: false, reflectToAttribute: true }, //loading-on-update
			isSmoothUpdate: { type: Boolean, value: false, reflectToAttribute: true }, //is-smooth-update
			backgroundDark: { type: Boolean, value: false, reflectToAttribute: true }, //background-dark
			lazyLoad: { type: Boolean, value: false, reflectToAttribute: true }, //lazy-load
			hoverEffect: { type: Boolean, value: false, reflectToAttribute: true },
			useWebp: { type: Boolean, value: false, reflectToAttribute: true },
			placeholderImg: { type: String, observer: '_placeholderImgChanged' },
			placeholderError: { type: Boolean, value: false, reflectToAttribute: true },

			isloaded: { type: Boolean, reflectToAttribute: true },

			lazyObserve: { type: String },
			lazyMargin: { type: String, value: '0px 0px 0px 0px' },
			lazyThreshold: { type: Number, value: 0.0 },
			old: { type: String, },
			issrc: { type: Boolean, value: false, },
			islzl: { type: Boolean, value: false, },
			isblank: { type: Boolean },
		}
	}

	backgroundDark: boolean
	_lazyLoadIfAnyDebouncer: any
	_imgLoadingTimeoutDebouncer: any
	_hidePlaceholderDebouncer: any
	_observer: any
	_onImgLoadHandler: any
	_onImgErrorHandler: any
	loadingOnUpdate: boolean
	placeholderError: boolean
	alt: any
	src: any
	lazyLoad: any
	lazyObserve: any
	lazyMargin: any
	lazyThreshold: any
	hoverEffect: any
	useWebp: any
	placeholderImg: any
	old: any
	issrc: any
	islzl: any
	isblank: any
	isloaded: any
	isSmoothUpdate: boolean

	static get observers()
	{
		return [
			'_srcChanged(src, lazyLoad)'
		]
	}


	get img() { return this.$['img'] as HTMLImageElement }

	__static_set(key, val)
	{
		var proto = UIImage.prototype.constructor

		if (!proto[key]) { proto[key] = '' }
		proto[key] = val
	}

	__static_get(key)
	{
		var proto = UIImage.prototype.constructor
		return proto[key]
	}

	constructor()
	{
		super()

		this._onImgLoadHandler = this._onImgLoad.bind(this)
		this._onImgErrorHandler = this._onImgError.bind(this)

		var webp = this.__static_get(__imageWebpKey)
		if (webp === undefined)
		{
			this.__static_set(__imageWebpKey, Teamatical._browser.webp)
		}
	}

	connectedCallback()
	{
		super.connectedCallback()

		if (Teamatical._browser.allowLazyload && this.lazyLoad && !this.islzl)
		{
			this._startObserving()
		}
	}

	disconnectedCallback()
	{
		super.disconnectedCallback()

		this._stopObserving()
	}

	ready()
	{
		super.ready()
	}

	lazyLoadIfAny()
	{
		this.islzl = true
		this._lazyLoadIfAnyDebouncer = Debouncer.debounce(this._lazyLoadIfAnyDebouncer, timeOut.after(90), () =>
		{
			if (this.lazyLoad && !this.isloaded && this.img)
			{
				// console.log('lazyload start - ' + this.src)
				this._startImageLoad(this.src)
			}
		})
	}

	_srcChanged(src, lzl)
	{
		// console.log(src, lzl)
		if (this.loadingOnUpdate)
		{
			this.img.src = this._trans_image()
		}

		if (!src) { return }

		this._stopObserving()
		this.issrc = true //make sure lazy-load knows src has been setted
		this.isloaded = false
		this.img.removeEventListener('load', this._onImgLoadHandler)
		this.img.removeEventListener('error', this._onImgErrorHandler)
		if (this._imgLoadingTimeoutDebouncer) { this._imgLoadingTimeoutDebouncer.cancel() }

		if (this.old === undefined)
		{
			this._blank_handle(1)
		}
		else if (this.old !== src)
		{
			this.islzl = false
		}

		if (Teamatical._browser.allowLazyload && this.lazyLoad && !this.islzl)
		{
			// this._blank_handle(1)
			if (!this.img.src || this.loadingOnUpdate || !this.isSmoothUpdate) { this._blank_handle(1) }

			afterNextRender(this, () => { 
				// console.log('afterNextRender', this.src.substr(-16))
				this._startObserving()
				// this.async(() => { this._startObserving() }, 180)
			})
		}
		else
		{
			this._startImageLoad(src)
		}

		this.islzl = false
	}

	_startImageLoad(src)
	{
		if (!this.issrc) { return }
		this.issrc = false

		var webp = this.__static_get(__imageWebpKey)
		var src: any = src + (this.useWebp && webp ? '.webp' : '')

		this.img.removeEventListener('load', this._onImgLoadHandler)
		this.img.removeEventListener('error', this._onImgErrorHandler)
		
		// this._imgLoader(1)
		if (!this.img.src || this.loadingOnUpdate || !this.isSmoothUpdate) { this._imgLoader(1) }

		this.img.addEventListener('load', this._onImgLoadHandler, EventPassiveDefault.optionPrepare())
		this.img.addEventListener('error', this._onImgErrorHandler, EventPassiveDefault.optionPrepare())
		//		var loadingOnUpdate = this.loadingOnUpdate || Teamatical._browser.safari
        if (Teamatical._browser.safari)
		{
			this.img.src = '' //iphone??
		}
		this.img.src = src
		this.old = src
	}


	_onImgLoad(e)
	{
		this.isloaded = (this.img.src !== this._loader_failed())

		this._onImgDone()
	}

	_onImgError(e)
	{
		if (!this.placeholderImg || this.placeholderError)
		{
			if (this.placeholderImg && this.placeholderError)
			{
				this.style.backgroundImage = ''
			}
			this.img.src = this._loader_failed()
		}
		this._onImgDone()
	}

	_onImgDone()
	{
		// console.log('img done - ' + this.src)
		this.img.removeEventListener('load', this._onImgLoadHandler)
		this.img.removeEventListener('error', this._onImgErrorHandler)
		if (this._imgLoadingTimeoutDebouncer) { this._imgLoadingTimeoutDebouncer.cancel() }

		this._blank_handle(0)
		this._imgLoader(0)

		this.dispatchEvent(new CustomEvent('teamatical-ui-image-done', { bubbles: true, composed: true, detail: { img: this, src: this.src, failed: this.img.src == this._loader_failed() } }))
	}

	_placeholderImgChanged(placeholder)
	{
		this.style.backgroundImage = 'url(\'' + placeholder + '\')'
	}

	_blank_handle(start)
	{
		// console.log('_blank_handle: ' + start)
		if (start)
		{
			if (this.placeholderImg) { this.style.backgroundImage = "url('" + this.placeholderImg + "')" }

			this.isblank = true
			this.img.style.transition = ''
			this.img.style.opacity = '0'
		}
		else // stop
		{
			if (this.isblank)
			{
				this.img.style.transition = '0.5s opacity, 0.5s transform'
				this.img.style.opacity = '1'
				this.isblank = false
			}
		}
	}



	_trans_image()
	{
		return this._trans_image_z6()
	}

	_trans_image_z6()
	{
		return "data:image/png;base64," +
			"iVBORw0KGgoAAAANSUhEUgAAAkAAAAMACAAAAADp3ocyAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAACdFJOUwAAdpPNOAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAHESURBVBgZ7cExAQAAAMIg+6deDQ9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXArDWgABeKZ+fgAAAABJRU5ErkJggg=="
	}

	_imgLoader(show)
	{
		if (this.placeholderImg !== undefined) 
		{ 
			// if (!show)
			// {
			// 	//animation allow to be finished
			// 	this._hidePlaceholderDebouncer = Debouncer.debounce(this._hidePlaceholderDebouncer, timeOut.after(350), () => 
			// 	{
			// 		this.style.backgroundImage = ''
			// 	})
			// }
			return 
		}

		// console.log('img-loader: ' + show)
		this.style.backgroundImage = show ? "url('" + this._loader_anim() + "')" : ''
	}

	_loader_failed()
	{
		return 'data:image/svg+xml,' + encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 24 32">
			<defs><style>.a{fill:#ccc;fill-rule:evenodd}</style></defs>
			<path class="a" d="M14.8 3h-.12a3 3 0 01-5.25-.08h-.11A27.24 27.24 0 001.4 7.33l1.19 3.31L5.9 9.38v2.21l1.94 1.94 2.77-2.76 2.76 2.76 2.77-2.77 1.79 1.8.1-3 3.28 1.36 1.29-3.29A26.87 26.87 0 0014.8 3z"/>
			<path class="a" d="M16.15 12.72l-2.77 2.76-2.76-2.76-2.77 2.76-1.93-1.92L6 21l11.71.17.21-6.69z"/>
		</svg>
		`)
	}

	_loader_anim()
	{
		let fillcolor = '#333'
		if (this.backgroundDark)
		{
			fillcolor = '#ccc'
		}

		return 'data:image/svg+xml,' + encodeURIComponent(
			//t-shirt
			// `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
			// 	viewBox="0 0 24 32" style="enable-background:new 0 0 24 32;" xml:space="preserve">
			// <style type="text/css">
			// 	.st0{fill-rule:evenodd;clip-rule:evenodd;fill:#CCCCCC;}
			// </style>
			// <title>loading-img</title>
			// <path class="st0" d="M18,9.6l3.3,1.4l1.3-3.3c-2.3-2-5-3.5-7.8-4.6h-0.1c-0.8,1.4-2.7,1.9-4.1,1.1c-0.5-0.3-0.9-0.7-1.2-1.2H9.3
			// 	c-2.9,1-5.5,2.5-7.9,4.4l1.2,3.3l3.3-1.3L6,21l11.7,0.2L18,9.6z"/>
			// </svg>
			// `

			//stripes
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" preserveAspectRatio="xMidYMid meet">
                <g transform="translate(12,15) scale(0.1) translate(-12,-15)">
                    <rect x="3" y="5.77283" width="4" height="18.4543" opacity="0.2" fill="${fillcolor}">
                        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                    </rect>
                    <rect x="10" y="6.72717" width="4" height="16.5457" opacity="0.2" fill="${fillcolor}">
                        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                    </rect>
                    <rect x="17" y="9.22717" width="4" height="11.5457" opacity="0.2" fill="${fillcolor}">
                        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.3s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.3s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.3s" dur="0.6s" repeatCount="indefinite"></animate>
                    </rect>
                </g>
			</svg>`
		)
	}




	_stopObserving()
	{
		if (!this._observer) { return }

		this._observer.unobserve(this)
		if (--this._observer._lazyImgCount <= 0)
		{
			this._deleteObserver(this._observer)
		}
		this._observer = null
	}

	_startObserving()
	{
		this._getObserver().then((observer) =>
		{
			this._observer = observer
			this._observer.observe(this)
			this._observer._lazyImgCount++
		})
	}

	_deleteObserver(observer)
	{
		var observersMap = elementObservers.get(observer.root)
		if (observersMap)
		{
			observersMap.delete(observer._lazyImgKey)
			if (observersMap.size === 0)
			{
				elementObservers.delete(observer.root)
			}
		}
		observer.disconnect()
	}

	_getClosest()
	{
		var el: any = this
		while (el.matches && !el.matches(this.lazyObserve)) 
		{
			el = el.parentNode
		}
		return el.matches ? el : null
	}

	_notifyEntries(entries)
	{
		for (var i = 0; i < entries.length; i++)
		{
			const entityi = entries[i]
			// console.log('_notifyEntries', entityi.target.src ? entityi.target.src.substr(-16) : entityi.target.src, entityi.isIntersecting)
			if (entityi.isIntersecting && entityi.target instanceof UIImage)
			{
				entityi.target.lazyLoadIfAny()
			}
		}
	}	

	_getObserver() 
	{
		return new Promise((resolve, reject) =>
		{
			var observer
			// get element based on selector if there is one
			var el = this.lazyObserve ? this._getClosest() : null
			var node = el || document.documentElement
			// console.log('observed node', this.lazyObserve, node)
			var options: any = {
				root: el,
				rootMargin: this.lazyMargin,
				threshold: this.lazyThreshold
			}
			// See if there is already an observer created for the intersection options given. Note we perform a double
			// lookup (map within a map) because the actual map key is a different instance and there is no hashing
			var observersMap = elementObservers.get(node)
			if (!observersMap)
			{
				observersMap = new Map()
				elementObservers.set(node, observersMap)
			}
			var key = options.rootMargin + '/' + options.threshold
			observer = observersMap.get(key)
			// console.log(key, observer)
			if (!observer)
			{
				// first time for this observer options combination
				observer = new IntersectionObserver(this._notifyEntries, options)

				observer._lazyImgKey = key
				observer._lazyImgCount = 0
				observersMap.set(key, observer)
			}
			resolve(observer)
		})
	}

}
