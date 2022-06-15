(function () {
	// Init pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("js/lib/pdf.worker.min.js");

	let apiConnector = new UtnBaHelper.ApiConnector();
	let utils = new UtnBaHelper.Utils(apiConnector);
	let store = new UtnBaHelper.Store();
	let pagesDataParser = new UtnBaHelper.PagesDataParser(utils);
	let dataCollector = new UtnBaHelper.DataCollector(pagesDataParser, apiConnector);
	let customPages = new UtnBaHelper.CustomPages(pagesDataParser, dataCollector, utils, apiConnector);

	// We only will handle pages if:
	// - the user is in the /autogestion/grado pages
	// - the user is logged in (they have the name in the navbar)
	// - there is a profile selector with "Alumno" selected.
	let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
	let isLoggedIn = !!$(".user-navbar").length;
	let currentProfile = $("#js-selector-perfiles .js-texto-perfil").text().trim();
	let isStudentProfile = currentProfile === "Perfil: Alumno";
	if (!isInGradoPage || !isLoggedIn || !isStudentProfile) {
		return apiConnector.logMessage("pageNotHandled", false, `[Path:${window.location.pathname}][IsLoggedIn:${isLoggedIn}][CurrentProfile:${currentProfile}]`);
	}

	customPages.appendMenu();

	const PAGE_HANDLERS = {
		// match is performed using startsWith and first one is used.
		"/autogestion/grado/calendario": () => UtnBaHelper.HorariosPage(utils),
		"/autogestion/grado/cursada/elegir_materia/": () => UtnBaHelper.PreInscripcionPage(utils, apiConnector),
		"/autogestion/grado/encuestas_kolla/": () => UtnBaHelper.EncuestasPendientesPage(pagesDataParser, dataCollector, store),
	};
	// Wait for the loading div to hide... applies for both loading from document or ajax.
	Object.entries(PAGE_HANDLERS).forEach(entry => PAGE_HANDLERS[entry[0]] = () => waitForElementToHide("#loading_top").then(entry[1]));

	let handleCurrentPage = () => {
		return utils.wrapEventFunction("HandlePage " + window.location.pathname + window.location.search, () => {
			let handler = customPages.getSelectedPageHandler() || Object.keys(PAGE_HANDLERS).filter(key => window.location.pathname.startsWith(key)).map(key => PAGE_HANDLERS[key])[0];
			return handler && handler();
		});
	};

	// noinspection JSIgnoredPromiseFromCall
	handleCurrentPage();

	// Append the foreground script that will subscribe to all the needed events.
	utils.injectScript("js/guarani/foreground.js");

	// Subscribe to ajax page changes (some of these events are created in the foreground script)
	window.addEventListener("locationchange", () => handleCurrentPage());

	// noinspection JSIgnoredPromiseFromCall
	utils.wrapEventFunction("collectBackgroundDataIfNeeded", () => dataCollector.collectBackgroundDataIfNeeded());

	$(".user-navbar").closest(".row-fluid").prepend(`<span class="powered-by-utnba-helper"></span>`);
	$("body").on("click", ".powered-by-utnba-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

	//----

	function waitForElementToHide(selector) {
		return new Promise((resolve) => {
			let check = () => {
				if (!$(selector).is(":visible")) {
					resolve();
				} else {
					setTimeout(check, 100);
				}
			};
			check();
		});
	}

})();
