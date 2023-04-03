import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { StringUtil } from '../utils/StringUtil'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { CustomElement } from '../utils/CommonUtils'
import { UIBase } from '../ui/ui-base'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-quantity.ts.html'
import style from './ui-quantity.ts.css'
const MINVAL = 1


@CustomElement
export class UIQuantity extends UIBase
{
    static get is() { return 'teamatical-ui-quantity' }

    static formAssociated = true

    static get template() { return html([`<style include="teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            captionText: { type: String, },
            value: { type: String, notify: true, observer: "valueChanged" },
            valueProperty: { type: String, notify: true },
            step: { type: Number, value: 1 },
            disabled: { type: Boolean, value: false, reflectToAttribute: true, },
            focused: { type: Boolean, value: false, reflectToAttribute: true, },
            debouncing: { type: Boolean, value: false, notify: true, reflectToAttribute: true, },
            debouncingInput: { type: Number, value: 1500, reflectToAttribute: true, },
            debouncingButton: { type: Number, value: 500, reflectToAttribute: true, },
            name: { type: String },
            ariaLabelledby: { type: String },
            autocomplete: { type: String },
            required: { type: String },
            errorMessage: { type: String, },
            invalid: { type: Boolean, value: false, reflectToAttribute: true, },
            stepAllowDecrease: { type: Boolean, value: false, reflectToAttribute: true, },
            maxlength: { type: String, value: "6" },
            pattern: { type: String, value: '[0-9]{1,6}', observer: "patternChanged" },
            minusDisabled: { type: Boolean, computed: '_computeMinusDisabled(valueProperty)'},
            plusDisabled: { type: Boolean, computed: '_computePlusDisabled(valueProperty)' },
        }
    }

    static get observers()
    {
        return [
            // '_log(stepAllowDecrease)'
        ]
    }

    _log() { console.log(...arguments) }

    _changeDebouncer: Debouncer
    _focusDebouncer: Debouncer
    pattern: string
    value: number
    valueProperty: string
    step: number
    stepAllowDecrease: boolean
    debouncingInput: number
    debouncingButton: number

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
    }

    valueChanged(v, o) 
    {
        this.valueProperty = v
    }

    patternChanged(v)
    {
        //
    }

    onFocus(e)
    {
        if (this._focusDebouncer) { this._focusDebouncer.cancel() }
    }

    onBlur(e)
    {
        this._focusDebouncer = Debouncer.debounce(this._focusDebouncer, timeOut.after(500), () =>
        {
            if (!this._changeDebouncer || !this._changeDebouncer.isActive())
            {
                this.valueProperty = '' + this.value //restore not validated value
            }
        })
    }

    onInputChange(e)
    {
        this.setValue(e.detail.value, 'input')
    }


    plusTap(e)
    {
        this.setValue(this.valueProperty, 'inc')

        e.stopPropagation()
        e.preventDefault()
    }

    minusTap(e)
    {
        this.setValue(this.valueProperty, 'dec')

        e.stopPropagation()
        e.preventDefault()
    }

    _getPattern()
    {
        return new RegExp('^' + this.pattern + '$', "")
    }

    setValue(strq, type = 'inc')
    {
        if (strq === '') 
        { 
            if (this._changeDebouncer) 
            { 
                this._changeDebouncer.cancel() 
                this.set('debouncing', false)
            }
            return 
        }

        var step = Number.isInteger(this.step) && this.step > 0 ? this.step : MINVAL
        var q = parseInt(strq)
        var v = q
        if (Number.isInteger(q))
        {
            switch(type)
            {
                case 'inc':
                    v = q + step
                    break
                case 'dec':
                    v = q - step
                    break
            }

            // if (q > 0 && (q >= step || this.stepAllowDecrease)) { return false }

            var re = this._getPattern()
            var strv = '' + v
            if (v > 0 && (re.test(strv) || type == 'dec'))
            {
                // q = Math.ceil(v / step) * step //round, ceil or floor?
                // if (q < step) { q = step }
                q = v
                this.valueProperty = '' + q
            }
            else if (v == 0 && this.stepAllowDecrease)
            {
                q = MINVAL
                this.valueProperty = '' + q
            }
            else
            {
                q = this.value
            }
        }
        else 
        {
            q = this.value
        }

        this.set('debouncing', true)
        // if (this._focusDebouncer) { this._focusDebouncer.cancel() }
        this._changeDebouncer = Debouncer.debounce(this._changeDebouncer, timeOut.after(type == 'input' ? this.debouncingInput : this.debouncingButton), () =>
        {
            this.set('debouncing', false)
            if (this.value == q)
            { 
                this.valueProperty = '' + q
                return 
            }
            this.set('value', q)
            this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: q } }))
        })
    }

    _computeMinusDisabled(valueProperty)
    {
        var step = Number.isInteger(this.step) && this.step > 0 ? this.step : MINVAL
        var q = parseInt(valueProperty)
        if (Number.isInteger(q))
        {
            q--
            if (q > 0 && (q >= step || this.stepAllowDecrease)) { return false }
        }
        return true
    }

    _computePlusDisabled(valueProperty)
    {
        if (valueProperty == '') { return true}

        var q = parseInt(valueProperty)
        if (Number.isInteger(q))
        {
            q++
            var str = '' + q
            var re = this._getPattern()
            if (re.test(str)) { return false }
        }
        return true
    }


    _ariaLabelledby(a, b)
    {
        return StringUtil.isEmpty(b) ? a : (a + ' ' + b)
    }
}
