/**
 * Removes the existent "powered by banner", if any.
 */
export function removePoweredByUTNBAHelper() {
	document.querySelector(".powered-by-utnba-helper")?.remove();
}

/**
 * Appends the "powered by banner", unless it already exists.
 */
export function addPoweredByUTNBAHelper() {
	if (!!document.querySelector(".powered-by-utnba-helper")) return;
	document.querySelector(".user-navbar").closest(".row-fluid")
		.insertAdjacentHTML('afterbegin', `<a class="powered-by-utnba-helper" href="https://chromewebstore.google.com/detail/utnba-helper-ex-siga-help/jdgdheoeghamkhfppapjchbojhehimpe" target="_blank">POWERED BY UTN.BA HELPER</a>`);
}
