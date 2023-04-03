import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { html } from '@polymer/polymer/polymer-element'
import '../ui/ui-button'
import '../ui/ui-image'
import { UIImage } from '../ui/ui-image'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './home-fanatics.ts.html'
import style from './home-fanatics.ts.css'
import { RandomInteger } from '../utils/MathExtensions'
const Teamatical: TeamaticalGlobals = window['Teamatical']



@FragmentDynamic
export class Homefanatics extends FragmentBase
{
    static get is() { return 'teamatical-home-fanatics' }

    static get template() { return html([`<style include="">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: Object,
            routeData: Object,
            userInfo: Object,
            imagesPath: String,
            webp: { type: Boolean, value: false, reflectToAttribute: true },

            homeImagesPath: { type: String, value: 'home-fanatics' },
            imagesHomePath: { type: String, notify: true, computed: '_computed_imagesHomePath(imagesPath, homeImagesPath)' },

            categories: { type: Array },
            visible: { type: Boolean, value: false, observer: '_visibleChanged' },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
        }
    }

    webp: any

    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()
        this.webp = Teamatical._browser.webp
    }

    ready()
    {
        super.ready()
    }

    _visibleChanged(visible)
    {
        if (!visible) { return }

        this.dispatchEvent(new CustomEvent('change-section', {
            bubbles: true, composed: true, detail: {
                title: this.localize('home-title-document'),
            }
        }))
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

}