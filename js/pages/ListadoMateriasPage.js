var ListadoMateriasPage = function(pagesDataParser) {

	var setIframe = function() {
		pagesDataParser.getSubjects().then(subjects => {
			let approved = encodeURIComponent(subjects.approved.join(","));
			let signed = encodeURIComponent(subjects.signed.join(","));
			let iframeUrl = `http://www.materiasutn.com/?approved=${approved}&signed=${signed}&readMode=true`;
			$(".std-canvas").prepend(`<iframe width="100%" height="1000" frameBorder="0" src='${iframeUrl}' />`);
		});
	};

	(function() {
		// Commented until materiasutn.com is back up again. 
		// setIframe();
	})();


	// Public
	return {};
};
