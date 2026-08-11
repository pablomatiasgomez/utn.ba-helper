import './main.css';

import {ApiConnector} from '../ApiConnector.js';
import {Utils} from './Utils.js';
import {Store} from './Store.js';
import {PagesDataParser} from './PagesDataParser.js';

(function () {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	utils.runAsync("mainKolla", async function mainKolla() {
		let store = new Store();
		let pagesDataParser = new PagesDataParser();

		if (pagesDataParser.kollaSurveyFormCompleted(document)) {
			return;
		}

		document.getElementById("btn-terminar").addEventListener("mousedown", () => {
			utils.runAsync("surveyFinished", async function surveyFinished() {
				let hashedStudentId = await store.readHashedStudentIdFromStore();
				if (!hashedStudentId) throw new Error(`Couldn't find hashedStudentId within form url ${location.href}.`);

				let surveys = pagesDataParser.parseKollaSurveyForm(document, document.documentElement.outerHTML);
				if (surveys.length) {
					surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
					return apiConnector.postProfessorSurveys(surveys);
				}
			});
		});
	});
})();
