if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.CustomPages = function (pagesDataParser, dataCollector, utils, apiConnector) {

	const CUSTOM_PAGES = [
		UtnBaHelper.CoursesSearchCustomPage,
		UtnBaHelper.ProfessorsSearchCustomPage,
		UtnBaHelper.PlanTrackingCustomPage,
	];

	let appendMenu = function () {
		if (!CUSTOM_PAGES.length) return;

		let $customMenusContainer = $(`<ul class="dropdown-menu"></ul>`);
		let $li = $(`
				<li class="dropdown js-menuitem-root">
					<a href="#" class="dropdown-toggle" data-toggle="dropdown">UTN.BA Helper <b class="caret"></b></a>
				</li>`);
		$li.append($customMenusContainer);
		$(".main-nav .nav:not(.perfiles)").append($li);

		CUSTOM_PAGES.forEach(customPage => {
			$customMenusContainer.append(`<li><a class="no-ajax" href="${UtnBaHelper.CustomPages.getCustomPageUrl(customPage)}">${customPage.menuName}</a></li>`);
		});
	};

	let initCustomPage = function (customPage) {
		$("#kernel_contenido").html(`
			<div class="utnba-helper">
				<div class="alert info">
					<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
					<p><b>Esta sección es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</b></p>
					<p>La información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, y de información generada por la misma extensión, por lo cual puede estar incompleta y/o errónea. <br>
					Ninguno de los datos presentados en esta sección proviene del sistema de la UTN, por lo que debe ser usada bajo su propia interpretación.</p>
					<p>Tener en cuenta que en los casos de encuestas, la información colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
				</div>
				<div class="main">
					<div class="titulo_operacion"><h2 class="clearfix"><span class="pull-left">${customPage.menuName}</span></h2></div>
				</div>
				<div class="alert">
					<h3 style="text-align: center;">Esta sección es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</h3>
				</div>
			</div>
		`);
	};

	let getSelectedPageHandler = function () {
		let selectedCustomPageName = new URLSearchParams(window.location.search).get(UtnBaHelper.CustomPages.CUSTOM_PAGE_QUERY_PARAM);
		let selectedCustomPage = CUSTOM_PAGES.filter(customPage => selectedCustomPageName === customPage.menuName)[0];
		if (!selectedCustomPage) return null;

		return () => {
			initCustomPage(selectedCustomPage);
			return selectedCustomPage($("#kernel_contenido .main"), {
				pagesDataParser,
				dataCollector,
				utils,
				apiConnector
			});
		};
	};


	// Public
	return {
		appendMenu: appendMenu,
		getSelectedPageHandler: getSelectedPageHandler,
	};
};

UtnBaHelper.CustomPages.CUSTOM_PAGE_QUERY_PARAM = "customPage";

UtnBaHelper.CustomPages.getCustomPageUrl = function (customPage, customParamValue) {
	let params = {
		[UtnBaHelper.CustomPages.CUSTOM_PAGE_QUERY_PARAM]: customPage.menuName,
		[customPage.customParamKey]: customParamValue,
	};
	return "/autogestion/grado/?" + Object.entries(params).filter(entry => !!entry[1]).map(entry => entry.map(encodeURIComponent).join("=")).join("&");
};

UtnBaHelper.CustomPages.getCourseResultsUrl = function (courseCode) {
	return UtnBaHelper.CustomPages.getCustomPageUrl(UtnBaHelper.CoursesSearchCustomPage, courseCode);
};

UtnBaHelper.CustomPages.getProfessorSurveyResultsUrl = function (professorName) {
	return UtnBaHelper.CustomPages.getCustomPageUrl(UtnBaHelper.ProfessorsSearchCustomPage, professorName);
};
