'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const PATHS = {
	src: path.resolve(__dirname, './src'),
	build: path.resolve(__dirname, './build'),
};

module.exports = {
	entry: {
		"guarani/main": PATHS.src + '/guarani/main.js',
		"guarani/main-kolla": PATHS.src + '/guarani/main-kolla.js',
		"guarani/foreground": PATHS.src + '/guarani/foreground.js',
		"background": PATHS.src + '/background.js',
	},
	output: {
		path: PATHS.build,
		filename: '[name].js',
	},
	devtool: 'source-map',
	stats: {
		all: false,
		errors: true,
		builtAt: true,
		assets: true,
	},
	module: {
		rules: [
			{
				// Help webpack in understanding CSS files imported in .js files
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
	},
	plugins: [
		// Copy static assets from `public` folder to `build` folder
		new CopyWebpackPlugin({
			patterns: [
				{
					from: '**/*',
					context: 'public',
				},
			],
		}),
		// Extract CSS into separate files
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
	],
};