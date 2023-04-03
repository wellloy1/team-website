import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
import '@polymer/polymer/lib/elements/custom-style'
//---lit---
import { LitElement, html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import { UIBase } from '../ui/ui-base-lit'
// import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html'
import style from './ui-description.ts.css'



@customElement('teamatical-ui-description')
export class UIDescription extends UIBase
{
    @property({ type: String })  
    html: string = ''

    @property({ type: Boolean, reflect: true, attribute: 'documentation' })  
    documentation: boolean = false

    @property({ type: Boolean, reflect: true, attribute: 'ql-editor-view' })  
    qlEditorView: boolean = false
    


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
    }


    render()
    {
        var delta_or_text_or_html = this.html
        // console.log(delta_or_text_or_html)
        var descType = typeof (delta_or_text_or_html)
        var descHtml: string = ''
        // if (delta_or_text_or_html && descType == 'string' && delta_or_text_or_html.startsWith('[')) //suggest we've got Quill Delta lang
        // {
        //     let delta = null
        //     try
        //     {
        //         delta = JSON.parse(delta_or_text_or_html)
        //         var cfg = {}
        //         var converter = new QuillDeltaToHtmlConverter(delta, cfg)
        //         descHtml = converter.convert()
        //     }
        //     catch
        //     {
        //         //
        //     }
        // }
        // else 
        if (delta_or_text_or_html && descType == 'string' && delta_or_text_or_html.match(/<(.|\n)*?>/)) 
        {
            if (this.qlEditorView)
            {
                descHtml = `<div class="ql-editor">${delta_or_text_or_html}</div>`
            }
            else
            {
                descHtml = delta_or_text_or_html
            }
        }
        else
        {
            if (delta_or_text_or_html == undefined) { delta_or_text_or_html = '' }
            descHtml = `<p class="non-html-text">${delta_or_text_or_html}</p>`
        }

        // @apply --teamatical-ui-description-style;

        return html`
            <custom-style>
                <style is="custom-style" include="paper-material-styles"></style>
            </custom-style>

            <style>
				${style}
            </style>

            ${unsafeHTML(descHtml)}
        `
    }
}
