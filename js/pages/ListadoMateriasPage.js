let ListadoMateriasPage = function (pagesDataParser) {

	let setIframe = function () {
		pagesDataParser.getCourses().then(courses => {
			let passed = encodeURIComponent(courses.passed.join(","));
			let signed = encodeURIComponent(courses.signed.join(","));
			let iframeUrl = `http://www.materiasutn.com/?approved=${passed}&signed=${signed}&readMode=true`;
			$(".std-canvas").prepend(`<iframe width="100%" height="1000" style="border: none;" src='${iframeUrl}'></iframe>`);
		});
	};

	(function () {
		// Commented until materiasutn.com is back up again.
		// setIframe();
	})();

	// Public
	return {};
};
