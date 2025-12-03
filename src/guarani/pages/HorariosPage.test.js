import {HorariosPage} from './HorariosPage.js';
import {loadFixture} from '../test-helpers.js';

const __dirname = import.meta.dirname;

describe('horariosPage.init', () => {
	let horariosPage;

	beforeEach(async () => {
		loadFixture({
			testName: expect.getState().currentTestName,
			testFileDir: __dirname,
		});
		horariosPage = new HorariosPage();
		await horariosPage.init();
	});

	afterEach(() => {
		horariosPage.close();
	});

	it('successful parsing', async () => {
		expect(document.body.innerHTML).toMatchSnapshot();
	});

	it('empty agenda', async () => {
		expect(document.body.innerHTML).toMatchSnapshot();
	});
});
