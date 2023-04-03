import { html } from '@polymer/polymer/polymer-element'
import { CustomElement } from '../utils/CommonUtils'
import { Currency } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import { UIImage } from '../ui/ui-image'
import '../shared-styles/common-styles'
import view from './ui-list-item.ts.html'
import style from './ui-list-item.ts.css'


@CustomElement
export class UIListItem extends UIBase
{
    static get is() { return 'teamatical-ui-list-item' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            item: { type: Object },
            addBackground: { type: Boolean, value: false, reflectToAttribute: true },

            hidePrices: { type: Boolean, computed: '_compute_hidePrices(item.hideprices)', reflectToAttribute: true },
            priceRegularShow: { type: Boolean, computed: '_existsPrice(item.price.ListPrice)'},
            priceRegular: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            priceList: { type: String, computed: '_formatPrice(item.price.ListPrice, item.price.Currency)' },
            priceSale: { type: String, computed: '_formatPrice(item.price.SalePriceFinal, item.price.Currency)' },
            // priceDiscounts: { type: Array, computed: '_computeDisounts(item.price.DiscountOffers, item.price.AppliedDiscounts)' },
            priceDiscounts: { type: Array, value: [] },
        }
    }

    constructor()
    {
        super()
    }

    _ready: any
    addBackground: boolean


    get img() { return (this.$['img'] instanceof UIImage) ? this.$['img'] : null }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
        this._ready = true
    }

    _compute_hidePrices(item_hidePrices)
    {
        return item_hidePrices === undefined ? false : item_hidePrices
    }

    _formatPlaceholder(product_d)
    {
        return UIListItem.__formatPlaceholder(product_d, this.addBackground)
    }

    static __formatPlaceholder(product_d, add_back = false)
    {
        //viewBox 0 0 576 768
        let scale = (24 / 576) * 0.995
        let x = '-11.85'
        let y = '-19.85'
        let matrix = `translate(${x} ${y}) scale(${scale} ${scale})`
        if (!product_d)
        {
            product_d = "M6-6.4L9.3-5l1.3-3.3c-2.3-2-5-3.5-7.8-4.6h-.1C1.9-11.5 0-11-1.4-11.8c-.5-.3-.9-.7-1.2-1.2h-.1c-2.9 1-5.5 2.5-7.9 4.4l1.2 3.3 3.3-1.3L-6 5l11.7.2L6-6.4z"
            matrix = ""
        }

        // <filter id="a" width="120%" height="120%"><feGaussianBlur stdDeviation=".3" result="blur"/></filter> filter="url(&quot;#a&quot;)"
        let svg_src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -20 24 32" enable-background="new -12 -20 24 32">
                <defs>
                    <linearGradient id="1" x1="0" y1="0" x2="3" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f7f7f7"/><stop offset="1" stop-color="#dedede"/></linearGradient>
                </defs>
                ${!add_back ? `` :
                        `<rect 
                        fill="url(#1)"
                        x="${x}" y="${y}"
                        width="23.4" height="31.4" 
                        rx=".7" ry=".7" />`
                }
                <g fill-rule="evenodd" clip-rule="evenodd" fill="#ccc"  transform="${matrix}">
                <path d="${product_d}"/></g>
            </svg>`

        return "data:image/svg+xml," + encodeURIComponent(svg_src)
    }

}
