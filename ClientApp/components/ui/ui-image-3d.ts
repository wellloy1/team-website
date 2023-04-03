import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import 'intersection-observer/intersection-observer.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'

import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from './ui-base'
import view from './ui-image-3d.ts.html'
import style from './ui-image-3d.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIImage3DBase = mixinBehaviors([IronResizableBehavior, GestureEventListeners], UIBase) as new () => UIBase & IronResizableBehavior & GestureEventListeners
const elementObservers = new WeakMap()


@CustomElement
export class UIImage3D extends UIImage3DBase
{
    static get is() { return 'teamatical-ui-image-3d' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            alt: { type: String, },
            placeholderImg: { type: String },
            src: { type: Object, notify: true },
            pv: { type: Number, notify: true, },
            lazyLoad: { type: Boolean, value: false, reflectToAttribute: true },
            lazyObserve: { type: String },
            lazyMargin: { type: String, value: '0px 0px 0px 0px' },
            lazyThreshold: { type: Number, value: 0.0 },
            hasDimensions: { type: Boolean, value: false, reflectToAttribute: true },
            drawDimensions: { type: Boolean, notify: true, value: false, reflectToAttribute: true },
            allowZoom: { type: Boolean, notify: true, value: false, reflectToAttribute: true },
            visible: { type: Boolean, value: false, observer: '_visibleChanged', },

            allowImageBefore: { type: Boolean, computed: '_computeAllowViews(views)', reflectToAttribute: true },
            allowImageNext: { type: Boolean, computed: '_computeAllowViews(views)', reflectToAttribute: true },
            disabledImageBefore: { type: Boolean, computed: '_computeDisabledImageBefore(views, views.*)' },
            disabledImageNext: { type: Boolean, computed: '_computeDisabledImageNext(views, views.*)' },

            views: { type: Array, observer: '_viewsChanged' },
            pvs: { type: Number, },
            smallScreen: { type: Object },

            _pv: { type: Number },
            _pvUpdated: { type: Number },
            _sprite: { type: Object },
            _isblank: { type: Boolean },
            _trackStart: { type: Number, value: 0 },

            isloaded: { type: Boolean, reflectToAttribute: true },
            is3d: { type: Boolean, computed: '_computeIs3d(src.url3d, is3dError)', notify: true, reflectToAttribute: true },
            is3dError: { type: Boolean, notify: true, reflectToAttribute: true },
            is3dLoaded: { type: Boolean, value: false, reflectToAttribute: true },
            is3dWarn: { type: Boolean, value: false, reflectToAttribute: true },
            islazyload: { type: Boolean, value: false, },
            loadingOnUpdate: { type: Boolean, value: false },

            iszoom: { type: Boolean, value: false, reflectToAttribute: true },
            _touchStart: { type: Object }
        }
    }


    static get observers()
    {
        return [
            '_srcChanged(src, lazyLoad)',
            '_viewsChangedOrSwitched(views, views.*, lazyLoad)',
        ]
    }

    setScrollDirection: any

    _pv_was_changed: any
    _pvWarnDebouncer: any
    _zpx: number = NaN
    _zpy: number = NaN
    _touchStart: any
    _onImgLoadHandler: any
    _onImgErrorHandler: any
    _onSpriteLoadHandler: any
    _onSpriteErrorHandler: any
    _observer: any
    _imgLoadingTimeoutDebouncer: any
    islazyload: any
    isloaded: any
    is3dLoaded: any
    lazyMargin: any
    lazyThreshold: any


    get img() { return this.$['img'] as HTMLImageElement }
    get loader() { return this.$['loader'] as HTMLElement }
    get buttonsContainer() { return this.$['buttons-container'] as HTMLElement }

    constructor()
    {
        super()

        this._onImgLoadHandler = this._onImgLoad.bind(this)
        this._onImgErrorHandler = this._onImgError.bind(this)
        this._onSpriteLoadHandler = this._onSpriteLoad.bind(this)
        this._onSpriteErrorHandler = this._onSpriteError.bind(this)

        this.addEventListener('iron-resize', (e) => this._onResized(e))
        window.addEventListener('scroll', (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.setScrollDirection('y', this.img)
        // Gestures.setTouchAction(this.img, 'pan-y pinch-zoom')


        if (!this.isTouchActionSupported()) {
            this.addEventListener("touchstart", (e) => this.onTouchStart(e))
            this.addEventListener("touchmove", (e) => this.onTouchMove(e))
            this._touchStart = { x: 0, y: 0 }
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

    onTouchStart(e) {
        try {
            this._touchStart.x = e.pageX;
            this._touchStart.y = e.pageY;
        } catch (ex) {}
    }

    onTouchMove(e) {
        try {
            let dx = Math.abs(e.pageX - this._touchStart.x);
            let dy = Math.abs(e.pageY - this._touchStart.y);
            if (dy < dx) {
                e.preventDefault()
            }
        } catch (ex) {}
    }

    setBackgroundImage(url) 
    {
        this.img.style.backgroundImage = '' // this seams to free up resources
        this.img.style.width = (this.img.offsetWidth - 0.1) + 'px'
        if (url !== '') { this.img.style.backgroundImage = 'url("' + url + '")' }
        this.img.style.width = ''
        this.img.offsetWidth
    }

    reset()
    {
        this.islazyload = false
        this.isloaded = false
        this.is3dLoaded = false

        this.img.src = '' //disable image
        this.setBackgroundImage('') //disable background 3d _sprite if any

        //stop 3d loading or clear loaded 3d
        this._cancelImage3dLoad()
        this.img.removeEventListener('load', this._onImgLoadHandler)
        this.img.removeEventListener('error', this._onImgErrorHandler)
        if (this._imgLoadingTimeoutDebouncer) { this._imgLoadingTimeoutDebouncer.cancel() }
    }

    lazyLoadIfAny()
    {
        this.islazyload = true
        this._lazyLoadIfAnyDebouncer = Debouncer.debounce(this._lazyLoadIfAnyDebouncer, timeOut.after(150), () =>
        {
            var src = this.src
            if (this.lazyLoad && !this.isloaded && this.img && src && this.img.src !== src.url)
            {
                // this._startImageLoad(this.src)
                if (!src.url) 
                {
                    this._startImage3dLoad(src)
                }
                else 
                {
                    this._startImageLoad(src)
                }
            }
        })
    }


    onSizemeterTap(e)
    {
        this.set('drawDimensions', (this.drawDimensions === null ? true : !this.drawDimensions))
    }

    onDblClicked(e)
    {
        if (!this.is3dLoaded || !this.allowZoom) { return }

        this._zoomReset('zoom' + (this.iszoom ? 'out' : 'in'), e)
    }

    onMouseMove(e)
    {
        // this._mouse_inside = true
        if (!this.iszoom || this._trackStart) { return }

        this._zoomReset('mousemove', e)
    }

    onMouseOut(e)
    {
        if (!this.iszoom || this._trackStart) { return }

        this._zoomReset('mouseout', e)
    }

    onImageBefore(e)
    {
        for (var i in this.views)
        {
            var ii = parseInt(i) - 1
            if (this.views[i].Selected && (ii >= 0))
            {
                this._changeView(i, ii)
                break
            }
        }
    }

    onImageNext(e)
    {
        for (var i in this.views)
        {
            var ii = parseInt(i) + 1
            if (this.views[i].Selected && this.views.length >= (ii))
            {
                this._changeView(i, ii)
                break
            }
        }
    }

    _changeView(i, ii)
    {
        if (this._pv_was_changed && Array.isArray(this.views) && this.views.length > 1)
        {
            //clear views with first frame - due PointOfView was changed
            for (var j in this.views)
            {
                delete this.views[j].ImageUrl
            }
            // console.log('clear views with first frame - due PointOfView was changed', this.views)
        }

        this.views[i].Selected = false
        this.views[ii].Selected = true
        this.notifyPath('views.' + i)
        this.notifyPath('views.' + ii)
    }

    _onScroll(e)
    {
        this._zoomReset('scroll', e)
    }

    onZoomOut(e)
    {
        if (!this.iszoom || this._trackStart) { return }

        this._zoomReset('zoomout', e)
        this.iszoom = false
    }

    _zoomReset(type, e?)
    {
        var isTouch = ('ontouchstart' in document.documentElement)

        // console.log('_zoomReset', type, isTouch)

        var animstop = () => 
        {
            this.img.style.transition = 'none'
            if (!this.iszoom)
            {
                this.style.overflow = ''
            }
        }
        var animstart = () => 
        {
            this.img.style.transition = 'transform .2s ease-in-out'
        }

        var zoomin = (e) => 
        {
            var r = this._imgRect, x, y
            if (e.clientX)
            {
                x = e.clientX + window.scrollX - r.left
                y = e.clientY + window.scrollY - r.top
            }
            else if (isTouch)
            {
                x = r.width - e.detail.x + window.scrollX - r.left
                y = r.height - e.detail.y + window.scrollY - r.top               
            }

            var zf = Math.max(this.img.naturalWidth / r.width, 2)
            //console.log('e:' + e.clientX + ' ' + e.clientY + '; s:' + window.scrollX + ' ' + window.scrollY + '; r:' + r.left + ' ' + r.top + '; z:' + zf)

            var origin = ('' + this.img.style.transformOrigin)

            if (!isNaN(this._zpx))
            {
                x = (x - this._zpx) / zf + this._zpx;
                y = (y - this._zpy) / zf + this._zpy;
            }
            
            this._zpx = x;
            this._zpy = y;
            
            this.img.style.transformOrigin = x + 'px ' + y + 'px'
            this.img.style.transform = 'scale(' + zf + ')'
            
            this.style.overflow = 'hidden'
        }
        var zoomout = () => 
        {
            this.img.style.transform = 'none'
            this._zpx = NaN
            this._zpy = NaN
        }

        var hdle = (zoom, e) => 
        {
            if (zoom)
            {
                animstart()
                zoomin(e)
            }
            else
            {
                animstart()
                zoomout()
            }
            this._zoomoutDebouncer = Debouncer.debounce(this._zoomoutDebouncer, timeOut.after(200), () =>
            {
                this.iszoom = zoom
                animstop()
                this._zoomoutDebouncer = null
            })
        }

        //zoomout - zoomin - mouseout - trackstart - trackend - resize
        if ((type == 'mouseout' && !isTouch) || type == 'scroll')
        {
            this._zoomresetDebouncer = Debouncer.debounce(this._zoomresetDebouncer, timeOut.after(500), () => hdle(false, e))
        }
        else if (type == 'mousemove')
        {
            if (!this._zoomoutDebouncer)
            {
                animstop()
                zoomin(e)
            }
            if (this._zoomresetDebouncer)
            {
                this._zoomresetDebouncer.cancel()
                this._zoomresetDebouncer = null
            }
        }
        else if (type == 'trackstart' || type == 'trackend')
        {
            animstop()
            if (this._zoomresetDebouncer)
            {
                this._zoomresetDebouncer.cancel()
                this._zoomresetDebouncer = null
            }
        }
        else if (type == 'zoomin')
        {
            hdle(true, e)
        }
        else if (type == 'zoomout')
        {
            hdle(false, e)
        }
        else if (type == 'resize')
        {
            hdle(false, e)
        }
    }

    _onResized(e?)
    {
        this._zoomReset('resize')

        var r = this.img.getBoundingClientRect()
        this._imgRect = {
            left: r.left + window.scrollX,
            top: r.top + window.scrollY,
            width: r.width,
            height: r.height,
        }
        this.buttonsContainer.style.height = r.height + 'px'
    }

    _visibleChanged(v)
    {
        if (v === false)
        {
            //
        }
        else if (v === true)
        {
            if (!this.iszoom) { this._onResized() }
        }
    }

    _computeIs3d(src3d, is3dError)
    {
        return typeof (src3d) == 'string' && src3d.length > 0 && is3dError !== true
    }

    _computeAllowViews(src_views)
    {
        // return false
        return (Array.isArray(src_views) && src_views.length > 1) ? true : false
    }

    _computeDisabledImageBefore(srcViews, srcViewsP)
    {
        if (!Array.isArray(srcViews)) { return }

        for (var i in srcViews)
        {
            if (srcViews[i].Selected && i == '0')
            {
                return true
            }
        }
        return false
    }

    _computeDisabledImageNext(srcViews, srcViewsP)
    {
        if (!Array.isArray(srcViews)) { return }

        var l = (srcViews.length - 1).toString()
        for (var i in srcViews)
        {
            if (srcViews[i].Selected && i == l)
            {
                return true
            }
        }
        return false
    }

    _viewsChanged(v, o)
    {
        // console.log('_viewsChanged', v, o)
        this._pv_was_changed = false
    }

    _viewsChangedOrSwitched(views, viewsP, lazyLoad)
    {
        if (views === undefined || lazyLoad === undefined) { return }
        // console.log(viewsP)

        var selected = views.filter((i) => { return i.Selected })

        this.src = {
            url: selected[0].ImageUrl,
            url3d: selected[0].ImageUrl3DFrames
        }
    }

    _srcChanged(src, lazyLoad)
    {
        if (!src || lazyLoad === undefined) { return }

        // console.log(src)

        this._stopObserving()

        var wasloaded = this.isloaded
        this.isloaded = false
        this.is3dLoaded = false
        this.is3dError = false

        //stop 3d loading or clear loaded 3d
        this._cancelImage3dLoad()
        this.img.removeEventListener('load', this._onImgLoadHandler)
        this.img.removeEventListener('error', this._onImgErrorHandler)
        if (this._imgLoadingTimeoutDebouncer) { this._imgLoadingTimeoutDebouncer.cancel() }

        if (this.lastSrc === undefined || this.loadingOnUpdate)
        {
            this._blank_handle(1)
        }

        if (this.lastSrc !== undefined && this.lastSrc.url !== src.url)
        {
            this.islazyload = false
        }

        if (Teamatical._browser.allowLazyload && this.lazyLoad && !this.islazyload)
        {
            if ((this.loadingOnUpdate && wasloaded) || this.lastSrc === undefined) 
            {
                this._blank_handle(1)

                afterNextRender(this, () => { this._startObserving() })
            }
            else
            {
                this._startObserving()
            }
        }
        else
        {
            if (!src.url) 
            { 
                this._startImage3dLoad(src)
            } 
            else 
            { 
                this._startImageLoad(src) 
            }
        }
    }

    _startImageLoad(src)
    {
        if (!src || this.isloaded) { return }

        this.lastSrc = src
        this._startloadTime = this._now()
        this.img.removeEventListener('load', this._onImgLoadHandler)
        this.img.removeEventListener('error', this._onImgErrorHandler)

        if (!this._isblank)
        {
            this._imgLoadingTimeoutDebouncer = Debouncer.debounce(this._imgLoadingTimeoutDebouncer, timeOut.after(1500), () =>
            {
                if (this.isloaded) { return }
                this._blank_handle(1)
                this._imgLoader(1)
            })
        }
        
        if (Teamatical._browser.safari) { this.img.src = "" }

        this.img.addEventListener('load', this._onImgLoadHandler, EventPassiveDefault.optionPrepare())
        this.img.addEventListener('error', this._onImgErrorHandler, EventPassiveDefault.optionPrepare())
        this.img.src = src.url //go!
        this._imgLoader(1)
    }

    _onImgLoad(e)
    {
        this.isloaded = (this.img.src !== this._loader_failed() && this.img.src !== this._trans_image())
        if (this.isloaded)
        {
            this._onImgDone(e)
            if (!this.iszoom) { this._onResized() }
        }
    }

    _onImgError(e)
    {
        this._imgFailed()
        this._onImgDone(e)
    }

    _onImgDone(e)
    {
        this.img.removeEventListener('load', this._onImgLoadHandler)
        this.img.removeEventListener('error', this._onImgErrorHandler)
        if (this._imgLoadingTimeoutDebouncer) { this._imgLoadingTimeoutDebouncer.cancel() }

        this._blank_handle(0)
        this._imgLoader(0)
        this._stopObserving()

        var tl = this._now() - this._startloadTime
        if (this.isloaded) 
        {
            this._startImage3dLoad(this.src)
        }
    }

    _blank_handle(start)
    {
        if (start)
        {
            if (this.placeholderImg) { this.setBackgroundImage(this.placeholderImg) }

            this._isblank = true
            this.img.style.transition = ''
            this.img.style.opacity = '0'
            this.setBackgroundImage('')
        }
        else //stop
        {
            if (this._isblank)
            {
                this.img.style.transition = '0.5s opacity'
                this.img.style.opacity = '1'
                this._isblank = false
            }
        }
    }

    _imgLoader(show)
    {
        if (this.placeholderImg !== undefined) { return }

        this.loader.style.backgroundImage = show ? "url('" + this._loader_anim() + "')" : ''
    }

    _imgFailed()
    {
        if (this.placeholderImg || !this.img.src) { return }

        this.img.src = this._loader_failed()
        this.img.style.backgroundImage = ''
    }




    _startImage3dLoad(src)
    {
        if (!src || !src.url3d) { return }
        this.setBackgroundImage('')
        this._startloadTime3d = this._now()
        this._cancelImage3dLoad()
        this._sprite = document.createElement('img')
        this._sprite.addEventListener('load', this._onSpriteLoadHandler, EventPassiveDefault.optionPrepare())
        this._sprite.addEventListener('error', this._onSpriteErrorHandler, EventPassiveDefault.optionPrepare())
        this._sprite._tries = 3
        this._sprite.src = src.url3d //go!
    }

    _cancelImage3dLoad()
    {
        if (this._sprite)
        {
            this._sprite.removeEventListener('load', this._onSpriteLoadHandler)
            this._sprite.removeEventListener('error', this._onSpriteErrorHandler)
            this._sprite.src = ' '
            delete this._sprite
            this._sprite = null
        }

        if (this._3dreloadDebouncer)
        {
            this._3dreloadDebouncer.cancel()
            this._3dreloadDebouncer = null
        }

        this._cancel3DTransition()
    }

    _onSpriteLoad(e)
    {
        this.setBackgroundImage(this._sprite.src) //cached image - it may load twice with disabled cache
        this._cancel3DTransition()
        this._schedule3DTransition()
    }

    _schedule3DTransition() 
    {
        var switchTo3Handler = () => {
            this.img.src = this._trans_image()
            this.is3dLoaded = true
            this._switchSprite(true) //turn 3d image by single img point of view
            this._onSpriteDone()
        }
        this._3dswitchAnimFrame = Debouncer.debounce(this._3dswitchAnimFrame, timeOut.after(150), switchTo3Handler)
    }

    _cancel3DTransition() 
    {
        if (this._3dswitchAnimFrame) 
        {
            this._3dswitchAnimFrame.cancel()
            this._3dswitchAnimFrame = null
        } 
    }

    _onSpriteError(e)
    {
        if (this._sprite && this._sprite._tries) { this._sprite._tries -= 1 }
        if(this._sprite){
            if (this._sprite._tries > 0)
            {
                this._3dreloadDebouncer = Debouncer.debounce(this._3dreloadDebouncer, timeOut.after(1200), () =>
                {
                    if (this._sprite && this.src)
                    {
                        this._sprite.src = this.src.src3d //retry!
                    }
                })
            }
            else
            {

                this.is3dError = true // hide 3d
                this._onSpriteDone()
            }
        }
    }

    _onSpriteDone()
    {
        this._cancelImage3dLoad()
        var tl = this._now() - this._startloadTime3d
    }

    _switchSprite(force?)
    {
        if (force !== true && this._pvUpdated == this.pv) { return }
        this._pvUpdated = this.pv
        var y = this.pv * 6.666666666666667
        //no-repeat is required for proper functioning on Android
        this.img.style.backgroundPosition = "0px " + y + "%"
    }

    _ontrack(e)
    {
        // console.log(e.detail)
        var st = e.detail.state
        var dx = e.detail.dx
        var dy = e.detail.dy
        var r = this._imgRect
        var pv = this.pv
        if (!Number.isInteger(pv)) { pv = 0 }
        var hndlRotate = (t) => 
        {
            if (t == 'trackstart') 
            {
                this._trackStart = this._now()
                this._pv = pv
                this._pvK = 1 / r.width / Math.PI * this.pvs / 0.33

                // var x = e.detail.x + window.scrollX - r.left
                // var y = e.detail.y + window.scrollY - r.top
                // var hw = r.width / 2
                // var xp = (x - hw)
            }
            else if (t == 'trackend' && !this.iszoom)
            {
                this.img.style.transform = 'none'
            }
        }


        this.is3dWarn = !this.is3dLoaded
        this._pvWarnDebouncer = Debouncer.debounce(this._pvWarnDebouncer, timeOut.after(2000), () => 
        {
            this.is3dWarn = false
            hndlRotate('trackend')
        })

        if (!this.is3dLoaded && this.is3d) 
        {
            //////// ROTATION 3d simulation 2d -------
            if (st === "start")
            {
                hndlRotate('trackstart')
            }
            else if (st === "track")
            {
				var sx = Math.log(1 + Math.abs(dx / r.width)) * 15
                if (dx < 0) { sx = -sx }
                if (Teamatical.BuildEnv == 'Developmet') { console.log(sx) }
                this.img.style.transform = 'rotate3d(0, 1, 0, ' + (sx) + 'deg)'
				this.style.perspective = '800px'
            }
            else if (st === "end")
            {
                hndlRotate('trackend')
            }
        }

        if (this.is3dLoaded && this.iszoom && st === "track")
        {
            this._zoomReset('mousemove', e)
        }


        
        ////////////////////////////////////////////////////////
        if (!this.is3dLoaded || this.iszoom) { return } ///EXIT
        ////////////////////////////////////////////////////////

        if (this.img.style.transform != 'none') { this.img.style.transform = 'none' } //reset rotation

        //////// ROTATION 3d -------
        if (st === "start")
        {
            this._zoomReset('trackstart')
            hndlRotate('trackstart')
        }
        else if (st === "track")
        {
            pv = this._pv + Math.floor(dx * this._pvK)
            if (pv >= this.pvs)
            {
                pv = pv - Math.floor(pv / this.pvs) * this.pvs
            }
            if (pv < 0) 
            {
                pv = pv - Math.floor(pv / this.pvs) * this.pvs
            }
            this.pv = pv
            this._pv_was_changed = true
            
            this._switchSprite()
        }
        else if (st === "end")
        {
            this._trackStart = 0
            this._zoomReset('trackend')
        }
    }



    _trans_dot()
    {
        return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
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

    // _trans_image_z7()
    // {
    //     return "data:image/png;base64," +
    //         "iVBORw0KGgoAAAANSUhEUgAAAqAAAAOAAQAAAADNnPzqAAAABGdBTUEAALGPC/xhBQAAAAJ0Uk5TAAB2k804AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfhBxgGMg44BMQjAAAAYUlEQVR42u3BMQEAAADCoPVPbQZ/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA1wApjwABAyMqlQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxNy0wNy0yNFQwNjo1MDoxNC0wNDowMOX/FdwAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTctMDctMjRUMDY6NTA6MTQtMDQ6MDCUoq1gAAAAAElFTkSuQmCC"
    // }

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
        return 'data:image/svg+xml,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" preserveAspectRatio="xMidYMid meet">
                <g transform="translate(12,15) scale(0.1) translate(-12,-15)">
                    <rect x="3" y="5.77283" width="4" height="18.4543" opacity="0.2" fill="#333">
                        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
                    </rect>
                    <rect x="10" y="6.72717" width="4" height="16.5457" opacity="0.2" fill="#333">
                        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
                    </rect>
                    <rect x="17" y="9.22717" width="4" height="11.5457" opacity="0.2" fill="#333">
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
        var el = this
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
            const entity = entries[i]
            if (entity.isIntersecting && entity.target instanceof UIImage3D)
            {
                entries[i].target.lazyLoadIfAny()
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
            var options: any = {
                root: el,
                rootMargin: this.lazyMargin,
                threshold: this.lazyThreshold
            }
            // See if there is already an observer created for the
            // intersection options given. Note we perform a double
            // lookup (map within a map) because the actual map key
            // is a different instance and there is no hashing
            var observersMap = elementObservers.get(node)
            if (!observersMap)
            {
                observersMap = new Map()
                elementObservers.set(node, observersMap)
            }
            var key = options.rootMargin + '/' + options.threshold
            observer = observersMap.get(key)
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
