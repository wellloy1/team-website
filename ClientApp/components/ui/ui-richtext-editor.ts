//---legacy polymer---
import '@polymer/polymer/lib/elements/custom-style'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
// import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
//---lit---
import { html, css } from 'lit'
import { customElement, property, query, eventOptions } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { cache } from 'lit/directives/cache.js'
import { UIBase } from './ui-base-lit'
//---component---
// import style_common from '../shared-styles/common-styles.ts.css'
import style from './ui-richtext-editor.ts.css'
// import Quill from 'quill'
import Quill from 'shadow-quill'
//---consts---
// const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@customElement('teamatical-ui-richtext-editor')
export class UIRichtextEditor extends UIBase
{
    //#region properties & webcomponent life-cycle
    
	@property({ type: Boolean, reflect: true }) hidden = false
	@property({ type: Boolean, reflect: true }) disabled = false
	@property({ type: Boolean, reflect: true }) invalid = false
	@property({ type: Boolean, reflect: true }) readonly = false
    @property({ type: Boolean, reflect: true }) required = false
    
    @property({ type: String, }) autocomplete = ''
    @property({ type: String, }) name = ''
    @property({ type: String, }) label = ''
    @property({ type: String, }) placeholder = ''
    @property({ type: String, }) errorMessage = ''

    @property({ type: Number, }) maxLength = 1000

    @property({ type: Object, reflect: true }) scrollTarget

    @query('#editor-container') editorContainer: HTMLElement
    @query('#editor-container .ql-editor') editorContent: HTMLElement
    @query('.ql-toolbar') editorToolbar: HTMLElement

    _quill: Quill
    _lockValue: boolean


    constructor()
    {
        super()
    }

    //#endregion
    _visible = false
    @property({ type: Boolean, reflect: true }) get visible() { return this._visible }
    set visible(v)
    {
        let oldVal = this._visible
        this._visible = v
        this.requestUpdate('visible', oldVal)

        if (!oldVal && v) 
        {
            if (!this._quill)
            {
                this.async(async () => 
                {
                    await this._initQuill()
                    this._setQuillHtml(this._valueHtml)
                })
            }
        }
        else if (oldVal && !v)
        {
            this.editorToolbar.remove()
            this.editorContainer.innerHTML = ''
            delete this._quill
            this._quill = null
        }
    }

    _valueHtml = ''
    @property({ type: String, }) get valueHtml() { return this._valueHtml }
    set valueHtml(v)
    {
        let oldVal = this._valueHtml
        this._valueHtml = v
        this.requestUpdate('valueHtml', oldVal)

        // if (this._lockValue || !this._quill) { return }

        // this._lockValue = true
        // this._setQuillHtml(this._valueHtml)
        // this._lockValue = false
    }

    _value = ''
    @property({ type: String, }) get value() { return this._value }
    set value(v: string)
    {
        let oldVal = this._value
        this._value = v
        this.requestUpdate('value', oldVal)

        if (this._lockValue || !this._quill) { return }

        var delta:any  = []
        try { delta = JSON.parse(v) } catch {}

        try 
        { 
            this._quill.updateContents(delta, Quill.sources.SILENT)
        } 
        catch 
        {}
    }

    _setQuillHtml(html)
    {
        if (!this._quill) { return }

        try 
        { 
            this._quill.disable()
            this._quill.deleteText(0, this._quill.getLength(), Quill.sources.SILENT)
            // const Delta = Quill.import('delta')
            // this._quill.updateContents(new Delta([]), Quill.sources.SILENT)
            this._quill.clipboard.dangerouslyPasteHTML(0, html, Quill.sources.SILENT)
        } 
        catch(ex)
        {
            console.error(ex)
        }
        finally
        {
            this._quill.enable()
        }
    }

    _quillTextChange(delta, oldDelta, source)
    {
        var valueHtml = this._getQuillHtmlStrip(delta, this._quill.root.innerHTML)
        
        // let length = valueHtml.length
        // if (this.maxLength && this.maxLength < length) 
        // {
        //     this._quill.setContents(oldDelta)
        //     return /// EXIT!!!
        // }

        var oldValueHtml = this._valueHtml
        this._valueHtml = valueHtml
        this.requestUpdate('valueHtml', oldValueHtml)
        //---polymer-legacy---
        if (source == 'user') 
        {
            this.dispatchEvent(new CustomEvent('value-html-changed', { bubbles: true, composed: true, detail: { value: valueHtml } }))
        }
    }

    _getQuillHtmlStrip(deltaOps, quillvalueHtml?)
    {
        // console.log(deltaOps, quillvalueHtml)
        let valueHtml = quillvalueHtml

        // Array.from(this.editorContainer.classList).forEach(c => valueHtml = valueHtml.replace(new RegExp('\\s*' + c, 'g'), ''))  // Remove style-scoped classes that are appended when ShadyDOM is enabled
        // valueHtml = valueHtml.replace(/\s*ql-(?!align)[\w\-]*\s*/g, '') // Remove Quill classes, e.g. ql-syntax, except for align
        // let __dir = 'rtl'; // Replace Quill align classes with inline styles
        // [__dir === 'rtl' ? 'left' : 'right', 'center', 'justify'].forEach(align =>  
        // {
        //     valueHtml = valueHtml.replace(new RegExp(` class=[\\\\]?"\\s?ql-align-${align}[\\\\]?"`, 'g'), ` style="text-align: ${align}"`)
        // })
        // valueHtml = valueHtml.replace(/ class=""/g, '')

        if (valueHtml == '<p style="text-align: center"><br></p>')
        {
            return ''
        }
        return `${valueHtml}`
    }

    async _initQuill()
    {
        var fonts = ['', 'monospace']
        var Font = Quill.import('formats/font')
        Font.whitelist = fonts
        Quill.register(Font, true)

        let toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
            [{ 'header': 1 }, { 'header': 2 }],               // custom button values
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
            [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
            [{ 'direction': 'rtl' }],                         // text direction
            [{ 'align': '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
            [{ 'font': fonts }],
            [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
            ['clean'],                                         // remove formatting button
        ]
          
        let options: any = {
            modules: {
                history: {
                    delay: 100,
                    userOnly: true
                },
                toolbar: toolbarOptions,
            },
            placeholder: this.placeholder,
            bounds: this.shadowRoot,
            theme: 'snow'
        }

        this._quill = new Quill(this.editorContainer, options)
        if (this._valueHtml)
        {
            this._lockValue = true
            this._setQuillHtml(this._valueHtml)
            this._lockValue = false
        }

        this._quill.on('text-change', (delta, oldDelta, source) => this._quillTextChange(delta, oldDelta, source))
    }


    //#region lit life-cycle

    async firstUpdated()
    {
        // await this._initQuill()
    }

    render()
    {
        return html`
            <custom-style><style is="custom-style" include="paper-material-styles"></style></custom-style>
            <style>${style}</style>

            <slot name="prefix" slot="prefix"></slot>
            <label id="elLabel" for="input" prefix>${this.label}</label>

            ${cache( this.invalid ? html`
                <div class="error-container">
                    <p class="error">${this.errorMessage}</p>
                </div>
                ` : html``
            )}
            <div id="editor-container">
                ${unsafeHTML(this.value)}
            </div>
        `
    }

    //#endregion
}
