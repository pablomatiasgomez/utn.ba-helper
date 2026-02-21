// noinspection JSNonASCIINames

import $ from 'jquery';
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
		if (response.cod === "-1" && response.cont === "error") throw new GuaraniBackendError(response);
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
		let renderData = $(responseContents).filter("script").toArray()
			.map(script => $(script).html())
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
		let planText = $(responseText).filter(".encabezado").find("td:eq(1)").text();
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
			let $response = $(response.cont).filter(".td-table-correlativas");
			if ($response.find(".alert").text().trim() === "No hay definidas correlativas para la actividad") return dependencies;

			let elems = $response.children().toArray();
			let i = 0;
			while (i < elems.length) {
				// There are 4 type elements per each kind:
				// 1. div with h3 that tells the kind
				// 2. div.alert_verificar_correlativas that is used to verify dependencies (not used here)
				// There could be N of these 2:
				// 		3. h4 that represents one option (right now we expect to only have "Opción 1")
				// 		4. table.table-correlativas with dependencies

				// 1. div with h3 that tells the kind
				let kindTxt = $(elems[i++]).find("> div > h3").text();
				let kind = kindsMapping[kindTxt];
				if (!kind) throw new Error(`Invalid kind ${kindTxt}. responseCont: ${response.cont}`);

				// 2. div.alert_verificar_correlativas that is used to verify dependencies (not used here)
				if (!$(elems[i++]).hasClass("alert_verificar_correlativas")) throw new Error(`Found invalid div in second position. responseCont: ${response.cont}`);

				while (i < elems.length && $(elems[i]).filter("h4").length) {
					// 3. h4 that represents one option (right now we expect to only have "Opción 1")
					let option = $(elems[i++]).filter("h4").text();
					if (option !== "Opción 1") {
						// For now, we only handle "Opción 1"... TODO: Eventually we should support all of them:
						i++;
						continue;
					}

					// 4. table.table-correlativas with dependencies
					$(elems[i++]).filter("table.table-correlativas").find("tr:not(:first)").toArray().forEach(tr => {
						let $tr = $(tr);

						// Some new rows have the following texts: 'Módulo: Maquinas Alternativas y Turbomáquinas'	'Tener 1 actividades aprobadas'
						// TODO for now we are ignoring these, eventually we should support them.
						let dependencyCourse = $tr.find("td:eq(0)").text().trim();
						if (dependencyCourse.startsWith("Módulo: ")) return;

						let groups = /^(.*) \((\d{6})\)$/.exec(dependencyCourse);
						if (!groups) throw new Error(`dependencyCourse couldn't be parsed: ${dependencyCourse}. responseCont: ${response.cont}`);
						// let courseName = groups[1];
						let dependencyCourseCode = groups[2];

						let requirementTxt = $tr.find("td:eq(1)").text().trim();
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
		// Need to wrap contents into parent div as many elements come as first level, and we cannot use querySelector() then.
		let doc = document.createElement("div");
		doc.id = "info_plan";
		doc.innerHTML = responseText;

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
	 * Parses and returns all the student's academic history. Includes courses and final exams (both passed and failed)
	 * @returns {Promise<{courses: [{courseCode: string, isPassed: boolean, grade: number, weightedGrade: number, date: Date}], finalExams: [{courseCode: string, isPassed: boolean, grade: number, weightedGrade: number, date: Date}]}>}
	 */
	async getCoursesHistory() {
		let courses = [];
		let finalExams = [];
		// Use a map to also validate returned types.
		let arrayByTypes = {
			"En curso": courses,
			"Regularidad": courses,
			"Promocion": finalExams,
			"Examen": finalExams,
			"Equivalencia": finalExams,
		};
		const gradeIsPassedTypes = {
			"Promocionado": true,
			"Aprobado": true,
			"Reprobado": false,
			"Ausente": false,
		};
		let workbook = await this.#fetchXlsContents("/autogestion/grado/historia_academica/exportar_xls/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=");
		let sheet = workbook.Sheets["Reporte"];
		if (!sheet) throw new Error(`Workbook does not contain sheet. Sheetnames: ${workbook.SheetNames}`);

		// First 5 rows do not include important data:
		if (sheet.A6.v !== "Fecha") throw new Error(`Invalid sheet data: ${JSON.stringify(XLSX.utils.sheet_to_json(sheet))}`);
		sheet["!ref"] = sheet["!ref"].replace("A1:", "A6:");

		XLSX.utils.sheet_to_json(sheet).forEach(row => {
			let date = this.#parseDate(row["Fecha"]);
			let courseText = row["Actividad"];
			let type = row["Tipo"];
			let gradeText = row["Nota"];
			let gradeIsPassedText = row["Resultado"];

			if (!gradeText || !gradeIsPassedText) return; // Ignore non finished items

			let groups = /(.*) \((\d{6})\)/.exec(courseText);
			if (!groups) throw new Error(`courseText couldn't be parsed: ${courseText}. Row: ${JSON.stringify(row)}`);
			let courseCode = groups[2];

			let arr = arrayByTypes[type];
			if (!arr) throw new Error(`Type not handled: ${type}. Row: ${JSON.stringify(row)}`);

			let grade = parseInt(gradeText) || null;
			let weightedGrade = grade !== null ? this.#getWeightedGrade(date, grade) : null;

			if (typeof gradeIsPassedTypes[gradeIsPassedText] === "undefined") throw new Error(`gradeIsPassedText couldn't be parsed: ${gradeIsPassedText}. Row: ${JSON.stringify(row)}`);
			let isPassed = gradeIsPassedTypes[gradeIsPassedText];

			arr.push({
				courseCode: courseCode,
				isPassed: isPassed,
				grade: grade,
				weightedGrade: weightedGrade,
				date: date,
			});
		});
		return {
			courses: courses,
			finalExams: finalExams,
		};
	}

	/**
	 * Fetches all the current surveys that the user has to take (cannot retrieve the ones that have already been taken)
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	async getProfessorClassesFromSurveys() {
		let responseContents = await this.fetchAjaxGETContents("/autogestion/grado/inicio_alumno");
		let surveysResponseText = this.#parseAjaxPageRenderer(responseContents.cont, "lista_encuestas_pendientes").content;

		let kollaUrls = await Promise.all($(surveysResponseText).find("ul li a").toArray()
			.map(a => a.href)
			.map(async siuUrl => {
				siuUrl += (siuUrl.includes("?") ? "&" : "?") + "terminos_condiciones=true";
				let siuResponse = await this.fetchAjaxGETContents(siuUrl);
				try {
					// Return the kollaUrl
					return $(siuResponse.cont).find("iframe").get(0).src;
				} catch (e) {
					throw new Error(`Could not get kolla url for siuUrl: ${siuUrl}. siuResponse: ${JSON.stringify(siuResponse)}.\n surveysResponseText:${surveysResponseText}`);
				}
			}));
		kollaUrls = kollaUrls.flat();

		let surveys = await Promise.all(kollaUrls.map(async kollaUrl => {
			let kollaResponseText = await backgroundFetch({url: kollaUrl});
			let surveysMetadata = this.parseKollaSurveyForm($(kollaResponseText), kollaResponseText);

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
	 * returns whether the given $kollaDocument represents a survey form that is already completed
	 * @returns boolean
	 */
	kollaSurveyFromCompleted($kollaDocument) {
		// Sometimes the survey is already completed, and it looks like there are 2 types of HTML that represent this
		// first one looks to be when completing at the moment, and second when opening a completed one, which shouldn't
		// really happen as we are only grabbing the pending ones (or forms being completed) but from time to time
		// we get some errors, so we can ignore these. The alert box may contain the following messages:
		// 1. `La encuesta 'Probabilidad y Estadística (950704) - Comisión: Z2017' ya ha sido respondida.`
		// 2. `Gracias por completar la encuesta. Por favor descargá y guardá el comprobante generado. Los códigos allí incluídos se generaron por única vez y serán requeridos si solicitas consultar las respuestas.`
		let alertBoxText = $kollaDocument.find(".alert.alert-success").text().trim();
		return alertBoxText.includes(" ya ha sido respondida.") || alertBoxText.includes("Gracias por completar la encuesta");
	}

	/**
	 * Parses the responseText of the Kolla forms, and returns the survey form data along with the answers.
	 * @returns {[{surveyKind: string, professorRole: string, classCode: string, year: number, courseCode: string, professorName: string, quarter: string, surveyFieldValues: []}]}
	 */
	parseKollaSurveyForm($kollaResponseText, htmlForLog) {
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

		if (this.kollaSurveyFromCompleted($kollaResponseText)) return [];

		// E.g.: 'Simulación (082041) - Comisión: K4053', 'Administración Gerencial (082039) - Comisión: K5054'
		let courseTitle = $kollaResponseText.find(".formulario-titulo").text()
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

		return $kollaResponseText.find(".encuesta").toArray().map(surveyDiv => {
			let $surveyDiv = $(surveyDiv);

			let surveyTitle = $surveyDiv.find(".encuesta-titulo");
			surveyTitle = surveyTitle.text().trim();

			groups = surveyTitleRegex.exec(surveyTitle);
			if (!groups) throw new Error(`surveyTitle couldn't be parsed: ${surveyTitle}. HTML: ${htmlForLog}`);

			let surveyKind = surveyKindsMapping[groups[1]]; // DOCENTE, AUXILIAR
			let quarter = quarterMapping[groups[2]]; // A, 1C, 2C
			let year = parseInt(groups[3]); // 2018, 2019, ...

			let professor = $surveyDiv.find(".encuesta-elemento h3");
			professor = professor.text().trim();

			groups = professorRegex.exec(professor);
			if (!groups) throw new Error(`professor couldn't be parsed: ${professor}. HTML: ${htmlForLog}`);

			let professorName = groups[1].toUpperCase();
			let professorRole = professorRolesMapping[groups[2]]; // TITULAR, ASOCIADO, ADJUNTO, etc.

			let surveyFieldValues = $surveyDiv.find(".panel-info .panel-body .form-group").toArray()
				.map(item => {
					let $item = $(item);
					let $questionLabel = $item.find("> label");

					let question = $questionLabel.text().replace("*", "").trim();
					let value = null;

					let labelFor = $questionLabel.attr("for");
					let $answerElement = $item.find(`[name=${labelFor}]`);
					if ($answerElement.is("textarea")) {
						value = $answerElement.val() || null;
					} else if ($answerElement.is("input")) {
						value = parseInt($answerElement.filter(":checked").parent().text());
						value = isNaN(value) ? null : value;
					} else {
						throw new Error(`Couldn't parse value for question ${question}. Item: ${$item.html()}`);
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
