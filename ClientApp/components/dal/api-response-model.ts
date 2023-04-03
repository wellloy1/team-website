export class UnhandledError
{
    ReloadPage: boolean | null | undefined
    ErrorID: string | null | undefined
    ErrorCode: string | null | undefined
    Message: string | null | undefined
    _devErrorDetails: string[] | null | undefined
}

export class APIResponseRedirect
{
    Url: string | null | undefined
}
    
export class APIResponseMessage
{
    Key: string | null | undefined
    Message: string | null | undefined
    Type: string | null | undefined
}
    
export class APIResponseModel
{
    result: any
    success: boolean | null | undefined

    summary: APIResponseMessage | null | undefined
    details: APIResponseMessage[] | null | undefined

    errorid: string | null | undefined
    error: UnhandledError | null | undefined

    redirect: APIResponseRedirect | null | undefined

    _devErrorDetails: string[] | null | undefined
}