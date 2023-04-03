import '@polymer/iron-icon/iron-icon.js'
import '@polymer/app-route/app-route.js'
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js'
import '@polymer/iron-overlay-behavior/demo/simple-overlay.js'
import { IronOverlayBehaviorImpl } from '@polymer/iron-overlay-behavior'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency, convertLocalDateISO, convertLocalTimeISO } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { Guid } from '../utils/MathExtensions'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { UIStoreItem } from '../ui/ui-store-item'
import { UISortableList } from '../ui/ui-sortable-list'
import { StoreData } from '../bll/store-data'
import '../bll/store-data'
import '../ui/ui-loader'
import '../ui/ui-store-item'
import '../ui/ui-button'
import '../ui/ui-button-share'
import '../ui/ui-validation-summary'
import '../ui/ui-list-subcategory'
import '../ui/ui-network-warning'
import '../ui/ui-sortable-list'

//---lit---
import '../ui/paper-expansion-panel'
import '../ui/ui-date-time'
import '../ui/ui-description'
// import '../ui/ui-richtext-editor'
import { UIRichtextEditor } from '../ui/ui-richtext-editor'
//---lit-end---

//@dynamicaly loading in store..._startEdit
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-toggle-button/paper-toggle-button.js'
import '@vaadin/vaadin-date-picker/vaadin-date-picker'
import '@vaadin/vaadin-time-picker/vaadin-time-picker'
import '@vaadin/vaadin-custom-field/vaadin-custom-field'
import '@vaadin/vaadin-text-field/vaadin-text-field'
import '@vaadin/vaadin-select/vaadin-select'
import '../ui/ui-select'
import '../ui/ui-image-uploader'
//
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import style_checkout from './checkout.ts.css'
import view from './store.ts.html'
import style from './store.ts.css'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const StoreBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior
const INPUT_SELECTORS = 'paper-input,ui-select,vaadin-date-picker,vaadin-time-picker'
const POPUP_SELECTORS = 'vaadin-date-picker,vaadin-time-picker'
const SERVERERROR_SELECTORS = 'paper-input,ui-select,vaadin-date-picker,vaadin-time-picker,teamatical-ui-validation-summary,teamatical-ui-richtext-editor'
const STORAGEKEY_BANNER = 'store-banner-collapsed'


@FragmentDynamic
export class Store extends StoreBase
{
    static get is() { return 'teamatical-store' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style_checkout} ${style}</style>${view}`])}

    static get properties()
    {
        return {
            store: { type: Object, notify: true },
            categories: { type: Array },
            route: { type: Object },
            routeData: { type: Object, observer: '_routeDataChanged' },
            queryParams: { type: Object, notify: true },
            websiteUrl: { type: String },
            userInfo: { type: Object },
            smallScreen: { type: Boolean },
            appTitleDefault: { type: String, }, // app-title-default
            nocatalogMode: { type: Boolean, computed: '_compute_nocatalogMode(userInfo.customstoreUrl)', notify: true, reflectToAttribute: true },

            isGrid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            localStorage: { type: Object, value: {} },

            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            failure: { type: Boolean, value: false },
            loading: { type: Boolean, value: false, notify: true },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },

            isMoving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            editing: { type: Boolean, value: false, notify: true, reflectToAttribute: true, observer: 'editingObserver' },
            dragging: { type: Boolean, value: false, reflectToAttribute: true },
            firstSection: { type: Boolean, value: true, },
            clipboardItems: { type: Object },
            openedBanner: { type: Boolean, value: false },
            openedDetails: { type: Boolean, value: true },

            storeTab: { type: String, value: 'products' },

            submenu: { type: Array, notify: true, computed: '_computedSubmenu(categories, userInfo, userInfo.*)' },

            uiimages: { type: Array },
            _showEmpty: { type: Boolean, computed: '_computeShowEmpty(store, store.items, store.items.length, failure, offline, loading)' },
            _isFound: { type: Boolean, computed: '_computeIsFound(store.items, failure, offline, loading)' },
            _disabled: { type: Boolean, computed: '_computeDisabled(offline, failure, loading, saving, editing)' },
            _editingMode: { type: Boolean, computed: '_computeEditingMode(store.isowner, editing, failure, offline, loading)' },
            _disabledSwitchGroup: { type: Boolean, computed: '_computeDisabledSwitchGroup(offline, failure, loading, saving, editing, store.shipping.OrderCount)' },
            _disabledSwitchCustomize: { type: Boolean, computed: '_computeDisabledSwitchCustomize(offline, failure, loading, saving, editing, store.shipping.OrderCount)' },
            _disabledHidePrices: { type: Boolean, computed: '_compute_disabledHidePrices(offline, failure, loading, saving, editing)' },
            _disabledInPublicCatalog: { type: Boolean, computed: '_compute_disabledInPublicCatalog(offline, failure, loading, saving, editing)' },
            _disabledQuickCustomize: { type: Boolean, computed: '_computeDisabledQuickCustomize(offline, failure, loading, saving, editing, store.shipping.OrderCount)' },
            _disabledCheckoutCodeOnly: { type: Boolean, computed: '_compute_disabledCheckoutCodeOnly(offline, failure, loading, saving, editing, store.allowCheckoutCodeOnly)' },

            hideCustomizingLock: { type: Boolean, computed: '_computeHideCustomizingLock(editing, store.hidecustomize, store.isowner)' },
            hideStoreDefault: { type: Boolean, computed: '_computeHideStoreDefault(editing, store.isdefault, store.isowner)' },

            _hideEditDelayed: { type: Boolean, value: false, notify: true },
            _hideEdit: { type: Boolean, computed: '_computeHideEdit(store.isbranded, store.isowner, editing)' },
            _hideSaveDelayed: { type: Boolean, value: true, notify: true },
            _hideSave: { type: Boolean, computed: '_computeHideSave(store.isowner, editing)' },
            // _hideTabsDelayed: { type: Boolean, value: false, notify: true },
            // _hideTabs: { type: Boolean, computed: '_computeHideTabs(store.isowner, store.isgroup, editing)' },
            _hideAdminsDelayed: { type: Boolean, value: true, notify: true },
            _hideAdmins: { type: Boolean, computed: '_computeHideAdmins(store.isbranded, store.isowner, editing)' },
            _hideParticipantsLink: { type: Boolean, computed: '_compute_hideParticipantsLink(store.isbranded, store.isowner)' },
            _hideCheckoutCodeOnly: { type: Boolean, computed: '_compute_hideCheckoutCodeOnly(store.allowCheckoutCodeOnly)' },
            _hideGroupOrderDelayed: { type: Boolean, value: true, notify: true },
            _hideGroupOrder: { type: Boolean, computed: '_compute_hideGroupOrder(store.isbranded, store.isowner, store.hasgroupshippings)' },
            _hideStoreMatrixDelayed: { type: Boolean, value: true, notify: true },
            _hideStoreMatrix: { type: Boolean, computed: '_compute_hideStoreMatrix(editing, store.isMatrix, store.isowner)' },
            _storeMatrixName: { type: Boolean, computed: '_compute_StoreMatrixName(store.matrixName, store.isMatrix, visible)' },
            _hideMatrixDelayed: { type: Boolean, value: true, notify: true },
            _hideMatrix: { type: Boolean, computed: '_compute_hideMatrix(editing, store.hasMatrix, store.isowner)' },
            _disabledMatrix: { type: Boolean, computed: '_compute_disabledMatrix(offline, failure, loading, saving, editing)' },
    

            _shareType: { type: String, computed: '_compute_shareType("store", store.isbranded)' },
            _showHeroImage: { type: Boolean, computed: '_compute_showHeroImage(store.storelogo, editing)' },
            _heroImageStyles: { type: String, computed: '_compute_heroImageStyles(store.storelogo.h)' },
            _hideGridSwitcher: { type: Boolean, computed: '_compute_hideGridSwitcher(store.isbranded, store.isowner)' },
            _hideShare: { type: Boolean, computed: '_computeHideShare(store, store.items, store.items.length, store.isbranded, store.isowner, editing, failure, offline, loading, _hideShippingDelayed)' },
            _hideShareBranded: { type: Boolean, computed: '_computeHideShareBranded(store, store.items, store.items.length, store.isbranded, store.sidbranded, store.isowner, editing, failure, offline, loading, _hideShippingDelayed)' },
            _hideBannerBranded: { type: Boolean, computed: '_compute_hideBannerBranded(store.sidbranded, editing)' },
            _disableShare: { type: Boolean, computed: '_computeDisableShare(store, store.isowner, editing, failure, offline, loading)' },
            _hideLive: { type: Boolean, computed: '_computeHideLive(store.shipping.IsActive, store.isowner, editing)' },
            _disabledLiveIsGroup: { type: Boolean, computed: '_computeDisabledLiveIsGroup(store.shipping.IsActive, store.isowner, editing, store.isgroup)' },

            optionnew: { type: Object, value: {} },

            _hideListDelayed: { type: Boolean, value: true, notify: true },
            _hideList: { type: Boolean, computed: '_computeHideList(editing, store.items, store.isgroup, storeTab, failure, offline)' },
            _hideListCaption: { type: Boolean, computed: '_compute_hideListCaption(editing, store.items, store.isgroup, storeTab, failure, offline, store.isowner)' },
            _hideShippingDelayed: { type: Boolean, value: false, notify: true },
            _hideShipping: { type: Boolean, computed: '_computeHideShipping(editing, store.shipping, store.isgroup, storeTab, failure, offline)' },
            _hideStoreDesc: { type: Boolean, computed: '_computeHideStoreDesc(editing, store.description)'},
            _hideTopButtons: { type: Boolean, computed: '_compute_hideTopButtons(editing, store.items)'},

            _hideDeliveryDetails: { type: Boolean, computed: '_computeHideDeliveryDetails(store.shipping.DeliveryDetailsOnly)' },
            _hideGroupAlert: { type: Boolean, computed: '_computeHideGroupAlert(store.shipping.IsActive, store.shipping.AccountEmail, store.shipping.AccountPhone)' },
            _hideOrganization: { type: Boolean, computed: '_computeHideOrganization(editing, store.bindorganization, store.organization)' },
            _hideRecentlyViewed: { type: Boolean, computed: '_computeHideRecentlyViewed(loading, store.RecentProducts, editing)' },

            _allowEditOrganization: { type: Boolean, computed: '_compute_allowEditOrganization(editing, store.caneditorganization, store.bindorganization, store.bindorganizationWas, store.items)' },

            _isConn: { type: Boolean, computed: '_computeIsConnecting(store, store.items, store.items.length, failure, offline, loading)' },
            _isGroupDeadline: { type: Boolean, computed: '_computeIsGroupDeadline(store.isgroup, store.shipping.IsActive, editing, store.isowner)' },
            _isGroupDeadlineDone: { type: Boolean, computed: '_computeIsGroupDeadlineDONE(store.isgroup, store.shipping.IsActive, editing, store.shippingarchived, store.isowner)' },
            _isGroupConfirming: { type: Boolean, computed: '_computeIsGroupConfirming(store.isgroup, store.shipping.IsActive, editing, store.shipping.IsConfirmingAccountEmail, store.shipping.IsConfirmingAccountPhone, store.isowner)' },

            _isEditingAndGroupShipping: { type: Boolean, value: false, reflectToAttribute: true }, //_is-editing-and-group-shipping
            smallItemsWidth: { type: Boolean, computed: '_compute_smallItemsWidth(_isEditingAndGroupShipping, isGrid)', reflectToAttribute: true },

            groupdeadlinemin: { type: String, value: convertLocalDateISO(), readonly: true, notify: true },
            groupdeadlinemax: { type: String, computed: '_compute_groupdeadlinemax(store, store.groupdeadlinemax.ms)', },
            groupdeadlinenative: { type: Boolean, computed: '_computeDatePickerNative(editing)' },
            groupdeadlinedate: { type: String, notify: true, observer: '_storeGroupdeadlineDateChanged' },
            groupdeadlinetime: { type: String, value: convertLocalTimeISO(), notify: true, observer: '_storeGroupdeadlineTimeChanged' },

            countryGroupProfile: { type: Object, notify: true },
            hidden_ShipTaxID: { type: Boolean, computed: '_compute_hidden_ShipTaxID(countryGroupProfile.ShipTaxID, store.shipping.IsCompany)' },
            hidden_ShipEORI: { type: Boolean, computed: '_compute_hidden_ShipEORI(countryGroupProfile.ShipEORI, store.shipping.IsCompany)' },

            // exacttime: { type: Boolean },
            // editingDetails: { type: Array, value: [] },

            storelogo: { type: Array, value: [] },
        }
    }

    static get observers()
    {
        return [
            '_storeTitleChanged(visible, editing, store)',

            '_isEditingAndGroupShippingChanged(editing, store.isgroup)',
            '_isHideShippingDelayedChanged(_hideShippingDelayed)',
            '_timeoutMonitoring(store.isgroup, store.groupdeadline, store.shipping.IsActive, visible)',

            '_storeChanged(store.*)',
            '_storeLoaded(store)',
            '_storeServerErrors(store.result.notvalid)',
            '_storeServerValidationRules(store.ValidationRules)',
            '_storeGroupdeadlineMsChanged(store.groupdeadline.ms)',

            '_scroolToRecentlyAddedItem(queryParams.item, store.items, uiimages)',
            // '_editingDetails(store.items.)',
            
            '_localStorageChanged(localStorage)',
            '_activateListObserver(visible, editing)',
            '_loadRichtextEditor(visible, editing)',
            '_clearClipboard(visible, editing)',

            // '_log(isMoving)',
        ]
    }
    _log(v) { console.log('store', v) }

    get items() { return this.$['items'] as UISortableList }
    get storeData() { return this.$['storeData'] as StoreData}
    get shipping() { return this.$['shipping'] as HTMLElement }
    get formElements(): HTMLElement { return this.$ }
    get form(): HTMLElement { return this.shadowRoot }
    get uilist() { return this.$['list'] as HTMLElement }
    get uititle() { return this.$ ? this.$['title'] as HTMLElement : null }
    get uiAccountEmailConfirmDialog() { return this.$['AccountEmailConfirmDialog'] as any }
    get uiAccountPhoneConfirmDialog() { return this.$['AccountPhoneConfirmDialog'] as any }
    get uiAccountEmailConfirm() { return this.$['AccountEmailConfirm'] as any }
    get uiAccountPhoneConfirm() { return this.$['AccountPhoneConfirm'] as any }


    // #region Vars

    routeData: any
    isMoving: boolean
    _groupDebouncer: any
    _observer: any
    queryParams: any
    _ready: any
    _suppressHistory: any
    _lastState: any
    _resendEmailDebouncer: any
    _resendPhoneDebouncer: any
    _update_groupdeadline_ms: any
    _editingMode: any
    _timeoutMonitoringDebouncer: any
    _changeSectionDebouncer: any
    _shippingDebouncer: any
    _listDebouncer: any 
    _hideShippingDelayed: any
    _isEditingAndGroupShipping: any
    _hideListDelayed: any
    _shippingRect: any 
    _uilistRect: any
    _last_uilistRect: any
    _editDebouncer: any 
    _saveDebouncer: any 
    _adminsDebouncer: any
    _hideEditDelayed: any 
    _validationRules_hash: any
    _submenuDebouncer: any
    _hideSaveDelayed: any
    _hideAdminsDelayed: any
    _hideGroupOrderDelayed: boolean
    optionnew: any
    firstSection: any
    _lastFirstSection: boolean
    smallScreen: any 
    uiimages: any
    isAttached: any
    visible: any
    route: any
    editing: any
    groupdeadlinedate: any
    groupdeadlinetime: any
    store: any
    storeTab: any
    _scrollToDebouncer: any
    isGrid: boolean
    localStorage: any
    store_groupdeadline_changed: any
    storelogo: any
    uilist_observer: IntersectionObserver
    _hideStoreMatrixDelayed: boolean
    _hideMatrixDelayed: boolean
    clipboardItems: any
    openedBanner: boolean = false

    // #endregion Vars

    constructor()
    {
        super()
    }

    connectedCallback()
    {

        super.connectedCallback()

        this.isAttached = true

        let options = {
            root: this.uilist.parentElement,
            rootMargin: '0px',
            threshold: 1.0
        }

        this.uilist_observer = new IntersectionObserver((e) => this.uilistObserverCallback(e), options)

        this.openedBanner = !this.smallScreen
        if (window.sessionStorage) 
        {
            let collapsed = window.sessionStorage.getItem(STORAGEKEY_BANNER)
            this.openedBanner = collapsed == 'true' ? false : true
        }
    }

    _onToggleBannerUpload(e)
    {
        this.openedBanner = e.detail.opened
        if (window.sessionStorage) { window.sessionStorage.setItem(STORAGEKEY_BANNER, (!this.openedBanner).toString()) }
        e.preventDefault()
        e.stopPropagation()
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
        this.isAttached = false
        if (this._observer) { this._observer.disconnect() }
        if (this.uilist_observer) { this.uilist_observer.disconnect() }
    }

    ready()
    {
        super.ready()
        this._ready = true

        this.addEventListener('api-store-item-delete', (e) => this._onStoreItemDelete(e))
        this.addEventListener('api-store-item-move', (e) => this._onStoreItemMove(e))
        this.addEventListener('api-store-item-cut', (e) => this._onStoreItemCut(e))
        this.addEventListener('api-store-item-uncut', (e) => this._onStoreItemUnCut(e))
        this.addEventListener('api-store-item-paste', (e) => this._onStoreItemPaste(e))
        this.addEventListener('api-store-item-editing-details', (e) => this._onStoreItemEditingDetails(e))

        document.addEventListener("keydown", (e) => this.onKeydown(e)) //need to be first then overlay dialog binds keyboard
        window.addEventListener("resize", (e) => this._onResized(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("scroll", (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())
        window.addEventListener("popstate", (e) => this.onHistoryPopstate(e), EventPassiveDefault.optionPrepare())

        this._observer = new FlattenedNodesObserver(this.items, (info:any) =>
        {
            var imgsAdded = info.addedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('products-item')) }) //&& node.tagName == 'LI'
            var imgsRemoved = info.removedNodes.filter(function (node) { return (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('products-item')) })

            if (!this.uiimages) { this.uiimages = [] }

            this.uiimages = this.uiimages.concat(imgsAdded)
            for (var i in imgsRemoved)
            {
                var inx = this.uiimages.indexOf(imgsRemoved[i])
                this.uiimages.splice(inx, 1)
            }
        })

        this.items.addEventListener('dom-change', (e) =>
        {
            this.async(() =>
            {
                this._onResized()
                this._bindHtmlValidationRules()
            }, 17)
        })
    }

    _urlStoreLogo(orgID, storeLogo)
    {
        return ['images', 'custom-store', orgID, storeLogo].join('/')
    }
    
    _compute_shareType(customizationType, isBranded)
    {
        return customizationType
        // return `${customizationType}${isBranded ? '-branded' : ''}`
    }

    _compute_nocatalogMode(customstoreUrl)
    {
        return this._asBool(customstoreUrl)
    }

    _localStorageChanged(v, o)
    {
        if (!v) { return }

        if (v && v.isGrid !== undefined && this.store.isowner === true)
        {
            this.isGrid = v.isGrid
        }
    }

    gripSwitchTap(e)
    {
        this._cancelEdit()
        this.async(() =>
        {
            
            this.isGrid = !this.isGrid
            if (this.localStorage) { this.set('localStorage.isGrid', this.isGrid) }
            this.async(() => { this.items.dispatchEvent(new CustomEvent('iron-resize')) })
        })
    }

    editingObserver(editing, o) 
    {
        // console.log('editingObserver', o, ' => ', editing)
        // if (o != undefined && editing == false && !this._suppressHistory) 
        // {
        //     window.history.back()
        // }

        if (o == true && editing == false)
        {
            this._onStoreItemEditingDetails({ detail: { dom: null } })
        }
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e, 'store')
    }

    onHistoryPopstate(e)
    {
        e = e || window.event
        if (!this.visible) { return }


        if (this._suppressHistory) { return }
        this._suppressHistory = true

        // console.log(this._lastState, e['state'])

        if (this._lastState && this._lastState['store'] == this.store.sid)
        {
            this._lastState = e['state']
            if (this.editing) this._cancelEdit()
            // this.editing = false
            // console.log(this.editing)
        }
        else if (e && e['state'] && e.state['store'] == this.store.sid)
        {
            this._lastState = e['state']
            if (!this.editing) this._startEdit()
            // this.editing = true
            // console.log(this.editing)
        }

        var popups:any = this.shadowRoot?.querySelectorAll(POPUP_SELECTORS)
        if (popups)
        {
            for (var popupi of popups)
            {
                if (popupi.close) { popupi.close() }
                if (popupi.__dropdownElement?.close) { popupi.__dropdownElement.close() }
            }
        }
        this._suppressHistory = false
    }

    onListItem(e)
    {
        if (this.editing)
        {
            e.preventDefault()
            return false
        }
    }

    hideConfirm(state, confirmed, progress)
    {
        var v = true
        switch (state)
        {
            case 'send':
                v = !confirmed && progress
                break

            case 'confirming':
                v = !confirmed && progress
                break

            case 'confirmed':
                v = confirmed && !progress
                break
        }
        return !v
    }

    resendEmailTap(e)
    {
        var email = e.target
        email.disabled = true

        this.storeData.resendConfirm('email')
        this.uiAccountEmailConfirmDialog.close()

        this._resendEmailDebouncer = Debouncer.debounce(
            this._resendEmailDebouncer,
            timeOut.after(30000),
            () =>
            {
                email.disabled = false
            }
        )
    }
    
    resendPhoneTap(e)
    {
       var phone = e.target
        phone.disabled = true

        this.storeData.resendConfirm('phone')
        this.uiAccountPhoneConfirmDialog.close()

        this._resendPhoneDebouncer = Debouncer.debounce(
            this._resendPhoneDebouncer,
            timeOut.after(30000),
            () =>
            {
                phone.disabled = false
            }
        )
    }

    confirmEmailDialog(e)
    {
        this.uiAccountEmailConfirmDialog.toggle()
    }

    confirmPhoneDialog(e)
    {
        this.uiAccountPhoneConfirmDialog.toggle()
    }


    viewParticipantsUrl(groupShippingID)
    {
        if (!groupShippingID) { return '' }
        return this._hrefAccountStoreGroup(groupShippingID)
    }

    onKeydown(e)
    {
        if (!this.visible) { return }
        
        e = e || window.event

        var f = this.uititle ? this.uititle.getAttribute("focused") : null
        const selector = INPUT_SELECTORS
        if (this.form)
        {
            var piList = Array.prototype.slice.call(this.form.querySelectorAll(selector))
            for (var i in piList)
            {
                var pi = piList[i]
                // console.log(pi.id)
                if (pi && pi.getAttribute && pi.getAttribute("focused") !== null)
                {
                    // console.warn(pi)
                    f = ''
                }
            }
        }


        var fc1E = this.uiAccountEmailConfirm
        var fc2E = this.uiAccountPhoneConfirm
        var fc1 = fc1E ? fc1E.getAttribute("focused") : null
        var fc2 = fc2E ? fc2E.getAttribute("focused") : null

        if (keyboardEventMatchesKeys(e, 'enter') && this.editing)
        {
            var p = false

            if (fc1 !== null)
            {
                p = true
                this.uiAccountEmailConfirmDialog.close()
            }
            if (fc2 !== null)
            {
                p = true
                this.uiAccountPhoneConfirmDialog.close()
            }


            if (f !== null && !p)
            {
                p = true
                this._saveEdit()
            }

            if (this.uiimages)
            {
                for (var i in this.uiimages)
                {
                    var eli = this.uiimages[i] as UIStoreItem
                    if (eli && eli.editingDetails && eli.editingDetailsHide)
                    {
                        p = true
                        eli.editingDetailsHide(true)
                        break
                    }
                }
            }

            if (p)
            {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        else if (!e.shiftKey && !e.altKey && e.ctrlKey && (keyboardEventMatchesKeys(e, 's') || e.code == "KeyS") && this.editing)
        {
            this._saveEdit()
            e.preventDefault()
            e.stopPropagation()
        }

        if (keyboardEventMatchesKeys(e, 'esc') && this.editing)
        {
            //hide store-item popup dialogs if any
            if (this.uiimages)
            {
                for (var i in this.uiimages)
                {
                    var eli = this.uiimages[i] as UIStoreItem
                    if (eli && eli.editingDetails && eli.editingDetailsHide)
                    {
                        eli.editingDetailsHide(true)
                        e.preventDefault()
                        e.stopPropagation()
                        return //EXIT
                    }
                }
            }

            this._cancelEdit()

            e.preventDefault()
            e.stopPropagation()
        }
    }

    formatTZ(tz)
    {
        if (tz === undefined) { return '' }

        var pad = (s, size) =>
        {
            while (s.length < (size || 2)) { s = "0" + s }
            return s
        }
        var h = Math.floor(tz / 60)
        var m = Math.abs(tz % 60)
        var v = h + ':' + pad(m.toString(), 2)
        // console.log(tz, v)
        return v
    }

    _removeCustOptTap(e)
    {
        var indexi = e.model.__data.index
        this.splice('store.shipping.CustomOptions', indexi, 1)
    }

    _addCustOptTap(e)
    {
        var optionnew = this.optionnew
        if (!optionnew.CustomOptionName || !optionnew.CustomOptionName.trim || optionnew.CustomOptionName.trim() == '') { return }
        optionnew.CustomOptionName = optionnew.CustomOptionName.trim()
        if (!this.store.shipping.CustomOptions) { this.set('store.shipping.CustomOptions', []) }
        this.push('store.shipping.CustomOptions', optionnew)
        this.set('optionnew', {})
    }

    _onSortFinish(e)
    {
        // this._storeItemsDOMToModel(e.detail.items) //moved to actions
    }

    storeGroupdeadlineDateChangedEvent(e)
    {
        // console.log(e)
        this.store_groupdeadline_changed = true
        return this._onInputChanged(e, 'store')
    }

    storeGroupdeadlineExactChangedEvent(e)
    {
        this.store_groupdeadline_changed = true
        this._storeGroupdeadlineDateChanged(this.groupdeadlinedate)
    }

    _setStoreGroupdeadline(groupdeadlinedate, groupdeadlinetime)
    {
        var dd = new Date()
        var tt = new Date()
        try
        {
            dd.setTime(Date.parse(groupdeadlinedate) + dd.getTimezoneOffset() * 60000)
            tt.setTime(Date.parse(`1970-01-01T${groupdeadlinetime}Z`))
            dd.setHours(tt.getUTCHours(), tt.getUTCMinutes(), tt.getUTCSeconds(), 0)
            // console.log(dd)
            // console.log(groupdeadlinedate)
        }
        catch
        {
            //
        }

        // this._update_groupdeadline_ms = true
        if (this.store)
        {
            this.set('store.groupdeadline.ms', dd.getTime())
            this.set('store.groupdeadline.tz', dd.getTimezoneOffset())
        }
        // this._update_groupdeadline_ms = false
    }

    _storeGroupdeadlineDateChanged(v, o?)
    {
        // console.log('_storeGroupdeadlineDateChanged', v, this.store?.groupdeadline_changed)
        if (this._stopMonitorGroupdeadline || this.store_groupdeadline_changed !== true) { return }
        this._setStoreGroupdeadline(v, this.groupdeadlinetime)
    }

    _storeGroupdeadlineTimeChanged(v, o?)
    {
        if (this._stopMonitorGroupdeadline) { return }
        // console.log('_storeGroupdeadlineTimeChanged', v)
        this._setStoreGroupdeadline(this.groupdeadlinedate, v)
    }

    _stopMonitorGroupdeadline: boolean
    _storeGroupdeadlineMsChanged(ms)
    {
        if (!ms || this._update_groupdeadline_ms) { return }
        // console.log('_storeGroupdeadlineMsChanged', ms)
        this._stopMonitorGroupdeadline = true
        this.set('groupdeadlinedate', convertLocalDateISO(ms))
        this.set('groupdeadlinetime', convertLocalTimeISO(ms))
        this._stopMonitorGroupdeadline = false
    }

    switchGroupToggled(e)
    {
        if (e?.target?.checked)
        {
            var dd = new Date()
            this.store.groupdeadline.ms = dd.getTime()
            this._storeGroupdeadlineMsChanged(this.store.groupdeadline.ms)
        }
    }

    _scroolToRecentlyAddedItem(itemid, items, uiimages)
    {
        if (!items || !itemid || !uiimages) { return }

        // console.log(itemid, uiimages)
        var itemsEl = this.root?.querySelectorAll(`teamatical-ui-store-item[data-name="${itemid}"]`)
        if (itemsEl && itemsEl.length > 0)
        {
            var scrolltoE = itemsEl[itemsEl.length - 1]
            var eventNullStop = (e) => { return this.eventNullStop(e) }
            

            this._scrollToDebouncer = Debouncer.debounce(this._scrollToDebouncer, timeOut.after(350), () => {
                try
                {
                    var rect = scrolltoE.getBoundingClientRect()
                    var sto = rect.top - 100
                    delete this.queryParams.item

                    // console.log('scrollIt', sto)
                    var target = this.scrollIt(sto, 650, 'easeInOutCubic', //easeInOutCubic | easeInOutQuad
                        (callback) => {},
                        (animation) =>
                        {
                            if (!animation)
                            {
                                //remove scroll trigger
                                var path = window.location.pathname
                                var qobj = this.queryParams
                                delete qobj.item
                                this.set('queryParams', qobj)
                                this._gotoRS(StringUtil.urlquery(path, qobj))
                                
                                this.async(() =>
                                {
                                    scrolltoE.classList.add('highlight')
                                    this.async(() =>
                                    {
                                        scrolltoE.classList.remove('highlight')

                                        this.async(() =>
                                        {
                                            // console.log('resore weel, pointerEvents: ', pointerEvents)
                                            target == window ? document.body.style.pointerEvents = pointerEvents : target.style.pointerEvents = pointerEvents //restore
                                            target.removeEventListener('wheel', eventNullStop)
                                            target.removeEventListener('DOMMouseScroll', eventNullStop)
                                        }, 300)
                                    }, 250)
                                }, 350)
                            }
                        }
                    )
                    var pointerEvents = target == window ? document.body.style.pointerEvents : target.style.pointerEvents
                    target == window ? document.body.style.pointerEvents = 'none' : target.style.pointerEvents = 'none'
                    target.addEventListener('wheel', eventNullStop, { passive: false })
                    target.addEventListener('DOMMouseScroll', eventNullStop, { passive: false })
                }
                catch
                {
                    //
                }
            })
        }
    }

    _url(image)
    {
        if (!image) { return '' }
        return image
    }

    _timeoutMonitoring(isgroup, groupdeadline, isactive, visible)
    {
        if (!groupdeadline || !isgroup || !isactive || !visible) { return }

        if (this._editingMode) { return }
        
        var barr = [
            {
                title: this.localize('store-groupdeadline-reload-ok'),
                ontap: (e) => 
                {
                    this.storeData.refresh(this.store.sid)
                }
            }
        ]

        var d1 = new Date().setTime(groupdeadline.ms)
        var d2 = new Date().getTime()
        var t = d1 - d2

        // console.log(isgroup, groupdeadline, isactive, t)

        var timeoutMonitoringDebounceHandler = () =>
        {
            d2 = new Date().getTime()
            // console.log(d2.valueOf(), d1.valueOf(), d1.valueOf() - d2.valueOf())
            t = d1 - d2
            if (t < 0)
            {
                this.dispatchEvent(new CustomEvent('api-show-dialog', {
                    bubbles: true, composed: true, detail: {
                        required: true,
                        announce: this.localize('store-groupdeadline-reload-announce'),
                        message: this.localize('store-groupdeadline-reload'),
                        buttons: barr,
                    }
                }))
            }
            else 
            {
                if (t > 1 * 60 * 60 * 1000) { t = 1 * 60 * 60 * 1000 }
                this._timeoutMonitoringDebouncer = Debouncer.debounce(this._timeoutMonitoringDebouncer, timeOut.after(t), timeoutMonitoringDebounceHandler)
            }
        }
        if (t > 1 * 60 * 60 * 1000) { t = 1 * 60 * 60 * 1000 }
        this._timeoutMonitoringDebouncer = Debouncer.debounce(this._timeoutMonitoringDebouncer, timeOut.after(t), timeoutMonitoringDebounceHandler)
    }
    
    _routeDataChanged(routeData)
    {
        // console.log(routeData)
        if (!this.route || this.route?.prefix !== '/store') { return }

        this._routeDataChangedForcely()
    }
    
    _storeTitleChanged(visible, editing, store)
    {
        if (!visible) { return }

        this._changeSectionDebouncer = Debouncer.debounce(this._changeSectionDebouncer, timeOut.after(100), () =>
        {
            var title = (store && store.title ? store.title : this.localize('store-title-document'))
            if (editing)
            {
                title = this.localize('store-title-document-edit', 'store', title)
            }

            // Notify the store and the page's title
            var storeid = this.store ? store.sid :  this.routeData?.storeid
            var pagename = this.getAttribute('name')
            this.dispatchEvent(new CustomEvent('change-section', {
                bubbles: true, composed: true, detail: {
                    category: `href:${pagename}-${storeid}`,
                    store: 'store:' + (store ? store.sid : ''),
                    title: title,
                    type: 'custom store',
                    desc: store?.description || this.localize('store-desc-default'),
                    // keywords: item?.Product?.Keywords || '',
                }
            }))
        })
    }

    _visibleChanged(visible, o)
    {
        // if (!visible) { return }

        if (o === false && visible === true && this.editing)
        {
            // this.editing = false
            this._cancelEdit()
        }
        if (visible) 
        {
            this._routeDataChangedForcely()
        }
    }

    _routeDataChangedForcely()
    {
        var sid = this.route.path.replace('/', '')
        this.storeData.setSID(sid)
    }

    _compute_StoreMatrixName(matrixName)
    {
        if (matrixName)
        {
            return this.localize('store-matrix-named-hint', 'name', matrixName)
        }
        else
        {
            return this.localize('store-matrix-hint')
        }
    }

    _computeDisabled(offline, failure, loading, saving, editing)
    {
        var v = offline == true || failure == true || loading == true || saving == true
        return v
    }

    _computeDisabledSwitchGroup(offline, failure, loading, saving, editing, orderCount)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v || (orderCount > 0)
    }

    _compute_disabledCheckoutCodeOnly(offline, failure, loading, saving, editing, allowCheckoutCodeOnly)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v || (!allowCheckoutCodeOnly)
    }

    _computeDisabledSwitchCustomize(offline, failure, loading, saving, editing, orderCount)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v // || (orderCount > 0)
    }

    _compute_disabledMatrix(offline, failure, loading, saving, editing)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v // || (orderCount > 0)
    }

    _computeDisabledQuickCustomize(offline, failure, loading, saving, editing, orderCount)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v // || (orderCount > 0)
    }
    
    _computeHideCustomizingLock(editing, store_hidecustomize, isowner)
    {
        return !isowner || editing || !store_hidecustomize
    }

    _computeHideStoreDefault(editing, store_isdefault, isowner)
    {
        return !isowner || editing || !store_isdefault
    }
    
    _compute_disabledHidePrices(offline, failure, loading, saving, editing)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return v
    }
    
    _compute_disabledInPublicCatalog(offline, failure, loading, saving, editing)
    {
        var v = this._computeDisabled(offline, failure, loading, saving, editing)
        return true
    }

    _computeDatePickerNative(editing)
    {
        return Teamatical._browser.iPhone == true
    }

    _compute_groupdeadlinemax(store, groupdeadlinemax_ms)
    {
        if (groupdeadlinemax_ms == undefined)
        {
            groupdeadlinemax_ms = (new Date()).getTime()+6*86400000  
        }
        return convertLocalDateISO(groupdeadlinemax_ms)
    }
     

    _getItemHref(item, editing?)
    {
        if (editing) { return '#' }

        // By returning null when `itemId` is undefined, the href attribute won't be set and the link will be disabled
        return item.name ? this._hrefDetail(item.name, 'store') : null
    }

    _getPluralizedQuantity(quantity)
    {
        if (!quantity) { return '' }

        let pluralizedQ = quantity === 1 ? this.localize('store-qty-item') : this.localize('store-qty-items')
        return '(' + quantity + ' ' + pluralizedQ + ')'
    }

    _getMore()
    {
        this._gotoRoot()
    }

    _computeIsGroupDeadline(isgroup, isactive, editing, isowner)
    {
        var v = isgroup && isactive && !editing
        return !v
    }

    _computeIsGroupDeadlineDONE(isgroup, isactive, editing, shippingarchived, isowner)
    {
        var v = isowner && shippingarchived !== undefined && !isgroup && !isactive && !editing
        return !v
    }

    _computeIsGroupConfirming(isgroup, isactive, editing, isConfirmingAccountEmail, isConfirmingAccountPhone, isowner)
    {
        var v = isowner && isgroup && !isactive && !editing && (isConfirmingAccountEmail || isConfirmingAccountPhone)
        return !v
    }

    _computeHideList(editing, list, isgroup, storeTab, failure, offline)
    {
        // console.log(editing, list, isgroup, storeTab, failure, offline)
        var v = (!Array.isArray(list)) || list.length == 0 || failure === true

        this._listDebouncer = Debouncer.debounce(
            this._listDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideListDelayed = v
            }
        )

        return v
    }

    _compute_hideListCaption(editing, list, isgroup, storeTab, failure, offline, isowner)
    {
        var v = this._computeHideList(editing, list, isgroup, storeTab, failure, offline)
        if (!isowner) { v = true }
        return v
    }

    _computeHideShipping(editing, shipping, isgroup, storeTab, failure, offline)
    {
        var v = (shipping === undefined) || !editing || (editing == true && isgroup == false) || failure === true

        this._shippingDebouncer = Debouncer.debounce(
            this._shippingDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideShippingDelayed = v
            }
        )

        return v
    }

    _compute_hideTopButtons(editing, storeItems)
    {
        return storeItems?.length < 4
    }

    _computeHideStoreDesc(editing, store_description)
    {
        return editing || (!store_description)
    }

    _computeHideGroupAlert(IsActive, AccountEmail, AccountPhone)
    {
        var valid = AccountEmail || AccountPhone
        return !(valid && !IsActive)
    }

    _computeHideDeliveryDetails(deliveryDetailsOnly)
    {
        return !deliveryDetailsOnly
    }

    _compute_allowEditOrganization(editing, store_caneditorganization, store_bindorganization, store_bindorganizationWas, storeItems)
    {
        var properItem = false
        if (Array.isArray(storeItems)) 
        {
            var storeItemTest = storeItems.find(i => { return !i.isseparator && this._asBool(i.profitBase) })
            if (storeItemTest) { properItem = true }
        }
        return editing === true 
            && this._asBool(store_caneditorganization)
            && this._asBool(store_bindorganizationWas)
            && this._asBool(store_bindorganization)
            && properItem
    }

    _storeLoaded(store)
    {
        if (store) 
        { 
            this.set('store.bindorganizationWas', store?.bindorganization) 
            this.set('store.hasMatrix', this._asBool(store.isMatrix))

            this.set('storelogo', store.storelogo ? [store.storelogo] : [])

            

            // this.set('store.hideprices', store.hideprices === undefined ? false : store.hideprices) //for test only
            // this.set('store.cannobadges', true)  //for test only
            // this.set('store.isMatrix', true) 
            // this.set('store.matrixName', 'Matrix Name') 
        }
    }

    _computeHideOrganization(editing, bindorganization, organization)
    {
        return !editing || !bindorganization || !organization
    }

    _computeHideRecentlyViewed(loading, item_RecentProducts, editing)
    {
        // console.log(loading, item_RecentProducts, editing)
        return editing || loading || (!item_RecentProducts || item_RecentProducts.length < 1)
    }

    _compute_hidden_ShipTaxID(countryProfile_ShipTaxID, IsCompany)
    {
        return !IsCompany || !countryProfile_ShipTaxID
    }

    _compute_hidden_ShipEORI(countryProfile_ShipEORI, IsCompany)
    {
        return !IsCompany || !countryProfile_ShipEORI
    }

    _compute_smallItemsWidth(isEditingAndGroupShipping, isGrid)
    {
        return isEditingAndGroupShipping || isGrid
    }

    _isEditingAndGroupShippingChanged(editing, isgroup)
    {
        const v = editing && isgroup

        this._groupDebouncer = Debouncer.debounce(
            this._groupDebouncer,
            timeOut.after(0),
            () =>
            {
                this._resetForm()
                this._isEditingAndGroupShipping = v
                this._computeFirstSection()
            }
        )

        // console.log('_computeIsEditingAndGroupShipping: ' + v)
        return v
    }

    _computeIsConnecting(store, items, length, failure, offline, loading)
    {
        // if (!conoff) console.log(!(!store), !(!items), length, 'f', failure, offline, loading, '~~~>', this._computeIsConnecting(store, items, length, failure, offline, loading, true))
        if (offline !== undefined && loading === false) { return false } 
        if (!store || !items || items.length < 1) { return true }
        return false
    }

    _computeShowEmpty(store, items, length, failure, offline, loading)
    {
        // console.log(!(!store), !(!items), length, failure, offline, loading)
        if (!store || !items) { return false }

        // var isfound = this._computeIsFound(items, failure, offline, loading)
        var r = true
        if (Number.isInteger(length) && length > 0) 
        {
            r = false
        }

        if (failure || offline || loading)
        {
            r = false
        }

        // console.log(' | length: ' + length + ' ~> ' + r)
        return r
    }

    _computeIsFound(items, failure, offline, loading)
    {
        var v = loading === true || failure === true
        if (v && !loading && items === null) { v = false }
        if (!v && !loading && !(items === undefined || items === null)) { v = true }

        // console.log(item + ' | o:' + offline + ' | f:' + failure + ' | l:' + loading + ' => hide: ' + v)

        return v
    }

    _resetForm()
    {
        if (!this.form) { return }

        //clear validation errors
        const selector = INPUT_SELECTORS 
        var piList = Array.prototype.slice.call((this.form.querySelectorAll ? this.form.querySelectorAll(selector) : document.querySelectorAll(selector)))
        for (var i in this.uiimages)
        {
            var arr = this.uiimages[i].shadowRoot ? this.uiimages[i].shadowRoot.querySelectorAll(selector) : document.querySelectorAll(selector)
            var pia = Array.prototype.slice.call(arr)
            piList = piList.concat(pia)
        }
        for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
        {
            pi.invalid = false
        }
    }

    // Validates the form's inputs and adds the `aria-invalid` attribute to the inputs
    // that don't match the pattern specified in the markup.
    _validateForm(test?)
    {
        if (!this.form) { return }

        const selector = INPUT_SELECTORS
        let form = this.form
        let firstInvalid = false
        var piList = Array.prototype.slice.call(form.querySelectorAll(selector))
        for (var i in this.uiimages)
        {
            var arr = this.uiimages[i].shadowRoot ? this.uiimages[i].shadowRoot.querySelectorAll(selector) : document.querySelectorAll(selector)
            var pia = Array.prototype.slice.call(arr)
            piList = piList.concat(pia)
        }
        // console.log(piList)


        for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
        {
            if (pi.disabled || pi.hidden) { continue }

            if (pi.validate())
            {
                pi.invalid = false
                //pi.removeAttribute('aria-invalid');
            }
            else
            {
                if (!firstInvalid)
                {
                    firstInvalid = true

                    // announce error message
                    if (pi.errorMessage)
                    {
                        //var ns = pi.nextElementSibling
                        // console.log(pi.errorMessage)
                        var em = pi.errorMessage
                        this.dispatchEvent(new CustomEvent('announce', {
                            bubbles: true, composed: true,
                            detail: pi.errorMessage
                        }))
                    }

                    this._focusAndScroll(pi)
                }
                // pi.setAttribute('aria-invalid', 'true')
            }
        }

        return !firstInvalid
    }

    _tryReconnect()
    {
        this.storeData.refresh(this.store.sid)
    }

    _offlineChanged(offline, old)
    {
        if (!offline && old === false && this.isAttached) 
        {
            this._tryReconnect();
        }
    }

    _onScroll(e)
    {
        this._computeFirstSection()
    }

    _computeFirstSection()
    {
        // var r = this._shippingRect
        // var st = this._getScrollTop()
        // var hide = r ? (st > (r.top + r.height)) : false
        // this.firstSection = this.editing && (!hide || this.smallScreen)


        // if (this._lastFirstSection != this.firstSection)
        // {
        //     this.async(() => {
        //         this._computedListSectionSize()
        //         console.log(this._uilistRect)
        //     })
        // }
        // this._lastFirstSection = this.firstSection
    }

    _onResized(e?)
    {
        // this._computedShippingSectionSize()
    }
    
    // _computedListSectionSize()
    // {
    //     if (!this.uilist) 
    //     {
    //         this._uilistRect = { left: 0, top: 0, height: 0, }
    //         return
    //     }
    //     var disp = window.getComputedStyle(this.uilist).getPropertyValue("display")
    //     if (disp == 'none') { return }

    //     var r = this.uilist.getBoundingClientRect()
    //     this._uilistRect = {
    //         left: r.left + window.scrollX,
    //         top: r.top + window.scrollY,
    //         height: r.height,
    //     }
    // }

    _activateListObserver(visible, editing)
    {
        if (!this.uilist_observer || visible == undefined || editing == undefined) { return }

        if (editing && visible) 
        {
             this.uilist_observer.observe(this.uilist)
        }
        else 
        {
            this.uilist_observer.disconnect()
        }
    }

    async _loadRichtextEditor(visible, editing)
    {
        if (!visible || !editing) { return }

        const m = await import('../ui/ui-richtext-editor')
    }

    uilistObserverCallback(entries)
    {
        if (!entries || entries.length < 1) { return }
        
        let entity = entries[0]
        let rect = entity.boundingClientRect
        // let st = this._getScrollTop()
        // let sto = st * (rect?.height / this._last_uilistRect?.height)
        // console.log(sto)
        // if (Number.isFinite(sto))
        // {
        //     this.scrollIt(sto, 650, 'easeInOutCubic')
        // }
        this._uilistRect = rect
        this._last_uilistRect = rect
    }

    // _computedShippingSectionSize()
    // {
    //     if (!this.shipping) 
    //     {
    //         this._shippingRect = { left: 0, top: 0, height: 0, }
    //         return
    //     }

    //     var disp = window.getComputedStyle(this.shipping).getPropertyValue("display")
    //     if (disp == 'none') { return }

    //     var r = this.shipping.getBoundingClientRect()
    //     this._shippingRect = {
    //         left: r.left + window.scrollX,
    //         top: r.top + window.scrollY,
    //         height: r.height,
    //     }
    // }


    _isHideShippingDelayedChanged(hideShippingDelayed)
    {
        // console.log(hideShippingDelayed)
        this._onResized()
    }

    _computedSubmenu(categories, userInfo, userInfoP)
    {
        return TeamaticalApp.menuCategories(this, categories, userInfo, userInfoP)
    }

    _computeHideEdit(isbranded, isowner, editing)
    {
        var v = !isowner || isbranded || editing

        this._editDebouncer = Debouncer.debounce(
            this._editDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideEditDelayed = v
            }
        )

        return v
    }

    _computeHideSave(isowner, editing)
    {
        var v = !isowner || !editing

        this._saveDebouncer = Debouncer.debounce(
            this._saveDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideSaveDelayed = v
            }
        )
        return v
    }

    _compute_hideParticipantsLink(isbranded, isowner)
    {
        return !isowner || isbranded

    }

    _compute_hideCheckoutCodeOnly(store_allowCheckoutCodeOnly)
    {
        return !store_allowCheckoutCodeOnly
    }

    _computeHideAdmins(isbranded, isowner, editing)
    {
        var v = !isowner || isbranded //|| !editing

        this._adminsDebouncer = Debouncer.debounce(
            this._adminsDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideAdminsDelayed = v
            }
        )
        return v
    }

    _grouporderDebouncer: Debouncer
    _compute_hideGroupOrder(isbranded, isowner, hasgroupshippings)
    {
        var v = !isowner || !hasgroupshippings || isbranded

        this._grouporderDebouncer = Debouncer.debounce(
            this._grouporderDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideGroupOrderDelayed = v
            }
        )
        return v
    }

    
    _storematrixDebouncer: Debouncer
    _compute_hideStoreMatrix(editing, isMatrix, isowner)
    {
        var v = !isowner || !isMatrix || editing

        this._storematrixDebouncer = Debouncer.debounce(
            this._storematrixDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideStoreMatrixDelayed = v
            }
        )
        return v
    }

    _matrixDebouncer: Debouncer
    _compute_hideMatrix(editing, hasMatrix, isowner)
    {
        var v = !isowner || !hasMatrix || !editing

        this._matrixDebouncer = Debouncer.debounce(
            this._matrixDebouncer,
            timeOut.after(0),
            () =>
            {
                this._hideMatrixDelayed = v
            }
        )
        return v
    }


    _computeDisableShare(store, isowner, editing, failure, offline, loading)
    {
        return failure || offline || loading
    }

    _compute_heroImageStyles(storelogo_h)
    {
        return `height:${storelogo_h}px;`
    }

    _compute_showHeroImage(storelogo, editing)
    {
        return this._asBool(storelogo) && !editing
    }

    _compute_hideGridSwitcher(isbranded, isowner)
    {
        return isowner !== true || isbranded
    }

    _computeHideShare(store, items, length, isbranded, isowner, editing, failure, offline, loading, _hideShippingDelayed)
    {
        return (!store || !items || items.length < 1) || !store.sid || editing === true || !_hideShippingDelayed 
    }

    _computeHideShareBranded(store, items, length, isbranded, sidbranded, isowner, editing, failure, offline, loading, _hideShippingDelayed)
    {
        return (!store || !items || !this._asBool(sidbranded) || isbranded || items.length < 1) || !store.sid || editing === true || !_hideShippingDelayed
    }

    _compute_hideBannerBranded(sidbranded, editing)
    {
        // console.log(sidbranded, editing)
        // return !this._asBool(sidbranded) || !editing
        return !editing
    }

    _computeHideLive(isActive, isowner, editing)
    {
        return !(editing && isowner && isActive)
    }

    _computeDisabledLiveIsGroup(isActive, isowner, editing, isgroup)
    {
        // console.log(isActive, isgroup)
        return isActive || !isgroup
    }


    // _computeHideTabs(isowner, isgroup, editing)
    // {
    //     var v = !isowner || !editing || !isgroup
    //     this._tabsDebouncer = Debouncer.debounce(
    //         this._tabsDebouncer,
    //         timeOut.after(150),
    //         () =>
    //         {
    //             this._hideTabsDelayed = v
    //         }
    //     )
    //     return v
    // }


    _computeEditingMode(store_isowner, editing, failure, offline, loading)
    {
        return store_isowner && !failure && !offline && !loading
    }

    _startEdit(e?)
    {
        this.set('saving', true)
        
        this.async(async () => 
        {
            this.editing = true
            if (!this._suppressHistory)
            {
                var state = { 'store': this.store?.sid }
                var title = this.localize('store-title-document-edit', 'store', this.store?.title)
                var url = window.location.href.replace(window.location.hash, "") + '#edit'
                window.history.pushState(state, title, url)
                this._lastState = state
            }


            //@dynamicaly loading modules in store...
            //store
            // await import('@polymer/paper-icon-button/paper-icon-button.js')
            // await import('@polymer/paper-input/paper-input.js')
            // await import('@polymer/paper-input/paper-textarea.js')
            // await import('@polymer/paper-checkbox/paper-checkbox.js')
            // await import('@polymer/paper-toggle-button/paper-toggle-button.js')
            // await import('@vaadin/vaadin-date-picker/vaadin-date-picker')
            // await import('@vaadin/vaadin-time-picker/vaadin-time-picker')
            // await import('../ui/ui-select')
            // await import('../ui/ui-image-uploader')

            //store item
            // await import('@polymer/paper-input/paper-input.js')
            // await import('@polymer/paper-slider/paper-slider.js')
            // await import('@polymer/paper-icon-button/paper-icon-button.js')
            
            this.set('saving', false)
        }, 190)
    }

    _groupordersList(e)
    {
        this._gotoAccountStoreGroups(this.store?.sid, { backtostore: true })
    }

    _adminsList(e)
    {
        this._gotoAccountStoreAdmins(this.store?.sid, { backtostore: true })
    }

    _saveEdit(e?)
    {
        if (!this._validateForm()) { return }

        var action = (e?) => 
        {
            this._addCustOptTap(e) //add custom option that was not added yet...

            if (this.store)
            {
                this.store.storelogo = (this.storelogo && this.storelogo.length > 0) ?  this.storelogo[0] : null
            }
            var domSortingList = this.shadowRoot?.querySelector('#items') as UISortableList
            this.store.items = this._storeItemsDOMToModel(domSortingList?.items)
            this.storeData.save(() => // successHandler
            {
                this.editing = false
                this._restoreDOM()
            })
        }

        if (!this.store.isgroup && this.store.shipping && this.store.shipping.IsActive)
        {
            var barr = [
                {
                    title: this.localize('store-groupdeadline-stop-cancel'),
                    ontap: () => {}
                },
                {
                    title: this.localize('store-groupdeadline-stop-ok'),
                    ontap: action
                }
            ]
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    required: true,
                    announce: this.localize('store-groupdeadline-stop-announce'),
                    message: this.localize('store-groupdeadline-stop'),
                    buttons: barr,
                }
            }))
        }
        else
        {
            action()
        }
    }

    _restoreDOM()
    {
        // //restore natural order of dom-repeat elemets
        var p = this.items
        Array.prototype.slice.call(p.children)
            .filter(i => i.classList.contains('products-item'))
            .map(function (x) { return p.removeChild(x) })
            .sort(function (x, y)
            {
                var a = (x?.id == 'productsList' ? Number.MAX_SAFE_INTEGER : parseInt(x?.getAttribute('data-index'), 10))
                var b = (y?.id == 'productsList' ? Number.MAX_SAFE_INTEGER : parseInt(y?.getAttribute('data-index'), 10))
                if (a < b) { return -1 }
                if (a > b) { return 1 }
                return 0
            })
            .forEach(function (x) { p.appendChild(x) })
        //restore repeat element
        var domRepeat: any = p.querySelector('dom-repeat')
        p.removeChild(domRepeat)
        p.appendChild(domRepeat)
        this.set('store', Object.assign({}, this.store))
    }

    _storeItemsDOMToModel(domitems)
    {
        if (!Array.isArray(domitems)) { return [] }
        
        var ar:any = []
        for (var i in domitems)
        {
            var item:any = domitems[i]
            //Polymer.dom(item).node.__dataHost.__data.item
            var modelitem: any = item && item.__dataHost && item.__dataHost.__data ? item.__dataHost.__data.item : null 
            if (modelitem)
            {
                var el: any = this.store.items.find((i) => { return i.name == modelitem.name })
                ar.push(el)
            }
        }
        return ar
    }

    _cancelEdit(e?)
    {
        this.editing = false

        this._syncDOMAndModel(()=>
        {
            this.storeData.cancel()
        })
    }

    _isPaste(clipboardItems, item_id, clipboardItemsP)
    {
        if (!clipboardItems || typeof(clipboardItems) !== 'object') { return false }
        return Object.keys(clipboardItems).length > 0
    }

    _isCutted(clipboardItems, item_id, clipboardItemsP)
    {
        if (!clipboardItems || typeof(clipboardItems) !== 'object') { return false }
        var itemi = clipboardItems[item_id]
        return this._asBool(itemi?.id)
    }

    _clearClipboard(visible, editing)
    {
        this.clipboardItems = null
        this.notifyPath('clipboardItems')
    }

    _addSeparatorTap(e)
    {
        var name = StringUtil.replaceAll(Guid.newGuid(), '-', '').toUpperCase()
        let inx = this.store.items.length
        let title = `${this.localize('store-item-separator-title-label')} ${inx}`

        this._syncDOMAndModel(() =>
        {
            this.storeData.addItem({
                id: `${name}-${inx}`,
                isseparator: true,
                name: name,
                title: title,
                titleEdit: title,
            })
        })
    }

    _onStoreItemDelete(e)
    {
        e.stopPropagation()

        var removeID = e.detail.id
        this._syncDOMAndModel(() =>
        {
            this.storeData.removeItem(removeID)
            
            //remove from selection
            this._onStoreItemUnCut({ detail: { item: { id: e.detail.id } } })
        })
    }

    _onStoreItemCut(e)
    {
        e.stopPropagation()

        var id = e.detail?.item?.id
        if (id)
        {
            if (!this.clipboardItems) { this.clipboardItems = {} }
            this.clipboardItems[id] = e.detail?.item
            this._notifyStoreItemSelected(id)
        }
    }

    _onStoreItemUnCut(e)
    {
        if (e.stopPropagation) { e.stopPropagation() }

        var id = e.detail?.item?.id
        if (id)
        {
            if (!this.clipboardItems) { this.clipboardItems = {} }
            delete this.clipboardItems[id]
            this._notifyStoreItemSelected(id)
        }
    }
    
    _notifyStoreItemSelected(id)
    {
        this.notifyPath(`clipboardItems.${id}`)
        this.notifyPath('clipboardItems')

        for (var i in this.store.items)
        {
            this.notifyPath(`store.items.${i}.id`)

            // if (id == this.store.items[i]?.id)
            // {
            //     this.notifyPath(`store.items.${i}.id`)
            //     break
            // }
        }
    }

    _onStoreItemPaste(e)
    {
        if (!this.clipboardItems || typeof(this.clipboardItems) !== 'object' || Object.keys(this.clipboardItems).length < 1) { return false }

        // this.items.moveItemAfter(this.clipboardItem?.id, e.detail?.item?.id, true)

        this._syncDOMAndModel(() =>
        {
            var selectedItems: any = []
            var itemAfter = null
            for (var itemi of this.store.items)
            {
                if (this.clipboardItems[itemi.id])
                {
                    selectedItems.push(itemi)
                }
                if (e.detail?.item?.id == itemi?.id) 
                {
                    itemAfter = itemi
                }
            }
            if (!itemAfter) { return }

            for (var delitemi of selectedItems)
            {
                var inx = this.store.items.indexOf(delitemi)
                this.store.items.splice(inx, 1)
            }
            var inxItemAfter = this.store.items.indexOf(itemAfter) + 1
            this.store.items.splice(inxItemAfter, 0, ...selectedItems)

            this.clipboardItems = null
            this.notifyPath('clipboardItems')
        })
    }

    _onStoreItemMove(e)
    {
        e.stopPropagation()

        switch(e.detail.dir)
        {
            case 'up': 
                this.items.move2FirstItem(e.detail.id, true)
                break

            case 'down':
                this.items.move2LastItem(e.detail.id, true)
                break
        }
    }

    _isMovingDebouncer: Debouncer
    _syncDOMAndModel(storeItemsModificationCallback)
    {
        if (!storeItemsModificationCallback) { return }

        this.isMoving = true

        // var domSortingList = this.shadowRoot.querySelector('#items') as UISortableList
        //     this.store.items = this._storeItemsDOMToModel(domSortingList.items)
        //     this.storeData.save(() => // successHandler
        //     {
        //         this.editing = false
        //         this._restoreDOM()
        //     })

        var domSortingList = this.shadowRoot ? this.shadowRoot.querySelector('#items') as UISortableList : null
        this.store.items = this._storeItemsDOMToModel(domSortingList?.items)
        this.async(()=> 
        { 
            storeItemsModificationCallback()
            this._restoreDOM()
        }, 17)

        this._isMovingDebouncer = Debouncer.debounce(this._isMovingDebouncer, timeOut.after(300), () =>
        {
            this.isMoving = false
        })
    }

    _onStoreItemEditingDetails(e)
    {
        var ed = false
        for (var i in this.uiimages)
        {
            var eli = this.uiimages[i] as UIStoreItem
            if (eli && eli.editingDetails && eli.editingDetailsHide && eli != e.detail.dom)
            {
                eli.editingDetailsHide(true)
            }

            if (eli.editingDetails)
            {
                ed = true
            }
        }
    }

    _hideDefaultButton(isdefault, editing)
    {
        return !isdefault || !editing
    }

    _hideMakeDefaultButton(isdefault, editing)
    {
        return isdefault || !editing
    }

    _onMakeAsDefault(e)
    {
        if (this.store.isdefault == false)
        {
            this.set('store.isdefault', !this.store.isdefault)
        }
    }

    _onTabsSelect(e)
    {
        if (e.detail && e.detail.item)
        {
            const item = e.detail.item
            this._submenuDebouncer = Debouncer.debounce(this._submenuDebouncer, timeOut.after(150),
                () =>
                {
                    this.storeTab = item.name
                    this.notifyPath('storeTab')
                }
            )
        }
    }

    _storeChanged(m)
    {
        if (m.path === null || m.path === undefined) { return }

        // console.log(m)
        if (m.path == 'store') 
        {
            this._resetForm()
        }

        if (m && m.path.indexOf('store.') >= 0)
        {
            var name = m.path.replace('store.', '').replace('shipping.', '')
            if (this.formElements[name])
            {
                this.formElements[name].invalid = false
            }
            else if (name.indexOf('items.') == 0)
            {
                var path = name.replace('items.', '')
                name = path.substr(path.indexOf('.') + 1)
                var index = path.substring(0, path.indexOf('.'))
                for (var i in this.uiimages)
                {
                    if (this.uiimages[i].getAttribute('data-index') == index)
                    {
                        var elRooti = this.uiimages[i].shadowRoot ? this.uiimages[i].shadowRoot : this.uiimages[i]
                        var pi =  elRooti.querySelector('#' + name)
                        if (pi)
                        {
                            pi.invalid = false
                        }
                    }
                }
            }
        }
    }

    _storeServerErrorCustomOptions(e)
    {
        this.formElements['CustomOptions'].errorMessage = ''
        this.formElements['CustomOptions'].invalid = false
    }

    _storeServerErrors(notvalid)
    {
        if (!Array.isArray(notvalid) || notvalid.length < 1 || !this.form) { return }

        let firstInvalid = false
        const focusAndScroll = (pi) => 
        {
            // this.async(()=> { this._focusAndScroll(pi, this.smallScreen ? 50 : 100) })
            this.async(()=> { this._focusAndScroll(pi, this.smallScreen ? -50 : -100) })
        }

        //clean errors
        var piList = this.form.querySelectorAll(SERVERERROR_SELECTORS)
        for (let pi, i = 0; pi = piList[i], i < piList.length; i++)
        {
            pi.invalid = false
        }

        //rollout server errors
        for (var i in notvalid)
        {
            var name = notvalid[i].Key
            // console.log(notvalid[i])

            var formEl: any = null
            try { formEl = this.shadowRoot?.querySelector(`#${name}`) as any } catch {}
            if (formEl)
            {
                // console.log(name + ': ' + notvalid[i].Message)
                formEl.errorMessage = notvalid[i].Message
                formEl.invalid = true

                if (!firstInvalid)
                {
                    firstInvalid = true                
                    // this.firstSection = this.editing && this.smallScreen
                    focusAndScroll(formEl)
                }
            }
            else if (name.indexOf('CustomOptions') >= 0) 
            {
                this.formElements['CustomOptions'].errorMessage = notvalid[i].Message
                this.formElements['CustomOptions'].invalid = true
                if (!firstInvalid)
                {
                    firstInvalid = true
                    var pe = this.shadowRoot?.querySelector("[name='store." + name + "']")
                    focusAndScroll(pi)
                }
            }
            else if (name.indexOf('items.') == 0)
            {
                var path = name.replace('items.', '')
                name = path.substr(path.indexOf('.') + 1)
                var index = path.substring(0, path.indexOf('.'))
                var uiitems = this.uiimages
                for (var j in uiitems)
                {
                    if (uiitems[j].getAttribute('data-index') == index)
                    {
                        uiitems[j].set('item.hasErrors', true)
                        var pi = uiitems[j].shadowRoot.querySelector('#' + name)
                        if (pi)
                        {
                            pi.errorMessage = notvalid[i].Message
                            pi.invalid = true
                        }
                        // console.warn(pi)

                        if (!firstInvalid)
                        {
                            firstInvalid = true
                            focusAndScroll(pi)
                        }
                    }
                }
            }
            else
            {
                console.warn(notvalid[i])
            }
        }

        // console.log(notvalid)
        //new bind-validation handler
        // this.storeData.__detailsResposeHandler
        this.__detailsResposeHandler(notvalid, 'store')
    }

    _storeServerValidationRules(validationRules)
    {
        var rules_hash = JSON.stringify(validationRules)
        if (this._validationRules_hash == rules_hash) { return }
        this._validationRules_hash = rules_hash

        const attrs = ['type', 'maxlength', 'required', 'pattern'] //minlength
        for (var i in validationRules)
        {
            const rule = validationRules[i]
            const el = this.formElements[rule.id]
            if (el)
            {
                // console.log(rule)
                for (var j in attrs)
                {
                    var a = attrs[j]

                    if (rule[a])
                    {
                        el.setAttribute(a, rule[a])
                    }
                    else if (a != 'type')
                    {
                        el.removeAttribute(a)
                    }
                }
            }
            else if (rule && rule.id && rule.id.indexOf('items.') >= 0)
            {
                //skip
                // var items = this.formElements['items']
                // console.log(this.uiimages)
                // var els = items.shadowRoot.querySelectorAll('teamatical-ui-store-item')
                // console.log(els)
            }
            else
            {
                console.warn(validationRules[i])
            }
        }
    }

    _bindHtmlValidationRules()
    {
        if (!this.store || !Array.isArray(this.store.ValidationRules)) { return }

        var validationRules = this.store.ValidationRules

        for (var i in this.uiimages)
        {
            var pi = this.uiimages[i]

            const attrs = ['type', 'maxlength', 'required', 'pattern'] //minlength
            for (var i in validationRules)
            {
                const rule = validationRules[i]
                if (rule && rule.id && rule.id.indexOf('items.') >= 0)
                {
                    var name = rule.id.replace('items.', '')
                    const el = pi.$ ? pi.$[name] : pi.querySelector(`#${name}`)
                    // console.log(el)
                    if (el)
                    {
                        // console.log(rule)
                        for (var j in attrs)
                        {
                            var a = attrs[j]

                            if (rule[a])
                            {
                                el.setAttribute(a, rule[a])
                            }
                            else if (a != 'type')
                            {
                                el.removeAttribute(a)
                            }
                        }
                    }
                }
            }
        }
    }

    _uploadImagePath(APIPath, path)
    {
        return APIPath + path
    }

}