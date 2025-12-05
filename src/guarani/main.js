import './main.css';

import {initializeEmbrace} from '../Embrace.js';

import {ApiConnector} from '../ApiConnector.js';
import {Utils} from './Utils.js';
import {Store} from './Store.js';
import {PagesDataParser} from './PagesDataParser.js';
import {DataCollector} from './DataCollector.js';
import {CustomPages} from './custompages/CustomPages.js';
import {HorariosPage} from './pages/HorariosPage.js';
import {PreInscripcionPage} from './pages/PreInscripcionPage.js';
import {InscripcionAExamenesPage} from './pages/InscripcionAExamenesPage.js';

(function () {
	initializeEmbrace("main");

	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	utils.runAsync("main", () => {
		let store = new Store();
		let pagesDataParser = new PagesDataParser(utils);
		let dataCollector = new DataCollector(store, pagesDataParser, apiConnector);
		let customPages = new CustomPages(pagesDataParser, dataCollector, utils, apiConnector);

		// We only will handle pages if:
		// - the user is in the /autogestion/grado pages
		// - the user is logged in (they have the name in the navbar)
		// - there is a profile selector with "Alumno" selected.
		let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
		let isLoggedIn = !!document.querySelector(".user-navbar");
		let currentProfile = document.querySelector("#js-selector-perfiles .js-texto-perfil")?.textContent.trim();
		let isStudentProfile = currentProfile === "Perfil: Alumno";
		if (!isInGradoPage || !isLoggedIn || !isStudentProfile) {
			return apiConnector.logMessage("pageNotHandled", false, `[Path:${window.location.pathname}][IsLoggedIn:${isLoggedIn}][CurrentProfile:${currentProfile}]`);
		}

		// Detect scripts
		utils.detectScripts();

		// Custom pages & handlers
		customPages.appendMenu();
		const PAGE_HANDLERS = [
			// match is performed using regex and first one is used.
			{
				pathRegex: /^\/autogestion\/grado\/calendario$/,
				handler: () => new HorariosPage()
			},
			{
				pathRegex: /^\/autogestion\/grado\/cursada\/elegir_materia\/.*/,
				handler: () => new PreInscripcionPage(pagesDataParser, utils, apiConnector)
			},
			{
				pathRegex: /^\/autogestion\/grado\/examen$/,
				handler: () => new InscripcionAExamenesPage()
			},
		];

		let currentHandler = null;
		let handleCurrentPage = () => utils.runAsync("HandlePage " + window.location.pathname + window.location.search, () => {
			if (currentHandler) currentHandler.close();

			// Wait for the loading div to hide... applies for both loading from document or ajax.
			return utils.waitForElementToHide("#loading_top").then(() => {
				currentHandler = customPages.getSelectedPageHandler() || PAGE_HANDLERS.find(entry => entry.pathRegex.test(window.location.pathname))?.handler;
				if (!currentHandler) return;
				currentHandler = currentHandler();
				return currentHandler.init();
			});
		});

		handleCurrentPage();

		// Append the foreground script that will subscribe to all the needed events.
		utils.runAsync('injectForeground', () => utils.injectScript("guarani/foreground-script.js"));

		// Subscribe to ajax page changes (some of these events are created in the foreground script)
		window.addEventListener("locationchange", handleCurrentPage);

		// Collect background data
		utils.runAsync("collectBackgroundDataIfNeeded", () => dataCollector.collectBackgroundDataIfNeeded());

		// Add powered by to the header
		document.querySelector(".user-navbar").closest(".row-fluid").insertAdjacentHTML('afterbegin', `<a class="powered-by-utnba-helper" href="https://chromewebstore.google.com/detail/utnba-helper-ex-siga-help/jdgdheoeghamkhfppapjchbojhehimpe" target="_blank">POWERED BY UTN.BA HELPER</a>`);
	});
})();
