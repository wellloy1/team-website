import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
// import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import ResizeObserver from 'resize-observer-polyfill'
import { css_time_to_milliseconds } from '../../components/utils/CommonUtils'
import view from './ui-dialog.ts.html'
import style from './ui-dialog.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
// const UIAdminDialogBase = mixinBehaviors([IronOverlayBehavior], UIBase) as new () => UIBase & IronOverlayBehavior
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UIDialog extends UIBase
{
    static get is() { return 'teamatical-ui-dialog' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true, },
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            animation: { type: String, value: 'popup', reflectToAttribute: true },
            scrollTarget: { type: Object, reflectToAttribute: true }, //scroll-target
            frameMargin: { type: String, reflectToAttribute: true },
            
            role: { type: String, value: "dialog", reflectToAttribute: true },
            tabindex: { type: String, value: "-1", reflectToAttribute: true },
            ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },


            opened: { type: Boolean, notify: true, reflectToAttribute: true },
            popAnimation: { type: Boolean, value: false, reflectToAttribute: true },
            hideAnimation: { type: Boolean, value: false, reflectToAttribute: true },
        }
    }

    static get observers()
    {
        return [
            // '_log()',
        ]
    }

    _log(v) { console.log(v) }

    get el_frame() { return this.$['frame'] as HTMLDivElement }
    get el_container() { return this.$['container'] as HTMLDivElement }
    get el_focus_trap() 
    {
        if (!this._focustrapinput) { this._focustrapinput = this.shadowRoot?.querySelector('.focus-trap-input') }
        return this._focustrapinput
    }

    //#region Vars

    // observer: MutationObserver
    _focustrapinput: any
    disabled: boolean
    opened: boolean
    scrollTarget: any
    popAnimation: boolean
    hideAnimation: boolean
    animation: string
    _contOverlay: any
    _animationDebouncer: Debouncer
    _positionDebouncer: Debouncer
    frameResizeObserver: any
    openedTime: number
    frameMargin: string

    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        // this.addEventListener('transitionend', (e) =>
        // {
        //     if (e.propertyName == 'background-color')
        //     {
        //         this.el_frame.focus()
        //     }
        // })

        document.addEventListener('keydown', (e) => this._onKeydownEvent(e))
        window.addEventListener('beforeunload', (e) => this._onBeforeUnload(e))
        window.addEventListener("popstate", (e) => this._onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
        
        this.addEventListener("tap", (e) => this._onTap(e))

       
        this.frameResizeObserver = new ResizeObserver(entries =>
        {
            if (this.hideAnimation || !this.opened) { return } 

            for (let entry of entries)
            {
                // console.log(entry.target)
                if (entry.target == this.el_frame) 
                {
                    var t = (this._now() - this.openedTime) > 1000 ? 150 : 1150
                    this._positionDebouncer = Debouncer.debounce(
                        this._positionDebouncer,
                        timeOut.after(t),
                        () =>
                        {
                            var ch = this._getScrollContainer().clientHeight
                            if ((entry.contentRect.height + 120) > ch) 
                            {
                                this.el_frame.style.margin = '16px auto'
                            }
                            else if ((entry.contentRect.height + 120) > (ch * 2 / 3)) 
                            {
                                this.el_frame.style.margin = '5% auto'
                            }
                            else
                            {
                                this.el_frame.style.margin = '15% auto'
                            }
                            // console.log(this.el_frame.style.margin, (entry.contentRect.height + 60), this._getScrollContainer().clientHeight)
                        }
                    )
                    // const { left, top, width, height } = entry.contentRect
                    // console.log(entry.contentRect.height)
                    break
                }
                // entry.target.style.borderRadius = Math.max(0, 250 - entry.contentRect.width) + 'px';
            }
        })
        this.frameResizeObserver.observe(this.el_frame)
        this.el_frame.style.margin = this.frameMargin || '15% auto'


        this.el_container.addEventListener('tap', (e) => { this.onAnyWhereTap(e) })

        var dismissElAr = this.querySelectorAll('[dialog-dismiss]')
        for (var i in Object.keys(dismissElAr))
        {
            dismissElAr[i].addEventListener('tap', (e) => { this.dismiss() })
        }
        var confirmElAr = this.querySelectorAll('[dialog-confirm]')
        for (var i in Object.keys(confirmElAr))
        {
            confirmElAr[i].addEventListener('tap', (e) => { this.confirm() })
        }
    }

    disconnectedCallback()
    {
        if (this.frameResizeObserver)
        {
            this.frameResizeObserver.disconnect()
        }

        super.disconnectedCallback()
    }

    _getScrollContainer()
    {
        var target = this.scrollTarget || document.body
        return target as HTMLElement //|| HTMLBodyElement
    }

    onAnyWhereTap(e)
    {
        // console.log(e)
        var epath = e.path || e.composedPath()
        var frame = epath.filter(i => { return i.classList && i.classList.contains('frame')} )
        if (frame.length == 0)
        {
            this.dismiss()
            return this.eventNullStop(e)
        }
    }

    open(keepScroll?)
    {
        var detail = { opening: true }
        this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-opening', { bubbles: true, composed: true, detail: detail }))
        var cont = this._getScrollContainer()

        //show dialog
        this.opened = true
        this.openedTime = this._now()

        //start animation
        this.popAnimation = true

        var autofocus = this.querySelector('[autofocus]') as HTMLElement
        if (autofocus)
        {
            autofocus.focus()
        }
        else
        {
            this.el_focus_trap.focus()
        }

        //save scroll
        if (cont)
        {
            this._contOverlay = cont.scrollTop
            // cont.scrollTop = 0 //dont reset top, avoid jumping effect for opacity backdrops
            cont.style.overflowY = 'hidden'
        }
        if (!keepScroll)
        {
            this.el_container.scrollTop = 0
        }

        // var oldHref = document.location.href
        // var bodyList = document.querySelector("body")
        // var self = this
        // this.observer = new MutationObserver(function(mutations) 
        // {
        //     mutations.forEach((mutation) =>
        //     {
        //         if (oldHref != document.location.href) 
        //         {
        //             oldHref = document.location.href
                    
        //             //close if navigation...
        //             self.close()
        //         }
        //     })
        // })
        // var config = { childList: true, subtree: true }
        // this.observer.observe(bodyList, config)
    }

    close(detail: object | null = null)
    {
        // if (this.observer) { this.observer.disconnect() }
        var detailS = detail ? detail : {}

        //restore scroll
        var cont = this._getScrollContainer()
        if (cont)
        {
            cont.scrollTop = this._contOverlay
            cont.style.overflowY = ''
        }

        //start hide animation
        this.hideAnimation = true //!!!!Start Hide Animation
        this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-closing', { bubbles: true, composed: true, detail: Object.assign({}, detailS, { closing: true }) }))


        //extruct animation duration by container
        var cstyle = window.getComputedStyle(this.el_container, null)
        var durStr = cstyle.getPropertyValue('animation-duration')
        var dur = 300
        try
        {
            dur = css_time_to_milliseconds(durStr)
        }
        catch(ex)
        {
            console.error(ex)
        }
        // console.log(durStr, dur)

        //await animation is done
        var tms = this.animation == 'none' ? 0 : dur
        this._animationDebouncer = Debouncer.debounce(
            this._animationDebouncer,
            timeOut.after(tms),
            () =>
            {
                //hide everthing and initiate animations
                this.opened = false
                this.hideAnimation = false
                this.popAnimation = false
                this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-closed', { bubbles: true, composed: true, detail: Object.assign({}, detailS, { closed: true }) }))
            }
        )
    }


    dismiss()
    {
        // if (this.disabled) { return } //disabled don't block dismiss

        var detail = { dismiss: true }
        this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-dismiss', { bubbles: true, composed: true, detail: detail }))
        this.close(detail)
    }

    confirm()
    {
        if (this.disabled) { return }

        var detail = { confirm: true }
        this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-confirm', { bubbles: true, composed: true, detail: detail }))
        this.close(detail)
    }

    _onKeydownEvent(e)
    {
        if (!this.opened) { return }

        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if (!e.shiftKey && !e.altKey && !e.ctrlKey && keyboardEventMatchesKeys(e, 'esc'))
        {
            this.dismiss()
        }

        // this.disabled //disabled block all action except dismiss
    }

    _onHistoryPopstate(e)
    {
        //
    }

    _onBeforeUnload(e)
    {
        //        
    }

    _onTap(e)
    {
        var epath = e.path || e.composedPath()

        for (var i in epath)
        {
            if (epath[i].localName == UIDialog.is)
            {
                if (epath[i].id == this.id && epath[0].localName == 'a' && epath[0].target != '_blank')
                {
                    this.close()
                }

                break
            }
        }
    }
}
