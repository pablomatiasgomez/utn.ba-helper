let EncuestaDocentePopUpPage = function (dataCollector) {

	let addPosText = function () {
		$("#postexto").before(`
			<div id="postexto">
				<div>
					<h3 style="text-align: center;">SIGA HELPER - Información importante</h3>
					<p>Al enviar las respuestas, estas seran tambien enviadas anonimamente al SIGA Helper para luego poder provistas en la sección de "Buscar profesores".</p>
				</div>
			</div>`);
	};

	return Promise.resolve().then(() => {
		addPosText();
	}).then(() => {
		// Mark the surveys to be collected any time the user enters to fill/change any of them.
		return dataCollector.markSurveysToBeCollected();
	});
};
