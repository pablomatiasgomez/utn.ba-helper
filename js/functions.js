if (!Array.prototype.hasOwnProperty("flatMap")) {
	Array.prototype.flatMap = function (fn) {
		return Array.prototype.concat.apply([], this.map(fn));
	};
}

(function () {
	const CUSTOM_PAGE_QUERY_PARAM = "customPage";

	// If the url starts with /alu, the student is already logged, and the Alu tab is selected.
	// If not, we could be in the home page, which will be only handled if the studend name is present, which means is logged, and the alu tab is selected.
	if (!(
		window.location.pathname.startsWith("/alu") ||
		(window.location.pathname === "/" && $("#page-alu.selected").length === 1 && $(".pfx-user").length === 1))) return;

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

	let selectedCustomPage = new URLSearchParams(window.location.search).get(CUSTOM_PAGE_QUERY_PARAM);
	let addCustomPage = (name, customPageHandler) => {
		appendSigaHelperCustomMenu();
		$sigaHelperCustomMenusContainer.append(`<a href="/?${CUSTOM_PAGE_QUERY_PARAM}=${encodeURIComponent(name)}">${name}</a>`);
		if (selectedCustomPage === name) {
			handler = () => customPageHandler($(".std-desktop-desktop").html(`
			<div id="pretexto">
				<div>
					<h3 style="text-align: center;">SIGA HELPER - Información importante</h3>
					<p><b>Esta sección es provista por el SIGA Helper y no es parte del SIGA.</b></p>
					<p>Toda la información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, por lo cual puede estar incompleta y/o errónea. <br>
					Ninguno de los datos presentados en esta sección proviene del SIGA, por lo que debe ser usada bajo su propia interpretación.</p>
					<p>Tener en cuenta que la data colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
				</div>
			</div>
			<div class="std-canvas"><p>${name}</p></div>`).find(".std-canvas"));
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

	handler = handler || PAGE_HANDLERS[window.location.pathname];

	handler && handler().catch(e => {
		console.error("Error when handling page " + window.location.pathname, e);
		return apiConnector.logMessage("Handle page " + window.location.pathname, true, utils.stringifyError(e));
	});

	dataCollector.collectBackgroundDataIfNeeded().catch(e => {
		console.error("Error while collecting background data", e);
		return apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
	});

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
