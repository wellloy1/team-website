import '@polymer/iron-icon/iron-icon'
import '@polymer/iron-iconset-svg/iron-iconset-svg'

import icons from '../../components/assets/icons.html'
import icons_admin from './icons.html'

const documentContainer = document.createElement('div')
documentContainer.setAttribute('style', 'display: none')
documentContainer.innerHTML = icons + icons_admin
document.head.appendChild(documentContainer)
