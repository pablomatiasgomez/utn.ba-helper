import {ApiConnector} from '../../__mocks__/ApiConnector.js';
import {Utils} from '../Utils.js';
import {HorariosPage} from './HorariosPage.js';

import fs from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;

describe('horariosPage.init', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let horariosPage = new HorariosPage(utils);

	beforeEach(() => {
		const inputFile = expect.getState().currentTestName.replaceAll(" ", "_") + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', inputFile), 'utf8');
	});

	it('successful parsing', async () => {
		await horariosPage.init();

		// Snapshot the entire modified body HTML
		expect(document.body.innerHTML).toMatchSnapshot();
	});

	it('missing cursada elements', async () => {
		await horariosPage.init();

		// Snapshot the entire modified body HTML
		expect(document.body.innerHTML).toMatchSnapshot();
	});

	it('empty agenda', async () => {
		await horariosPage.init();

		// Snapshot the entire modified body HTML
		expect(document.body.innerHTML).toMatchSnapshot();
	});
});
