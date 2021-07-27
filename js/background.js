chrome.runtime.onMessage.addListener(function (requestInfo, sender, resolve) {
	fetch(requestInfo.url, requestInfo).then(response => {
		if (response.ok) {
			return response.json();
		} else {
			return response.text().then(body => {
				throw new Error(`Error fetching ${requestInfo.url} - Status: ${response.status} - ResponseBody: ${body}`);
			});
		}
	}).then(json => {
		resolve(json);
	}).catch(e => {
		resolve({error: e});
	});
	return true;
});
