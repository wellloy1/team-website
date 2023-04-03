import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/paper-input/paper-input.js'
import '@polymer/paper-icon-button/paper-icon-button'
import '@polymer/paper-spinner/paper-spinner-lite.js'
import '@polymer/app-route/app-route'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js'
import { html } from '@polymer/polymer/polymer-element'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { scroll } from '@polymer/app-layout/helpers/helpers'
import { FragmentBase, FragmentDynamic } from './fragment-base'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { Currency, deepClone } from '../utils/CommonUtils'
import { StringUtil } from '../utils/StringUtil'
import { TeamaticalApp } from '../teamatical-app/teamatical-app'
import { RosterData } from '../bll/roster-data'
import view from './account-roster.ts.html'
import style from './account-roster.ts.css'
import '../shared-styles/common-styles'
import '../shared-styles/form-styles'
import '../shared-styles/tooltip-styles'
import '../bll/roster-data'
import '../ui/ui-button'
import '../ui/ui-select'
import '../ui/ui-loader'
import '../ui/ui-network-warning'
import '../ui/ui-csv-import'
import { UICSVImport } from '../ui/ui-csv-import';
import { IronListElement } from '@polymer/iron-list/iron-list.js';
import { PaperInputElement } from '@polymer/paper-input/paper-input.js'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const AccountRosterBase = mixinBehaviors([IronResizableBehavior], FragmentBase) as new () => FragmentBase & IronResizableBehavior
const baseMappingKeys = ['NA', 'Player Name', 'Player Number', 'Player Year', 'Player Captain']
const baseMappingSizeKeys = ['Player Size']


@FragmentDynamic
export class AccountRoster extends AccountRosterBase
{
    static get is() { return 'teamatical-account-roster' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-form-styles teamatical-tooltip-styles">${style}</style>${view}`])}

    static get properties()
    {
        return {
            route: { type: Object, },
            subroute: { type: Object, },
            queryParams: { type: Object },
            userInfo: { type: Object, },
            websiteUrl: { type: String },

            roster: { type: Object, },
            numItems: { type: Number },
            failure: { type: Boolean, observer: '_failureChanged', value: false, notify: true },
            loading: { type: Boolean, observer: '_loadingChanged', value: false, notify: true },
            visible: { type: Boolean, notify: true, observer: '_visibleChanged' },
            offline: { type: Boolean, observer: '_offlineChanged' },
            saving: { type: Boolean, value: false, notify: true, reflectToAttribute: true },


            _isNoImport: { type: Boolean, computed: '_computeIsNotImport(roster, roster.Items, failure, offline, loading, importUploaderHide)' },
            _isNoRoster: { type: Boolean, computed: '_computeIsNoRoster(roster, roster.Items, failure, offline)' },
            _isNotConn: { type: Boolean, computed: '_computeIsNotConn(roster, failure, offline, loading)' },
            _disabled: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },
            actionNotAllowed: { type: Boolean, computed: '_computeActionNotAllowed(offline, failure, loading, saving)' },
            submenu: { type: Array, notify: true, computed: '_computedSubmenu(userInfo, userInfo.*)' },
            searchingProgress: { type: Boolean },
            playernew: { type: Object, value: {} },

            importUploaderHide: { type: Boolean, value: false },
            importedItems: { type: Array },
            importedMapping: { type: Array },
            importedMappingKeys: { type: Array, computed: '_compute_importedMappingKeys(roster)' },

            _disabledImportUploaderBtn: { type: Boolean, computed: '_computeDisabledImportUploaderBtn(offline, failure, loading, saving, importedItems)' },
            _disabledExportBtn: { type: Boolean, computed: '_compute_disabledExportBtn(offline, failure, loading, saving, roster.Items)' },
        }
    }

    static get observers()
    {
        return [
            '_rosterLoaded(roster.PlayerCaptainOptions)',
            // '_log(roster.Items)',
        ]
    }
    _log(v) { console.log(v) }

    _disabledImportUploaderBtn: any
    _listScrollTop: any
    isAttached: any
    roster: any
    playernew: any
    loading: any
    visible: any
    importUploaderHide: any
    importedMapping: any
    importedItems: any
    queryParams: any

    get rosterList() { return this.$['list'] }
    get rosterListVirtual() { return this.$['list-virtual'] as IronListElement}
    get rosterData() { return this.$['roster-data'] as RosterData}
    get csvImport() { return this.$['csv-import'] as UICSVImport }
    get newPlayerName() { return this.$['newPlayerName'] as HTMLElement }
    


    connectedCallback()
    {
        super.connectedCallback()
        this.isAttached = true

        // document.documentElement.scrollTop = 0

        var scrollHdl = (e) => 
        {
            if (this.visible && this.rosterListVirtual) { this.rosterListVirtual.fire('iron-resize') }

            if (this._listScrollTop !== undefined)
            {
                document.documentElement.scrollTop = this._listScrollTop
                this._listScrollTop = undefined
            }
        }

        window.addEventListener('scroll', scrollHdl)
        this.parentElement?.addEventListener('scroll', scrollHdl)
        document.addEventListener("keydown", (e) => this._onKeydown(e))
    }

    _rosterItemTitle(rosterID, rosterTitle)
    {
        var title = rosterTitle ? rosterTitle : rosterID
        return this.localize('rosters-item-title', 'title', title)
    }

    _getPlayerNew(p:any = {})
    {
        if (this.roster && this.roster.PlayerCaptainOptions && this.roster.PlayerCaptainOptions.length > 0)
        {
            p.PlayerCaptain = this.roster.PlayerCaptainOptions[0]
        }

        if (!p.Sizes && this.roster && this.roster.SizeCategories)
        {
            p.Sizes = this._getSizesModelNew()
        }
        
        return p
    }

    _hideImport(importUploaderHide, _isNoRoster)
    {
        return importUploaderHide && _isNoRoster
    }

    _getCaptainNew(suggestedCaptain?)
    {
        if (!this.roster || !Array.isArray(this.roster.PlayerCaptainOptions)) { return [] }
        const suggestedCaptainLC = typeof(suggestedCaptain) == 'string' ? suggestedCaptain.trim() : undefined
        var s = this.roster.PlayerCaptainOptions.filter(i => i.Name && (i.Name == suggestedCaptainLC))
        // console.log(JSON.parse(JSON.stringify(s)))
        return s.length > 0 ?  s[0] : undefined
    }

    _compute_importedMappingKeys(roster)
    {
        var mappingKeys = baseMappingKeys
        var mappingSizeKeys = this._getImportedMappingSizeKeys(roster)
        mappingKeys = mappingKeys.concat(mappingSizeKeys)
        return mappingKeys
    }

    _getImportedMappingSizeKeys(roster)
    {
        var mappingKeys: string[] = []
        if (roster?.SizeCategories?.length)
        {
            for (var si of roster.SizeCategories)
            {
                mappingKeys.push(`${si.SizeCategoryName} Size`)
            }
        }
        else
        {
            mappingKeys = mappingKeys.concat(baseMappingSizeKeys)
        }

        return mappingKeys
    }

    _getSizesModelNew(importItem?, mapping?)
    {
        if (!this.roster || !this.roster.SizeCategories) { return [] }
        var scats:any[] = [] 
        for (var si of this.roster.SizeCategories)
        {
            var sii = deepClone(si)
            var scatname = `${si.SizeCategoryName} Size`
            var suggestedSize:any = importItem && mapping ? importItem[mapping[scatname]] : undefined
            const suggestedSizeLC = typeof(suggestedSize) == 'string' ? suggestedSize.trim().toLocaleUpperCase() : 'M'
            const suggestedSizeLC_2XL = suggestedSizeLC == 'XXL' ? '2XL' : undefined

            if (Array.isArray(sii.Sizes))
            {
                var s = sii.Sizes.filter(i => i.id && (i.id == suggestedSizeLC || i.id == suggestedSizeLC_2XL))
                if (s.length > 0) { s = s[0] } else { s = sii.Sizes[0] }
                // console.log(suggestedSizeLC, suggestedSizeLC_2XL, '=>', JSON.stringify(s))
                sii.Value = Object.assign({}, s) //clone
                if (!sii.Sizes) { sii.Sizes = undefined }
            }
            scats.push(sii)
        }

        return scats
    }

    _sizeCategoriesSelected(arr, inx)
    {
        return Array.isArray(arr) && arr[inx] ? arr[inx].Sizes : []
    }

    _sizeCaption(sizeCategoryName, selected)
    {
        var seltxt = selected ? ` (${this.localize('roster-item-size-selected')})` : ''
        return `${sizeCategoryName}${seltxt}`
    }

    _rosterLoaded(playerCaptainOptions)
    {
        this.set('playernew', this._getPlayerNew())

        if (this.rosterListVirtual) { this.rosterListVirtual.fire('iron-resize') }
    }

    _formatN(index)
    {
        return '' + (parseInt(index) + 1)
    }

    _removePlayerTap(e)
    {
        var indexi = e.model.__data.index
        this.splice('roster.Items', indexi, 1)
    }

    _addNewTap(e, obj, hideErrors = false)
    {
        var playernew = this.playernew
        // console.log(JSON.stringify(playernew))
        if (hideErrors)
        {
            if ((!playernew.PlayerName && !playernew.PlayerNumber && !playernew.PlayerYear)
                || ((playernew.PlayerName?.trim && playernew.PlayerName.trim() == '') 
                    && (playernew.PlayerNumber?.trim && playernew.PlayerNumber.trim() == '')
                    && (playernew.PlayerYear?.trim && playernew.PlayerYear.trim() == ''))
                ) 
            {
                return true //EXIT!!!
            }
        }

        //validation

        var notvalid = false
        if (!this.playernew['notvalid']) { this.set('playernew.notvalid', {}) }

        // if (!playernew.PlayerNumber || (playernew.PlayerNumber?.trim && playernew.PlayerNumber.trim() == ''))
        // {
        //     this.set('playernew.notvalid.PlayerNumber', this.localize('roster-item-playernumber-required'))
        //     notvalid = true
        // }
        // if (!playernew.PlayerName || (playernew.PlayerName?.trim && playernew.PlayerName.trim() == '')) 
        // {
        //     this.set('playernew.notvalid.PlayerName', this.localize('roster-item-playername-required'))
        //     notvalid = true
        // }
        
        // if (!playernew.PlayerYear || (playernew.PlayerYear?.trim && playernew.PlayerYear.trim() == ''))
        // {
        //     this.set('playernew.notvalid.PlayerYear', this.localize('roster-item-playeryear-required'))
        //     notvalid = true
        // }
        if (notvalid) { return false } //EXIT!!!


        //valid -> add item

        playernew.PlayerName = playernew.PlayerName?.trim ? playernew.PlayerName.trim() : playernew.PlayerName
        playernew.PlayerNumber = playernew.PlayerNumber?.trim ? playernew.PlayerNumber.trim() : playernew.PlayerNumber
        playernew.PlayerYear = playernew.PlayerYear?.trim ? playernew.PlayerYear.trim() : playernew.PlayerYear
        // playernew.PlayerCaptain = 
        // playernew.Sizes = 

        if (!this.roster.Items) { this.set('roster.Items', []) }
        delete playernew['notvalid']
        this.push('roster.Items', playernew)
        this.set('playernew', this._getPlayerNew())

        if (this.rosterListVirtual) { this.rosterListVirtual.fire('iron-resize') }

        if (!hideErrors)
        {
            this.newPlayerName.focus()
        }
        return true
    }

    _backDoneHandle()
    {
        if (this.queryParams && this.queryParams.backurl)
        {
            this.visible = false //prevent loadint wrong rid ;(
            this._goto(this.queryParams.backurl)
        }
        else
        {
            this.visible = false //prevent loadint wrong rid ;(
            this._gotoAccountRosters()
        }
    }

    _saveDoneHandle()
    {
        if (this.queryParams && this.queryParams.backurl)
        {
            this.visible = false //prevent loadint wrong rid ;(
            var backurl = new URL(this.queryParams.backurl)
            var queryParams = {}
            var q = backurl.search.substring(1)
            var qp = q.split('&')
            qp.map((v, i, a) =>
            {
                var o = v.split('=')
                queryParams[o[0]] = decodeURI(o[1])
                return o
            })
            queryParams['rid'] = this.roster.RosterID
            var backurlStr = StringUtil.urlquery(`${backurl.pathname}`, queryParams)
            this._goto(backurlStr)
        }
    }

    _saveValidHandle(doneHandle)
    {
        if (!Array.isArray(this.roster?.Items)) { return }

        var notvalid: any = null
        for (var i in this.roster.Items)
        {
            var playeri = this.roster.Items[i]

            if (typeof(playeri.PlayerNumber) == 'string' && (playeri.PlayerNumber?.trim && playeri.PlayerNumber.trim() != playeri.PlayerNumber))
            {
                if (!playeri.notvalid) { this.set(`roster.Items.${i}.notvalid`, {}) }
                notvalid = notvalid == null ? i : notvalid
                this.set(`roster.Items.${i}.notvalid.PlayerNumber`, this.localize('roster-item-playernumber-haswhitespace'))
            }

            if (typeof(playeri.PlayerName) == 'string' && (playeri.PlayerName?.trim && playeri.PlayerName.trim() != playeri.PlayerName))
            {
                if (!playeri.notvalid) { this.set(`roster.Items.${i}.notvalid`, {}) }
                notvalid = notvalid == null ? i : notvalid
                this.set(`roster.Items.${i}.notvalid.PlayerName`, this.localize('roster-item-playername-haswhitespace'))
            }

            if (typeof(playeri.PlayerYear) == 'string' && (playeri.PlayerYear?.trim && playeri.PlayerYear.trim() != playeri.PlayerYear))
            {
                if (!playeri.notvalid) { this.set(`roster.Items.${i}.notvalid`, {}) }
                notvalid = notvalid == null ? i : notvalid
                this.set(`roster.Items.${i}.notvalid.PlayerYear`, this.localize('roster-item-playeryear-haswhitespace'))
            }
        }

        if (this._asBool(notvalid))
        {
            var hi = (this.rosterListVirtual.scrollHeight / this.roster.Items.length) * parseInt(notvalid)
            if (Number.isFinite(hi))
            {
                var r = this.rosterListVirtual.getBoundingClientRect()
                var scrollTo = hi - 140 + (r.top + document.documentElement.scrollTop)
                this.scrollIt(Math.max(scrollTo, 0), 650, 'easeInOutCubic',
                    (callback) => { },
                    (animation) =>
                    {
                        if (!animation)
                        {
                            // pi.focus()
                        }
                    }
                )
            }
        }
        else
        {
            this.rosterData.save(doneHandle)
        }
    }

    _saveTap(e?)
    {
        var emptyOrAdded = this._addNewTap(null, null, true) //add if any data
        var doneHandle = this._saveDoneHandle.bind(this)

        if (!this._disabledImportUploaderBtn) //has import
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('roster-hasimport-message'),
                    buttons: [
                        {
                            title: this.localize('roster-hasimport-btn-stop'),
                            ontap: (e) => 
                            {
                                //
                            }
                        },
                        {
                            title: this.localize('roster-hasimport-btn-discard-n-save'),
                            ontap: (e) => 
                            {
                                this.csvImport.reset()
                                this._saveValidHandle(doneHandle)
                            }
                        },
                        {
                            title: this.localize('roster-hasimport-btn-import-n-save'),
                            ontap: (e) => 
                            {
                                this._importTap(null, null, false)
                                this._saveValidHandle(doneHandle)
                            }
                        },
                    ],
                }
            }))
        }
        else if (!emptyOrAdded) //has new wrong item data
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('roster-hasnew-message'),
                    buttons: [
                        {
                            title: this.localize('roster-hasnew-btn-stop'),
                            ontap: (e) => 
                            {
                                //
                            }
                        },
                        {
                            title: this.localize('roster-hasnew-btn-discard-n-save'),
                            ontap: (e) => 
                            {
                                this.csvImport.reset()
                                this._saveValidHandle(doneHandle)
                            }
                        },
                    ],
                }
            }))
        }
        else 
        {
            this._saveValidHandle(doneHandle)
        }
    }

    async _exportRosterTap(e)
    {
        if (!Array.isArray(this.roster.Items) && this.roster.Items.length > 0) { return }

        const exportFilename = this.roster.RosterTitle || this.roster.RosterID //|| this._formatDate(this.roster.Created, this.language)
        const rosterItems = this.roster.Items.map(i => {
            let r = {
                'Player Name': i.PlayerName,
                'Player Number': i.PlayerNumber,
                'Player Year': i.PlayerYear,
                'Player Captain': i.PlayerCaptain?.Name,
            }
            if (i.Sizes?.length > 0)
            {
                for (let s in i.Sizes)
                {
                    r[`${i.Sizes[s].SizeCategoryName} Size`] = i.Sizes[s]?.Value?.title
                }
            }
            return r
        })
        const rosterHeaders = Object.keys(rosterItems[0])

        //todo: add dialog if there are multi-formats support
        const dataToConvert = {
			data: rosterItems,
			headers: rosterHeaders,
			filename: exportFilename,
        }
        await this.csvImport.csvDownload(dataToConvert, this.language)
    }

    _clearRosterTap(e)
    {
        this.dispatchEvent(new CustomEvent('api-show-dialog', {
            bubbles: true, composed: true, detail: {
                message: this.localize('roster-clear-confirm'),
                buttons: [
                    {
                        title: this.localize('roster-clear-confirm-btn-close'),
                        ontap: (e) => 
                        {
                        }
                    },
                    {
                        title: this.localize('roster-clear-confirm-btn-clear'),
                        ontap: (e) => 
                        {
                            this.set('roster.Items', [])
                        }
                    },
                ],
            }
        }))
    }

    _importTap(e, obj, loading = true)
    {
        var mapping = this.importedMapping.reduce((map, obj) =>
        {
            map[obj.To] = obj.From
            return map
        }, {})

        if (!this.loading && loading) 
        {
            this.loading = true 
            var d = Math.max(250, Math.min(3000, this.importedItems.length * 15))
            this.async(() => { this.loading = false }, d)
        }

        var rItems:any[] = []
        for (var i in this.importedItems)
        {
            var ii = this.importedItems[i]
            var playernew = this._getPlayerNew({
                PlayerName: StringUtil.trimSafe(ii[mapping['Player Name']]),
                PlayerNumber: StringUtil.trimSafe(ii[mapping['Player Number']]),
                PlayerYear: StringUtil.trimSafe(ii[mapping['Player Year']]),
                PlayerCaptain: this._getCaptainNew(ii[mapping['Player Captain']]),
                Sizes: this._getSizesModelNew(ii, mapping),
            })
            rItems.push(playernew)
        }
        this.set('roster.Items', [])
        this.set('roster.Items', rItems)
        this.csvImport.reset()
    }

    _backTap(e)
    {
        var hndl = this._backDoneHandle.bind(this)

        if (this.rosterData.hasChanges())
        {
            this.dispatchEvent(new CustomEvent('api-show-dialog', {
                bubbles: true, composed: true, detail: {
                    message: this.localize('roster-haschanges-confirm'),
                    buttons: [
                        {
                            title: this.localize('roster-haschanges-confirm-btn-discard'),
                            ontap: (e) => 
                            {
                                hndl()
                            }
                        },
                        {
                            title: this.localize('roster-haschanges-confirm-btn-save'),
                            ontap: (e) => 
                            {
                                this._saveValidHandle(hndl)
                            }
                        },
                    ],
                }
            }))
        }
        else
        {
            hndl()
        }
    }

    _tryReconnect()
    {
        this.rosterData.reload()
    }

    _offlineChanged(offline, offlineOld)
    {
        if (offlineOld === true && offline === false && this.isAttached)
        {
            this._tryReconnect()
        }
    }

    _loadingChanged(v)
    {
        // 
    }

    _failureChanged(v)
    {
        // 
    }

    _visibleChanged(visible)
    {
        if (!visible) { return }
        this.dispatchEvent(new CustomEvent('change-section', { bubbles: true, composed: true, detail: { 
            category: 'href:' + this.getAttribute('name'), 
            title: this.localize('roster-title-document'), 
        }}))
    }

    _computeIsNotConn(roster, failure, offline, loading)
    {
        // console.log(roster, loading)
        return (roster != undefined || loading !== true || failure === true)
    }

    _computeIsNoRoster(model, items, failure, offline) //
    {
        // console.log(items)
        return !model || !Array.isArray(items) || failure === true
    }

    _computeIsNotImport(model, items, failure, offline, loading, importUploaderHide)
    {
        // console.log(importUploaderHide, model, items, failure, offline, loading)
        return !Array.isArray(items) || failure === true
    }

    _computeActionNotAllowed(offline, failure, loading, saving)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false
    }

    _computeDisabledImportUploaderBtn(offline, failure, loading, saving, importedItems)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false || !importedItems || importedItems.length < 1
    }

    _compute_disabledExportBtn(offline, failure, loading, saving, rosterItems)
    {
        return offline !== false || failure !== false || loading !== false || saving !== false || !rosterItems || rosterItems.length < 1
    }

    _computedSubmenu(userInfo, userInfoP)
    {
        return TeamaticalApp.menuAccount(this, userInfo, userInfoP)
    }

    onInputChanged(e)
    {
        var playerinx = e?.model?.__data?.index
        var sizei = e?.model?.__data?.sizei
        if (this._asBool(sizei))
        {
            var sizeinx = e?.model?.__data?.index
            playerinx = e?.model?.__dataHost?.__dataHost?.index
            return this._onInputChanged(e, `roster.Items.${playerinx}.Sizes.${sizeinx}`)
        }
        else if (this._asBool(playerinx))
        {
            return this._onInputChanged(e, `roster.Items.${playerinx}`)
        }
        else
        {
            return this._onInputChanged(e, 'roster')
        }
    }

    onInputChangedNew(e)
    {
        return this._onInputChanged(e, 'playernew')
    }

    onInputFocus(e)
    {
        e.target.parentElement.parentElement.classList.add('roster-focus')
        e.target.parentElement.classList.add('roster-container-focused')
    }

    onInputBlur(e)
    {
        e.target.parentElement.parentElement.classList.remove('roster-focus')
        e.target.parentElement.classList.remove('roster-container-focused')
    }

    _onKeydown(e)
    {
        if (!this.visible) { return }
        e = e || window.event


        if (!e.shiftKey && !e.altKey && e.ctrlKey && (keyboardEventMatchesKeys(e, 's') || e.code == "KeyS") && !this.loading)
        {
            this._saveTap()
            e.preventDefault()
            e.stopPropagation()
        }
    }
}
