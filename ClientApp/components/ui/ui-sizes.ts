import '@polymer/paper-checkbox/paper-checkbox.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { StringUtil } from '../utils/StringUtil'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../shared-styles/common-styles'
import view from './ui-sizes.ts.html'
import style from './ui-sizes.ts.css'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys

@CustomElement
export class UISizes extends UIBase
{
    static get is() { return 'teamatical-ui-sizes' }

    static formAssociated = true

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            options: { type: Array, },
            disabled: { type: Boolean, value: false, reflectToAttribute: true, },
            readonly: { type: Boolean, value: false, reflectToAttribute: true, },
            focused: { type: Boolean, value: false, reflectToAttribute: true, },
            // noCaption: { type: Boolean, value: false, reflectToAttribute: true, },
            captionText: { type: String, },
            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            errorMessage: { type: String, },
        }
    }

    static get observers()
    {
        return [
            // '_log(disabled)',
        ]
    }

    _log(v) { console.log(v) } 

    options: any
    disabled: boolean
    readonly: boolean
    focused: boolean
    errorMessage: any
    invalid: any


    connectedCallback()
    {
        super.connectedCallback()

        // document.addEventListener("keydown", (e) => this._onKeydown(e))
        this.addEventListener("focus", (e) => { this.focused = true }, true)
        this.addEventListener("blur", (e) => { this.focused = false }, true)
    }

    ready()
    {
        super.ready()
    }

    _toggle(e)
    {
        //
    }

    _tabIndex(readonly)
    {
        return readonly ? -1 : undefined
        //return index + 1
    }

    // _onKeydown(e)
    // {
    //     if (this.disabled || this.readonly) { return }
    //     if (!this.focused) { return }

    //     if (keyboardEventMatchesKeys(e, 'space'))
    //     {
    //         e.preventDefault()
    //         e.stopPropagation()
            
    //         var path = e.path || e.composedPath()
    //         if (path && path[0] && path[0].getAttribute('data-id'))
    //         {
    //             var id = path[0].getAttribute('data-id')
    //             for (var i in this.options)
    //             {
    //                 if (this.options[i].Code == id)
    //                 {
    //                     this.set('options.' + i + '.Selected', !this.options[i].Selected)
    //                     break
    //                 }
    //             }
    //         }
    //     }
    // }

    // onItemTap(e)
    // {
    //     if (this.disabled || this.readonly) { return }
    //     var inx = e.model.__data.index
    //     this.set('options.' + inx + '.Selected', !this.options[inx].Selected)
    //     // console.log(e)
    // }

    //     <!--
    //     on - tap="onItemTap"
    // tabindex$ = "[[_tabIndex(index)]]"
    //     < a data - id$="[[sizei.Code]]" >
    //         [[sizei.Name]]
    //         < /a> -->

}
