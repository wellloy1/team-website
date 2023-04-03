import '@polymer/paper-icon-button/paper-icon-button.js'
import { html } from '@polymer/polymer/polymer-element'
import { CustomElement } from '../utils/CommonUtils'
import { UserInfoModel } from '../dal/user-info-model'
import { UIBase } from '../ui/ui-base'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
// import { OrganizationsData } from '../bll/organizations-data'
// import '../bll/organizations-data'
import '../ui/ui-image'
import '../shared-styles/common-styles'
import '../shared-styles/tooltip-styles'
import view from './ui-account-button.ts.html'
import style from './ui-account-button.ts.css'


@CustomElement
export class UIAccountButton extends UIBase
{
    static get is() { return 'teamatical-ui-account-button' }
    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles">${style}</style>${view}`])}
    static get properties()
    {
        return {
            userInfo: { type: Object, },

            accountUrl: { computed: '_compute_accountUrl(userInfo, userInfo.isAuth, userInfo.orgUser)' },

            _avatarTooltip: { type: String, computed: '_compute_avatarTooltip(userInfo, userInfo.isAuth, userInfo.profile, userInfo.orgUser, userInfo.orgUserSelected, userInfo.orgName)' },
            _avatarCaption: { type: String, computed: '_compute_avatarCaption(userInfo, userInfo.isAuth, userInfo.profile)' },

            isUnauthenticatedBtn: { computed: '_compute_isUnauthenticatedBtn(userInfo, userInfo.isAuth, userInfo.orgUser, userInfo.orgUserSelected)' },
            isAuthAsOrganizationBtn: { computed: '_compute_isAuthAsOrganizationBtn(userInfo, userInfo.isAuth, userInfo.orgUser, userInfo.orgUserSelected)' },
            isAuthAsPersonBtn: { computed: '_compute_isAuthAsPersonBtn(userInfo, userInfo.isAuth, userInfo.orgUser, userInfo.orgUserSelected, userInfo.profile.picture)' },
            isAuthAsPersonPictureBtn: { computed: '_compute_isAuthAsPersonPictureBtn(userInfo, userInfo.isAuth, userInfo.orgUser, userInfo.orgUserSelected, userInfo.profile.picture)', },

            showPopupMenu: { computed: '_compute_showPopupMenu(userInfo, userInfo.isAuth, userInfo.orgUser, userInfo.orgUserSelected, userInfo.profile.picture)', reflectToAttribute: true },
            menuList: { computed: '_compute_menuList(userInfo, userInfo.*)'  },
        }
    }
    static get observers()
    {
        return [
            // 'userRole_Changed(userInfo.isAuth, userInfo.isAdmin, userInfo.isDesignerAdmin, userInfo.isPrinter, userInfo.isCustomerService, userInfo.isPartner)',
        ]
    }
    _log() { console.log('ui-account-button', ...arguments) }


    //#region Vars

    userInfo: UserInfoModel
    // get organizationsData() { return this.$['organizations-data'] as OrganizationsData }

    //#endregion


    constructor()
    {
        super()
    }
    

    _showOrgName(isAuth, orgUser, orgUserSelected, orgName)
    {
        return isAuth && (orgUser && orgUserSelected) && this._asBool(orgName)
    }

    _accountOrganization(isAuth, orgUser)
    {
        return this._asBool(isAuth) && this._asBool(orgUser)
    }

    _accountTap(e)
    {
        if (e?.target?.classList && (!e.target.classList.contains('unauth')))
        {
            e.stopPropagation()
            e.preventDefault()
            return //exit
        }

        if (!this.userInfo?.isAuth)
        {
            this.dispatchEvent(new CustomEvent('ui-user-auth', {
                bubbles: true, composed: true, detail: {
                    signin: true,
                    shref: window.location.href,
                }
            }))
            // this._onUserAuthUI({ detail: { signin: true, shref: window.location.href } })
            e.stopPropagation()
            e.preventDefault()
            return //exit
        }
    }

    _signoutTap(e)
    {
        if (this.userInfo?.isAuth)
        {
            this.dispatchEvent(new CustomEvent('ui-user-auth', {
                bubbles: true, composed: true, detail: {
                    signout: true,
                    shref: window.location.href,
                }
            }))
            e.stopPropagation()
            e.preventDefault()
            return //exit
        }
    }

    _signinTap(e)
    {
        if (!this.userInfo?.isAuth)
        {
            this.dispatchEvent(new CustomEvent('ui-user-auth', {
                bubbles: true, composed: true, detail: {
                    signin: true,
                    shref: window.location.href,
                }
            }))
            e.stopPropagation()
            e.preventDefault()
            return //exit
        }
    }

    _compute_menuList(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP).filter(i => i.showAccount)
    }

    _compute_accountUrl(userInfo, isAuth, orgUser)
    {
        let url = this._hrefSignIn()
        if (isAuth === true)
        {
            url = '#'

            url = this._hrefAccount()
            if (orgUser)
            {
                url = this._hrefAccountOrganizations()
            }
        }
        return url
    }

    _compute_avatarCaption(userInfo, isAuth, profile)
    {
        var t = ''
        if (isAuth)
        {
            t = this._formatUserinfo(userInfo)
        }
        return t
    }

    _compute_avatarTooltip(userInfo, isAuth, profile,  orgUser, orgUserSelected, orgName)
    {
        var t = this.localize('app-title-account-tooltip')
        if (isAuth)
        {
            t = this._formatUserinfo(userInfo) //profile
            if ((orgUser && orgUserSelected) && this._asBool(orgName))
            {
                t =  this._asBool(t) ? `${orgName}:\n${t}` : `${orgName}`
            }
        }
        return t
    }

    _compute_isUnauthenticatedBtn(userInfo, isAuth, orgUser, orgUserSelected)
    {
        return isAuth !== true
    }

    _compute_isAuthAsOrganizationBtn(userInfo, isAuth, orgUser, orgUserSelected)
    {
        return isAuth === true && (orgUser && orgUserSelected)
    }

    _compute_isAuthAsPersonBtn(userInfo, isAuth, orgUser, orgUserSelected, profile_picture)
    {
        return isAuth === true && !(orgUser && orgUserSelected) && !profile_picture
    }

    _compute_isAuthAsPersonPictureBtn(userInfo, isAuth, orgUser, orgUserSelected, profile_picture)
    {
        return isAuth === true && !(orgUser && orgUserSelected) && profile_picture
    }

    _compute_showPopupMenu(userInfo, isAuth, orgUser, orgUserSelected, profile_picture)
    {
        return true
    }
}
