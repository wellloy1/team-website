import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-input/paper-input.js'
// import '@polymer/paper-checkbox/paper-checkbox.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronOverlayBehaviorImpl } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { CustomElement } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { DialogPopupButtonModel, DialogPopupInputModel } from '../dal/dialog-popup-model'
import { UIBase } from '../ui/ui-base'
import '../ui/ui-button'
import '../ui/ui-description'
import '../shared-styles/common-styles'
import view from './ui-modal-dialog.ts.html'
import style from './ui-modal-dialog.ts.css'
const UIModalDialogBase = mixinBehaviors([IronOverlayBehaviorImpl], UIBase) as new () => UIBase & IronOverlayBehaviorImpl
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const histID = 'modal-dialog'


@CustomElement
export class UIModalDialog extends UIModalDialogBase
{
    static get is() { return 'teamatical-ui-modal-dialog' }
    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}
    static get properties()
    {
        return {
            ariaModal: { type: String, value: "true", reflectToAttribute: true },
            role: { type: String, value: "dialog", reflectToAttribute: true },
            tabindex: { type: String, value: "-1", reflectToAttribute: true },
            wideMode: { type: Boolean, value: false, reflectToAttribute: true },

            
            message: { type: String, notify: true, value: () => { return 'msg...' } },
            inputs: { type: Array, notify: true, value: () => { return [] } },
            buttons: { type: Array, notify: true, value: () => { return [{ title: 'OK', href: '#' }] } },
            required: { type: Boolean, notify: true, value: () => { return false } },

            adminMode: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            qrcode: { type: String, notify: true, },
            errorid: { type: String, notify: true, },
            devErrorDetails: { type: String, notify: true, },

            nowarp: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            widthauto: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            messageHtml: { type: Boolean, notify: true, computed: '_compute_Message(message)' },

            withBackdrop: { type: Boolean, value: true, notify: true },
        }
    }
    static get observers() 
    {
        return [
            '_monitorQrCode(qrcode)',
        ]
    }

    
    //#region Vars

    _log(v) { console.log(UIModalDialog.is, v) }

    //properties
    required: boolean | undefined
    nowarp: boolean | undefined
    widthauto: boolean | undefined
    message: string | undefined
    qrcode: string | undefined
    errorid: string | undefined
    devErrorDetails: string | undefined
    inputs: DialogPopupInputModel[] = []
    buttons: DialogPopupButtonModel[] = []
    _closeDebouncer: Debouncer
    backdropElement: HTMLElement

    //#endregion
    
    
    get _focusableNodes()
    {
        return Array.from(this.shadowRoot ? this.shadowRoot.querySelectorAll('.modal-button') : [])
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener('transitionend', (e) => this._transitionEnd(e))
        this.addEventListener('iron-overlay-canceled', (e) => this._onCancel(e))

        document.addEventListener("keydown", (e) => this.onKeydown(e))
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }


    _QRCode: any
    async _monitorQrCode(qrcode)
    {
        if (!qrcode) { return }
        
        if (!this._QRCode) { this._QRCode = await import('qrcode') }
        var QRCode = this._QRCode
        try
        {
            var qrcanvas = this.shadowRoot?.querySelector('#qrcanvas')
            QRCode.toCanvas(qrcanvas, qrcode, { errorCorrectionLevel: 'L' }, (error) => 
            {
                if (error) { console.error(error) } //else { console.log('success!') }
            })
        }
        catch
        {
            //
        }
    }
    
    _devdetails(devErrorDetails, count = 1)
    {
        if (devErrorDetails?.length)
        {
            return devErrorDetails[1]
        }
        return ''
    }

    _classBtn(baseClass, extClass)
    {
        return baseClass + (extClass ? ` ${extClass}` : '')
    }

    _compute_Message(message)
    {
        return StringUtil.replaceAll(message, "\n", "<br />")
    }

    onTapButton(e)
    {
        let ontap = e.model.__data.btni.ontap
        if (ontap && typeof ontap == 'function')
        {
            e.detail.inputs = this.inputs
            for (var i in this.inputs)
            {
                var inputi = this.inputs[i]
                if (inputi?.name)
                {
                    var inputel = this.shadowRoot ? this.shadowRoot.querySelector(`[name="${inputi.name}"]`) as HTMLInputElement : null
                    if (inputel && typeof(inputel.value) == 'string')
                    {
                        e.detail.inputs[i].value = inputel.value.trim()
                        e.detail[inputi.name] = e.detail.inputs[i].value
                    }
                }
            }
            ontap(e)

            this.close()
        }
    }

    onKeydown(e)
    {
        e = e || window.event;

        // //if (!(e && e.state && e.state[histID] == this.id)) { return }
        // if (!this.opened) { return }

        if (!this.opened || this.required) { return }

        e = e || window.event
        if(keyboardEventMatchesKeys(e, 'esc'))
        {
            e.preventDefault()
            e.stopPropagation()

            this.opened = false
        }
    }

    onHistoryPopstate(e)
    {
        e = e || window.event;

        if (!this.opened) { return } //EXIT

        if (this.required)
        {
            window.history.go(1)
        }
        else
        {
            this._closeDebouncer = Debouncer.debounce(this._closeDebouncer, timeOut.after(150), () =>
            {
                this.close()
            })        
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

    open()
    {
        super.open()
    }

    _renderOpened()
    {
        this.noCancelOnEscKey = this.required || false
        this.noCancelOnOutsideClick = this.required || false
        this.withBackdrop = this.required || false
        // this.allowClickThrough = this.required || false
        this.restoreFocusOnClose = true
        this.scrollAction = (this.required ? "lock" : undefined)

        // if (this.errorid)
        // {
        //     console.log(this.errorid, this.devErrorDetails)
        // }

        // this.backdropElement.style.display = 'none'
        this.classList.add('opened')

        if (this.required) 
        {
            window.history.pushState(null, '', window.location.href)
        }
    }

    _renderClosed()
    {
        this.classList.remove('opened')

        if (this.required) 
        {
            // window.history.back()
        }

        //clean inputs
        this.inputs = []
    }

    _onCancel(e)
    {
        // Don't restore focus when the overlay is closed after a mouse event
        if (e.detail instanceof MouseEvent)
        {
            this.restoreFocusOnClose = false
        }
    }

    _transitionEnd(e)
    {
        // console.log(e)
        if (e.target !== this || e.propertyName !== 'transform') { return }

        if (this.opened)
        {
            this._finishRenderOpened()
            
            var focusel: any = null
            if (this.inputs?.length > 0)
            {
                focusel = this.shadowRoot ? this.shadowRoot.querySelector(`[name="${this.inputs[0].name}"][autofocus]`) : null
            }
            if (focusel)
            {
                focusel.focus()
            }
            else
            {
                this.focus()
            }
        } 
        else
        {
            this._finishRenderClosed()
            this.backdropElement.style.display = ''
        }
    }
}
