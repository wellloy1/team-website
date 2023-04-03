import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-list/iron-list.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js'
import '@polymer/paper-icon-button/paper-icon-button'
import '@polymer/paper-checkbox/paper-checkbox'
import { html } from '@polymer/polymer/polymer-element'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js'
import * as Papa from 'papaparse'
import csvDownload from 'json-to-csv-export'
import { CustomElement, b64toBlob, sleep, detectCVSDelimeter, deepClone } from '../utils/CommonUtils'
import { UIBase } from './ui-base'
import '../bll/net-base'
import '../ui/ui-select'
import '../shared-styles/tooltip-styles'
import view from './ui-csv-import.ts.html'
import style from './ui-csv-import.ts.css'

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
// const DOMURL = window.URL || window.webkitURL || window;
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UICSVImportBase = mixinBehaviors([IronResizableBehavior, GestureEventListeners], UIBase) as new () => UIBase & IronResizableBehavior & GestureEventListeners



@CustomElement
export class UICSVImport extends UICSVImportBase
{
    static get is() { return 'teamatical-ui-csv-import' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles iron-flex iron-flex-alignment ">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            visible: { type: Boolean },
            parsing: { type: Boolean, notify: true, reflectToAttribute: true },
            items: { type: Array, notify: true, value: () => { return [] } },
            mapping: { type: Array, notify: true, value: () => { return [] } },
            focused: { type: Boolean, notify: true, reflectToAttribute: true },
            required: { type: Boolean, reflectToAttribute: true },
            multiple: { type: Boolean, value: false, readOnly: true, reflectToAttribute: true },
            name: { type: String, reflectToAttribute: true },
            capture: { type: String, reflectToAttribute: true }, //capture=environment
            accept: { type: String, reflectToAttribute: true, value: "*" },
            files: { type: Array, notify: true, readOnly: true }, //An array of [Files](https://developer.mozilla.org/en-US/docs/Web/API/File) currently selected.
            lastFile: { type: Object, notify: true, readOnly: true, computed: '_getLastFile(files)' }, //The most recent [File](https://developer.mozilla.org/en-US/docs/Web/API/File) selected.
            // numFilesSelected: { type: Number, notify: true, readOnly: true, computed: '_getLen(files)' },
            lastError: { type: Object, notify: true, readOnly: true, observer: '_lastErrorChanged' },
            hasFiles: { type: Boolean, notify: true, readOnly: true, reflectToAttribute: true, computed: '_hasFiles(files)' },
            imgStyle: { type: String, computed: '_imgStyleComputed(_widthImg)' },
            _widthImg: { type: Number, },

			transposing: { type: Boolean, notify: true, reflectToAttribute: true },
            mappingKeys: { type: Array, value: ['NA', 'Player Name', 'Player Number', 'Player Year', 'Player Captain', 'Player Size']},
        }
    }

    static get observers()
    {
        return [
            '_visibleChanged(visible)',
            // '_log(mapping.*)',
        ]
    }
    _log(v) { console.log(v) }

    _setLastError:any
    _setFiles: any
    _widthImg: any
    _filepickTime: any
    mappingKeys: any
    mapping: any
    multiple: any
    items: any
    files: any
    accept: any
    websiteUrl: any
    netbase: any
    visible: boolean
    focused: boolean
    parsing: boolean


    get fileInput() { return this.$['file-input'] as HTMLInputElement}
    get pasteInput() { return this.$['paste-input'] as HTMLInputElement }


    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.addEventListener('dragover', e => this._onDragEvent(e))
        this.addEventListener('dragleave', e => this._onDragEvent(e))
        this.addEventListener('drop', e => this._onFileDrop(e))
        this.addEventListener('iron-resize', (e) => this._onResized(e))
        Gestures.addListener(this, 'tap', (e) => this._onTap(e))

        this.fileInput.addEventListener('change', (e) => this._onFilePick(e))
        
        document.addEventListener('keydown', (e) => this._onKeydown(e))
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()
    }

    ready()
    {
        super.ready()
    }

    reset()
    {
        this._setFiles([])
        this.items = []
        this.mapping = []
        this.fileInput.value = ""
        this._setLastError(null)
    }

    onFocus(e)
    {
        this.set('focused', true)
    }

    onBlur(e)
    {
        // console.log(this, e)
        this.set('focused', false)
    }

    _onTap(e)
    {
        if (e.target !== this || !this.visible) { return }
        // console.log('_onTap', e)
        var epath = e.path || e.composedPath()
        var el = epath ? epath.filter(i => { return (i.classList && i.classList.contains('file-picker') || i.id == 'file-input') }) : null
        if (el?.length == 0)
        {
            this.async(() => { this.pasteInput.focus() }, 100)
        }
        // e.preventDefault()
        e.stopPropagation()
    }

    _onFilePickerTap(e)
    {
        if (!this.visible) { return }
        this.fileInput.showPicker()
        // this.async(() => { this.pasteInput.focus() })
        // console.log('_onFilePickerTap', e)
        // e.preventDefault()
        e.stopPropagation()
    }

    _onKeydown(e)
    {
        e = e || window.event;
        if (!this.visible || !this.focused) { return }

        if (!e.ctrlKey && !e.altKey && !e.shiftKey && (keyboardEventMatchesKeys(e, 'space') || keyboardEventMatchesKeys(e, 'enter')))        
        {
            this.fileInput.showPicker()
            this.pasteInput.focus()
            e.preventDefault()
            e.stopPropagation()
        }
    }

    onTableTap(e)
    {
        e.stopPropagation() //prevent fileopen dialog
    }

    _preview(items)
    {
        return items ? items.slice(0, Math.min(items.length, 50)) : items
    }

    _moreItems(items)
    {
        // console.log(items)
        return items ? items.length > 50 : false
    }

    _removeFileTap(e)
    {
        var indexi = e.model.__data.index
        this.splice('files', indexi, 1)

        if (!this.files || this.files.length == 0)
        {
            this.reset()
        }
    }

    _removePlayerTap(e)
    {
        var indexi = e.model.__data.index
        this.splice('items', indexi, 1)
    }

    _imgStyleComputed(width)
    {
        var s = ''
        if (Teamatical._browser.msie && Teamatical._browser.version <= 11)
        {
            s = 'width:' + width + 'px;'
        }
        return s

    }

    _lastErrorChanged(error)
    {
        if (error)
        {
            this.classList.toggle('errored', true)
            this.dispatchEvent(error)
        }
        else
        {
            this.classList.toggle('errored', false)
        }
    }

    _getLastFile(files)
    {
        return files ? files[files.length - 1] : null
    }

    _hasFiles(files)
    {
        return files && files.length > 0
    }

    _onDragEvent(e)
    {
        e.stopPropagation()
        e.preventDefault()
        this.classList.toggle('dragover', e.type === 'dragover')
        e.dataTransfer.dropEffect = 'drop'
    }

    onPaste(e)
    {
        if (!this.visible) { return }

        this._setLastError(null)
        var pastedText = ''
        if (window.clipboardData && window.clipboardData.getData)
        {
            pastedText = window.clipboardData.getData('Text')
        } 
        else if (e.clipboardData && e.clipboardData.getData)
        {
            pastedText = e.clipboardData.getData('text/plain')
        }

        // console.log(e, pastedText)
        if (pastedText)
        {
            var files = [
                {
                    type: 'text/plain',
                    name: this.localize('csvimport-filename-fromclipboard'),
                }
            ]
            this._setFiles(files)
            this.dispatchEvent(new CustomEvent('selected', { detail: files }))
            this._applyData(pastedText)
        }
    }

    _onFileDrop(e)
    {
        e.stopPropagation()
        e.preventDefault()
        this.classList.toggle('dragover', false)
        var files = e.dataTransfer.files
        this._setLastError(null)
        
        if (!this.multiple && files.length > 1)
        {
            let message = this.localize('csvimport-multifiles-error', 'files_count', files.length)
            this._setLastError(new ErrorEvent('error', { message }))
            return
        }
        var ok = this._validate(files)
        if (ok)
        {
            this._setFiles(this._toArray(files))
            this.dispatchEvent(new CustomEvent('selected', { detail: files }))
            
            if (files && files.length)
            {
                var freader = new FileReader()
                freader.onload = (event) => { this._applyData(event?.target?.result) }
                freader.readAsText(files[0])
            }
        }
    }

    _onFilePick(e)
    {
        e.stopPropagation()
        e.preventDefault()
        this.pasteInput.focus() //restore focus

        var files = e.target.files
        if (Teamatical._browser.msie && Teamatical._browser.version <= 11)
        {
            if (!this._widthImg)
            {
                this._onResized()
            }
            var t = this._now() - this._filepickTime
            if (this._filepickTime && t < 2500 && files.length == 0)
            {
                return
            }
            this._filepickTime = this._now()
        }
        this._setLastError(null)

        if (!this.multiple && files.length > 1)
        {
            let message = this.localize('csvimport-multifiles-error', 'files_count', files.length)
            this._setLastError(new ErrorEvent('error', { message }))
            return
        }
        var ok = this._validate(files)
        if (ok)
        {
            this._setFiles(this._toArray(files))
            this.dispatchEvent(new CustomEvent('selected', { detail: files }))
            
            if (files && files.length)
            {
                var freader = new FileReader()
                freader.onload = (event) => { this._applyData(event?.target?.result) }
                freader.readAsText(files[0])
            }
        }
    }

    _headerKeys(arr)
    {
        if (!Array.isArray(arr) || arr.length == 0) { return [] }

        return Object.keys(arr[0])
    }

    _objectKeys(obj)
    {
        if (!obj) { return [] }

        return Object.keys(obj)
    }

    _valueArr(arr, key, def = 0)
    {
        // console.log(arr, key, def)
        var v = arr[key]
        if (v == undefined) { v = arr[def]}
        return v
    }

	beforeTransposeMapping: any
	beforeTransposeItems: any
    transposingChangeHandler(e)
    {
        var transpose = e.model.__data.transposing
		if (transpose)
		{
			this.beforeTransposeMapping = deepClone(this.mapping)
			this.beforeTransposeItems = deepClone(this.items)

			//transpose
			var data = this.items
			const dataOut: any = []
			const keys = data.map(i => { return i[""] })
			const fvalues = Object.keys(data[0]).splice(1)
			var ii = 0
			for (var ki of fvalues)
			{
				dataOut[ii] = { "" : ki }
				var kk = 0
				for (var kv of keys)
				{
					dataOut[ii][kv] = data[kk][ki]
					kk++
				}
				ii++
			}
			data = dataOut
	
			if (data.length > 0)
			{
				this.set('mapping', this._mapping(data[0]))
				this.set('items', Object.assign([], data))  //FIRE!!!
			}
		}
		else
		{
			this.set('mapping', this.beforeTransposeMapping)
			this.set('items', this.beforeTransposeItems)  //FIRE!!!
		}
    }
    
    _cleanTrimEmptyData(data)
    {
        if (!Array.isArray(data)) { return data }

        data = data.filter((datai, datainx) => 
        { 
            if (!datai) { return false }
            for (var ki of Object.keys(datai))
            {
                if (this._asBool(datai[ki])) { return true }
            }
            return false
        })
        return data
    }

    _applyData(data)
    {
        if (/\ufffd/.test(data) === true)
        {
            let message = this.localize('csvimport-binary-error')
            this._setLastError(new ErrorEvent('error', { message }))
            this.items = null
            return
        } 

        var opt: any = {
            // output: "json",
            // // noheader: true,
            // delimiter: 'auto',
            // ignoreEmpty: true,

            delimiter: "",	// auto-detect
            newline: "",	// auto-detect
            quoteChar: '"',
            escapeChar: '"',
            header: true,
            transformHeader: undefined,
            dynamicTyping: false,
            preview: 0,
            encoding: "",
            worker: true, //def=false
            comments: false,
            step: undefined,
            complete: undefined,
            error: undefined,
            download: false,
            downloadRequestHeaders: undefined,
            downloadRequestBody: undefined,
            skipEmptyLines: true, //def=false
            chunk: undefined,
            chunkSize: undefined,
            fastMode: undefined,
            beforeFirstChunk: undefined,
            withCredentials: undefined,
            transform: undefined,
            delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
        }

        this.parsing = true
        opt.complete = (csvRow) => 
        {
            // this.parsing = false
            // if (this._dev) { console.log(csvRow) }

            var data = this._cleanTrimEmptyData(csvRow?.data)
            if (data?.length > 0)
            {
                this.set('mapping', this._mapping(data[0]))
                this.set('items', data)  //FIRE!!!
                this.set('transposing', false)
            }
            else
            {
                this.items = []
                let message = this.localize('csvimport-empty-error')
                this._setLastError(new ErrorEvent('error', { message }))
            }
        }
        
        this.async(async ()=> 
        {
            await this._loadLunr()
            Papa.parse(data, opt)
        })
    }

    _searchMenuIndex: any
    async _loadLunr()
    {
        if (!this._searchMenuIndex)
        {
            const module = await import('../utils/elasticlunr.js')
            const elasticlunr = module.default
            elasticlunr.clearStopWords()
            var qsindex: any = elasticlunr(function ()
            {
                this.setRef('inx')
                this.addField('title')
            })
            for (var i in this.mappingKeys)
            {
                if (i == '0') { continue }
    
                qsindex.addDoc({
                    inx: i,
                    title: this.mappingKeys[i],
                })
            }
            this._searchMenuIndex = qsindex
        }
    }


    _mapping(data0)
    {
        var mapping: any = []
        var k = 0
        var datakeys = Object.keys(data0)
        for (var i in datakeys)
        {
            var keyi = datakeys[i]
            if (keyi == '') { keyi = "Quantity" } //suggestion

            var v //= this.mappingKeys[++k]
            var r = this._searchMenuIndex.search(keyi, {
                fields: {
                    title: { boost: 10 },
                },
                expand: true,
            })
            if (r?.length && r[0].score > 8)
            {
                var rf = r[0]
                v = this.mappingKeys[rf.ref]
                if (v == undefined) { v = this.mappingKeys['0'] }
                
                // if (r.length > 1)
                // {
                //     for (var ri of r.slice(1))
                //     {
                //         if (rf.score == ri.score 
                //             && ri.doc.title.toUpperCase() == keyi.toUpperCase())
                //         {
                //             v = this.mappingKeys[ri.ref]
                //         }
                //     }
                // }
            }
            else
            {
                v = this.mappingKeys['0']
            }
            mapping.push({ From: datakeys[i], To: v })
        }

        return mapping
    }

    _onResized(e?)
    {
        if (Teamatical._browser.msie && Teamatical._browser.version <= 11)
        {
            let thisRect = this.getBoundingClientRect()
            this._widthImg = thisRect.width
        }
    }

    _toArray(fileList)
    {
        var a: any = []
        for (let i = 0, len = fileList.length; i < len; ++i)
        {
            a.push(fileList.item(i))
        }
        return a
    }

    _validate(fileList)
    {
        if (fileList.length == 0) { return false }
        if (!this.accept || this.accept.length === 0) { return true }

        var acceptList = this.accept.split(',').map(s => s.trim().toLowerCase())
        if (acceptList.length === 0 || (acceptList.length === 1 && acceptList[0] == '*')) { return true }

        var hasAudio = acceptList.indexOf('audio/*') >= 0
        var hasVideo = acceptList.indexOf('video/*') >= 0
        var hasImage = acceptList.indexOf('image/*') >= 0

        for (let i = 0, len = fileList.length; i < len; ++i)
        {
            let ext = '.' + fileList[i].name.split('.').pop().toLowerCase()

            if (acceptList.indexOf(ext) >= 0) continue
            if (hasAudio && fileList[i].type.split('/')[0] === 'audio') continue
            if (hasVideo && fileList[i].type.split('/')[0] === 'video') continue
            if (hasImage && fileList[i].type.split('/')[0] === 'image') continue
            if (acceptList.indexOf(fileList[i].type) >= 0) continue

            // did not match anything in accept
            let message = this.localize('csvimport-accepttype-error', 'files_name', fileList[i].name)
            this._setLastError(new ErrorEvent('error', { message }))
            return false
        }

        return true
    }

    _visibleChanged(visible)
    {
        if (visible == false)
        {
            this.reset()
        }
    }

    async csvDownload(dataToConvert, language = 'en-US')
    {
        await sleep(0)
        csvDownload(Object.assign(dataToConvert, { delimiter: detectCVSDelimeter(language) }))
    }
}