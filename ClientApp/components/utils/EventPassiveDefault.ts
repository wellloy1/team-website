export class EventPassiveDefault
{
    static optionPrepare(options?)
    {
        if (!EventPassiveDefault_supportsPassive) { return options }
        // console.log(options)
        var defaultOptions = { passive: true, capture: false }
        var usesListenerOptions = typeof options === 'object'
        var useCapture = usesListenerOptions ? options.capture : options
        options = usesListenerOptions ? options : {}
        options.passive = options.passive !== undefined ? options.passive : defaultOptions.passive
        options.capture = useCapture !== undefined ? useCapture : defaultOptions.capture
        // console.log(options)
        return options
    }

    // static overwriteAddEvent(superMethod)
    // {
    //     var defaultOptions = {
    //         passive: true,
    //         capture: false
    //     };

    //     EventTarget.prototype.addEventListener = function (type, listener, options)
    //     {
    //         var usesListenerOptions = typeof options === 'object';
    //         var useCapture = usesListenerOptions ? options.capture : options;

    //         options = usesListenerOptions ? options : {};
    //         options.passive = options.passive !== undefined ? options.passive : defaultOptions.passive;
    //         options.capture = useCapture !== undefined ? useCapture : defaultOptions.capture;

    //         superMethod.call(this, type, listener, options);
    //     };
    // }

    static eventListenerOptionsSupported()
    {
        var supported = false;
        try
        {
            var opts = Object.defineProperty({}, 'passive', {
                get: function () { supported = true; }
            });
            window.addEventListener("test", () => { }, opts);
        }
        catch (e) 
        {
            //
        }

        return supported;
    }

}

const EventPassiveDefault_supportsPassive = EventPassiveDefault.eventListenerOptionsSupported()