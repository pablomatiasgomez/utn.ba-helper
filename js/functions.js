if (!Array.prototype.hasOwnProperty("flatMap")) {
	Array.prototype.flatMap = function (fn) {
		return Array.prototype.concat.apply([], this.map(fn));
	};
}

(function () {
	// If the url starts with /alu, the student is already logged, and the Alu tab is selected.
	// If not, we could be in the home page, which will be only handled if the studend name is present, which means is logged, and the alu tab is selected.
	if (!(
		location.pathname.startsWith("/alu") ||
		(location.pathname === "/" && $("#page-alu.selected").length === 1 && $(".pfx-user").length === 1))) return;

	let handler = null;

	let $sigaHelperCustomMenusContainer = $();
	let appendSigaHelperCustomMenu = () => {
		if (!$sigaHelperCustomMenusContainer.length) {
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

	addCustomPage("Buscar cursos", ($container) => CoursesSearchCustomPage($container, utils, apiConnector));
	addCustomPage("Buscar docentes", ($container) => ProfessorsSearchCustomPage($container, utils, apiConnector));

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, dataCollector, utils),
		"/alu/mat.do": () => ListadoMateriasPage(pagesDataParser),
		"/alu/preins.do": () => PreInscripcionPage(pagesDataParser, utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils, apiConnector),
		"/alu/encdocpop.do": () => EncuestaDocentePopUpPage(dataCollector),
	};

	handler = handler || PAGE_HANDLERS[location.pathname];

	handler && handler().catch(e => {
		console.error("Error when handling page " + location.pathname, e);
		return apiConnector.logMessage("Handle page " + location.pathname, true, utils.stringifyError(e));
	});

	dataCollector.collectBackgroundDataIfNeeded().catch(e => {
		console.error("Error while collecting background data", e);
		return apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
	});

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
