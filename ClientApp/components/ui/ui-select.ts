import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'

import { StringUtil } from '../utils/StringUtil'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../shared-styles/common-styles'
import view from './ui-select.ts.html'
import style from './ui-select.ts.css'


@CustomElement
export class UISelect extends UIBase
{
    static get is() { return 'teamatical-ui-select' }

    static formAssociated = true

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            options: { type: Array, },
            multiple: { type: Boolean, value: false },
            disabled: { type: Boolean, value: false, reflectToAttribute: true, },
            hidden: { type: Boolean, value: false, reflectToAttribute: true, },
            focused: { type: Boolean, value: false, reflectToAttribute: true, },
            name: { type: String },
            ariaLabelledby: { type: String },
            value: { type: String, notify: true, observer: "valueChanged" },
            autocomplete: { type: String },
            required: { type: String },
            selectedProperty: { type: String, },
            textProperty: { type: String, },
            valueProperty: { type: String, },
            noCaption: { type: Boolean, value: false, reflectToAttribute: true, },
            captionText: { type: String, },
            label: { type: String, },
            errorMessage: { type: String, },
            tabindex: { type: String, computed: '_compute_tabindex(disabled, hidden)', reflectToAttribute: true, },

            unselectable: { type: Boolean, value: false },

            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
        }
    }

    static get observers()
    {
        return [
            '_optionsChanged(options, value)'
        ]
    }

    _genDebounce: any
    options: any
    unselectable: any
    multiple: any
    disabled: any
    focused: any
    name: any
    ariaLabelledby: any
    value: any
    autocomplete: any
    required: any
    selectedProperty: any
    textProperty: any
    valueProperty: any
    captionText: any
    errorMessage: any
    $select: any
    invalid: any
    _options_hash: any



    ready()
    {
        super.ready()
        this.$select = this.$['select']
        if (!this.$select)
        {
            this.$select = document.createElement("select")
            this.appendChild(this.$select);
            if (this.multiple)
            {
                this.$select.setAttribute("multiple", "multiple")
            }
        }
        this.$select.addEventListener("change", this.selectChange.bind(this), EventPassiveDefault.optionPrepare())
        this.$select.addEventListener("focus", this.selectFocus.bind(this), EventPassiveDefault.optionPrepare())
        this.$select.addEventListener("blur", this.selectBlur.bind(this), EventPassiveDefault.optionPrepare())
        this.set("multiple", this.$select.hasAttribute("multiple"));
    }

    validate()
    {
        if (this.disabled) { return }

        // this.invalid = true //TEST
        return !this.invalid
    }

    _compute_tabindex(disabled, hidden)
    {
        return disabled || hidden ? "-1" : undefined
    }

    _ariaLabelledby(a, b)
    {
        return StringUtil.isEmpty(b) ? a : (a + ' ' + b)
    }

    _optionsChanged(options, value)
    {
        if (!options || value === undefined) { return }

        var hash = JSON.stringify(this.options)
        if (this._options_hash === hash) { return }
        this._options_hash = hash

        this._genDebounce = Debouncer.debounce(this._genDebounce, timeOut.after(17), this.generateOptions.bind(this, value));
    }

    generateOptions(value)
    {
        // console.log(this.captionText + ' - >generateOptions')
        if (!this.$select) { return }

        if (!this.multiple && this.captionText && this.unselectable)
        {
            this.$select.innerHTML = "<option value=''>" + this.localize('-select-') + "</option>"
        }
        else
        {
            this.$select.innerHTML = ""
        }

        if (!this.options || !this.options.length) { return }

        for (var i = 0; i < this.options.length; i++)
        {
            var row = this.options[i]
            //console.log(this.textProperty)
            var opt = document.createElement("option")
            if (!this.textProperty || !this.valueProperty)
            {
                opt.innerHTML = StringUtil.escapeHtml(row)
                opt.value = StringUtil.escapeHtml(row)
                // console.log(value + ' ~ ' + row)
                if (!this.multiple)
                {
                    if (value == row) { opt.setAttribute('selected', 'true') }
                }
            }
            else
            {
                opt.innerHTML = StringUtil.escapeHtml(row[this.textProperty])
                opt.value = StringUtil.escapeHtml(row[this.valueProperty])
                // console.log(value[this.valueProperty] + ' ~ ' + row[this.valueProperty])
                if (!this.multiple && value)
                {
                    if (value[this.valueProperty] == row[this.valueProperty]) { opt.setAttribute('selected', 'true') }
                }
            }

            this.$select.appendChild(opt)
        }
    }

    selectChange(e)
    {
        if (this.multiple)
        {
            var options = this.$select.querySelectorAll("option");
            for (var i = 0; i < options.length; i++)
            {
                this.set("options." + i + "." + this.selectedProperty, options[i].selected);
            }
        }
        else
        {
            this._setValue(this.$select.value)
            this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: this.$select.value } }))
        }
    }

    focus()
    {
        super.focus()
        //this.selectFocus()
    }

    selectFocus(e?)
    {
        this.focused = true
    }

    selectBlur(e)
    {
        this.focused = false
    }

    valueChanged(newVal, oldVal)
    {
        // console.log(this.captionText + ' > ' + JSON.stringify(newVal))
        if (!this.$select) { return }

        this._setSelectValue(newVal)
    }

    _setValue(selVal)
    {
        if (!this.textProperty || !this.valueProperty)
        {
            this.value = selVal
        }
        else
        {
            if (!this.options || !this.options.length) { return }

            for (var i = 0; i < this.options.length; i++)
            {
                var row = this.options[i]
                if (row[this.valueProperty] == selVal)
                {
                    // console.log(row)
                    this.value = row
                }
            }
        }
        // this.dispatchEvent(new CustomEvent('change', {
        //     bubbles: true, composed: true, detail: {
        //         item: this.item,
        //         size: this.item.SizesSelected[0].Size.Code,
        //         quantity: parseInt(this.quantity, 10),
        //     }
        // }))
    }

    _setSelectValue(newVal)
    {
        // if (!this.captionText) { return }

        if (!this.textProperty || !this.valueProperty)
        {
            this.$select.value = newVal
            // console.log(this.captionText + ' > ' + newVal)
        }
        else
        {
            // console.log(newVal)
            // console.log(typeof(newVal))
            // console.log(this.captionText + " | " + this.textProperty + " | " + this.valueProperty + " > " + this.$select.value)
            if (!this.options || !this.options.length || typeof (newVal) != 'object' || !newVal) { return }

            this.async(() =>
            {
                var opts = this.$select.querySelectorAll("option")
                for (var i in opts)
                {
                    // console.log(typeof(opts[i]))
                    if (typeof (opts[i]) != 'object') { continue }

                    // console.log(opts[i].value + ', ' + newVal[this.valueProperty])
                    if (opts[i].value == newVal[this.valueProperty])
                    {
                        // console.log(i)
                        opts[i].selected = true
                    }
                    else
                    {
                        // console.log(i)
                        opts[i].selected = false
                    }
                }

            }, 1)
        }
    }
}
