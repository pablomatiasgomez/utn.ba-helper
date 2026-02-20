export class InscripcionAExamenesPage {
	#errorMessageSelector = document.querySelector('#lista_materias > div.alert.info.strong');

	#replaceMessageIfExists() {
		if (this.#errorMessageSelector) {
			const textChild = document.createTextNode(" o haciendo click ")
			const redirectLink = document.createElement('a')
			redirectLink.href = "/autogestion/grado/datos_censales"
			redirectLink.textContent = "AQUÍ"

			this.#errorMessageSelector.appendChild(textChild)
			this.#errorMessageSelector.appendChild(redirectLink)
		}
	}

	async init() {
		this.#replaceMessageIfExists();
	}

	close() {
	}
}
