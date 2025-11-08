'use strict';

const {merge} = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
	merge(common, {
		entry: {
			main: PATHS.src + '/js/guarani/main.js',
			"main-kolla": PATHS.src + '/js/guarani/main-kolla.js',
			background: PATHS.src + '/js/background.js',
		},
		devtool: argv.mode === 'production' ? false : 'source-map',
	});

module.exports = config;
