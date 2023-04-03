import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../ui/ui-loader'
import view from './signout.ts.html'
import style from './signout.ts.css'
import '../ui/ui-button'


@FragmentDynamic
export class Signout extends FragmentBase
{
    static get is() { return 'teamatical-signout' }

    static get template() { return html([`<style include="teamatical-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            offline: { type: Boolean },
            visible: { type: Boolean, observer: '_visibleChanged' },
            websiteUrl: { type: String },
            categories: { type: Array },
            userInfo: { type: Object },
            // failure: { type: Boolean, value: false },

            homeUrl: { type: String }, //home-url
            auth0Loaded: { type: Boolean },
            auth0Progress: { type: Boolean, notify: true }, //auth0-progress

            _showProgress: { type: Boolean, computed: '_compute_showProgress(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            _showSuccess: { type: Boolean, computed: '_compute_showSuccess(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            _showStaticNonAuthorized: { type: Boolean, computed: '_compute_showStaticNonAuthorized(auth0Loaded, auth0Progress, userInfo.isAuth)' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
        }
    }

    visible: any
    homeUrl: string

    static get observers()
    {
        return [
        ]
    }

    connectedCallback()
    {
        super.connectedCallback()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    _compute_showProgress(auth0Loaded, auth0Progress, userInfoIsAuth)
    {
        return !auth0Loaded || auth0Progress
    }

    _compute_showSuccess(auth0Loaded, auth0Progress, userInfoIsAuth)
    {
        return auth0Loaded && !auth0Progress && !userInfoIsAuth
    }

    _compute_showStaticNonAuthorized(auth0Loaded, auth0Progress, userInfoIsAuth)
    {
        return auth0Loaded && !auth0Progress && userInfoIsAuth
    } 

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

    _tryReconnect(e)
    {
        this._goSignOut(this.homeUrl)
    }

    _visibleChanged(visible, o)
    {
        if (!visible) { return }

        this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
            title: this.localize('signout-title-document') 
        } }))
    }

}
