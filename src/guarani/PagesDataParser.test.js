import {PagesDataParser} from './PagesDataParser.js';
import {ProfileNotHandledError} from './Errors.js';

import fs from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;

describe('pagesDataParser.getStudentId', () => {
	let pagesDataParser = new PagesDataParser();

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

describe('pagesDataParser.fetchAjaxGETContents', () => {
	let pagesDataParser;

	beforeEach(() => {
		pagesDataParser = new PagesDataParser();
	});

	it('throws ProfileNotHandledError when redirected to zona_comisiones', async () => {
		global.fetch = () => Promise.resolve({
			ok: true,
			text: () => Promise.resolve(JSON.stringify({
				cod: "-2",
				cont: {url: "/autogestion/grado/zona_comisiones"}
			})),
		});

		await expect(pagesDataParser.fetchAjaxGETContents("https://example.com"))
			.rejects.toThrow(ProfileNotHandledError);
	});
});
