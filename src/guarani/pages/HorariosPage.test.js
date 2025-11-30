import {ApiConnector} from '../../__mocks__/ApiConnector.js';
import {Utils} from '../Utils.js';
import {HorariosPage} from './HorariosPage.js';

import fs from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;

describe('horariosPage.init', () => {
	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);
	let horariosPage;

	beforeEach(async () => {
		const inputFile = expect.getState().currentTestName.replaceAll(" ", "_") + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', inputFile), 'utf8');
		horariosPage = new HorariosPage(utils);
		await horariosPage.init();
	});

	afterEach(() => {
		horariosPage.close();
	});

	it('successful parsing', async () => {
		expect(document.body.innerHTML).toMatchSnapshot();
	});

	it('missing cursada elements', async () => {
		expect(document.body.innerHTML).toMatchSnapshot();
	});

	it('empty agenda', async () => {
		expect(document.body.innerHTML).toMatchSnapshot();
	});
});
