import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/iron-icon/iron-icon'
import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { Currency, Color, CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { UIBase } from '../ui/ui-base'
import '../../components/ui/ui-select'
import { FragmentBase } from '../fragments/fragment-base'
import '../shared-styles/common-styles'
import view from './ui-grid-pagination.ts.html'
import style from './ui-grid-pagination.ts.css'
const ptoken_empty = ""


@CustomElement
export class AdminUIGridPagination extends UIBase 
{
    static get is() { return 'tmladmin-ui-grid-pagination' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            visible: { type: Boolean, notify: true },
            loading: { type: Boolean, notify: true },
            fixed: { type: Boolean, value: true, notify: true, reflectToAttribute: true },

            localstorageKey: { type: String, notify: true }, //localstorage-key
            pageSize: { type: Number, value: 25, notify: true },
            pfirst: { type: Boolean, notify: true },
            plast: { type: Boolean, notify: true },
            ptoken: { type: String, value: ptoken_empty, notify: true },
            ptoken_next: { type: String, value: ptoken_empty, notify: true },
            totalElements: { type: Number, notify: true },
            totalPages: { type: Number, notify: true },
            page: { type: Number, value: 0, notify: true },
            pages: { type: Array, notify: true },

            visiblePages: { type: Array, notify: true, computed: '_compute_visiblePages(page, pages)' },
            pageSizes: { type: Array, notify: true, value: [ 
                { id: 5, title:'05' },
                { id: 10, title:'10' },
                { id: 15, title:'15' },
                { id: 20, title:'20' },
                { id: 25, title:'25' },
                { id: 30, title:'30' },
                { id: 50, title:'50' },
            ] },
            selectedPageSize: { type: Object },
        }
    }

    static get observers()
    {
        return [
            '_pagesChanged(pages.*)',
            '_preselectPageSize(pageSize, pageSizes)',
            '_pageSizeChanged(selectedPageSize)',
            // '_log(loading)',
        ]
    }
    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()
    }

    ready()
    {
        super.ready()
    }

    _lock: boolean
    _lockStorage: boolean
    pageSize: number
    localstorageKey: string

    __dataHost: FragmentBase
    get hostFragment() { return this.__dataHost }
    get uiPagesContainer() { return this.shadowRoot.querySelector('#pages-container') as HTMLDivElement }
    get uiPages() { return this.shadowRoot.querySelector('#pages') as HTMLDivElement }
    

    _pagesChanged(pagesP)
    {
        if (pagesP?.path)
        {
            // console.log(pagesP)
            this.notifyPath(StringUtil.replaceAll(pagesP?.path, 'pages.', 'visiblePages.'))
        }
    }

    _preselectPageSize(pageSize, pageSizes)
    {
        if (this._lock || !Array.isArray(pageSizes) || pageSizes.length < 1) { return }

        if (this.localstorageKey && window.localStorage) 
        {
            var pagesizeLoc = window.localStorage.getItem(this.localstorageKey)
            try 
            { 
                var v = parseInt(pagesizeLoc) 
                if (Number.isFinite(v) && v > 0)
                {
                    pageSize = v
                }
            } 
            catch 
            {
                ///
            }
            // console.log(pageSize)
        }
        var pageSizeSel = pageSizes.filter(i => { return i.id == pageSize })
        if (pageSizeSel.length == 0) 
        {
            pageSizeSel.push(pageSizes[0])
        }
        this._lockStorage = true
        this.set('selectedPageSize', pageSizeSel[0])
        this._lockStorage = false
    }

    _pageSizeChanged(selectedPageSize)
    {
        this._lock = true
        this.set('pageSize', selectedPageSize.id)
        this._lock = false

        if (!this._lockStorage && this.localstorageKey && window.localStorage)
        {
            window.localStorage.setItem(this.localstorageKey, selectedPageSize.id)
        }
    }

    _compute_visiblePages(page, pages)
    {
        return pages
        // console.log(pageinx, pages)
        // const visiblecount = 6
        // const visibleleftcount = 2
        // if (!pages || pages.length < visiblecount) { return pages }
        // var start = page > visibleleftcount ? page - visibleleftcount : 0
        // var end = start + visiblecount //pages.length >= (visiblecount + pageinx) ? 
        // if (end >= pages.length) { end = pages.length - 1 }
        // return pages.slice(start, end)
    }

    _allowNext(loading, plast)
    {
        return !loading && !plast
    }

    _allowButton(loading, pageinx, ptoken)
    {
        return !loading && (this._asBool(ptoken) || pageinx == 0)
    }

    _formatTotalElements(totalElements)
    {
        // console.log(totalElements)
        if (!totalElements) { return totalElements }
        return totalElements < 0 ? (Math.abs(totalElements) + '+') : totalElements
    }

    _selectPage(e)
    {
        var pagei = e.model.__data.pagei
        this._scrollPagerAsync(this.uiPages.clientWidth)
        return this.hostFragment._select(pagei.i, pagei.ptoken)
    }

    _startover(e)
    {
        this._scrollPagerAsync(0)
        return this.hostFragment._startover(e)
    }

    _next(e)
    {
        this._scrollPagerAsync(this.uiPages.clientWidth)
        return this.hostFragment._next(e)
    }

    _refreshTap(e)
    {
        return this.hostFragment._refreshTap(e)
    }


    _scrollPagerAsync(left = 0, wait = 150)
    {
        this.async(() => {
            this.uiPagesContainer.scrollBy({
                top: 0,
                left: left,
                behavior: 'smooth'
              })
        }, wait)
    }    
}
