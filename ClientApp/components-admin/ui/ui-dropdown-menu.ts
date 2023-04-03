import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'

import { CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { ProductData } from '../../components/bll/product-data'
import { FragmentBase } from '../fragments/fragment-base'

import { UIBase } from '../ui/ui-base'
import '../../components/ui/ui-image'
import '../../components/ui/ui-select'
import '../ui/ui-progress-icon'
// import '../../components/shared-styles/common-styles'
// import '../../components/shared-styles/tooltip-styles'
import view from './ui-dropdown-menu.ts.html'
import style from './ui-dropdown-menu.ts.css'
import '../shared-styles/common-styles'


@CustomElement
export class UIAdminDropdownMenu extends UIBase 
{
    static get is() { return 'tmladmin-ui-dropdown-menu' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            name: { type: String },
            verticalAlign: { type: String, value: 'top' }, //vertical-align
            horizontalAlign: { type: String, value: 'left' }, //horizontal-align
            label: { type: String, value: '' }, 
            classItem: { type: String, notify: true, value: '' }, //class-item
            disabled: { type: Boolean, value: false, reflectToAttribute: true, },
            readonly: { type: Boolean, value: false, reflectToAttribute: true, },
            focused: { type: Boolean, value: false, reflectToAttribute: true, },
            titleProperty: { type: String, value: 'title' },
            idProperty: { type: String, value: 'id' },
            errorMessage: { type: String, },
            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            
            value: { type: String, notify: true, observer: '_valueChanged' },
            valueList: { type: Array, notify: true, observer: '_valueListChanged' }, //value-list
            
            valueInternal: { type: String, notify: true, observer: '_valueInternalChanged' },
            valueListInternal: { type: Array, notify: true },
        }
    }

    static get observers()
    {
        return [
            // '_log(readonly)',
            // '_log("value-changed", value)',
            // '_log(classItem)',
        ]
    }
    _log() {console.log(this.id, ...arguments)}

    _lock: boolean
    value: any
    valueInternal: any
    valueList: any[]
    valueListInternal: any[]
    disabled: boolean
    invalid: boolean
    titleProperty: string
    idProperty: string
    _lockValue: boolean
    _valueInternalLock: boolean
    readonly: boolean

    connectedCallback()
    {
        super.connectedCallback()

        // this.addEventListener("transitionend", (e) => this._transEnd(e), EventPassiveDefault.optionPrepare())
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    validate()
    {
        if (this.disabled) { return }

        // this.invalid = true //TEST
        return !this.invalid
    }

    _itemClassName(itemi, classItem)
    {
        return this._className(this._valueID(itemi), classItem)
    }
    
    _valueTitle(value)
    {
        if (typeof(value) == 'string') { return value }
        return value ? value[this.titleProperty] : value
    }

    _valueID(value)
    {
        if (typeof(value) == 'string') { return value }
        return value ? value[this.idProperty] : value
    }

    _valueChanged(v, o)
    {
        if (this._lockValue) { return }

        if (this.valueInternal && v && this.valueInternal[this.idProperty] == v[this.idProperty]) 
        { 
            var novalue = {}
            novalue[this.idProperty] = "___na___"
            novalue[this.titleProperty] = "N/A"
            this.valueInternal = null
        }
        var sv = Object.assign({}, v)
        this.async(() => 
        {
            // console.log('set to value internal', sv)
            this._valueInternalLock = true
            this.set('valueInternal', sv)
            this._valueInternalLock = false
        }, 17)
    }

    _valueListChanged(vl)
    {
        // console.log(vl)
        if (this.readonly) { this._log() }
        if (this.readonly && Array.isArray(vl) && this.value)
        {
            this.valueListInternal = vl.filter(i => { return i[this.idProperty] == this.value[this.idProperty] })
        }
        else
        {
            this.valueListInternal = vl
        }
        
    }


    _valueInternalChanged(v, o)
    {
        //
    }

    onValueSelected(e)
    {
        // console.log(e)
        const itemi = e.detail?.value?.__dataHost?.__data?.itemi
        if (!itemi) { return }

        const v = Object.assign({}, itemi)
        this._lockValue = true
        this.set('value', v)
        this._lockValue = false

        this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: v } }))
    }
}