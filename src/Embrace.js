import {initSDK, session, getNavigationInstrumentation} from '@embrace-io/web-sdk';

export function initializeEmbrace(contentScriptName) {
	initSDK({
		appID: '08sxm',
		appVersion: chrome.runtime.getManifest().version,
		defaultInstrumentationConfig: {
			'session-visibility': {
				limitedSessionMaxDurationMs: 5000,
			},
		},
		instrumentations: [
			getNavigationInstrumentation(),
		],
	});
	session.addProperty("content-script", contentScriptName, {lifespan: "permanent"});
	getNavigationInstrumentation().setCurrentRoute({
		url: window.location.pathname,
		path: window.location.pathname
	});
}
