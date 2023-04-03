import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { ColorModel } from '../dal/color-model'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class ColorsData extends NetBase
{
    _async: any

    static get is() { return 'teamatical-colors-data' }

    static get template()
    {
        return html`<app-localstorage-document key="colors-palette-cache" data="{{colorsPalette}}"></app-localstorage-document>`
    }

    static get properties()
    {
        return {
            colorsPalette: { type: Array, notify: true, value: null, observer: '_colorsPaletteChanged' },
            userInfo: { type: Object },
            websiteUrl: { type: String },

            isLoaded: { type: Boolean, value: false },
        }
    }

    websiteUrl: string
    colorsPalette: any //TODO model
    isLoaded: boolean

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    loadColorsPaletteAsync()
    {
        if (this.isLoaded) { return }

        this._async = Debouncer.debounce(this._async, timeOut.after(900), () => { this.loadColorsPalette() })
    }

    loadColorsPalette()
    {
        var rq = {
            url: this.websiteUrl + '/api/v1.0/product/pantone-colors',
            onLoad: this._onRequestResponse.bind(this),
            onError: this._onRequestError.bind(this)
        }
        this._getResource(rq, 1, true)
    }

    _onRequestResponse(event) 
    {
        var r = event['response']
        if (r && r['success'])
        {
            var res = r['result']
            // console.log(res)
            this.colorsPalette = res //JSON.parse(r['result']) //assign data
            this.isLoaded = true
        }
        else
        {
            this._onRequestError(event)
        }
    }

    _onRequestError(event) 
    {
        console.error(event)
    }


    _colorsPaletteChanged(cplist, old)
    {
        if (!Array.isArray(cplist)) { return }

        var pi: any = null
        for (var i in cplist)
        {
            cplist[i] = Object.assign(new ColorModel(), cplist[i])
            if (pi == null && cplist[i].n == 'PANTONE 100 C') { pi = i } //id:46
        }

        if (pi != null) //reformat as PantoneBook
        {
            var dummyc = new ColorModel()
            var len:number = cplist.length
            var num:number = 7 - (len % 7)
            for (var j:number = 0; j < num; j++)
            {
                cplist.splice(pi, 0, dummyc)
            }
        }
        if (cplist.length % 7 !== 0)
        {
            console.error('Pantone color book index error! (' + cplist.length + ')')
        }
    }
}
