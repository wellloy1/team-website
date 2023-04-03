import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/iron-icon/iron-icon'
import { html } from '@polymer/polymer/polymer-element'
import '@polymer/paper-dialog/paper-dialog.js'
import { CustomElement } from '../../components/utils/CommonUtils'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { StringUtil } from '../../components/utils/StringUtil'
import { UIBase } from '../ui/ui-base'
import { FragmentBase } from '../fragments/fragment-base'
import '../../components/ui/ui-image'
import '../../components/ui/ui-image-multiview-3d'
import '../ui/ui-dialog'
import { UIAdminDialog } from '../ui/ui-dialog'
import { UIImageMultiView3D } from '../../components/ui/ui-image-multiview-3d'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import '../shared-styles/common-styles'
import view from './production-sewing-item.ts.html'
import style from './production-sewing-item.ts.css'
// import { Md5 } from "md5-typescript"
// const MD5 = (str) => { return Md5.init(str).toUpperCase() }
const MD5 = (str) => { return StringUtil.hashCode(str).toString() }


@CustomElement
export class AdminProductionSewingItem extends UIBase 
{
    asListItem: any
    static get is() { return 'tmladmin-production-sewing-item' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties() 
    {
        return {
            entry: { type: Object, observer: '_entryChanged' },
            visible: { type: Boolean },
            websiteUrl: { type: String },
            scrollTarget: { type: String,  },
            lazyObserve: { type: String },
            actionDisabled: { type: Boolean, reflectToAttribute: true },
            smallScreen: { type: Boolean, reflectToAttribute: true },
            isReplaced: { type: Boolean, reflectToAttribute: true },

            asQa: { type: Boolean, reflectToAttribute: true, value: false },
            asListItem: { type: Boolean, reflectToAttribute: true, value: false },
            responsiveImages: { type: Boolean, reflectToAttribute: true, value: false },
            swapImage: { type: Boolean, reflectToAttribute: true, notify: true, computed: '_computeImageBkg(entry.ImageUrlSwap, smallScreen)', },
            productImages: { type: Array, computed: '_computeProductImagesA(entry.Title, entry.ImageUrls)', },
            productDimsImages: { type: Array, computed: '_computeProductImagesA(entry.Title, entry.ImageUrlsDims)', },

            zoompconfi: { type: Object },
            zoompconfiVisible: { type: Boolean, value: false },
            zoomimgi: { type: Object },
            dialogcamera: { type: Object },
            dialogzoom: { type: Object },
            
            APIPath: { type: String, value: '/admin/api/orderproduction/item-' },

            cameraResultImage:{ computed: '_compute_cameraResultImage(entry.cameraResult)' },
        }
    }

    static get observers()
    {
        return [
            //
        ]
    }

    dialogzoom: any
    dialogcamera: any
    _observer: any 
    _ready: any
    _checkVisibilityDebouncer: any
    uiimages: any 
    entry: any
    zoomimgi: any
    zoompconfi: any
    zoompconfiVisible: boolean
    cameraResultImage: any
    scrollTarget: any

    get imageproductgrid() { return this.$['image-product-grid'] }

    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener("transitionend", (e) => this._transEnd(e), EventPassiveDefault.optionPrepare())
    }

    ready()
    {
        super.ready()

        this._ready = true
    }

    onOpenZoomDialog(e)
    {
        this.zoompconfiVisible = true
        // console.log(e)
    }

    onCloseZoomDialog(e)
    {
        this.zoompconfiVisible = false
        // console.log(e)
    }

    onProductImageTap(e)
    {
        //show zoom
        var entry = e.model.__data.entry
        var inx = e.model.__data.index
        var imgdimsi = e.model.__data.imgdimsi
        // var imgi = e.model.__data.imgi
        var angles = [ 15, 3, 7, 11, 15, 3, 7, 11 ]

        if (!entry || !entry.ProductConfiguration) { return }  //EXIT!!!

        if (this.asListItem) 
        {
            this.dispatchEvent(new CustomEvent('tmladmin-production-sewing-item-tap', { bubbles: true, composed: true, 
                detail: {
                    entry: entry,
                }
            }))
        }
        else //show zoom
        {
            var zoompconfi = Object.assign({}, imgdimsi ? entry.ProductConfigurationDims : entry.ProductConfiguration)
            for (var i in zoompconfi.ProductViews)
            {
                if (i == '0')
                {
                    zoompconfi.ProductViews[i].Selected = true
                }
                zoompconfi.ProductViews[i].ViewId = MD5(zoompconfi.ProductViews[i].ImageUrl + i)
            }
            if (this._asBool(inx)) { zoompconfi.ProductPointOfView = angles[inx] }            
            this.zoompconfi = zoompconfi

            var scrollContainer = (this.scrollTarget || document.body) as HTMLElement
            if (scrollContainer)
            {
                var ch = scrollContainer.clientHeight
                var cw = scrollContainer.clientWidth
                // console.log(ch, this.$.dialogzoom)
                var uiimg = this.$.dialogzoom.querySelector('teamatical-ui-image-multiview-3d') as UIImageMultiView3D
                var gap = ch > (768 + 16) ? (ch - 768) * 0.15 : 12
                uiimg.style.height = `${ch - gap - 32}px`
                uiimg.style.width = `${(cw - gap - 32)*0.75}px`
                if (uiimg.parentElement)
                {
                    uiimg.parentElement.style.height = `${ch - gap}px`
                    uiimg.parentElement.style.width = `${(cw - gap)*0.75}px`
                }
                this.async(() => {uiimg.onZoomIn(e)}, 250)
            }
            this._openDlg(this.$.dialogzoom as PaperDialogElement)


            // var zoompconfi = entry.ProductConfiguration
            // for (var i in zoompconfi.ProductViews)
            // {
            //     if (i == '0')
            //     {
            //         zoompconfi.ProductViews[i].Selected = true
            //     }
            //     zoompconfi.ProductViews[i].ViewId = MD5(zoompconfi.ProductViews[i].ImageUrl + i)
            // }
            // var uidialogzoom = this.$.dialogzoom as UIAdminDialog
            // if (uidialogzoom)
            // {
            //     this.set('dialogzoom', Object.assign({}, { 
            //         loading: true,
            //         title: 'Zoom',
            //         zoompconfi: zoompconfi,
            //     }))
            //     uidialogzoom.open()
            //     this.zoompconfiVisible = true
            // }
        }
    }

    _sku(a, b)
    {
        return a ? a : b
    }

    _formatObject(obj) 
    { 
        return JSON.stringify(obj) 
    }

    _computeImageBkg(imgUrl, smallScreen)
    {
        return !(!imgUrl)
    }

    _removeItem() 
    {
        this.classList.remove('show')
    }

    _obj2Array(obj)
    {
        
        if (!obj) { return [] }

        return Object.keys(obj).map(function (key)
        {
            // console.log({
            //     key: key,
            //     value: obj[key]
            // })
            return {
                key: key,
                value: obj[key]
            }
        })
    }

    _convertSwColor(hex)
    {
        return 'fill:#' + hex + ';'
    }

    _transEnd(e)
    {
        // console.log(e)
        if (e.propertyName == "transform")
        {
            if (!this.classList.contains('show'))
            {
                // console.log('end delete')
            }
        }
    }

    _entryChanged(v, o)
    {
        if (!this.entry) { return }
        
        var t = this.entry.animIndex ? 120 * this.entry.animIndex : 27

        // this._qtyMax = Math.max(12, v.quantity)

        this.async(() =>
        {
            this.classList.add('show')
            this._closeDlg(this.$.dialogzoom as PaperDialogElement)
        }, t)
    }

    onAccessoryImageTap(e)
    {
        var accessi = e.model.__data.accessi
        // console.log(e.model.__data)
        this.zoomimgi = accessi
        this._openDlg(this.$.dialogzoomimg as PaperDialogElement)
    }

    onCameraResultTap(e)
    {
        this.dispatchEvent(new CustomEvent('tmladmin-production-sewing-cameraresult-tap', { bubbles: true, composed: true, 
            detail: {}
        }))
        // this.zoomimgi = { ImageUrl: this.cameraResultImage, Name: '' }
        // this._openDlg(this.$.dialogzoomimg as PaperDialogElement)
    }

    onCameraResultImageTap(e)
    {
        var camerai = e.model.__data.camerai

        // this.zoomimgi = camerai
        // this._openDlg(this.$.dialogzoomimg as PaperDialogElement)


        var dialogcamera = this.$.dialogcamera as UIAdminDialog
        if (dialogcamera)
        {
            // this.set('dialogcamera', { loading: true })
            this.set('dialogcamera', { zoomimgi: camerai })
            dialogcamera.open()
        }
    }

    _compute_cameraResultImage(cameraResult)
    {
        //style="fill:#ccc"
        //style="fill: #ccc;"
        let placeholder = `<g id="camera-enhance" transform="scale(2) translate(0 0)" >
            <path d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-1l1.25-2.75L16 13l-2.75-1.25L12 9l-1.25 2.75L8 13l2.75 1.25z"></path>
            </g>`
        if (typeof(cameraResult?.DataType) != 'string') { return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 120">${placeholder}</svg>` }

        var dt = StringUtil.replaceAll(cameraResult?.DataType, 'image', 'image/')
        return `data:${dt};base64,${cameraResult?.Data}`
        // src='data:image/jpeg;base64, LzlqLzRBQ...<!-- base64 data -->' />
        // Data: "iVBORw0KGgoAAAANSUhEUgAAAoAAAAHgCAIAAAC6s0uzAAAAAX"
        // DataType: "imagejpg"
    }

}