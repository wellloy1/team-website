import { html } from '@polymer/polymer/polymer-element'
import { timeOut, microTask } from '@polymer/polymer/lib/utils/async.js'
import { flush } from '@polymer/polymer/lib/utils/flush.js'

import { UIBase } from '../ui/ui-base'
import view from './tabs-overlay.ts.html'
import style from './tabs-overlay.ts.css'
import { CustomElement } from '../utils/CommonUtils'


@CustomElement
export class TabsOverlay extends UIBase
{
    static get is() { return 'teamatical-tabs-overlay' }
    
    static get template() { return html([`<style>${style}</style>${view}`])}

    static get properties()
    {
        return {
            target: { type: Object, observer: '_targetChanged', } //The element the overlay should cover.
        }
    }

    target: any
    _lastTarget: any
    _transitionsInFlight: any


    constructor()
    {
        super()

        this._lastTarget = undefined
        this._transitionsInFlight = []
    }


    ready()
    {
        super.ready()
        this.addEventListener('transitionend', (e) => this._onTransitionend(e))
    }

    reset()
    {
        this.target = null
        this._lastTarget = undefined
        this._transitionsInFlight = []

        this.style.transitionDuration = '0s'
        this.style.transitionDelay = '0s'
        this.style.top = '0px'
        this.style.right = '0px'
        this.style.bottom = '0px'
        this.style.left = '0px'
        this.style.opacity = '0'
    }

    _targetChanged(newTarget, oldTarget)
    {
        if (!this._transitionsInFlight.length)
        {
            if (this._lastTarget)
            {
                this._lastTarget.classList.remove('tabs-overlay-static-above')
            }
            this.style.display = 'block'
            this._move(oldTarget, newTarget)
            this._lastTarget = this.target
        }
    }

    _onTransitionend(event)
    {
        let index = this._transitionsInFlight.indexOf(event.propertyName)
        if (index >= 0)
        {
            this._transitionsInFlight.splice(index, 1)
        }

        if (!this._transitionsInFlight.length)
        {
            this._moveComplete()
        }
    }

    _moveComplete()
    {
        if (this._lastTarget !== this.target)
        {
            this._move(this._lastTarget, this.target)
            this._lastTarget = this.target
        }
        else
        {
            if (this._lastTarget)
            {
                this._lastTarget.classList.add('tabs-overlay-static-above')
                // this.async(()=>{
                // })
            }
            this.style.display = 'none'
        }
    }

    _move(oldTarget, newTarget)
    {
        let from = oldTarget || newTarget
        let to = newTarget || oldTarget
        if (!from && !to) return

        let fromOpacity = oldTarget ? 1 : 0
        let toOpacity = newTarget ? 1 : 0

        flush()
        let thisRect = this.getBoundingClientRect()
        let thisStyle = window.getComputedStyle(<any>this)
        let fromRect = from.getBoundingClientRect()
        let toRect = to.getBoundingClientRect()

        if (toRect.top === 0 && toRect.right === 0 &&
            toRect.bottom === 0 && toRect.left === 0 &&
            toRect.width === 0 && toRect.height === 0)
        {
            this.style.transitionProperty = 'none'
            this.style.opacity = toOpacity.toString()
            this._transitionsInFlight = []
            microTask.run(this._moveComplete.bind(this))
            return
        } 
        else
        {
            this.style.transitionProperty = ''
        }

        let top = parseFloat(thisStyle.top || '0') + (fromRect.top - thisRect.top)
        let right = parseFloat(thisStyle.right || '0') - (fromRect.right - thisRect.right)
        let bottom = parseFloat(thisStyle.bottom || '0') - (fromRect.bottom - thisRect.bottom)
        let left = parseFloat(thisStyle.left || '0') + (fromRect.left - thisRect.left)

        this.style.transitionDuration = '0s'
        this.style.transitionDelay = '0s'
        let startValues = [
            this.style.top = top + 'px',
            this.style.right = right + 'px',
            this.style.bottom = bottom + 'px',
            this.style.left = left + 'px',
            this.style.opacity = String(fromOpacity)
        ]

        top += toRect.top - fromRect.top
        right -= toRect.right - fromRect.right
        bottom -= toRect.bottom - fromRect.bottom
        left += toRect.left - fromRect.left

        let durations = [0.2, 0.2, 0.2, 0.2, 0.2]
        let delays = [0, 0, 0, 0, 0]
        // Delay left / right transitions if element is left / right of the target.
        if (fromRect.left < toRect.left && fromRect.right < toRect.right)
        {
            delays[3] = 0.1
        } 
        else if (fromRect.left > toRect.left && fromRect.right > toRect.right)
        {
            delays[1] = 0.1
        }

        // Delay top / bottom transitions if element is above / below the target.
        if (fromRect.top < toRect.top && fromRect.bottom < toRect.bottom)
        {
            delays[0] = 0.1
        } 
        else if (fromRect.top > toRect.top && fromRect.bottom > toRect.bottom)
        {
            delays[2] = 0.1
        }

        let endValues = [
            top + 'px',
            right + 'px',
            bottom + 'px',
            left + 'px',
            String(toOpacity)
        ]

        let names = ['top', 'right', 'bottom', 'left', 'opacity']
        for (let i = 0; i < startValues.length; i++)
        {
            if (startValues[i] === endValues[i]) continue
            if (durations[i] === 0 && delays[i] === 0) continue
            // console.log(names[i])
            this._transitionsInFlight.push(names[i])
        }

        timeOut.run(() =>
        {
            this.style.transitionDuration = durations.map((x) => { return x + 's' }).join(', ')
            this.style.transitionDelay = delays.map((x) => { return x + 's' }).join(', ')
            this.style.top = top + 'px'
            this.style.right = right + 'px'
            this.style.bottom = bottom + 'px'
            this.style.left = left + 'px'
            this.style.opacity = String(toOpacity)
        }, 1)
    }
}