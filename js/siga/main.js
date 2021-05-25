(function () {
	// We only will handle pages if the user is logged in, and has access to student's stuff, so we check:
	// - For normal pages:
	//   - Student name is present, which means they are logged in.
	//   - Alu tab exists, which means has access to student's stuff.
	// - For popups:
	//   - The url starts with /alu
	let isInNormalPage = $(".pfx-user").length && $("#page-alu").length;
	let isInAluPage = window.location.pathname.startsWith("/alu");
	if (!isInNormalPage && !isInAluPage) return;

	let handler = null;

	let utils = new Utils();
	let apiConnector = new ApiConnector();
	let pagesDataParser = new PagesDataParser(utils, apiConnector);
	let dataCollector = new DataCollector(pagesDataParser, apiConnector);
	let customPages = new CustomPages(pagesDataParser, utils, apiConnector);

	if (isInNormalPage) {
		customPages.appendMenu();
		let customPageHandler = customPages.getSelectedPageHandler();
		if (customPageHandler) {
			// The user is in a custom page, so we assign the handler
			handler = customPageHandler;
		}
	}

	const PAGE_HANDLERS = {
		"/alu/horarios.do": () => HorariosPage(utils),
		"/alu/acfin.do": () => ActasDeFinalesPage(pagesDataParser, dataCollector, utils),
		"/alu/preins.do": () => PreInscripcionPage(pagesDataParser, utils),
		"/alu/preinscolas.do": () => PreInscripcionPopUpPage(utils, apiConnector),
		"/alu/encdocpop.do": () => EncuestaDocentePopUpPage(dataCollector),
	};

	handler = handler || PAGE_HANDLERS[window.location.pathname];

	handler && handler().catch(e => {
		console.error("Error when handling page " + window.location.pathname, e);
		return apiConnector.logMessage("Handle page " + window.location.pathname, true, utils.stringifyError(e));
	});

	if (isInNormalPage) {
		// At this point the user should be logged in so we can proceed with data collection.
		pagesDataParser.getStudentId().then(studentId => {
			$(".pfx-user")
				.append(`<div style="font-size: 13px;">Legajo: ${studentId}</div>`)
				.append("<span class='powered-by-siga-helper'></span>");
		}).catch(e => {
			console.error("Error while adding studentId to header", e);
			if (!(e instanceof LoggedOutError)) {
				return apiConnector.logMessage("addStudentIdToHeader", true, utils.stringifyError(e));
			}
		}).then(() => {
			return dataCollector.collectBackgroundDataIfNeeded();
		}).catch(e => {
			console.error("Error while collecting background data", e);
			if (!(e instanceof LoggedOutError)) {
				return apiConnector.logMessage("collectBackgroundDataIfNeeded", true, utils.stringifyError(e));
			}
		});
	}

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
