import './main.css';

import $ from 'jquery';

window.$ = window.jQuery = $;

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
	return utils.runAsync("main", () => {
		let store = new Store();
		let pagesDataParser = new PagesDataParser(utils);
		let dataCollector = new DataCollector(store, pagesDataParser, apiConnector);
		let customPages = new CustomPages(pagesDataParser, dataCollector, utils, apiConnector);

		// We only will handle pages if:
		// - the user is in the /autogestion/grado pages
		// - the user is logged in (they have the name in the navbar)
		// - there is a profile selector with "Alumno" selected.
		let isInGradoPage = window.location.pathname.startsWith("/autogestion/grado");
		let isLoggedIn = !!$(".user-navbar").length;
		let currentProfile = $("#js-selector-perfiles .js-texto-perfil").text().trim();
		let isStudentProfile = currentProfile === "Perfil: Alumno";
		if (!isInGradoPage || !isLoggedIn || !isStudentProfile) {
			return apiConnector.logMessage("pageNotHandled", false, `[Path:${window.location.pathname}][IsLoggedIn:${isLoggedIn}][CurrentProfile:${currentProfile}]`);
		}

		customPages.appendMenu();

		const PAGE_HANDLERS = {
			// match is performed using startsWith and first one is used.
			"/autogestion/grado/calendario": () => new HorariosPage(),
			"/autogestion/grado/cursada/elegir_materia/": () => new PreInscripcionPage(pagesDataParser, utils, apiConnector),
			"/autogestion/grado/examen": () => new InscripcionAExamenesPage(),
		};

		let currentHandler = null;
		let handleCurrentPage = () => utils.runAsync("HandlePage " + window.location.pathname + window.location.search, () => {
			if (currentHandler) currentHandler.close();

			// Wait for the loading div to hide... applies for both loading from document or ajax.
			return utils.waitForElementToHide("#loading_top").then(() => {
				currentHandler = customPages.getSelectedPageHandler() || Object.entries(PAGE_HANDLERS).filter(entry => window.location.pathname.startsWith(entry[0])).map(entry => entry[1])[0];
				if (!currentHandler) return;
				currentHandler = currentHandler();
				return currentHandler.init();
			});
		});

		// noinspection JSIgnoredPromiseFromCall
		handleCurrentPage();

		// Append the foreground script that will subscribe to all the needed events.
		utils.injectScript("guarani/foreground.js");

		// Subscribe to ajax page changes (some of these events are created in the foreground script)
		window.addEventListener("locationchange", handleCurrentPage);

		// noinspection JSIgnoredPromiseFromCall
		utils.runAsync("collectBackgroundDataIfNeeded", () => dataCollector.collectBackgroundDataIfNeeded());

		$(".user-navbar").closest(".row-fluid").prepend(`<span class="powered-by-utnba-helper"></span>`);
		$("body").on("click", ".powered-by-utnba-helper", function () {
			window.open("https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
		});
	});
})();
