
export const hashCode = (s) => 
{
    let h
    for (let i = 0; i < s.length; i++)
    {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0
    }
    return h
}

export const RandomInteger = (min, max) =>
{
    var rand = min - 0.5 + Math.random() * (max - min + 1)
    return Math.round(rand)
}

export const Guid = (function ()
{

    var EMPTY = '00000000-0000-0000-0000-000000000000';

    var _padLeft = function (paddingString, width, replacementChar)
    {
        return paddingString.length >= width ? paddingString : _padLeft(replacementChar + paddingString, width, replacementChar || ' ');
    };

    var _s4 = function (number)
    {
        var hexadecimalResult = number.toString(16);
        return _padLeft(hexadecimalResult, 4, '0');
    };

    var crypto = window.crypto || window.msCrypto;


    var _cryptoGuid = function ()
    {
        var buffer = new window.Uint16Array(8);
        crypto.getRandomValues(buffer);
        return [_s4(buffer[0]) + _s4(buffer[1]), _s4(buffer[2]), _s4(buffer[3]), _s4(buffer[4]), _s4(buffer[5]) + _s4(buffer[6]) + _s4(buffer[7])].join('-');
    };

    var _guid = function ()
    {
        var currentDateMilliseconds = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (currentChar)
        {
            var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
            currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
            return (currentChar === 'x' ? randomChar : (randomChar & 0x7 | 0x8)).toString(16);
        });
    };

    var create = function ()
    {
        var hasCrypto = typeof (crypto) != 'undefined',
            hasRandomValues = typeof (crypto.getRandomValues) != 'undefined';
        return (hasCrypto && hasRandomValues) ? _cryptoGuid() : _guid();
    };

    return {
        newGuid: create,
        empty: EMPTY
    };
})()


export const Easings = {
    linear(t)
    {
        return t;
    },
    easeInQuad(t)
    {
        return t * t;
    },
    easeOutQuad(t)
    {
        return t * (2 - t);
    },
    easeInOutQuad(t)
    {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    easeInCubic(t)
    {
        return t * t * t;
    },
    easeOutCubic(t)
    {
        return (--t) * t * t + 1;
    },
    easeInOutCubic(t)
    {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    easeInQuart(t)
    {
        return t * t * t * t;
    },
    easeOutQuart(t)
    {
        return 1 - (--t) * t * t * t;
    },
    easeInOutQuart(t)
    {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
    },
    easeInQuint(t)
    {
        return t * t * t * t * t;
    },
    easeOutQuint(t)
    {
        return 1 + (--t) * t * t * t * t;
    },
    easeInOutQuint(t)
    {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;
    }
}

