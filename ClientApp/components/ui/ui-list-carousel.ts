import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-image'
import '../ui/ui-list-item'
import '../shared-styles/common-styles'
import view from './ui-list-carousel.ts.html'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import style from './ui-list-carousel.ts.css'
import { StringUtil } from '../utils/StringUtil'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UICarouselBase = mixinBehaviors([IronResizableBehavior], UIBase) as new () => UIBase & IronResizableBehavior
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys


@CustomElement
export class UIListCarousel extends UICarouselBase
{
    static get is() { return 'teamatical-ui-list-carousel' }
    
    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            title: { type: String },
            items: { type: Array, notify: true, observer: '_itemsListChanged' },
            imageRatio: { type: Number, value: 0 },
            imageHeight: { type: Number, value: 0 },
            visible: { type: Boolean, observer: '_visibleChanged' },
            smallScreen: { type: Boolean },
            // noArrows: { type: Boolean, value: false, reflectToAttribute: true },
            // tabindex: { type: Number, reflectToAttribute: true  },
            // disabled: { type: Boolean, value: false, reflectToAttribute: true },
            focused: { type: Boolean, value: false, reflectToAttribute: true },            

            virtualShow: { type: Boolean, value: false },
            selectedProduct: { type: Number, notify: true, observer: '_selectedProductChanged' },
            _selectedIndex: { type: Number, },
            averageImgLoadTime: { type: Number, value: 100 },
            _virtualIndex: { type: Number, value: 0 },
            _trackWidth: { type: Number, value: 0 },
            _elementWidth: { type: Number, value: 0 },
            _paneWidth: { type: Number, value: 0 },
            _trackStart: { type: Number, value: 0 },
            _imgLoadStart: { type: Number, value: 0 },
            _avgLoadTimeSum: { type: Number, value: 0 },
            _loadCompleteCount: { type: Number, value: 0 },

            _isFirst: { type: Boolean, value: true },
            _isVisible: { type: Boolean, },
            _touchStart: { type: Object },

            activeScroll: { type: Boolean },
            // allowFocus: { type: Boolean, value: true },


            disabledImageBefore: { type: Boolean, computed: '_compute_disabledImageBefore(_selectedIndex)' },
            disabledImageNext: { type: Boolean, computed: '_compute_disabledImageNext(_paneWidth, _selectedIndex)' },
        }
    }

    static get observers()
    {
        return [
            '_itemsChanged(items.splices)',
            // '_log(focused)',
        ]
    }

    _log(v) { console.log(v) }

    get track() { return this.$['track'] as HTMLElement }
    get slides() { return this.$['slides'] as HTMLElement }
    get scrollTick() { return this.$['scroll-tick'] as HTMLElement }
    get checkmarkVirtual() { return this.$['checkmark-virtual'] as HTMLElement }

    _isVisible: any
    _isFirst: any
    _observerImgs: any
    _touchStart: any
    _selectedIndex: any
    _lastitemslen: any
    _avgLoadTimeSum: any
    _loadCompleteCount: any 
    _imgLoadStart: any
    _elementWidth: any
    _paneWidth: number
    _onResizeDebouncer: any
    _updateListDebouncer: any
    _virtualIndex: any 
    _trackWidth: any
    _trackStart: any
    _trackState: any
    _mouseWheelDebouncer: any
    _wheelDelta: any
    maxi: any
    debugLabel: any
    items: any
    averageImgLoadTime: any 
    selectedProduct: any
    virtualShow: any
    visible: any
    imageHeight: any
    imageRatio: any
    smallScreen: any
    activeScroll: boolean
    // allowFocus: boolean
    // _tabindexLast: number
    // tabindex: number
    focused: boolean


    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener('iron-resize', (e) => this._onResized(e))
        this.addEventListener('transitionend', (e) => this._onTransitionEnd(e), EventPassiveDefault.optionPrepare())
        this.slides.addEventListener("transitionend", (e) => this._slidesTransEnd(e), EventPassiveDefault.optionPrepare())
        
        this.setScrollDirection("y", this.track)
        this.track.style.width = "100%"
        this._isVisible = false

        this._observerImgs = new FlattenedNodesObserver(this.slides, (info: any) =>
        {
            this._onResized()
        })

        this.slides.addEventListener('wheel', (e) => this._onslidesByWheel(e), EventPassiveDefault.optionPrepare())
        this.slides.addEventListener('dom-change', (e) =>
        {
            this.async(() =>
            {
                this._onResized(e)
            })
        })

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
        
        this._selectedIndex = 0
    }

    reset()
    {
        this._selectedIndex = 0
    }

    _btnsDelta = 0
    _btnsDebouncer: Debouncer | null
    _btnsMove(dir)
    {
        var delta = this._elementWidth * 3
        var te = { state: 'track', dx: 0, dy: 0, state_src: 'buttons' }
        if (!this._btnsDebouncer)
        {
            te.state = 'start'
            this._btnsDelta = 0
            this._ontrack({ detail: te }) //handle event
            te.state = 'track'
        }
        this._btnsDebouncer = Debouncer.debounce(this._btnsDebouncer, timeOut.after(250), () => 
        {
            te.state = 'end'
            te.dx = this._btnsDelta
            this._ontrack({ detail: te }) //handle event
            this._btnsDebouncer?.cancel()
        })
        this._btnsDelta = delta * dir
        te.dx = this._btnsDelta
        this._ontrack({ detail: te }) //handle event
    }

    onImageBefore(e)
    {
        this._btnsMove(1)
    }

    onImageNext(e)
    {
        this._btnsMove(-1)
    }

    _compute_disabledImageBefore(selectedIndex)
    {
        return (selectedIndex <= 0)
    }
    
    _compute_disabledImageNext(paneWidth, selectedIndex)
    {
        return (this._getTrackWidth(false) + this._elementWidth * selectedIndex) >= Math.floor(paneWidth)
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

    _getItemHref(item)
    {
        // By returning null when `itemId` is undefined, the href attribute won't be set and
        // the link will be disabled.
        return item.name ? this._hrefDetail(item.name, 'recently-viewed', { s: item.CustomizationState }) : null
    }

    _visibleChanged()
    {
        //reset view 
        this._selectItemByIndex(0)
    }

    _itemsListChanged(items)
    {
        if (Array.isArray(items))
        {
            for (var k = 0; k < this.items.length; k++)
            {
                if (items[k].Selected)
                {
                    this._selectedIndex = k
                }
            }
            
            // if (this._lastitemslen != this.items.length)
            // {
            this._onResized()
            // }
            this._lastitemslen = this.items.length
        }
     
        this._updateListDebouncer = Debouncer.debounce(this._updateListDebouncer, timeOut.after(1400), () => { 
            this.slides.classList.toggle("animate", true)
            this.scrollTick.classList.toggle("animate", true)
        })
    }

    _imgOnLoad(e)
    {
        this._avgLoadTimeSum += this._now() - this._imgLoadStart
        this._loadCompleteCount++
        if (this._loadCompleteCount == this.items.length)
        {
            this.averageImgLoadTime = this._avgLoadTimeSum / this._loadCompleteCount
        }
    }

    _selectedProductChanged(val)
    {
        this._selectItemByIndex(val) // >>> this._selectedIndex
    }

    _itemsChanged(cr)
    {
        if (this.items)
        {
            this.virtualShow = false
        }

        this._imgLoadStart = this._now()
        this._avgLoadTimeSum = 0
        this._loadCompleteCount = 0
        // this._onResized()
    }

    _onTransitionEnd(e)
    {
        this._onResized()
    }

    _onResized(e?)
    {
        if (!this.visible) { return }

        var handle = () => 
        {
            var wh = window.innerHeight
            var imageHeight = this.smallScreen ? this.imageHeight * 0.85 : this.imageHeight
            var maxPanelHeight = Math.floor(Math.min(imageHeight / 0.92, wh * 1))
            this.track.style.height = maxPanelHeight + "px"
            var elementWidth = maxPanelHeight * 0.92 * this.imageRatio
            
            this.updateStyles({ 
                "--panel-width": elementWidth + "px", 
                "--label-font-size": Math.max(Math.round(maxPanelHeight / 25), 14) + "px",
            })
            // console.log(elementWidth, Math.max(Math.round(maxPanelHeight / 25), 14))

            var li = this.slides.querySelectorAll('li.panel')
            if (li.length > 1)
            {
                var w = li[1].getBoundingClientRect().right - li[0].getBoundingClientRect().right
                this._elementWidth = w
            }
            else
            {
                this._elementWidth = elementWidth
            }
            if (this._elementWidth == 0)
            {
                this._elementWidth = elementWidth
                this.async(this.notifyResize, 17)
            }

            let twidth = this._getTrackWidth(true)
            // this.maxi = Math.floor(twidth / this._elementWidth)
            this.maxi = (twidth - 20 * 2) / this._elementWidth // gap is shadow width 
            if (Array.isArray(this.items))
            {
                this._paneWidth = this.items.length * this._elementWidth
            }

            this._selectItemByIndex(this._selectedIndex)
        }

        this._onResizeDebouncer = Debouncer.debounce(this._onResizeDebouncer, timeOut.after(17), handle)
    }

    _selectItemByIndex(i)
    {
        let maxi = this.maxi
        if (this.items) { maxi = Math.min(this.items.length, this.items.length - this.maxi) }
        let ii = Math.max(-0.5, Math.min(i, maxi))
        if (ii < 0) { ii = 0 }

        // if (this.items && this.items.length > 0)
        // {
        //     if (i > this.items.length - 1) { i = this.items.length - 1 }
        //     for (var k = 0; k < this.items.length; k++)
        //     {
        //         var v = (k == i)
        //         if (this.items[k].Selected != v && !(this.items[k].Selected == null && !v))
        //         {
        //             this.items[k].Selected = v
        //             this.notifyPath('items.' + k + '.Selected')
        //             // console.log('items!!! ' + k + ' = ' + v)
        //         }
        //     }
        // }
        ii = Number(ii)

        // console.log(i, '=>', ii)

        this._selectedIndex = ii
        this._virtualIndex = ii
        this._showproduct(ii)
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
        // console.log('_showproduct', i)
        var width = this._getTrackWidth(false)
        // var tx = Math.round(width / 2 - this._elementWidth / 2 - i * this._elementWidth)
        var tx = 20 - Math.round(i * this._elementWidth)
        if (!Number.isNaN(tx) && width > 0)
        {
            this.slides.style.transform = `translate(${tx}px,0)`
        }

        var stw = width * width / this._paneWidth
        if (!isFinite(stw) || stw < 1) { stw = 1 }
        var stx = width * ((i * this._elementWidth) / this._paneWidth)
        if (!isFinite(stx)) { stx = 0 }
        this.scrollTick.style.width = `${stw}px`
        this.scrollTick.style.transform = "translate(" + stx + "px,0)"
    }

    _slidesTransEnd(e)
    {
        // this.selectedProduct = this._selectedIndex
        this._isFirst = false
        this.slides.style.transitionDuration = ""
        this.scrollTick.style.transitionDuration = ""
        this.activeScroll = false
    }

    _onAnchorMouse(e)
    {
        // console.log(e.type, this._trackState, e)
        // if (e.type == 'click' && e.target) { e.target.blur() }
        if (e.type == 'click' && this._trackState !== 'track') { return }

        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
    }

    _ontap(e)
    {
        this.slides.classList.toggle("animate", true)
        this.scrollTick.classList.toggle("animate", true)
        
        for (var i = 0; i < this.items.length; i++)
        {
            var oi = this.items[i]
            if (oi == e.model.item)
            {
                if (this._selectedIndex != i) { this.virtualShow = true }

                this._selectItemByIndex(this._selectedIndex) // >>> this._selectedIndex

                this.selectedProduct = this._selectedIndex
                break
            }
        }
    }

    _onslidesByWheel(e)
    {
        // console.log(e)
        var epath = e.path || e.composedPath()
        if (epath.filter(i => { return i == this.slides}).length <= 0) { return }
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
        var calcVirtualIndex = (dd) => {
            this._virtualIndex = this._selectedIndex - dd / this._elementWidth
            if (e.detail.state_src == 'wheel')
            {
                if (this._virtualIndex < -0.5) { this._virtualIndex = -0.5 }
                if (this._virtualIndex > (this.items.length - this.maxi + 0.5)) { this._virtualIndex = (this.items.length - this.maxi + 0.5) }
            }
            else
            {
                if (this._virtualIndex < -1 * this.maxi) { this._virtualIndex = -1 * this.maxi }
                if (this._virtualIndex > (this.items.length)) { this._virtualIndex = (this.items.length) }
            }
            // console.log('_virtualIndex: ' + this._virtualIndex)
            this._showproduct(this._virtualIndex)
        }
        let state = e.detail.state
        var swipeDistance = e.detail.dx
        // console.log(swipeDistance)
        var swipeHorzVert = Math.abs(e.detail.dx / e.detail.dy)
        // console.log(e.detail.dx, e.detail.dy)
        this._trackState = state

        if (state === "start")
        {
            this.slides.classList.toggle("animate", false)
            this.scrollTick.classList.toggle("animate", false)
            if (this._updateListDebouncer) { this._updateListDebouncer.cancel() }
            calcVirtualIndex(swipeDistance)
            this._trackStart = this._now()
            this.slides.style.transitionDuration = ""
            this.scrollTick.style.transitionDuration = ""
            this.activeScroll = true
            
            // this.allowFocus = false
            // this._tabindexLast = this.
            // this.set('tabindex', '-1')
            var uiitems = this.slides.querySelectorAll('teamatical-ui-list-item')
            for (let i in uiitems)
            {
                var ii = (uiitems[i] as HTMLElement)
                if (ii.blur) ii.blur()
                // console.log(uiitems[i])
            }
        }

        if (state === "track")
        {
            calcVirtualIndex(swipeDistance)
        }

        if (state === "end")
        {
            // this.allowFocus = true
            // this.set('tabindex', this._tabindexLast)

            this.slides.classList.toggle("animate", true)
            this.scrollTick.classList.toggle("animate", true)
            var si = this._selectedIndex
            // console.log('end track -> _selectedIndex: ' + i)
            if (Math.abs(swipeDistance) > this._elementWidth / 8 && swipeHorzVert > 2)
            {
                // console.log(i + " -> " + e.detail.dx)
                var swipeTime = this._now() - this._trackStart
                var swipeSpeed = swipeDistance / swipeTime * 2000
                var slidesScrolled = Math.round(Math.abs(swipeDistance / this._elementWidth))
                // add inertial distance
                var deceleration = 10000
                slidesScrolled = Math.abs(swipeDistance / this._elementWidth) + Math.abs(swipeSpeed * swipeSpeed / deceleration / 2 / this._elementWidth)
                // var s1 = slidesScrolled
                // slidesScrolled = Math.round(slidesScrolled > 0.1 & slidesScrolled <= 1.0 ? 1.0 : slidesScrolled)
                slidesScrolled = Math.round(slidesScrolled + 0.29)
                // console.log(s1 + ' -> ' + slidesScrolled)

                // var i1 = i
                if (swipeDistance < 0 && si < this.items.length - 1)
                {
                    si += slidesScrolled
                }
                if (swipeDistance > 0 && si > 0 && si > 0)
                {
                    si -= slidesScrolled
                }
                // var i2 = i
                let maxi = Math.min(this.items.length, this.items.length - this.maxi)
                si = Math.max(-0.5, Math.min(si, maxi))
                // var i3 = i
                // console.log(i1 + ', ' + i2 + ', ' + i3 + " ||| " + this._elementWidth + ' | ' + swipeDistance)
                
                let tnDur = Math.max(0.3, 0.3 + Math.abs(swipeSpeed / deceleration)) + "s"
                this.slides.style.transitionDuration = tnDur
                this.scrollTick.style.transitionDuration = tnDur

                // console.log(this.slides.style.transitionDuration, i)

                if (this._selectedIndex != si) { this.virtualShow = true }
            }
            this._selectItemByIndex(si) // >>> this._selectedIndex
        }
    }


    _onKeydown(e)
    {
        e = e || window.event;

        // console.log(e.key, this.visible, this.focused)
        if (!this.visible || !this.focused) { return }

        // var epath = e.path || e.composedPath()

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
            this._selectItemByIndex(i)
            this.selectedProduct = this._selectedIndex
        }
    }
}
