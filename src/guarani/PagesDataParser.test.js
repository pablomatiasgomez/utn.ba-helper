/** @jest-environment jsdom */
require('../__mocks__/ApiConnector')
require('./Utils')
require('./PagesDataParser')

const fs = require("node:fs");
const path = require("node:path");

describe('pagesDataParser.getStudentId', () => {
	let apiConnector = new UtnBaHelper.ApiConnector();
	let utils = new UtnBaHelper.Utils(apiConnector);
	let pagesDataParser = new UtnBaHelper.PagesDataParser(utils);

	beforeEach(() => {
		const inputFile = expect.getState().currentTestName.replaceAll(" ", "_") + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', inputFile), 'utf8');
	});

	it('successful parsing', () => {
		return pagesDataParser.getStudentId().then(studentId => {
			expect(studentId).toMatchSnapshot();
		});
	});

	it('missing div', () => {
		return pagesDataParser.getStudentId().then(studentId => {
			expect(studentId).toMatchSnapshot();
		});
	});
});
