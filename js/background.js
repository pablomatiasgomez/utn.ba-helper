chrome.runtime.onMessage.addListener(function (requestInfo, sender, resolve) {
	fetch(requestInfo.url, requestInfo).then(response => {
		if (response.ok) {
			return response.json();
		} else {
			return response.text().then(body => {
				throw response.status + " - " + body;
			});
		}
	}).then(json => {
		resolve(json);
	}).catch(e => {
		resolve({error: e});
	});
	return true;
});
