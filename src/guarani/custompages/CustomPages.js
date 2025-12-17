import './CustomPages.css';

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

	/**
	 * Removes the existent menu, if any.
	 */
	removeMenu() {
		document.querySelector(".main-nav #js-nav .utnba-helper-menu")?.remove();
	}

	/**
	 * Appends the custom menu, unless it already exists.
	 */
	appendMenu() {
		if (!!document.querySelector(".main-nav #js-nav .utnba-helper-menu")) return;

		const customMenusContainer = document.createElement('ul');
		customMenusContainer.className = 'dropdown-menu';

		const li = document.createElement('li');
		li.className = 'dropdown js-menuitem-root utnba-helper-menu';
		li.innerHTML = `<a href="#" class="dropdown-toggle" data-toggle="dropdown">UTN.BA Helper <b class="caret"></b></a>`;

		li.appendChild(customMenusContainer);
		document.querySelector(".main-nav #js-nav").appendChild(li);

		CUSTOM_PAGES.forEach(customPage => {
			const menuItem = document.createElement('li');
			menuItem.innerHTML = `<a class="no-ajax" href="${CustomPages.getCustomPageUrl(customPage)}">${customPage.menuName}</a>`;
			customMenusContainer.appendChild(menuItem);
		});
	}

	#initCustomPage(customPage) {
		document.querySelector("#kernel_contenido").innerHTML = `
			<div class="utnba-helper">
				<div class="alert" style="background-color: #fafab9; text-align: initial;">
					<section>
						<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>

						<p><strong>Sobre el bloqueo de la extensión</strong></p>

						<p>
							En el último tiempo, la facultad decidió bloquear activamente el uso de la extensión, advirtiendo a los estudiantes que la desactiven.
						</p>
						<p>
							Lamentablemente, esta decisión no protege a los estudiantes, los perjudica.
						</p>
						<p>
							Lo único que logra es quitarle poder a los alumnos, impedirles acceder a información que ellos mismos generan,
							y reforzar un esquema donde la facultad concentra el control total de los datos.
						</p>
						<p>
							La información recolectada en las encuestas docentes existe gracias a los estudiantes.
							Sin embargo, se decide retenerla y ocultarla, incluso frente a iniciativas voluntarias y
							transparentes que buscan devolver esa información a la comunidad.
						</p>

						<p><strong>Consecuencias reales de esta decisión</strong></p>
						<ul>
							<li>
								Se desincentiva la mejora docente, ya que el mal desempeño o el maltrato a estudiantes no tiene consecuencias visibles.
							</li>
							<li>
								Se reduce la capacidad de los alumnos de tomar decisiones informadas sobre su propia formación.
							</li>
						</ul>

						<p><strong>Un ataque al aprendizaje y al desarrollo tecnológico</strong></p>
						<p>
							Esta extensión es un proyecto abierto y comunitario.
							Estudiantes y docentes participaron activamente, abriendo <a
								href="https://github.com/pablomatiasgomez/utn.ba-helper/issues?q=-author%3Apablomatiasgomez">pull
							requests</a>, reportando issues, proponiendo ideas y sugerencias, etc.
						</p>
						<p>
							Esto es exactamente lo que una facultad (y más aún una facultad tecnológica) debería fomentar: aprender
							haciendo, colaborar, construir herramientas útiles para la comunidad.
						</p>
						<p>
							Resulta particularmente inexplicable en una institución como la UTN, cuyo objetivo debería ser formar
							profesionales críticos, autónomos y técnicamente capaces, no usuarios pasivos de sistemas cerrados.
						</p>

						<p><strong>Prohibir no es el camino</strong></p>
						<p>
							La prohibición y el ocultamiento de los datos de las encuestas no es una solución educativa, ya que lo unico que
							logra es afectar a los estudiantes.
						</p>
						<p>
							El camino podría haber sido abrir al público toda la información de manera oficial,
							para proveer una herramienta aún mejor que la que hoy ofrece esta extensión,
							y así entonces eliminar su uso de forma orgánica y no mediante un bloqueo.
						</p>
						<p>
							La información generada por los alumnos debe volver a los alumnos, y la transparencia es el mejor camino para
							mejorar la educación.
						</p>

						<p><strong>Futuro de la extensión</strong></p>
						<p>
							Como se mencionó más arriba, los datos recolectados siempre fueron y serán de los estudiantes, si en algún
							momento la extensión deja de funcionar por bloqueos totales, se intentará exponer la información en alguna
							sección separada del SIU Guarani.
						</p>
					</section>
				</div>
				<div class="main">
					<div class="titulo_operacion"><h2 class="clearfix"><span class="pull-left">${customPage.menuName}</span></h2></div>
				</div>
				<!--div class="alert">
					<h3 style="text-align: center;">Esta sección es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</h3>
				</div-->
				<div class="alert info">
					<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
					<p><b>Esta sección es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</b></p>
					<p>La información presentada en esta sección proviene de datos colectados de los usuarios que poseen la extensión, y de información generada por la misma extensión, por lo cual puede estar incompleta y/o errónea. <br>
					Ninguno de los datos presentados en esta sección proviene del sistema de la UTN, por lo que debe ser usada bajo su propia interpretación.</p>
					<p>Tener en cuenta que en los casos de encuestas, la información colectada es una muestra parcial del total real, y por ende en casos donde la muestra es muy baja, puede implicar que los resultados estén alejados de la realidad.</p>
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
