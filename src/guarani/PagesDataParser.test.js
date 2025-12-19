import {ApiConnector} from '../__mocks__/ApiConnector.js';
import {Utils} from './Utils.js';
import {PagesDataParser} from './PagesDataParser.js';
import {loadFixture} from './test-helpers.js';

import $ from "jquery";

const __dirname = import.meta.dirname;

describe('pagesDataParser.getStudentId', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let pagesDataParser = new PagesDataParser(utils);

	beforeEach(() => {
		loadFixture({
			testName: expect.getState().currentTestName,
			testFileDir: __dirname,
		});
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
		loadFixture({
			testName: expect.getState().currentTestName,
			testFileDir: __dirname,
		});
	});

	it('082029-K4053-2021-1C-2professors', () => {
		let surveyForm = pagesDataParser.parseKollaSurveyForm($(document), document.documentElement.outerHTML);
		expect(surveyForm).toMatchSnapshot();
	});

});
