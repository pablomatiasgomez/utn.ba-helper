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

	let utils = new Utils();
	let apiConnector = new ApiConnector("guarani");
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);
	let customPages = new CustomPages(pagesDataParser, utils, apiConnector);

	customPages.appendMenu();

	const PAGE_HANDLERS = {
		"/autogestion/grado/calendario": () => waitForElementToHide("#loading_top").then(() => HorariosPage(utils)),
	};
	// When loading from document, the content is rendered async so we need to wait for the loading div to hide...
	Object.entries(PAGE_HANDLERS).forEach(entry => PAGE_HANDLERS[entry[0]] = () => waitForElementToHide("#loading_top").then(entry[1]));

	let handleCurrentPage = () => {
		let handler = customPages.getSelectedPageHandler() || PAGE_HANDLERS[window.location.pathname];
		if (!handler) return;
		handler().catch(e => {
			console.error("Error when handling page " + window.location.pathname, e);
			return apiConnector.logMessage("Handle page " + window.location.pathname, true, utils.stringifyError(e));
		});
	};

	handleCurrentPage();

	// Append a script to capture ajax page changes.
	window.addEventListener('page_changed', () => handleCurrentPage());
	injectScript(`kernel.evts.escuchar("operacion_cambiada", e => window.dispatchEvent(new Event('page_changed')), true);`);

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

	function injectScript(content) {
		let script = document.createElement('script');
		script.type = 'text/javascript';
		script.innerHTML = content;
		document.head.appendChild(script);
	}
})();
