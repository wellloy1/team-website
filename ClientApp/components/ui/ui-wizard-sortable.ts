import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { ArraySelector } from '@polymer/polymer/lib/elements/array-selector.js'
import { CustomElement } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-image'
import '../ui/ui-sortable-list'
import '../shared-styles/common-styles'
import view from './ui-wizard-sortable.ts.html'
import style from './ui-wizard-sortable.ts.css'
import { debug } from 'util';
import { timingSafeEqual } from 'crypto';
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIWizardSortableBase = mixinBehaviors([IronResizableBehavior], UIBase) as new () => UIBase & IronResizableBehavior


@CustomElement
export class UIWizardSortable extends UIWizardSortableBase
{
    static get is() { return 'teamatical-ui-wizard-sortable' }
    
    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            title: { type: String },
            options: { type: Array, notify: true, observer: '_optionsListChanged' },
            imageRatio: { type: Number, value: 0 },
            imageHeight: { type: Number, value: 0 },
            isSwap: { type: Boolean, notify: true },
            visible: { type: Boolean, observer: '_visibleChanged' },
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
            selectionOnly: { type: Boolean, value: false, reflectToAttribute: true },
            titleReadonly: { type: Boolean, value: false, reflectToAttribute: true },
            
            dragging: { type: Boolean, reflectToAttribute: true },
            hidden: { type: Boolean, reflectToAttribute: true },
            editing: { type: Boolean, reflectToAttribute: true },
            lazyload: { type: Boolean, computed: '_computeLazyload(editing, hidden)' },

            virtualShow: { type: Boolean, value: false },
            averageImgLoadTime: { type: Number, value: 100 },
            selectedProduct: { type: Number, notify: true, observer: '_selectedProductChanged' },
            _selectedIndex: { type: Number, },


            _virtualIndex: { type: Number, value: 0 },
            _trackWidth: { type: Number, value: 0 },
            _elementWidth: { type: Number, value: 0 },
            _trackStart: { type: Number, value: 0 },
            _imgLoadStart: { type: Number, value: 0 },
            _avgLoadTimeSum: { type: Number, value: 0 },
            _loadCompleteCount: { type: Number, value: 0 },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    _onResizeDebouncer: Debouncer
    _slides: any
    _observerImgs: any
    _selectedIndex: number
    _lastoptionslen: number
    _virtualIndex: number
    imageRatio: number
    imageHeight: number
    isSwap: boolean
    options: any
    virtualShow: boolean
    selectedProduct: number

    get track() { return this.$['track'] as HTMLDivElement }
    get slides() 
    { 
        if (this._slides) { return this._slides }
        this._slides = this.shadowRoot.querySelector('#slides')
        return this._slides
    }
    get selector() { return this.$['selector'] as ArraySelector }


    connectedCallback()
    {
        super.connectedCallback()

        this.setScrollDirection("y", this.track)
        this.track.style.width = "100%"

        // this._observerImgs = new FlattenedNodesObserver(this.slides, (info: any) =>
        // {
        //     this._onResized()
        // })

        // this.track.addEventListener('dom-change', (e) =>
        // {
        //     console.log('resize-handler - dom-change')
        //     this._onResized()
        // })

        this.addEventListener('iron-resize', (e) => this._onResized(e))
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

    _computeLazyload(editing, hidden)
    {
        // console.log(editing, hidden)
        return !editing && hidden
    }

    _imageUrl(item_ImageUrl, item_ImageUrlSwap, isSwap)
    {
        return (isSwap ? item_ImageUrlSwap : item_ImageUrl)
    }

    _visibleChanged()
    {
        this._restoreDOMNatureOrder()
        // console.log('_optionsListChanged, visible:', this.visible)
        // console.log(arguments)
    }

    _optionsListChanged(options)
    {
        // console.log('_optionsListChanged, visible:', this.visible)
        this._restoreDOMNatureOrder()

        // this._htmlOrderUpdateDebouncer = Debouncer.debounce(this._htmlOrderUpdateDebouncer, timeOut.after(17), () => { this._restoreDOMNatureOrder() })

        if (options.length > 0)
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
                // console.log('resize-handler - optionslist')
                this._onResized()
            }
            this._lastoptionslen = this.options.length
        }        
    }

    _onResizedHandler()
    {
        if (!this.slides) { return }
        // console.log(this.title, 'resize-handler')

        var wh = window.innerHeight

        var k = 1.08
        var maxPanelHeight = Math.floor(Math.min(this.imageHeight / k, wh * 1))
        // this.track.style.height = maxPanelHeight + "px"
        var li = this.slides.querySelectorAll('li.panel')
        for (var i in li) 
        {
            if (li[i] && li[i].style) { li[i].style.height = maxPanelHeight + "px" }
        }

        var elementWidth = Math.round(maxPanelHeight * k * this.imageRatio)
        var fontSize = Math.max(12, Math.round(maxPanelHeight / 20))
        // console.log('elementWidth', elementWidth)
        this.updateStyles({
            "--panel-width": elementWidth + "px",
            "--label-font-size": fontSize + "px"
        })

        // this.set('editing', true)
    }

    _onResized(e?)
    {
        const t = e ? 17 : 90
        // console.log(this.root, t)
        this._onResizeDebouncer = Debouncer.debounce(this._onResizeDebouncer, timeOut.after(t), () => this._onResizedHandler())
    }

    _deleteTap(e)
    {
        e.preventDefault()
        e.stopPropagation()

        const epath = e.path || e.composedPath()
        for (var i in epath)
        {
            var el = epath[i]
            if (el && el.classList && el.classList.contains('panel'))
            {
                var data = el.__dataHost.__data
                el.classList.add('deleting')
                var delhandle = () => {
                    el.removeEventListener('transitionend', delhandle, false)
                    el.classList.add('deleted')
                    el.classList.remove('deleting')
                    this.set('options.' + data.index + '.deleting', true)
                }
                el.addEventListener('transitionend', delhandle, false)
                break
            }
        }

        return false
    }

    _onSortFinish(e)
    {
        for (var i in e.detail.items)
        {
            var item: any = e.detail.items[i]
            var index = item.getAttribute('data-index')
            // var modelitem: any = item && item.__dataHost && item.__dataHost.__data ? item.__dataHost.__data.item : null
            this.set('options.' + index + '.newindex', parseInt(i, 10))
        }
    }

    _restoreDOMNatureOrder()
    {
        // console.log('_restoreDOMNatureOrder', this.slides)
        var p = this.slides
        if (!p) { return }

        Array.prototype.slice.call(p.children)
            .map(function (x) { 
                // console.log(x)
                x.classList.remove('deleted')
                return p.removeChild(x) 
            })
            .sort(function (x, y)
            {
                var a = (x.id == 'designsList' || x.classList.contains('panel-end') ? Number.MAX_SAFE_INTEGER : parseInt(x.getAttribute('data-index'), 10))
                var b = (y.id == 'designsList' || x.classList.contains('panel-end') ? Number.MAX_SAFE_INTEGER : parseInt(y.getAttribute('data-index'), 10))
                // console.log(a, b)
                if (a < b) { return -1 }
                if (a > b) { return 1 }
                return 0
            })
            .forEach(function (x) { 
                x.classList.remove('deleted')
                p.appendChild(x) 
            })
    }

    _ontap(e)
    {
        // console.log(e.model.item)

        for (var i = 0; i < this.options.length; i++)
        {
            var oi = this.options[i]
            if (oi == e.model.item)
            {
                // console.log(i)
                if (this._selectedIndex != i) { this.virtualShow = true }
                this._selectItemByIndex(i)
                this.selectedProduct = this._selectedIndex
                break
            }
        }
    }

    _onEditTitleTouchStart(e)
    {
        var isFocused = (document.activeElement === e.target)
        if (e.target && !isFocused) 
        { 
            e.target.focus() 
        }
        e.stopPropagation()
        e.preventDefault()
        return false
    }

    _onEditTitleTap(e)
    {
        e.stopPropagation()
        e.preventDefault()
        return false
    }

    _selectedProductChanged(val)
    {
        // console.log(val)
        this._selectItemByIndex(val)
    }

    _selectItemByIndex(i)
    {
        if (i < 0) { i = 0 }
        if (this.options.length > 0)
        {
            if (i > this.options.length - 1) { i = this.options.length - 1 }
            this.selector.select(this.options[i])

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
    }

    _panelClass(item_Selected)
    {
        var classes = "panel"
        if (item_Selected === true) { classes += " selected" }
        return classes
    }

}
