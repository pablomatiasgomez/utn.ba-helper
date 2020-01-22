(function () {
	// We will only handle student pages, this avoids other kinds, and avoids logged out errors.
	if (!location.pathname.startsWith("/alu") && !$("#page-alu.selected").length) return;
	let pageHandled = false;

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
	let addCustomPage = (name, handler) => {
		appendSigaHelperCustomMenu();
		let hash = `#${encodeURIComponent(name)}`;
		let $a = $(`<a href="${hash}">${name}</a>`);
		let clickHandler = () => handler($(".std-desktop-desktop").html(`<div class="std-canvas"><p>${name}</p></div>`).find(".std-canvas"));
		$a.on("click", clickHandler);
		$sigaHelperCustomMenusContainer.append($a);
		if (location.hash === hash) {
			pageHandled = true;
			clickHandler();
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

	let handler = PAGE_HANDLERS[location.pathname];
	if (!pageHandled && handler) {
		pageHandled = true;
		handler();
	}

	dataCollector.collectBackgroundDataIfNeeded();

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
