(function () {
	// Used in all pages to know when we navigate through the app
	window.history.pushState = (f => function pushState() {
		f.apply(this, arguments); // pushState returns void so no need to return value.
		window.dispatchEvent(new Event("locationchange"));
	})(window.history.pushState);

	window.history.replaceState = (f => function replaceState() {
		f.apply(this, arguments); // replaceState returns void so no need to return value.
		window.dispatchEvent(new Event("locationchange"));
	})(window.history.replaceState);

	window.addEventListener('popstate', () => {
		window.dispatchEvent(new Event("locationchange"));
	});

	//------------

	// Events used in PreInscriptionPage:
	kernel.evts.escuchar("comision_preinscripta", e => window.dispatchEvent(new CustomEvent("__utn_ba_event_comision_preinscripta", {detail: e})), true);
	kernel.evts.escuchar("comision_despreinscripta", e => window.dispatchEvent(new CustomEvent("__utn_ba_event_comision_despreinscripta", {detail: e})), true);
	kernel.evts.escuchar("setear_comisiones_insc_alternativa", e => window.dispatchEvent(new CustomEvent("__utn_ba_event_setear_comisiones_insc_alternativa", {detail: e})), true);

})();
