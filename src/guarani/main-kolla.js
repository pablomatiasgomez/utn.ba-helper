import './main.css';

import $ from 'jquery';
import {log} from "@embrace-io/web-sdk";

import {initializeEmbrace} from '../Embrace.js';

import {ApiConnector} from '../ApiConnector.js';
import {Utils} from './Utils.js';
import {Store} from './Store.js';
import {PagesDataParser} from './PagesDataParser.js';

(function () {
	initializeEmbrace("main-kolla");

	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	utils.runAsync("mainKolla", async function mainKolla() {
		let store = new Store();
		let pagesDataParser = new PagesDataParser(utils);

		if (pagesDataParser.kollaSurveyFromCompleted($(document))) {
			log.message("Exiting completed kolla survey", 'info', {attributes: {location_href: location.href}});
			return;
		}
		log.message("Entering kolla survey", 'info', {attributes: {location_href: location.href}});

		let $btn = $("#formulario .btn-primary[type=submit][onclick]:visible:enabled");
		if (!$btn.length) return utils.logHTML("kollaMissingBtn", 100);

		$btn.on("mousedown", function () {
			utils.runAsync("surveyFinished", async function surveyFinished() {
				let hashedStudentId = await store.readHashedStudentIdFromStore();
				if (!hashedStudentId) throw new Error(`Couldn't find hashedStudentId within form url ${location.href}.`);

				let surveys = pagesDataParser.parseKollaSurveyForm($(document), document.documentElement.outerHTML);
				if (surveys.length) {
					surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
					return apiConnector.postProfessorSurveys(surveys);
				}
			});
		});
	});
})();
