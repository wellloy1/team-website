import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { ArraySelector } from '@polymer/polymer/lib/elements/array-selector.js'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-image'
import '../shared-styles/common-styles'
import view from './ui-carousel.ts.html'
import style from './ui-carousel.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UICarouselBase = mixinBehaviors([IronResizableBehavior], UIBase) as new () => UIBase & IronResizableBehavior
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UICarousel extends UICarouselBase
{
    static get is() { return 'teamatical-ui-carousel' }
    
    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            title: { type: String },
            options: { type: Array, notify: true, observer: '_optionsListChanged' },
            imageRatio: { type: Number, value: 0 },
            imageHeight: { type: Number, value: 0 },
            isSwap: { type: Boolean, notify: true },
            visible: { type: Boolean, observer: '_visibleChanged'},
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
            focused: { type: Boolean, value: false, reflectToAttribute: true },

            counterHide: { type: Boolean, value: false, reflectToAttribute: true }, //counter-hide
            borderHide: { type: Boolean, value: false, reflectToAttribute: true }, //border-hide
            bracesHide: { type: Boolean, value: false, reflectToAttribute: true }, //braces-hide
            bracesHideOnblur: { type: Boolean, value: false, reflectToAttribute: true }, //braces-hide-onblur
            tracking: { type: Boolean, value: false, reflectToAttribute: true },
            

            virtualShow: { type: Boolean, value: false },
            selectedProduct: { type: Number, notify: true, observer: '_selectedProductChanged' },
            _selectedIndex: { type: Number, },
            averageImgLoadTime: { type: Number, value: 100 },
            _counterLabel: { type: String, computed: "_getCounterLabel(_selectedIndex, options.*)" },

            _virtualIndex: { type: Number, value: 0 },
            _trackWidth: { type: Number, value: 0 },
            _elementWidth: { type: Number, value: 0 },
            _trackStart: { type: Number, value: 0 },
            _imgLoadStart: { type: Number, value: 0 },
            _avgLoadTimeSum: { type: Number, value: 0 },
            _loadCompleteCount: { type: Number, value: 0 },

            _isFirst: { type: Boolean, value: true },
            _isVisible: { type: Boolean, },
            _touchStart: { type: Object }
        }
    }

    static get observers()
    {
        return [
            '_optionsChanged(options.splices)',
        ]
    }

    get track() { return this.$['track'] as HTMLElement }
    get slides() { return this.$['slides'] as HTMLElement }
    get selector() { return this.$['selector'] as ArraySelector }
    get checkmarkVirtual() { return this.$['checkmark-virtual'] as HTMLElement }

    _isVisible: any
    _observerImgs: any
    _touchStart: any
    _selectedIndex: any
    _lastoptionslen: any
    _avgLoadTimeSum: any
    _loadCompleteCount: any 
    _imgLoadStart: any
    _elementWidth: any
    _onResizeDebouncer: any
    _updateListDebouncer: any
    _virtualIndex: any 
    _trackWidth: any
    _trackStart: any
    tracking: boolean
    _mouseWheelDebouncer: any
    _wheelDelta: any
    debugLabel: any
    _isFirst: boolean
    isSwap: any
    options: any
    averageImgLoadTime: any 
    selectedProduct: any
    virtualShow: any
    visible: any
    imageHeight: any
    imageRatio: any
    focused: boolean



    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener('focus', (e) => this._onFocus(e))
        this.addEventListener('blur', (e) => this._onBlur(e))
        this.addEventListener('iron-resize', (e) => this._onResized(e))
        this.slides.addEventListener("transitionend", (e) => this._transEnd(e), EventPassiveDefault.optionPrepare())
        this.slides.addEventListener('wheel', (e) => this._onslidesByWheel(e), EventPassiveDefault.optionPrepare())
        this.slides.addEventListener('dom-change', (e) =>
        {
            this._onResized()
        })
        this._observerImgs = new FlattenedNodesObserver(this.slides, (info: any) =>
        {
            // this._onResized()
        })
        
        this.setScrollDirection("y", this.track)
        this.track.style.width = "100%"
        this._isVisible = false

        if (!this.isTouchActionSupported()) 
        {
            this.addEventListener("touchstart", (e) => this.onTouchStart(e))
            this.addEventListener("touchmove", (e) => this.onTouchMove(e))
            this._touchStart = { x: 0, y: 0 }
        }

        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    ready()
    {
        super.ready()
    }

    reset()
    {
        //new product
        this.isSwap = false
    }

    _onFocus(e)
    {
        this.focused = true
    }

    _onBlur(e)
    {
        this.focused = false
    }

    onTouchStart(e) 
    {
        try 
        {
            this._touchStart.x = e.pageX
            this._touchStart.y = e.pageY
        } 
        catch (ex) { }
    }

    onTouchMove(e) 
    {
        try 
        {
            let dx = Math.abs(e.pageX - this._touchStart.x)
            let dy = Math.abs(e.pageY - this._touchStart.y)
            if (dy < dx) 
            {
                e.preventDefault()
            }
        } 
        catch (ex) { }
    }

    lazyLoad(vis)
    {
        // console.log('vis! ' + vis)
        this._isVisible = vis
    }

    _imageUrl(item_ImageUrl, item_ImageUrlSwap, isSwap)
    {
        return (isSwap ? item_ImageUrlSwap : item_ImageUrl)
    }

    _visibleChanged()
    {
        // console.log(arguments)
    }

    _optionsListChanged(options)
    {
        // console.log(this.title, this.classList)
        // if (this.title == 'sides_list') { console.log(options) }
        
        if (options && options.length > 0)
        {
            for (var k = 0; k < this.options.length; k++)
            {
                if (options[k].Selected)
                {
                    this._selectedIndex = k
                    this.selector.select(options[k])
                }
            }

            if (this._lastoptionslen != this.options.length)
            {
                this._onResized()
            }
            this._lastoptionslen = this.options.length
        }
     
        this._updateListDebouncer = Debouncer.debounce(this._updateListDebouncer, timeOut.after(1400), () => { 
            this.slides.classList.toggle("animate", true)
        })
    }

    _imgOnLoad(e)
    {
        this._avgLoadTimeSum += this._now() - this._imgLoadStart
        this._loadCompleteCount++
        if (this._loadCompleteCount == this.options.length)
        {
            this.averageImgLoadTime = this._avgLoadTimeSum / this._loadCompleteCount
        }
    }

    _selectedProductChanged(val)
    {
        this._selectItemByIndex(val)
    }

    _optionsChanged(cr)
    {
        if (this.options && this.selectedProduct >= 0 && this.selectedProduct < this.options.length)
        {
            this._virtualIndex = this.selectedProduct
            this.selector.select(this.options[this.selectedProduct])
            this.virtualShow = false
        }

        this._imgLoadStart = this._now()
        this._avgLoadTimeSum = 0
        this._loadCompleteCount = 0
    }

    handleResize()
    {
        // if (this.title == 'sides_list') { console.log('_onResized - handle') }

        var wh = window.innerHeight
        var tcr = this.track.getBoundingClientRect()
        
        // console.log('handleResize', this.title, tcr.width)
        var maxPanelHeight = Math.floor(Math.min(this.imageHeight / 0.92, wh * 1))

        if (tcr && tcr.width == 0 && (!Teamatical._browser.msie || Teamatical._browser.version > 18)) 
        { 
            tcr.width = window.innerWidth
            maxPanelHeight = 417
        }

        this.track.style.height = maxPanelHeight + "px"

        var elementWidth = maxPanelHeight * 0.92 * this.imageRatio
        var checkmarkW = Math.max(maxPanelHeight * this.imageRatio / 13.5, 12)
        var checkmarkGap = 12 //this._elementWidth * 0.05
        // console.log('checkmarkW', checkmarkW)
        this.updateStyles({
            "--panel-width": elementWidth + "px",
            "--label-font-size": Math.max(Math.round(maxPanelHeight / 25), 14) + "px",
            "--ui-carousel-checkmark-width": checkmarkW + "px",
            "--ui-carousel-checkmark-gap": checkmarkGap + "px",
            "--ui-carousel-checkmark-top": "13px",
            "--ui-carousel-checkmark-frame-left": (tcr.width / 2 - this._elementWidth / 2 - 1) + "px",
            "--ui-carousel-checkmark-frame-width": elementWidth + "px",
        })
        // console.log({
        //     "--panel-width": elementWidth + "px",
        //     "--label-font-size": Math.max(Math.round(maxPanelHeight / 25), 14) + "px",
        //     "--ui-carousel-checkmark-width": checkmarkW + "px",
        //     "--ui-carousel-checkmark-gap": checkmarkGap + "px",
        //     "--ui-carousel-checkmark-top": "13px",
        //     "--ui-carousel-checkmark-frame-left": (tcr.width / 2 - this._elementWidth / 2 - 1) + "px",
        //     "--ui-carousel-checkmark-frame-width": elementWidth + "px",
        // })

        var li = this.slides.querySelectorAll('li.panel')
        if (li.length > 1)
        {
            var w = li[1].getBoundingClientRect().right - li[0].getBoundingClientRect().right
            //console.log(w)
            this._elementWidth = w
        }
        else
        {
            this._elementWidth = elementWidth
        }

        if (this._elementWidth == 0)
        {
            // console.log('something goes wrong...')
            this._elementWidth = elementWidth
            this.async(this.notifyResize, 17)
        }

        // var tcr = this.track.getBoundingClientRect()
        this.checkmarkVirtual.style.left = (tcr.width / 2 + this._elementWidth / 2 - this._elementWidth * 0.05 - 23) + "px"
        this.updateStyles({
            "--ui-carousel-checkmark-frame-left": (tcr.width / 2 - this._elementWidth / 2 - 1) + "px",
        })

        this._getTrackWidth(true)
        this._showproduct(this._selectedIndex)
    }

    _onResized(e?)
    {
        if (!this.visible) { return }

        // if (this.title == 'sides_list') { console.log('_onResized') }
        var t = 1
        if (e && e.type == 'iron-resize') { t = 17 * 10 }
        this._onResizeDebouncer = Debouncer.debounce(this._onResizeDebouncer, timeOut.after(t), this.handleResize.bind(this))
    }

    _selectItemByIndex(i, virtual = false)
    {
        // console.log(i)
        if (i < 0) { i = 0 }
        if (this.options.length > 0)
        {
            if (i > this.options.length - 1) { i = this.options.length - 1 }
            this.selector.select(this.options[i])
            if (virtual && i != this._virtualIndex) { this.virtualShow = true }

            for (var k = 0; k < this.options.length; k++)
            {
                var v = (k == i)
                if (this.options[k].Selected != v && !(this.options[k].Selected == null && !v))
                {
                    this.options[k].Selected = v
                    this.notifyPath('options.' + k + '.Selected')
                    // console.log('options!!! ' + k + ' = ' + v)
                }
            }
        }
        i = Number(i)
        this._selectedIndex = i
        this._virtualIndex = i
        this._showproduct(i)
    }

    _panelClass(item)
    {
        var classes = "panel"
        if (!item) { return classes }

        //if (item.IsValid === false) { classes += " notvalid" }
        if (item.Selected === true) { classes += " selected" }

        // console.log('_panelClass ' + this.title + ' => ' + classes)

        return classes
    }

    _getTrackWidth(recalc)
    {
        if (this._trackWidth > 0 && recalc !== true)
        {
            return this._trackWidth
        }
        var t = this.track
        this._trackWidth = t.offsetWidth
        this.debugLabel = this._trackWidth
        var h = t.offsetHeight
        return this._trackWidth
    }

    _showproduct(i)
    {
        var width = this._getTrackWidth(false)
        var tx = Math.round(width / 2 - this._elementWidth / 2 - i * this._elementWidth)
        if (!Number.isNaN(tx) && width > 0)
        {
            this.slides.style.transform = "translate(" + tx + "px,0)"
        }
    }

    _getCounterLabel(_selectedIndex, options)
    {
        //console.log(_selectedIndex)
        if (_selectedIndex == undefined || !options) return ""
        //"customize-designoptionset-title": "{current} of {count}",
        var count = Array.isArray(this.options) ? this.options.length : 0
        return this.localize('customize-designoptionset-title', 'current', (Number(_selectedIndex) + 1), 'count', count)
    }

    _transEnd(e)
    {
        this.selectedProduct = this._selectedIndex
        this._isFirst = false
        this.slides.style.transitionDuration = ""
    }

    _ontap(e)
    {
        this.slides.classList.toggle("animate", true)
        
        for (var i = 0; i < this.options.length; i++)
        {
            var oi = this.options[i]
            if (oi == e.model.item)
            {
                // if (this._selectedIndex != i) { this.virtualShow = true }
                this._selectItemByIndex(i, true)
                this.selectedProduct = this._selectedIndex
                break
            }
        }
    }

    _onslidesByWheel(e)
    {
        // console.log(e)
        var epath = e.path || e.composedPath()
        if (epath.filter(i => { return i == this.slides }).length <= 0) { return }
        if (e.ctrlKey || !e.shiftKey) { return }

        
        var delta = (e.deltaX - e.deltaY)
        // console.log(delta)
        switch (e.deltaMode)
        {
            default:
            case 0: //pixel
                delta = delta / (2.17 * 96) * this._elementWidth
                break

            // case 1: //line
            //     console.log('line!!!!!!!!!!!!!')
            //     delta = delta * 96
            //     break

            // case 2: //page
            //     console.log('page!!!!!!!!!!!!!')
            //     delta = delta * 96 * 7
            //     break
        }

        // console.log(delta)
        // if (Math.abs(delta) > 96)
        {
            var te = { state: 'track', dx: 0, dy: 0, state_src: 'wheel' }
            if (!this._mouseWheelDebouncer)
            {
                te.state = 'start'
                this._wheelDelta = 0
                this._ontrack({ detail: te }) //handle event
                te.state = 'track'
            }
            this._mouseWheelDebouncer = Debouncer.debounce(this._mouseWheelDebouncer, timeOut.after(250), () => 
            {
                te.state = 'end'
                te.dx = this._wheelDelta
                this._ontrack({ detail: te }) //handle event
                this._mouseWheelDebouncer = null
            })
            this._wheelDelta += delta
            // if (Math.sign(this._wheelDelta) != Math.sign(delta)) { this._wheelDelta -= delta }
            te.dx = this._wheelDelta
            this._ontrack({ detail: te }) //handle event
        }

        // e.preventDefault()
        e.stopPropagation()
        return false
    }

    _ontrack(e)
    {
        // var width = this._getTrackWidth(false)
        var swipeDistance = e.detail.dx
        var swipeHorzVert = Math.abs(e.detail.dx / e.detail.dy)
        if (e.detail.state_src == 'wheel')
        {
            // swipeDistance
            var vinx = this._selectedIndex - swipeDistance / this._elementWidth
            // console.log(vinx, this._selectedIndex, this.options.length)
            if (vinx < -0.5) { vinx = -0.5}
            if (vinx > (this.options.length - 0.5)) { vinx = (this.options.length - 0.5) }
            swipeDistance = (this._selectedIndex - vinx) * this._elementWidth
        }

        if (e.detail.state === "start")
        {
            this.slides.classList.toggle("animate", false)
            if (this._updateListDebouncer) { this._updateListDebouncer.cancel() }
            
            this._virtualIndex = this._selectedIndex - swipeDistance / this._elementWidth
            this._showproduct(this._virtualIndex)
            this._trackStart = this._now()
            this.slides.style.transitionDuration = ""
            this.tracking = true


            //if (this._checkVisibilityDebouncer) { this._checkVisibilityDebouncer.cancel() }
        }

        if (e.detail.state === "track")
        {
            this._virtualIndex = this._selectedIndex - swipeDistance / this._elementWidth
            // console.log('_virtualIndex: ' + this._virtualIndex)
            this._showproduct(this._virtualIndex)
        }

        if (e.detail.state === "end")
        {
            this.tracking = false
            this.slides.classList.toggle("animate", true)
            var i = this._selectedIndex
            // console.log('end track -> _selectedIndex: ' + i)
            if (Math.abs(swipeDistance) > this._elementWidth / 8 && swipeHorzVert > 2)
            {
                // console.log(i + " -> " + swipeDistance)

                var swipeTime = this._now() - this._trackStart
                var swipeSpeed = swipeDistance / swipeTime * 1000
                var slidesScrolled = Math.round(Math.abs(swipeDistance / this._elementWidth))
                // add inertial distance
                var deceleration = 10000
                slidesScrolled = Math.abs(swipeDistance / this._elementWidth) + Math.abs(swipeSpeed * swipeSpeed / deceleration / 2 / this._elementWidth)
                // var s1 = slidesScrolled
                // slidesScrolled = Math.round(slidesScrolled > 0.1 & slidesScrolled <= 1.0 ? 1.0 : slidesScrolled)
                slidesScrolled = Math.round(slidesScrolled + 0.29)
                // console.log(s1 + ' -> ' + slidesScrolled)

                // var i1 = i
                if (swipeDistance < 0 && i < this.options.length - 1)
                {
                    i += slidesScrolled
                }
                if (swipeDistance > 0 && i > 0 && i > 0)
                {
                    i -= slidesScrolled
                }
                // var i2 = i
                i = Math.max(-0.5, Math.min(i, this.options.length))
                // var i3 = i
                // console.log(i1 + ', ' + i2 + ', ' + i3 + " ||| " + this._elementWidth + ' | ' + swipeDistance)
                this.slides.style.transitionDuration = Math.max(0.3, 0.3 + Math.abs(swipeSpeed / deceleration)) + "s"

                if (this._selectedIndex != i) { this.virtualShow = true }
            }
            this._selectItemByIndex(i)
        }
    }


    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible || !this.focused) { return }

        // var epath = e.path || e.composedPath()
        // console.log(e, epath)

        var i = this._selectedIndex
        if (keyboardEventMatchesKeys(e, 'left'))
        {
            i -= 1 
        }
        else if (keyboardEventMatchesKeys(e, 'right'))
        {
            i += 1 
        }

        if (this._selectedIndex != i)
        {
            this.slides.classList.toggle("animate", true)
            this._selectItemByIndex(i, true)
            this.selectedProduct = this._selectedIndex
        }
    }
}
