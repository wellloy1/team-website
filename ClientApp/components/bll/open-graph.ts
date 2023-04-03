import { html } from '@polymer/polymer/polymer-element'
import { NetBase } from './net-base'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class OpenGraph extends NetBase
{
    static get is() { return 'teamatical-open-graph' }

    static get properties()
    {
        return {
            page: { type: String },
            ogList: { type: Object, notify: true, value: () => { return {} } },
        }
    }

    ogList: any

    static get template() 
    {
        return html``
    }

    static get observers()
    {
        return [
            '_ogListChanged(ogList.*)'
        ]
    }


    connectedCallback()
    {
        super.connectedCallback()
    }

    setCanonical(canonical_url)
    {
        var link_canonical = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement
        if (!link_canonical)
        {
            link_canonical = document.createElement('link') as HTMLLinkElement
            link_canonical.rel = 'canonical'
            this._appendSticky(document.head, link_canonical)
        }
        link_canonical.href = canonical_url
    }

    metaSet(key, value, remove = false)
    {
        var metaEl = document.head.querySelector("meta[name='" + key + "']") as HTMLMetaElement
        if (!value && remove && metaEl)
        {
            document.head.removeChild(metaEl)
        }
        else if (!metaEl && value)
        {
            metaEl = document.createElement('meta') as HTMLMetaElement
            metaEl.name = key
            metaEl.content = value
            this._appendSticky(document.head, metaEl)
        }
        else if (metaEl && value)
        {
            metaEl.content = value
        }
    }

    ogSetAll(keyValues)
    {
        this.set('ogList', keyValues)
    }

    ogSet(key, value, remove = false)
    {
        if (!value && remove && typeof(this.ogList) == 'object')
        {
            for (const [keyi, valuei] of Object.entries(this.ogList))
            {
                if (key == keyi)
                {
                    delete this.ogList[key]
                    break
                }
                // console.log(keyi)
            }
        }
        else
        {
            this.set('ogList.' + key, value)
        }
    }


    _ogListChanged(ogList)
    {
        const h = document.head
        var metas = [...h.querySelectorAll("meta[name^='og:']")] as HTMLMetaElement[]
        for (const [keyi, valuei] of Object.entries(this.ogList))
        {
            var ogmeta = metas.filter(i => i.name == ('og:' + keyi))
            if (ogmeta.length > 0)
            {
                metas.splice(metas.indexOf(ogmeta[0]), 1)
                ogmeta[0].content = valuei as string
            }
            else
            {
                var meta = document.createElement('meta') as HTMLMetaElement
                meta.name = 'og:' + keyi
                meta.content = valuei as string
                this._appendSticky(h, meta)
            }
        }
        // console.log(metas) // remove it
        for (var i of metas)
        {
            document.head.removeChild(i)
        }
    }

    _appendSticky(h, meta)
    {
        h = h as HTMLElement
        var stickyEl = h.querySelector(meta.tagName + ':last-of-type') as HTMLElement
        if (stickyEl) 
        {
            if (stickyEl.nextElementSibling) { stickyEl = stickyEl.nextElementSibling as HTMLElement }
            h.insertBefore(meta, stickyEl)
        }
        else
        {
            h.appendChild(meta)
        }
    }

}
