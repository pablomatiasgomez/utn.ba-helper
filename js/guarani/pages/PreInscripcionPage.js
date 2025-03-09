if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.PreInscripcionPage = function (pagesDataParser, utils, apiConnector) {

	let addClassSchedulesFilter = function () {
		let branches = new Set();
		let schedules = new Set();
		let yearQuarters = new Set();

		// Collect all combinations for each of the filters:
		Array.from(document.querySelector('#comision').options).forEach(option => {
			let values = option.text.split("|");
			if (values.length !== 3) return;
			branches.add(values[0].trim());
			values[1].trim().split(",").map(day => day.trim().split(" ")[0]).forEach(schedule => schedules.add(schedule.trim()));
			yearQuarters.add(values[2].trim());
		});

		let createFilterOptions = opts => {
			return Array.from(opts).map(opt => `
				<input type="checkbox" checked id="${opt}" value="${opt}">
				<label for="${opt}">${opt}</label>
			`).join(" | ");
		}

		// Adds the checkboxes html
		document.querySelector('#insc_alternativas .utnba-helper .filters').insertAdjacentHTML("beforeend", `
			<div class="filter">
				<span style="font-weight: bold;">Sede: </span>
				${createFilterOptions(branches)}
			</div>
			<div class="filter">
				<span style="font-weight: bold;">Cuatrimestre: </span>
				${createFilterOptions(yearQuarters)}
			</div>
			<div class="filter">
				<span style="font-weight: bold;">Turno: </span>
				${createFilterOptions(schedules)}
			</div>
			<a href="#" class="btn btn-info btn-small">Filtrar</a>
		`);

		$("#insc_alternativas .utnba-helper .filters a").on("click", function () {
			// For all the filter types (branches, schedules, yearQuarter) at least one option of each has to match.
			Array.from(document.querySelector('#comision').options).forEach((option, i) => {
				if (i === 0) {
					// Force select first option and keep it visible
					document.querySelector('#comision').value = option.value;
					return;
				}
				let visible = Array.from(document.querySelectorAll("#insc_alternativas .utnba-helper .filters .filter")).every(filter => {
					return Array.from(filter.querySelectorAll("input:checked")).some(filterOpt => option.text.includes(filterOpt.value));
				});

				let optionId = option.getAttribute("data-option-id");
				// hide or show both the option and the row in the previous professors table:
				if (visible) {
					option.removeAttribute("hidden");
					document.querySelector(`#insc_alternativas .utnba-helper .previous-professors tbody tr[data-option-id='${optionId}']`).removeAttribute("hidden");
				} else {
					option.setAttribute("hidden", "");
					document.querySelector(`#insc_alternativas .utnba-helper .previous-professors tbody tr[data-option-id='${optionId}']`).setAttribute("hidden", "");
				}
			});
			return false;
		})
	}

	let addPreviousProfessorsTable = function () {
		return Promise.resolve().then(() => {
			return fetchCourseAlternatives();
		}).then(courseOptionsData => {
			return renderPreviousProfessorsTable(courseOptionsData);
		});
	};

	let fetchCourseAlternatives = function () {
		return Promise.resolve().then(() => {
			// Avoid using cache as the endpoint is always the same but the student may register or unregister from the course.
			return pagesDataParser.fetchAjaxGETContents(location.href, false);
		}).then(response => {
			// `comisiones` may include the current class schedules. This is not a problem because we access the array by id.
			// But we could eventually filter them out by using the `cursadas` array if we confirm it
			return response.agenda.comisiones;
		});
	};

	let renderPreviousProfessorsTable = function (courseOptionsData) {
		let optionId = 0;
		let optionDetails = [];
		let previousProfessorsRequest = $("#comision option").toArray()
			.map(option => {
				let $option = $(option);
				let classData = courseOptionsData[$option.val()];
				if (!classData) return null;

				let classSchedule = pagesDataParser.mapClassDataToClassSchedule(classData);

				// Set a optionId in the option text to identify in the table that is added later.
				optionId++;
				optionDetails.push($option.text().split("|").map(t => t.trim()).join("<br>") + "<br>" + classSchedule.classCode);
				$option.text(`(${optionId}) | ${$option.text()} | ${classSchedule.classCode}`);
				$option.attr("data-option-id", optionId);

				return classSchedule;
			})
			.filter(req => !!req);

		// Returns a List that corresponds one to one with the request list, with maps that represent: year -> classCode (the new one) -> List of professors
		return apiConnector.getPreviousProfessors(previousProfessorsRequest).then(response => {
			let $tbody = $("#insc_alternativas .utnba-helper .previous-professors tbody");

			for (let i = 0; i < response.length; i++) {
				let previousProfessors = response[i];
				optionId = i + 1;

				let content = `<ul class="no-margin">`;
				Object.entries(previousProfessors)
					.sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
					.forEach(classesByYear => {
						let year = classesByYear[0];
						content += `<li>${year}<ul class="no-margin">`;
						Object.entries(classesByYear[1])
							.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
							.forEach(professorsByClass => {
								let newClassCode = professorsByClass[0];
								content += `<li>${newClassCode}<ul class="no-margin">`;
								professorsByClass[1].forEach(professor => {
									content += utils.getProfessorLi(professor);
								});
								content += `</ul></li>`;
							});
						content += `</ul></li>`;
					});
				content += `</ul>`;
				$tbody.append(`<tr data-option-id="${optionId}"><td>(${optionId})</td><td>${optionDetails[i]}</td><td>${content}</td></tr>`);
			}
		});
	};


	let addPreviousProfessorsTableEventFn;
	let addPreviousProfessorsTableEventWithDelayFn;
	return {
		init: function () {
			return Promise.resolve().then(() => {
				// Need to listen to course register changes, as the combo is reloaded, and we need to add the table again.
				// We need to un register them on close, as changing a course will trigger a new PreInscripcionPage.
				// Events triggered from foreground script:
				addPreviousProfessorsTableEventFn = () => {
					let alternativesDiv = document.querySelector("#insc_alternativas .inscripcion-alternativa");
					if (!alternativesDiv) return; // There may be no div if for example the alternative already has a selected option.
					alternativesDiv.insertAdjacentHTML("beforebegin", `
						<div class="utnba-helper">
							<div class="alert info">
								<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
								<p><b>La información sobre profesores anteriores es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</b></p>
								<p>La intención de esta tabla es, en base a datos colectados por el "UTN.BA Helper", intentar predecir que profesor va a estar en cada cursada, basándonos en los profesores que estuvieron en cursadas anteriores.
								<p>Para cada horario presentado en el combo de abajo, se muestra un item en la tabla, que puede ser identificado por el ID que es agregado al texto de cada opción, y que es mostrado en cada fila de la tabla.</p>
							</div>
							<div class="filters">
								<h3 id="titulo">Filtros</h3>
							</div>
							<div class="previous-professors">
								<h3 id="titulo">Profesores en años anteriores</h3>
								<table><tbody><tr><th>ID</th><th>Detalle</th><th>Profesores en años anteriores</th></tr></tbody></table>
							</div>
							<hr>
						</div>
					`);
					utils.runAsync("addClassSchedulesFilter", addClassSchedulesFilter);
					utils.runAsync("addPreviousProfessorsTable", addPreviousProfessorsTable);
				};
				addPreviousProfessorsTableEventWithDelayFn = () => setTimeout(addPreviousProfessorsTableEventFn, 500);

				window.addEventListener("__utn_ba_event_comision_preinscripta", addPreviousProfessorsTableEventFn);
				window.addEventListener("__utn_ba_event_comision_despreinscripta", addPreviousProfessorsTableEventFn);
				window.addEventListener("__utn_ba_event_setear_comisiones_insc_alternativa", addPreviousProfessorsTableEventWithDelayFn);
				return addPreviousProfessorsTableEventFn();
			});
		},
		close: function () {
			window.removeEventListener("__utn_ba_event_comision_preinscripta", addPreviousProfessorsTableEventFn);
			window.removeEventListener("__utn_ba_event_comision_despreinscripta", addPreviousProfessorsTableEventFn);
			window.removeEventListener("__utn_ba_event_setear_comisiones_insc_alternativa", addPreviousProfessorsTableEventWithDelayFn);
		},
	};
};
