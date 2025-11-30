import {ApiConnector} from '../__mocks__/ApiConnector.js';
import {Utils} from './Utils.js';
import {PagesDataParser} from './PagesDataParser.js';

import fs from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;

describe('pagesDataParser.getStudentId', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let pagesDataParser = new PagesDataParser(utils);

	beforeEach(() => {
		const inputFile = expect.getState().currentTestName.replaceAll(" ", "_") + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', inputFile), 'utf8');
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
