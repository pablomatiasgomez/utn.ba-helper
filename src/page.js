'use strict';

import './page.css';

import {initializeEmbrace} from "./Embrace.js";
import {ApiConnector} from "./ApiConnector.js";
import {Utils} from "./guarani/Utils.js";
import {Store} from "./guarani/Store.js";
import {PagesDataParser} from "./guarani/PagesDataParser.js";
import {DataCollector} from "./guarani/DataCollector.js";
import {CustomPages} from "./guarani/custompages/CustomPages.js";

(function () {
	initializeEmbrace("page");

	let apiConnector = new ApiConnector();
	let utils = new Utils(apiConnector);

	utils.runAsync("page", () => {
		let store = new Store();
		let pagesDataParser = new PagesDataParser(utils);
		let dataCollector = new DataCollector(store, pagesDataParser, apiConnector);
		let customPages = new CustomPages(pagesDataParser, dataCollector, utils, apiConnector);
		return customPages.getSelectedPageHandler()().init();
	});

})();
