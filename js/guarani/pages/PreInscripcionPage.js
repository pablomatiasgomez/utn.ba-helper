let PreInscripcionPage = function (utils, apiConnector) {

	let parsePeriodTxt = function (periodTxt) {
		const quarterMappings = {
			"Anual": "A",
			"Primer Cuatrimestre": "1C",
			"Segundo Cuatrimestre": "2C",
		};
		const yearAndQuarterRegex = new RegExp(`^Grado (${Object.keys(quarterMappings).join("|")}) (\\d{4})$`);
		let groups = yearAndQuarterRegex.exec(periodTxt);
		if (!groups) throw `Class period couldn't be parsed: ${periodTxt}`;
		let quarter = quarterMappings[groups[1]];
		let year = parseInt(groups[2]);
		return {
			quarter: quarter,
			year: year,
		};
	};

	let parseBranch = function (branchTxt) {
		const mapping = {
			"Medrano": "MEDRANO",
			"Campus": "CAMPUS",
		};
		let branch = mapping[branchTxt];
		if (!branch) throw `Branch txt couldn't be parsed: ${branchTxt}`;
		return branch;
	};

	let addPreviousProfessorsInfo = function (courseOptionsData) {
		let optionId = 0;
		let optionDetails = [];
		let previousProfessorsRequest = $("#comision option").toArray()
			.map(option => {
				let $option = $(option);
				let classData = courseOptionsData[$option.val()];
				if (!classData) return null;

				// Set a optionId in the option text to identify in the table that is added later.
				optionId++;
				optionDetails.push($option.text());
				$option.text(`(${optionId})` + $option.text());

				let period = parsePeriodTxt(classData.periodo_nombre); // TODO define a common place to parse things, and move all of that out of Utils? (and PagesDataParser)
				let branch = parseBranch(classData.ubicacion_nombre);
				let schedules = utils.getSchedulesFromArray(classData.horas_catedra);
				return {
					year: period.year,
					quarter: period.quarter,
					classCode: classData.comision_nombre,
					courseCode: classData.actividad_codigo,
					branch: branch,
					schedules: schedules,
				};
			})
			.filter(req => !!req);

		// Returns a List that corresponds one to one with the request list, with maps that represent: year -> classCode (the new one) -> List of professors
		return apiConnector.getPreviousProfessors(previousProfessorsRequest).then(response => {
			$("#insc_alternativas .inscripcion-alternativa").before(`
				<div class="utnba-helper">
					<div class="alert info">
						<h3 style="text-align: center;">UTN.BA HELPER - Información importante</h3>
						<p><b>La informacion sobre profesores anteriores es provista por el "UTN.BA Helper" y no es parte del sistema de la UTN.</b></p>
						<p>La intencion de esta tabla es, en base a datos colectados por el "UTN.BA Helper", intentar predecir que profesor va a estar en cada cursada, basandonos en los profesores que estuvieron en cursadas anteriores.
						<p>Para cada horario presentado en el combo de abajo, se muestra un item en la tabla, que puede ser identificado por el ID que es agregado al texto de cada opcion, y que es mostrado en cada fila de la tabla.</p>
					</div>
					<table><tbody><tr><th>ID</th><th>Detalle</th><th>Profesores en años anteriores</th></tr></tbody></table>
					<hr>
				</div>
			`);
			let $tbody = $("#insc_alternativas .utnba-helper tbody");

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
				let details = optionDetails[i].split("|").map(t => t.trim()).join("<br>");
				$tbody.append(`<tr><td>(${optionId})</td><td>${details}</td><td>${content}</td></tr>`);
			}
		});
	};

	// Init
	return Promise.resolve().then(() => {
		return $.ajax(location.href);
	}).then(responseText => {
		let response = JSON.parse(responseText);
		if (response.cod !== "1") throw `Invalid ajax contents ${responseText}`;

		let currentCourseOptionsData = response.agenda.comisiones;
		addPreviousProfessorsInfo(currentCourseOptionsData);

		// Once the alternatives start to be assigned, the combo and everything is reloaded so we need to render it again.
		// Given that handling this is somewhat difficult as the user may navigate many different courses, for now we reload the page :(
		utils.attachEvent("comision_preinscripta", () => location.reload());
		utils.attachEvent("comision_despreinscripta", () => location.reload());
	});
};
