let CustomPages = function (pagesDataParser, utils, apiConnector) {

	const CUSTOM_PAGE_QUERY_PARAM = "customPage";
	const CUSTOM_PAGES = [
		CoursesSearchCustomPage,
		ProfessorsSearchCustomPage,
		PlanTrackingCustomPage,
	];

	let $utnBaHelperCustomMenusContainer = $();
	let appendUtnBaHelperCustomMenu = function () {
		if (!$utnBaHelperCustomMenusContainer.length) {
			$utnBaHelperCustomMenusContainer = $(`<ul class="dropdown-menu"></ul>`);
			let $li = $(`
				<li class="dropdown js-menuitem-root">
					<a href="#" class="dropdown-toggle" data-toggle="dropdown">UTN.BA Helper <b class="caret"></b></a>
				</li>`);
			$li.append($utnBaHelperCustomMenusContainer);
			$(".main-nav .nav:not(.perfiles)").append($li)
		}
	};

	let addCustomPageMenu = function (name) {
		appendUtnBaHelperCustomMenu();
		$utnBaHelperCustomMenusContainer.append(`<li><a class="no-ajax" href="/autogestion/grado/?${CUSTOM_PAGE_QUERY_PARAM}=${encodeURIComponent(name)}">${name}</a></li>`);
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
				$("#kernel_contenido").html(`
					<div id="pretexto">
						<div>
							<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
							<p><b>Esta sección es provista por el UTN.BA Helper y no es parte del sistema de la UTN.</b></p>
							<p>Toda la información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, por lo cual puede estar incompleta y/o errónea. <br>
							Ninguno de los datos presentados en esta sección proviene del sistema de la UTN, por lo que debe ser usada bajo su propia interpretación.</p>
							<p>Tener en cuenta que la data colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
						</div>
					</div>
					<div class="main"><p>${customPage.menuName}</p></div>
					<div id="postexto">
						<div>
							<h3 style="text-align: center;">Esta sección es provista por el UTN.BA Helper y no es parte del sistema de la UTN.</h3>
						</div>
					</div>
				`);
				selectedPageHandler = () => customPage($("#kernel_contenido .main"), {
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
