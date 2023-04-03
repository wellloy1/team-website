//---legacy polymer---
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-styles/element-styles/paper-material-styles.js'
import '@polymer/polymer/lib/elements/custom-style'
//---lit---
import { LitElement, html, css } from 'lit'
import { property, query, eventOptions, customElement} from 'lit/decorators.js'
import {unsafeHTML} from 'lit/directives/unsafe-html.js'
//---component---
import { DateTimeModel } from '../dal/date-time-model'
import { TimeSpanFormatter } from '../utils/TimeSpan'
import { UIBase } from '../ui/ui-base-lit'
import style from './ui-date-time.ts.css'




@customElement('teamatical-ui-date-time')
export class UIDateTime extends UIBase
{
	//Input Attributes & Properties
	@property({ type: Number, attribute: 'date' })
	date: any
    @property({ type: Object, attribute: 'datetime-obj' })
	datetimeObj: DateTimeModel

    @property({ type: String, attribute: 'year' })
	year: string = 'numeric'
    @property({ type: String, attribute: 'month' })
	month: string = 'long'		//Possible values are "numeric", "2-digit", "narrow", "short", "long".
    @property({ type: String, attribute: 'day' })
	day: string = 'numeric'		//Possible values are "numeric", "2-digit".

    @property({ type: String, attribute: 'hour' })
	hour: string				//Possible values are "numeric", "2-digit".
    @property({ type: String, attribute: 'minute' })
	minute: string				//Possible values are "numeric", "2-digit".
    @property({ type: String, attribute: 'second' })
	second: string				//Possible values are "numeric", "2-digit".
    @property({ type: String, attribute: 'weekday' })
	weekday: string = 'long'	//Possible values are "narrow", "short", "long".

    @property({ type: String, attribute: 'time-zone-name' })
	timeZoneName: string		//Possible values are "short", "long".
    @property({ type: String, attribute: 'time-zone' })
	timeZone: string			//The time zone to use. The only value implementations must recognize is "UTC" the default is the runtime's default time zone. Implementations may also recognize the time zone names of the IANA time zone database, such as "Asia/Shanghai", "Asia/Kolkata", "America/New_York".
    @property({ type: String, attribute: 'era' })
	era: string					//Possible values are "narrow", "short", "long".

	@property({ type: Boolean, attribute: 'hour12', reflect: true })
	hour12: boolean             //Whether to use 12-hour time (as opposed to 24-hour time). Possible values are `true` and `false` the default is locale dependent.

	@property({ type: Boolean, attribute: 'show-count-down', reflect: true })
	showCountDown: boolean             //Whether to use countdown control
	@property({ type: String, attribute: 'count-down-template', reflect: true })
	countDownTemplate: string = 'D~ h~ m~ s~' //template count down

    

	@property({ type: Boolean, attribute: 'visible', reflect: true })
	visible: boolean             //app-page-visible
    
    //Properties
	//observer: '_update'
	//readOnly: true
    @property({ type: String }) 
	display: string = ''
    @property({ type: String })
	iso: string					//An ISO string to attach to the `<time>` element.

	showTimeInterval: any


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

		//TODO: pause countdown on non-visible with IntersectionObserver
		if (this.showCountDown)
		{
			this.showTimeInterval = setInterval((e) => this._countDownHanlder(e), 1000)
		}
    }

	disconnectedCallback()
    {
        if (this.showTimeInterval) { clearInterval(this.showTimeInterval) }
        super.disconnectedCallback()
    }

    _countDownHanlder(e)
    {
        if (!this.visible) { return }
        this._update()
    }

    // Handler for date property change. Computes date value.
    _update()
    {
        let date = this.date
        if (!date)
        {
            date = new Date()
        }
        else if (typeof date === 'string')
        {
            try
            {
                date = new Date(date)
                let _test = date.getDate()
                if (_test !== _test)
                {
                    date = new Date()
                }
            } catch (e)
            {
                date = new Date()
            }
        } 
        else if (!isNaN(date))
        {
            date = new Date(date)
        } 
        else if (!(date instanceof Date))
        {
            date = new Date()
        }

        if (this.datetimeObj)
        {
            date.setTime(this.datetimeObj.ms)
        }


        if (typeof Intl === 'undefined')
        {
            this.display = date.toString()
            this.iso = date.toISOString()
            return
        }

        const options:any = {
			localeMatcher: "best fit",
			// fractionalSecondDigits: 3,
			// dayPeriod: "short",
			// calendar: 'chinese',
			// numberingSystem: 'arab',
		}
        if (this.year)
        {
            options.year = this.year
        }
        if (this.month)
        {
            options.month = this.month
        }
        if (this.day)
        {
            options.day = this.day
        }
        if (this.hour)
        {
            options.hour = this.hour
        }
        if (this.minute)
        {
            options.minute = this.minute
        }
        if (this.second)
        {
            options.second = this.second
        }
        if (this.weekday)
        {
            options.weekday = this.weekday
        }
        if (this.era)
        {
            options.era = this.era
        }
        if (this.timeZoneName)
        {
            options.timeZoneName = this.timeZoneName
        }
        if (this.timeZone)
        {
            options.timeZone = this.timeZone
        }
        if (this.hour12 !== undefined)
        {
            options.hour12 = this.hour12
        }

        let locales = 'en-US'
        if (this.language)
        {
            locales = this.language
        }

        try
        {
            var value = ''
            if (this.showCountDown)
            {
                const now = new Date()
                TimeSpanFormatter.locale(locales)
                value = TimeSpanFormatter.format(this.countDownTemplate, now.getTime() - date.getTime())
            }
            else
            {
                // formatRangeToParts()
                // formatRange(now, date)
                value = new Intl.DateTimeFormat(locales, options).format(date)
            }

            //setModel
            this.display = value
            this.iso = date.toISOString()
        }
        catch
        {
            // console.error(date)
        }
    }


    render()
    {
		this._update()
        return html`
            <custom-style> <style is="custom-style" include="paper-material-styles"></style> </custom-style>
            <style> ${style} </style>
            <time datetime=${this.iso}>${this.display}</time>
        `
    }
}


