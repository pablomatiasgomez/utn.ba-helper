import {CoursesSearchCustomPage} from './CoursesSearchCustomPage.js';
import {ProfessorsSearchCustomPage} from './ProfessorsSearchCustomPage.js';
import {PlanTrackingCustomPage} from './PlanTrackingCustomPage.js';

const CUSTOM_PAGES = [
	CoursesSearchCustomPage,
	ProfessorsSearchCustomPage,
	PlanTrackingCustomPage,
];

export class CustomPages {
	static CUSTOM_PAGE_QUERY_PARAM = "customPage";

	#pagesDataParser;
	#dataCollector;
	#utils;
	#apiConnector;

	constructor(pagesDataParser, dataCollector, utils, apiConnector) {
		this.#pagesDataParser = pagesDataParser;
		this.#dataCollector = dataCollector;
		this.#utils = utils;
		this.#apiConnector = apiConnector;
	}

	appendMenu() {
		if (!CUSTOM_PAGES.length) return;

		const customMenusContainer = document.createElement('ul');
		customMenusContainer.className = 'dropdown-menu';

		const li = document.createElement('li');
		li.className = 'dropdown js-menuitem-root';
		li.innerHTML = `<a href="#" class="dropdown-toggle" data-toggle="dropdown">UTN.BA Helper <b class="caret"></b></a>`;

		li.appendChild(customMenusContainer);
		document.querySelector(".main-nav .nav:not(.perfiles)").appendChild(li);

		CUSTOM_PAGES.forEach(customPage => {
			const menuItem = document.createElement('li');
			menuItem.innerHTML = `<a class="no-ajax" href="${CustomPages.getCustomPageUrl(customPage)}">${customPage.menuName}</a>`;
			customMenusContainer.appendChild(menuItem);
		});
	}

	#initCustomPage(customPage) {
		document.querySelector("#kernel_contenido").innerHTML = `
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
		`;
	}

	getSelectedPageHandler() {
		let selectedCustomPageName = new URLSearchParams(window.location.search).get(CustomPages.CUSTOM_PAGE_QUERY_PARAM);
		let selectedCustomPage = CUSTOM_PAGES.filter(customPage => selectedCustomPageName === customPage.menuName)[0];
		if (!selectedCustomPage) return null;

		return () => {
			this.#initCustomPage(selectedCustomPage);
			return new selectedCustomPage(document.querySelector("#kernel_contenido .main"), {
				pagesDataParser: this.#pagesDataParser,
				dataCollector: this.#dataCollector,
				utils: this.#utils,
				apiConnector: this.#apiConnector
			});
		};
	}

	// Static methods
	static getCustomPageUrl(customPage, customParamValue) {
		let params = {
			[CustomPages.CUSTOM_PAGE_QUERY_PARAM]: customPage.menuName,
			[customPage.customParamKey]: customParamValue,
		};
		return "/autogestion/grado/?" + Object.entries(params).filter(entry => !!entry[1]).map(entry => entry.map(encodeURIComponent).join("=")).join("&");
	}

	static getCourseResultsUrl(courseCode) {
		return CustomPages.getCustomPageUrl(CoursesSearchCustomPage, courseCode);
	}

	static getProfessorSurveyResultsUrl(professorName) {
		return CustomPages.getCustomPageUrl(ProfessorsSearchCustomPage, professorName);
	}
}
