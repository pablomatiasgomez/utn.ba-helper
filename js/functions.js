(function () {
	let utils = new Utils();
	let apiConnector = new ApiConnector();
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let professorClassesCollector = new ProfessorClassesCollector(pagesDataParser, apiConnector);

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, apiConnector, utils),
		"/alu/mat.do": () => ListadoMateriasPage(pagesDataParser),
		"/alu/preins.do": () => PreInscripcionPage(utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils),
	};

	let handler = PAGE_HANDLERS[location.pathname];
	if (handler) {
		handler();
	}

	professorClassesCollector.collectIfNeeded();

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
