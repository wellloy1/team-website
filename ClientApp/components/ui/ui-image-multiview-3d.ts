import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import 'intersection-observer/intersection-observer.js'
import { html, PolymerElement } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement, Vibrator } from '../utils/CommonUtils'
import { UIBase } from './ui-base'
import view from './ui-image-multiview-3d.ts.html'
import style from './ui-image-multiview-3d.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import '../ui/ui-image-svg'
import { StringUtil } from '../utils/StringUtil'
// import 'hammerjs/hammer.js'
// import * as Fingers from  '../utils/fingers.js'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIImageMultiView3DBase = mixinBehaviors([IronResizableBehavior, GestureEventListeners], UIBase) as new () => UIBase & IronResizableBehavior & GestureEventListeners
const elementObservers = new WeakMap()
const pvWarnDebounceTime = 1500
const forceLoading2DDebounceTime = 1200
const forceLoading3DDebounceTime = 3000
const resizeHideDebounceTime = 17
const zoomPinchDefault = { scale: 1, x: 0, y: 0 }
//TODO: swipe view by 2 fingers: fix positioning by horizontal axe
//TODO: mobile: pinch to zoom for mobile
//TODO: [hold] placeholderImg ???
//TODO: [hold] 3d retry..??????
const AnimationRate = 1 //4
const ZoomAnimationDebounceTime = 600 * AnimationRate
const ZoomScrollAnimationDebounceTime = 600 * AnimationRate
const ChangeviewAnimationDebounceTime = 600 * AnimationRate


@CustomElement
export class UIImageMultiView3D extends UIImageMultiView3DBase
{
    static get is() { return 'teamatical-ui-image-multiview-3d' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            scrollTarget: { type: String, },
            alt: { type: String, },
            caption: { type: String, value: '' },
            placeholderImg: { type: String },
            views: { type: Array, notify: true, },
            views_state: { type: Array, notify: true },
            overlays: { type: Array },
            pv: { type: Number, notify: true, },
            visible: { type: Boolean, value: false, reflectToAttribute: true, observer: '_visibleChanged', },
            lazyLoad: { type: Boolean, value: false, reflectToAttribute: true },
            allowZoom: { type: Boolean, notify: true, value: false, reflectToAttribute: true }, //allow-zoom
            hasDimensions: { type: Boolean, value: false, reflectToAttribute: true },
            drawDimensions: { type: Boolean, notify: true, value: false, reflectToAttribute: true },
            isYouth: { type: Boolean, value: false, reflectToAttribute: true },
            isReversible: { type: Boolean, value: false, reflectToAttribute: true },
            debug: { type: Boolean, value: false, reflectToAttribute: true },
            loadingOnUpdate: { type: Boolean, value: false },
            tooltipOverlowMode: { type: Boolean, notify: true, value: false, reflectToAttribute: true }, //tooltip-overlow-mode

            lazyObserve: { type: String },
            lazyMargin: { type: String, value: '0px 0px 0px 0px' },
            lazyThreshold: { type: Number, value: 0.0 },
            smallScreen: { type: Object, reflectToAttribute: true },

            allowImageSelector: { type: Boolean, computed: '_computeAllowViews(views_state, iszoom)', reflectToAttribute: true },
            allowImageBefore: { type: Boolean, computed: '_computeAllowViews(views_state, iszoom)', reflectToAttribute: true },
            allowImageNext: { type: Boolean, computed: '_computeAllowViews(views_state, iszoom)', reflectToAttribute: true },
            disabledImageBefore: { type: Boolean, computed: '_computeDisabledImageBefore(views_state, views_state.*)' },
            disabledImageNext: { type: Boolean, computed: '_computeDisabledImageNext(views_state, views_state.*)' },

            animation: { type: Boolean, value: false, reflectToAttribute: true },
            isResizing: { type: Boolean, value: false, reflectToAttribute: true },
            iszoom: { type: Boolean, value: false, reflectToAttribute: true },
            auto3dRotate: { type: Boolean, value: false, reflectToAttribute: true },
            iszoomMobile: { type: Boolean, notify: true, reflectToAttribute: true },

            selectedIndex: { type: Number },
            selectedView: { type: Object, computed: '_computeSelectedView(views_state, views_state.*)' },
            selectedViewIsLoading: { type: Boolean, computed: '_computeSelectedViewIsLoading(views_state, views_state.*)' },
            // selectedViewIsLoading3D: { type: Boolean, computed: '_computeSelectedViewIsLoading3D(views_state, views_state.*)' },
            isloaded: { type: Boolean, computed: '_computeIsLoaded(views_state, views_state.*)', reflectToAttribute: true },


            isMeasureBtn: { type: Boolean, computed: '_compute_isMeasureBtn(views_state, views_state.*, hasDimensions)', notify: true },
            isZoomOutBtn: { type: Boolean, computed: '_compute_isZoomOutBtn(views_state, views_state.*, allowZoom)' },
            isZoomInBtn: { type: Boolean, computed: '_compute_isZoomInBtn(views_state, views_state.*, allowZoom, selectedViewIsLoading)' },
            isZoomLoaded: { type: Boolean, computed: '_compute_isZoomLoaded(views_state, views_state.*)', notify: true, reflectToAttribute: true },
            isZoomLoading: { type: Boolean, computed: '_compute_isZoomLoading(views_state, views_state.*)', notify: true, reflectToAttribute: true },
            isZoomAnimation: { type: Boolean, reflectToAttribute: true }, //is-zoom-animation
            isChangeViewAnimation: { type: Boolean, reflectToAttribute: true }, //is-change-view-animation
            is3d: { type: Boolean, computed: '_computeIs3d(views_state, views_state.*)', notify: true, reflectToAttribute: true },
            is3dError: { type: Boolean, computed: '_computeIs3dError(views_state, views_state.*)', notify: true, reflectToAttribute: true },
            is3dLoaded: { type: Boolean, computed: '_computeIs3dLoaded(views_state, views_state.*)', reflectToAttribute: true },
            is3dWarn: { type: Boolean, computed: '_computeIs3dWarn(views_state, views_state.*)', reflectToAttribute: true },
            
            zoomPinch: { type: Object, value: zoomPinchDefault },

            localStorage: { type: Object, value: {} },
            swipeTipSvg: { type: String },
            swipeTip: { type: Boolean, notify: true, reflectToAttribute: true }, //swipe-tip
            hideSwipeTip: { type: Boolean, computed: '_computeHideSwipeTip(localStorage.swipeTipDone, is3dLoaded, swipeTip)' },

            // dev: { type: Boolean, value: true, reflectToAttribute: true },
        }
    }

    static get observers()
    {
        return [
            // '_viewsLoaded(views)',
            '_viewsUpdated(views, views.*)',
            '_views_stateUpdated(views_state.*)',
            '_viewsAndLazyChanged(views_state, selectedIndex, lazyLoad)',
            // '_log(views_state.*)',
            // '_log(zoomPinch)',
        ]
    }
    _log(v) { console.log(UIImageMultiView3D.is, v) }


    //#region Properties

    get loader() { return this.$['loader'] as HTMLElement}
    get loaderWrapper() { return this.$['loader-wrapper'] as HTMLElement}
    get track() { return this.$['track'] as HTMLElement}
    get buttonsContainer() { return this.$['buttons-container'] as HTMLElement}
    get overlayContainer() { return this.$['overlay-container'] as HTMLElement}
    get windowScrollX() { return this.scrollTarget ? this.scrollTarget.scrollLeft : window.scrollX }
    get windowScrollY() { return this.scrollTarget ? this.scrollTarget.scrollTop : window.scrollY }
    
    //#endregion


    //#region Fields

    pv: any
    views: any
    views_state: any
    localStorage: any
    overlays: any
    lazyLoad: any
    iszoom: any
    isloaded: any
    selectedView: any
    selectedIndex: number = 0
    selectedViewIsLoading: any
    _lastSelectedView: any
    visible: any
    isResizing: any
    animation: boolean
    loadingOnUpdate: any
    placeholderImg: any
    drawDimensions: any
    smallScreen: any
    debug: any
    allowZoom:any
    isZoomInBtn: any
    is3d: any
    is3dError: any
    is3dLoaded: any
    is3dWarn: any
    auto3dRotate: any
    iszoomMobile: boolean
    isZoomAnimation: boolean
    isChangeViewAnimation: boolean
    swipeTip: boolean
    isZoomTracking: boolean
    _moveoutOnTrack: boolean

    isTouch: any
    pvs: number = 0
    islazyload: any = false
    _swipeDemoHandler: any
    auto3dRotatePV: any
    _auto3dRotateTimer: any
    _touchStart: any
    _touchLast: any
    _trackStart: number = 0 
    _pv: number = 0
    _pvK: number = 0
    _pvUpdated: number = 0
    _pv_was_changed: any
    __last2Ddx: any
    __last2Dpv: any
    _pvWarnDebouncer: Debouncer
    _zpx: number = NaN
    _zpy: number = NaN
    _observerImgs: any
    _observer: any
    _lastViewsJson: any
    lazyThreshold: any
    lazyMargin: any
    lazyObserve: any
    _imgRect: any
    _lazyLoadIfAnyDebouncer: Debouncer
    _zoomPinchDebouncer: Debouncer
    _resizeDebouncer: Debouncer
    _imgVisibleDebouncer: any
    _onSpriteLoadHandler: any
    _onSpriteErrorHandler: any
    _sprite: any
    _zoomresetDebouncer: Debouncer
    _zoomoutDebouncer: Debouncer | null
    _viewsChanging: any
    setScrollDirection: any
    _mouseWheelDebouncer: Debouncer | null
    _wheelDelta: any
    swipeTipSvg: string = ''
    scrollTarget: HTMLElement
    _lastZoomReset: number
    _zoomAnimationDebouncer: Debouncer
    _changeviewAnimationDebouncer: Debouncer

    //#endregion


    //#region Initiate Component

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this._onSpriteLoadHandler = this._onSpriteLoad.bind(this)
        this._onSpriteErrorHandler = this._onSpriteError.bind(this)

        if (!this.isTouchActionSupported()) 
        {
            this.addEventListener("touchstart", (e) => this.onTouchStart(e))
            this.addEventListener("touchmove", (e) => this.onTouchMove(e))
            this._touchStart = { x: 0, y: 0 }
        }

        this.addEventListener('iron-resize', (e) => this._onResized(e))
        this.addEventListener('mouseout', (e) => this.onMouseOut(e))
        this.track.addEventListener('wheel', (e) => this._onWheel(e), EventPassiveDefault.optionPrepare())


        window.addEventListener('scroll', (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
        document.body.addEventListener('contextmenu', (e) => 
        {
            if (this.smallScreen)
            {
                e.preventDefault()
                e.stopPropagation()
                return false
            }
        })
        document.addEventListener("keydown", (e) => this._onKeydown(e))

        this.isTouch = ('ontouchstart' in document.documentElement)

        this._auto3dRotateTimer = setInterval(() => this._auto3dRotateHandler(), 17)

        // this.swipeTipSvg = `
        //     <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"
        //         x="0px" y="0px" viewBox="0 0 500 666" style="enable-background:new 0 0 500 666;">
        //         <style>
        //             @-webkit-keyframes pointerIcon_Animation{
        //                 0%{-webkit-transform: translate(-250px, -5px);transform: translate(-250px, -5px);}
        //                 6.67%{-webkit-transform: translate(-235px, 2px);transform: translate(-235px, 2px);}
        //                 13.33%{-webkit-transform: translate(-220px, 5px);transform: translate(-220px, 5px);}
        //                 26.67%{-webkit-transform: translate(-200px, 7px);transform: translate(-200px, 7px);}
        //                 40%{-webkit-transform: translate(-170px, 10px);transform: translate(-170px, 10px);}
        //                 53.33%{-webkit-transform: translate(-150px, 11px);transform: translate(-150px, 11px);}
        //                 100%{-webkit-transform: translate(-150px, 11px);transform: translate(-150px, 11px);}
        //             }
                        
        //             @keyframes pointerIcon_Animation{
        //                 0%{-webkit-transform: translate(-250px, -5px);transform: translate(-250px, -5px);}
        //                 6.67%{-webkit-transform: translate(-235px, 2px);transform: translate(-235px, 2px);}
        //                 13.33%{-webkit-transform: translate(-220px, 5px);transform: translate(-220px, 5px);}
        //                 26.67%{-webkit-transform: translate(-200px, 7px);transform: translate(-200px, 7px);}
        //                 40%{-webkit-transform: translate(-170px, 10px);transform: translate(-170px, 10px);}
        //                 53.33%{-webkit-transform: translate(-150px, 11px);transform: translate(-150px, 11px);}
        //                 100%{-webkit-transform: translate(-150px, 11px);transform: translate(-150px, 11px);}
        //             }

        //             #pointerIcon {-webkit-animation-duration: 1.5s;animation-duration: 1.5s;-webkit-animation-iteration-count: infinite;animation-iteration-count: infinite;-webkit-animation-timing-function: cubic-bezier(0, 0, 1, 1);animation-timing-function: cubic-bezier(0, 0, 1, 1);}
        //             #pointerIcon {-webkit-animation-name: pointerIcon_Animation;animation-name: pointerIcon_Animation;-webkit-transform-origin: 50% 50%;transform-origin: 50% 50%;transform-box: fill-box;}
        //             #pointerIcon path { fill-rule: evenodd;clip-rule: evenodd; fill:var(--app-helptips-color); }
        //             #pointerPath path { fill: var(--app-helptips-color) }
        //             #text { fill:var(--app-helptips-color); font-size:1em; }
        //         </style>

        //         <g style="transform: translate(0px, 600px);">
        //             <g id="pointerIcon" data-animator-group="true" data-animator-type="0" >
        //                 <path d="M254.7,28.9c1.7,0,3.3-1.3,3.7-3.2c0.6-2.9,0.7-5.7,0.6-6.6c0-0.9-0.1-1.6-0.6-2.2c-0.6-0.8-1.6-1.1-2-1.2&#10;&#9;c0,0-0.1,0-0.1-0.1c-0.3-0.7-0.7-1.2-1.2-1.4c-0.2-0.1-0.5-0.1-0.7-0.1c-0.4,0-0.8,0.1-1,0.2c-0.3-0.7-0.8-1.1-1.3-1.2&#10;&#9;c-0.1,0-0.3-0.1-0.5-0.1c-0.4,0-0.8,0.1-1.1,0.3c-0.1,0.1-0.2,0-0.2-0.2c-0.1-1.2-0.4-5.4-0.5-7.9c-0.1-0.9-0.7-1.5-1.5-1.5h0&#10;&#9;c-0.9,0-1.5,0.7-1.5,1.7c0,5.5-0.2,11-0.2,12.2c0,0.1,0,0.2-0.1,0.2c-0.5,0.2-1.3,0.6-1.7,1.1c-0.9,1.3-0.5,2.4-0.1,3.2&#10;&#9;c0.6,1.1,1.5,2.7,2.2,4.1c0.9,1.6,2.4,2.5,4,2.5L254.7,28.9z" />
        //             </g>
        //             <g id="pointerPath">
        //                 <path d="M159.7,17.2c-32.1-1-61.5-2.5-86.6-4.4C7,7.6,1,1.6,0.6,0h-0.7c1,8.2,67,15.2,159.8,18V17.2z" />
        //                 <path d="M499.1,0c-0.4,1.6-6.4,7.6-72.5,12.8c-25.1,2-54.7,3.4-86.9,4.4V18c93-2.8,159.2-9.8,160.2-18H499.1z" />
        //             </g>
        //             <text x="250" y="17" text-anchor="middle" alignment-baseline="central" id="text">${this.localize('ui-image-multiview-3d-swipe-tooptip')}</text>
        //         </g>
        //     </svg>
        // `

        //'translate(-500px,25740px) scale(1.0,1.0)'
        var trans = this.smallScreen ? 'translate(-14840px,23468px) scale(2.3,2.3)' : 'translate(-6000px,24940px) scale(1.5,1.5)'
        this.swipeTipSvg = `
            <svg id="e7fjqgbcw5pf1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 21590 27940" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
            <style><![CDATA[#e7fjqgbcw5pf3_to {
                animation: e7fjqgbcw5pf3_to__to 2000ms linear infinite normal forwards}
                @keyframes e7fjqgbcw5pf3_to__to { 
                    0% {transform: translate(10195px,1141.728492px);animation-timing-function: cubic-bezier(0.445000,0.050000,0.550000,0.950000)} 
                    50% {transform: translate(11395px,1141.728492px); animation-timing-function: cubic-bezier(0.445000,0.050000,0.550000,0.950000)} 
                    100% {transform: translate(10195px,1141.728492px)
                } 
            }]]>
            </style>
            <g style="transform: ${trans}; ">
            <g id="e7fjqgbcw5pf2" clip-rule="evenodd">
                <g id="e7fjqgbcw5pf3_to" transform="translate(10195,1141.728492)">
                    <path id="e7fjqgbcw5pf3" d="M10590,1416C10599,1433,10610,1438,10625,1435C10642,1433,10655,1431,10659,1414C10664,1401,10661,1276,10661,1252L10661,766C10660,752,10661,739,10668,728C10680,715,10696,712,10709,715C10744,722,10738,761,10738,786C10738,812,10738,840,10739,866C10738,920,10738,973,10738,1027C10739,1054,10740,1083,10739,1109C10739,1123,10738,1180,10743,1190C10759,1221,10794,1224,10813,1204C10833,1186,10828,1161,10828,1135C10827,1111,10827,1084,10828,1061C10827,1037,10822,1007,10846,994C10871,981,10893,989,10904,1009C10910,1020,10908,1051,10908,1063L10909,1114C10909,1129,10904,1151,10916,1168C10928,1181,10949,1185,10965,1176C10987,1165,10985,1146,10985,1128C10985,1110,10985,1090,10984,1074C10983,1028,11042,1009,11064,1051C11071,1064,11069,1109,11069,1124C11068,1136,11068,1148,11068,1159C11069,1171,11066,1184,11077,1195C11093,1215,11125,1217,11142,1193C11148,1183,11148,1172,11149,1160C11148,1149,11147,1133,11150,1125C11167,1081,11228,1093,11230,1137C11233,1201,11233,1250,11238,1316C11246,1389,11251,1460,11247,1531C11247,1544,11245,1553,11244,1565C11234,1636,11221,1666,11195,1728C11186,1749,11174,1769,11163,1789C11154,1805,11152,1838,11153,1856C11143,1859,10759,1859,10754,1858C10749,1830,10764,1809,10713,1769C10671,1736,10627,1703,10591,1657C10526,1573,10510,1466,10463,1378L10422,1302C10414,1290,10410,1286,10409,1272C10409,1255,10423,1233,10447,1232C10467,1229,10484,1243,10498,1256C10519,1274,10540,1311,10554,1340C10567,1364,10576,1391,10590,1416ZM10546,838C10553,849,10550,865,10538,872C10526,880,10511,876,10504,865C10491,846,10482,825,10476,804C10470,783,10466,760,10466,738C10466,674,10493,615,10535,573C10577,531,10636,504,10700,504C10765,504,10823,531,10865,573C10908,615,10934,674,10934,738C10934,759,10931,780,10925,800C10920,820,10912,839,10901,857C10894,869,10879,873,10867,866C10855,859,10851,843,10858,832C10867,817,10873,802,10877,787C10882,771,10884,755,10884,738C10884,687,10863,642,10830,608C10797,575,10751,554,10700,554C10649,554,10603,575,10570,608C10537,642,10516,687,10516,738C10516,756,10519,773,10524,790C10529,807,10536,823,10546,838ZM10247,767C10257,777,10257,793,10247,803C10237,813,10222,813,10212,803L10106,697L10106,697L10105,696L10088,679L10105,662L10106,661L10106,661L10213,554C10223,544,10239,544,10249,554C10258,564,10258,579,10249,589L10184,654L10399,654C10413,654,10424,665,10424,679C10424,693,10413,704,10399,704L10184,704L10247,767ZM11167,803C11157,813,11142,813,11132,803C11122,793,11122,777,11132,767L11195,704L10980,704C10966,704,10955,693,10955,679C10955,665,10966,654,10980,654L11195,654L11130,589C11120,579,11120,564,11130,554C11140,544,11156,544,11166,554L11273,661L11273,661L11274,662L11291,679L11274,696L11273,697L11273,697L11167,803ZM10602,1303C10576,1255,10537,1195,10486,1178C10389,1145,10319,1246,10364,1322C10368,1330,10373,1335,10377,1343C10406,1397,10429,1443,10451,1500C10490,1606,10505,1659,10587,1741C10621,1775,10644,1791,10679,1818C10696,1832,10695,1834,10694,1854C10695,1873,10688,1910,10729,1918C10739,1919,10756,1918,10767,1919C10781,1918,10793,1918,10806,1918C10859,1917,10909,1918,10961,1917L11153,1917C11165,1918,11180,1919,11194,1910C11219,1893,11211,1863,11212,1838C11214,1817,11212,1822,11223,1803C11226,1796,11229,1792,11231,1787C11246,1756,11267,1717,11276,1684C11279,1678,11280,1674,11283,1667C11288,1653,11292,1628,11296,1613C11305,1579,11310,1517,11309,1481C11306,1421,11302,1346,11296,1285C11292,1251,11291,1199,11290,1167C11289,1141,11292,1112,11273,1084C11249,1047,11209,1033,11171,1040C11161,1042,11135,1051,11128,1060C11123,1048,11126,1033,11106,1006C11067,958,10995,959,10961,993C10939,943,10895,920,10847,931C10823,935,10816,943,10798,956C10798,912,10799,868,10797,825C10796,774,10806,728,10776,690C10728,631,10632,649,10608,717C10600,738,10600,758,10601,780L10602,1172C10602,1184,10604,1295,10602,1303Z" transform="translate(-10698.563091,-1211.500000)" 
                    clip-rule="evenodd" fill="var(--app-helptips-color)" fill-rule="evenodd" stroke="none" stroke-width="1"/>
                </g>
            </g>
            </g>
            </svg>
        `
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()

        this._stopObserving()
        if (this._observerImgs) { this._observerImgs.disconnect() }        
        if (this._auto3dRotateTimer) { clearInterval(this._auto3dRotateTimer) }
    }

    ready()
    {
        super.ready()

        this._observerImgs = new FlattenedNodesObserver(this.track, (info: any) =>
        {
            // console.log('FlattenedNodesObserver ... ', info)
            this._calcBoundingRect()
        })
    }

    //#endregion


    //#region Public Methods

    reset()
    {
        this.islazyload = false
        this.iszoom = false
        this.views_state = []
        // console.log('reset')
    }

    lazyLoadIfAny()
    {
        this._lazyLoadIfAnyDebouncer = Debouncer.debounce(this._lazyLoadIfAnyDebouncer, timeOut.after(150), () =>
        {
            this.islazyload = true
            
            if (this.views_state == undefined) { return }
            var sv = this.views_state[this.selectedIndex]
            if (sv) { this._startLoadViewImage(sv, this.selectedIndex, true) }
        })
    }

    switchSizemeter()
    {
        var drawDimensions = (this.drawDimensions === null ? true : !this.drawDimensions)
        if (drawDimensions)
        {
            this.pv = 15 //set default
        }
        this.set('drawDimensions', drawDimensions)
        
        return drawDimensions
    }

    //#endregion


    //#region Events Handlers

    _onKeydown(e)
    {
        var f = document.activeElement == document.body
        if (!this.visible || !f || e.altKey || e.shiftKey) { return }

        var kk = keyboardEventMatchesKeys
        e = e || window.event

        // console.log(e)

        var ck = keyboardEventMatchesKeys
        var leftDir = ck(e, 'left')
        var rightDir = ck(e, 'right')

        if (f && (leftDir || rightDir))
        {
            if (e.ctrlKey)
            {
                //switch view
                if (leftDir)
                {
                    this.onImageBefore()
                }
                else if (rightDir)
                {
                    this.onImageNext()
                }
                e.preventDefault()
                e.stopPropagation()
            }
            else if (this.is3dLoaded && !this.iszoom)
            {
                //change point of view
                var pv = this.pv + (leftDir ? -1 : 1)
                this._setPV(pv)
                e.preventDefault()
                e.stopPropagation()
            }
        }
    }
    
    on3DTap(e)
    {
        this.auto3dRotatePV = Math.round(this.pvs / 2) + (this.auto3dRotate ? this.auto3dRotatePV : 0)
        this.auto3dRotate = true
    }

    onSizemeterTap(e)
    {
        this.switchSizemeter()
    }

    onTouchStart(e)
    {
        try
        {
            this._touchStart.x = e.pageX
            this._touchStart.y = e.pageY
        } 
        catch (ex) 
        { 
            //
        }
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
        catch (ex) 
        { 
            //
        }
    }

    onMouseMove(e)
    {
        if (!this.iszoom || this._trackStart || !this.visible) { return }

        this._zoomReset('mousemove', e)
    }

    onMouseOut(e)
    {
        if (!this.iszoom || this._trackStart || !this.visible) { return }

        this._zoomReset('mouseout', e)
    }

    onImageBefore(e?)
    {
        for (var i in this.views_state)
        {
            var ii = parseInt(i) - 1
            if (this.views_state[i].Selected && (ii >= 0))
            {
                this._changeView(i, ii)
                break
            }
        }
    }

    onImageNext(e?)
    {
        for (var i in this.views_state)
        {
            var ii = parseInt(i) + 1
            if (this.views_state[i].Selected && this.views_state.length > (ii))
            {
                this._changeView(i, ii)
                break
            }
        }
    }

    onTapSelector(e)
    {
        if (e.detail) { this.blur() }
        
        var id = e.model.__data.viewi.ViewId
        var i = -1
        var ii = -1
        for (var k in this.views_state)
        {
            if (this.views_state[k].Selected) { i = parseInt(k) }
            if (this.views_state[k].ViewId == id) { ii = parseInt(k) }
            if (i >= 0 && ii >= 0) { break }
        }

        if (i >= 0 && ii >= 0) 
        { 
            this._changeView(i, ii)
        }
    }

    onSelectorTrack(e)
    {
        // console.log('onSelectorTrack', e)
        if (!Array.isArray(this.views_state)) { return }
        var st = e.detail.state
        var dx = e.detail.dx
        // var dy = e.detail.dy
        var r = this._imgRect
        if (!r.width) 
        { 
            this._calcBoundingRect() 
            return
        }

        switch (st)
        {
            case 'start':
                break
            case 'track':
                break
            case 'end':
                var sx = Math.log(1 + Math.abs(dx / r.width)) * 15
                if (dx < 0) { sx = -sx }

                var i = this.selectedIndex
                var ii = Math.round(sx*-1)

                if (ii < 0) { ii = 0 }
                if (ii >= this.views_state.length) { ii = (this.views_state.length > 0 ? this.views_state.length - 1 : 0) }

                this._changeView(i, ii)
                break
        }
    }

    onZoomOut(e)
    {
        if (!this.iszoom || this._trackStart) { return }

        this._zoomReset('zoomout', e)
        this.iszoom = false
    }

    onZoomIn(e)
    {
        if (!this.allowZoom || this.selectedViewIsLoading) { return }
        e['zoominbtn'] = true
        this._zoomReset('zoom' + (this.iszoom ? 'out' : 'in'), e)
    }
    
    onDblClicked(e)
    {
        this.onZoomIn(e)
    }

    _onWheel(e)
    {
        // console.log(e.ctrlKey, e)
        var epath = e.path || e.composedPath()
        if (epath.filter(i => { return i == this.track }).length <= 0) { return }
        if (e.ctrlKey || !e.shiftKey) { return }

        var delta = (e.deltaX - e.deltaY)
        // console.log(delta)
        switch (e.deltaMode)
        {
            default:
            case 0: //pixel
                delta = delta / 3
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
            var te = {  state: 'track',  dx: 0,  dy: 0,  state_src: 'wheel', }
            const me = { __data: { viewi: this.selectedView, index: this.selectedIndex, } }

            if (!this._mouseWheelDebouncer)
            {
                te.state = 'start'
                this._wheelDelta = 0
                this.onTrack({ detail: te, model: me }) //handle event
                te.state = 'track'
            }
            this._mouseWheelDebouncer = Debouncer.debounce(this._mouseWheelDebouncer, timeOut.after(250), () => 
            {
                te.state = 'end'
                te.dx = this._wheelDelta
                this.onTrack({ detail: te, model: me }) //handle event
                this._mouseWheelDebouncer = null
            })
            this._wheelDelta += delta
            // if (Math.sign(this._wheelDelta) != Math.sign(delta)) { this._wheelDelta -= delta }
            te.dx = this._wheelDelta
            this.onTrack({ detail: te, model: me }) //handle event
        }

        // e.preventDefault()
        if (e?.stopPropagation) { e.stopPropagation() }
        return false

    }

    onTrack(e)
    {
        var viewi = e.model.__data.viewi
        var inx = e.model.__data.index
        // var pv = e.model.__data.pv
        // console.log(inx, viewi, e)

        var st = e.detail.state
        var dx = e.detail.dx
        var dy = e.detail.dy
        var r = this._imgRect
        var pv = this.pv
        if (!Number.isInteger(pv)) { pv = 0 }
        
        if (!r.width) 
        {
            this._calcBoundingRect()
            return
        }

        // console.log(dx)

        //2d roatation handler
        if (viewi.is3dLoaded !== true && this.is3d && this.selectedViewIsLoading) 
        {
            this.set('views_state.' + inx + '.is3dWarn', !viewi.is3dLoaded)
            if (this.views_state[inx].is3dWarn == true)
            {
                this._pvWarnDebouncer = Debouncer.debounce(this._pvWarnDebouncer, timeOut.after(pvWarnDebounceTime), () => 
                {
                    this.set('views_state.' + inx + '.is3dWarn', false)
                })
            }

            //////// ROTATION 3d simulation 2d -------
            if (st === "start")
            {
                this._zoomReset('trackstart', e)
                this.hndlRotate('trackstart', pv, inx, r, dx, dy)
            }
            else if (st === "track")
            {
                this.hndlRotate('track_2d', pv, inx, r, dx, dy)
                // hndlRotate('track_3d')
            }
            else if (st === "end")
            {
                this.hndlRotate('trackend', pv, inx, r, dx, dy)
                this._zoomReset('trackend', e)
            }
        }

        if (this.is3dLoaded && this.iszoom && this._asBool(st))
        {
            var etype = `track${StringUtil.replaceAll(st, 'track', 'move')}`
            this._zoomReset(etype, e)
            e.stopPropagation()
            e.preventDefault()
        }


        ////////////////////////////////////////////////////////
        if (!this.is3dLoaded || this.iszoom) { return } ///EXIT
        ////////////////////////////////////////////////////////

        // if (img.style.transform != 'none') { img.style.transform = 'none' } //reset rotation

        //////// ROTATION 3d -------
        if (st === "start")
        {
            this._zoomReset('trackstart')
            this.hndlRotate('trackstart', pv, inx, r, dx, dy)
        }
        else if (st === "track")
        {
            this.hndlRotate('track_3d', pv, inx, r, dx, dy)
        }
        else if (st === "end")
        {
            this.hndlRotate('trackend', pv, inx, r, dx, dy)
            this._zoomReset('trackend')

            if (this.localStorage) { this.set('localStorage.swipeTipDone', true) }
        }
    }

    hndlRotate(t, pv, inx, r, dx, dy)
    {
        // console.log(dx)
        // var dc = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
        // dx = dc
        var multiSwipe = (this._touchLast && this._touchLast.multiSwipe)
        if (!this.views || this.views.length < 2) { multiSwipe = false } //ignore multiSwipe

        var r_width = r ? r.width : 10

        if (t == 'trackstart') 
        {
            if (multiSwipe)
            {
                //
            }
            else
            {
                this._trackStart = this._now()
                this._pv = pv
                this._pvK = 1 / r_width / Math.PI * this.pvs / 0.33
                this.animation = false

                this.__last2Ddx = 0
            }
        }
        else if (t == 'track_2d')
        {
            if (multiSwipe)
            {
                if (dx > 0) { this.onImageBefore() } else { this.onImageNext() }
            }
            else
            {
                this.animation = false
                var sx = Math.log(1 + Math.abs(dx / r_width)) * 15
                if (dx < 0) { sx = -sx }
                // console.log('.pv2d', sx, r_width)
                this.set('views_state.' + inx + '.pv2d', sx)
                if (!Teamatical._browser.iPhone) { this.style.perspective = '800px' } 
            }
        }
        else if (t == 'track_3d')
        {
            if (multiSwipe)
            {
                if (dx > 0) { this.onImageBefore() } else { this.onImageNext() }
            }
            else
            {
                pv = this._pv + Math.floor(dx * this._pvK)
                this._setPV(pv)



                //2d transform for smoothness
                // console.log('pv 2d', this.__last2Dpv, pv, dx, this.__last2Ddx)
                if (this.__last2Dpv == pv) 
                {
                    this.animation = false
                    var v = (dx - this.__last2Ddx)
                    var sx = Math.log(1 + Math.abs((dx - this.__last2Ddx) / r_width)) * 15 * 3
                    if ((dx - this.__last2Ddx) < 0) { sx = -sx }
                    this.set('views_state.' + inx + '.pv2d', sx)
                    if (!Teamatical._browser.iPhone) { this.style.perspective = '800px' } 
                }
                else 
                {
                    this.__last2Dpv = pv
                    this.__last2Ddx = dx
                }
            }
        }
        else if (t == 'trackend')
        {
            this._trackStart = 0
            if (multiSwipe)
            {
                //
            }
            else
            {
                this.set('views_state.' + inx + '.pv2d', 0)
            }

            this.async(() =>
            {
                this.style.perspective = ''
                this.animation = true
            }, 400)
        }
    }

    _setPV(pv)
    {
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
    }

    _zoomAnimationEnd(e?)
    {
        this.isZoomAnimation = false
    }

    _changeViewAnimationEnd(e?)
    {
        this.isChangeViewAnimation = false
    }

    onTransitionEnd(e)
    {
        // console.log(e)
        this._changeViewAnimationEnd()
        this._zoomAnimationEnd()
    }

    _onScroll(e)
    {
        if (!this.visible) { return }

        this._zoomReset('scroll', e)
    }

    _onResized(e?)
    {
        if (!this.visible) { return }

        this._zoomReset('resize')

        // this.isResizing = true
        this._resizeDebouncer = Debouncer.debounce(this._resizeDebouncer, timeOut.after(resizeHideDebounceTime), () =>
        {
            this.isResizing = false
            this._calcBoundingRect()
        })
    }

    _auto3dRotateHandler()
    {
        if (!this.auto3dRotate) { return }
        // console.log(new Date().getMilliseconds())

        var viewi = this.selectedView
        var inx = this.selectedIndex
        var r = this._imgRect
        var pv = this.pv
        if (!Number.isInteger(pv)) { pv = 0 }
        var dx = (1 / this._pvK) * 1.01
        var dy = 0
        this.hndlRotate('trackstart', pv, inx, r, 0, dy)
        this.hndlRotate('track_3d', pv, inx, r, dx, dy)
        this.hndlRotate('trackend', pv, inx, r, 0, dy)

        this.auto3dRotatePV -= 1
        if (this.auto3dRotatePV <= 0)
        {
            this.auto3dRotate = false
        }
    }

    //#endregion


    //#region Helpers

    _changeView(i, ii)
    {
        // if (this._pv_was_changed && Array.isArray(this.views_state) && this.views_state.length > 1)
        // {
        //     //clear views_state with first frame - due PointOfView was changed
        //     for (var j in this.views_state)
        //     {
        //         // delete this.views_state[j].ImageUrl
        //         this.views_state[j].pv_has_changed = true
        //     }
        //     console.log('clear views_state with first frame - due PointOfView was changed', this.views_state)
        // }

        this.views_state[i].Selected = false
        this.views_state[ii].Selected = true
        if (ii > i)
        {
            this.notifyPath('views_state.' + i + '.Selected')
            this.notifyPath('views_state.' + ii + '.Selected')
        }
        else
        {
            this.notifyPath('views_state.' + ii + '.Selected')
            this.notifyPath('views_state.' + i + '.Selected')
        }

        if (i != ii) 
        { 
            this.isChangeViewAnimation = true
            this._changeviewAnimationDebouncer = Debouncer.debounce(this._changeviewAnimationDebouncer, timeOut.after(ChangeviewAnimationDebounceTime), () => this._changeViewAnimationEnd())
            Vibrator.imageSwitch() 
        } 
        else 
        { 
            Vibrator.imageSwitchFailed() 
        }
    }

    _calcBoundingRect()
    {
        if (this.visible !== true || this.iszoom) { return }
        // console.log('_calcBoundingRect')

        var imgs = this.track.querySelectorAll('img.product-view')
        for (var i in imgs) 
        {
            if (imgs[i] instanceof HTMLImageElement)
            {
                // console.log(imgs[i])
                this.setScrollDirection('y', imgs[i]) 
            }
        }

        var img:any = imgs && imgs.length > 0 ? (imgs.length >= (this.selectedIndex + 1) ? imgs[this.selectedIndex] : imgs[0]) : null
        if (!img) 
        { 
            afterNextRender(this, () => { this._calcBoundingRect() })
            return 
        }

        // console.log(this.getBoundingClientRect())
        var r = img.getBoundingClientRect()
        this._imgRect = {
            left: r.left + this.windowScrollX,
            top: r.top + this.windowScrollY,
            width: r.width,
            height: r.height,
            naturalWidth: img.naturalWidth
        }
    }

    _visibleChanged(v)
    {
        if (v === false)
        {
            this.animation = false

            if (this._pvWarnDebouncer) { this._pvWarnDebouncer.cancel() }
            if (this._lazyLoadIfAnyDebouncer) { this._lazyLoadIfAnyDebouncer.cancel() }
            if (this._zoomPinchDebouncer) { this._zoomPinchDebouncer.cancel() }
            if (this._resizeDebouncer) { this._resizeDebouncer.cancel() }
            if (this._imgVisibleDebouncer) { this._imgVisibleDebouncer.cancel() }
            if (this._zoomresetDebouncer) { this._zoomresetDebouncer.cancel() }
            if (this._zoomoutDebouncer) { this._zoomoutDebouncer.cancel() }
            if (Array.isArray(this._sprite))
            {
                for (var i in this._sprite)
                {
                    if (this._sprite[i]) { this._sprite[i].src = '' }
                }
                this._sprite = {}
            }

            this.isResizing = false
            this.iszoom = false
            this.auto3dRotate = false
            this.isloaded = false
        }
        else if (v === true)
        {
            if (!this.iszoom) { this._zoomReset('resize') }

            this._imgVisibleDebouncer = Debouncer.debounce(this._imgVisibleDebouncer, timeOut.after(250), () =>
            {
                this.animation = true
            })
        }
    }

    _computeSelectedView(views_state, viewsP)
    {
        return views_state ? views_state.filter((itemi, i) => { 
            // console.log('_computeSelectedView', itemi, i)
            if (itemi.Selected) { this.selectedIndex = parseInt(i) }
            return itemi.Selected 
        })[0] : null
    }

    _compute_isZoomLoaded(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return true }
        return sv.iszoomloaded == true
    }

    _compute_isZoomLoading(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return true }
        return sv.iszoomloading == true
    }
    
    _compute_isMeasureBtn(views_state, views_stateP, hasDimensions)
    {
        if (!hasDimensions) { return false }
        var selectedView = this._computeSelectedView(views_state, views_stateP)
        // console.log(selectedView?.firstLoad, hasDimensions)
        var v = (this._asBool(selectedView)) // && this._asBool(selectedView.firstLoad))
        return v
    }

    _compute_isZoomOutBtn(views_state, viewsP, allowZoom)
    {
        var selectedView = this._computeSelectedView(views_state, viewsP)
        var v = allowZoom && (selectedView && selectedView.zoom)
        // console.log(allowZoom, selectedView, ' ----> ', v)
        return v
    }

    _compute_isZoomInBtn(views_state, viewsP, allowZoom, selectedViewIsLoading)
    {
        if (!allowZoom || selectedViewIsLoading) { return false }

        var selectedView = this._computeSelectedView(views_state, viewsP)
        var v = (selectedView && !selectedView.zoom)
        return v
    }

    _computeSelectedViewIsLoading(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return true }
        return sv.isloading == true
    }

    // _computeSelectedViewIsLoading3D(views_state, viewsP)
    // {
    //     var sv = this._computeSelectedView(views_state, viewsP)
    //     if (!sv) { return true }
    //     return sv.isloading3d == true
    // }

    _computeIsLoaded(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return false }

        // console.log('_computeIsLoaded', views_state, viewsP)
        return sv && sv.isloaded === true
    }

    _computeIs3d(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return false }

        var src3d = sv.ImageUrl3DFrames
        var is3dError = sv.is3dError
        return typeof (src3d) == 'string' && src3d.length > 0 && is3dError !== true
    }

    _computeIs3dError(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return false }

        return sv && sv.is3dError === true
    }

    _computeIs3dWarn(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return false }

        return sv && sv.is3dWarn === true
    }

    _computeIs3dLoaded(views_state, viewsP)
    {
        var sv = this._computeSelectedView(views_state, viewsP)
        if (!sv) { return false }

        return sv && sv.is3dLoaded === true
    }

    _computeAllowViews(src_views, iszoom)
    {
        return (Array.isArray(src_views) && src_views.length > 1 && iszoom !== true) ? true : false
    }

    _computeDisabledImageBefore(srcViews, srcViewsP)
    {
        if (!Array.isArray(srcViews)) { return }

        for (var i in srcViews)
        {
            if (srcViews[i].Selected && parseInt(i) == 0)
            {
                return true
            }
        }
        return false
    }

    _computeDisabledImageNext(srcViews, srcViewsP)
    {
        if (!Array.isArray(srcViews)) { return }

        var l = srcViews.length - 1
        for (var i in srcViews)
        {
            if (srcViews[i].Selected && parseInt(i) == l)
            {
                return true
            }
        }
        return false
    }

    _computeHideSwipeTip(swipeTipDone, is3dLoaded, swipeTip)
    {
        let v = is3dLoaded !== true || (swipeTipDone === true) || !swipeTip
        var swipe = 1

        if (!v)
        {
            if (this._swipeDemoHandler) { clearInterval(this._swipeDemoHandler) }
            this._swipeDemoHandler = setInterval(() => {
                if (!this.auto3dRotate && swipe == 4)
                {
                    this.auto3dRotatePV = 1
                    this.auto3dRotate = true
                }
                swipe++
                if (swipe > 20) { swipe = 1}
            }, 100)
        }
        else
        {
            if (this._swipeDemoHandler) { clearInterval(this._swipeDemoHandler) }
        }
        return v
    }

    _loaderStyle(sv_isloading)
    {
        // console.log('_loaderStyle', sv_isloading)
        var img = sv_isloading ? this._loader_anim() : ''
        var style_v = 'background-image:' + (img ? "url('" + img + "')" : "''")

        if (this.debug && img != '' && this.is3d && this.isloaded && !this.is3dLoaded) { style_v += ';border: 3px dashed red' }
        else if (this.debug && img != '') { style_v += ';border: 3px dashed green' }

        return style_v
    }

    _containerStyle(selectedIndex, viewi, viewiP)
    {
        var viewi = this._computeSelectedView(viewi, viewiP)
        // console.log('_containerStyle')
        var isloaded = viewi ? viewi.isloaded : false
        var is3dLoaded = viewi ? viewi.is3dLoaded : false
        var pv2d = viewi ? viewi.pv2d : 0
        var style_v = ""

        var rotate2d = isloaded && is3dLoaded !== true && Math.abs(pv2d) > 0
        // var rotate2d = isloaded && Math.abs(pv2d) > 0
        if (rotate2d) { style_v += 'overflow: inherit;' }
        return style_v
    }

    _viewStyle(sindex, index, pv, viewi, viewiP, zoomPinch)
    {
        var forceloading = viewi ? viewi.forceloading : false
        var isloading = viewi ? viewi.isloading : false
        var isloaded = viewi ? viewi.isloaded : false
        var is3dLoaded = viewi ? viewi.is3dLoaded : false
        var keep3d = viewi ? viewi.keep3d : false
        var keep3dUrl = viewi ? viewi.keep3dUrl : ''
        var pv2d = viewi ? viewi.pv2d : 0
        var zoom = viewi ? viewi.zoom : null
        var zoomold = viewi ? viewi.zoomold : null
        var baseW = 576
        var baseH = 768
        if (this._imgRect && this._imgRect.width) { baseW = this._imgRect.width }
        if (this._imgRect && this._imgRect.height) { baseH = this._imgRect.height }


        var ii = parseInt(index)
        var viewi_Selected = (ii == sindex)
        var tx = (ii - sindex) * baseW
        var ty = viewi_Selected ? 0 : 0.3 * baseW
        // console.log('_styleView', sindex, index, pv, 'fl:', forceloading, 'isling:', isloading, 'isld:', isloaded, 'is3d:', is3dLoaded)

        ///build - TRANSFORM
        var style_v = "transform:"
        if (tx || ty) { style_v += " translate(" + tx + "px," + ty + "px) " }
        style_v += (viewi_Selected ? '' : ' scale(0.4)')
        var rotate2d = isloaded && is3dLoaded !== true && Math.abs(pv2d) > 0
        // var rotate2d = isloaded && Math.abs(pv2d) > 0
        // console.log(pv2d, is3dLoaded)
        if (rotate2d)
        {
            style_v += ' rotate3d(0, 1, 0, ' + (pv2d) + 'deg)'
        }

        if (style_v == "transform:") { style_v = '' } else { style_v += ';' }

        if (rotate2d)
        {
            style_v += 'transition: none 0s ease 0s;'
        }

        // if (isloaded && is3dLoaded !== true && Math.abs(pv2d) > 0)
        // {
        //     style_v += 'perspective: 800px;'
        // }

        // style_v += isblank ? 'transition: unset; opacity: 0' : ''
        style_v += isloading && forceloading ? 'opacity: 0;' : ''

        if ((is3dLoaded || keep3d) && Number.isInteger(ii) && this.views_state)
        {
            if (zoom && viewi.zoomloaded && viewi.zoomloaded[pv])
            {
                // console.log('zoom BIG')
                const zoomimgUrl = viewi.ImageUrlZoom
                style_v += `background-position: 0px 0px;`
                style_v += `background-image: url("${zoomimgUrl}");`
            }
            else
            {
                var y = pv * 6.666666666666667
                // no-repeat is required for proper functioning on Android
                style_v += 'background-position: ' + "0px " + y + "%" + ';'
    
                // var framesUrl = this.views_state[ii] ? this.views_state[ii].ImageUrl3DFrames : ''
                var framesUrl = viewi ? viewi.ImageUrl3DFrames : ''
                var url = keep3d ? keep3dUrl : framesUrl
                style_v += 'background-image: ' + 'url("' + url + '")' + ';'
            }
        }

        // console.log(zoomPinch)
        if (zoom) //|| (zoomPinch && zoomPinch.scale < 1))
        {
            // var tx = 20 - Math.round(i * this._elementWidth)
            // if (!Number.isNaN(tx) && width > 0)
            // {
            //     this.slides.style.transform = `translate(${tx}px,0)`
            // }
    
            // var stw = width * width / this._paneWidth
            // if (!isFinite(stw) || stw < 1) { stw = 1 }
            // var stx = width * ((i * this._elementWidth) / this._paneWidth)
            // if (!isFinite(stx)) { stx = 0 }
            // this.scrollTick.style.width = `${stw}px`
            // this.scrollTick.style.transform = "translate(" + stx + "px,0)"

            
            // if (zoomPinch && zoomPinch.scale < 1)
            // {
            //     zoom = zoomPinch
            // }
            // console.log(zoom)

            style_v += `transform-origin: ${zoom.x}px ${zoom.y}px; transform: scale(${zoom.scale});`
            // style_v += 'transition: none 0s ease 0s;'
            // style_v += `transform-origin: 0px 0px; transform: translate(50%, 50%) scale(${zoom.scale}) translate(-50%, -50%) translate(${zoom.x}px, ${zoom.y}px);`
            // baseW
            // transform-origin: -100% 50%; transform: rotate(45deg);
            // transform-origin: 0 0; transform: translate(-100%, 50%) rotate(45deg) translate(100%, -50%);
            style_v += 'touch-action: pan-y pan-x;'
        }
        else
        {
            if (zoomold)
            {
                style_v += `transform-origin: ${zoomold.x}px ${zoomold.y}px;`
            }
            // style_v += 'touch-action: pan-y;'
        }

        return style_v
    }

    _viewSource(src, is3dLoaded, keep3d, ImageUrl, ImageUrlZoom, zoomloaded, viewinx)
    {
        var issrc = (typeof src == 'string' && src.length > 0)
        if (is3dLoaded || (keep3d && src != ImageUrl)) { issrc = false }
        var img =  issrc ? src : this._trans_image()
        if (zoomloaded && ImageUrlZoom && !is3dLoaded) { img = ImageUrlZoom }
        return img
    }

    _viewHasImage(viewi)
    {
        if (!viewi) { return false }
        return (viewi.src == viewi.ImageUrl)
    }

    //#endregion


    //#region Helpers - Zoom

    detailx: number = -1
    detaily: number = -1
    zoomRect: any
    _suppressScrollOut: boolean
    _zoomScrollAnimationDebouncer: Debouncer
    _zoomReset(type, e?)
    {
        var animstop = () => 
        {
            // this.img.style.transition = 'none'
            if (!this.iszoom)
            {
                // this.style.overflow = ''
                this.iszoomMobile = false
                // this.setAttribute("style", "") // this.style = ''
                // this.classList.toggle('zoom-progress', false)
            }
        }
        var animstart = () => 
        {
            // this.img.style.transition = 'transform .2s ease-in-out'
        }

        var limitrange = (x, y, r) => 
        {
            if (x < 0) { x = 0 }
            if (y < 0) { y = 0 }
            if (x > r.width) { x = r.width }
            let limity = this.smallScreen ? 358 : r.height
            if (y > limity) { y = limity }
            return {x, y}
        }

        var zoomin = (e) => 
        {
            if ((this._now() - this._lastZoomReset) > 250)
            {
                this._calcBoundingRect()
            }

            var r = this._imgRect, x, y
            var zf = 18 / 6
            if (this._asBool(e.clientX)) //mouse click
            {
                x = e.clientX + this.windowScrollX - r?.left
                y = e.clientY + this.windowScrollY - r?.top
            }
            else if (e['zoominbtn'])
            {
                x = r?.width / 2 + this.windowScrollX
                y = r?.height / 2 + this.windowScrollY - r?.height / 3
                this.detailx = x
                this.detaily = y
            }
            else if (!this.isTouch && e.type == 'track') //desktop track
            {
                x = e.detail.x + this.windowScrollX - r?.left
                y = e.detail.y + this.windowScrollY - r?.top
            }
            else if (this.isTouch && !e['zoominbtn']) //mobile track
            {
                if (type == 'trackstart')
                {
                    this.zoomRect = window?.visualViewport ? window?.visualViewport : this._imgRect
                    // console.log(type, 'start:', this.detailx, 'x', this.detaily, ' delta:', e.detail.dx, 'x', e.detail.dy, ' RECT: ', this.zoomRect.width, 'x', this.zoomRect.height)
                    this.detailx = e.detail.x
                    this.detaily = e.detail.y
                }
                x = r?.width - (this.detailx + e.detail.dx * 3)
                y = r?.height - (this.detaily + e.detail.dy * 3)
            }

            if (!isNaN(this._zpx))
            {
                x = (x - this._zpx) / zf + this._zpx
                y = (y - this._zpy) / zf + this._zpy
            }
            var { x, y } = limitrange(x, y, r)
            this._zpx = x
            this._zpy = y


            
            var sv = this.views_state ? this.views_state[this.selectedIndex] : null
            if (sv && sv.ImageUrlZoomBase) //FIX: && (!sv.zoomloaded || !sv.zoomloaded[this.pv]))
            {
                sv.ImageUrlZoom = sv.ImageUrlZoomBase + `&${sv.ImageUrlZoomFrames[this.pv]}`
                this._startLoadViewImageZoom(sv, this.selectedIndex, this.pv)
            }

            var zoom = {
                scale: zf,
                x: x,
                y: y,
            }
            
            if (this.views_state)
            {
                for (var i in this.views_state)
                {
                    this.set('views_state.' + i + '.zoom', zoom)
                }
            }

            if (this.smallScreen)
            {
                this.iszoomMobile = true
                document.body.classList.toggle('zoom-progress', true)
            }
            this.isZoomAnimation = true
            this._zoomAnimationDebouncer = Debouncer.debounce(this._zoomAnimationDebouncer, timeOut.after(ZoomAnimationDebounceTime), () => this._zoomAnimationEnd())

            this._suppressScrollOut = true
            this._zoomScrollAnimationDebouncer = Debouncer.debounce(this._zoomScrollAnimationDebouncer, timeOut.after(ZoomScrollAnimationDebounceTime), () => { this._suppressScrollOut = false  })
            window.scroll(0, 0)
        }

        var zoomout = () => 
        {
            // this.img.style.transform = 'none'
            if (this.views_state)
            {
                for (var i in this.views_state)
                {
                    this.set('views_state.' + i + '.zoomold', this.views_state[i].zoom)
                    this.set('views_state.' + i + '.zoom', null)
                }
            }
            this._zpx = NaN
            this._zpy = NaN

            var selview = this.selectedView
            if (selview?.zoom?.scale != selview?.zoomold?.scale)
            {
                this.isZoomAnimation = true
                this._zoomAnimationDebouncer = Debouncer.debounce(this._zoomAnimationDebouncer, timeOut.after(ZoomAnimationDebounceTime), () => this._zoomAnimationEnd())
            }
            document.body.classList.toggle('zoom-progress', false)
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
        if ((type == 'mouseout' && !this.isTouch) || (type == 'scroll' && !this._suppressScrollOut))
        {
            if (this.isZoomTracking) { this._moveoutOnTrack = true }
            this._zoomresetDebouncer = Debouncer.debounce(this._zoomresetDebouncer, timeOut.after(500), () => hdle(false, e))
        }
        else if (type == 'mousemove' || type == 'trackmove')
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
            if (type == 'trackstart')
            {
                this.isZoomTracking = true
                if (this.iszoom) { zoomin(e) }
            }
            else if (type == 'trackend')
            {
                this.isZoomTracking = false
                if (this._moveoutOnTrack)
                {
                    this._zoomresetDebouncer = Debouncer.debounce(this._zoomresetDebouncer, timeOut.after(500), () => hdle(false, e))
                }
                this._moveoutOnTrack = false
                if (this.iszoom) { zoomin(e) }
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
        else if (type == 'update')
        {
            hdle(false, e)
        }

        this._lastZoomReset = this._now()
    }

    //#endregion


    //#region Preload Image (Single)

    _viewsUpdated(views, viewsP)
    {
        if (this._viewsChanging) { return }
        var viewsJson = JSON.stringify(views)
        if (this._lastViewsJson == viewsJson) { return }
        this._lastViewsJson = viewsJson
        if (viewsJson && this.views_state)
        {
            views = JSON.parse(viewsJson)
            for (var i in views)
            {
                var vs = this.views_state.filter(k => { return k.ViewId == views[i].ViewId })[0]
                if (vs) 
                {
                    views[i].src = vs.src //for 2d images
                    views[i].keep3d = vs.is3dLoaded   //for 3d images
                    views[i].keep3dUrl = vs.keep3dUrl //for 3d images

                    // console.log('_viewsChanged', i, vs, 'viewsi[i]', views[i])

                    // views[i].is3dLoaded = vs.is3dLoaded
                    // views[i].isloaded = vs.isloaded
                    // views[i].imgloadingDebouncer = vs.imgloadingDebouncer
                    // views[i].forceloading = vs.forceloading
                    // views[i].isloading = vs.isloading
                    // views[i].isready = vs.isready
                    // views[i].pv2d = vs.pv2d
                }
            }
        }
        // console.log('this.views_state = views - viewsP', viewsP)
        // console.log('this.views_state = views - this.views_state', this.views_state ? JSON.parse(JSON.stringify(this.views_state)) : '')
        // console.log('this.views_state = views - views', views ? JSON.parse(JSON.stringify(views)) : '')

        this._pv_was_changed = false
        this.views_state = views
        this._zoomReset('update')
    }

    _views_stateUpdated(views_stateP)
    {
        // if (views_stateP.path.indexOf('.zoom') > 0)
        // {
        //     console.log(views_stateP)
        // }

        if (views_stateP.path.indexOf('.Selected') > 0)
        {
            var path = views_stateP.path.replace('views_state', 'views')
            // console.log(path, views_stateP.value)
            this._viewsChanging = true
            this.set(path, views_stateP.value)
            this._viewsChanging = false
        }
    }

    _viewsAndLazyChanged(views_state, selectedIndex, lazyLoad)
    {
        if (views_state == undefined || lazyLoad == undefined || selectedIndex == undefined
            || (Array.isArray(views_state) && views_state.length < 1) 
            || !views_state[selectedIndex]) 
        { 
            return 
        }
        var sv = selectedIndex
        // console.log('_viewsAndLazyChanged', views_state[0], selectedIndex, lazyLoad)

        this._stopObserving()
        this.islazyload = false

        if (Teamatical._browser.allowLazyload && this.lazyLoad)
        {
            var imgs = this.track.querySelectorAll('img.product-view')
            // console.log(imgs ? imgs.length : '')
            if (imgs && imgs.length > 0) 
            {
                this._startObserving()
            }
            else
            {
                afterNextRender(this, () => { this._startObserving() })
            }
        }
        else
        {
            this._startLoadViewImage(sv, selectedIndex)
        }
    }

    _startLoadViewImage(viewi, selectedIndex, lazyload = false)
    {
        // console.log('_viewsAndLazyChanged -> _startLoadViewImage view.' + selectedIndex + ' | ' + (!viewi ? 'null' : '-'))

        if (!viewi) { return }

        if (this._lazyLoadIfAnyDebouncer) { this._lazyLoadIfAnyDebouncer.cancel() }
        
        // console.log('single image or 3d image preview', viewi, this._pv_was_changed)
        // this._cancelLoadViewImage3D(viewi)
        this._stopSpriteLoading(viewi.ViewId)

        var sv = this.views_state ? this.views_state[selectedIndex] : null
        
        if (sv && sv.forceloading) { this.set('views_state.' + selectedIndex + '.forceloading', false) }
        if (sv && sv.imgloadingDebouncer && typeof(sv.imgloadingDebouncer.cancel) == 'function' ) { sv.imgloadingDebouncer.cancel() }

        if (viewi.ImageUrl && !viewi.isloaded && this._pv_was_changed != true) //2D
        {
            // if (viewi.src == viewi.ImageUrl) { return }
            // if (this.debug) { console.warn('start loading ' + (viewi.ImageUrl3DFrames ? 'preview ' : 'view ')  + viewi.ImageUrl.substr(-20)) }
            // console.warn('start loading', viewi.ImageUrl.substr(-20))
            // if (this.debug) { console.warn('start loading 2d view or preview' + viewi.ImageUrl.substr(-20)) }

            // var loadingOnUpdate = Teamatical._browser.safari
            var loadingOnUpdate = this.loadingOnUpdate || Teamatical._browser.safari

            if (this._viewHasImage(this.selectedView) && loadingOnUpdate)
            {
                console.warn('src = ""')
                this.set('views_state.' + selectedIndex + '.src', '') //clear to cancel recent image loading if any

            }

            var fl = sv.src != viewi.ImageUrl
            if (fl)
            {
                this.set('views_state.' + selectedIndex + '.isloading', true)
                this.set('views_state.' + selectedIndex + '.src', viewi.ImageUrl) // + '_err')
                // console.warn('src = "' + viewi.ImageUrl + '"')
            }

            if (sv && fl)
            {
                // console.log('forceloading!!!!! -1')
                var sinx = selectedIndex
                sv.imgloadingDebouncer = Debouncer.debounce(sv.imgloadingDebouncer, timeOut.after(forceLoading2DDebounceTime), () =>
                {
                    if (!Array.isArray(this.views_state) || sinx < this.views_state.length) { return }

                    // console.log('forceloading!!!!! -2')
                    for (var i in this.views_state)
                    {
                        if (i != sinx && this.views_state[i].forceloading == true)
                        {
                            // this.views_state[i].forceloading = false
                            this.set('views_state.' + sinx + '.forceloading', false)
                        }
                    }

                    var sinxv = this.views_state[sinx]
                    if (sinxv && sinxv.isloading && !sinxv.is3dLoaded)
                    {
                        // console.log('forceloading!!!!! 0', sv)
                        this.set('views_state.' + sinx + '.forceloading', true)
                    }
                })
            }
        }
        else if (viewi.ImageUrl3DFrames) //3D
        {
            this._startLoadViewImage3D(viewi, selectedIndex)
        }
    }

    onPreviewLoaded(e)
    {
        var img = e.target
        var model = e.model.__data
        var viewi = e.model.__data.viewi
        // console.log('onPreviewLoaded', model.index, viewi.ViewId, 'trans:', img.src == this._trans_image(), 'empty:', img.src == '', (img.src !== this._trans_image() && img.src !== '' ? img.src.substr(-10) : ''))

        if (this.views_state && this.views_state[model.index] && this.views_state[model.index].imgloadingDebouncer && this.views_state[model.index].imgloadingDebouncer.cancel) { this.views_state[model.index].imgloadingDebouncer.cancel() }

        if (img.src == '')
        {
            //clean
        }
        else if (img.src == this._trans_image())
        {
            // this.set('views_state.' + model.index + '.isready', true)
        }
        else if (img.src == this._loader_failed())
        {
            //failed state
        }
        else //real image
        {
            // this.set('views_state.' + model.index + '.firstLoad', true)
            this.set('views_state.' + model.index + '.isloading', false)
            this.set('views_state.' + model.index + '.keep3d', false)
            this.set('views_state.' + model.index + '.forceloading', false)

            if (!this._imgRect || !this._imgRect.width) 
            {
                this._calcBoundingRect()
            }

            if (viewi && img.src == viewi.ImageUrl)
            {
                this.set('views_state.' + model.index + '.isloaded', true)
                if (viewi.ImageUrl3DFrames)
                {
                    this._startLoadViewImage3D(viewi, model.index, true)
                }
            }
        }
    }

    onPreviewLoadError(e)
    {
        var img = e.target
        var model = e.model.__data
        var viewi = e.model.__data.viewi
        // console.log('onPreviewLoadError', e, img.src, model, viewi)

        if (this.views_state && this.views_state[model.index] && this.views_state[model.index].imgloadingDebouncer && this.views_state[model.index].imgloadingDebouncer.cancel) { this.views_state[model.index].imgloadingDebouncer.cancel() }

        if (img.src == viewi.ImageUrl) // + '_err')
        {
            this.set('views_state.' + model.index + '.isloading', false)
            this.set('views_state.' + model.index + '.forceloading', false)
            this.set('views_state.' + model.index + '.keep3d', false)
            this.set('views_state.' + model.index + '.isfailed', true)
            this.set('views_state.' + model.index + '.src', this._loader_failed())
        }
    }

    //#endregion


    //#region Image3d Frames

    _startLoadViewImage3D(viewi, selectedIndex, after_preview = false)
    {
        // if (this.debug) 
        // {
        //     // console.warn('start loading 360-frames ' + viewi.ImageUrl3DFrames.substr(-20))
        //     // if (!after_preview) { console.log('3d image - only') }
        // }

        // console.log('_startLoadViewImage -> _startLoadViewImage3D view.' + selectedIndex + ' | after_preview ' + after_preview)

        if (!Array.isArray(this.views_state) || !viewi) { return }
        
        // console.log('_startLoadViewImage3D', viewi.ViewId)
        this._cancelLoadViewImage3D(viewi)

        var sinx:any = this._getViewIndex(viewi)
        // var fl = this.views_state[sinx] && viewi ? (this.views_state[sinx].src != viewi.ImageUrl3DFrames) : true
        this.set('views_state.' + sinx + '.isloaded', true)
        this.set('views_state.' + sinx + '.isloading', true)
        this.set('views_state.' + sinx + '.keep3dUrl', viewi.ImageUrl3DFrames)

        // if (this.views_state && this.views_state[sinx] && fl && this._pv_was_changed)
        // {
        //     var sv = this.views_state[sinx]
        //     sv.imgloadingDebouncer = Debouncer.debounce(sv.imgloadingDebouncer, timeOut.after(forceLoading3DDebounceTime), () =>
        //     {
        //         if (sv.isloading)
        //         {
        //             this.set('views_state.' + sinx + '.forceloading', true)
        //         }
        //     })
        // }

        var sprite: any = document.createElement('img')
        sprite.addEventListener('load', this._onSpriteLoadHandler, EventPassiveDefault.optionPrepare())
        sprite.addEventListener('error', this._onSpriteErrorHandler, EventPassiveDefault.optionPrepare())
        // sprite._tries = 3
        sprite._viewi = viewi
        if (viewi?.imgloadingDebouncer?.cancel) { viewi.imgloadingDebouncer.cancel() }

        if (!this._sprite) { this._sprite = {} }
        this._sprite[viewi.ViewId] = sprite
        // console.log(viewi.ViewId, this._sprite)

        sprite.src = viewi.ImageUrl3DFrames //go!
    }

    _cancelLoadViewImage3D(viewi)
    {
        var sinx = this._getViewIndex(viewi)
        this.set('views_state.' + sinx + '.isloading', false)
        // console.log('_cancelLoadViewImage3D', this._sprite, sinx) 
        if (!this._sprite) { return }

        this._stopSpriteLoading(viewi.ViewId)
    }

    _stopSpriteLoading(vid)
    {
        if (!this._sprite) { return }

        var sprite = this._sprite[vid]
        if (sprite) 
        {
            delete this._sprite[vid]
            sprite.src = ''
            sprite.removeEventListener('load', this._onSpriteLoadHandler)
            sprite.removeEventListener('error', this._onSpriteErrorHandler)
        }
    }

    _stopAllSpritesLoading()
    {
        if (this._sprite) 
        {
            for (var i in this._sprite)
            {
                this._stopSpriteLoading(i)
            }
        }
        this._sprite = {}
    }

    _getViewIndex(viewi)
    {
        if (!Array.isArray(this.views_state) || !viewi) { return }

        for (var i in this.views_state)
        {
            if (this.views_state[i].ViewId == viewi.ViewId)
            {
                return i
            }
        }

        return -1
    }

    _onSpriteLoad(e)
    {
        // console.log(e, e.target)
        var viewi = e.target._viewi
        var sprite = this._sprite[viewi.ViewId]
        if (e.target !== sprite) { return }

        var inx:any = this._getViewIndex(viewi)
        // if (this.debug) { console.log('_onSpriteLoad', sprite ? sprite.src.substr(-20) : '', inx) }
        this.set('views_state.' + inx + '.isloading', false)
        this.set('views_state.' + inx + '.is3dLoaded', true)
        this.set('views_state.' + inx + '.forceloading', false)
        if (this.views_state && this.views_state[inx] && this.views_state[inx].imgloadingDebouncer && this.views_state[inx].imgloadingDebouncer.cancel) { this.views_state[inx].imgloadingDebouncer.cancel() }
    }

    _onSpriteError(e)
    {
        var viewi = e.target._viewi
        var sprite = this._sprite[viewi.ViewId]
        // console.log('_onSpriteLoad', sprite.src)

        var inx:any = this._getViewIndex(viewi)
        this.set('views_state.' + inx + '.isloading', false)
        this.set('views_state.' + inx + '.is3dError', true)
        this.set('views_state.' + inx + '.forceloading', false)
        if (this.views_state && this.views_state[inx] && this.views_state[inx].imgloadingDebouncer && this.views_state[inx].imgloadingDebouncer.cancel) { this.views_state[inx].imgloadingDebouncer.cancel() }
    }

    //#endregion


    //#region ImageZoom Frame

    _startLoadViewImageZoom(viewi, selectedIndex, pv)
    {
        var sinx:any = this._getViewIndex(viewi)

        this.set('views_state.' + sinx + '.iszoomloaded', false)
        this.set('views_state.' + sinx + '.iszoomloading', true)
        var sprite: any = document.createElement('img')
        sprite.addEventListener('load', (e) => { this._onZoomLoadHandler(e) }, EventPassiveDefault.optionPrepare())
        sprite.addEventListener('error', (e) => { this._onZoomErrorHandler(e) }, EventPassiveDefault.optionPrepare())
        this.set(`views_state.${sinx}.zoomImages`, {})
        this.set(`views_state.${sinx}.zoomImages.${pv}`, sprite)
        sprite.setAttribute('data-view', sinx)
        sprite.setAttribute('data-pv', pv)
        sprite.src = viewi.ImageUrlZoom //go!
    }

    _onZoomLoadHandler(e)
    {
        var sprite = e.target
        if (sprite)
        {
            var sinx = sprite.getAttribute('data-view')
            var pv = sprite.getAttribute('data-pv')
            this.set('views_state.' + sinx + '.iszoomloaded', true)
            this.set('views_state.' + sinx + '.iszoomloading', false)
            if (Array.isArray(this.views_state) && !this.views_state[sinx].zoomloaded) { this.views_state[sinx].zoomloaded = {} }
            this.set(`views_state.${sinx}.zoomloaded.${pv}`, true)
        }
    }

    _onZoomErrorHandler(e)
    {
        var sprite = e.target
        if (sprite)
        {
            var sinx = sprite.getAttribute('data-view')
            this.set('views_state.' + sinx + '.iszoomloaded', false)
            this.set('views_state.' + sinx + '.iszoomloading', false)
        }
    }

    //#endregion


    //#region Graphics Resources 

    _trans_image()
    {
        return this._trans_image_z6()
    }

    _trans_image_z6()
    {
        return "data:image/png;base64," +
            "iVBORw0KGgoAAAANSUhEUgAAAkAAAAMACAAAAADp3ocyAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAACdFJOUwAAdpPNOAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAHESURBVBgZ7cExAQAAAMIg+6deDQ9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXArDWgABeKZ+fgAAAABJRU5ErkJggg=="
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

    //#endregion


    //#region LazyLoad Observers

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
            const entity = entries[i]
            if (entity.isIntersecting && entity.target instanceof UIImageMultiView3D)
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

    //#endregion


    // addEventListenersTouchZoom()
    // {
        // document.addEventListener('touchstart', handleTouchStart, false)
        // document.addEventListener('touchmove', handleTouchMove, false)

        // var xDown = null
        // var yDown = null

        // function getTouches(evt)
        // {
        //     return evt.touches ||             // browser API
        //         evt.originalEvent.touches // jQuery
        // }

        // function handleTouchStart(evt)
        // {
        //     const firstTouch = getTouches(evt)[0]
        //     xDown = firstTouch.clientX
        //     yDown = firstTouch.clientY
        // }

        // function handleTouchMove(evt)
        // {
        //     if (!xDown || !yDown)
        //     {
        //         return
        //     }

        //     var xUp = evt.touches[0].clientX
        //     var yUp = evt.touches[0].clientY

        //     var xDiff = xDown - xUp
        //     var yDiff = yDown - yUp

        //     if (Math.abs(xDiff) > Math.abs(yDiff))
        //     {/*most significant*/
        //         if (xDiff > 0)
        //         {
        //             /* left swipe */
        //         } else
        //         {
        //             /* right swipe */
        //         }
        //     } else
        //     {
        //         if (yDiff > 0)
        //         {
        //             /* up swipe */
        //         } else
        //         {
        //             /* down swipe */
        //         }
        //     }
        //     /* reset values */
        //     xDown = null
        //     yDown = null
        // }


        // var Fingers: any = window['Fingers']
        // var finger = new Fingers(track)
        // finger.addGesture(Fingers.gesture.Swipe, { nbFingers: 2 })
        //     .addHandler(function (pEventType, pData, pFingers)
        //     {
        //         console.log(pEventType, pData, pFingers)
        //         // updateLabel(pLabelElement, "Swipe " + pData.direction + "<br/>Velocity: " + pData.velocity.toFixed(2) + " px/ms")
        //     })


        // var Hammer: any = window['Hammer']
        // var hmc = new Hammer(this.track, {})
        // var pinch = new Hammer.Pinch()
        // hmc.add([pinch])
        // // hmc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL })
        // hmc.on("pan pinch", (e) =>
        // {
        //     if (e.pointerType != "touch") { return }
        //     // console.log(e.type, e.direction, e.offsetDirection, e.distance, e.scale, e.maxPointers, e.velocity)
        //     console.log(e.type, (e.direction == 2 ? 'LEFT' : (e.direction == 4 ? 'RIGHT' : e.direction)), e.maxPointers, e.scale)
        //     if (!this._touchLast) { this._touchLast = {} }
        //     if ((e.type == 'pinch' || e.type == 'pan') && (e.direction == 2 || e.direction == 4) && (e.offsetDirection == 2 || e.offsetDirection == 4) && e.maxPointers == 2)
        //     {
        //         //&& e.scale == 1
        //         this._touchLast.multiSwipe = true
        //     }
        //     else if (e.isFinal || e.maxPointers < 2)
        //     {
        //         this._touchLast.multiSwipe = false
        //     }
        //     // console.log(e.type, (e.direction == 2 ? 'LEFT' : (e.direction == 4 ? 'RIGHT' : e.direction)), e.scale)
        //     if (e.type == 'pinch' || e.type == 'pan')
        //     {
        //         // var i = this.selectedIndex
        //         // var s = e.scale //e.isFinal ? 1.0 : e.scale
        //         // this.set('views_state.' + i + '.zoomPinch', s)
        //         // this.set('zoomPinch', { scale: s, x: e.center.x, y: e.center.y })
        //         // console.log(e)
        //         // if (s != 1)
        //         // {
        //         //     this._zoomPinchDebouncer = Debouncer.debounce(this._zoomPinchDebouncer, timeOut.after(1500), () =>
        //         //     {
        //         //         // this.set('views_state.' + i + '.zoomPinch', 1)
        //         //         this.set('zoomPinch', zoomPinchDefault)
        //         //         // console.log(e.type, (e.direction == 2 ? 'LEFT' : (e.direction == 4 ? 'RIGHT' : e.direction)), e.scale)
        //         //     })
        //         // }
        //     }
        // })
    // }
}
