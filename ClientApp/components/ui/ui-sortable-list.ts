import { html } from '@polymer/polymer/polymer-element'
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js'
import { timeOut, microTask, idlePeriod } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js'
import { EventPassiveDefault } from '../utils/EventPassiveDefault'
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js'
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js'
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js'
// import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js'
import { CustomElement, Vibrator } from '../utils/CommonUtils'
import { UIBase } from './ui-base'
import view from './ui-sortable-list.ts.html'
import style from './ui-sortable-list.ts.css'
const Teamatical: TeamaticalGlobals = window['Teamatical']
const UISortableListBase = mixinBehaviors([GestureEventListeners], UIBase) as new () => UIBase & GestureEventListeners & HTMLElement


@CustomElement
export class UISortableList extends UISortableListBase
{
    static get is() { return 'teamatical-ui-sortable-list' }

    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            sortable: { type: String },
            grabable: { type: String },
            // scrollTarget: { type: Object },
            editing: { type: Boolean, value: false, notify: true, reflectToAttribute: true },
            dragging: { type: Boolean, notify: true, readOnly: true, reflectToAttribute: true, value: false },
            items: { type: Array, value: () => { return [] }, notify: true, readOnly: true },

            _trans_start: { type: Array, value: () => { return [] }, },
        }
    }

    static get observers()
    {
        return [
            '_editingChanged(editing)',
        ]
    }


    //#region vars

    _observer: any
    _target: any
    _targetIsSep: boolean
    _targetRect: any
    _rects: any
    _onTrackHandler: any
    _onTransitionEndHandler: any
    _onContextMenuHandler: any
    _onTouchMoveHandler: any
    _eventNull_FHandler: any
    _scrollDebouncer: any
    _touchStartDebouncer: any
    _trans_start: any
    _setDragging: any
    _setItems: any
    sortable: any
    grabable: any
    items: any
    editing: any
    dragging: any
    root: any
    _onResizeDebouncer: Debouncer
    eventNullStopHandler: any
    scrollTarget: any
    _touchStart: any
    _trackMoveLastNow: number = 0

    //#endregion


    get content() { return this.$.content as HTMLSlotElement }


    constructor()
    {
        super()

        this._observer = null
        this._target = null
        this._targetRect = null
        this._rects = null
    }

    connectedCallback()
    {
        super.connectedCallback()

        this.eventNullStopHandler = (e) =>
        {
            if (this.dragging)
            {
                e.preventDefault()
                e.stopPropagation()
                return false
            }
        }

        this._onTrackHandler = this._onTrack.bind(this)
        this._onTransitionEndHandler = this._onTransitionEnd.bind(this)
        this._onContextMenuHandler = this._onContextMenu.bind(this)
        this._onTouchMoveHandler = this._onTouchMove.bind(this)
        this._eventNull_FHandler = this._eventNull_F.bind(this)

        // this.addEventListener('iron-resize', (e) => this._onResized(e))
        window.addEventListener('scroll', (e) => this._onScroll(e), EventPassiveDefault.optionPrepare())

        // this.setScrollDirection("y", this)
        // if (!this.isTouchActionSupported())
        // {
        //     this.addEventListener("touchstart", (e) => this.onTouchStart(e))
        //     this.addEventListener("touchmove", (e) => this.onTouchMove(e))
        //     this._touchStart = { x: 0, y: 0 }
        // }
    }

    disconnectedCallback()
    {
        super.disconnectedCallback()

        this._unobserveItems()
        this._toggleListeners({ enable: false })
    }

    ready()
    {
        super.ready()

        idlePeriod.run(_ =>
        {
            this._observeItems()
            this._updateItems()
            this._toggleListeners({ enable: this.editing })
        })
    }

    onTouchStart(e)
    {
        try
        {
            this._touchStart.x = e.pageX;
            this._touchStart.y = e.pageY;
        } 
        catch (ex) { }
    }

    onTouchMove(e)
    {
        try
        {
            let dx = Math.abs(e.pageX - this._touchStart.x);
            let dy = Math.abs(e.pageY - this._touchStart.y);
            if (dy < dx)
            {
                e.preventDefault()
            }
        } catch (ex) { }
    }

    // _onResized(e?)
    // {
    //     const t = e ? 17 : 90
    //     this._onResizeDebouncer = Debouncer.debounce(this._onResizeDebouncer, timeOut.after(t), () => { this._updateItems() })
    // }

    _editingChanged(editing)
    {
        this._toggleListeners({ enable: editing })
    }

    _eventNull_F(event) 
	{
		var e = event || window.event
		e.preventDefault && e.preventDefault()
		e.stopPropagation && e.stopPropagation()
		e.cancelBubble = true
		e.returnValue = false
		return false
    }
    
    _toggleListeners({ enable })
    {
        let m = enable ? this['addEventListener'].bind(this) : this['removeEventListener'].bind(this)
        
        // m('dragstart', this.eventNull)
        // m('selectstart', this.eventNull)
        m('dragstart', this._eventNull_FHandler)
        m('selectstart', this._eventNull_FHandler)
        // m('touchstart', this._eventNull_FHandler)
        // m('touchend', this._eventNull_FHandler)
        // m('touchcancel', this._eventNull_FHandler)


        m('touchmove', this._onTouchMoveHandler)
        m('mousemove', this._onTouchMoveHandler)
        m('pointermove', this._onTouchMoveHandler)
        m('contextmenu', this._onContextMenuHandler)
        m('transitionend', this._onTransitionEndHandler)


        let w = enable ? window['addEventListener'].bind(this) : window['removeEventListener'].bind(this)
        // document[xm]('contetmenu', this._onContextMenuHandler)
        w('contextmenu', this._eventNull_FHandler)
            
        let d = enable ? document.body['addEventListener'].bind(this) : document.body['removeEventListener'].bind(this)
        d('wheel', this.eventNullStopHandler, { passive: false })
        d('DOMMouseScroll', this.eventNullStopHandler, { passive: false })
        
        if (enable)
        {
            // this.style.width = "100%"
            Gestures.addListener(this, 'track', this._onTrackHandler)
        }
        else
        {
            Gestures.removeListener(this, 'track', this._onTrackHandler)
        }

        Gestures.setTouchAction(this, 'pan-y')
    }

    _onScroll(e)
    {
        this._scrollDebouncer = this._now()
    }

    _onTrack(event)
    {
        switch (event.detail.state)
        {
            case 'start':
                this._trackStart(event)
                break
            case 'track':
                this._trackMove(event)
                break
            case 'end':
                this._trackEnd(event)
                break
        }
    }

    _moveItem(from, toelement, scrollto = false)
    {
        // scrollto = false //TODO: scrollto OFF for a while
        if (!from || !toelement) { return }

        var eventNullStop = (e) => { return this.eventNullStop(e) }
        var target: any = window
        var pointerEvents = target == window ? document.body.style.pointerEvents : target.style.pointerEvents
        target == window ? document.body.style.pointerEvents = 'none' : target.style.pointerEvents = 'none'
        target.addEventListener('wheel', eventNullStop, { passive: false })
        target.addEventListener('DOMMouseScroll', eventNullStop, { passive: false })

        var startHandle = () => 
        {
            // var el = null, elinx = -1
            // var uiItems = [...this.children].filter((i, inx, arr) => 
            // {
            //     if ((i as HTMLElement).dataset.id == id)
            //     {
            //         el = i
            //         elinx = inx
            //     }
            //     return i.classList && i.classList.contains(this.grabable)
            // })

            var firstelR = toelement.getBoundingClientRect()
            var elR = from.getBoundingClientRect()
            var epath = [...from.root.querySelectorAll('[drag-handler]')]
            epath.push(from)
            this._trackStart({ path: epath })
            return { firstelR: firstelR, elR: elR }
        }

        var moveHandle = ({ firstelR, elR }) =>
        {
            var dx = firstelR.x - elR.x
            var dy = firstelR.y - elR.y

            requestAnimationFrame(_ =>
            {
                this._trackMove({
                    detail: {
                        dx: dx,
                        dy: dy,
                        x: firstelR.x,
                        y: firstelR.y,
                    }
                })

                requestAnimationFrame(_ =>
                {
                    this._trackEnd()

                    this.async(()=>{
                        target == window ? document.body.style.pointerEvents = pointerEvents : target.style.pointerEvents = pointerEvents //restore
                        target.removeEventListener('wheel', eventNullStop, { passive: false })
                        target.removeEventListener('DOMMouseScroll', eventNullStop, { passive: false })
                    }, 350)
                    
                })
            })
        }

        var launchHndl = () =>
        {
            requestAnimationFrame(_ =>
            {
                this._scrollDebouncer = this._now() - 850 // avoid scroll debouncing 
                var hndl = startHandle()
                moveHandle(hndl)
            })
        }



        if (scrollto)
        {
            var r = toelement.getBoundingClientRect()
            if (r && (r.top || r.top === 0))
            {
                this.scrollIt(Math.max(r.top - 150, 0), 650, 'easeInOutCubic',
                    (callback) => 
                    { 
                    },
                    (animation) => { 
                        if (!animation)
                        {
                            launchHndl()
                        }
                    }
                )
            }
        }
        else
        {
            launchHndl()
        }
    }

    moveItemAfter(id, after_id, scrollto = false)
    {
        var el = null, elinx = -1
        var after_el = null, after_elinx = -1
        var uiItems = [...this.children].filter((i, inx, arr) =>  
        {
            var r = i.classList && i.classList.contains(this.grabable)
            if (r && (i as HTMLElement).dataset.id == id)
            {
                el = i
                elinx = inx
            }
            if (r && (i as HTMLElement).dataset.id == after_id)
            {
                after_el = i
                after_elinx = inx
            }
            return r
        })

        if (elinx > -1 && elinx != after_elinx && (after_elinx + 1) < uiItems.length) 
        {
            this._moveItem(el, uiItems[after_elinx + 1], scrollto)
        }
    }

    move2FirstItem(id, scrollto = false)
    {
        var el = null, elinx = -1
        var uiItems = [...this.children].filter((i, inx, arr) =>  
        {
            if ((i as HTMLElement).dataset.id == id)
            {
                el = i
                elinx = inx
            }
            return i.classList && i.classList.contains(this.grabable)
        })

        if (elinx != 0) 
        {
            this._moveItem(el, uiItems[0], scrollto)
        }
    }

    move2LastItem(id, scrollto = false)
    {
        var el = null, elinx = -1
        var uiItems = [...this.children].filter((i, inx, arr) =>  
        { 
            if ((i as HTMLElement).dataset.id == id)
            {
                el = i
                elinx = inx
            }
            return i.classList && i.classList.contains(this.grabable) 
        })

        if (elinx != (uiItems.length - 1)) 
        {
            this._moveItem(el, uiItems[uiItems.length - 1], scrollto)
        }
    }

    _trackStart(event?)
    {
        if ((this._now() - this._scrollDebouncer) < 350) { return }
        if (!this.items) 
        { 
            console.warn('no items')
            return 
        }

        var path = event.path || event.composedPath()
        // this._target = path[0].hasAttribute('drag-handler') ? path[0] : null

        var target = null
        var drag = false
        for (var i = 0; i < path.length; i++)
        {
            if (path[i].hasAttribute && path[i].hasAttribute('drag-handler'))
            {
                drag = true
            }
            if (this.items.indexOf(path[i]) > -1)
            {
                target = path[i]
                break
            }
        }
        // if (this._target)
        // {
        //     this._trackEnd(event)
        // }

        this._target = drag ? target : null
        this._targetIsSep =  this._target ? this._target.getAttribute('is-separator') !== null : false
        if (!this._target) { return }


        if (event?.stopPropagation) { event.stopPropagation() }
        this._rects = this.items.map((item, index) => 
        { 
            let recti = item.getBoundingClientRect()
            const style = getComputedStyle(item)
            let marginHeight = parseInt(style.marginTop.replace('px', '')) + parseInt(style.marginBottom.replace('px', ''))
            return { 
                index: index,
                issep: item.getAttribute('is-separator') !== null,
                left: recti.left, 
                top: recti.top, 
                width: recti.width, 
                height: recti.height, 
                marginHeight: marginHeight,
            } 
        })

        const inx = this.items.indexOf(this._target)
        this._targetRect = this._rects[inx]
        this._target.classList.add('item--dragged', 'item--pressed')

        const rect = this.getBoundingClientRect()
        this.style.height = rect.height + 'px'
        this.style.width = rect.width + 'px'
        this.items.forEach((item, idx) =>
        {
            const rect = this._rects[idx]
            if (!item) { return }
            if (!rect) { return }

            item.classList.add('item--transform')
            if (item != this._target)
            {
                item.classList.remove('item--dragged', 'item--pressed')
                // if (item.classList.contains('item--dragged')) { item.classList.remove('item--dragged') }
                // if (item.classList.contains('item--pressed')) { item.classList.remove('item--pressed') }
            }
            item.style.transition = 'none'
            item.__originalWidth = item.style.width
            item.__originalHeight = item.style.height
            item.style.width = rect.width + 'px'
            item.style.height = rect.height + 'px'
            this._translate3d(rect.left, rect.top, 1, item, 'start')

            setTimeout(_ => { 
                item.style.transition = null 
            }, 20)

        })

        this._setDragging(true)
        this.async(() => {  Vibrator.sortableItemSwitch()  })
    }

    _trackMove(event)
    {
        if (!this.dragging || !this._targetRect) { return }

        let dx = event.detail.dx
        let dy = event.detail.dy
        // if (this._targetIsSep) { dx = 0 }
        const left = this._targetRect.left + dx
        const top = this._targetRect.top + dy
        this._translate3d(left, top, 1, this._target, 'track')
        const overItem = this._itemFromCoords(event.detail, this._target)
        if (overItem && overItem !== this._target && (this._now() - this._trackMoveLastNow) > 250)
        {
            this._trackMoveLastNow = this._now()

            const overItemIndex = this.items.indexOf(overItem)
            const targetIndex = this.items.indexOf(this._target)
            this._moveItemArray(this.items, targetIndex, overItemIndex) //move item 

            //recalc rects by indexies
            var rects = JSON.parse(JSON.stringify(this._rects)) //clone
            
            //calc grid
            var gridx = 0, gridy = 0, gridw = 0, gridh = 0, seph = 0, gridStepW = 0, gridStepWMax = 0
            for (let i = 0; i < rects.length; i++)
            {
                if (i == 0)
                {
                    gridx = rects[i].left
                    gridy = rects[i].top
                }

                if (rects[i].issep)
                {
                    seph = rects[i].height + rects[i].marginHeight //need css read
                }
                else
                {
                    gridw = rects[i].width
                    gridh = rects[i].height
                }

                if (i > 0 && rects[i].top == rects[i - 1].top)
                {
                    gridStepW = gridStepW == 0 ? 2 : gridStepW + 1
                    gridStepWMax = Math.max(gridStepWMax, gridStepW)
                }
                else if (!rects[i].issep 
                    && gridStepW > 0 
                    && i > 0 
                    && rects[i].top != rects[i - 1].top)
                {
                    gridStepWMax = Math.max(gridStepWMax, gridStepW)
                    gridStepW = 0
                }
            }

            if (seph !== 0) //we have separator and we need to recalc grid
            {
                this._moveItemArray(rects, targetIndex, overItemIndex) //move item

                var linex = 0, liney = 0, sepy = 0
                for (let i = 0; i < rects.length; i++)
                {
                    rects[i].left = rects[i].issep ? gridx : gridx + linex * gridw
                    rects[i].top = gridy + liney * gridh + sepy * seph 
                
                    if (rects[i].issep)
                    {
                        linex = 0
                        sepy++
                    }
                    else 
                    {
                        linex++
                        if (linex >= gridStepWMax || ((i + 1) < rects.length && rects[i + 1].issep)) 
                        { 
                            linex = 0 
                            liney++
                        }
                    }
                }
                this._rects = rects
            }


            //transform apply
            for (let i = 0; i < this.items.length; i++)
            {
                // if (i != overItemIndex) 
                if (this.items[i] !== this._target)
                {
                    const rect = this._rects[i]
                    if (!rect) { continue }
                    requestAnimationFrame(_ =>
                    {
                        this._translate3d(rect.left, rect.top, 1, this.items[i], 'track')
                    })
                }
                else
                {
                    // console.log(this.items[i], this._rects[i])
                }
            }
        }
    }

    // The track really ends
    _trackEnd(event?)
    {
        this._setDragging(false)
        var target = this._target
        this._touchStartDebouncer = 0
        if (target)
        {
            target.classList.remove('item--pressed')
        }

        if (this._rects)
        {
            const rect = this._rects[this.items.indexOf(target)]
            if (rect)
            {
                this._translate3d(rect.left, rect.top, 1, target, 'end')
                // if (!(!Teamatical._browser.msie || Teamatical._browser.version > 11))
                {
                    this._onTransitionEnd()
                }
            }
        }
    }

    _onTransitionEndDebouncer: Debouncer
    _onTransitionEnd(e?)
    {
        if (e)
        {
            var epath = e.path || e.composedPath()
            if (epath && epath[0].tagName == 'PAPER-RIPPLE') { return }
            if (!(epath && epath.find(i => i.classList && i.classList.contains(this.grabable)))) { return } 
            if (!e?.srcElement?.classList.contains(this.sortable)) { return }
        }
        if (this.dragging && e) { return }

        this._onTransitionEndDebouncer = Debouncer.debounce(this._onTransitionEndDebouncer, timeOut.after(17), () => { this._restore_onTransitionEnd() })
    }

    _restore_onTransitionEnd()
    {
        const fragment = document.createDocumentFragment()
        this.items.forEach(item =>
        {
            item.style.transform = ''
            item.style.width = item.__originalWidth
            item.style.height = item.__originalHeight
            item.classList.remove('item--transform')
            fragment.appendChild(item)
        })

        if (this.children[0])
        {
            this.insertBefore(fragment, this.children[0])
        }
        else
        {
            this.appendChild(fragment)
        }
        var target = this._target
        this.style.height = ''
        this.style.width = ''
        this._rects = null
        this._targetRect = null
        this._target = null
        this._updateItems()

        if (!target) { return }

        target.classList.remove('item--dragged')
        idlePeriod.run(_ =>
        {
            this.dispatchEvent(new CustomEvent('sort-finish', {
                composed: true,
                detail: {
                    items: this.items,
                    target: target
                }
            }))
        })
    }

    _onContextMenu(event)
    {
        if (this.dragging)
        {
            this._trackEnd(event)
            event.preventDefault()
            return false
        }
    }

    _onTouchMove(event)
    {
        if (!this._touchStartDebouncer)
        {
            this._touchStartDebouncer = this._now()
        }
    }

    _translate3d(x, y, z, el, action)
    {
        if (!el || !el.style) { return }

        var old = el.style.transform
        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`
        if (action == 'start')
        {
            this._trans_start[el.getAttribute('data-index')] = { start: { x: x, y: y }, count: 0, track: null }
        }
        else if (action == 'track')
        {
            var obj = this._trans_start[el.getAttribute('data-index')]
            obj.count += 1
            obj.track = { x: x, y: y }
        }
        else if (action == 'end')
        {
            var obj = this._trans_start[el.getAttribute('data-index')]
            obj.end = { x: x, y: y }
            var thesame = (obj.count <= 2 && obj.start.x == obj.end.x && obj.start.y == obj.end.y)
            // var thesame = (obj.start == el.style.transform && obj.count == 0) || (obj.count == 1 && obj.track == el.style.transform)
            if (thesame)
            {
                this._onTransitionEnd()
            }
        }
    }

    _setFirstAndLast(items)
    {
        for (var i in items)
        {
            if (i == '0')
            {
                var first: any = items[i]
                if ('set' in first)
                {
                    first.set('isFirst', true)
                    first.set('isLast', false)
                }
            }
            else if (i == (items.length - 1).toString())
            {
                var last: any = items[items.length - 1]
                if ('set' in last)
                {
                    last.set('isFirst', false)
                    last.set('isLast', true)
                }
            }
            else
            {
                if ('set' in items[i])
                {
                    items[i].set('isFirst', false)
                    items[i].set('isLast', false)
                }
            }
        }
    }

    _updateItems()
    {
        const items = this.content?.assignedNodes().filter(node =>
        {
            if ((node.nodeType === Node.ELEMENT_NODE) &&
                (!this.sortable || (node as Element).matches('.' + this.sortable)))
            {
                return true
            }
        })
        this._setFirstAndLast(items)
        this._setItems(items)
    }

    _itemFromCoords({ x, y }, target)
    {
        if (!this._rects) { return }

        let match = null
        let matchinx = -1 
        let threshold = 0
        this._rects.forEach((rect, i) =>
        {
            if ((x >= rect.left - threshold) &&
                (x <= rect.left + rect.width + threshold) &&
                (y >= rect.top - threshold) &&
                (y <= rect.top + rect.height + threshold) &&
                target != this.items[i])
            {
                match = this.items[i]
                matchinx = i
            }
        })

        // if (this._targetIsSep && match && matchinx >= 0) 
        // { 
        //     let lmatchinx = matchinx
        //     this._rects.forEach((rect, i) =>
        //     {
        //         if (i < lmatchinx  && rect.top == this._rects[lmatchinx].top) 
        //         { 
        //             match = this.items[i]
        //             matchinx = i
        //         }
        //         else if (i > lmatchinx && rect.top == this._rects[lmatchinx].top) 
        //         {
        //             match = this.items[i]
        //             matchinx = i
        //         }
        //     })
        // }

        return match
    }

    _observeItems()
    {
        if (!this._observer && this.shadowRoot)
        {
            this._observer = new FlattenedNodesObserver(this.shadowRoot, (info:any) =>
            {
                this._updateItems()
            })
        }
    }

    _unobserveItems()
    {
        if (this._observer)
        {
            this._observer.disconnect()
            this._observer = null
        }
    }

    /**
     * Move an array item from one position to another.     
     * Source: http://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
     */
    _moveItemArray(array, oldIndex, newIndex)
    {
        if (newIndex >= array.length)
        {
            var k = newIndex - array.length
            while ((k--) + 1)
            {
                array.push(undefined)
            }
        }
        array.splice(newIndex, 0, array.splice(oldIndex, 1)[0])

        return array
    }
}
