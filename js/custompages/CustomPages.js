let CustomPages = function (pagesDataParser, utils, apiConnector) {

	const CUSTOM_PAGE_QUERY_PARAM = "customPage";
	const CUSTOM_PAGES = [
		CoursesSearchCustomPage,
		ProfessorsSearchCustomPage,
		PlanTrackingCustomPage,
	];

	let $sigaHelperCustomMenusContainer = $();
	let appendSigaHelperCustomMenu = function () {
		if (!$sigaHelperCustomMenusContainer.length) {
			$sigaHelperCustomMenusContainer = $("<p></p>");
			$("#menu-page-alu")
				.append("<div>Siga Helper</div>")
				.append($sigaHelperCustomMenusContainer);
		}
	};

	let addCustomPageMenu = function (name) {
		appendSigaHelperCustomMenu();
		$sigaHelperCustomMenusContainer.append(`<a href="/?${CUSTOM_PAGE_QUERY_PARAM}=${encodeURIComponent(name)}">${name}</a>`);
	};

	let selectedPageHandler = null;
	let getSelectedPageHandler = function () {
		return selectedPageHandler;
	};

	let appendMenu = function () {
		let selectedCustomPage = new URLSearchParams(window.location.search).get(CUSTOM_PAGE_QUERY_PARAM);
		CUSTOM_PAGES.forEach(customPage => {
			addCustomPageMenu(customPage.menuName);

			if (selectedCustomPage === customPage.menuName) {
				$(".std-desktop-desktop").html(`
					<div id="pretexto">
						<div>
							<h3 style="text-align: center;">SIGA HELPER - Información importante</h3>
							<p><b>Esta sección es provista por el SIGA Helper y no es parte del SIGA.</b></p>
							<p>Toda la información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, por lo cual puede estar incompleta y/o errónea. <br>
							Ninguno de los datos presentados en esta sección proviene del SIGA, por lo que debe ser usada bajo su propia interpretación.</p>
							<p>Tener en cuenta que la data colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
						</div>
					</div>
					<div class="std-canvas"><p>${customPage.menuName}</p></div>
					<div id="postexto">
						<div>
							<h3 style="text-align: center;">Esta sección es provista por el SIGA Helper y no es parte del SIGA.</h3>
						</div>
					</div>
				`);
				selectedPageHandler = () => customPage($(".std-desktop-desktop .std-canvas"), {
					pagesDataParser,
					utils,
					apiConnector
				});
			}
		});
	};


	// Public
	return {
		appendMenu: appendMenu,
		getSelectedPageHandler: getSelectedPageHandler,
	};
};

CustomPages.getCustomPageUrl = function (customPage, customParamValue) {
	let params = {
		customPage: customPage.menuName,
		[customPage.customParamKey]: customParamValue,
	};
	return "/?" + Object.entries(params).map(entry => entry.map(encodeURIComponent).join("=")).join("&");
};

CustomPages.getCourseResultsUrl = function (courseCode) {
	return CustomPages.getCustomPageUrl(CoursesSearchCustomPage, courseCode);
};

CustomPages.getProfessorSurveyResultsUrl = function (professorName) {
	return CustomPages.getCustomPageUrl(ProfessorsSearchCustomPage, professorName);
};
