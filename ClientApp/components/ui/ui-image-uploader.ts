// import '@polymer/iron-media-query/iron-media-query.js'
import '@polymer/iron-icon/iron-icon.js'
import '@polymer/iron-flex-layout/iron-flex-layout.js'
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js'
import '@polymer/paper-icon-button/paper-icon-button'
// import '@polymer/paper-input/paper-input.js'
import { html } from '@polymer/polymer/polymer-element'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { IronA11yKeysBehavior } from '@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js'
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js'
import * as EXIF from '../../../node_modules/exif-js/exif.js'
import { CustomElement, b64toBlob } from '../utils/CommonUtils'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { UIBase } from './ui-base'
import '../bll/net-base'
import view from './ui-image-uploader.ts.html'
import style from './ui-image-uploader.ts.css'
import '../shared-styles/tooltip-styles'
import '../shared-styles/common-styles'
import { NetBase } from '../bll/net-base';

const keyboardEventMatchesKeys = (IronA11yKeysBehavior as IronA11yKeysBehavior).keyboardEventMatchesKeys
const DOMURL = window.URL || window.webkitURL || window;
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UIImageUploaderBase = mixinBehaviors([IronResizableBehavior, GestureEventListeners], UIBase) as new () => UIBase & IronResizableBehavior & GestureEventListeners



@CustomElement
export class UIImageUploader extends UIImageUploaderBase
{
    private _uploadIsAllowed: any
    static get is() { return 'teamatical-ui-image-uploader' }

    static get template() { return html([`<style include="teamatical-common-styles teamatical-tooltip-styles iron-flex iron-flex-alignment">${style}</style>${view}`])}

    static get properties()
    {
        return {
            websiteUrl: { type: String },
            placeholderUrl: { type: String }, //placeholder-url
            apiPath: { type: String, reflectToAttribute: true, value: '/api/v1.0/product/upload-image' },
            visible: { type: Boolean },
            // tabindex: { type: Number, value: 0, reflectToAttribute: true, },
            
            // smallScreen: { type: Object },

            // imagesIds: { type: Array, notify: true, value: () => { return [] } },

            focused: { type: Boolean, notify: true, reflectToAttribute: true },

            //Specifies that the user must fill in a value before submitting a form.
            required: { type: Boolean, reflectToAttribute: true },

            //Indicates if it can have more than one file selected.
            multiple: { type: Boolean, reflectToAttribute: true },

            //  * Indicate the types of files that the server accepts, otherwise it will be ignored. 
            //  * The value must be a comma-separated list of unique content type specifiers:
            //  * - A file extension starting with the STOP character (U+002E). (e.g. .jpg, .png, .doc).
            //  * - A valid MIME type with no extensions.
            //  * - audio/* representing sound files.
            //  * - video/* representing video files.
            //  * - image/* representing image files.
            accept: { type: String, reflectToAttribute: true, value: "image/*" },

            //The name of the control, which is submitted with the form data.
            name: { type: String, reflectToAttribute: true },

            capture: { type: String, reflectToAttribute: true }, //capture=environment

            drophereMessage: { type: String, },
            _drophereMessageShow: { computed: '_computed_drophereMessageShow(drophereMessage)' },

            errorMessage: { type: String },
            invalid: { type: Boolean, value: false, notify: true, reflectToAttribute: true },


            //An array of [Files](https://developer.mozilla.org/en-US/docs/Web/API/File) currently selected.
            files: { type: Array, notify: true },

            //The most recent [File](https://developer.mozilla.org/en-US/docs/Web/API/File) selected.
            lastFile: { type: Object, notify: true, readOnly: true, computed: '_getLastFile(files)' },

            //Number of Files selected.
            numFilesSelected: { type: Number, notify: true, readOnly: true, computed: '_getLen(files)' },

            //Last error event.
            lastError: { type: Object, notify: true, readOnly: true, observer: '_lastErrorChanged' },

            //Indicates if any files are selected
            hasFiles: { type: Boolean, notify: true, readOnly: true, reflectToAttribute: true, computed: '_hasFiles(files)' },

            imgStyle: { type: String, computed: '_imgStyleComputed(_widthImg)' },

            _widthImg: { type: Number, },

            loading: { type: Boolean, notify: true, reflectToAttribute: true, readOnly: true, computed: '_computed_loading(files, files.*)'},
        }
    }

    static get observers()
    {
        return [
            '_filesHasChanged(files)',
            '_visibleChanged(visible)',
            // '_log(files)',
        ]
    }
    _log(v) { console.log('image-uploader', v) }

     disabled: boolean
    _setLastError:any
    _widthImg: any
    _filepickTime: any
    multiple: any
    files: any
    accept: any
    websiteUrl: string
    apiPath: string
    netbase: NetBase
    visible: any
    focused: any
    smallScreen: boolean
    // imagesIds: any[]


    get fileInput() { return this.$['file-input'] as HTMLInputElement }
    get pasteInput() { return this.$['paste-input'] as HTMLInputElement}


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

        this._generateProgressStyle()
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
        this._cancelUploading()
        this.set('files', [])
        this.fileInput.value = ""
    }

    _onTap(e)
    {
        if (e.target !== this || !this.visible || this._suppressGenTap) { return }
        // console.log(e.target)
        this.async(()=>
        {
            this.pasteInput.focus()
            this.set('focused', true)
        })
        //default should not suppressed - due to user action detection work properly
        // if (e?.preventDefault) { e.preventDefault() }
        // if (e?.stopPropagation) { e.stopPropagation() }
    }

    _suppressGenTap: boolean
    _onFilePickerTap(e)
    {
        if (!this.visible) { return }

        // console.log('this.fileInput.click()')
        this._suppressGenTap = true
        this.fileInput.showPicker()
        this.async(() => {
            this.pasteInput.focus()
            this._suppressGenTap = false
        })
        //default should not suppressed - due to user action detection work properly
        // if (e?.preventDefault) { e.preventDefault() }
        // if (e?.stopPropagation) { e.stopPropagation() }
    }

    onTableTap(e)
    {
        e.stopPropagation() //prevent fileopen dialog
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

    _show_placeholder(placeholderUrl, filesLength)
    {
        return this._asBool(placeholderUrl) && filesLength < 1
    }

    onFocus(e)
    {
        // console.log(this, e)
        this.set('focused', true)
    }

    onBlur(e)
    {
        // console.log(this, e)
        this.set('focused', false)
    }

    _onKeydown(e)
    {
        e = e || window.event;
        var epath = e.path || e.composedPath()
        var el = epath.filter(i => { return i === this.pasteInput })
        // console.log(this.visible, el.length == 0, this.getAttribute('hidden') !== null)
        if (!this.visible || this.disabled || el.length == 0 || this.getAttribute('hidden') !== null) { return }

        if (this.focused && !e.ctrlKey && !e.altKey && !e.shiftKey && (keyboardEventMatchesKeys(e, 'space') || keyboardEventMatchesKeys(e, 'enter')))
        {
            // console.log('keyboard -> try open dialog')
            this.fileInput.showPicker()
            this.pasteInput.focus()

            e.preventDefault()
            e.stopPropagation()
        }
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

    _getLen(files)
    {
        return files ? files.length : 0;
    }

    _hasFiles(files)
    {
        return files && files.length > 0
    }

    _onDragEvent(e)
    {
        e.stopPropagation()
        e.preventDefault()
        if (this.disabled) { return }
        
        this.classList.toggle('dragover', e.type === 'dragover')
        e.dataTransfer.dropEffect = 'drop'
    }

    onPaste(e)
    {
        if (!this.visible || this.disabled) { return }

        // console.log(e)

        // use event.originalEvent.clipboard for newer chrome versions
        var items = (e.clipboardData || e.originalEvent.clipboardData).items
        // console.log(JSON.stringify(items)) // will give you the mime types
        // find pasted image among pasted items
        var blob = null
        var item = null
        for (var i = 0; i < items.length; i++)
        {
            //TODO: acceptList
            if (items[i].type.indexOf("image") === 0)
            {
                // console.log(items[i])
                blob = items[i].getAsFile()
                item = {
                    kind: items[i].kind,
                    type: items[i].type,
                }
                break
            }
        }
        // load image if there is a pasted image
        if (blob !== null)
        {
            this._setLastError(null)

            var reader = new FileReader()
            reader.onload = (ef) =>
            {
                // document.getElementById("pastedImage").src = event.target.result
                var files = [
                    {
                        type: item.type,
                        name: this.localize('imageuploader-filename-fromclipboard'),
                        imgData: ef.target.result,
                    }
                ]
                this._uploadIsAllowed = true
                this.set('files', files)
                this._uploadIsAllowed = false
                this.dispatchEvent(new CustomEvent('selected', { detail: files }))
            }
            reader.readAsDataURL(blob)
        }
    }

    _onFileDrop(e)
    {
        e.stopPropagation()
        e.preventDefault()

        if (this.disabled) { return }

        this.classList.toggle('dragover', false)
        var files = e.dataTransfer.files
        this._setLastError(null)
        if (!this.multiple && files.length > 1)
        {
            let message = this.localize('imageuploader-multifiles-error', 'files_count', files.length)
            this._setLastError(new ErrorEvent('error', { message }))
            return
        }
        var ok = this._validate(files)
        if (ok)
        {
            this._uploadIsAllowed = true
            this.set('files', this._toArray(files))
            this._uploadIsAllowed = false
            this.dispatchEvent(new CustomEvent('selected', { detail: files }))
        }
    }

    _onFilePick(e)
    {
        e.stopPropagation()
        e.preventDefault()
        this.pasteInput.focus() //restore focus
        
        if (this.disabled) { return }

        var files = e.target.files
        // var files = this.fileInput.files
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
        this._cancelUploading()

        // alert('pick: ' + files.length)
        // alert(this._toArray(files).map((currentValue, index, array) => { return currentValue.name }))
        if (!this.multiple && files.length > 1)
        {
            let message = this.localize('imageuploader-multifiles-error', 'files_count', files.length)
            this._setLastError(new ErrorEvent('error', { message }))
            return
        }
        var ok = this._validate(files)
        if (ok)
        {
            this._uploadIsAllowed = true
            this.set('files', this._toArray(files))
            this._uploadIsAllowed = false
            this.dispatchEvent(new CustomEvent('selected', { detail: files }))
        }
    }

    _onResized(e?)
    {
        if (Teamatical._browser.msie && Teamatical._browser.version <= 11)
        {
            let thisRect = this.getBoundingClientRect()
            this._widthImg = thisRect.width
        }
    }

    _cancelUploading()
    {
        if (!Array.isArray(this.files)) { return }
        for (var i in this.files)
        {
            if (this.files[i].request)
            {
                this.files[i].request.abort()
            }
        }
    }

    _toArray(fileList)
    {
        var a:any = []
        for (let i = 0, len = fileList.length; i < len; ++i)
        {
            a.push(fileList.item(i))
        }
        return a
    }

    _validate(fileList)
    {
        if (!this.accept || this.accept.length === 0) { return true }

        var acceptList = this.accept.split(',').map(s => s.trim().toLowerCase())
        if (acceptList.length === 0) { return true }

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
            let message = this.localize('imageuploader-accepttype-error', 'files_name', fileList[i].name)
            this._setLastError(new ErrorEvent('error', { message }))
            return false
        }

        return true
    }

    _computed_loading(files)
    {
        if (!files) { return false }

        var l = false
        for (var i in files)
        {
            // console.log('_computed_loading', i, files[i])
            if (files[i] && files[i].done !== true)
            {
                l = true
                break
            }
        }

        
        return l
    }

    _computed_drophereMessageShow(drophereMessage)
    {
        if (!drophereMessage)
        {
            return this.localize('imageuploader-drophere')
        }
        return drophereMessage
    }

    _filesHasChanged(files)
    {
        if (!Array.isArray(files) || files.length < 1) { return }

        // this.set('files', [])
        for (var i in files)
        {
            // this.files[i] = files[i]
            // this.set('files.' + i, files[i])

            var fi = files[i]
            var imgURL = fi.imgData ? '' : (fi instanceof File ? DOMURL.createObjectURL(fi) : fi.imgUrl)
            var img = document.createElement('img')
            img.setAttribute('data-index', i)
            img.setAttribute('data-url', imgURL)
            img.addEventListener('load', (e) => this._onImgLoaded(e))
            img.addEventListener('error', (e) => this._onImgError(e))
            img.src = fi.imgData ? fi.imgData : imgURL
            this.set('files.' + i + '.imgUrl', fi.imgData ? fi.imgData : imgURL)

            if (this._uploadIsAllowed && this.websiteUrl && this.apiPath)
            {
                this.async(async() => await this._uploadFile(fi, i))
            }
            else
            {
                // let props = {}
                // props[`files.${i}.processing`] =  false
                // props[`files.${i}.progressHide`] =  true
                // props[`files.${i}.progress`] =  0
                // props[`files.${i}.done`] =  true
                // this.setProperties(props)
                this.set('files.' + i + '.processing', false)
                this.set('files.' + i + '.progressHide', true)
                this.set('files.' + i + '.progress', 0)
                this.set('files.' + i + '.done', true)
            }
        }
        // console.log(JSON.stringify(files), JSON.stringify(this.files))

        this.fileInput.value = "" //clean to allow select files again

        this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { files: files } }))
    }

    _loader_failed()
    {
        return 'data:image/svg+xml,' + encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<defs><style>.a{fill:#ccc;fill-rule:evenodd}</style></defs>
            <g class="a" id="insert-photo"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></g>
		</svg>
		`)
    }

    _visibleChanged(visible)
    {
        if (visible == false)
        {
            this.reset()
        }
    }

    _onImgLoaded(e)
    {
        var img = e.target
        var imgURL = img.getAttribute('data-url')
        var inx = img.getAttribute('data-index')

        if ((!Teamatical._browser.msie || Teamatical._browser.version > 11) &&
            (CSS.supports("image-orientation", "from-image") === true || CSS.supports("-webkit-image-orientation", "from-image") === true))
        {
            if (imgURL) { DOMURL.revokeObjectURL(imgURL) }
        }
        else
        {
            EXIF.getData(img, () =>
            {
                var allMetaData = EXIF.getAllTags(img)
                this.set('files.' + inx + '.imgOrientation', allMetaData.Orientation || 1)
                if (imgURL) { DOMURL.revokeObjectURL(imgURL) }
            })
        }
    }

    _onImgError(e)
    {
        var img = e.target
        var imgURL = img.getAttribute('data-url')
        var inx = img.getAttribute('data-index')
        // console.error(e, img, inx, imgURL)
        this.set('files.' + inx + '.imgUrl', this._loader_failed())
    }

    async _uploadFile(file, inx)
    {
        this.set('files.' + inx + '.progressHide', false)

        var formData = new FormData()
        if (file instanceof File)
        {
            formData.append("file", file)
        }
        else if (file.imgData)
        {
            // Split the base64 string in data and contentType
            var block = file.imgData.split(";")
            // Get the content type of the image
            var contentType = block[0].split(":")[1] // In this case "image/gif"
            // get the real base64 content of the file
            var realData = block[1].split(",")[1] // In this case "R0lGODlhPQBEAPeoAJosM...."

            // Convert it to a blob to upload
            var blob = b64toBlob(realData, contentType)
            formData.append("file", blob)
        }

        var rq = {
            url: this.websiteUrl + this.apiPath,
            body: formData,
            method: "POST",
            handleAs: "blob",
            contentType: null,
            debounceDuration: 300,
            onLoad: (e) => this._onUploadResponse(e, file, inx),
            onError: (e) => this._onUploadError(e, file, inx),
            onProgress: (e) => this._onUploadProgress(e, file, inx),
        }

        if (!this.netbase) { this.netbase = new NetBase() }

        this.files[inx].request = await this.netbase.__uploadFileWithProgress(rq)
    }

    // blobToBinaryStringIE11(blob)
    // {
    //     var blobURL = URL.createObjectURL(blob);
    //     var xhr = new XMLHttpRequest;
    //     xhr.open("get", blobURL);
    //     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    //     xhr.onload = function ()
    //     {
    //         var binary = xhr.response;
    //         // do stuff
    //     };
    //     xhr.send();
    // }

    _generateProgressStyle()
    {
        var pstyle = document.createElement('style');
        pstyle.type = 'text/css';
        var css = ''
        for (var i = 0; i <= 100; i++)
        {
            var rotatenum = 'rotate(' + i * 1.8 + 'deg)'
            var shadowfix = (i == 0 ? "0" : "1px")

            css += ".progress-circle[aria-valuenow='" + i + "'] .p-h:before, \
                        .progress-circle[aria-valuenow='" + i + "'] .p-f, \
                        .progress-circle[aria-valuenow='" + i + "'] .p-f:before { \
                            -moz-transform: " + rotatenum + "; \
                            -webkit-transform: " + rotatenum + "; \
                            -o-transform: " + rotatenum + "; \
                            -ms-transform: " + rotatenum + "; \
                            transform: " + rotatenum + "; \
                    }"
        }
        pstyle.innerHTML = css
        this.shadowRoot.insertBefore(pstyle, this.shadowRoot.childNodes[0])
    }

    _onUploadProgress(e, file, inx)
    {
        if (e.lengthComputable)
        {
            var p = Math.floor(e.loaded / e.total * 100) / 1
            this.set('files.' + inx + '.progress', p)

            if (p >= 100)
            {
                this.set('files.' + inx + '.progressText', this.localize('imageuploader-processing'))
                this.set('files.' + inx + '.processing', true)
            }
            else
            {
                this.set('files.' + inx + '.progressText', p + '%')
            }
        }
    }

    _onUploadResponse(e, file, inx)
    {
        var r = JSON.parse(e.target['response'])
        if (r && r['success'])
        {
            var obj = r['result']
            // console.log(obj)
            // this.set('imagesIds', [obj.name])
            if (obj)
            {
                this.set('files.' + inx, Object.assign({}, this.files[inx], obj))
            }

            this.set('files.' + inx + '.progressText', this.localize('imageuploader-done'))
            this.set('files.' + inx + '.processing', false)
            this.async(() =>
            {
                this.set('files.' + inx + '.progressHide', true)
                this.set('files.' + inx + '.progress', 0)
                this.set('files.' + inx + '.done', true)
            }, 2500)
        }
        else
        {
            this._onUploadError(e, file, inx)
        }
    }

    _onUploadError(e, file, inx)
    {
        this.set('files.' + inx + '.done', true)
        this.set('files.' + inx + '.progressText', this.localize('imageuploader-error'))
        console.error(e)
    }
}