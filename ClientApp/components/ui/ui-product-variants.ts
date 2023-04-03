import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { CustomElement, getArrItemSafe, getArrItemByID } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
// import '../ui/ui-select'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-product-variants.ts.html'
import style from './ui-product-variants.ts.css'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys


@CustomElement
export class UIProductVariants extends UIBase
{
    static get is() { return 'teamatical-ui-product-variants' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            isSelectableItems: { type: Boolean, reflectToAttribute: true }, //is-selectable-items
            options: { type: Array, notify: true, },
            selectedOption: { type: Object, notify: true },
            variantTitle: { type: String },
            customizationType: { type: String },
            loading: { type: Boolean },

            colorIcon: { type: String, value: 'image:lens', reflectToAttribute: true },
            disabled: { type: Boolean, reflectToAttribute: true },
            hidden: { type: Boolean, reflectToAttribute: true },
            focused: { type: Boolean, reflectToAttribute: true },
            // tabindex: { type: Number, value: 0, reflectToAttribute: true },

        }
    }

    static get observers()
    {
        return [
            '_optionsLoaded(options)',
        ]
    }

    options: []
    selectedOption: any
    _isready: boolean = false
    focused: boolean
    disabled: boolean
    isSelectableItems: boolean

    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener('keydown', (e) => this.onOptionSelectKeydown(e))
        this.addEventListener('focus', (e) => this.onFocus(e))
        this.addEventListener('blur', (e) => this.onBlur(e))
        this.addEventListener('tap', (e) => this.onTap(e))
    }

    ready()
    {
        super.ready()
        this._isready = true
    }

    _optionsLoaded(options)
    {
        if (!Array.isArray(options)) { return }

        var r = options.find(i => i.Selected)
        if (r)
        {
            this.selectedOption = r
        }
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

    onOptionSelectKeydown(e)
    {
        if (this.hidden || this.disabled || !this.options) { return }

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

                var {i, v} = getArrItemByID(this.options, 'ID', this.selectedOption?.ID)
                i += (e.key == 'ArrowLeft' ? -1 : 1)
                var opti = getArrItemSafe(this.options, i)

                this._selectOption(opti)
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

    onOptionSelectTap(e)
    {
        if (!e?.model?.__data?.optioni) { return }

        this._selectOption(e.model.__data.optioni)
    }

    _selectOption(optioni)
    {
        if (this.isSelectableItems)
        {
            var props = {}
            for (var i in this.options)
            {
                props[`options.${i}.Selected`] = (this.options[i] == optioni ? true : false)
            }
            // console.log(props)
            this.setProperties(props)
        }
        this.selectedOption = optioni
        this.dispatchEvent(new CustomEvent('ui-product-variants-selected', { bubbles: true, composed: true, detail: { 
            selectedOption: Object.assign({}, this.selectedOption) 
        } }))
    }

    _selectedOptionChanged(v)
    {
        // console.log(v)
    }

    _sel(opti, selectedOption)
    {
        if (!selectedOption) { return false }

        return opti.ID == selectedOption.ID
    }

    _convertSwColor(hex)
    {
        return 'fill:#' + hex + ';'
    }


    _optionName(name, surcharge, currency)
    {
        var n = name
        if (this._asBool(surcharge))
        {
            n = `${n} + ${this._formatPrice(surcharge, currency)}`

        }
        return n
    }

}