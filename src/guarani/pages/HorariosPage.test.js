import {HorariosPage} from './HorariosPage.js';

import fs from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;

describe('horariosPage.init', () => {
	let horariosPage;

	beforeEach(async () => {
		const inputFile = expect.getState().currentTestName.replaceAll(" ", "_") + '.html';
		document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './__fixtures__/', inputFile), 'utf8');
		horariosPage = new HorariosPage();
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
