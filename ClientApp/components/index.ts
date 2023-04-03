import { setRootPath, setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js'
setRootPath(window.Polymer.rootPath)
setPassiveTouchGestures(true)


//BLL
// import { NetBase } from './bll/net-base'

//UI
// import { RippleContainer } from './ui/ripple-container'
// import { TabsOverlay } from './ui/tabs-overlay'
// import { Tabs } from './ui/tabs'
// import { Tab } from './ui/tab'
// import { UILoader } from './ui/ui-loader'
// import { UINetworkWarning } from './ui/ui-network-warning'

//Fragments and APP and Styles
// import './shared-styles/common-styles'
// import './shared-styles/form-styles'
import { h404 } from './fragments/h404'
import { h503 } from './fragments/h503'
import { TeamaticalApp } from  './teamatical-app/teamatical-app'



// Add your STATIC elements here
const static_elements = [
	//BLL
	// NetBase,
	// OpenGraph,
	// Analytics,
	// CartData,
	// ColorsData,
	// CategoryData,
	// TeaminfoData,
	// UserData,


	// UI
	// RippleContainer,
	// TabsOverlay,
	// Tabs,
	// Tab,
	// UILoader,
	// UINetworkWarning,
	// UISubmenuList,
	// UISnackbar,
	// UIButtonScrollUp,
	// UIButton,
	// UIImage,


	// FRAGMENTS
	h404,
	h503,
	
	// APP
	TeamaticalApp,
]

for (const si of static_elements) 
{
	const id = '' + si.is
	if (!window.customElements.get(id)) {
		window.customElements.define(id, si)
		// console.log('Register Staticaly - ' + id)
	}
}
