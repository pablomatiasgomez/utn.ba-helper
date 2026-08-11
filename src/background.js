browser.runtime.onMessage.addListener(async (requestInfo, sender) => {
	try {
		return await requestFetch(requestInfo);
	} catch (e) {
		// Error objects are not JSON-serializable, so we need to serialize them manually.
		return {
			error: {
				name: e.name,
				message: `Error executing ${requestInfo.method || "GET"} ${requestInfo.url} - ${e.toString()}`,
				status: e.status,
			},
		};
	}
});

async function requestFetch(requestInfo) {
	let response = await fetch(requestInfo.url, requestInfo);
	if (response.ok) {
		let contentType = response.headers.get("content-type");
		let isJson = contentType && contentType.indexOf("application/json") !== -1;
		let useCharsetDecoder = contentType && contentType.indexOf("charset=iso-8859-1") !== -1;
		if (isJson) {
			let text = await response.text();
			return JSON.parse(text);
		} else if (useCharsetDecoder) {
			let buffer = await response.arrayBuffer();
			return new TextDecoder("iso-8859-1").decode(buffer);
		} else {
			return response.text();
		}
	} else {
		if (response.status === 429) {
			console.warn(`Got 429 for ${requestInfo.url}, retrying in 1 second...`);
			await new Promise(resolve => setTimeout(resolve, 1000));
			return requestFetch(requestInfo);
		}

		let body = await response.text();
		let error = new Error(`Got unexpected ResponseStatus: ${response.status} - ResponseBody: ${body}`);
		error.status = response.status;
		throw error;
	}
}