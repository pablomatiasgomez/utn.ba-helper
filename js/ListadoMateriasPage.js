var ListadoMateriasPage = function(pagesDataParser) {

	var stylesForZoomOut = function(zoomOut) {
		let widthPercentage = (1 / zoomOut) * 100;
		let height = parseInt(1000 * widthPercentage / 100);
		return `
			width: ${widthPercentage}%;
			height: ${height}px;
			-ms-zoom: ${zoomOut};
			-moz-transform: scale(${zoomOut});
			-moz-transform-origin: 0 0;
			-o-transform: scale(${zoomOut});
			-o-transform-origin: 0 0;
			-webkit-transform: scale(${zoomOut});
			-webkit-transform-origin: 0 0;
		`;
	};

	var setIframe = function() {
		pagesDataParser.getSubjects().then(subjects => {
			let approved = encodeURIComponent(subjects.approved.join(","));
			let signed = encodeURIComponent(subjects.signed.join(","));
			let iframeUrl = `http://www.materiasutn.com/?approved=${approved}&signed=${signed}&readOnly=true`;
			$(".std-canvas").prepend(`<iframe style="${stylesForZoomOut(0.80)}" frameBorder="0" src='${iframeUrl}' />`);
		});
	};

	(function() {
		setIframe();
	})();


	// Public
	return {};
};