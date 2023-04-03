import '@polymer/paper-fab/paper-fab.js'
import '@polymer/iron-media-query/iron-media-query.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import view from './ui-button-scrollup.ts.html'
import style from './ui-button-scrollup.ts.css'
import { CustomElement } from '../utils/CommonUtils'
const Teamatical: TeamaticalGlobals = window['Teamatical']



@CustomElement
export class UIButtonScrollUp extends UIBase
{
    static get is() { return 'teamatical-ui-button-scrollup' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            target: { type: String, observer: '_targetChanged' },
            scrollTo: { type: String },
            scrollTarget: { type: Object, reflectToAttribute: true },
            hiddenAnimated: { type: Boolean, reflectToAttribute: true, value: true },
            hidden: { type: Boolean, reflectToAttribute: true, value: true },
            mini: { type: Object },
            targetOffset: { type: Number },
            currentPosition: { type: Number },
            showThreshold: { type: Number, value: 320 },
            showThresholdMini: { type: Number, value: 160 },
            animateTime: { type: Number, value: 900 },
            _animating: { type: Boolean, value: false },
            _routing: { type: Boolean, value: false },


            scrollPositionLast: { type: Number },
            scrollMode: { type: String, value: null },
            icon: { type: String, computed: '_computeIcon(scrollMode)' },
        }
    }

    static get observers()
    {
        return [
            '_hiddenAnimatedChanged(hiddenAnimated)',
        ]
    }

    _hiddenAnimatedDebouncer: any
    _target: any
    target: string
    // scrollTo: string
    hiddenAnimated: boolean
    hidden: boolean
    mini: any
    targetOffset: number
    currentPosition: number
    showThreshold: number
    showThresholdMini: number
    animateTime: number
    _animating: boolean
    _routing:boolean
    scrollPositionLast:number
    scrollMode:string
    icon:string
    _onScrollHandler: any
    scrollTarget: any

    constructor()
    {
        super()

        this._onScrollHandler = (e) => this._onScroll(e)
    }

    connectedCallback()
    {
        super.connectedCallback()

        this._targetChanged('')
        window.addEventListener('resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("popstate", (e) => this._onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
        // document.addEventListener('keydown', (e) => this._onKeydownEvent(e))

        if ("MutationObserver" in window) 
        {
            let observer = new MutationObserver(mutations => this._mutationsScrollContainer(mutations))
            let scrollElm = this._getScrollContainer()
            observer.observe(scrollElm, {
                attributes: true, 
                attributeFilter: [ "style" ],
                attributeOldValue: true,
                subtree: true
            })
        }
    }

    _mutationsScrollContainer(mutations)
    {
        for (let mutationi of mutations) 
        {
            switch(mutationi.type) 
            {
                case "attributes":
                    switch(mutationi.attributeName) 
                    {
                        case "style":
                            if ((mutationi.target as HTMLElement).style.overflowY == 'hidden')
                            {
                                this.hiddenAnimated = true                            
                            }
                            // console.log(mutationi.target, (mutationi.target as HTMLElement).style.overflowY)
                        break
                    }
                break
            }
        }
    }

    _getScrollContainer()
    {
        var target = this.scrollTarget || document.body
        return target as HTMLElement //|| HTMLBodyElement
    }

    _computeIcon(scrollMode)
    {
        var i = (scrollMode == 'up' || scrollMode === null) ? 'icons:arrow-upward' : 'icons:arrow-downward'
        // console.log(i)
        return i
    }

    _targetChanged(t, o?)
    {
        if (this._target)
        {
            this._target.removeEventListener('scroll', this._onScrollHandler)
        }

        // console.log(t instanceof HTMLElement, typeof (t) == 'string')
        if (t instanceof HTMLElement)
        {
            this._target = t
        }
        else if (typeof (t) == 'string')
        {
            if (t == 'document' || t == 'document.body' || t == 'window' || t == '') 
            {
                //
            }
            else
            {
                var el = null
                try
                {
                    el = document.querySelector(t)
                }
                catch
                {
                    //
                }

                if (el) { this._target = el }
            }
        }

        if (!this._target)
        {
            this._target = window //document.body
        }


        if (this._target)
        {
            // window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
            this._target.addEventListener('scroll', this._onScrollHandler, EventPassiveDefault.optionPrepare())
        }
        // console.log(e, '->', this._target)
    }

    _hiddenAnimatedChanged(hiddenAnimated)
    {
        this._hiddenAnimatedDebouncer = Debouncer.debounce(this._hiddenAnimatedDebouncer, timeOut.after(300), () =>
        {
            this.hidden = hiddenAnimated
        })
    }

    _onHistoryPopstate(e)
    {
        // console.log(e)
        this._routing = true
        this.hiddenAnimated = true
        this.scrollPositionLast = undefined
        this.scrollMode = null
    }

    _onResized(e)
    {
        this.scrollPositionLast = undefined
        this.scrollMode = null
        this._handleScroll()
    }

    _onScroll(e)
    {
        // console.log('_onScroll', e)
        if (this._routing == true) 
        {
            this._routing = false
            return
        }
        this._handleScroll()
    }

    _getScrollTop()
    {
        if (!this._target) { return 0 }

        if (this._target === window)
        {
            return super._getScrollTop()
        }

        return this._target.scrollTop
    }

    _handleScroll()
    {
        var st = this._getScrollTop()
        // console.log('_getScrollTop', st)
        if (!this._animating)
        {
            var th = (this.mini ? this.showThresholdMini : this.showThreshold)
            if ((this.scrollMode == 'up' || this.scrollMode === null))
            {
                this.hiddenAnimated = !(st >= th)
            }
            else if (this.scrollMode == 'down')
            {
                this.hiddenAnimated = !(true)

                if (st >= th)
                {
                    this.set('scrollMode', 'up')
                }
            }
        }
    }

    _onScrollTap(e?)
    {
        // console.log('_onScrollTap', e)
        if ((this.scrollMode == 'up' || this.scrollMode === null))
        {
            this.scrollPositionLast = this._getScrollTop()
            this.scrollIt(0, 300, 'easeInOutQuad', 
            (callback) => 
            {
                this.set('scrollMode', 'down')
            },
            (anim) => 
            {
                this._animating = anim
            }, 
            this._target)
        }
        else
        {
            if (this.scrollPositionLast === undefined)
            {
                this.hiddenAnimated = true
            }
            else
            {
                // console.log('todo: go back: ' + this.scrollPositionLast)
                // scrollIt(destination, duration = 200, easing = 'linear', callback: any = null, animating: any = null)
                this.scrollIt(this.scrollPositionLast, 300, 'easeInOutQuad', 
                (callback) =>
                {
                    this.set('scrollMode', 'up')
                }, 
                (anim) => 
                { 
                    this._animating = anim 
                },
                this._target)
            }
        }
    }

    
    // _onKeydownEvent(e)
    // {
    //     var keycode
    //     // var pages = this.ui.pages
    //     var wevent: any = window.event
    //     if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

    //     // console.log(keycode)
    //     if (!Teamatical._browser.msie && this._animating)
    //     {
    //         if ((e.ctrlKey && !e.altKey && !e.shiftKey && (keycode == 33 || keycode == 34)))
    //         {
    //             this._onScrollTap()
                
    //             if (e.preventDefault)
    //             {
    //                 e.preventDefault()
    //                 e.stopPropagation()
    //             }
    //         }
    //     }
    // }
}
