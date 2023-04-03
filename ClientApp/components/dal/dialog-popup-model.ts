export class DialogPopupModel
{
    message: string | undefined = ''
    announce: string | undefined = ''
    inputs: DialogPopupInputModel[] = []
    buttons: DialogPopupButtonModel[] = []

    required: boolean | undefined = false
    nowrap: boolean | undefined = false
    widthauto: boolean | undefined = false

    qrcode: string | undefined = ''
    errorid: string | undefined = ''
    devErrorDetails: string | undefined = ''
}


export class DialogPopupButtonModel
{
    dismiss: boolean | undefined = false
    confirm: boolean | undefined = false

    class: string | undefined
    title: string | undefined
    ontap = (e) => {}
}

export class DialogPopupInputModel
{
    type: string | undefined
    label: string | undefined
    name: string | undefined
    value: string | undefined
    autocomplete: string | undefined
    
    maxlength: number | undefined
    required: boolean | undefined = false

    autofocus: boolean | undefined = false
}
