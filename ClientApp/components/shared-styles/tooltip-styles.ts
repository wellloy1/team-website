import '@polymer/iron-flex-layout/iron-flex-layout.js'

import styles from './tooltip-styles.ts.less'
const stylesID = 'teamatical-tooltip-styles'

const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `<dom-module id="${stylesID}">
  <template>
    <style>
      ${styles}
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
