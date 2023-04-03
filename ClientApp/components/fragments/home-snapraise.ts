import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import { html } from '@polymer/polymer/polymer-element'
import '../ui/ui-image'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import view from './home-snapraise.ts.html'
import style from './home-snapraise.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']



@FragmentDynamic
export class HomeSnapraise extends FragmentBase
{
    static get is() { return 'teamatical-home-snapraise' }

    static get template() { return html([`<style include="">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: Object,
            routeData: Object,
            userInfo: Object,
            imagesPath: String,
            webp: { type: Boolean, value: false, reflectToAttribute: true },

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