let EncuestaDocentePopUpPage = function (dataCollector) {

	let changeAnchorAction = function () {
		// There should be 2 buttons to save responses, we modify both:
		$(".std-canvas .center > a").on("click", function() {
			return dataCollector.markSurveysToBeCollected();
		})
	};

	return Promise.resolve().then(() => {
		changeAnchorAction();
	});
};
