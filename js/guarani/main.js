(function () {
	// We only will handle pages if:
	// - the user is in the /autogestion/grado pages
	// - the user is logged in (they have the name in the navbar)
	// - there is a profile selector with "Alumno" selected.
	let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
	let isLoggedIn = $(".user-navbar").length;
	let isStudentProfile = $("#js-selector-perfiles .js-texto-perfil").text() === "Perfil: Alumno";
	if (!isInGradoPage || !isLoggedIn || !isStudentProfile) return;

	// Init pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("js/pdf.worker.min.js");

	let apiConnector = new ApiConnector("guarani");
	let utils = new Utils(apiConnector);
	let pagesDataParser = new PagesDataParser(utils);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);
	let customPages = new CustomPages(pagesDataParser, dataCollector, utils, apiConnector);

	customPages.appendMenu();

	const PAGE_HANDLERS = {
		// match is performed using startsWith and first one is used.
		"/autogestion/grado/calendario": () => HorariosPage(utils),
		"/autogestion/grado/cursada/elegir_materia/": () => PreInscripcionPage(utils, apiConnector),
	};
	// Wait for the loading div to hide... applies for both loading from document or ajax.
	Object.entries(PAGE_HANDLERS).forEach(entry => PAGE_HANDLERS[entry[0]] = () => waitForElementToHide("#loading_top").then(entry[1]));

	let handleCurrentPage = () => {
		let handler = customPages.getSelectedPageHandler() || Object.keys(PAGE_HANDLERS).filter(key => window.location.pathname.startsWith(key)).map(key => PAGE_HANDLERS[key])[0];
		if (!handler) return;
		handler().catch(e => {
			console.error("Error when handling page " + window.location.pathname + window.location.search, e);
			return apiConnector.logMessage("HandlePage " + window.location.pathname + window.location.search, true, utils.stringifyError(e));
		});
	};

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
	pagesDataParser.getStudentId().then(studentId => {
		$(".user-navbar").append(`
			<div style="margin: -10px 10px 0 0; float: right; clear: right;">
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
