import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import { StringUtil } from '../utils/StringUtil'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class TeaminfoData extends NetBase
{
    // static integration_params_apply(queryParams)
    // {
    //     var qpar = {}

    //     if (!queryParams) { return null }

    //     var val = false
    //     for (var i in queryParams)
    //     {
    //         if (i.indexOf('x-') >= 0)
    //         {
    //             qpar[i] = queryParams[i]
    //             val = true
    //         }
    //     }
    //     return val ? qpar : null
    // }
}