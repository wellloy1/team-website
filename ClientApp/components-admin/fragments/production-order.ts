import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-list/iron-list.js';
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-listbox/paper-listbox.js'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency, deepClone } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import view from './production-order.ts.html'
import style from './production-order.ts.css'
import style_shared from './shared-styles.css'
import fonts from '../shared-styles/common-fonts.ts.css'
import '../shared-styles/common-styles'
import '../ui/production-order-item'
import '../ui/ui-changes-history'
import '../ui/ui-progress-icon'
import '../ui/ui-dropdown-menu'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']
const AdminProductionOrderBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior


@FragmentDynamic
class AdminProductionOrder extends AdminProductionOrderBase
{
    static get is() { return 'tmladmin-production-order' }

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
            scrollTarget: { type: String, },

            order: { type: Object },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },


            url: { type: String },
            APIPath: { type: String, value: '/admin/api/orderproduction/order-' },
            APIPathItem: { type: String, value: '/admin/api/orderproduction/item-' },
            
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: ['porderid'] },

            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            loading: { type: Boolean, notify: true, readOnly: true, },
            loadingCmd: { type: Boolean, notify: true },
            loadingAny: { type: Boolean, computed: '_computeLoadingAny(loading, loadingCmd)' },

            dialogcancel_reason: { type: String },
            CanBeReprocessed_CombinedPreview: { type: Boolean },

            previewPrinting: { type: Object },
            dialogrequestbatch: { type: Object },
            dialogconfirm: { type: Object },
            dialogpackingoptions: { type: Object },
        }
    }

    _netbase: any
    _observer: any
    order: any
    APIPathItem: string
    hasUnsavedChanges: boolean
    api_action: any
    api_url: any
    dialogcancel_reason: any
    CanBeReprocessed_CombinedPreview: any
    dialogrequestbatch: any
    previewPrinting: any
    dialogconfirm: any
    dialogpackingoptions: any



    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_orderLoaded(order)',
            '_modelStatusUpdated(order.Status)',
            'dialogpackingoptionsQALabelChanged(dialogpackingoptions.QALabelList, dialogpackingoptions.QALabel.id)'
        ]
    }
    _log(v) { console.log(v) }

    connectedCallback()
    {
        super.connectedCallback()

        //fonts
        this._attachFonts(fonts)

        document.addEventListener("keydown", (e) => this._onKeydown(e))
        this.addEventListener('iron-resize', (e) => this._onResized(e))
        this.addEventListener('tmladmin-production-order-item', (e) => this._onProductionOrderItemDispatch(e))
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveConfirmTap()
        }
    }

    _dis(a, negativeB)
    {
        return a || !negativeB
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        if (orderP && orderP.path.indexOf('order.Status.title') >= 0) { return false }
        return super._computeHasUnsavedChanges(order, orderP, orderSaved)
    }

    _onResized(e?)
    {
    }

    _modelStatusUpdated(status)
    {
        if (this.order?.Status?.title)
        {
            this.set('order.Status.title', this.order.Status.title)
        }
    }

    _orderLoaded(order)
    {
        if (!order) { return }

        this.set('orderProcessTypeSelected', order.ProcessTypeSelected)
        this.set('orderProductionOnHold', false)
        this.set('orderSpotColors', false)
        this.set('orderMaxItemsPerBatch', '')
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.hasUnsavedChanges)
        {
            e.preventDefault()
            e.stopPropagation()

            // this.saveConfirmTap()
        }
    }

    saveConfirmTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    saveTap(e?)
    {
        this.api_action = 'save'
        this._postData(this.order)
    }

    disableStatusSelection(loading)
    {
        return loading
    }
    
    reprocessTap(e)
    {
        this._openDlg(this.$.dialogreprocess as PaperDialogElement)
    }

    reprocessConfirmTap(e)
    {
        // console.log(e)
        var btn = e.target
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        var url = this.websiteUrl + this.APIPath + 'reprocess'
        this.url = StringUtil.urlquery(url, { porderid: this.order.id, cp: this.CanBeReprocessed_CombinedPreview })
        this.set('CanBeReprocessed_CombinedPreview', false)
        btn.disabled = true
        if (progress) { progress.active = true }
        this.cmd((result) => { 
            btn.disabled = false 
            if (progress) { progress.active = false }

            if (result)  
            { 
                this._saveOrderForUnsavedComparison(result)
                this.set('order', result) 
            }
        })
    }

    pushtobatchConfirmTap(e)
    {
        this.set('dialogrequestbatch', {})
        this.set('dialogrequestbatch.ProductionOnHold', false)
        this.set('dialogrequestbatch.SpotColors', false)
        this.set('dialogrequestbatch.IsDraft', false)
        this.set('dialogrequestbatch.MaxItemsPerBatch', '')

        this.set('dialogrequestbatch.ProcessTypeList', deepClone(this.order.ProcessTypeList))
        this.set('dialogrequestbatch.ProcessType', this.order.ProcessTypeList?.length ? deepClone(this.order.ProcessTypeList[0]) : this.order.Settings.ProcessType)

        this._openDlg(this.$.dialogrequestbatch as PaperDialogElement)
    }

    pushtobatchTap(e)
    {
        var btn = e.target
        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        var url = this.websiteUrl + this.APIPath + 'push-batch'
        this.url = StringUtil.urlquery(url, { 
            porderid: this.order.id, 
            ptype: this.dialogrequestbatch.ProcessType.id, 
            onhold: this.dialogrequestbatch.ProductionOnHold, 
            spotcolors: this.dialogrequestbatch.SpotColors, 
            isdraft: this.dialogrequestbatch.IsDraft, 
            maxItemsPerBatch: this.dialogrequestbatch.MaxItemsPerBatch 
        })
        btn.disabled = true
        if (progress) { progress.active = true }
        this.cmd((result) =>
        {
            btn.disabled = false
            if (progress) { progress.active = false }
            
            if (result)  
            {
                this._saveOrderForUnsavedComparison(result)
                this.set('order', result)
            }
        })
    }


    disableManSelection(loading, CanBeSaved, pending)
    {
        return loading || !CanBeSaved || pending
    }
   
    dialogpackingoptionsQALabelChanged(QALabelList, QALabel_id)
    {
        if (Array.isArray(QALabelList)) 
        {
            var f = QALabelList.filter(i => i.id == QALabel_id)
            if (f.length > 0)
            {
                // this.set('dialogpackingoptions.QALabel', f[0])
                this.set('dialogpackingoptions.QALabel.title', f[0].title)
                this.set('dialogpackingoptions.QALabel.imageUrl', f[0].imageUrl)
                this.set('dialogpackingoptions.QALabel.properties', f[0].properties)
            }
        }
    }




    //#region Item Handlers

    _onProductionOrderItemDispatch(e)
    {
        if (e?.detail?.resetIntermidiateVersion)
        {
            this.resetIntermidiateVersionItemConfirm(e)
        }
        else if (e?.detail?.reprocess)
        {
            this.reprocessItemConfirm(e)
        }
        else if (e?.detail?.preferedPackingQuantity)
        {
            this.preferedPackingQuantityConfirm(e)
        }
        else if (e?.detail?.showBarcodes)
        {
            this.showBarcodes(e)
        }
    }

    resetIntermidiateVersionItemConfirm(e)
    {
        var dialogconfirm = this.$.dialogconfirm as PaperDialogElement
        this.dialogconfirm = {
            title: 'Reset Confirmation',
            msg: "Are you sure you'd like to reset Intermidiate Version?",
            btnClose: 'Close',
            btnConfirm: 'Reset',
            progress: e?.detail?.uiprogress,
            entry: e?.detail?.entry,
            confirmTap: (ee) => { this.resetIntermidiateVersionItem(ee) },
        }
        this._openDlg(dialogconfirm)
    }

    resetIntermidiateVersionItem(e?)
    {
        var progress = this.dialogconfirm.progress
        var entry = this.dialogconfirm.entry
        
        var url = this.websiteUrl + this.APIPathItem + 'intermidiateversion-reset'
        this.url = StringUtil.urlquery(url, { porderitemid: entry?.id })

        if (progress) { progress.active = true }
        this.cmd((result) =>
        {
            this._saveOrderForUnsavedComparison(result)
            this.set('order', result)
            if (progress) { progress.active = false }
        })
    }

    reprocessItemConfirm(e)
    {
        var dialogconfirm = this.$.dialogconfirm as PaperDialogElement
        this.dialogconfirm = {
            title: 'Validate Order Item Confirmation',
            msg: "Are you sure you'd like to Validate Order Item?",
            btnClose: 'Close',
            btnConfirm: 'Validate Order Item',
            progress: e?.detail?.uiprogress,
            entry: e?.detail?.entry,
            confirmTap: (ee) => { this.reprocessItem(ee) },
        }
        this._openDlg(dialogconfirm)
    }

    reprocessItem(e)
    {
        var progress = this.dialogconfirm.progress
        var entry = this.dialogconfirm.entry

        var url = this.websiteUrl + this.APIPathItem + 'reprocess'
        this.url = StringUtil.urlquery(url, { porderitemid: entry?.id })
        if (progress) { progress.active = true }
        this.cmd((result) =>
        {
            this._saveOrderForUnsavedComparison(result)
            this.set('order', result)
            if (progress) { progress.active = false }
        })
    }

    showBarcodes(e)
    {
        var batchi = e?.detail?.batchi
        this.previewPrinting = { Content: batchi.Items }
        var dialogbarcodes = this.$.dialogbarcodes as PaperDialogElement
        this._openDlg(dialogbarcodes)
    }

    preferedPackingQuantityConfirm(e)
    {
        var progress = e?.detail?.uiprogress
        var entry = e?.detail?.entry
        var dialogpackingoptions = this.$.dialogpackingoptions as PaperDialogElement

        var api_url = this.websiteUrl + this.APIPathItem + 'getpackingoptions'
        var obj: any = { 
            id: entry?.id, 
        }

        if (progress) { progress.active = true }
        this.cmdPost(api_url, obj, (result, r) =>
        {
            var itemi = this._findItemFromRootModel(entry?.id, result?.ProductionItems)
            if (itemi) 
            {
                this.dialogpackingoptions = {
                    qty: itemi.PreferedPackingQuantity,
                    QALabelList: itemi.QALabelList,
                    QALabel: itemi.QALabel,
                    QALabelProperties: itemi.QALabel.properties,
                    // QALabelProperties: [
                    //     {name:'prop1', val: '1'},
                    //     {name:'prop2', val: '2'},
                    //     {name:'prop3', val: '3'},
                    // ],
                    entry: entry,
                    progress: progress
                }
                this.set('dialogpackingoptions.QALabel.id', itemi.QALabel.id)
                this._openDlg(dialogpackingoptions)
            }
            if (progress) { progress.active = false }
        })
    }

    preferedPackingQuantityTap(e)
    {
        var progress = this.dialogpackingoptions.progress
        var entry = this.dialogpackingoptions.entry

        var api_url = this.websiteUrl + this.APIPathItem + 'setpackingoptions'
        var obj: any = { 
            id: entry?.id, 
            PreferedPackingQuantity: this.dialogpackingoptions.qty,
            QALabel: this.dialogpackingoptions.QALabel,
            QALabelProperties: this.dialogpackingoptions.QALabelProperties,
        }

        if (progress) { progress.active = true }
        this.cmdPost(api_url, obj, (result, r) =>
        {
            if (r)
            {
                if (r['success'] === true && result)
                {
                    this._saveOrderForUnsavedComparison(result)
                    this.set('order', result)
                }
                else if (r['success'] === false)
                {
                }
                else if (r['error'])
                {
                    // this._onError(null, r['error'])
                }
            }
            if (progress) { progress.active = false }
        })
    }

    dialogconfirmTap(e)
    {
        if (this.dialogconfirm?.confirmTap)
        {
            this.dialogconfirm?.confirmTap(e)
        }
    }

    _findItemFromRootModel(id, productionItems)
    {
        if (!Array.isArray(productionItems)) { return null }

        for (var itemi of productionItems)
        {
            if (itemi.id == id)
            {
                return itemi
            }
        }
        return null
    }

    //#endregion

}
