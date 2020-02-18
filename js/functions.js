if (!Array.prototype.hasOwnProperty("flatMap")) {
	Array.prototype.flatMap = function (fn) {
		return Array.prototype.concat.apply([], this.map(fn));
	};
}

(function () {
	// We will only handle student pages, this avoids other kinds, and avoids logged out errors.
	if (!location.pathname.startsWith("/alu")) return;

	let utils = new Utils();
	let apiConnector = new ApiConnector();
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, dataCollector, utils),
		"/alu/mat.do": () => ListadoMateriasPage(pagesDataParser),
		"/alu/preins.do": () => PreInscripcionPage(pagesDataParser, utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils),
	};

	let handler = PAGE_HANDLERS[location.pathname];

	try {
		if (handler) handler();
	} catch (e) {
		console.error("Error when handling page " + location.pathname, e);
		apiConnector.logMessage("Handle page " + location.pathname, true, utils.stringifyError(e));
	}

	dataCollector.collectBackgroundDataIfNeeded().catch(e => {
		console.error("Error while collecting background data", e);
		apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
	});

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
