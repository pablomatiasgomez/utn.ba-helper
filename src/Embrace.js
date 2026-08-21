import {initSDK, session} from '@embrace-io/web-sdk';

export function initializeEmbrace(contentScriptName) {
	initSDK({
		appID: "08sxm",
		appVersion: chrome.runtime.getManifest().version,
	});
	session.addProperty("content-script", contentScriptName, {lifespan: "permanent"});
}
