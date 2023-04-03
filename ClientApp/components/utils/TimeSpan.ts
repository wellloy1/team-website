const MILLIS_PER_SECOND = 1000;
const MILLIS_PER_MINUTE = MILLIS_PER_SECOND * 60;   //     60,000
const MILLIS_PER_HOUR = MILLIS_PER_MINUTE * 60;     //  3,600,000
const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;        // 86,400,000
const TimeSpanOverflowError = Error

export class TimeSpan
{
	private _millis: number;

	private static interval(value: number, scale: number): TimeSpan
	{
		if (Number.isNaN(value))
		{
			throw new Error("value can't be NaN");
		}

		const tmp = value * scale;
		const millis = TimeSpan.round(tmp + (value >= 0 ? 0.5 : -0.5));
		if ((millis > TimeSpan.maxValue.totalMilliseconds) || (millis < TimeSpan.minValue.totalMilliseconds))
		{
			throw new TimeSpanOverflowError("TimeSpanTooLong");
		}

		return new TimeSpan(millis);
	}

	private static round(n: number): number
	{
		if (n < 0)
		{
			return Math.ceil(n);
		} else if (n > 0)
		{
			return Math.floor(n);
		}

		return 0;
	}

	private static timeToMilliseconds(hour: number, minute: number, second: number): number
	{
		const totalSeconds = (hour * 3600) + (minute * 60) + second;
		if (totalSeconds > TimeSpan.maxValue.totalSeconds || totalSeconds < TimeSpan.minValue.totalSeconds)
		{
			throw new TimeSpanOverflowError("TimeSpanTooLong");
		}

		return totalSeconds * MILLIS_PER_SECOND;
	}

	public static get zero(): TimeSpan
	{
		return new TimeSpan(0);
	}

	public static get maxValue(): TimeSpan
	{
		return new TimeSpan(Number.MAX_SAFE_INTEGER);
	}

	public static get minValue(): TimeSpan
	{
		return new TimeSpan(Number.MIN_SAFE_INTEGER);
	}

	public static fromDays(value: number): TimeSpan
	{
		return TimeSpan.interval(value, MILLIS_PER_DAY);
	}

	public static fromHours(value: number): TimeSpan
	{
		return TimeSpan.interval(value, MILLIS_PER_HOUR);
	}

	public static fromMilliseconds(value: number): TimeSpan
	{
		return TimeSpan.interval(value, 1);
	}

	public static fromMinutes(value: number): TimeSpan
	{
		return TimeSpan.interval(value, MILLIS_PER_MINUTE);
	}

	public static fromSeconds(value: number): TimeSpan
	{
		return TimeSpan.interval(value, MILLIS_PER_SECOND);
	}

	public static fromTime(hours: number, minutes: number, seconds: number): TimeSpan;
	public static fromTime(days: number, hours: number, minutes: number, seconds: number, milliseconds: number): TimeSpan;
	public static fromTime(daysOrHours: number, hoursOrMinutes: number, minutesOrSeconds: number, seconds?: number, milliseconds?: number): TimeSpan
	{
		if (milliseconds != undefined)
		{
			return this.fromTimeStartingFromDays(daysOrHours, hoursOrMinutes, minutesOrSeconds, seconds, milliseconds);
		} 
		else
		{
			return this.fromTimeStartingFromHours(daysOrHours, hoursOrMinutes, minutesOrSeconds);
		}
	}

	private static fromTimeStartingFromHours(hours: number, minutes: number, seconds: number): TimeSpan
	{
		const millis = TimeSpan.timeToMilliseconds(hours, minutes, seconds);
		return new TimeSpan(millis);
	}

	private static fromTimeStartingFromDays(days: number, hours: number, minutes: number, seconds: number, milliseconds: number): TimeSpan
	{
		const totalMilliSeconds = (days * MILLIS_PER_DAY) +
			(hours * MILLIS_PER_HOUR) +
			(minutes * MILLIS_PER_MINUTE) +
			(seconds * MILLIS_PER_SECOND) +
			milliseconds;

		if (totalMilliSeconds > TimeSpan.maxValue.totalMilliseconds || totalMilliSeconds < TimeSpan.minValue.totalMilliseconds)
		{
			throw new TimeSpanOverflowError("TimeSpanTooLong");
		}
		return new TimeSpan(totalMilliSeconds);
	}

	constructor(millis: number)
	{
		this._millis = millis;
	}

	public get days(): number
	{
		return TimeSpan.round(this._millis / MILLIS_PER_DAY);
	}

	public get hours(): number
	{
		return TimeSpan.round((this._millis / MILLIS_PER_HOUR) % 24);
	}

	public get minutes(): number
	{
		return TimeSpan.round((this._millis / MILLIS_PER_MINUTE) % 60);
	}

	public get seconds(): number
	{
		return TimeSpan.round((this._millis / MILLIS_PER_SECOND) % 60);
	}

	public get milliseconds(): number
	{
		return TimeSpan.round(this._millis % 1000);
	}

	public get totalDays(): number
	{
		return this._millis / MILLIS_PER_DAY;
	}

	public get totalHours(): number
	{
		return this._millis / MILLIS_PER_HOUR;
	}

	public get totalMinutes(): number
	{
		return this._millis / MILLIS_PER_MINUTE;
	}

	public get totalSeconds(): number
	{
		return this._millis / MILLIS_PER_SECOND;
	}

	public get totalMilliseconds(): number
	{
		return this._millis;
	}

	public add(ts: TimeSpan): TimeSpan
	{
		const result = this._millis + ts.totalMilliseconds;
		return new TimeSpan(result);
	}

	public subtract(ts: TimeSpan): TimeSpan
	{
		const result = this._millis - ts.totalMilliseconds;
		return new TimeSpan(result);
	}
}

export const TimeSpanFormatter = (() => 
{
	let rtf, tokensRtf
	const tokens = /[Dhmsf][#~]?|"[^"]*"|'[^']*'/g
	const map = [
		{ t: [['D', 1], ['D#'], ['D~', 'day']], u: 86400000} as any,
		{ t: [['h', 2], ['h#'], ['h~', 'hour']], u: 3600000},
		{ t: [['m', 2], ['m#'], ['m~', 'minute']], u: 60000},
		{ t: [['s', 2], ['s#'], ['s~', 'second']], u: 1000},
		{ t: [['f', 3], ['f#'], ['f~']], u: 1},
	]
	const locale = (value, style = 'long') => 
	{
		try 
		{
			rtf = new Intl.RelativeTimeFormat(value, {style})
		} 
		catch (e) 
		{
			if (rtf) throw e
			return
		}
		const h = rtf.format(1, 'hour').split(' ')
		tokensRtf = new Set(rtf.format(1, 'day').split(' ').filter(t => t != 1 && h.indexOf(t) > -1))
		return true
	}
	const fallback = (t, u) => u + ' ' + t.fmt + (u == 1 ? '' : 's')
	const mapper =  {
		number: (t, u) => (u + '').padStart(t.fmt, '0'),
		string: (t, u) => rtf ? rtf.format(u, t.fmt).split(' ')
			.filter(t => !tokensRtf.has(t)).join(' ')
			.trim().replace(/[+-]/g, '') : fallback(t, u),
	}
	const replace = (out, t) => out[t] || t.slice(1, t.length - 1),
	format = (pattern, value) => 
	{
		if (typeof pattern !== 'string') { throw Error('invalid pattern') }
		if (!Number.isFinite(value)) { throw Error('invalid value') }
		if (!pattern) { return '' }
		const out = {}
		value = Math.abs(value)
		pattern.match(tokens)?.forEach(t => out[t] = null)
		map.forEach(m => 
		{
			let u = null
			m.t.forEach(t => {
				if (out[t.token] !== null)
					return
				if (u === null) {
					u = Math.floor(value / m.u)
					value %= m.u
				}
				out[t.token] = '' + (t.fn ? t.fn(t, u) : u)
			})
		})
		return pattern.replace(tokens, replace.bind(null, out))
	}

	map.forEach(m => m.t = m.t.map(t => ({
		token: t[0], fmt: t[1], fn: mapper[typeof t[1]]
	})))
	
	// locale('en')
	return {format, locale}
})()