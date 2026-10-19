import {jest} from '@jest/globals';
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

describe('pagesDataParser.parseKollaSurveyForm', () => {
	let utils;
	let pagesDataParser;
	const parse = html => pagesDataParser.parseKollaSurveyForm(new DOMParser().parseFromString(html, "text/html"), html);

	beforeEach(() => {
		utils = {logHTML: jest.fn()};
		pagesDataParser = new PagesDataParser(utils);
	});

	it('ignores kolla db connection error as plain text', () => {
		const html = "No es posible realizar la conexión a la base.";
		expect(parse(html)).toEqual([]);
		expect(utils.logHTML).toHaveBeenCalledWith("KollaDBConnectionError", 100, html);
	});

	it('ignores kolla db connection error as html page', () => {
		const html = `<!DOCTYPE html><html><head><title>Error en la operación</title></head><body>
			<div class="alert alert-error"><p style="text-align: center;">No es posible realizar la conexión a la base.</p></div>
		</body></html>`;
		expect(parse(html)).toEqual([]);
		expect(utils.logHTML).toHaveBeenCalledWith("KollaDBConnectionError", 100, html);
	});

	it('removes 23 suffix from 7 chars class codes', () => {
		const html = `<html><body>
			<h2 class='formulario-titulo'>Instrumentación (230560) - ComisiÃ³n: Q505123</h2>
			<div class="encuesta">
				<h3 class="encuesta-titulo">ENCUESTA DOCENTE PRIMER CUATRIMESTRE 2026  </h3>
				<div class='encuesta-elemento'><h3>PEREZ JUAN (Adjunto (Responsable de Cátedra))</h3></div>
			</div>
		</body></html>`;
		expect(parse(html)).toEqual([{
			surveyKind: "DOCENTE",
			year: 2026,
			quarter: "1C",
			classCode: "Q5051",
			courseCode: "230560",
			professorName: "PEREZ JUAN",
			professorRole: "ADJUNTO",
			surveyFieldValues: [],
		}]);
	});
});
