import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronOverlayBehaviorImpl } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { UIBase } from '../ui/ui-base'
import { StringUtil } from '../utils/StringUtil'
import '../ui/ui-button'
import view from './ui-cart-modal.ts.html'
import style from './ui-cart-modal.ts.css'
const UICartModalBase = mixinBehaviors([IronOverlayBehaviorImpl], UIBase) as new () => UIBase & IronOverlayBehaviorImpl
import { CustomElement } from '../utils/CommonUtils'
import { UIButton } from '../ui/ui-button'
const HIDDEN = 'none'
const SHOWEN = 'flex'



@CustomElement
export class UICartModal extends UICartModalBase
{
    static get is() { return 'teamatical-ui-cart-modal' }
    
    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            type: { type: String, value: () => { return '' } },
            message: { type: String, value: () => { return 'msg...' } },
            withBackdrop: { type: Boolean, value: true },
            entry: { type: Object, },
        }
    }

    static get observers()
    {
        return [
            '_message_Changed(message)',
        ]
    }

    type: string
    message: string
    _closeDebouncer: any
    backdropElement: HTMLElement
    entry: any
    _debouncer_addedAnimation: Debouncer


    get viewCartAnchor() { return this.$.viewCartAnchor as UIButton }
    get rosterEdit() { return this.$.rosterEdit as UIButton }
    get addValid() { return this.$.addValid as UIButton }
    get closeButton() { return this.$.closeButton as UIButton }
    get uimessage() { return this.$.message as HTMLDivElement }
    get _focusableNodes()
    {
        return [this.viewCartAnchor, this.rosterEdit, this.addValid, this.$.closeBtn]
    }

    ready()
    {
        super.ready()
        
        this.setAttribute('role', 'dialog')
        this.setAttribute('aria-modal', 'true')
        this.addEventListener('transitionend', (e) => this._transitionEnd(e))
        this.addEventListener('iron-overlay-canceled', (e) => this._onCancel(e))
        
        document.addEventListener("keydown", (e) => this.onKeydown(e))
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
    }

    adding(entry)
    {
        this.closeButton.style.display = SHOWEN
        this.viewCartAnchor.style.display = HIDDEN
        this.addValid.style.display = HIDDEN

        this.entry = entry
        this._openAnimation()
    }

    added()
    {
        this.viewCartAnchor.style.display = SHOWEN  //show btn cart
        this.rosterEdit.style.display = HIDDEN      //hide btn edit roster
        this.addValid.style.display = HIDDEN        //hide btn add valid roster
        this.closeButton.style.display = SHOWEN      //hide

        // this.entry = null
        this._openAnimation()
    }

    failed(summary, details)
    {
        var rosterView = HIDDEN
        var addValid = HIDDEN
        if (summary?.Key == 'roster_mismatch' || summary?.Key == 'roster_mismatch_sizes') { rosterView = SHOWEN }
        if (summary?.Key == 'roster_mismatch_sizes') { addValid = SHOWEN }
        this.viewCartAnchor.style.display = HIDDEN
        this.rosterEdit.style.display = rosterView
        this.addValid.style.display = addValid
        this.closeButton.style.display = (rosterView == SHOWEN && addValid  == SHOWEN ? HIDDEN : SHOWEN)
       
        this._openAnimation()
    }



    editrosterTap(e)
    {
        if (!this.entry?.item?.Roster?.id) { return }
        
        this.dispatchEvent(new CustomEvent('api-roster-edit', { bubbles: true, composed: true, detail: { 
            item: this.entry.item
        } }))

        this.close()
    }

    addvalidTap(e)
    {
        if (!this.entry?.item?.Roster?.id) { return }
        
        var entry = Object.assign(this.entry, { addvalid: true })
        this.dispatchEvent(new CustomEvent('api-cart-item-add', { bubbles: true, composed: true, detail: { 
            entry: entry,
        } }))

        this.close()
    }

    closeTap(e)
    {
        this.close()
    }

    _openAnimation()
    {
        //make animation effect
        if (this.opened)
        {
            this.close()
            this._debouncer_addedAnimation = Debouncer.debounce(this._debouncer_addedAnimation, timeOut.after(300), () =>
            {
                this.open()
            })
        }
        else
        {
            this.open()
        }
    }


    _message_Changed(message)
    {
        if (!this.uimessage) { return }
        
        var htmlMessage = message ? StringUtil.replaceAll(message, "\n", "<br />") : ""
        this.uimessage.innerHTML = htmlMessage
    }

    onKeydown(e)
    {
        e = e || window.event;

        // //if (!(e && e.state && e.state[histID] == this.id)) { return }
        // if (!this.opened) { return }
        // console.log(e)
    }

    onHistoryPopstate(e)
    {
        e = e || window.event;

        // console.log(e)
        // console.log(this.id + ' ... ' + JSON.stringify(this._lastState) + ' ~~~~ ' + JSON.stringify(e['state']))

        this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(150), () =>
        {
            // this._lastState = window.history.state
            // this._suppressHistory = true
            // this.open()
            // this._suppressHistory = false
            this.close()
        })        

    }    

    _renderOpened()
    {
        this.restoreFocusOnClose = true
        this.backdropElement.style.display = 'none'
        this.classList.add('opened')
    }

    _renderClosed()
    {
        this.classList.remove('opened')
    }

    _onCancel(e)
    {
        // Don't restore focus when the overlay is closed after a mouse event
        if (e.detail instanceof MouseEvent)
        {
            this.restoreFocusOnClose = false
        }
    }

    refit() 
    { 
        //
    }

    notifyResize() 
    { 
        //
    }

    _transitionEnd(e)
    {
        if (e.target !== this || e.propertyName !== 'transform') { return }


        if (this.opened)
        {
            this._finishRenderOpened()
            this.focus()
            this.dispatchEvent(new CustomEvent('announce', { detail: this.localize('cart-message-itemadded') }))
        } 
        else
        {
            this._finishRenderClosed()
            this.backdropElement.style.display = ''
        }
    }
}
