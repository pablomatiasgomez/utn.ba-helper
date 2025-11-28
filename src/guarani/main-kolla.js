import './main.css';

import $ from 'jquery';

import {initializeEmbrace} from '../Embrace.js';

import {ApiConnector} from '../ApiConnector.js';
import {Utils} from './Utils.js';
import {Store} from './Store.js';
import {PagesDataParser} from './PagesDataParser.js';

(function () {
	initializeEmbrace("main-kolla");

	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	return utils.runAsync("mainKolla", () => {
		let store = new Store();
		let pagesDataParser = new PagesDataParser(utils);

		// This main will only be executed on kolla pages.
		if (!window.location.pathname.startsWith("/siu/kolla")) return;

		$("#btn-terminar").on("mousedown", function () {
			return utils.runAsync("surveyFinished", () => {
				return store.readHashedStudentIdFromStore().then(hashedStudentId => {
					if (!hashedStudentId) throw new Error(`Couldn't find hashedStudentId within form url ${location.href}.`);

					let surveys = pagesDataParser.parseKollaSurveyForm($(document), $(document).find("html").html());
					if (surveys.length) {
						surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
						return apiConnector.postProfessorSurveys(surveys);
					}
				});
			});
		});
	});
})();
