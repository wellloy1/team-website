import { UIBase } from '../ui/ui-base'
import { UserInfoModel } from '../dal/user-info-model'


export class FragmentBase extends UIBase
{
    constructor()
    {
        super()
    }

    connectedCallback()
    {
        super.connectedCallback()

        // var mediaQueryList = window.matchMedia('print');
        // mediaQueryList.addListener((mql) =>
        // {
        //     console.log('print1')
        //     if (mql.matches && this.lazyload !== undefined)
        //     {
        //         console.log('print2')
        //         this.set('lazyload', false)
        //     }
        // })
        // var mediaQueryList = window.matchMedia('screen');
        // mediaQueryList.addListener((mql) =>
        // {
        //     if (mql.matches && this.lazyload !== undefined)
        //     {
        //         this.set('lazyload', true)
        //     }
        // })
    }

    _accountTitle(orgName, postfix, visible = false)
    {
        var owner = (orgName ? orgName : '')
        if (!owner) { owner = this.localize('account-title-your') }
        return this.localize(postfix, 'owner', owner)
    }
    
    _showToast(msg)
    {
        this.dispatchEvent(new CustomEvent('api-show-toast', {
            bubbles: true, composed: true, detail: {
                //timeout: 3000,
                //strong: true,
                message: msg,
            }
        }))
    }

    _computed_imagesHomePath(imagesPath, homeImagesPath)
    {
        return [imagesPath, homeImagesPath].join('/')
    }

    makesureImageIsloaded(list, callback)
    {
        if (!list) { return }

        this.set('saving', true)
        this.set('lazyload', false)

        var imgs = list.querySelectorAll('teamatical-ui-image')

        var tm = setInterval(() =>
        {
            var l = true
            for (var i in imgs)
            {
                if (imgs[i].isloaded === false) 
                {
                    l = false
                    break
                }
            }

            if (l) 
            {
                clearInterval(tm)
                this.set('saving', false)
                // console.log('fire')
                if (callback)
                {
                    callback()
                }
            }
        }, 
        120)
    }

}


//#region decorators

export const FragmentDynamic = (superClass) =>
{
    window.customElements.define(superClass.is, superClass)
}

export const FragmentStatic = (superClass) =>
{
    //do nothing
}

//#endregion