//---lit---
import { html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
// import {unsafeHTML} from 'lit/directives/unsafe-html.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
//---component---
import { UIBase } from '../ui/ui-base-lit'


@customElement('teamatical-ui-image-svg')
export class UIImageSvg extends UIBase
{
    @property({ type: String }) 
    svgSrc: string = ''

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
        return html`
            <style include="">
                :host { display: block; }
            </style>
            
            ${ unsafeSVG(this.svgSrc) }
        `
    }
}
