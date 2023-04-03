import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-input/paper-textarea.js'
import '@polymer/paper-dialog/paper-dialog.js'
import '@polymer/paper-button/paper-button.js'
import '@polymer/paper-checkbox/paper-checkbox'
import '@polymer/paper-tabs/paper-tab'
import '@polymer/paper-tabs/paper-tabs'
import '@polymer/paper-tabs/paper-tabs-icons'
import '@polymer/paper-icon-button/paper-icon-button.js'
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/paper-progress/paper-progress.js'
import '@vaadin/vaadin-grid/vaadin-grid.js'
import '@vaadin/vaadin-grid/vaadin-grid-filter.js'
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js'
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../../components/utils/EventPassiveDefault'
import { html } from '@polymer/polymer/polymer-element'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { Currency } from '../../components/utils/CommonUtils'
import { StringUtil } from '../../components/utils/StringUtil'
import { NetBase } from '../../components/bll/net-base'
import { UISortableList } from '../../components/ui/ui-sortable-list'
import view from './catalog-products.ts.html'
import style from './catalog-products.ts.css'
import style_shared from './shared-styles.css'
import '../../components/ui/ui-sortable-list'
import '../ui/catalog-products-item'
import '../ui/ui-dropdown-menu'
import '../shared-styles/common-styles'
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const Teamatical: TeamaticalGlobals = window['Teamatical']




@FragmentDynamic
class AdminCatalogProducts extends FragmentBase
{
    static get is() { return 'tmladmin-catalog-products' }

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

            summary: { type: Object },
            order: { type: Object },
            category: { type: Object, computed: '_computeCurrentCategory(order.CurrentCategoryID, order.Entries)' },
            orderSaved: { type: String },
            hasUnsavedChanges: { type: Boolean, notify: true, computed: '_computeHasUnsavedChanges(order, order.*, orderSaved)', reflectToAttribute: true },

            APIPath: { type: String, value: '/admin/api/catalog/' },
            api_action: { type: String, value: 'get' },
            api_url: { type: String, computed: '_computeAPIUrl(websiteUrl, APIPath, api_action)' },
            queryParamsRequired: { type: Object, value: [] },

            loading: { type: Boolean, notify: true, readOnly: true, },
            failure: { type: Boolean, notify: true, readOnly: true, },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },

            editing: { type: Boolean, value: true, notify: true, reflectToAttribute: true },
            isMoving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            dialogremove_id: { type: String },
            dialogremove_list: { type: Array },
            draggingTabs: { type: Boolean, value: false },
            productNotAllowed: { type: Boolean, value: false },

            orderOldJSON: { type: String, notify: true },
            changedModel: { type: String, computed: '_computeChangedModel(order.*, orderOldJSON)' },
            keepProductColors: { type: Boolean, },

            dialogeditcategory: { type: Object },
        }
    }

    dialogeditcategory: any
    _observer: any
    _oldCatID: any
    _orderEntries: any
    _lastCurrentCategoryID: any
    hasUnsavedChanges: boolean
    websiteUrl: any
    api_action: any
    editing: boolean
    isMoving: boolean
    order: any
    category: any
    dialogremove_id: any
    dialogremove_list: any
    draggingTabs: any
    keepProductColors: any
    _catalogReloadDebouncer: any
    productNotAllowed: boolean


    static get observers()
    {
        return [
            '_dataReloadChanged(visible, queryParams)',
            '_loaded(order)',
            '_categorySelected(order.CurrentCategoryID)',
            '_notvalidCleanup(order.*)',
            '_catalogHasChanged(order.Catalog.id)',
            // '_log(userInfo.isAlmighty)',
        ]
    }

    get catList() { return this.$['catList'] }
    get catItems() { return this.$['catItems'] }
    get dialogaddproduct(): any { return this.$['dialogaddproduct'] } 

    _log(order) { console.log(order) }

    connectedCallback()
    {
        super.connectedCallback()

        // this.$.dialogremove.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogremove)
        // this.$.dialogaddproduct.remove() //move dialog on top (to fix app-layout- drawer and header)
        // document.body.appendChild(this.$.dialogaddproduct)


        this.addEventListener('api-admin-catalog-item-delete', (e) => this._onListItemDelete(e))
        this.addEventListener('api-admin-catalog-item-new', (e) => this._onListItemAddBefore(e))
        
        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    ready()
    {
        super.ready()
    }

    save() //hotkey ctrl+s
    {
        if (this.hasUnsavedChanges)
        {
            this.saveCatalogTap()
        }
    }

    _onKeydown(e)
    {
        e = e || window.event;

        if (!this.visible) { return }

        if (keyboardEventMatchesKeys(e, 'esc') && this.draggingTabs)
        {
            e.preventDefault()
            e.stopPropagation()

            this.draggingTabs = !this.draggingTabs
        }
    }

    _computeHasUnsavedChanges(order, orderP, orderSaved)
    {
        try { var saved = JSON.parse(orderSaved) } catch {}
        var v = super._computeHasUnsavedChanges(Object.assign({}, order, { 
            CurrentCategoryID: saved?.CurrentCategoryID, 
            notvalid: saved?.notvalid, 
            Catalog: saved?.Catalog, 
        }), orderP, orderSaved)
        return v
    }

    hideSaveBtn(product)
    {
        return false
    }

    hideSyncDumpBtn(env, order, isAlmighty, profile: any = null)
    {
        return !isAlmighty 
            || (env != 'Production' && this._isUser(profile?.sub, { 'krs': 1, }))
    }

    hideSyncApplyBtn(env, order, isAlmighty, profile: any = null)
    {
        return !isAlmighty 
            || env != 'Development'
    }

    saveCatalogConfirmTap(e?)
    {
        this.api_action = 'save'
        var catID = this.order.CurrentCategoryID 
        if (this.draggingTabs)
        {
            this._editCategoriesTap()
        }

        this._postData(this.order, () => 
        {
            this._restoreCatItems()
            this.set('order.CurrentCategoryID', catID)
        })
    }

    saveCatalogTap(e?)
    {
        this._openDlg(this.$.dialogsave as PaperDialogElement)
    }

    dumpCatalogTap(e)
    {
        this.api_action = 'dump'
        this._postData(this.order)
    }

    syncCatalogTap(e)
    {
        this.api_action = 'applyproduction'
        this._postData(this.order)
    }

    isEmpty(category, len)
    {
        return category && len == 0
    }

    needSelectCategory(currentCategoryID, draggingTabs)
    {
        return !currentCategoryID && !draggingTabs
    }
  
    onListItem(e)
    {
        // if (!this.editing)
        // {
        //     var item = e.model.__data.item
        //     var url = this._getItemHref(item)
        //     // console.log('onListItem -> href: ' + url)
        //     this._goto(url)
        // }
        e.preventDefault()
        return false
    }

    _hide_products(draggingTabs, productNotAllowed)
    {
        return draggingTabs || productNotAllowed
    }

    _dis_cat_title(loading, isLocalized)
    {
        return loading || isLocalized
    }

    disabledSaveBtn(loading, changedModel)
    {
        return loading || !changedModel
    }

    _computeChangedModel(orderP, orderOldJSON)
    {
        var recentJSON = JSON.stringify(this.order.Entries)
        var changed = (orderOldJSON != recentJSON)
        if (orderOldJSON == undefined || this.order == undefined) { changed = false }
        // console.log(this.order.Entries, changed)
        return true
    }

    _loaded(order) 
    { 
        this.draggingTabs =  false 
        if (this.order && this.order.Entries && this.order.Entries.length > 0) 
        {
            var cat = this.order.Entries[0].Category
            if (this._lastCurrentCategoryID)
            {
                var f = this.order.Entries.filter(i => i.Category == this._lastCurrentCategoryID)
                if (f && f.length > 0)
                {
                    cat = f[0].Category
                }
            }

            this.set('order.CurrentCategoryID', cat)
        }

        this.set('orderOldJSON', JSON.stringify(this.order.Entries))
    }

    _restoreCatItems()
    {
        var p = this.catItems
        Array.prototype.slice.call(p.children)
            .map(function (x) { return p.removeChild(x) })
            .sort(function (x, y)
            {
                var a = (x.id == 'catItemsRepeat' ? Number.MAX_SAFE_INTEGER : parseInt(x.getAttribute('data-index'), 10))
                var b = (y.id == 'catItemsRepeat' ? Number.MAX_SAFE_INTEGER : parseInt(y.getAttribute('data-index'), 10))
                if (a < b) { return -1 }
                if (a > b) { return 1 }
                return 0
            })
            .forEach(function (x) { p.appendChild(x) })
    }

    _restoreCatList()
    {
        //catItems - catList
        var p = this.catList
        Array.prototype.slice.call(p.children)
            .map(function (x) { return p.removeChild(x) })
            .sort(function (x, y)
            {
                var a = (x.id == 'catListRepeat' ? Number.MAX_SAFE_INTEGER : parseInt(x.getAttribute('data-index'), 10))
                var b = (y.id == 'catListRepeat' ? Number.MAX_SAFE_INTEGER : parseInt(y.getAttribute('data-index'), 10))
                if (a < b) { return -1 }
                if (a > b) { return 1 }
                return 0
            })
            .forEach(function (x) { p.appendChild(x) })
    }

    _notvalidCleanup(orderP)
    {
        if (orderP.path.startsWith('order.Entries.') && orderP.path.indexOf('notvalid') < 0)
        {
            for (var i in this.order.Entries)
            {
                delete this.order.Entries[i].notvalid
                this.notifyPath('order.Entries.' + i)
            }
            this.set('order.notvalid', null)
        }
    }

    _categorySelected(currentCategoryID?)
    {
        // console.log(currentCategoryID)
        if (currentCategoryID && this.order.Entries)
        {
            var r = this.order.Entries.filter(i => { return i.Category == currentCategoryID }) 
            if (r?.length > 0)
            {
                // console.log(r[0])
                this.productNotAllowed = this._asBool(r[0]?.StoreID)
            }
        }

        this._lastCurrentCategoryID = currentCategoryID
        this._restoreCatItems()
    }

    _rerender_sortable() 
    {
        var catid = this.order.CurrentCategoryID
        this.set('order.CurrentCategoryID', '')
        this.set('order.CurrentCategoryID', catid)
    }

    _addProductEnter(e)
    {
        var keycode
        var wevent: any = window.event
        if (wevent) { keycode = wevent.keyCode } else if (e) { keycode = e.which }

        if ((!e.ctrlKey && !e.altKey && keycode == 13))// && e.target == this.$['newbarcode'])
        {
            var efake = { target: { parentElement: e.target } }
            this._addProductTap(efake)
        }
    }

    _addProductTap(e)
    {
        var useridInput = e.target.parentElement
        var insertIndex = useridInput.getAttribute('insert-index')
        var prodnew = useridInput.value
        if (!prodnew || !prodnew.trim || prodnew.trim() == '') { return }
        var prodnewTrim = prodnew.trim()
        if (prodnewTrim.indexOf("d~") == 0)
        {
            prodnewTrim = "d~" + StringUtil.replaceAll(prodnewTrim, "d~", "").toUpperCase()
        }
        else
        {
            prodnewTrim = prodnewTrim.toUpperCase()
        }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true

        this.api_action = 'createitem'
        var prodnewObj: any = { ID: prodnewTrim, KeepProductColors: this.keepProductColors }

        this.cmdPost(this.api_url, prodnewObj, (r, response) => {
            progress.active = false
            useridInput.disabled = false

            var r = response
            if (r)
            {
                if (r['success'] === true)
                {
                    this.dialogaddproduct.close()
                    var newItem = r['result']
                    newItem.IsNew = true
                    var posi = -1
                    var f = this.order.Entries.filter((i, inx) => { 
                        var v = i.Category == this.order.CurrentCategoryID 
                        if (v) { posi = inx }
                        return v
                    })
                    if (posi >= 0)
                    {
                        useridInput.value = ''                        
                        // console.log(insertIndex, newItem)
                        if (insertIndex)
                        {
                            this.splice('order.Entries.' + posi + '.ProductConfigurations', insertIndex, 0, newItem)
                        }
                        else
                        {
                            this.push('order.Entries.' + posi + '.ProductConfigurations', newItem)
                        }

                        this.async(() => { this._rerender_sortable() })
                    }
                    else
                    {
                        this._applyDetailsErrors('order', [
                            { Key: "ID", Message: "Please select an catalog category...", Type: "e"}
                        ])
                    }
                    this.set('order.UnsavedChanges', this.order.UnsavedChanges ? this.order.UnsavedChanges + 1 : 1)
                }
                else if (r['success'] === false)
                {
                    var s = r['summary']
                    if (s && (s.Key == 'validation_fail'))
                    {
                        this._applyDetailsErrors('order', r['details'])
                    }
                }
                else if (r['error'])
                {
                    this._onError(null, r['error'])
                }
            }
        })

        if (e.preventDefault) 
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    onInputChanged(e)
    {
        return this._onInputChanged(e)
    }

    _addCategoryTap(e)
    {
        var useridInput = e.target.parentElement
        var catnew = useridInput.value
        
        if (!catnew || !catnew.trim || catnew.trim() == '') 
        { 
            this._applyDetailsErrors('order', [{ Key: "NewCategoryID", Message: "Enter a valid category ID", Type: "e" }])
            return 
        }
        var catnewTrim = catnew.trim().toLowerCase()
        var f = (this.order && this.order.Entries) ? this.order.Entries.filter((i) => { return i.Category == catnewTrim }) : []
        if (f.length > 0) 
        { 
            this._applyDetailsErrors('order', [ { Key: "NewCategoryID", Message: "Duplicated category ID", Type: "e" } ])
            return 
        }

        var progress = e.target.parentElement.querySelector('paper-spinner-lite')
        progress.active = true
        useridInput.disabled = true
        this.async(() => {
            progress.active = false
            useridInput.disabled = false
            useridInput.value = ''
            var newcatObj = { Category: catnewTrim, ProductConfigurations: [] }
            this.push('order.Entries', newcatObj)
            this.set('order.CurrentCategoryID', newcatObj.Category) // selection
        }, 300)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _editCategoryTap(e)
    {
        var cati = e.model.__data.cati
        var catinx = e.model.__data.index
        // this.dialogremove_id = cati.Category
        // this.dialogremove_list = cati.ProductConfigurations
        this.set('dialogeditcategory', Object.assign({ 
            catinx: catinx,  
            IsLocalized: true,
        }, cati))
        this._openDlg(this.$.dialogeditcategory as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _applyCategoryTap(e)
    {
        var cati = this.dialogeditcategory
        var catinx = cati.catinx
        delete cati.catinx
        this.set(`order.Entries.${catinx}`, cati) 
    }

    _removeCategoryTap(e)
    {
        var cati = e.model.__data.cati
        this.dialogremove_id = cati.Category
        this.dialogremove_list = cati.ProductConfigurations

        this._openDlg(this.$.dialogremove as PaperDialogElement)

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _removeCategoryConfirmTap(e)
    {
        var catID = this.dialogremove_id
        // console.log(this.dialogremove_id)

        if (this.order.CurrentCategoryID == catID)
        {
            this.set('order.CurrentCategoryID',  '') //reset selection
        }
        
        var f = this.order.Entries.filter(i => i.Category == catID)
        if (f && f.length > 0)
        {
            var inx = this.order.Entries.indexOf(f[0])
            this.splice('order.Entries', inx, 1)

            // this.draggingTabs = false
        }

        // e.preventDefault()
        // e.stopPropagation()
        // return false
    }

    _editCategoriesTap(e?)
    {
        if (!this.draggingTabs)
        {
            this._oldCatID = this.order.CurrentCategoryID
            this.set('order.CurrentCategoryID', '')
        }
        this.draggingTabs = !this.draggingTabs
        if (!this.draggingTabs && this._orderEntries)
        {
            this._restoreCatList()

            //restore
            this.set('order.Entries', this._orderEntries)
            this._orderEntries = null
        }

        if (e)
        {
            e.preventDefault()
            e.stopPropagation()
        }
        return false
    }

    _computeCurrentCategory(catID, entriesArray)
    {
        var f = entriesArray ? entriesArray.filter(i => i.Category == catID) : null
        return f && f.length > 0 ? f[0] : []
    }

    _catalogHasChanged(catid)
    {
        if (this.orderUpdating) { return }

        this._catalogReloadDebouncer = Debouncer.debounce(this._catalogReloadDebouncer, timeOut.after(200), () =>
        {
            this.api_action = 'get'
            var robj = { id: catid }
            this._fetchItems(3, null, robj)
        })
    }

    reload(reset?)
    {
        if (reset) { this.order = null }

        this.dialogcancel_reason = ''
        this.api_action = 'get'
        var robj = { 
            id: this.order?.Catalog?.id,
        } 
        if (robj.id == undefined) { delete robj.id }
        this._fetchItems(3, null, robj)
    }


    _onTabsSortFinish(e)
    {
        if (!this.order || !this.order.Entries) { return }

        // console.log(e.detail.items)
        var ar: any = []
        for (var i in e.detail.items)
        {
            var item: any = e.detail.items[i]
            var modelitem: any = item && item.__dataHost && item.__dataHost.__data ? item.__dataHost.__data.cati : null
            if (modelitem)
            {
                // var el: any = this.category.ProductConfigurations.find((i) => { return i.name == modelitem.name })
                var el: any = this.order.Entries.find((i) => { return i == modelitem })
                ar.push(el)
            }
        }
        this._orderEntries = ar
    }

    _onListSortFinish(e)
    {
        if (!this.category || !this.category.ProductConfigurations) { return }

        var ar: any = []
        for (var i in e.detail.items)
        {
            var item: any = e.detail.items[i]
            var modelitem: any = item && item.__dataHost && item.__dataHost.__data ? item.__dataHost.__data.item : null
            if (modelitem)
            {
                // var el: any = this.category.ProductConfigurations.find((i) => { return i.name == modelitem.name })
                var el: any = this.category.ProductConfigurations.find((i) => { return i == modelitem })
                ar.push(el)
            }
        }
        this.category.ProductConfigurations = ar
        this.set('order.UnsavedChanges', this.order.UnsavedChanges ? this.order.UnsavedChanges + 1 : 1)
    }

    _onListItemDelete(e)
    {
        if (!this.category || !this.category.ProductConfigurations) { return }

        this._syncDOMAndModel((newlist) =>
        {
            this.set('category.ProductConfigurations', newlist)
            this.set('order.UnsavedChanges', this.order.UnsavedChanges ? this.order.UnsavedChanges + 1 : 1)
        })

        e.preventDefault()
        e.stopPropagation()
        return false
    }

    _onListItemAddBefore(e)
    {
        if (!this.category || !this.category.ProductConfigurations) { return }

        // console.log(e.detail)
        
        var input = this.dialogaddproduct.querySelector('paper-input') as PaperInputElement
        input.value = ''
        input.setAttribute('insert-index', e.detail.index)

        // var epath = e.path || e.composedPath()
        this._openDlg(this.dialogaddproduct) //, epath[0]

        e.preventDefault()
        e.stopPropagation()
        return false
    }


    _isMovingDebouncer: Debouncer
    _syncDOMAndModel(itemsModificationCallback)
    {
        if (!itemsModificationCallback) { return }

        this.isMoving = true

        var domSortingList = this.shadowRoot.querySelector('#catItems') as UISortableList
        var neworderlist = this._itemsDOMToModel(domSortingList.items)
        this._restoreDOM()
        requestAnimationFrame(_ => { itemsModificationCallback(neworderlist) })

        this._isMovingDebouncer = Debouncer.debounce(this._isMovingDebouncer, timeOut.after(300), () =>
        {
            this.isMoving = false
        })
    }

    _itemsDOMToModel(domitems)
    {
        var ar:any = []
        for (var i in domitems)
        {
            var item:any = domitems[i]
            var itemmodel: any = item && item.__dataHost && item.__dataHost.__data ? item.__dataHost.__data.item : null 
            if (itemmodel && item?.deleting !== true)
            {
+                ar.push(itemmodel)
            }
        }
        return ar
    }

    _restoreDOM()
    {
        //restore natural order of dom-repeat elemets
        var p = this.shadowRoot.querySelector('#catItems') as UISortableList
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
        var domRepeat = p.querySelector('dom-repeat')
        p.removeChild(domRepeat)
        p.appendChild(domRepeat)
        
        this.set('category', Object.assign({}, this.category))
    }
}
