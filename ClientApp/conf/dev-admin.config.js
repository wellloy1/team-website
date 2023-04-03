const ENV = 'development'
const config = require('./app.config')(false)
const baseConfig = require('./base-admin.config')
const { resolve, join } = require('path')
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
//const { CheckerPlugin } = require('ts-loader')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin


module.exports = merge(baseConfig(config), {
	mode: ENV,
	
	output: {
		filename: '[name].js',
		chunkFilename: 'components/[name].[contenthash].js',
		path: resolve(__dirname, '../..', config.outputAdminDir),
		publicPath: 'admin/build/',
	},

	devServer: {
		headers: {
			'X-WEBPACK-DEV': 'APP',
		},
		static: {
			directory: resolve(__dirname, '../..', 'wwwroot'),
		},
		client: false,
		compress: true,
		host: 'localhost',
		port: 8071,
	},

	cache: { 
		type: 'filesystem',
    	cacheDirectory: resolve(__dirname, '..', '.temp_cache-admin'),
	},

	devtool: 'inline-source-map',

	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [
					{ 
						loader: 'raw-loader' 
					},
				],
			},
			{
				test: /\.less$/i,
				use: [
					{ 
						loader: 'raw-loader' 
					},
					{ 
						loader: 'less-loader',
						options: {
							lessOptions: {
								rewriteUrls: 'off',
								noIeCompat: true,
							},
						},
					},
				],
			},
			{ 
				test: /\.html$/, 
				use: {
					loader: 'html-loader', 
					options: {  
						// exportAsEs6Default: true, 
					},
				}, 
			},
			{ 
				test: /\.ts$/, 
				use: {
					loader: 'ts-loader',
					options: {  
						// exportAsEs6Default: true,
						//forceIsolatedModules: true,
						//useCache: true,
						transpileOnly: true
					},
				}, 
				exclude: "/node_modules/",
			},
		],
	},

	plugins: [
		new CleanWebpackPlugin({ verbose: true, }),

		// copy custom static assets
		new CopyWebpackPlugin({
			patterns: [
				{
					from: resolve(__dirname, '../static/'),
					to: '.',
				},

				// Custom Elements ES5 adapter
				{
					from: resolve(__dirname, '../../node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js'),
					to: './webcomponentsjs',
					flatten: true,
				},

				// WebComponents Polyfills
				{
					from: resolve(__dirname, '../../node_modules/@webcomponents/webcomponentsjs/bundles'),
					to: './webcomponentsjs/bundles',
					flatten: true,
				},
			],
			options: {
				concurrency: 100,
			},
		}),

		// new CheckerPlugin(),

		...config.bundleAnalyzer.enabled ? [new BundleAnalyzerPlugin({
			analyzerHost: 'localhost',
			// analyzerPort: config.bundleAnalyzer.port,
		})] : [],
	],

})
