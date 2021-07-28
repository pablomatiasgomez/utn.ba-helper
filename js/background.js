chrome.runtime.onMessage.addListener(function (requestInfo, sender, resolve) {
	fetch(requestInfo.url, requestInfo).then(response => {
		if (response.ok) {
			return response.json();
		} else {
			return response.text().then(body => {
				throw new Error(`Error executing ${requestInfo.method} ${requestInfo.url} - ResponseStatus: ${response.status} - ResponseBody: ${body}`);
			});
		}
	}).then(json => {
		resolve(json);
	}).catch(e => {
		resolve({errorStr: e.toString()}); // Need to do .toString() as Error is not "JSON-ifiable" and may get erased.
	});
	return true;
});
