(function () {
	// We only will handle pages if the user is in the /grado pages
	let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
	if (!isInGradoPage) return;

	let handler = null;

	let utils = null; // TODO new Utils();
	let apiConnector = new ApiConnector();
	let pagesDataParser = null;// TODO new PagesDataParser(utils, apiConnector);
	let dataCollector = null;// TODO new DataCollector(pagesDataParser, apiConnector);
	let customPages = new CustomPages(pagesDataParser, utils, apiConnector);

	customPages.appendMenu();
	let customPageHandler = customPages.getSelectedPageHandler();
	if (customPageHandler) {
		// The user is in a custom page, so we assign the handler
		handler = customPageHandler;
	}

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, dataCollector, utils),
		"/alu/preins.do": () => PreInscripcionPage(pagesDataParser, utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils, apiConnector),
		"/alu/encdocpop.do": () => EncuestaDocentePopUpPage(dataCollector),
	};

	handler = handler || PAGE_HANDLERS[window.location.pathname];

	handler && handler().catch(e => {
		console.error("Error when handling page " + window.location.pathname, e);
		return apiConnector.logMessage("Handle page " + window.location.pathname, true, utils.stringifyError(e));
	});


	// TODO add powered by.

})();
