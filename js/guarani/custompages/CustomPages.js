let CustomPages = function (pagesDataParser, utils, apiConnector) {


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
			$(".main-nav .nav:not(.perfiles)").append($li);
		}
	};

	let addCustomPageMenu = function (customPage) {
		appendUtnBaHelperCustomMenu();
		$utnBaHelperCustomMenusContainer.append(`<li><a class="no-ajax" href="${CustomPages.getCustomPageUrl(customPage)}">${customPage.menuName}</a></li>`);
	};

	let selectedPageHandler = null;
	let getSelectedPageHandler = function () {
		return selectedPageHandler;
	};

	let appendMenu = function () {
		let selectedCustomPage = new URLSearchParams(window.location.search).get(CustomPages.CUSTOM_PAGE_QUERY_PARAM);
		CUSTOM_PAGES.forEach(customPage => {
			addCustomPageMenu(customPage);

			if (selectedCustomPage === customPage.menuName) {
				$("#kernel_contenido").html(`
					<div class="utnba-helper">
						<div class="alert info">
							<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
							<p><b>Esta sección es provista por el UTN.BA Helper y no es parte del sistema de la UTN.</b></p>
							<p>La información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, y de informacion generada por la misma extension, por lo cual puede estar incompleta y/o errónea. <br>
							Ninguno de los datos presentados en esta sección proviene del sistema de la UTN, por lo que debe ser usada bajo su propia interpretación.</p>
							<p>Tener en cuenta que en los casos de encuestas, la informacion colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
						</div>
						<div class="main">
							<div class="titulo_operacion"><h2 class="clearfix"><span class="pull-left">${customPage.menuName}</span></h2></div>
						</div>
						<div class="alert">
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

CustomPages.CUSTOM_PAGE_QUERY_PARAM = "customPage";

CustomPages.getCustomPageUrl = function (customPage, customParamValue) {
	let params = {
		[CustomPages.CUSTOM_PAGE_QUERY_PARAM]: customPage.menuName,
		[customPage.customParamKey]: customParamValue,
	};
	return "/autogestion/grado/?" + Object.entries(params).filter(entry => !!entry[1]).map(entry => entry.map(encodeURIComponent).join("=")).join("&");
};

CustomPages.getCourseResultsUrl = function (courseCode) {
	return CustomPages.getCustomPageUrl(CoursesSearchCustomPage, courseCode);
};

CustomPages.getProfessorSurveyResultsUrl = function (professorName) {
	return CustomPages.getCustomPageUrl(ProfessorsSearchCustomPage, professorName);
};
