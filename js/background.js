chrome.runtime.onMessage.addListener(function (requestInfo, sender, resolve) {
	fetch(requestInfo.url, requestInfo).then(response => {
		if (response.ok) {
			let contentType = response.headers.get("content-type");
			let isJson = contentType && contentType.indexOf("application/json") !== -1;
			let useCharsetDecoder = contentType && contentType.indexOf("charset=iso-8859-1") !== -1;
			if (isJson) {
				return response.json();
			} else if (useCharsetDecoder) {
				return response.arrayBuffer().then(buffer => new TextDecoder("iso-8859-1").decode(buffer));
			} else {
				return response.text();
			}
		} else {
			return response.text().then(body => {
				throw new Error(`Unexpected ResponseStatus: ${response.status} - ResponseBody: ${body}`);
			});
		}
	}).then(response => {
		resolve(response);
	}).catch(e => {
		resolve({
			// Need to do .toString() as Error is not "JSON-ifiable" and may get erased.
			errorStr: `Error executing ${requestInfo.method} ${requestInfo.url} - ${e.toString()}`
		});
	});
	return true;
});
