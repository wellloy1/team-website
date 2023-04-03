import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import { CustomElement, getArrItemSafe, getArrItemByID } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import view from './ui-color-picker.ts.html'
import style from './ui-color-picker.ts.css'
import '../shared-styles/tooltip-styles'
import { ColorModel } from '../dal/color-model'



@CustomElement
export class UIColorPicker extends UIBase
{
    static get is() { return 'teamatical-ui-color-picker' }

    static get template() { return html([`<style include="teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            colorsPalette: { type: Array },
            rectangle: { type: Boolean, reflectToAttribute: true },
            colorIcon: { type: String, value: 'image:lens', reflectToAttribute: true },
            disabled: { type: Boolean, reflectToAttribute: true },
            hidden: { type: Boolean, reflectToAttribute: true },
            focused: { type: Boolean, reflectToAttribute: true },
            tabindex: { type: Number, value: 0, reflectToAttribute: true },
            selectedColor: { type: Object, notify: true }, //observer: '_selectedColorChanged' },
        }
    }

    static get observers()
    {
        return [
            // '_log(tabindex)',
        ]
    }

    _log(v) { console.log(v) }

    _isready: any
    selectedColor: any
    disabled: boolean
    hidden: boolean
    rectangle: boolean
    colorsPalette: Array<ColorModel>
    focused: boolean


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        // console.log(this.colorsPalette)
        // console.log(this.selectedColor)
        this.addEventListener('keydown', (e) => this.onColorSelectKeydown(e))
        this.addEventListener('focus', (e) => this.onFocus(e))
        this.addEventListener('blur', (e) => this.onBlur(e))
        this.addEventListener('tap', (e) => this.onTap(e))
    }

    ready()
    {
        super.ready()
        this._isready = true
    }

    onTap(e)
    {
        if (e.detail) { this.blur() }
    }

    onFocus(e)
    {
        this.focused = true
    }
    
    onBlur(e)
    {
        this.focused = false
    }

    _tabindex(focused)
    {
        // return focused ? "0" : "-1"
        return -1
    }

    onColorSelectKeydown(e)
    {
        if (this.hidden || this.disabled || !this.colorsPalette) { return }

        // console.log(e)
        var isself = this == e.target

        if (e.keyCode == 13)
        {
            // return this.onColorSelectTap(e)
        }
        else if (e.key == 'Tab')
        {
            if (isself)
            {
                this.blur()
            }
            // else
            // {
            //     var li = this.shadowRoot.querySelectorAll('li')
            //     var last_li = li[li.length - 1]
            //     if (last_li != e.target)
            //     {
            //         last_li.focus()
            //     }
            //     last_li.blur()
            // }
        }
        else if (e.key == 'ArrowLeft' || e.key == 'ArrowRight')
        {
            var ul = e?.target?.parentElement
            // var ul_s = this.shadowRoot.querySelector('li[selected]')
            // var ul_f = this.shadowRoot.querySelector('li')
            if (isself)
            {
                // ul = (ul_s ? ul_s : ul_f)
                // ul_f.focus()

                var {i, v} = getArrItemByID(this.colorsPalette, 'i', this.selectedColor.i)
                i += (e.key == 'ArrowLeft' ? -1 : 1)
                var coli = getArrItemSafe(this.colorsPalette, i)
                this.selectedColor = coli
                this.dispatchEvent(new CustomEvent('ui-color-picker-selected', { bubbles: true, composed: true, detail: { selectedColor: Object.assign({}, this.selectedColor) } }))
            }
            else
            {
                if (e.key == 'ArrowRight' && ul?.nextElementSibling && ul?.nextElementSibling.childElementCount > 0)
                {
                    ul?.nextElementSibling?.children[0].focus()
                }
                else if (ul?.previousElementSibling)
                {
                    ul?.previousElementSibling?.children[0].focus()
                }
            }
        }
    }

    onColorSelectTap(e)
    {
        if (!e || !e.model || !e.model.__data || !e.model.__data.coli) { return }

        this.selectedColor = e.model.__data.coli
        this.dispatchEvent(new CustomEvent('ui-color-picker-selected', { bubbles: true, composed: true, detail: { selectedColor: Object.assign({}, this.selectedColor) } }))
    }

    _selectedColorChanged(v)
    {
        // console.log(v)
    }

    _sel(coli, selectedColor)
    {
        if (!selectedColor) { return false }

        // console.log(coli.i + ' ' + selectedColor.i)

        return coli.i == selectedColor.i
    }

    _convertSwColor(hex)
    {
        return 'fill:#' + hex + ';'
    }
}
