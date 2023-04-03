import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-slider/paper-slider.js'
import '@polymer/paper-progress/paper-progress.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-listbox/paper-listbox'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-item/paper-item'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import { PaperDropdownMenuLightElement } from '@polymer/paper-dropdown-menu/paper-dropdown-menu-light' 
import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/paper-fab/paper-fab.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
// import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { UIBase } from '../ui/ui-base'
import { NetBase } from '../../components/bll/net-base'
import { StringUtil } from '../../components/utils/StringUtil'
// import { css_time_to_milliseconds } from '../../components/utils/CommonUtils'
import '../shared-styles/common-styles'
import view from './ui-search-input.ts.html'
import style from './ui-search-input.ts.css'
import { CustomElement } from '../../components/utils/CommonUtils'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import '../../components/ui/ui-user-inline'

// const UIAdminDialogBase = mixinBehaviors([IronOverlayBehavior], UIBase) as new () => UIBase & IronOverlayBehavior
// const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys



@CustomElement
export class UIAdminSearchInput extends UIBase
{
    static get is() { return 'tmladmin-ui-search-input' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            visible: { type: Boolean, notify: true, },
            disabled: { type: Boolean, notify: true, reflectToAttribute: true },
            label: { type: String, reflectToAttribute: true, value: "Search User" },
            // checkOrganization: { type: Boolean, reflectToAttribute: true }, //check-organization
            // contextOrganization:{ type: String, reflectToAttribute: true },
            tabindex: { type: String, reflectToAttribute: true }, //value: "-1"
            ariaHidden: { type: Boolean, value: true, reflectToAttribute: true },
            search: { type: String, notify: true, },
            userSelected: { type: Object, notify: true, value: null },
            users: { type: Array, notify: true, value: [] },
            websiteUrl: { type: String },

            
            searchType: { type: String, reflectToAttribute: true },

            // APIPath: { type: String, value: '/admin/api/user/', }, // selected by searchType
            api_action: { type: String, value: 'search-user' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, searchType, api_action)' },
            
            // animation: { type: String, value: 'popup', reflectToAttribute: true },
            // scrollTarget: { type: Object, reflectToAttribute: true },
            // frameMargin: { type: String, reflectToAttribute: true },
            // role: { type: String, value: "dialog", reflectToAttribute: true },
        }
    }

    static get observers()
    {
        return [
             '_monitorSearch(search)',
             '_monitorVisibility(visible)',
            //  '_log(visible)',
        ]
    }
    _log(v) { console.log(v) }



    // get usersDropdown() { return this.$['usersDropdown'] as PaperDropdownMenuLightElement }
    get userInput() { return this.$['userInput'] as PaperInputElement }
    
    // get el_container() { return this.$['container'] as HTMLDivElement }
    // get el_focus_trap() 
    // {
    //     if (!this._focustrapinput) this._focustrapinput = this.shadowRoot.querySelector('.focus-trap-input')
    //     return this._focustrapinput
    // }

    //#region Vars

    _searchDebouncer: Debouncer
    _netbaseCombo: NetBase
    disabled: boolean
    api_url: string
    userSelected: any
    users: any
    search: string
    parentTapHandler: any
    searchType: string

    //#endregion


    constructor() 
    { 
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.parentTapHandler = (e) => 
        {
            // console.log(e)
            var epath = e.path || e.composedPath()
            var el = epath ? epath.filter(i => 
            { 
                // console.log(i)
                return i?.nodeName == UIAdminSearchInput.is.toUpperCase()
            }) : []
            if (el?.length == 0 || (el?.length > 0 && el[0] != this))
            {
                this._clearUserSuggestionList()
            }
        }
        document.addEventListener('tap', this.parentTapHandler, EventPassiveDefault.optionPrepare())
    }

    disconnectedCallback()
    {
        if (this.parentTapHandler) { document.removeEventListener('tap', this.parentTapHandler) }
        super.disconnectedCallback()
    }

    _computeAPIUrl(websiteUrl, api_type, api_action)
    {
        if (!websiteUrl || !api_type || !api_action) { return '' }
        var url = `${websiteUrl}/admin/api/${api_type}/${api_action}`
        // console.log(api_type, url)
        return url
    }

    _lastvisible = false
    _monitorVisibility(visible)
    {
        if (this._lastvisible && !visible)
        {
            // console.log('users req cancel')
            if (this._netbaseCombo) { this._netbaseCombo._getResourceCancel }
            this.search = ''
        }

        this._lastvisible = visible
    }

    _monitorSearch(search)
    {
        if (!search)
        {
            this._clearUserSuggestionList()
            return
        }

        var url = this.api_url
        // url = StringUtil.urlquery(url, {})
        var obj = {
            "search": search,
            "for-organization": true,
        }
        var rq = {
            url: url,
            body: obj,
            method: "POST",
            handleAs: "json",
            debounceDuration: 300,
            onLoad: (e) =>
            {
                var response = e.response

                if (response['success'] === true && response['result'])
                {
                    // console.log(response['result'])
                    var res = response['result']
                    var users = res?.Users
                    if (res?.HasMore)
                    {
                        // users.push({})
                    }
                    this.set('users', users)
                    this.set('userSelected', null)
                    // this.usersDropdown.opened = true


                    //google-oauth2|1095
                    // Users: []
                    //     Email: "ruslan.kim@gmail.com"
                    //     Name: "Ruslan Kim"
                    //     Organization: {OrganizationID: "IBLZJHVTKJY5CCEVH3KJS512LXG", OrganizationName: "Teamatical Inc."}
                    //     UserID: "google-oauth2|109572529448461700620"
                }
                else
                {
                    //
                }
            },
            onError: (e) =>
            {
                this._clearUserSuggestionList()
            },
        }


        this._searchDebouncer = Debouncer.debounce(this._searchDebouncer, timeOut.after(950), () => 
            {
               if (!this._netbaseCombo) { this._netbaseCombo = new NetBase() }
               this._netbaseCombo._getResource(rq, 1, true)
            }
        )
    }

    onInputChanged(e)
    {
        var epath = e.path || e.composedPath()

        // var orderi = e.model.__data.orderi
        // this.ordersData.resetError(orderi, epath[0].name)
        // epath[0].invalid = false
    }
    
    disabledDueOrganization(checkOrganization, contextOrganizationID, useriOrganization)
    {
        return false //(checkOrganization === true && useriOrganization?.OrganizationID == contextOrganizationID)
    }

    _onItemTap(e)
    {
        const useri = e.model.__data.useri
        // console.log(useri)
        // Email: "rem3rijly@gmail.com"
        // Name: "Rij Ly"
        // Organization: {OrganizationID: "IBLZJHVTKJY5CCEVH3KJS512LXG", OrganizationName: "Teamatical Inc."}
        // UserID: "google-oauth2|118347016870716475857"
        this.userSelected = JSON.parse( JSON.stringify( useri ) )
        this.userInput.value = useri.Email ? useri.Email : useri.UserID

        this._clearUserSuggestionList(false)
    }

    _addUserTap(e)
    {
        // var useridInput = e.target.parentElement
        // var userid = useridInput.value
        // if (!userid) { return }

        // var user = { UserID: userid.trim() }
        // useridInput.value = ''
        const user = this.userSelected
        if (!user) { return }

        this.dispatchEvent(new CustomEvent('api-search-input-added', { bubbles: true, composed: true, detail: { 
            type: this.searchType,
            user: user,
            target: e.target,
        } }))

        this.userInput.value = ''
        this._clearUserSuggestionList()

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    // 
    _clearUserSuggestionList(clearSelected = true)
    {
        if (this.users?.length > 0) { this.set('users', []) }
        if (clearSelected) { this.set('userSelected', null) }
    }

    // onAnyWhereTap(e)
    // {
    //     // console.log(e)
    //     var epath = e.path || e.composedPath()
    //     var frame = epath.filter(i => { return i.classList && i.classList.contains('frame')} )
    //     if (frame.length == 0)
    //     {
    //         this.dismiss()
    //         return this.eventNullStop(e)
    //     }
    // }

    // open()
    // {
    //     this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-opening', { bubbles: true, composed: true, detail: { opening: true } }))

    //     var cont = this._getScrollContainer()

    //     //show dialog
    //     this.opened = true

    //     //start animation
    //     this.popAnimation = true

    //     var autofocus = this.querySelector('[autofocus]') as HTMLElement
    //     if (autofocus)
    //     {
    //         autofocus.focus()
    //     }
    //     else
    //     {
    //         this.el_focus_trap.focus()
    //     }

    //     //save scroll
    //     if (cont)
    //     {
    //         this._contOverlay = cont.scrollTop
    //         cont.scrollTop = 0
    //     }
    // }

    // close()
    // {
    //     //restore scroll
    //     var cont = this._getScrollContainer()
    //     if (cont)
    //     {
    //         cont.scrollTop = this._contOverlay
    //     }

    //     //start hide animation
    //     this.hideAnimation = true //!!!!Start Hide Animation
    //     this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-closing', { bubbles: true, composed: true, detail: { closing: true } }))


    //     //extruct animation duration by container
    //     var cstyle = window.getComputedStyle(this.el_container, null)
    //     var durStr = cstyle.getPropertyValue('animation-duration')
    //     var dur = 300
    //     try
    //     {
    //         dur = css_time_to_milliseconds(durStr)
    //     }
    //     catch(ex)
    //     {
    //         console.error(ex)
    //     }
    //     // console.log(durStr, dur)

    //     //await animation is done
    //     var tms = this.animation == 'none' ? 0 : dur
    //     this._animationDebouncer = Debouncer.debounce(
    //         this._animationDebouncer,
    //         timeOut.after(tms),
    //         () =>
    //         {
    //             //hide everthing and initiate animations
    //             this.opened = false
    //             this.hideAnimation = false
    //             this.popAnimation = false

    //             this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-closed', { bubbles: true, composed: true, detail: { closed: true } }))
    //         }
    //     )
    // }


    // dismiss()
    // {
    //     // if (this.disabled) { return } //disabled don't block dismiss

    //     this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-dismiss', { bubbles: true, composed: true, detail: { dismiss: true } }))

    //     this.close()
    //     //TODO: event
    // }

    // confirm()
    // {
    //     if (this.disabled) { return }

    //     this.dispatchEvent(new CustomEvent('tmladmin-ui-dialog-confirm', { bubbles: true, composed: true, detail: { confirm: true } }))

    //     this.close()
    //     //TODO: event
    // }

    // _onKeydownEvent(e)
    // {
    //     if (!this.opened) { return }

    //     var keycode
    //     var wevent: any = window.event
    //     if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

    //     if (!e.shiftKey && !e.altKey && !e.ctrlKey && keyboardEventMatchesKeys(e, 'esc'))
    //     {
    //         this.dismiss()
    //     }

    //     // this.disabled //disabled block all action except dismiss
    // }

    // _onHistoryPopstate(e)
    // {
    //     //
    // }

    // _onBeforeUnload(e)
    // {
    //     //
    // }

}
