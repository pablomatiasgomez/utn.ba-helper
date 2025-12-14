'use strict';

import './popup.css';
import {initializeEmbrace} from "./Embrace.js";
import {CUSTOM_PAGES, CustomPages} from "./guarani/custompages/CustomPages.js";

(function () {
	initializeEmbrace("popup");

	function addButtons() {
		const buttonContainer = document.querySelector(".button-container")

		CUSTOM_PAGES.forEach(customPage => {
			const menuItem = document.createElement('button');
			menuItem.className = "button"
			menuItem.onclick = () => {
				chrome.tabs.create({
					// TODO better way?
					url: chrome.runtime.getURL("page.html") + "?" + CustomPages.getCustomPageUrl(customPage).split("?")[1],
				});
			}
			menuItem.innerText = customPage.menuName;
			buttonContainer.appendChild(menuItem);
		});
	}

	document.addEventListener('DOMContentLoaded', addButtons);
})();
