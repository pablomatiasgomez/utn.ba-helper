(function () {
	// Init pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("js/lib/pdf.worker.min.js");

	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let store = new Store();
	let pagesDataParser = new PagesDataParser(utils);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);
	let customPages = new CustomPages(pagesDataParser, dataCollector, utils, apiConnector);

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
		"/autogestion/grado/calendario": () => HorariosPage(utils),
		"/autogestion/grado/cursada/elegir_materia/": () => PreInscripcionPage(utils, apiConnector),
		"/autogestion/grado/encuestas_kolla/": () => EncuestasPendientesPage(pagesDataParser, dataCollector, store),
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

	// Append a script to capture ajax page changes.
	utils.injectScript(`
		window.history.pushState = (f => function pushState() {
			f.apply(this, arguments); // pushState returns void so no need to return value.
			window.dispatchEvent(new Event("locationchange"));
		})(window.history.pushState);

		window.history.replaceState = (f => function replaceState() {
			f.apply(this, arguments); // replaceState returns void so no need to return value.
			window.dispatchEvent(new Event("locationchange"));
		})(window.history.replaceState);

		window.addEventListener('popstate', () => {
			window.dispatchEvent(new Event("locationchange"));
		});
	`);
	window.addEventListener("locationchange", () => handleCurrentPage());


	// Background stuff...
	utils.wrapEventFunction("addStudentIdToHeader", () => pagesDataParser.getStudentId().then(studentId => {
		$(".user-navbar").append(`<div style="margin: -10px 10px 0 0; float: right; clear: right;">Legajo: ${studentId}<br><span class="powered-by-utnba-helper"></span></div>`);
	})).then(() => {
		return utils.wrapEventFunction("collectBackgroundDataIfNeeded", () => dataCollector.collectBackgroundDataIfNeeded());
	});

	$("body").on("click", ".powered-by-utnba-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
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
