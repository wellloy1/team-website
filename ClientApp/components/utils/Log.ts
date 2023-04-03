        //Utils.Log = {}

        // window.console.logDumpProductSelection = (pconf, title) => {
        //     if (!pconf) { return pconf }

        //     Object.keys(pconf.DesignOptionSetList).forEach((i) =>
        //     {
        //         var s = ''
        //         Object.keys(pconf.DesignOptionSetList[i].DesignOptions).forEach((j) =>
        //         {
        //             s += '' + (pconf.DesignOptionSetList[i].DesignOptions[j].Selected ? '1' : '0')
        //         })

        //         if (pconf.DesignOptionSetList[i].SetName == 'basedesign')
        //         {
        //             console.log(title + ' - ' + pconf.DesignOptionSetList[i].SetName + '>> ' + s)
        //         }
        //     })
        // }




// (function ()
// {
//     'use strict';

//     var console = window.console
//     if (!console) return

//     function intercept(method)
//     {
//         var original = console[method]
//         console[method] = function ()
//         {
//             // do sneaky stuff
//             if (original.apply)
//             {
//                 // Do this for normal browsers
//                 original.apply(console, arguments)
//             }
//             else
//             {
//                 // Do this for IE
//                 var message = Array.prototype.slice.apply(arguments).join(' ')
//                 original(message)
//             }
//         }
//     }
//     var methods = ['log', 'warn', 'error']
//     for (var i = 0; i < methods.length; i++)
//     {
//         //intercept(methods[i])
//     }

//     console['obj'] = (obj) => 
//     {
//         var l = Object.getName(obj) + "\n"
//         for (var i in obj)
//         {
//             l = l + ", " + i + " = " + obj[i] + "\n"
//         }
//         console.log(l)
//     }

// }());