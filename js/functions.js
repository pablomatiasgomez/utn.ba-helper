(function () {
	// We will only handle student pages, this avoids other kinds, and avoids logged out errors.
	if (!location.pathname.startsWith("/alu") && !$("#page-alu.selected").length) return;
	let handler = null;

	let $sigaHelperCustomMenusContainer;
	let sigaHelperCustomMenuAppended = false;
	let appendSigaHelperCustomMenu = () => {
		if (!sigaHelperCustomMenuAppended) {
			$sigaHelperCustomMenusContainer = $("<p></p>");
			$("#menu-page-alu")
				.append("<div>Siga Helper</div>")
				.append($sigaHelperCustomMenusContainer);
		}
	};
	let addCustomPage = (name, customPageHandler) => {
		appendSigaHelperCustomMenu();
		let hash = `#${encodeURIComponent(name)}`;
		let $a = $(`<a href="${hash}">${name}</a>`);
		let clickHandler = () => customPageHandler($(".std-desktop-desktop").html(`<div class="std-canvas"><p>${name}</p></div>`).find(".std-canvas"));
		$a.on("click", clickHandler);
		$sigaHelperCustomMenusContainer.append($a);
		if (location.hash === hash) {
			handler = clickHandler;
		}
	};

	let utils = new Utils();
	let apiConnector = new ApiConnector();
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);

	addCustomPage("Encuesta Docente", ($container) => ProfessorSurveysCustomPage($container, utils, apiConnector));

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, dataCollector, utils),
		"/alu/mat.do": () => ListadoMateriasPage(pagesDataParser),
		"/alu/preins.do": () => PreInscripcionPage(utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils),
	};

	handler = handler || PAGE_HANDLERS[location.pathname];

	try {
		if (handler) handler();
	} catch (e) {
		console.error("Error when handling page " + location.href, e);
		apiConnector.logMessage("Handle page " + location.href, true, utils.stringifyError(e));
	}

	dataCollector.collectBackgroundDataIfNeeded().catch(e => {
		console.error("Error while collecting background data", e);
		apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
	});

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
