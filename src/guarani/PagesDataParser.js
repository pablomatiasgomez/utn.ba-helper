// noinspection JSNonASCIINames

import * as XLSX from 'xlsx';
import {Consts} from './Consts.js';
import {
	GuaraniBackendError,
	LoggedOutError,
	MissingStudentIdError,
	ProfileNotHandledError,
	RedirectedToHomeError
} from './Errors.js';
import {backgroundFetch} from '../BackgroundMessaging.js';

export class PagesDataParser {
	#responsesCache = {}; 	// We want to fetch only once each page.

	#fetchAjaxPOSTContents(url, body, useCache = true) {
		return this.#fetchAjaxContents(url, {
			"headers": {
				"X-Requested-With": "XMLHttpRequest", // This is needed so that guarani's server returns a json payload
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
			},
			"method": "POST",
			"body": body,
		}, useCache);
	}

	fetchAjaxGETContents(url, useCache = true) {
		return this.#fetchAjaxContents(url, {
			"headers": {
				"X-Requested-With": "XMLHttpRequest", // This is needed so that Guaraní's server returns a json payload
			}
		}, useCache);
	}

	async #fetchWithRetry(url, fetchOpts) {
		let response = await fetch(url, fetchOpts);
		if (response.ok) {
			return response;
		}
		if (response.status === 429) {
			console.warn(`Got 429 for ${url}, retrying in 1 second...`);
			await new Promise(resolve => setTimeout(resolve, 1000));
			return this.#fetchWithRetry(url, fetchOpts);
		} else if (response.status === 500) {
			throw new GuaraniBackendError();
		}
		let body = await response.text();
		throw new Error(`Got unexpected ResponseStatus: ${response.status} for url: ${url} - ResponseBody: ${body}`);
	}

	/**
	 * Fetches and parses the way Guaraní's page ajax contents are loaded.
	 */
	async #fetchAjaxContents(url, fetchOpts, useCache = true) {
		let cacheKey = `${fetchOpts.method || "GET"}:${url}:${fetchOpts.body || ""}`;
		if (useCache && this.#responsesCache[cacheKey]) {
			return this.#responsesCache[cacheKey];
		}

		let fetchResponse;
		try {
			fetchResponse = await this.#fetchWithRetry(url, fetchOpts);
		} catch (e) {
			throw new Error(`Error on fetchAjaxContents for ${cacheKey}`, {cause: e});
		}
		let text = await fetchResponse.text();
		let response = JSON.parse(text);
		if (response.cod === "1" && response.titulo === "Grado - Acceso" && response.operacion === "acceso") throw new LoggedOutError();
		if (response.cod === "-2" && response.cont.url.includes("/autogestion/grado/acceso/login")) throw new LoggedOutError();
		if (response.cod === "-2" && response.cont.url.includes("/autogestion/grado/inicio_alumno")) throw new RedirectedToHomeError();
		if (response.cod === "-2" && response.cont.url.includes("/autogestion/grado/zona_comisiones")) throw new ProfileNotHandledError(); // This happens when the user switches profile from "Alumno" to "Docente"
		if (response.cod === "-1" && (response.cont === "error" || response.cont === "Ha ocurrido un error.")) throw new GuaraniBackendError(response);
		if (response.cod !== "1") throw new Error(`Invalid ajax contents for url ${cacheKey}. response: ${JSON.stringify(response)}`);
		this.#responsesCache[cacheKey] = response;
		return response;
	}

	/**
	 * Some pages that are requested via ajax return responses that contain an array of items to be
	 * rendered in the UI, which are different script tags that contain the html, so they need to be parsed.
	 * This method parses that and returns only the item that is requested (infoId)
	 * @param responseContents the "cont" object of the ajax call.
	 * @param infoId the infoId to filter the elements out.
	 */
	#parseAjaxPageRenderer(responseContents, infoId) {
		let doc = new DOMParser().parseFromString(responseContents, "text/html");
		let renderData = Array.from(doc.querySelectorAll("script"))
			.map(el => el.textContent)
			.filter(script => script.startsWith("kernel.renderer.on_arrival"))
			.map(script => JSON.parse(script.replace("kernel.renderer.on_arrival(", "").replace(");", "")))
			.filter(data => data.info.id === infoId);
		if (renderData.length !== 1) throw new Error(`Found unexpected number of renderers: ${renderData.length} for infoId: ${infoId}. response: ${JSON.stringify(responseContents)}`);
		return renderData[0];
	}

	/**
	 * Fetches an url that returns a XLS and returns the parsed workbook
	 * @param url url that returns a XLS.
	 * @returns {Promise<{}>}
	 */
	async #fetchXlsContents(url) {
		if (this.#responsesCache[url]) {
			return this.#responsesCache[url];
		}

		let fetchResponse;
		try {
			fetchResponse = await this.#fetchWithRetry(url);
		} catch (e) {
			throw new Error(`Error on fetchXlsContents for ${url}`, {cause: e});
		}
		let buffer = await fetchResponse.arrayBuffer();
		let uint8Array = new Uint8Array(buffer);
		let contents;
		try {
			contents = XLSX.read(uint8Array, {type: "array"});
		} catch (e) {
			throw new Error(`Error on XLSX.read for ${url}. uint8Array: [${uint8Array}].`, {cause: e});
		}
		this.#responsesCache[url] = contents;
		return contents;
	}

	// --------------------

	/**
	 * Tries to resolve and return the student id for the current logged-in user.
	 * @returns {String}
	 */
	getStudentId() {
		let container = document.querySelector(".legajo-container");
		if (!container) throw new MissingStudentIdError(`Missing studentId container.`);

		let studentId = container.querySelector(".legajo-numero")?.textContent.trim() || "";
		if (studentId === "-.") throw new MissingStudentIdError(`Missing studentId: ${studentId}`);
		if (studentId[studentId.length - 2] !== "-" || studentId[studentId.length - 6] !== ".") throw new Error(`Invalid studentId: ${studentId}. HTML: ${document.documentElement.outerHTML}`);
		return studentId;
	}

	/**
	 * Fetches, from the "Agenda" page, the current classes that the student is taking.
	 * Used to collect the classSchedules
	 * @returns {Promise<Array<{}>>} array of objects for each class, that contains the schedule for it.
	 */
	async getClassSchedules() {
		try {
			let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/calendario");
			let renderData = this.#parseAjaxPageRenderer(responseContents.cont, "agenda_utn");
			return renderData.info.agenda.cursadas.map(cursadaId => {
				let classData = renderData.info.agenda.comisiones[cursadaId];
				return this.mapClassDataToClassSchedule(classData);
			});
		} catch (e) {
			if (e instanceof RedirectedToHomeError) {
				// This happens when students are in the process to register to new schedules,
				// and there is a time window in which class schedules page cannot be seen.
				return [];
			}
			throw e;
		}
	}

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @returns {Promise<string>}
	 */
	async getStudentPlanCode() {
		let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/plan_estudio");
		let responseText = this.#parseAjaxPageRenderer(responseContents.cont, "info_plan").content;
		let doc = new DOMParser().parseFromString(responseText, "text/html");
		let planText = doc.querySelectorAll(".encabezado td")[1].textContent.trim();
		let groups = /^Plan: \((\w+)\)/.exec(planText);
		if (!groups) throw new Error(`planText couldn't be parsed: ${planText}`);
		return groups[1];
	}


	/**
	 * Parses and returns all the courses for the currently selected student's plan.
	 * @returns {Promise<[{planCode: string, level: number, courseCode: string, courseName: string, elective: boolean, dependencies: [{kind: string, requirement: string, courseCode: string}]}]>}
	 */
	async getStudentPlanCourses() {
		const levelsMapping = {
			"módulo: primer nivel": 1,
			"módulo: segundo nivel": 2,
			"módulo: tercer nivel": 3,
			"módulo: cuarto nivel": 4,
			"módulo: quinto nivel": 5,
			"módulo: sexto nivel": 6,
			"módulo: sexto año": 6,
			"módulo: materias k79": 5, // looks like for K79 the fifth level has this name.
			// Not supported:
			"módulo: cuarto analista": -1, // If we enable this, we also need to resolve how to parse and consider dependencies with "Opción 2"
			"módulo: título intermedio": -1, // don't have support for this as of now in the BE.
		};
		const kindsMapping = {
			"Para cursar": "REGISTER",
			"Para aprobar": "TAKE_FINAL_EXAM",
		};
		const requirementMapping = {
			"Regularizada": "SIGNED",
			"Regularizada o Cur. Simultánea": "SIGNED",
			"Cursada Simultánea": "SIGNED",
			"Aprobada": "PASSED",
		};

		let getDependencies = async (courseCode, dependenciesBtn) => {
			let dependencies = [
				{
					// Add its own dependency (has to be signed in order to take final exam).
					kind: "TAKE_FINAL_EXAM",
					requirement: "SIGNED",
					courseCode: courseCode,
				}
			];

			if (!dependenciesBtn) return dependencies;
			let body = `elemento=${dependenciesBtn.getAttribute("data-elemento")}&elemento_padre=${dependenciesBtn.getAttribute("data-elemento-padre")}`;
			let response = await this.#fetchAjaxPOSTContents("https://guarani.frba.utn.edu.ar/autogestion/grado/plan_estudio/correlativas", body);
			// Response starts with a top-level <td> which the HTML5 parser drops outside a <tr>, so we wrap it in table context to preserve the cell.
			let responseDoc = new DOMParser().parseFromString(`<table><tbody><tr>${response.cont}</tr></tbody></table>`, "text/html");
			let container = responseDoc.querySelector(".td-table-correlativas");
			if (container.querySelector(".alert")?.textContent.trim() === "No hay definidas correlativas para la actividad") return dependencies;

			let elems = Array.from(container.children);
			let i = 0;
			while (i < elems.length) {
				// There are 4 type elements per each kind:
				// 1. div with h3 that tells the kind
				// 2. div.alert_verificar_correlativas that is used to verify dependencies (not used here)
				// There could be N of these 2:
				// 		3. h4 that represents one option (right now we expect to only have "Opción 1")
				// 		4. table.table-correlativas with dependencies

				// 1. div with h3 that tells the kind
				let kindTxt = elems[i++].querySelector(":scope > div > h3")?.textContent || "";
				let kind = kindsMapping[kindTxt];
				if (!kind) throw new Error(`Invalid kind ${kindTxt}. responseCont: ${response.cont}`);

				// 2. div.alert_verificar_correlativas that is used to verify dependencies (not used here)
				if (!elems[i++].classList.contains("alert_verificar_correlativas")) throw new Error(`Found invalid div in second position. responseCont: ${response.cont}`);

				while (i < elems.length && elems[i].matches("h4")) {
					// 3. h4 that represents one option (right now we expect to only have "Opción 1")
					let option = elems[i++].textContent;
					if (option !== "Opción 1") {
						// For now, we only handle "Opción 1"... TODO: Eventually we should support all of them:
						i++;
						continue;
					}

					// 4. table.table-correlativas with dependencies
					let tableElem = elems[i++];
					if (!tableElem.matches("table.table-correlativas")) continue;
					Array.from(tableElem.querySelectorAll("tr")).slice(1).forEach(tr => {
						let tds = tr.querySelectorAll("td");

						// Some new rows have the following texts: 'Módulo: Maquinas Alternativas y Turbomáquinas'	'Tener 1 actividades aprobadas'
						// TODO for now we are ignoring these, eventually we should support them.
						let dependencyCourse = tds[0]?.textContent.trim() || "";
						if (dependencyCourse.startsWith("Módulo: ")) return;

						let groups = /^(.*) \((\d{6})\)$/.exec(dependencyCourse);
						if (!groups) throw new Error(`dependencyCourse couldn't be parsed: ${dependencyCourse}. responseCont: ${response.cont}`);
						// let courseName = groups[1];
						let dependencyCourseCode = groups[2];

						let requirementTxt = tds[1]?.textContent.trim() || "";
						let requirement = requirementMapping[requirementTxt];
						if (!requirement) throw new Error(`requirementTxt couldn't be parsed: ${requirementTxt}. responseCont: ${response.cont}`);

						dependencies.push({
							kind: kind,
							requirement: requirement,
							courseCode: dependencyCourseCode,
						});
					});
				}
			}
			return dependencies;
		};

		let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/plan_estudio");
		let responseText = this.#parseAjaxPageRenderer(responseContents.cont, "info_plan").content;
		let doc = new DOMParser().parseFromString(responseText, "text/html");

		// PlanCode
		let planText = doc.querySelectorAll(".encabezado td")[1].textContent.trim();
		let groups = /^Plan: \((\w+)\)/.exec(planText);
		if (!groups) throw new Error(`planText couldn't be parsed: ${planText}. responseText: ${responseText}`);
		let planCode = groups[1];

		// Courses, cannot do it in parallel as the server returns a lot of 429s.
		let courses = [];
		let maxLevel = -1;
		let courseRows = [];
		doc.querySelectorAll(".accordion").forEach(accordion => {
			let accordionHeading = accordion.querySelector(":scope > .accordion-group > .accordion-heading a");
			let areElectives = accordionHeading.classList.contains("materia_generica") || accordionHeading.textContent.toLowerCase().includes("electivas");

			// The table could be within a level, so we try to grab it from there first.
			let parentAccordion = accordion.parentElement?.closest(".accordion");
			if (parentAccordion) {
				accordionHeading = parentAccordion.querySelector(":scope > .accordion-group > .accordion-heading a");
			}
			let levelText = accordionHeading.textContent.trim().toLowerCase();
			let level = levelsMapping[levelText];
			// If level couldn't be matched, but this is an accordion of electives and is a first level accordion,
			// then it means they are the electives of the entire plan, and should be considered as part of the last level.
			if (typeof level === "undefined" && areElectives && !parentAccordion) level = maxLevel;
			if (typeof level === "undefined") throw new Error(`Invalid levelText: '${levelText}'. responseText: ${responseText}`);
			if (level === -1) return;
			maxLevel = Math.max(maxLevel, level);

			accordion.querySelectorAll("table")[0].querySelectorAll("tbody tr:not(.correlatividades)").forEach(courseRow => {
				let courseText = courseRow.querySelector("td").textContent.trim();
				let groups = /(.*) \((\d{6})\)/.exec(courseText);
				if (!groups) throw new Error(`courseText couldn't be parsed: ${courseText}. responseText: ${responseText}`);
				courseRows.push({
					courseName: groups[1],
					courseCode: groups[2],
					level: level,
					areElectives: areElectives,
					dependenciesBtn: courseRow.lastChild.querySelector(".ver_correlatividades"),
				});
			});
		});

		for (let row of courseRows) {
			let dependencies = await getDependencies(row.courseCode, row.dependenciesBtn);
			courses.push({
				planCode: planCode,
				level: row.level,
				courseCode: row.courseCode,
				courseName: row.courseName,
				elective: row.areElectives,
				dependencies: dependencies,
			});
		}

		return courses;
	}

	/**
	 * @typedef {Object} CoursesHistoryEntry
	 * @property {string} courseCode
	 * @property {boolean} isPassed
	 * @property {boolean} isInProgress
	 * @property {number} grade
	 * @property {number} weightedGrade
	 * @property {Date} date
	 */

	/**
	 * Parses and returns all the student's academic history. Includes courses and final exams (passed, failed, and in-progress).
	 * Also returns the raw responseText for both the by-year and by-course HTML views under `rawDataForDebug`,
	 * used by the parity check to surface diffs against the XLS path.
	 * @returns {Promise<{courses: CoursesHistoryEntry[], finalExams: CoursesHistoryEntry[], rawDataForDebug: {anio: string, materia: string}}>}
	 */
	async getCoursesHistoryFromHTML() {
		let courses = [];
		let finalExams = [];
		// Use a map to also validate returned types.
		let arrayByTypes = {
			"En curso": courses,
			"Regularidad": courses,
			"Promoción": finalExams,
			"Examen": finalExams,
			"Equivalencia Parcial": courses, // Estos en realidad creo que corresponden a las equivalencias que le faltan cosas como rendir laboratorio. Por ahora lo tomamos como curso aprobado.
			"Equivalencia Regularidad": courses,
			"Equivalencia Total": finalExams,
		};
		const outcomes = {
			"Promocionado": {isPassed: true, isInProgress: false},
			"Aprobado": {isPassed: true, isInProgress: false},
			"Reprobado": {isPassed: false, isInProgress: false},
			"Ausente": {isPassed: false, isInProgress: false},
			"Inicio de dictado": {isPassed: false, isInProgress: true},
		};

		// Fetch both views in parallel. We parse the by-course one (it's the complete view); by-year is kept for the parity-check debug payload.
		let [anioResponse, materiaResponse] = await Promise.all([
			this.fetchAjaxGETContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=&e_cu=A&e_ex=A&e_re=A"),
			this.fetchAjaxGETContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=materia&param_modo=&e_cu=A&e_ex=A&e_re=A"),
		]);
		let responseText = this.#parseAjaxPageRenderer(anioResponse.cont, "info_historia").content;
		let materiaResponseText = this.#parseAjaxPageRenderer(materiaResponse.cont, "info_historia").content;
		let doc = new DOMParser().parseFromString(materiaResponseText, "text/html");
		Array.from(doc.querySelectorAll(".catedras")).forEach(group => {
			let courseText = group.querySelector("h3.titulo-corte")?.textContent?.trim() || "";
			let courseCodeGroups = /(.*) \((\d{6})\)/.exec(courseText);
			if (!courseCodeGroups) throw new Error(`courseText couldn't be parsed: ${courseText}`);
			let courseCode = courseCodeGroups[2];

			Array.from(group.querySelectorAll(".catedra_nombre")).forEach(item => {
				// Row shape: "<type>  - <gradeInfo> <date> [- Libro <X>] [- Folio <Y>] - Detalle"
				// Libro and Folio are optional, so we accept 3, 4, or 5 parts.
				// Examples:
				//            "Promoción  - 10 (Diez) Promocionado 10/07/2018 - Libro PR038 - Folio 190 - Detalle"
				//            "Regularidad  - Aprobada (Aprobada) Aprobado 22/03/2017 - Libro XVII200 - Folio 29 - Detalle"
				//            "En curso  - Inicio de dictado 25/03/2026 - Detalle"
				//            "Equivalencia Total - 6 (SEIS) Aprobado 07/03/2025 - Detalle"
				//            "Regularidad  - Ausente 11/07/2025 - Libro XXV030001 - Detalle"
				//            "Regularidad  - Aprobada (Aprobada) Aprobado 28/11/2019  (Vencida) - Libro XIX071 - Folio 39 - Detalle"
				let historyRow = item.querySelector("span")?.textContent?.trim() || "";
				let parts = historyRow.split(" - ");
				if (parts.length < 3 || parts.length > 5 || parts[parts.length - 1] !== "Detalle") throw new Error(`historyRow couldn't be parsed: ${historyRow}`);

				let type = parts[0].trim();
				let arr = arrayByTypes[type];
				if (!arr) throw new Error(`Type not handled: ${type}. Row: ${historyRow}`);

				// A trailing "(Vencida)" marker on parts[1] means the regularidad expired. Strip it so the rest of the parsing works, and force isPassed=false below.
				let isExpired = /\s\(Vencida\)$/.test(parts[1]);
				if (isExpired) parts[1] = parts[1].replace(/\s*\(Vencida\)\s*$/, "");

				// parts[1] is "<gradeInfo> <date>" — split off the trailing date.
				let lastSpace = parts[1].lastIndexOf(" ");
				let date = this.#parseDate(parts[1].slice(lastSpace + 1));
				let gradeInfo = parts[1].slice(0, lastSpace);

				// gradeInfo ends with the outcome token (single word like "Aprobado", or multi-word like "Inicio de dictado").
				let outcome = Object.keys(outcomes).find(key => gradeInfo.endsWith(key));
				if (!outcome) throw new Error(`gradeInfo couldn't be parsed: ${gradeInfo}. Row: ${JSON.stringify(historyRow)}`);
				let {isPassed, isInProgress} = outcomes[outcome];
				if (isExpired) isPassed = false;

				// First token of gradeInfo is the numeric grade if present (e.g. "8 (OCHO) Aprobado").
				let grade = parseInt(gradeInfo.split(" ")[0]) || null;
				let weightedGrade = grade !== null ? this.#getWeightedGrade(date, grade) : null;

				arr.push({
					courseCode: courseCode,
					isPassed: isPassed,
					isInProgress: isInProgress,
					grade: grade,
					weightedGrade: weightedGrade,
					date: date,
				});
			});
		});
		return {
			courses: courses,
			finalExams: finalExams,
			rawDataForDebug: {anio: responseText, materia: materiaResponseText},
		};
	}

	/**
	 * Parses and returns all the student's academic history. Includes courses and final exams (passed, failed, and in-progress).
	 * Also returns the raw XLS rows (full sheet, including metadata) under `rawDataForDebug`, used by the parity check to surface diffs against the HTML path.
	 * @returns {Promise<{courses: CoursesHistoryEntry[], finalExams: CoursesHistoryEntry[], rawDataForDebug: Array<Array<*>>}>}
	 */
	async getCoursesHistory() {
		let courses = [];
		let finalExams = [];
		let equivalenceEntriesByCourseCode = await this.#fetchEquivalenceEntriesByCourseCode();
		// Use a map to also validate returned types.
		let arrayByTypes = {
			"En curso": courses,
			"Regularidad": courses,
			"Promocion": finalExams,
			"Examen": finalExams,
			"Equivalencia Parcial": courses, // Estos en realidad creo que corresponden a las equivalencias que le faltan cosas como rendir laboratorio. Por ahora lo tomamos como curso aprobado.
			"Equivalencia Regularidad": courses,
			"Equivalencia Total": finalExams,
		};
		const outcomes = {
			"Promocionado": {isPassed: true, isInProgress: false},
			"Aprobado": {isPassed: true, isInProgress: false},
			"Reprobado": {isPassed: false, isInProgress: false},
			"Ausente": {isPassed: false, isInProgress: false},
			"Inicio de dictado": {isPassed: false, isInProgress: true},
		};
		let workbook = await this.#fetchXlsContents("/autogestion/grado/historia_academica/exportar_xls/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=");
		let sheet = workbook.Sheets["Reporte"];
		if (!sheet) throw new Error(`Workbook does not contain sheet. Sheetnames: ${workbook.SheetNames}`);

		// Capture the full sheet (including the first 5 metadata rows) for debugging before we trim. {header: 1} returns each row as an array of cell values so the metadata doesn't get misread as headers.
		let allRowsForDebug = XLSX.utils.sheet_to_json(sheet, {header: 1});

		// First 5 rows do not include important data:
		if (sheet.A6.v !== "Fecha") throw new Error(`Invalid sheet data: ${JSON.stringify(XLSX.utils.sheet_to_json(sheet))}`);
		sheet["!ref"] = sheet["!ref"].replace("A1:", "A6:");

		XLSX.utils.sheet_to_json(sheet).forEach(row => {
			let date = this.#parseDate(row["Fecha"]);
			let courseText = row["Actividad"];
			let type = row["Tipo"];
			let gradeText = row["Nota"];
			let gradeOutcome = row["Resultado"];
			if (!gradeOutcome && type === "En curso") gradeOutcome = "Inicio de dictado"; // Matcheamos lo que se hace en el parsing de HTML

			let courseCodeGroups = /(.*) \((\d{6})\)/.exec(courseText);
			if (!courseCodeGroups) throw new Error(`courseText couldn't be parsed: ${courseText}. Row: ${JSON.stringify(row)}`);
			let courseCode = courseCodeGroups[2];

			if (type === "Equivalencia") {
				// XLS lumps every equivalence under "Equivalencia". Match the row to its precise type using the by-course HTML view as truth: same date + same Nota.
				let entries = equivalenceEntriesByCourseCode[courseCode];
				if (!entries || !entries.length) throw new Error(`Could not resolve equivalence entries for courseCode: ${courseCode}. equivalenceEntriesByCourseCode: ${JSON.stringify(equivalenceEntriesByCourseCode)}`);
				let xlsNota = gradeText || null;
				let match = entries.find(e => e.date === row["Fecha"] && e.notaEquivalent === xlsNota);
				if (match) {
					type = match.type;
				} else {
					// Equivalence page didn't list a row for this exact (date, Nota) — surface the data rather than silently picking a type.
					throw new Error(`Could not match XLS Equivalencia row to HTML lookup. Row: ${JSON.stringify(row)}. entries: ${JSON.stringify(entries)}`);
				}
			}

			let arr = arrayByTypes[type];
			if (!arr) throw new Error(`Type not handled: ${type}. Row: ${JSON.stringify(row)}`);

			let outcome = outcomes[gradeOutcome];
			if (!outcome) throw new Error(`gradeOutcome couldn't be parsed: ${gradeOutcome}. Row: ${JSON.stringify(row)}`);
			let {isPassed, isInProgress} = outcome;

			let grade = parseInt(gradeText) || null;
			let weightedGrade = grade !== null ? this.#getWeightedGrade(date, grade) : null;

			arr.push({
				courseCode: courseCode,
				isPassed: isPassed,
				isInProgress: isInProgress,
				grade: grade,
				weightedGrade: weightedGrade,
				date: date,
			});
		});
		return {
			courses: courses,
			finalExams: finalExams,
			rawDataForDebug: allRowsForDebug,
		};
	}

	// fetchEquivalenceEntriesByCourseCode is needed to fetch the Equivalences directly from HTML and not XLS,
	// as the XLS only includes the string "Equivalencia" which cannot be distinguished between Parcial/Regularidad and Total.
	// Returns one entry per equivalence row (with type, date and notaEquivalent) so the XLS parser can match each XLS row to its real type.
	async #fetchEquivalenceEntriesByCourseCode() {
		let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/historia_academica/?checks=EquivalenciaA,&modo=materia&param_modo=&e_cu=A&e_ex=A&e_re=A");
		let responseText = this.#parseAjaxPageRenderer(responseContents.cont, "info_historia").content;
		let doc = new DOMParser().parseFromString(responseText, "text/html");
		let listado = doc.querySelector("#listado");
		if (!listado) throw new Error(`Could not find #listado in equivalence response. responseText: ${responseText}`);

		let equivalenceEntriesByCourseCode = {};
		Array.from(listado.children).filter(catedraGroupDiv => catedraGroupDiv.classList.contains("catedras")).forEach(catedraGroupDiv => {
			let courseText = catedraGroupDiv.querySelector("h3.titulo-corte")?.textContent.trim();
			if (!courseText) return;
			let courseCodeGroups = /(.*) \((\d{6})\)/.exec(courseText);
			if (!courseCodeGroups) throw new Error(`Equivalence courseText couldn't be parsed: ${courseText}`);
			let courseCode = courseCodeGroups[2];

			Array.from(catedraGroupDiv.querySelectorAll(".catedra[equivalencia='Aprobado']")).forEach(catedraDiv => {
				// Each row has the same shape as the main history rows: "<type> - <gradeInfo> <date> - Detalle"
				let rowText = catedraDiv.querySelector(".catedra_nombre span")?.textContent?.trim() || "";
				let parts = rowText.split(" - ");
				if (parts.length !== 3 || parts[2] !== "Detalle") throw new Error(`Equivalence row couldn't be parsed: ${rowText}`);

				let type = parts[0].trim();
				if (!["Equivalencia Parcial", "Equivalencia Regularidad", "Equivalencia Total"].includes(type)) throw new Error(`Unknown equivalenceText: ${type}`);

				// parts[1] = "<gradeInfo> <date>" (date format DD/MM/YYYY, matches XLS Fecha).
				let lastSpace = parts[1].lastIndexOf(" ");
				let date = parts[1].slice(lastSpace + 1);
				let gradeInfo = parts[1].slice(0, lastSpace);
				// XLS Nota equivalent: empty when gradeInfo is just an outcome word (e.g. "Aprobado"); otherwise the leading token (e.g. "Aprobada" or a numeric grade).
				let tokens = gradeInfo.split(" ");
				let notaEquivalent = tokens.length === 1 ? null : tokens[0];

				if (!equivalenceEntriesByCourseCode[courseCode]) equivalenceEntriesByCourseCode[courseCode] = [];
				equivalenceEntriesByCourseCode[courseCode].push({type, date, notaEquivalent});
			});
		});

		return equivalenceEntriesByCourseCode;
	}

	/**
	 * Fetches all the current surveys that the user has to take (cannot retrieve the ones that have already been taken)
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	async getProfessorClassesFromSurveys() {
		let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/inicio_alumno");
		let surveysResponseText = this.#parseAjaxPageRenderer(responseContents.cont, "lista_encuestas_pendientes").content;

		let surveysDoc = new DOMParser().parseFromString(surveysResponseText, "text/html");
		let kollaUrls = await Promise.all(Array.from(surveysDoc.querySelectorAll("ul li a"))
			.map(a => a.href)
			.map(async siuUrl => {
				siuUrl += (siuUrl.includes("?") ? "&" : "?") + "terminos_condiciones=true";
				let siuResponse = await this.fetchAjaxGETContents(siuUrl);
				let siuDoc = new DOMParser().parseFromString(siuResponse.cont, "text/html");
				let iframe = siuDoc.querySelector("iframe");
				if (!iframe) throw new Error(`Could not get kolla url for siuUrl: ${siuUrl}. siuResponse: ${JSON.stringify(siuResponse)}.\n surveysResponseText:${surveysResponseText}`);
				return iframe.src;
			}));
		kollaUrls = kollaUrls.flat();

		let surveys = await Promise.all(kollaUrls.map(async kollaUrl => {
			let kollaResponseText = await backgroundFetch({url: kollaUrl});
			let kollaDoc = new DOMParser().parseFromString(kollaResponseText, "text/html");
			let surveysMetadata = this.parseKollaSurveyForm(kollaDoc, kollaResponseText);

			// We could eventually merge same class professors, but the backend still accepts this:
			return surveysMetadata.map(surveyMetadata => {
				return {
					year: surveyMetadata.year,
					quarter: surveyMetadata.quarter,
					classCode: surveyMetadata.classCode,
					courseCode: surveyMetadata.courseCode,
					professors: [
						{
							name: surveyMetadata.professorName,
							kind: surveyMetadata.surveyKind,
							role: surveyMetadata.professorRole,
						}
					]
				};
			});
		}));
		return surveys.flat();
	}

	// --------------------

	// Parses a date with format DD/MM/YYYY
	#parseDate(dateStr) {
		let dateParts = dateStr.split("/");
		return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	}

	#getWeightedGrade(date, grade) {
		if (date < Consts.NEW_GRADES_REGULATION_DATE) {
			return Consts.WEIGHTED_GRADES[grade];
		} else {
			return grade;
		}
	}

	/**
	 * Parses a period with the form `Grado Primer Cuatrimestre 2022` into an object that contains the year and quarter.
	 * @param periodTxt
	 * @returns {{year: number, quarter: string}}
	 */
	#parsePeriodTxt(periodTxt) {
		if (periodTxt.startsWith("Escuela de Verano")) {
			// Handle specific case for "Escuela de Verano", e.g. "Escuela de Verano 2023 - CL2022"
			const yearRegex = new RegExp(`^Escuela de Verano \\d{4} - CL(\\d{4})$`);
			let groups = yearRegex.exec(periodTxt);
			if (!groups) throw new Error(`Class period couldn't be parsed: ${periodTxt}`);
			let year = parseInt(groups[1]);
			return {
				year: year,
				quarter: "VERANO",
			};
		}
		const quarterTxtMapping = {
			"Anual": "A",
			"Primer Cuatrimestre": "1C",
			"Segundo Cuatrimestre": "2C",
			// Weird cases, was found in "Grado ASS 2022", and "Grado SyS 2024" (seems to be specific to courseCode: 950454 -> "Análisis de Señales y Sistemas")
			"ASS": "A",
			"SyS": "A",
		};
		const yearAndQuarterRegex = new RegExp(`^Grado (${Object.keys(quarterTxtMapping).join("|")}) (\\d{4})$`);
		let groups = yearAndQuarterRegex.exec(periodTxt);
		if (!groups) throw new Error(`Class period couldn't be parsed: ${periodTxt}`);
		let quarter = quarterTxtMapping[groups[1]];
		let year = parseInt(groups[2]);
		return {
			year: year,
			quarter: quarter,
		};
	}

	#parseBranchTxt(branchTxt) {
		const branchTxtMapping = {
			"Sede Medrano": "MEDRANO",
			"Sede Campus": "CAMPUS",
			"Medrano / Campus": "MEDRANO_CAMPUS",
			"Virtual": "AULA_VIRTUAL",
			"Escuela Técnica - Piñero": "PIÑERO",
		};
		let branch = branchTxtMapping[branchTxt];
		if (!branch) throw new Error(`Branch txt couldn't be parsed: ${branchTxt}`);
		return branch;
	}

	/**
	 * New (or different) version of the schedules, represented in the form of:
	 * [
	 * 		{dia_semana: "Lunes", hora_catedra_inicio: "16", hora_catedra_fin: "19"},
	 * 		{dia_semana: "Jueves", hora_catedra_inicio: "16", hora_catedra_fin: "19"}
	 * ]
	 * @param arr the schedule received from the classData struct (guarani's server)
	 * @returns {{day: string, shift: string, firstHour: number, lastHour: number}[]}
	 */
	#parseSchedulesFromArray(arr) {
		return arr.map(schedule => {
			let day = Object.entries(Consts.DAYS).filter(entry => entry[1] === schedule.dia_semana).map(entry => entry[0])[0];
			if (!day) throw new Error(`Couldn't parse day: ${schedule.dia_semana}`);

			let shiftIdx = Math.floor((parseInt(schedule.hora_catedra_inicio) - 1) / 7); // 0:MORNING, 1:AFTERNOON, 2:NIGHT
			let shift = Object.keys(Consts.HOURS)[shiftIdx];
			let firstHour = (parseInt(schedule.hora_catedra_inicio) - 1) % 7;
			let lastHour = (parseInt(schedule.hora_catedra_fin) - 1) % 7;
			return {
				day: day,
				shift: shift,
				firstHour: firstHour,
				lastHour: lastHour,
			};
		});
	}


	mapClassDataToClassSchedule(classData) {
		try {
			let period = this.#parsePeriodTxt(classData.periodo_nombre);
			let branch = this.#parseBranchTxt(classData.ubicacion_nombre);
			let schedules = this.#parseSchedulesFromArray(classData.horas_catedra);
			return {
				year: period.year,
				quarter: period.quarter,
				classCode: classData.comision_nombre.toUpperCase().replace(" - TUTORÍA", ""),
				courseCode: classData.actividad_codigo,
				// courseName is not used right now.
				// The backend does not accept this for posts (class schedules or previous professors),
				// so if we decide to add it, we should remove it from api calls.
				// courseName: classData.actividad_nombre,
				branch: branch,
				schedules: schedules,
			};
		} catch (e) {
			throw new Error(`Couldn't parse classData: ${JSON.stringify(classData)}`, {cause: e});
		}
	}

	/**
	 * returns whether the given kollaDoc represents a survey form that is already completed
	 * @param kollaDoc Document or Element to query inside.
	 * @returns boolean
	 */
	kollaSurveyFormCompleted(kollaDoc) {
		// Sometimes the survey is already completed, and it looks like there are 2 types of HTML that represent this
		// first one looks to be when completing at the moment, and second when opening a completed one, which shouldn't
		// really happen as we are only grabbing the pending ones (or forms being completed) but from time to time
		// we get some errors, so we can ignore these. The alert box may contain the following messages:
		// 1. `La encuesta 'Probabilidad y Estadística (950704) - Comisión: Z2017' ya ha sido respondida.`
		// 2. `Gracias por completar la encuesta. Por favor descargá y guardá el comprobante generado. Los códigos allí incluídos se generaron por única vez y serán requeridos si solicitas consultar las respuestas.`
		let alertBoxText = kollaDoc.querySelector(".alert.alert-success")?.textContent.trim() || "";
		return alertBoxText.includes(" ya ha sido respondida.") || alertBoxText.includes("Gracias por completar la encuesta");
	}

	/**
	 * Parses the kollaDoc of the Kolla forms, and returns the survey form data along with the answers.
	 * @param kollaDoc Document or Element to query inside.
	 * @param htmlForLog raw HTML used in error messages for debugging.
	 * @returns {[{surveyKind: string, professorRole: string, classCode: string, year: number, courseCode: string, professorName: string, quarter: string, surveyFieldValues: []}]}
	 */
	parseKollaSurveyForm(kollaDoc, htmlForLog) {
		const surveyKindsMapping = {
			"DOCENTE": "DOCENTE",
			"AUXILIARES DOCENTES": "AUXILIAR",
			"DOCENTES AUXILIARES": "AUXILIAR",
		};
		const quarterMapping = {
			"ANUAL": "A",
			"PRIMER CUATRIMESTRE": "1C",
			"SEGUNDO CUATRIMESTRE": "2C",
			"ASS": "A", // Weird case, was found in "ENCUESTA DOCENTES AUXILIARES ASS 2022"
		};
		const surveyTitleRegex = new RegExp(`^ENCUESTA (${Object.keys(surveyKindsMapping).join("|")}) (${Object.keys(quarterMapping).join("|")}) (\\d{4})$`);

		const professorRolesMapping = {
			"Titular": "TITULAR",
			"Asociado": "ASOCIADO",
			"Adjunto": "ADJUNTO",

			"JTP": "JEFE DE TP",
			"Ayudante de 1ra": "AYUDANTE 1RA",
			"Ayudante de 2da": "AYUDANTE 2DA",
		};
		const professorRegex = new RegExp(`^(.*) \\((${Object.keys(professorRolesMapping).join("|")})(?: \\(Responsable de Cátedra\\))?\\)$`);

		if (this.kollaSurveyFormCompleted(kollaDoc)) return [];

		// E.g.: 'Simulación (082041) - Comisión: K4053', 'Administración Gerencial (082039) - Comisión: K5054'
		let courseTitle = (kollaDoc.querySelector(".formulario-titulo")?.textContent || "")
			.trim()
			.replace(" - TUTORÍA", "")  // Fix for cases like 'Inglés Técnico Nivel I (951602) - Comisión: Z2498 - TUTORÍA'
			.replace(/\.$/, "") // Replace last dot in string, if any, for cases like 'Práctica Profesional Supervisada (951699) - Comisión: I5051.'
			.replace(/ B$/, ""); // Replace last " B" in string, if any, for cases like 'Proyecto Final (950289) - Comisión: O6051 B';
		if (courseTitle === "21 - Encuesta de Satisfacción") return []; // Other types of surveys that we don't care.

		let groups = /^(.*) \((\d{6})\) - Comisión: ([\w\d]{5})$/.exec(courseTitle);
		if (!groups) throw new Error(`Survey courseTitle couldn't be parsed: ${courseTitle}. HTML: ${htmlForLog}`);
		// let courseName = groups[1]; // E.g. Simulación
		let courseCode = groups[2]; // E.g. 082041
		let classCode = groups[3]; // E.g. K4053

		return Array.from(kollaDoc.querySelectorAll(".encuesta")).map(surveyDiv => {
			let surveyTitle = surveyDiv.querySelector(".encuesta-titulo")?.textContent.trim() || "";

			groups = surveyTitleRegex.exec(surveyTitle);
			if (!groups) throw new Error(`surveyTitle couldn't be parsed: ${surveyTitle}. HTML: ${htmlForLog}`);

			let surveyKind = surveyKindsMapping[groups[1]]; // DOCENTE, AUXILIAR
			let quarter = quarterMapping[groups[2]]; // A, 1C, 2C
			let year = parseInt(groups[3]); // 2018, 2019, ...

			let professor = surveyDiv.querySelector(".encuesta-elemento h3")?.textContent.trim() || "";

			groups = professorRegex.exec(professor);
			if (!groups) throw new Error(`professor couldn't be parsed: ${professor}. HTML: ${htmlForLog}`);

			let professorName = groups[1].toUpperCase();
			let professorRole = professorRolesMapping[groups[2]]; // TITULAR, ASOCIADO, ADJUNTO, etc.

			let surveyFieldValues = Array.from(surveyDiv.querySelectorAll(".panel-info .panel-body .form-group"))
				.map(item => {
					let questionLabel = item.querySelector(":scope > label");
					let question = (questionLabel?.textContent || "").replace("*", "").trim();
					let value = null;

					let labelFor = questionLabel?.getAttribute("for");
					let answerElement = item.querySelector(`[name=${labelFor}]`);
					if (answerElement?.matches("textarea")) {
						value = answerElement.value || null;
					} else if (answerElement?.matches("input")) {
						let checked = item.querySelector(`[name=${labelFor}]:checked`);
						let parsed = parseInt(checked?.parentElement?.textContent);
						value = isNaN(parsed) ? null : parsed;
					} else {
						throw new Error(`Couldn't parse value for question ${question}. Item: ${item.outerHTML}`);
					}
					return {
						question: question,
						value: value,
					};
				});

			return {
				surveyKind: surveyKind,
				year: year,
				quarter: quarter,
				classCode: classCode,
				courseCode: courseCode,
				professorName: professorName,
				professorRole: professorRole,

				surveyFieldValues: surveyFieldValues, // Only used for posting surveys, not professor classes.
			};
		});
	}

}
