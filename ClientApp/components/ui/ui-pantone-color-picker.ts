import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { IronIconElement } from '@polymer/iron-icon/iron-icon.js';
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js'
import { CustomElement } from '../utils/CommonUtils'
import { Color } from '../utils/ColorUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { StringUtil } from '../utils/StringUtil'
// import lunr from '../utils/elasticlunr.js'
//declare const lunr: any
import { Matrix } from '../utils/TransformationMatrix'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-loader'
import '../ui/ui-color-picker'
import view from './ui-pantone-color-picker.ts.html'
import style from './ui-pantone-color-picker.ts.css'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const DOMURL = window.URL || window.webkitURL || window
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIPantoneColorPickerBase = mixinBehaviors([IronOverlayBehavior, IronResizableBehavior], UIBase) as new () => UIBase & IronOverlayBehavior & IronResizableBehavior
const recentColorsLength = 6


@CustomElement
export class UIPantoneColorPicker extends UIPantoneColorPickerBase
{
    static get is() { return 'teamatical-ui-pantone-color-picker' }

    static get template() { return html([`<style include="">${style}</style>${view}`])}

    static get properties()
    {
        return {
            selectedColor: { type: Object, notify: true },
            selectedSearchColor: { type: Object, notify: true },
            colorsPalette: { type: Array, observer: '_colorsPaletteChanged' },
            opened: { type: Boolean, notify: true, reflectToAttribute: true, },
            dataPop: { type: String, value: '', reflectToAttribute: true },
            tracking: { type: Boolean, notify: true, reflectToAttribute: true },

            localStorage: { type: Object, value: {} },
            recentColors: { type: Array, },
            visiblePages: { type: Number, value: 7 },
            swatchesPerPage: { type: Number, value: 7 },

            _hovered: { type: String },
            _quickSearch: { type: String, observer: '_onQuickSearch' },
            _qsindex: { type: Object },


            _pages: { type: Number, value: 1 },
            _animFrame: { type: Number, value: 0 },
            _activePage: { type: Number, value: 0 },
            _prevActivePage: { type: Number, value: 0 },
            _targetPage: { type: Number, value: 0 },
            _toRad: { type: Number, value: Math.PI / 180 },

            _clickRegions: { type: Array, value: [] },
            _checkBoxIB: { type: Object, value: null },
            _checkBoxIB_B: { type: Object, value: null },
            _checkBoxIB_Search: { type: Object, value: null },
            _checkBoxIB_Search_B: { type: Object, value: null },
            _pixelratio: { type: Number, },
            _mouseWheelDebouncer: { type: Object, value: null },
            _a: { type: Object, value: {} },
            _start_animateTime: { type: Number, value: 0 },
            _firstRender: { type: Boolean, value: true }
        }
    }

    static get observers()
    {
        return [
            '_prepare(colorsPalette, opened, selectedColor)',
            '_localStorageChanged(localStorage)',
            // '_log(colorsPalette)',
        ]
    }
    _log(v) { console.log(v) }

    _keydownSuppressDebounce: Debouncer
    _keydownSuppressOnOpen: boolean
    __time0: any 
    __time1: any 
    __time2s: any
    __time2f: any
    __time_slow: any
    __time_slow_t: any
    tracking: boolean
    _qsindex: any
    _qsindexFirst = true
    _isready: any
    _targetPage: any
    _activePage: any
    _openDebounce: any
    _suppressHistory: any
    _lastState: any
    _quickSearch_lock: any 
    _quickSearch: any
    _pages: any 
    _prepared: any 
    _checkBoxIB: any 
    _checkBoxIB_B: any
    _checkBoxIB_Search: any
    _checkBoxIB_Search_B: any
    _resizeDebounce: Debouncer
    _resizeEventDebounce: Debouncer 
    _resizeEventFirst = true
    _qsearchDebouncer: any
    _pixelratio: any
    _firstRender: any
    _clickRegions: any 
    _toRad: any 
    _mouseWheelDebouncer: any
    _targetAnimateTime: any
    _wheelDelta: any
    _animFrame: any
    _prevActivePage: any
    _start_animateTime: any
    _a: any
    swatchesPerPage: any
    colorsPalette: any
    selectedColor: any 
    selectedSearchColor: any
    visiblePages: any 
    _stopFocusSearchInput: boolean
    dataPop: any
    translite: any
    recentColors: any
    localStorage: any
    localStorageLock = false



    get header() { return this.$['header'] as HTMLDivElement}
    get container() { return this.$['container'] as HTMLDivElement }
    get canvas1() { return this.$['canvas1'] as HTMLCanvasElement }
    get searchInput() { return this.$['search'] as PaperInputElement }
    get checkmark() { return this.$['checkmark'] as IronIconElement }
    get checkmark_search() { return this.$['checkmark_search'] as IronIconElement }
    get _slow()
    {
        let v = this.__time2s > this.__time2f

        // console.log(this.__time_slow + ' ~> ' + this.__time2s + ' .. ' + this.__time2f + ' >>  ' + (this._now() - this.__time_slow_t))
        if (!this.__time_slow && v && (this._now() - this.__time_slow_t) > 3500) 
        {
            this.__time_slow = v
            this.__time_slow_t = this._now()
        }

        return this.__time_slow
    }


    constructor()
    {
        super()

        this.__time_slow = false
        this.__time_slow_t = this._now()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.async(this.notifyResize, 1)
        //this.setScrollDirection("none")
        //this.scrollAction = (Teamatical._browser.iPhone ? 'lock' : 'cancel')
        this.scrollAction = 'lock'

        if (this.shadowRoot) { Gestures.addListener(this.shadowRoot, 'track', this._ontrack.bind(this)) }
        this.addEventListener('touchstart', (e) => this._containerTap(e), EventPassiveDefault.optionPrepare())
        this.addEventListener('wheel', (e) => this._onMouseWheel(e), EventPassiveDefault.optionPrepare())
        this.addEventListener('iron-resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        this.addEventListener('iron-overlay-canceled', (e) => this._onCancel(e), EventPassiveDefault.optionPrepare())

        this.addEventListener('transitionend', (e) => this._onTransitionEnd(e), EventPassiveDefault.optionPrepare())

        document.addEventListener("keydown", (e) => this.onKeydown(e))
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())

        if (Teamatical._browser.chrome)
        {
            this.dataPop = 'anim'
        }
    }

    ready()
    {
        super.ready()
        this._isready = true

        if (window.history.state && window.history.state['color-picker'] == this.id)
        {
            this._openDebounce = Debouncer.debounce(this._openDebounce, microTask, () =>
            {
                this._lastState = window.history.state
                this._suppressHistory = true
                this.open()
                this._suppressHistory = false
            })
        }
    }

    open()
    {
        this.restoreFocusOnClose = true
        // console.log(this.id + ' > open')
        super.open()
    }

    close()
    {
        // console.log(this.id + ' > close')
        super.close()

        this._quickSearch_lock = true
        this._quickSearch = '' //clear search
        this._quickSearch_lock = false
    }

    quickSearchTap(e)
    {
        if (!window['Touch'] || !(e?.detail?.sourceEvent instanceof Touch) || e?.detail?.sourceEvent?.target != this.searchInput)  { return }

        this.searchInput.focus()
    }

    _onTransitionEnd(e)
    {
        if (!this.opened) { return }

        // if (this._dev) console.log(e)
        if (!this._stopFocusSearchInput && e.propertyName == "background-color" &&  e.elapsedTime == 0.01)
        {
            this.searchInput.focus()
        }
    }

    _onCancel(e)
    {
        // Don't restore focus when the overlay is closed after a mouse event
        if (e.detail instanceof MouseEvent)
        {
            this.restoreFocusOnClose = false
        }
    }

    _isNotConn(colorsPalette, opened)
    {
        return (colorsPalette !== undefined)
    }

    _colorsPaletteChanged(cplist, o)
    {
        // console.log(cplist)
        // this.async(() =>
        // {
        //     this._qsindex = this._createQSIndex(cplist, lunr)
        // }, 100)
    }

    _prepare(colorsPalette, opened, selectedColor)
    {
        if (!selectedColor || !colorsPalette || opened != true) { return }

        // if (this.id == 'colorPicker1') { console.log(this.id + ' -> cp:' + !(!colorsPalette) + ', sc:' + !(!selectedColor) + ', o: ' + opened) } 

        //prepeare
        try
        {
            var handler = () =>
            {
                this._pages = Math.ceil(this.colorsPalette.length / 7)
                this._onResized()

                if (this.selectedColor && this.selectedColor.i)
                {
                    this._onQuickSearchByID(this.selectedColor.i)
                }

                if (this.localStorage?.recentColors)
                {
                    this.set('recentColors', Object.assign([], this.localStorage?.recentColors))
                }
            }

            if (!this._prepared)
            {
                //checkmark assets
                var n: any = this.checkmark && this.checkmark.shadowRoot ? this.checkmark.shadowRoot.querySelector('svg') : null
                var data = new XMLSerializer().serializeToString(n)
                data = data.replace('<g', '<g style="fill:white"')
                data = data.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" width="24" height="24"')
                data = StringUtil.replaceAll(data, 'class="style-scope iron-icon"', '')
                data = data.replace('style="pointer-events: none; display: block; width: 100%; height: 100%;"', '')


                //checkmark-white
                var image = new Image()
                var svg = new Blob([data], { type: 'image/svg+xml' })
                var url = DOMURL.createObjectURL(svg)
                image.onload = (e) =>
                {
                    this._checkBoxIB = e.target || e.srcElement
                    DOMURL.revokeObjectURL(url)
                    this._resizeDebounce = Debouncer.debounce(this._resizeDebounce, microTask, handler)
                }
                image.src = url

                //checkmark-black
                data = data.replace('<g style="fill:white"', '<g style="fill:black"')
                image = new Image()
                svg = new Blob([data], { type: 'image/svg+xml' })
                url = DOMURL.createObjectURL(svg)
                image.onload = (e) =>
                {
                    this._checkBoxIB_B = e.target || e.srcElement
                    DOMURL.revokeObjectURL(url)
                    this._resizeDebounce = Debouncer.debounce(this._resizeDebounce, microTask, handler)
                }
                image.src = url


                //checkmark_search assets
                n = this.checkmark_search && this.checkmark_search.shadowRoot ? this.checkmark_search.shadowRoot.querySelector('svg') : null
                data = new XMLSerializer().serializeToString(n)
                data = data.replace('<g', '<g style="fill:white"')
                data = data.replace('viewBox="0 0 24 24"', 'viewBox="0 0 24 24" width="24" height="24"')
                data = StringUtil.replaceAll(data, 'class="style-scope iron-icon"', '')
                data = data.replace('style="pointer-events: none; display: block; width: 100%; height: 100%;"', '')

                //checkmark_search-white
                image = new Image()
                svg = new Blob([data], { type: 'image/svg+xml' })
                url = DOMURL.createObjectURL(svg)
                image.onload = (e) =>
                {
                    this._checkBoxIB_Search = e.target || e.srcElement
                    DOMURL.revokeObjectURL(url)
                    this._resizeDebounce = Debouncer.debounce(this._resizeDebounce, microTask, handler)
                }
                image.src = url

                //checkmark_search-black
                data = data.replace('<g style="fill:white"', '<g style="fill:black"')
                image = new Image()
                svg = new Blob([data], { type: 'image/svg+xml' })
                url = DOMURL.createObjectURL(svg)
                image.onload = (e) =>
                {
                    this._checkBoxIB_Search_B = e.target || e.srcElement
                    DOMURL.revokeObjectURL(url)
                    this._resizeDebounce = Debouncer.debounce(this._resizeDebounce, microTask, handler)
                }
                image.src = url

                this._prepared = true // DONE
            }

            this._resizeDebounce = Debouncer.debounce(this._resizeDebounce, microTask, handler)
            //console.log(this.container.clientHeight)
        }
        catch (e)
        {
            console.error(e)
        }
    }

    _openedChanged(opened, old?)
    {
        if (!opened && old == undefined) { return }

        // if (opened && this.colorsPalette)
        // {
        //     this._pages = Math.ceil(this.colorsPalette.length / 7)
        // }
        if (opened && !old)
        {
            this._keydownSuppressOnOpen = true
            this._keydownSuppressDebounce = Debouncer.debounce(this._keydownSuppressDebounce, timeOut.after(300), () =>
            {
                this._keydownSuppressOnOpen = false
            })
        }

        super._openedChanged(opened)

        if (opened)
        {
            if (!this._suppressHistory)
            {
                var state = { 'color-picker': this.id }
                var title = 'Pantone Color Picker'
                var url = window.location.href.replace(window.location.hash, "") + '#' + this.id
                // console.log('pushState!!!!!!!!!!!! ' + url)
                window.history.pushState(state, title, url)
                this._lastState = state
            }

            if (!this._stopFocusSearchInput) 
            {
                this._stopFocusSearchInput = true
                this.async(() => { this._stopFocusSearchInput = false }, 450) //all animations should be finished for now (need for focus workaround)
            }
        }
        else
        {
            if (window.history.length > 0 && !this._suppressHistory) 
            {
                // console.log('history: ' + window.history.length)
                window.history.back()
            }
        }
    }

    _canceledChanged(closed?)
    {
        super._canceledChanged()
    }

    onHistoryPopstate(e)
    {
        e = e || window.event

        // console.log(this.id + ' ... ' + JSON.stringify(this._lastState) + ' ~~~~ ' + JSON.stringify(e['state']))

        if (this._suppressHistory) { return }
        this._suppressHistory = true

        if (this._lastState && this._lastState['color-picker'] == this.id)
        {
            this._lastState = e['state']
            this.close()

        }
        else if (e && e['state'] && e.state['color-picker'] == this.id)
        {
            this._lastState = e['state']
            this.open()
        }

        this._suppressHistory = false
    }

    _onQuickSearchByID(id)
    {
        var handler = () => 
        {
            for (var i = 0; i < this.colorsPalette.length; i++)
            {
                var c = this.colorsPalette[i]
                if (c.i == id)
                {
                    this._gotoPage(Math.floor(i / this.swatchesPerPage))
                    break
                }
            }
        }
        var w = timeOut.after(150)
        this._qsearchDebouncer = Debouncer.debounce(this._qsearchDebouncer, w, handler)
    }

    _createQSIndex(cplist, lunr)
    {
        var qsindex = lunr(function (this: any)
        {
            this.setRef('ii')
            this.addField('n')
            this.addField('h')
        })

        for (var i in cplist)
        {
            qsindex.addDoc({
                ii: parseInt(i, 10), //index
                i: cplist[i]['i'],
                n: cplist[i]['n'],
                h: cplist[i]['h'],
            })
        }

        return qsindex
    }

    _onQuickSearch(n, o)
    {
        if (this._quickSearch_lock || !this.colorsPalette) { return }

        if ((!n || n.length < 1) && this.selectedColor)
        {
            this._onQuickSearchByID(this.selectedColor.i)
            return
        }

        var selectColorHandler = (col, colorsPalette) => 
        {
            const inx = colorsPalette.indexOf(col || {})
            // console.log(col, inx)
            if (col && inx >= 0)
            {
                this.selectedSearchColor = col
                const p = Math.floor(inx / this.swatchesPerPage)
                this._gotoPage(p)
                return true
            }
            return false
        }

        // console.log(n)

        var handler = async (input) => 
        {
            this.selectedSearchColor = null

            var trimed = typeof (input) == 'string' ? input.trim() : '' + input
            if (trimed && trimed.startsWith('#') && trimed.length == 7)
            {
                var nearestColor = Color.nearestColor(trimed, this.colorsPalette)
                if (selectColorHandler(nearestColor, this.colorsPalette))
                {
                    return //EXIT
                }
            }

            if (!this.translite && trimed.match(/^[a-zA-Z0-9]*$/i) === null)
            {
                const tmodule = await import('speakingurl')
                this.translite = tmodule.default
            }
            trimed = this.translite ? this.translite(trimed) : trimed
            // console.log(n, trimed)

            if (this._qsindexFirst && !this._qsindex)
            {
                const module = await import('../utils/elasticlunr.js')
                const lunr = module.default
                this._qsindexFirst = false
                this._qsindex = this._createQSIndex(this.colorsPalette, lunr)
            }

            if (!this._qsindex)
            {
                for (var coli of this.colorsPalette)
                {
                    if (coli.n.indexOf(trimed) >= 0 && selectColorHandler(coli, this.colorsPalette))
                    {
                        break
                    }
                }
            }
            else if (this._qsindex)
            {
                var r = this._qsindex.search(trimed, {
                    fields: {
                        n: { boost: 10 }, // bool: "AND" },
                        h: { boost: 1 }
                    },
                    boolean: "OR",
                    expand: true,
                })
                if (r.length > 0)
                {
                    // console.log(r)
                    const doci = this.colorsPalette.filter(i => r[0].doc.i == i.i)
                    selectColorHandler(doci && doci.length > 0 ? doci[0] : null, this.colorsPalette)
                }
            }
        }
        var w = timeOut.after(650)
        this._qsearchDebouncer = Debouncer.debounce(this._qsearchDebouncer, w, () => handler(n))
    }

    _onResized(e?)
    {
        if (!(this.colorsPalette && this.colorsPalette.length > 0 && this.container.clientHeight > 0)) { return }

        
        const resizeHandler = () =>
        {
            var PIXEL_RATIO = (function ()
            {
                //window.devicePixelRatio = 2
                var ctx: any = document.createElement("canvas").getContext("2d")
                var dpr = window.devicePixelRatio || 1
                var bsr = ctx ?
                    ctx.webkitBackingStorePixelRatio ||
                    ctx.mozBackingStorePixelRatio ||
                    ctx.msBackingStorePixelRatio ||
                    ctx.oBackingStorePixelRatio ||
                    ctx.backingStorePixelRatio || 1 : 1
                var r = dpr / bsr
                //if (r < 2) { r = 2 }
                //console.log('pixel ratio: ' + r)
                return r
            })()

            var pantonePages = Math.ceil(this.colorsPalette.length / 7)

            // console.log('pantonePages: ' + pantonePages)

            // var ch = window.screen.height // use screen to avoid keyboard resizing //window.innerHeight 
            //window.innerWidth
            var ch = window.screen.height * 0.9 //Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
            var cw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
            
            // console.log('window: ' + Math.round(cw) + 'x' + Math.round(ch))

            var k = 1.775
            if ((cw * k) >= ch)
            {
                ch = ch * 0.95
                if (ch > 900) { ch = 900 }
                cw = Math.round(ch / k)
            }
            else
            {
                cw = cw * 0.90
                ch = Math.round(cw * k)
                if (ch > 900) 
                {
                    ch = 900
                    cw = Math.round(ch / k)
                }
            }

            if (ch < 320) 
            {
                ch = 320
                cw = Math.round(ch / k)
            }

            // console.log('picker: ' + Math.round(cw) + 'x' + Math.round(ch))

            var canvasW = cw
            var canvasH = ch

            this.updateStyles({
                "--color-picker-container-width": cw + "px",
                "--color-picker-container-height": ch + "px"
            })

            // console.log(PIXEL_RATIO)
            this.canvas1.width = canvasW * PIXEL_RATIO
            this.canvas1.height = canvasH * PIXEL_RATIO
            // console.log('canvas: ' + this.canvas1.width + 'x' + this.canvas1.height)
            this._pixelratio = PIXEL_RATIO

            var ctx = this.canvas1.getContext('2d')
            this.updateStyles({
                "--color-picker-canvas-width": canvasW + "px",
                "--color-picker-canvas-height": canvasH + "px"
            })

            //scale header
            var s = 1
            if (cw < 350)
            {
                s = cw / 350
                if (s < 0.5) { s = 0.5 }
            }
            var scale = 'scale(' + s + ',' + s + ')'
            this.header.setAttribute("style", `z-index: 1000; transform-origin:top left; -ms-transform:${scale}; -webkit-transform:${scale}; transform:${scale}`)

            this.refit()
            this._firstRender = true
            this._draw()
        }
        
        if (this._resizeEventFirst)
        {
            this._resizeEventFirst = false
            resizeHandler()
        }
        else
        {
            this._resizeEventDebounce = Debouncer.debounce(this._resizeEventDebounce, timeOut.after(150), resizeHandler)
        }
    }

    _draw()
    {
        this.__time0 = this._now()

        this._clickRegions = []
        var ctx: CanvasRenderingContext2D | null = this.canvas1.getContext('2d')
        if (ctx == null) { return }

        ctx.save()
        var m = new Matrix(ctx)
        var ctxW = ctx.canvas.width, ctxH = ctx.canvas.height
        var gapBetweenPages = 90 / (this.visiblePages - 1)
        var pageW = 760
        var pageH = 100
        ctx.shadowColor = '#000000'
        ctx.font = "bold 0.9em Verdana, Verdana, Geneva, sans-serif"
        var grd = ctx.createLinearGradient(ctxW, ctxH, ctxW / 2, 0)
        grd.addColorStop(0, "#e0e0e0")
        grd.addColorStop(1, "white")

        ctx.fillStyle = grd // "#ffffff"
        ctx.fillRect(0, 0, ctxW, ctxH * 0.935)

        ctx.save()
        var scale = ctxH / 1000
        m.scale(scale, scale)

        ctx.save()
        m.scale(1, 0.96)
        m.translate(20, 0)

        ctxW = ctx.canvas.width / scale, ctxH = ctx.canvas.height / scale
        var activePageWidth = 100 * 1000 / 760
        var pivotX = ctxW - 40, pivotY = ctxH - pageH

        var pageToDraw = Math.floor(this._activePage) + 7
        if (pageToDraw < this._pages)
        {
            var m2 = m.clone()
            m2.translate(0, pivotY)
            m2.scale(pivotX / pageW, pivotX / pageW)
            this._drawpage(ctx, pageToDraw * 7, m2)
        }

        for (var k = this.visiblePages - 1; k >= -1; k--)
        {
            pageToDraw = k + Math.floor(this._activePage)
            if (pageToDraw < this._pages && pageToDraw >= 0)
            {
                var m2 = m.clone()
                m2.translate(pivotX, pivotY)
                m2.scale(pivotX / pageW, pivotX / pageW)
                var angle = (gapBetweenPages) * (this.visiblePages - 1 - k + this._activePage - Math.floor(this._activePage))
                if (angle > 90) angle = 5 * angle - 360
                var scale = (angle / 90) * 0.7 + 1
                m2.scale(scale, scale)
                m2.rotate(angle * this._toRad)
                m2.translate(-pageW, 0)
                this._drawpage(ctx, pageToDraw * 7, m2)
                m._x()
            }
        }
        ctx.restore()
        this._drawColorScroll(ctx, m)
        ctx.restore()

        var t1 = this._now() - this.__time0
        this.__time1 = (this.__time1 ? (this.__time1 + t1) / 2 : t1)
        // console.log(this.__time1)
        const slow = this.__time1 > 17
        this.__time2s = (this.__time2s ? (this.__time2s + (slow ? 1 : 0)) : 1)
        this.__time2f = (this.__time2f ? (this.__time2f + (slow ? 0 : 1)) : 1)
        // console.log(this.__time1 + ' >>> s ' + this.__time2s + ' - f ' + this.__time2f)
    }

    _drawpage(ctx, cid, m)
    {
        if (this._slow)
        {
            ctx.save()
            this._roundedRect(ctx, 1.5, 1.5, 757, 97, 8)
            ctx.fillStyle = "#000000"
            ctx.fill()
            ctx.closePath()
            ctx.restore()
        }

        ctx.save()
        this._roundedRect(ctx, 2, 2, 756, 96, 8)
        if (!this._slow)
        {
            ctx.strokeStyle = "#000000"
            ctx.shadowColor = '#c0c0c0'
            ctx.shadowBlur = 4
        }
        ctx.fillStyle = "#FFFFFF"
        ctx.fill()
        ctx.closePath()
        ctx.restore()

        for (var i = 0; i < 7; i++)
        {
            this._drawSwatch(ctx, cid + i, i, m)
        }
        ctx.fillStyle = "#000000"
    }

    _drawSwatch(ctx, cid, i, m)
    {
        var c = this.colorsPalette[cid]
        if (!c || !c.h) { return }

        ctx.fillStyle = "#" + c.h //Hex
        ctx.fillRect(i * 100 + 10, 2, 60, 96)
        if (this.selectedColor && this.selectedColor.i === c.i)
        {
            // console.log(this.selectedColor.i)
            var m2 = m.clone()
            m2.translate(i * 100 + 20, 90)
            var z = 0.86 //* this._pixelratio
            m2.scale(z, z)
            m2.rotate(-90 * this._toRad)

            var img = null 
            if (this._checkBoxIB && this._checkBoxIB_B)
            {
                img = Color.contrastBW(c.h) == 'white' ? this._checkBoxIB : this._checkBoxIB_B
            }
            if (img)  { ctx.drawImage(img, 0, 0) }
            m._x()
        }
        else if (this.selectedSearchColor && this.selectedSearchColor.i === c.i)
        {
            // console.log(this.selectedColor.i)
            var m2 = m.clone()
            m2.translate(i * 100 + 20, 90)
            var z = 0.86 //* this._pixelratio
            m2.scale(z, z)
            m2.rotate(-90 * this._toRad)

            var img = null
            if (this._checkBoxIB_Search && this._checkBoxIB_Search_B)
            {
                img = Color.contrastBW(c.h) == 'white' ? this._checkBoxIB_Search : this._checkBoxIB_Search_B
            }
            if (img) { ctx.drawImage(img, 0, 0) }
            m._x()
        }

        var m2 = m.clone()
        m2.translate(i * 100 + 90, 90)
        m2.rotate((Math.PI / 180) * -90)
        ctx.fillStyle = "#000000"
        ctx.fillText(c.n.replace("PANTONE ", ""), 0, 0, 75)
        var shape = [{ x: i * 100 + 10, y: 2 }, { x: i * 100 + 70, y: 2 }, { x: i * 100 + 70, y: 98 }, { x: i * 100 + 10, y: 98 }, { x: i * 100 + 10, y: 2 }]
        this._clickRegions.push({ "shape": m.applyToArray(shape), "color": c })
        m._x()
    }

    _drawColorScroll(ctx, cid, m?)
    {
        var canvW = 1000.0 / 1.775
        var padding = 2
        var pageWidth = canvW / (this._pages + padding * 2)
        var swH = 8
        ctx.save()
        if (this._firstRender)
        {
            // console.log('first render')
            ctx.fillStyle = "#e0e0e0"
            ctx.fillRect(0, 935, canvW, swH * 7)
            for (var p = 0; p < this._pages; p++)
            {
                for (var c = 0; c < 7; c++)
                {
                    var color = this.colorsPalette[p * 7 + c]
                    ctx.fillStyle = "#" + color.h
                    ctx.fillRect(canvW - (p + padding + 1) * pageWidth, 935 + c * swH, pageWidth, swH)
                }
            }
            this._firstRender = false
        }
        ctx.fillStyle = "#e0e0e0"
        ctx.fillRect(0, 992, 1000, 20)

        ctx.beginPath()
        var pointX = canvW - (this._activePage + padding + 0.5) * pageWidth
        ctx.moveTo(pointX, 992)
        ctx.lineTo(pointX - 5, 1000)
        ctx.lineTo(pointX + 5, 1000)
        ctx.fillStyle = "#FF0000"
        ctx.fill()
        ctx.restore()
    }


    _roundedRect(ctx, x, y, width, height, radius)
    {
        ctx.beginPath()
        ctx.moveTo(x, y + radius)
        ctx.lineTo(x, y + height - radius)
        ctx.arcTo(x, y + height, x + radius, y + height, radius)
        ctx.lineTo(x + width - radius, y + height)
        ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius)
        ctx.lineTo(x + width, y + radius)
        ctx.arcTo(x + width, y, x + width - radius, y, radius)
        ctx.lineTo(x + radius, y)
        ctx.arcTo(x, y, x, y + radius, radius)
    }

    _getColorAt(x, y)
    {
        var canvasBox = this.canvas1.getBoundingClientRect()
        var ctx = this.canvas1.getContext('2d')
        x = (x - canvasBox.left) / canvasBox.width * this.canvas1.width
        y = (y - canvasBox.top) / canvasBox.height * this.canvas1.height
        for (var i = this._clickRegions.length - 1; i >= 0; i--)
        {
            if (this._isPointInShape({ "x": x, "y": y }, this._clickRegions[i].shape, 4))
                return this._clickRegions[i].color
        }
    }

    _getPageAt(x, y)
    {
        var canvW = 1000.0 / 1.775
        var padding = 2
        var pageWidth = canvW / (this._pages + padding * 2)

        var canvasBox = this.canvas1.getBoundingClientRect()
        var ctx = this.canvas1.getContext('2d')
        x = (x - canvasBox.left) / canvasBox.width * this.canvas1.width
        y = (y - canvasBox.top) / canvasBox.height * this.canvas1.height
        var yn = y * 1000.0 / this.canvas1.height
        var xn = x * 1000.0 / 1.775 / this.canvas1.width
        if (yn > 935)
        {
            var p = Math.round(this._pages - (xn / pageWidth - padding))
            this._gotoPage(p)
        }
    }

    _containerTap(e)
    {
        if (e.target === this.searchInput)
        {
            e.target.focus()
        }
        else
        {
            // this.searchInput.blur()
            // console.log('blur _containerTap')
        }
    }

    _canvasTap(e)
    {
        this._stopFocusSearchInput = true
        this.searchInput?.blur()
        // console.log('blur _canvasTap')
        this.async(() => { this._stopFocusSearchInput = false }, 150)

        var c = this._getColorAt(e.detail.x, e.detail.y)
        if (c)
        {
            this._selectColor(c)
        } 
        else
        {
            this._getPageAt(e.detail.x, e.detail.y)
        }
    }

    onRecentSelectedColor(e)
    {
        this._selectColor(e.detail.selectedColor)
    }

    _localStorageChanged(localStorage)
    {
        if (!localStorage || this.localStorageLock) { return }


        if (localStorage.recentColors)
        {
            this.set('recentColors', Object.assign([], this.localStorage?.recentColors))
        }
    }

    _selectColorThenCloseDebouncer: Debouncer
    _selectColor(c)
    {
        this.selectedColor = c
        this._selectColorThenCloseDebouncer = Debouncer.debounce(this._selectColorThenCloseDebouncer, timeOut.after(250), () => 
        {
            this.canvas1.width = 1
            this.canvas1.height = 1
            this._firstRender = true
            this.close()
        })

        //save recent colors
        if (this.localStorage)
        {
            if (!this.recentColors) { this.recentColors = [] }
            var dub = this.recentColors.filter(i => i.i == c.i)
            if (dub.length > 0)
            {
                this.splice('recentColors', this.recentColors.indexOf(dub[0]), 1)
            }
            this.unshift('recentColors', c)
            if (this.recentColors.length > recentColorsLength)
            {
                this.splice('recentColors', recentColorsLength, this.recentColors.length - recentColorsLength)
            }

            this.localStorageLock = true
            // console.log(this.recentColors)
            this.set('localStorage.recentColors', Object.assign([], this.recentColors))
            this.localStorageLock = false
           
        }
    }

    _gotoPage(page)
    {
        // console.log(page + ' ' + this._activePage)
        if (page >= this._pages) { page = this._pages - 1 }
        if (page < 0) { page = 0 }

        this._animateStart(page)
    }

    _onCaptureClick(e)
    {
        // console.log(e.target.nodeName)
        if (e.target && e.target.nodeName == 'IRON-OVERLAY-BACKDROP')
        {
            super._onCaptureClick(e)
        }
    }

    onKeydown(e)
    {
        e = e || window.event

        //if (!(e && e.state && e.state['color-picker'] == this.id)) { return }
        if (!this.opened || e.altKey || e.shiftKey || this._keydownSuppressOnOpen) { return }

        var f = this.searchInput.getAttribute("focused")
        var ck = keyboardEventMatchesKeys

        if ((f == null) && ck(e, 'left') || ck(e, 'down') || ck(e, 'pagedown'))
        {
            e.preventDefault()
            e.stopPropagation()

            //console.log('backward')
            var pageDelta = ck(e, 'pagedown') ? 7 : 1
            var page = this._targetPage - (e.ctrlKey ? 2 : 1) * pageDelta
            this._gotoPage(page)
        }

        if ((f == null) && ck(e, 'right') || ck(e, 'up') || ck(e, 'pageup'))
        {
            e.preventDefault()
            e.stopPropagation()

            //console.log('forward')
            var pageDelta = ck(e, 'pageup') ? 7 : 1
            var page: number = this._targetPage + (e.ctrlKey ? 2 : 1) * pageDelta
            this._gotoPage(page)
        }

        if ((f == null) && (ck(e, 'home') || ck(e, 'end')))
        {
            e.preventDefault()
            e.stopPropagation()

            this._gotoPage(ck(e, 'end') ? 0 : this._pages - 1)
        }

        if ((f == null) && (ck(e, 'space')))
        {
            e.preventDefault()
            e.stopPropagation()

            //TODO: select color in current column and close....
            this.close()
        }

        var keycode
        if (e && e.keyCode) { keycode = e.keyCode } else if (e && e.which) { keycode = e.which }
        if ((f == null) && (e.ctrlKey && !e.altKey && !e.shiftKey && keycode == 70))
        {
            this.searchInput?.focus()
            e.preventDefault()
            e.stopPropagation()
        }

        if (ck(e, 'enter') && this.selectedSearchColor)
        {
            // this.searchInput?.blur()
            this._selectColor(this.selectedSearchColor)
        }
    }

    _ontrack(e)
    {
        if (!this.colorsPalette) { return }

        // console.log(e.detail)
        if (e.detail.state === "start")
        {
            this._stopFocusSearchInput = true
            this.searchInput?.blur()
            // console.log('blur _ontrack.start')
            
            if (this._animFrame) { window.cancelAnimationFrame(this._animFrame) }
            this._resetAnim() //reset anim
            this._prevActivePage = this._activePage
            this.tracking = true
        }

        var delta = e.detail.dx / 96 - e.detail.dy / 96
        var direction = Math.sign(delta)

        if (e.detail.state === "track")
        {
            const lpi = this._pages - 1
            var _newActivePage = this._prevActivePage + delta
            if (_newActivePage > lpi) { _newActivePage = lpi }
            if (_newActivePage < 0) { _newActivePage = 0 }
            this._activePage = _newActivePage
            this._targetPage = direction < 0 ? Math.floor(this._activePage) : Math.ceil(this._activePage)

            if (this._animFrame) { window.cancelAnimationFrame(this._animFrame) }
            this._resetAnim()
            this._animFrame = window.requestAnimationFrame(this._draw.bind(this))
        }

        if (e.detail.state === "end")
        {
            this.tracking = false
            this._stopFocusSearchInput = false
            this._prevActivePage = this._activePage
            // this._gotoPage((delta > 0) ? Math.ceil(this._activePage) : Math.floor(this._activePage))
            this._gotoPage(Math.round(this._activePage))
        }
    }

    _onMouseWheel(e)
    {
        // if (e.ctrlKey || !e.shiftKey) { return } //comment to use vertical & horizontal

        var delta = (e.deltaX - e.deltaY)
        switch (e.deltaMode)
        {
            case 0: //pixel
                //delta
                break

            case 1: //line
                delta = delta * 96
                break

            case 2: //page
                delta = delta * 96 * 7
                break
        }

        if (Math.abs(delta) < 96)
        {
            var te = { state: 'track', dx: 0, dy: 0 }
            if (!this._mouseWheelDebouncer)
            {
                te.state = 'start'
                this._wheelDelta = 0
                this._ontrack({ detail: te }) //handle event
                te.state = 'track'
            }
            this._mouseWheelDebouncer = Debouncer.debounce(this._mouseWheelDebouncer, timeOut.after(450), () => 
            {
                te.state = 'end'
                te.dy = this._wheelDelta
                this._ontrack({ detail: te }) //handle event
                this._mouseWheelDebouncer = null
            })
            this._wheelDelta += delta
            te.dy = this._wheelDelta
            this._ontrack({ detail: te }) //handle event
        }
        else
        {
            var page = this._targetPage + delta / 96
            page = delta > 0 ? Math.ceil(page) : Math.floor(page)
            this._gotoPage(page)
        }

        // e.preventDefault()
        e.stopPropagation()
        return false
    }

    _animateStart(targetPage)
    {
        if (targetPage === undefined) { return }
        // if (targetPage === undefined || Math.abs(targetPage - this._activePage) <= 0.1) { return }

        const dist = Math.ceil(Math.abs(targetPage - this._activePage))
        this._targetPage = targetPage
        var currentTime = this._now()

        // animation model:
        // supose that x(t) is continous and smooth function
        // supose this v(t) is continous function
        // use cubic spline
        // x =     a * t ^ 3 +         b * t ^ 2 + c * t + d
        // v = 3 * a * t ^ 2 + 2     * b * t + c
        // x(0) = x0
        // v(0) = v0
        // x(targetT) = targetX
        // v(targetT) = 0
        // d = x0
        // c = v0
        // a     * targetT ^ 3 + b     * targetT ^ 2 = targetX - x0 - v0 * targetT
        // a * 3 * targetT ^ 2 + b * 2 * targetT     = -v0

        var ax = this._activePage
        var av = 0

        if (this._targetAnimateTime && currentTime < this._targetAnimateTime) //this._a.a !== undefined) 
        {
            var t = Math.min(currentTime, this._targetAnimateTime) - this._start_animateTime
            ax = this._a.a * t * t * t + this._a.b * t * t + this._a.v0 * t + this._a.x0
            av = 3 * this._a.a * t * t + 2 * this._a.b * t + this._a.v0
        }

        this._start_animateTime = currentTime
        const targetT = Math.max(1, Math.min(1150, dist * 150))
        this._targetAnimateTime = currentTime + targetT

        this._a.x0 = ax
        this._a.v0 = av
        var targetX = this._targetPage
        var d = targetT * targetT * targetT * targetT * 2 - 3 * targetT * targetT * targetT * targetT
        var da = -(-targetT * targetT * this._a.v0 - 2 * targetT * (targetX - this._a.x0 - this._a.v0 * targetT))
        var db = targetT * targetT * targetT * -1 * this._a.v0 - 3 * targetT * targetT * (targetX - this._a.x0 - this._a.v0 * targetT)
        this._a.a = da / d
        this._a.b = db / d

        if (this._animFrame) { window.cancelAnimationFrame(this._animFrame) }
        // console.log('_animateStart ' + targetPage)
        this._animFrame = window.requestAnimationFrame(this._animate.bind(this))
    }


    _animate()
    {
        // if (this._animFrame) { window.cancelAnimationFrame(this._animFrame) }
        var currentTime = this._now()
        var foo = this._activePage
        if (currentTime >= this._targetAnimateTime) 
        {
            this._activePage = this._targetPage
            this._animFrame = window.requestAnimationFrame(this._draw.bind(this))
        }
        else 
        {
            const t = currentTime - this._start_animateTime
            var ax = this._a.a * t * t * t + this._a.b * t * t + this._a.v0 * t + this._a.x0
            this._activePage = ax
            // console.log(foo + ' -> ' + this._activePage)
            this._draw()
            this._animFrame = window.requestAnimationFrame(this._animate.bind(this))
        }
    }

    _resetAnim()
    {
        this._targetAnimateTime = this._now()
    }

    _isPointInShape(P, V, n)
    {
        var cn = 0
        for (var i = 0; i < n; i++)
        {
            if (((V[i].y <= P.y) && (V[i + 1].y > P.y))
                || ((V[i].y > P.y) && (V[i + 1].y <= P.y)))
            {
                var vt = (P.y - V[i].y) / (V[i + 1].y - V[i].y)
                if (P.x < V[i].x + vt * (V[i + 1].x - V[i].x))
                    ++cn
            }
        }
        return (cn & 1)    // 0 if even (out), and 1 if  odd (in)
    }

}
