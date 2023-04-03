import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import { UIBase } from '../ui/ui-base'
import '../shared-styles/common-styles'
import view from './ui-progress-icon.ts.html'
import style from './ui-progress-icon.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'


@CustomElement
export class UIAdminProgressIcon extends UIBase
{
    static get is() { return 'tmladmin-ui-progress-icon' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            type: { type: String, reflectToAttribute: true, },
            status: { type: Object, value: { IsStarted: false, IsCompleted: false, IsFailed: false, Progress: 0, Comments: '', Timestamp: undefined, } },
            // status1: { type: Object, value: { IsStarted: true, IsCompleted: false, IsFailed: false, Progress: 60, Comments: '123', } },

            icon: { type: String, computed: '_icon(type, status)', reflectToAttribute: true, },
            title: { type: String, computed: '_title(type, status)', reflectToAttribute: true,  },
            
            class: { type: String, computed: '_class(type, status)', reflectToAttribute: true, },
            showenIcon: { type: Boolean, computed: '_showenIcon(type, status)',  reflectToAttribute: true, },

            _styleBackground: { type: String, computed: '_compute_styleBackground(type, status)', },
            _styleForeground: { type: String, computed: '_compute_styleForeground(type, status)', },

            _classBackground: { type: String, computed: '_compute_classBackground(type, status)', },
            _classForeground: { type: String, computed: '_compute_classForeground(type, status)', },
        }
    }

    static get observers()
    {
        return [
            //  '_log(visible)',
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

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }


    _showenIcon(type, status)
    {
        return this._asBool(status)
    }

    _class(type, status)
    {
        return 'hidden'
    }

    _icon(type, status)
    {
        return this._formatStatusIcon(type)
    }

    _title(type, status)
    {
        return this._formatStatusHint(status, type)
    }

    _compute_styleBackground(type, status)
    {
        return ''
    }

    _compute_styleForeground(type, status)
    {
        let progress = status?.Progress
        let showProgress = (!status?.IsFailed && this._asBool(progress)) ? true : false
        if (progress >= 0 && progress <= 100) 
        { 
            progress = 100 - progress
        }
        else
        {
            showProgress = false
        }
        return showProgress ? `height: ${progress}%` : ''
    }

    _compute_classBackground(type, status)
    {
        return this._classStatus(status, true)
    }

    _compute_classForeground(type, status)
    {
        return this._classStatus(status)
    }

    _classStatus(status, next = false)
    {
        var st = ''
        if (status?.IsFailed)
        {
            st = 'error'
        }
        else if (status?.IsCompleted) //success
        {
            st = 'production'
        }
        else if (status?.IsStarted)
        {
            st = next ? 'inprogress': 'inprogress-bkg'
        }
        return `${st}`
    }
    
    _formatStatusIcon(type)
    {
        var icon = ''
        switch (type)
        {
            // case 'spotcolors':		icon = 'admin-icons:status-spotcolors'; break
            case 'freeze':			icon = 'admin-icons:check-circle-progress'; break
            case 'pushed to ftp':	icon = 'admin-icons:cloud-done-progress'; break
            case 'rasterize':		icon = 'admin-image:gradient-progress'; break
            case 'printing':		icon = 'admin-icons:print-progress'; break
            case 'transferring':	icon = 'admin-icons:status-transferring-progress'; break
            case 'cutting':			icon = 'admin-icons:status-cutting-progress'; break
            case 'sorting':			icon = 'admin-icons:status-sorting-progress'; break
            case 'bundling':		icon = 'admin-icons:status-bundling-progress'; break
            case 'sewing':			icon = 'admin-icons:sewing-machine-progress'; break
            case 'qa':				icon = 'admin-icons:status-qa-progress'; break
            case 'aggregation':		icon = 'admin-icons:status-aggregation-progress'; break
            case 'shipping-labels':	icon = 'admin-icons:mail-progress'; break
            case 'shipping-rfid':	icon = 'admin-icons:rfid-progress'; break
            case 'shipping':		icon = 'admin-maps:local-shipping-progress'; break
            // case 'shipping-track':	icon = 'admin-maps:local-offer-progress'; break
            // case 'shipping-direct':	icon = 'admin-maps:local-activity-progress'; break
        }
        return icon
    }

    _formatStatusHint(status, type = '')
    {
        var t = ''

		if (type == 'spotcolors' && status) 
        { 
            t = this.localizepv('admin-printstatus-', `${type}`) 
        }


        if (this._asBool(status?.Comments)) //PrinterName
        {
            t += `${status.Comments}`
        }

        if (this._asBool(status?.Timestamp) )
        {
            try
            {
                var st = this._status2Locale(status)
                if (st) 
                {
                    t += ' ' + this.localizepv('admin-printstatus-', `${type} ${st}`, 'was', this._formatDate(status.Timestamp))
                }
            }
            catch
            {
                t += ` [${this._formatDate(status.Timestamp)}]`
            }
        }

        if (this._asBool(status?.Progress))
        {
            t += ` ${this._formatDouble(status.Progress, 1)}%`
        }
        return t
    }

}
