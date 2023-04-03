const { resolve } = require('path');
const customLoaders = require('./custom-loaders');

module.exports = (config) => ({
	entry: {
		'babel-polyfills': '@babel/polyfill',
		'teamatical-app': resolve(__dirname, '../boot'),
	},
	resolveLoader: {
		// You can add your own custom loaders inside the `custom-loaders` directory
		// you don't need to include them anywhere, as they will automatically be included
		// e.g. The `minify-template.loader.js` is automatically loaded as `minify-template-loader`
		alias: customLoaders,
	},
	resolve: {
		extensions: ['.ts', '.js', '.css', '.html', '.json', '.less' ],
		modules: [
			resolve(__dirname, '../..',  'node_modules'),
			resolve(__dirname, '../..', 'bower_components'),
		],
	},
	module: {
		rules: [
		],
	},
});
