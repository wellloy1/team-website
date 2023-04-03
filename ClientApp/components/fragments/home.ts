import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import ResizeObserver from 'resize-observer-polyfill'
import { RandomInteger } from '../utils/MathExtensions'
import '../ui/ui-button'
import '../ui/ui-image'
import { UIImage } from '../ui/ui-image'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './home.ts.html'
import style from './home.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const HomeBase = FragmentBase //mixinBehaviors([IronResizableBehavior, GestureEventListeners], FragmentBase) as new () => FragmentBase & IronResizableBehavior & GestureEventListeners


@FragmentDynamic
export class Home extends HomeBase
{
    static get is() { return 'teamatical-home' }

    static get template() { return html([`<style include="">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: Object,
            routeData: Object,
            userInfo: Object,
            imagesPath: String,
            webp: { type: Boolean, value: false, reflectToAttribute: true },

            categories: { type: Array },
            visible: { type: Boolean, value: false, observer: '_visibleChanged' },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },

            recentSlide: { type: Number, value: 0  },
            slides: { type: Array, value: [] },
            resizeWidth: { type: Number, value: 6000  },
            slidesItems: { type: Array, notify: true, computed: '_computed_slidesItems(slides, recentSlide)' },
        }
    }
    static get observers()
    {
        return [
            '_resizeWidth_Updated(resizeWidth, recentSlide)',
        ]
    }

    webp: any
    slides: any
    visible: boolean
    recentSlide: number
    resizeObserver: ResizeObserver
    container: HTMLDivElement
    resizeWidth: number
    slideNextTimer: any

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
        this.webp = Teamatical._browser.webp

        // this.addEventListener('iron-resize', (e) => this._onResized(e))
        var container = this.shadowRoot ? this.shadowRoot.querySelector('.customization-container') : null
        var div_list = container ? container.querySelectorAll('section.customization') : null
        if (div_list && container)
        {
            this.slides = [...div_list]

            for (var i in this.slides)
            {
                var inx = parseInt(i)
                var slidei = this.slides[i] as HTMLDivElement
                if (inx != 0) { slidei.style.transform = `translateX(${this.resizeWidth}px)` }
                if (inx == this.recentSlide)
                {
                    slidei.style.visibility = 'visible'
                }
                else 
                {
                    slidei.style.visibility = 'visible' //hidden
                }
                slidei.setAttribute('animated', '')
            }

            this.resizeObserver = new ResizeObserver(entries => 
            {
                // console.log(entries)
                for (let entry of entries) 
                {
                    if(entry.contentRect) 
                    {
                        this.resizeWidth = entry.contentRect.width
                    } 
                }
            })
            this.resizeObserver.observe(container)

            this._slideNextTimerStart()
        }
    }
    
    disconnectedCallback()
    {
        if (this.resizeObserver && this.container) { this.resizeObserver.unobserve(this.container) }
        if (this.slideNextTimer) { clearInterval(this.slideNextTimer) }
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _slideNextTimerStart()
    {
        if (this.slideNextTimer) { clearInterval(this.slideNextTimer) }
        
        this.slideNextTimer = setInterval(
            (e)=> this.slideNext(e), 
            6000 + RandomInteger(-400, 400)
        )
    }

    _onSelectorTap(e)
    {
        var slidei = e?.model?.__data?.slidei
        
        if (this._asBool(slidei.id))
        {
            this.set('recentSlide', slidei.id)
            this._slideNextTimerStart()
        }
    }

    slideNext(e)
    {
        if (!this.slides || !this.visible) { return }

        var recentSlide = this.recentSlide
        recentSlide++
        if ((recentSlide) >= this.slides.length)
        {
            recentSlide = 0
        }
        
        // console.log('recentSlide', recentSlide)
        this.set('recentSlide', recentSlide)
        this._slideNextTimerStart()
    }

    _resizeWidth_Updated(resizeWidth, recentSlide)
    {
        // console.log(resizeWidth)
        for (var i in this.slides)
        {
            var slidei = this.slides[i] as HTMLDivElement
            var inx = parseInt(i)
            if (inx < recentSlide)
            {
                slidei.style.transform = `translateX(-${resizeWidth}px)`
                slidei.style.opacity = `0`
            }
            if (inx == recentSlide)
            {
                slidei.style.transform = `translateX(0px)`
                slidei.style.opacity = `1`
            }
            if (inx > recentSlide)
            {
                slidei.style.transform = `translateX(${resizeWidth}px)`
                slidei.style.opacity = `0`
            }
        }
    }

    _visibleChanged(visible)
    {
        if (!visible) { return }

        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                title: this.localize('home-title-document'),
            }
        }))
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

    _computed_slidesItems(slides, recentSlide)
    {
        var uiSlides = slides.map((i, inx, arr) => 
        { 
            // console.log(i, inx)
            return {
                id: inx,
                Selected: inx == recentSlide,
            }
        })
        // console.log(uiSlides)
        return uiSlides.length > 1 ? uiSlides : []
    }
}