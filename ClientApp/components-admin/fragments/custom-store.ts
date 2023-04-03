import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import '@polymer/paper-radio-button/paper-radio-button.js'
import '@polymer/paper-radio-group/paper-radio-group.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import '@vaadin/vaadin-date-picker/vaadin-date-picker'
import '@vaadin/vaadin-combo-box/vaadin-combo-box'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { convertDateISO } from '../../components/utils/CommonUtils'
import { NetBase } from '../../components/bll/net-base'
import view from './custom-store.ts.html'
import style from './custom-store.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-description'
import '../../components/ui/ui-sizes'
import '../../components/ui/ui-user-inline'
import '../ui/ui-search-input'
import '../ui/ui-dropdown-menu'
import '../ui/ui-changes-history'
import '../shared-styles/common-styles'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']


@FragmentDynamic
export class AdminCustomStore extends FragmentBase
{
    static get is() { return 'tmladmin-custom-store' }

    static get template() { return html([`<style include="teamatical-admin-common-styles">${style_shared}${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            env: { type: String },

            order: { type: Object, notify: true },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },
            pageObjectTitle: { type: String, notify: true, computed: '_compute_pageObjectTitle(order, order.*)' }, //page-object-title            

            APIPath: { type: String, computed: '_compute_APIPath(isOrganization)' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['custstoreid'] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            pageSize: { type: Number, value: 10000 },
            page: { type: Number, value: 0 },

            editTaxCert: { type: Object, value: { } },
            addTaxCert: { type: Object, value: { } },
            usaStates: { type: Array, computed: '_compute_usaStates(order.USStates)' },

            isOrganization: { type: Boolean, value: false },
        }
    }

    _netbase: any
    _observer: any
    api_action: any
    hasUnsavedChanges: boolean
    order: any
    gridCellClassNameGenerator: any
    gridCellClassNameGeneratorImpl: any
    editTaxCert: any
    editTaxCertTitle: string
    applyTaxCertBtn: string
    addTaxCert: any


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            // '_log(order.*)',
        ]
    }

    _log(orderP) { console.log(orderP) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.gridCellClassNameGenerator = this.gridCellClassNameGeneratorImpl

        document.addEventListener("keydown", (e) => this._onKeydown(e))
        this.addEventListener('api-search-input-added', (e) => this._onAdminSearchAdded(e))
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveCustomDesignRequestTap()
        }
    }

    saveTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => 
        {
            // console.log(newmodel)
        })
    }

    _disAddTaxCert(taxCertificatesLength, loadingAny)
    {
        return loadingAny || taxCertificatesLength >= 1 
    }

    _compute_usaStates(orderUSStates)
    {
        return !orderUSStates ? [] : orderUSStates.map(i => { return {
            ID: i.id,
            Name: i.title,
        }})
    }

    _compute_APIPath(isOrganization)
    {
        return isOrganization ? '/admin/api/store/partner-' : '/admin/api/store/'
    }

    _compute_pageObjectTitle(order, orderP)
    {
        return order?.Title ? order.Title : ''
    }

    _onLoadResult(order)
    {
        if (!order) { return order }
        
        // order['CurrencyRegions'] = [
        //     {
        //         "id": "USD_Region",
        //         "title": "USD Region"
        //     },
        //     {
        //         "id": "THB_Region",
        //         "title": "THB Region"
        //     },
        //     {
        //         "id": "AUD_Region",
        //         "title": "AUD Region"
        //     },
        // ]

        // order['CurrencyRegion'] = {
        //     "id": "USD_Region",
        //     "title": "USD Region",
        //     "Currency": JSON.parse(JSON.stringify({
        //         "id": "THB",
        //         "title": "THB"
        //     })),
        // }

        
        

        return order
    }

    _text2html(text)
    {
        return text ? StringUtil.replaceAll(text, "\n", "<br />") : text
    }

    _formatSizeTitle(manufi, mList)
    {
        return manufi && manufi.SizeTitle ? manufi.SizeTitle : 'Selected Sizes'
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()
        }
    }


    hideSaveBtn(product)
    {
        return false
    }

    saveCustomDesignRequestTap(e?)
    {
        this._openDlg(this.shadowRoot?.querySelector('#dialogsave') as PaperDialogElement)
    }

    saveCustomDesignRequestConfirmTap(e)
    {
        this.api_action = 'save'
        var oldmodel = Object.assign({}, this.order)
        this._postData(this.order, (newmodel) => {
            if (newmodel && oldmodel.OrganizationID != newmodel.OrganizationID)
            {
                // console.log(oldmodel.OrganizationID, ' => ', newmodel.OrganizationID)
                var qp = { custstoreid: newmodel.OrganizationID }
                this.queryParams = qp
                window.history.replaceState(null, '', StringUtil.urlquery(document.location.pathname, qp))
            }
        })
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _onDownload(e) 
    {
        var asseti = e.model.__data.asseti
        var id = e.target.getAttribute('data-id')

        var progress = e.target.parentElement.parentElement.querySelector('paper-spinner-lite')
        this.getOrderFile({ id: id, source: asseti.Source }, progress)

        e.preventDefault()
        return false
    }






    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    sortingIndexTap(e)
    {
        var value = e.target.parentElement.value
        var storei = this.order
        if (!value || !value.toString().trim()) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'set-sortingindex'
        this.url = StringUtil.urlquery(url, { storeid: storei.StoreID, sortingindex: value.toString().trim() })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    bindOrganizationTap(e)
    {
        var value = e.target.parentElement.value
        var storei = this.order
        if (typeof(value) != 'string' || !value.trim()) { return }
        e.target.parentElement.value = ''

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'set-bindorganization'
        this.url = StringUtil.urlquery(url, { storeid: storei.StoreID, organizationid: value.trim() })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    unbindOrganizationChecked(e)
    {
        var value = e.target.checked
        var storei = this.order
        // if (value !== storei.BindToOrganization) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'set-unbindorganization'
        this.url = StringUtil.urlquery(url, { storeid: storei.StoreID, unbindorganization: value })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()

        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }
    
    inPublicCatalogChecked(e)
    {
        var value = e.target.checked
        var storei = this.order
        // if (value == storei.InPublicCatalog) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'set-public-catalog'
        this.url = StringUtil.urlquery(url, { storeid: storei.StoreID, publiccatalog: value })
        this.cmd(() =>
        {
            progress.active = false
            this.reload()
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    noQtyLimitsChecked(e)
    {
        var value = e.target.checked
        var storei = this.order
        // if (value == storei.NoQuantityLimits) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'set-qty-nolimits'
        this.url = StringUtil.urlquery(url, { storeid: storei.StoreID, nolimits: value })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeTap(e)
    {
        var admini = e.model.__data.admini
        var sid = e.target.getAttribute('sid')
        var li = e.target.parentElement.parentElement.parentElement.querySelector('li')
        // console.log(li)

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'storeadmin-remove'
        this.url = StringUtil.urlquery(url, { storeid: sid, userid: admini.User?.UserID })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    // _addTap(e)
    // {
    //     var useridInput = e.target.parentElement
    //     var admini = useridInput.value
    //     var sid = e.target.getAttribute('sid')
    //     if (!admini) { return }
    //     var progress = e.target.parentElement.querySelector('paper-spinner-lite')
    //     progress.active = true
    //     useridInput.disabled = true
    //     var url = this.websiteUrl + this.APIPath + 'storeadmin-add'
    //     this.url = StringUtil.urlquery(url, { storeid: sid, userid: admini })
    //     this.cmd(() =>
    //     {
    //         progress.active = false
    //         useridInput.disabled = false
    //         useridInput.value = ''
    //         this._refresh(true)
    //     })
    //     e.preventDefault()
    //     e.stopPropagation()
    //     return false
    // }


    _removeInviteTap(e)
    {
        var invitei = e.model.__data.invitei
        var sid = e.target.getAttribute('sid')
        var li = e.target.parentElement.parentElement.parentElement.querySelector('li')
        // console.log(li)

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        var url = this.websiteUrl + this.APIPath + 'storeadmin-cancel'
        this.url = StringUtil.urlquery(url, { storeid: sid, email: invitei.email })
        this.cmd(() =>
        {
            progress.active = false
            // li.setAttribute('hidden', true)
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _addInviteTap(e)
    {
        var useridInput = e.target.parentElement
        var email = useridInput.value
        var sid = e.target.getAttribute('sid')

        if (typeof(email) != 'string' || !email.trim()) { return }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true
        var url = this.websiteUrl + this.APIPath + 'storeadmin-invite'
        this.url = StringUtil.urlquery(url, { storeid: sid, email: email.trim() })
        this.cmd(() =>
        {
            progress.active = false
            useridInput.disabled = false
            useridInput.value = ''
            this.reload()
        })


        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _onAdminSearchAdded(e)
    {
        var user = e?.detail?.user
        var uiUserSearch = e?.detail?.target?.parentElement?.domHost
        if (!user) { return }
        var sid = uiUserSearch.getAttribute('sid')

        // console.log(user, sid)
        var progress = uiUserSearch.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        uiUserSearch.disabled = true
        var url = this.websiteUrl + this.APIPath + 'storeadmin-add'
        this.url = StringUtil.urlquery(url, { storeid: sid, userid: user?.UserID })
        this.cmd(() =>
        {
            progress.active = false
            uiUserSearch.disabled = false
            uiUserSearch.value = ''
            this.reload()
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }


    //#region TaxCert

    
    addNewTaxCertTap(e)
    {
        this.editTaxCertTitle = 'Add New Tax Certificate'
        this.applyTaxCertBtn = 'Add'
        this.set('editTaxCert.index', null)
        this.set('editTaxCert.State', this.addTaxCert.State || '')
        this.set('editTaxCert.ExpirationDate', this.addTaxCert.ExpirationDate)
        this.set('editTaxCert.Description', this.addTaxCert.Description || '')
        this.set('editTaxCert.notvalid', {})
        this._openDlg(this.$.dialog_taxcert as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    editTaxCertTap(e)
    {
        var taxcerti = e.model.__data.taxcerti
        var taxcertindex = e.model.__data.index

        this.editTaxCertTitle = 'Edit Tax Certificate'
        this.applyTaxCertBtn = 'Apply'
        this.set('editTaxCert.index', taxcertindex)
        this.set('editTaxCert.State', taxcerti.State)
        this.set('editTaxCert.ExpirationDate', convertDateISO(taxcerti.ExpirationDate?.ms))
        this.set('editTaxCert.Description', taxcerti.Description || '')
        this.set('editTaxCert.notvalid', {})
        this._openDlg(this.$.dialog_taxcert as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    applyTaxCertBtnTap(e) //apply
    {
        const __EXIT = (e) =>
        {
            e.preventDefault()
            e.stopPropagation()
            return false
        }

        if (this.order) 
        {
            if (!this.order.TaxCertificates) { this.set('order.TaxCertificates', []) }
        }

        var items = this.order.TaxCertificates
        var notValid: any = []

        // console.log(this.editTaxCert)
        if (this.editTaxCert && !this.editTaxCert.State) 
        { 
            notValid.push({ Key: "State", Message: "State is required", Type: "e" })
        }
        else
        {
            var inx = -1
            for (var k in items)
            {
                if (items[k] && this.editTaxCert && items[k].State === this.editTaxCert.State && this.editTaxCert.index != k)
                {
                    inx = items.indexOf(items[k])
                    notValid.push({ Key: "State", Message: "Duplicate State", Type: "e" })
                }
            }
        }

        if (this.editTaxCert && !this.editTaxCert.ExpirationDate) 
        { 
            notValid.push({ Key: "ExpirationDate", Message: "Set Expiration Date is required", Type: "e" })
        }

        if (notValid.length > 0) 
        { 
            this._applyDetailsErrors('editTaxCert', notValid)
            return __EXIT(e) ///EXIT!!!!
        } 



        var editTaxCert = Object.assign({}, this.editTaxCert)
        if (this.editTaxCert)
        {
            var dd = new Date()
            // var tt = new Date()
            try
            {
                dd.setTime(Date.parse(editTaxCert.ExpirationDate))
                // tt.setTime(Date.parse(`1970-01-01T${groupdeadlinetime}Z`))
                // dd.setHours(tt.getUTCHours(), tt.getUTCMinutes(), tt.getUTCSeconds(), 0)
            }
            catch
            {
                //
            }
            editTaxCert.ExpirationDate = { ms: dd.getTime(), tz: dd.getTimezoneOffset() }
        }

        delete editTaxCert.notvalid
        if (editTaxCert && editTaxCert.index != null)
        {
            var i = editTaxCert.index
            this.set(`order.TaxCertificates.${i}.State`, editTaxCert.State)
            this.set(`order.TaxCertificates.${i}.ExpirationDate`, editTaxCert.ExpirationDate)
            this.set(`order.TaxCertificates.${i}.Description`, editTaxCert.Description)
        }
        else if (editTaxCert)
        {
            this.set('addTaxCert.State', '')
            this.set('addTaxCert.ExpirationDate', '')
            
            delete editTaxCert.index
            this.push('order.TaxCertificates', editTaxCert)
            this.notifyPath('order.TaxCertificates')
        }
    }

  
    upwardTaxCertTap(e)
    {
        // var item = e.model.__data.mproducti
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx - 1
        if (inxto < 0) { return }

        var el: any = this.splice('order.TaxCertificates', inx, 1)
        this.splice('order.TaxCertificates', inxto, 0, el[0])
    }

    downwardTaxCertTap(e)
    {
        // var item = e.model.__data.mproducti
        var inx = e.model.__data.index

        if (inx === -1) { return } // throw new Error("Element not found in array")
        var inxto = inx + 1
        if (inxto > this.order.TaxCertificates.length) { return }

        var el: any = this.splice('order.TaxCertificates', inx, 1)
        this.splice('order.TaxCertificates', inxto, 0, el[0])
    }

    deleteTaxCertTap(e)
    {
        // var mproducti = e.model.__data.mproducti
        var inx = e.model.__data.index
        this.splice('order.TaxCertificates', inx, 1)
        this.notifyPath('order.TaxCertificates')

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    //#endregion

}
