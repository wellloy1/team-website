import '@polymer/iron-icon/iron-icon'
import '@polymer/iron-iconset-svg/iron-iconset-svg'

import icons from './icons.html'


const documentContainer = document.createElement('div')
documentContainer.setAttribute('style', 'display: none')
documentContainer.innerHTML = icons
document.head.appendChild(documentContainer)
