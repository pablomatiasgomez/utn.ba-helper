import {ApiConnector} from '../__mocks__/ApiConnector.js';
import {Utils} from './Utils.js';
import {PagesDataParser} from './PagesDataParser.js';

import fs from "node:fs";
import path from "node:path";
import $ from "jquery";

const __dirname = import.meta.dirname;

describe('pagesDataParser.getStudentId', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let pagesDataParser = new PagesDataParser(utils);

	beforeEach(() => {
		const testName = expect.getState().currentTestName.split(" ").slice(1).join("_");
		const inputFile = testName + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', 'pagesDataParser', 'getStudentId', inputFile), 'utf8');
	});

	it('successful parsing', () => {
		let studentId = pagesDataParser.getStudentId();
		expect(studentId).toMatchSnapshot();
	});

	it('missing div', () => {
		expect(() => {
			pagesDataParser.getStudentId();
		}).toThrow();
	});
});

describe('pagesDataParser.parseKollaSurveyForm', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let pagesDataParser = new PagesDataParser(utils);

	beforeEach(() => {
		const testName = expect.getState().currentTestName.split(" ").slice(1).join("_");
		const inputFile = testName + '.html';
		const htmlContent = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', 'pagesDataParser', 'parseKollaSurveyForm', inputFile), 'utf8');
		// Extract body content without executing scripts
		const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		if (bodyMatch) {
			document.body.innerHTML = bodyMatch[1];
		}
	});

	it('082029-K4053-2021-1C-2professors', () => {
		let surveyForm = pagesDataParser.parseKollaSurveyForm($(document), document.documentElement.outerHTML);
		expect(surveyForm).toMatchSnapshot();
	});

});
