(function () {
	// We only will handle pages if the user is in the /autogestion/grado pages and is logged in
	let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
	let isLoggedIn = $(".user-navbar").length;
	if (!isInGradoPage || !isLoggedIn) return;

	// Init pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("js/pdf.worker.min.js");

	let handler = null;

	let utils = new Utils();
	let apiConnector = new ApiConnector("guarani");
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);
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

	pagesDataParser.getStudentId().then(studentId => {
		$(".user-navbar").append(`
			<div style="margin: -10px 10px 0px 0; float: right; clear: right;">
				Legajo: ${studentId}<br>
				<span class="powered-by-utnba-helper"></span>
			</div>`);
	}).catch(e => {
		console.error("Error while adding studentId to header", e);
		return apiConnector.logMessage("addStudentIdToHeader", true, utils.stringifyError(e));
	}).then(() => {
		return dataCollector.collectBackgroundDataIfNeeded();
	}).catch(e => {
		console.error("Error while collecting background data", e);
		return apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
	});

	$("body").on("click", ".powered-by-utnba-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
