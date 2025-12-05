import path from 'node:path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __dirname = import.meta.dirname;

const PATHS = {
	src: path.resolve(__dirname, './src'),
	build: path.resolve(__dirname, './build'),
};

// noinspection JSUnusedGlobalSymbols
export default {
	entry: {
		"guarani/main": PATHS.src + '/guarani/main.js',
		"guarani/main-kolla": PATHS.src + '/guarani/main-kolla.js',
		"guarani/foreground": PATHS.src + '/guarani/foreground-script.js',
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
