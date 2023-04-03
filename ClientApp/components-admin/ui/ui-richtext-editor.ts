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
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { IronFormElementBehavior } from '@polymer/iron-form-element-behavior/iron-form-element-behavior.js';
import { LegacyElementMixin } from '@polymer/polymer/lib/legacy/legacy-element-mixin.js';
import { PaperInputBehavior } from '@polymer/paper-input/paper-input-behavior.js';
import { html } from '@polymer/polymer/polymer-element'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { CustomElement } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import view from './ui-richtext-editor.ts.html'
import style from './ui-richtext-editor.ts.css'
import '../shared-styles/common-styles'
import '@polymer/paper-swatch-picker/paper-swatch-picker.js'
// import '@vaadin/vaadin-rich-text-editor/vendor/vaadin-quill'
import '@vaadin/vaadin-rich-text-editor'
const Quill = window.Quill
import ImageResize from './../../../node_modules/quill-image-resize-module'
import { ImageDrop } from './../../../node_modules/quill-image-drop-module'
if (ImageResize) { Quill.register('modules/imageResize', ImageResize) }
if (ImageDrop) { Quill.register('modules/imageDrop', ImageDrop) }


@CustomElement
export class UIRichtextEditor extends UIBase
{
    static get is() { return 'tmladmin-ui-richtext-editor' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            value: { type: String, value: '', notify: true, observer: '_valueChanged' },
            valueDelta: { type: String, value: '', notify: true, observer: '_valueDeltaChanged' },
            valueHtml: { type: String, value: '', notify: true, observer: '_valueHtmlChanged' },
            label: { type: String, value: '', notify: true, },
            name: { type: String, value: '', notify: true, },

            focused: { type: Boolean, value: false, reflectToAttribute: true, },
            disabled: { type: Boolean, value: false, reflectToAttribute: true, },
            readonly: { type: Boolean, value: false, reflectToAttribute: true, },
            required: { type: Boolean, value: false, reflectToAttribute: true, },

            codeText: { type: Boolean, value: false, reflectToAttribute: true, },
            isAutoHtml: { type: Boolean, value: false, reflectToAttribute: true, }, //is-auto-html

            hasLabel: { type: Boolean, computed: '_asBool(label)', reflectToAttribute: true, },
            ariaLabelledby: { type: String },
            autocomplete: { type: String },

            //errors
            errorMessage: { type: String, value: '', notify: true, },
            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
        }
    }

    //#region Vars
    _quill: any
    _lockValue: boolean
    isAutoHtml: boolean
    label: any
    value: string
    valueDelta: string
    //#endregion


    static get observers()
    {
        return [
            // '_log()',
        ]
    }

    _log(v) { console.log(v) }


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()

        // console.log('%c Auth ', 'color: white; background-color: #2274A5', 'Login page rendered')
        // console.log('%c GraphQL ', 'color: white; background-color: #95B46A', 'Get user details')
        // console.log('%c Error ', 'color: white; background-color: #D33F49', 'Error getting user details')
    }

    get quill()
    {
        if (!this._quill)
        {
            var element: any = this.shadowRoot?.querySelector("vaadin-rich-text-editor")
            this._quill = element?._editor
        }
        return this._quill
    }

    convertHtmlToDelta(htmlv)
    {
        var quill = this.quill
        if (!quill) { return null }
        return JSON.stringify(quill.clipboard.convert(htmlv).ops)
    }

    getValueText()
    {
        return this.quill?.getText()
    }

    _valueHtmlChanged(v, o)
    {
        // console.log('_valueHtmlChanged', v)
        if (this.isAutoHtml)
        {
            v = StringUtil.replaceAll(v, '<img ', '<img loading="lazy" ')
            v = StringUtil.replaceAll(v, 'style="cursor: nwse-resize;" ', '')

            this._lockValue = true
            this.value = v
            this._lockValue = false
    
            // console.log(v)
            this.dispatchEvent(new CustomEvent('value-changed', { bubbles: true, composed: true, detail: { 
                value: v 
            } }))
        }
        else if (v != o && v != '<p><br></p>' && !this._lockValue)
        {
            this.dispatchEvent(new CustomEvent('value-changed', { bubbles: true, composed: true, detail: { 
                value: v 
            } }))
        }
    }
    
    _valueDeltaChanged(v)
    {
        // console.log('_valueDeltaChanged', v)
    }

    _valueChanged(v)
    {
        // console.log('_valueChanged', v)
        var quill = this.quill
        if (this._lockValue || !quill || (!this.isAutoHtml && v === undefined)) { return }


        let delta_or_text_or_html = v
        if (typeof (delta_or_text_or_html) == 'string' && delta_or_text_or_html.startsWith('[') && JSON.parse(delta_or_text_or_html)) //suggest - Quill Delta
        {
            //do nothing
        }
        else if (typeof (delta_or_text_or_html) == 'string' && delta_or_text_or_html.match(/<(.|\n)*?>/)) //suggest - HTML
        {
            this._lockValue = true
            this.set('valueDelta', JSON.stringify(quill.clipboard.convert(v).ops))
            this._lockValue = false
        }
        else if (typeof (delta_or_text_or_html) == 'object') //suggest - delta lang object
        {
            this._lockValue = true
            this.set('valueDelta', !v ? '[]' : JSON.stringify(v))
            this._lockValue = false
        }
        else //suggest - Plain Text
        {
            this._lockValue = true
            this.set('valueDelta', JSON.stringify(quill.clipboard.convert(v).ops))
            this._lockValue = false
        }
    }

}
