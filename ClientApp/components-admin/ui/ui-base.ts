import { PaperDialogElement } from '@polymer/paper-dialog'
import { UIBase as UIBaseComponents } from '../../components/ui/ui-base'
import { StringUtil } from '../../components/utils/StringUtil'
import { FragmentBase } from '../fragments/fragment-base'
// import { Clipboard } from '../../components/utils/CommonUtils'


export class UIBase extends UIBaseComponents
{
    constructor()
    {
        super()
    }

    _isUser(sub, arr_t)
    {
        return false
            || arr_t['krs'] || sub == 'google-oauth2|109572529448461700620'
    }

    _openDlg(dlg: PaperDialogElement, posElement?, fitElement?)
    {
        FragmentBase.__openDlg(this, dlg, posElement, fitElement)
    }

    _closeDlg(dlg: PaperDialogElement)
    {
        FragmentBase.__closeDlg(this, dlg)
    }

    _showTargetShipDateInfuture(ms, status = '')
    {
        let v = this._asBool(ms)
        return v && status != 'manufactured'
    }

    _isTargetShipDateInfuture(ms, status = '')
    {
        let now = new Date()
        // console.log(now.getTime(), ms, now.getTime() < ms)
        if (now.getTime() < ms)
        {
            return true //&& status != 'manufactured'
        }
        return false
    }

    _convertSwColor(hex)
    {
        if (!hex) { return '' }
        return 'color:#' + hex + ';' +
            'fill:#' + hex + ';'
    }

    _concatif(a, bool = false, b = '', c = '')
    {
        return bool ? a + b : a + c
    }

    _asBoolStatus(status)
    {
        return this._asBool(status?.IsStarted) 
            || this._asBool(status?.IsCompleted) 
            || this._asBool(status?.IsFailed)
    }
    
    _status2Locale = (status) => 
    { 
        var st = ''
        if (status?.IsFailed)
        {
            st = 'error'
        }
        else if (status?.IsCompleted) //success
        {
            st = 'completed'
        }
        else if (status?.IsStarted)
        {
            st = 'started'
        }
        return st
    }

    // _localizeBool(v, strTrue = '', strFalse = '', strUndefined = '')
    // {
    //     if (v === undefined || v === null) { return strUndefined }
    //     return v ? strTrue : strFalse
    // }

    _formatIndex(index)
    {
        return (index + 1).toString()
    }

    _formatTaskTime(ms)
    {
        return this._asBool(ms) ? StringUtil.formatTimeSpan(ms / 1000) : '00:00:00'
    }

    _formatWeightW(grams, units = 'g', locale?)
    {
        return this._formatWeight(grams, units, locale, true)
    }

    _formatWeight(grams, units = 'g', locale?, hideUnits = false)
    {
        //console.log('_formatWeight', grams, units, locale, hideUnits)
        if (!units) { units = 'g' }

        const NANDATA = hideUnits ? `---.-` : `---.- ${this.localizep('units-', units)}`
        if (!Number.isFinite(grams)) { return NANDATA }

        locale = locale ? locale : this.language
        var options = {
            style: 'decimal',
            minimumFractionDigits: 3,
            useGrouping: true,
        }
        var fv = 0
        var fu = units
        switch (units)
        {
            default:
            case 'kg':
            case 'g':
                fv = grams
                if (grams < 1000 && fu != 'kg') 
                {
                    options.minimumFractionDigits = 0
                }
                else 
                {
                    fv = grams / 1000
                    fu = (fu == 'kg' ? fu : `k${fu}`)
                }
                break

            case 'lbs':
                fv = 2.2046226218 * grams / 1000
                break
        }

        if (Number.isNaN(fv) || fv < 0) { return NANDATA }
        return hideUnits ? `${fv.toLocaleString(locale, options)}` : `${fv.toLocaleString(locale, options)} ${this.localizep('units-', fu)}`
    }
    
    _formatMeters(v, units = 'm', precision = 2)
    {
        switch(units)
        {
            case 'yd^2':
                v = v * 1.19599
                break

            case 'yd':
                v = v / 0.9144
                break

            case 'in':
                v = v / 0.0254
                break

            default:
            case 'm':
                v = v
        }

        return this._formatDouble(v, precision)
    }

    _formatDoubleAsPercent(val, m = 2, pu = true)
    {
        if (!this.isNumber(val)) { return val }

        var v = val * (pu ? 100 : 1)
        return this._formatDouble(v, m, '%')
    }

    _formatDouble(val, m = 2, units = '')
    {
        if (this.isNumber(val) && this.isNumber(m))
        {
            //toFixed(m)
            const floatOptions = { minimumFractionDigits: m, maximumFractionDigits: m, useGrouping: true, }
            return val.toLocaleString(this.language, floatOptions) + units
        }
        return val
    }

    _formatDateOnlyNoTZ(o, locale?)
    {
        var mo = Object.assign({}, o)
        mo.ms = mo.ms + mo.tz * 60000
        return this._formatDateOnly(mo, locale)
    }

    _formatCount(count, defaultCount = 1)
    {
        return this._asBool(count) ? count : defaultCount
    }
    
    _formatUnits(units)
    {
        return units || 'Quantity'
    }

    _formatDateOnly(o, locale?)
    {
        var _formatter = new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
        });

        return this._formatDate(o, locale, _formatter)
    }

    _formatDate(o, locale?, formatter?:any)
    {
        if (!o || !o.ms) { return '' }

        if (!locale) { locale = this.language }

        //o.tz
        // console.log(locale)
        var _formatter = formatter ?? new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        });
        var d = new Date().setTime(o.ms)

        // console.log(d)
        // var d = new Date(2017, 12, 8, 12, 30, 0)
        try
        {
            return _formatter.format(d)
        }
        catch(e)
        {
            console.error(o.ms + ' ' + o.tz, e)
            return ''
        }
    }

    _formatTotalElements(totalElements)
    {
        if (!totalElements) { return totalElements }
        return totalElements < 0 ? (Math.abs(totalElements) + '+') : totalElements
    }

    _formatArray(arr, sep?)
    {
        if (!sep) { sep = ", " }
        if (typeof(arr) == 'string') { return arr.split(',').join(sep) }
        if (!Array.isArray(arr)) { return arr }
        return arr.join(sep)
    }

    _formatSet(obj)
    {
        if (Array.isArray(obj)) { return obj }
        var s = ''
        for (var i in obj)
        {
            if (!obj[i]) { continue }
            s = s + (s == '' ? '' : ', ') + i
        }
        return s
    }

    _formatProgress(progress)
    {
        var v = progress
        if (progress === undefined) 
        {
            v = 0
        }
        return v
    }

    _formatPrintStatus(pushStatus, rasterizeStatus, printStatus)
    {
        var locstr = ''
        var ts = null
        if (this._asBoolStatus(printStatus))
        {
            locstr += 'printing ' + this._status2Locale(printStatus)
            ts = printStatus.Timestamp
        }
        else if (this._asBoolStatus(rasterizeStatus))
        {
            locstr += 'rasterize ' + this._status2Locale(rasterizeStatus)
            ts = rasterizeStatus.Timestamp
        }
        else if (this._asBoolStatus(pushStatus))
        {
            locstr += 'pushed to ftp ' + this._status2Locale(pushStatus)
            ts = pushStatus.Timestamp
        }

        if (locstr && ts)
        {
            return this.localizep('admin-printstatus-', locstr, 'was', this._formatDate(ts))
        }
        return this.localize('admin-printstatus-na')
    }

    _formatCurrency(curobj)
    {
        return curobj ? curobj?.title : curobj
    }
    
}
