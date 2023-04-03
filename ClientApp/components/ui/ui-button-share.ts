import '@polymer/paper-icon-button/paper-icon-button.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { ProductConfigurationModel } from '../dal/product-configuration-model'
import { StoreConfigurationModel } from '../dal/store-configuration-model'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { StringUtil } from '../utils/StringUtil'
import { ProductData } from '../bll/product-data'
import { UIBase } from '../ui/ui-base'
import '../shared-styles/common-styles'
import view from './ui-button-share.ts.html'
import style from './ui-button-share.ts.css'
import { CustomElement, Clipboard } from '../utils/CommonUtils'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@CustomElement
export class UIButtonShare extends UIBase
{
    static get is() { return 'teamatical-ui-button-share' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            itemModel: { type: Object },
            websiteUrl: { type: String },
            appTitleDefault: { type: String, }, // app-title-default
            route: { type: Object },
            routeData: { type: Object },
            queryParams: { type: Object },
            visible: { type: Boolean },
            disabled: { type: Boolean, value: false, reflectToAttribute: true },
            hidden: { type: Boolean, value: false, reflectToAttribute: true },
            positionElement: { type: String, },
            url: { type: String },
            customizationType: { type: String, reflectToAttribute: true },
            autoUrl: { type: Boolean, value: true },
            sharingTitle: { type: String, value: '' },
            sharingText: { type: String, value: '' },
            sharingPicture: { type: String, value: '' },

            buttonIcon: { type: String, computed: '_compute_buttonIcon(customizationType)' },
            monochrome: { type: Boolean, value: true, reflectToAttribute: true },
            popup: { type: Boolean, value: true }, //Facebook, Google Plus, Twitter

            email: { type: Boolean, value: true, reflectToAttribute: true },
            facebook: { type: Boolean, value: true, reflectToAttribute: true },
            twitter: { type: Boolean, value: true, reflectToAttribute: true },
            telegram: { type: Boolean, value: true, reflectToAttribute: true },
            clipboard: { type: Boolean, value: true, reflectToAttribute: true },

            google: { type: Boolean, value: false, reflectToAttribute: true },
            vk: { type: Boolean, value: false, reflectToAttribute: true },
            blogger: { type: Boolean, value: false, reflectToAttribute: true },
            reddit: { type: Boolean, value: false, reflectToAttribute: true },
            tumblr: { type: Boolean, value: false, reflectToAttribute: true },

            opened: { type: Boolean, notify: true, value: false },
            shareAvailable: { type: Boolean, notify: true, reflectToAttribute: true },

            menuSize: { type: Number, value: 210 },

            _shareBtnDisabled: { type: String, computed: '_compute_shareBtnDisabled(hidden, disabled)' },
        }
    }

    static get observers()
    {
        return [
        ]
    }

    customizationType: any
    visible: any
    sharingTitle: any
    sharingText: any
    url: any
    autoUrl: any
    websiteUrl: any
    queryParams: any
    itemModel: any
    shareAvailable: any
    menuSize: any
    opened: any
    sharingPicture: any
    popup: any
    positionElement: string
    // _shareSnackbar: UISnackbar
    _ready: any
    _lastWO: any
    appTitleDefault: string

    get shareMenu() { return this.$['shareMenu'] }
    get shareButton() { return this.$['shareButton'] }


    ready()
    {
        super.ready()
        this._ready = true

        this.shareAvailable = (window.navigator.share !== undefined)

        document.addEventListener('tap', e => this._onTapOutsideHandler(e))

        document.addEventListener("keydown", (e) => this.onKeydown(e))
        window.addEventListener('resize', (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    _disabledHidden(shareType, opened)
    {
        return !shareType || !opened
    }

    _compute_shareBtnDisabled(hidden, disabled)
    {
        return this._disabledHidden(!hidden, !disabled)
    }

    _compute_buttonIcon(customizationType)
    {
        if (Teamatical._browser.safari || Teamatical._browser.iPhone)
        {
            return 'social:share-ios'
        }

        // if (customizationType == 'store-branded')
        // {
        //     return 'communication:phonelink-setup'
        // }

        return 'social:share' 
    }

    _onShareBtnTap(e)
    {
        if (window.navigator.share) 
        {
            const s = this._buildShare(this.customizationType, this.sharingTitle, this.sharingText, this.url, this.autoUrl, this.queryParams, this.itemModel)
            //api
            var sObj = {
                title: s.sharingTitle,
                text: s.sharingText, //copy URL only for mobile convinience 
                url: s.url,
            }
            if (Teamatical._browser.mobile) 
            {
                delete sObj.text
            }

            window.navigator.share(sObj)
            .then(e => { this._shareCompleted(e) })
            .catch(err => this._shareError(err))
        }
        else
        {
            var shareMenu: any = this.shareMenu
            //desktop or iphone
            var br: any = this.getBoundingClientRect()
            var prel = this.parentElement
            if (this.positionElement && prel != null)
            {
                var el = prel
                for (var i = 0; i < 10; i++)
                {
                    if (!el.parentElement) 
                    {
                        prel = el
                        break
                    }
                    el = el.parentElement
                    if (el == null) { break }
                    var p = el.querySelector(this.positionElement)
                    if (p)
                    {
                        prel = p as HTMLElement
                        break
                    }
                }
            }
            var pr: any = prel.getBoundingClientRect()

            if (this.opened) 
            {
                var mr = shareMenu.getBoundingClientRect()
                this.menuSize = mr.width
            }
            var reverse = (br.x - pr.x + br.width + this.menuSize) > pr.width
            if (reverse && (br.x < this.menuSize))
            {
                reverse = false
            }

            if (reverse)
            {
                shareMenu.style.left = ''
                shareMenu.style.right = br.width + 'px'
            }
            else
            {
                shareMenu.style.left = br.width + 'px'
                shareMenu.style.right = ''
            }
            shareMenu.style.top = '0px'

            this.opened = !this.opened
        }

        e.preventDefault()
        e.stopPropagation()
    }

    _onTapOutsideHandler(e)
    {
        // var epath = e.path || e.composedPath()
        this.opened = false
    }

    _onScroll(e)
    {
        this.opened = false
    }

    _onResized(e)
    {
        this.opened = false
    }

    onHistoryPopstate(e)
    {
        e = e || window.event

        // if (!this.visible) { return }

        this.opened = false
    }

    onKeydown(e)
    {
        if (!this.visible) { return }

        e = e || window.event
        if(keyboardEventMatchesKeys(e, 'esc'))
        {
            e.preventDefault()
            e.stopPropagation()

            this.opened = false
        }
    }

    _buildBrand(type, sharingTitle, sharingText, url, autoUrl, visible, sharingPicture, queryParams, itemModel, modKey = false)
    {
        if (!visible || !this.localize) { return '' }

        const s = this._buildShare(this.customizationType, sharingTitle, sharingText, url, autoUrl, queryParams, itemModel)
        var qpar = {}
        var path = ''

        switch (type)
        {
            case 'email':
                path = 'mailto:'
                qpar = {
                    subject: s.sharingTitle,
                    // to: '',
                    body: s.sharingTextUrl,
                }
                break

            case 'facebook':
                path = 'https://www.facebook.com/dialog/share'
                qpar = {
                    app_id: 1905247316464437,
                    display: 'popup',
                    href: modKey ? s.simple_url : s.url,
                    quote: s.sharingText,
                    // redirect_uri: s.url,
                }

                // path = 'https://www.facebook.com/sharer.php'
                // qpar = {
                //     'app_id': 1905247316464437,
                //     u: s.url,
                //     quote: s.sharingText,
                // }
                break

            case 'google':
                path = 'https://plus.google.com/share'
                qpar = {
                    url: s.url,
                    text: s.sharingTextUrl,
                    hl: this.language.substr(0, 2),
                }
                break

            case 'twitter':
                path = 'https://twitter.com/intent/tweet'
                qpar = {
                    url: s.url,
                    text: s.sharingText,
                    //via: 
                    //hashtags: 
                }
                break

            case 'telegram':
                path = 'https://telegram.me/share/url'
                qpar = {
                    title: s.sharingTitle,
                    text: s.sharingText,
                    url: s.url,
                }
                break
        }

        var urlOut = StringUtil.urlquery(path, qpar)
        return urlOut
    }

    _buildShare(customizationType, sharingTitle, sharingText, url, autoUrl, queryParams, itemModel)
    {
        // console.log(customizationType, itemModel)

        var custTypeBranded = (customizationType ? customizationType.endsWith('-branded') : false)
        var custTypeStore = (customizationType ? customizationType.startsWith('store') : false)

        var apptitle = this.appTitleDefault

        var t1_url = custTypeStore ? 'share-store-text-url' : 'share-detail-text-url'
        var t1_title = custTypeStore ? 'share-store-title' : 'share-detail-title'
        var t1_text = custTypeStore ? 'share-store-text' : 'share-detail-text'

        var id = itemModel ? itemModel.ProductConfigurationID : ''
        var title = itemModel && itemModel.Product && itemModel.Product.Title ? itemModel.Product.Title : ''
        if (custTypeStore)
        {
            id = itemModel ? itemModel.sid : ''
            if (itemModel && custTypeBranded && itemModel.sidbranded) { id = itemModel.sidbranded }

            title = itemModel ? itemModel.title : ''
        }
        var uri = this._url(url, autoUrl, queryParams, itemModel, id, false, custTypeBranded)
        if (!uri) { console.error("Impossible to share, no url set") }


        var sharingTextUrl = sharingText || this.localize(t1_url, 'url', uri, 'apptitle', apptitle)
        var sharingTitle = sharingTitle
        var sharingText = sharingText
        sharingTitle = sharingTitle || this.localize(t1_title, 'title', title, 'id', id, 'apptitle', apptitle)
        sharingText = sharingText || this.localize(t1_text, 'url', uri, 'title', title, 'id', id, 'apptitle', apptitle)



        // "share-store-text": "Please preview custom store with product configurations to order - {title} ({id})\n",
        //     "share-store-text-url": "Please preview custom store with product configurations to order:\n {url} \n\n ~ Powered By Teamatical.com ~\n",

        // sharingTitle = sharingTitle || this.localize('share-detail-title', 'title', itemModel.Product.Title, 'id', itemModel.ProductConfigurationID)
        // sharingText = sharingText || this.localize('share-detail-text', 'url', uri, 'title', itemModel.Product.Title, 'id', itemModel.ProductConfigurationID)

        var s = {
            url: uri,
            simple_url: this._url(url, autoUrl, queryParams, itemModel, id, true),
            sharingTitle: sharingTitle,
            sharingText: sharingText,
            sharingTextUrl: sharingTextUrl,
        }
        return s
    }

    _url(url, autoUrl, queryParams, itemModel, itemID, simple = false, branded = false)
    {
        var r = url
        if (!url && autoUrl)
        {
            var websiteUrl = this.websiteUrl
            if (itemModel && itemModel instanceof ProductConfigurationModel)
            {
                var product = itemModel as ProductConfigurationModel
                //clean line item id for shared url...
                // var qpar = Object.assign({}, (queryParams ? queryParams : {}))
                // delete qpar['lid']
                // delete qpar['rid']
                var qp = ProductData.product_query(product, {}, 'share')
                if (simple) { delete qp['s'] } //clean state to simplify URL

                if (product.IsBranded || branded) 
                {
                    r = websiteUrl + StringUtil.urlquery(document.location.pathname, qp, true)
                }
                else
                {
                    r = websiteUrl + StringUtil.urlquery(document.location.pathname, qp)
                }
                
                return r
            }
            if (itemModel && itemModel instanceof StoreConfigurationModel)
            {
                var store = itemModel as StoreConfigurationModel
                var qp:any = {}
                if (store.isbranded || branded) 
                { 
                    r = websiteUrl + StringUtil.urlquery('/store/' + itemID, qp, true)
                }
                else
                {
                    r = websiteUrl + StringUtil.urlquery('/store/' + itemID, qp)
                }
                return r
            }
            else
            {
                r = document.location.href
                return r
            }
        }
        return r
    }

    _barandShareTap(e) 
    {
        var element = e.currentTarget

        var social = element.getAttribute('href').replace("../ui/", "") //production issues
        //web
        if (social == 'clipboard')
        {
            const s = this._buildShare(this.customizationType, this.sharingTitle, this.sharingText, this.url, this.autoUrl, this.queryParams, this.itemModel)
            Clipboard.copyFromString(s.url)
            this.showToast(this.localize('share-toast-clipboard', 'title', s.sharingTitle))
        }
        else if (this.popup)
        {
            var modKey = e.detail.sourceEvent.shiftKey
            var href = this._buildBrand(social, this.sharingTitle, this.sharingText, this.url, this.autoUrl, this.visible, this.sharingPicture, this.queryParams, this.itemModel, modKey)
            switch (social)
            {
                case 'facebook':
                    this._openPopup(href, this.sharingTitle, 600, 375)
                    break

                case 'google':
                    this._openPopup(href, this.sharingTitle, 400, 445)
                    break

                case 'twitter':
                    this._openPopup(href, this.sharingTitle, 710, 250)
                    break

                default:
                    this._openPopup(href, this.sharingTitle, 710, 678)
            }
        }

        this.opened = false

        e.preventDefault()
        e.stopPropagation()
    }

    _openPopup(url, title, w?, h?) 
    {
        var wfeat = {
            // menubar: 'yes',
            // location: 'yes',
            // resizable: 'yes',
            // scrollbars: 'yes',
            // status: 'yes',
        }

        if (w && h)
        {
            var y = window.top.outerHeight / 2 + window.top.screenY - (h / 2)
            var x = window.top.outerWidth / 2 + window.top.screenX - (w / 2)
            wfeat['width'] = w
            wfeat['height'] = h
            wfeat['top'] = y
            wfeat['left'] = x
        }

        //center and open the popup
        var strwf = Object.keys(wfeat).map(function (key) { return key + '=' + wfeat[key] }).join(', ')
        var wo = window.open(url, title, strwf)
        if (this._lastWO) { this._lastWO.close() }
        this._lastWO = wo
        // this.async(() => { if (wo) { wo.close() } }, 6000)
    }

    _shareCompleted(e)
    {
        this.showToast(this.localize('share-toast-done'))
    }

    _shareError(err)
    {
        // console.log(err)
    }

}

