chrome.runtime.onMessage.addListener(function (requestInfo, sender, resolve) {
	requestFetch(requestInfo).then(response => {
		resolve(response);
	}).catch(e => {
		resolve({
			// Need to do .toString() as Error is not "JSON-ifiable" and may get erased.
			errorStr: `Error executing ${requestInfo.method || "GET"} ${requestInfo.url} - ${e.toString()}`
		});
	});

	return true;
});

const requestFetch = function (requestInfo) {
	return fetch(requestInfo.url, requestInfo).then(response => {
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
			if (response.status === 429) {
				console.warn(`Got 429 for ${requestInfo.url}, retrying in 1 second...`);
				return Promise.resolve().then(delay(1000)).then(() => {
					return requestFetch(requestInfo);
				});
			}

			return response.text().then(body => {
				throw new Error(`Unexpected ResponseStatus: ${response.status} - ResponseBody: ${body}`);
			});
		}
	});
};

const delay = (delayMs) => {
	return result => new Promise(resolve => setTimeout(() => resolve(result), delayMs));
}