import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { UserInfoModel } from '../dal/user-info-model'
import '../shared-styles/common-styles'
import view from './signin.ts.html'
import style from './signin.ts.css'
import '../ui/ui-button'


@FragmentDynamic
export class Signin extends FragmentBase
{
    static get is() { return 'teamatical-signin' }

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

            _showSuccess: { type: Boolean, computed: '_compute_showSuccess(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            _showProgress: { type: Boolean, computed: '_compute_showProgress(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            _showStaticNonAuthorized: { type: Boolean, computed: '_compute_showStaticNonAuthorized(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            _showStaticIsAuthorized: { type: Boolean, computed: '_compute_showStaticIsAuthorized(auth0Loaded, auth0Progress, userInfo.isAuth)' },
            
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },
        }
    }

    visible: any
    userInfo: UserInfoModel
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

    _compute_showSuccess(auth0Loaded, auth0Progress, userInfo_isAuth)
    {
        return auth0Loaded && auth0Progress === true && userInfo_isAuth === true
    }

    _compute_showProgress(auth0Loaded, auth0Progress, userInfo_isAuth)
    {
        return auth0Loaded && auth0Progress === true && userInfo_isAuth !== true
    }

    _compute_showStaticNonAuthorized(auth0Loaded, auth0Progress, userInfo_isAuth)
    {
        return auth0Loaded && !auth0Progress && userInfo_isAuth !== true
    }

    _compute_showStaticIsAuthorized(auth0Loaded, auth0Progress, userInfo_isAuth)
    {
        return auth0Loaded && !auth0Progress && userInfo_isAuth === true
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

    _goAccountTap(e)
    {
        this._gotoAccount()
    }

    _tryReconnect(e)
    {
        this._goSignIn(this.homeUrl)
    }

    _visibleChanged(visible, o)
    {
        if (!visible) 
        { 
            return 
        }

        this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
            title: this.localize('signin-title-document') 
        } }))
    }

}