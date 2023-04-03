const ENV = 'production'
const config = require('./app.config')(true)
const baseConfig = require('./base-admin.config')
const os = require('os')
const cores = os.cpus().length
console.log(`CPU cores: ${cores}`)

const { merge } = require('webpack-merge')
const { resolve } = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const htmlminify = require('html-minifier').minify
const jsonminify = require('jsonminify')
const terserPlugin = require('terser-webpack-plugin')
const terser = require('terser')
const { InjectManifest: InjectManifestPlugin } = require('workbox-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const terserOptions = {
	ecma: undefined,
	parse: {
	},
	compress: {
	},
	mangle: true, // Note `mangle.properties` is `false` by default.
	module: false,
}




module.exports = merge(baseConfig(config), {
	
	mode: ENV,

	output: {
		filename: '[name].[contenthash].js',
		chunkFilename: 'components/[name].[contenthash].js',
		path: resolve(__dirname, '../..', config.outputAdminDir, config.app.version),
		publicPath: 'admin/build/' + config.app.version + '/',
	},

	cache: false,
	
	devtool: false,
	
	// We need to provide our own UglifyJS plugin to provide a custom configuration
	optimization: {
		minimize: true,
		minimizer: [new terserPlugin({
			test: /\.js(\?.*)?$/i,
			terserOptions: terserOptions,
			parallel: cores,
			extractComments: "all",
		})],
	},
	
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
						minimize: true,
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
		new CleanWebpackPlugin({ 
			verbose: true, 
			cleanOnceBeforeBuildPatterns: [resolve(__dirname, '../..', config.outputAdminDir)],
			dangerouslyAllowCleanPatternsOutsideProject: true,
			dry: false
		}),

		
		// copy custom static assets
		new CopyWebpackPlugin({
			patterns: [
				//Static
				{
					from: resolve(__dirname, '../static/'),
					to: '.',
					transform(content, absoluteFrom) 
					{
						var fn = absoluteFrom.replace(resolve(__dirname, '../static/'), 'static')

						let pattJSON = /.+\.json$/gi; // filter json file
						if (pattJSON.test(fn))
						{
							console.log(fn, '>>> json minify')
							return jsonminify(content.toString())
						}

						let pattHTML = /.+\.html$/gi; // filter html file
						if (pattHTML.test(fn))
						{
							console.log(fn, '>>> html minify')
							let fcont = content.toString()
							// fcont = fcont.replace("\"/babel-polyfills.js\"", "\"/babel-polyfills." + "hash123" + ".js\"")
							// fcont = fcont.replace("\"/teamatical-app.js\"", "\"/teamatical-app." + "hash123" + ".js\"")
							return htmlminify(fcont, {
								collapseWhitespace: true,
								removeComments: true,
								removeOptionalTags: true,
								removeRedundantAttributes: true,
								removeScriptTypeAttributes: true,
								removeTagWhitespace: true,
								useShortDoctype: true,
								minifyCSS: true,
								minifyJS: true,
							})
						}

						let pattJS = /.+(\.js|\.min\.js)$/gi; // filter JS file
						if (pattJS.test(fn))
						{
							let pattJSMIN = /.+(\.min\.js|webcomponents-loader-inline\.js)$/gi; // filter MIN JS file
							if (pattJSMIN.test(fn))
							{
								console.log(fn, '>>> min.js skip ... ')
								return content
							}
							// else
							// {
							// 	console.log(fn, '>>> js minify')
							// 	var min = terser.minify(content.toString(), terserOptions)
							// 	console.log(min)
							// 	// return min?.code ? min.code.toString() : content.toString()
							// 	return content.toString()
							// }
						}

						console.log('optimization is required - ', fn)
						return content
					},
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
		
		new InjectManifestPlugin({
			swSrc: resolve(__dirname, '../service-worker.js'),
			swDest: resolve(__dirname, '../..', config.outputAdminDir, 'service-worker.js'),
			exclude: [
				/\.map$/,
				/manifest$/,
				/service-worker\.js$/,
				/service-worker-admin\.js$/,
				/.+\.LICENSE\.txt$/,
				/locales\/.+$/,
			],
		}),

		...config.bundleAnalyzer.enabled ? [new BundleAnalyzerPlugin({
			analyzerHost: 'localhost',
			// analyzerPort: config.bundleAnalyzer.port,
		})] : [],
	],

});
