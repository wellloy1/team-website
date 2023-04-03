// Use this file to setup your app settings
// Each variable in this configuration can either be directly modified here, or passed
// with the corresponding environment variable
// The environment variables have this format:
// SECTION_SNAKE_CASE_VARIABLE
// e.g. app.basePath => APP_BASE_PATH
// You can also change the behavior of this configuration using the `production` variable,
// that is `true` when the file is used in a production environment (i.e. when called by `webpack.prod.conf.js`)
// and `false` when it's used in a development environment (i.e. when called by `webpack.dev.conf.js`)

// `typify-env` is an helper that converts env variables to their real type
// (true/false get converted to booleans, etc.)
const env = require('./typify-env')(process.env);

module.exports = (production) => ({
  production,

  // The output directory of your built project,
  // relative to the project dir.
  // e.g. The default value will output your project to
  // <project dir>/build directory
  outputDir: env.OUTPUT_DIR || 'wwwroot/build',
  outputAdminDir: env.OUTPUT_DIR || 'wwwroot/admin/build',

  app: {
    // The base path of your app.
    // It should ALWAYS start and end with a slash (unless it is just a slash, of course)
    // Note that changing this will also affect webpack dev server path
    basePath: env.APP_BASE_PATH || '/',

    // Your application name.
    // This will be used as the default title of your index
    name: env.APP_NAME || 'Teamatical',

    version: '1.0.0',

    // Your application description.
    // This will be used as your description meta tag
    description: env.APP_DESCRIPTION || 'Teamatical.com Sportswear Store',

    // Whether to transpile the app for older browsers or not.
    transpile: env.APP_TRANSPILE || false,

    // Whether to autoprefix the css rules for the app based on you "browserslist"
    // field in package.json.
    // By default, your app will be autoprefixed when in production mode
    autoprefix: env.APP_AUTOPREFIX || production,
  },

  // Webpack bundle analyzer settings
  bundleAnalyzer: {
    // Set this flag to true to enable the analyzer
    enabled: env.BUNDLE_ANALYZER_ENABLED || false,

    // The port where webpack bundle analyzer should serve its output
    port: env.BUNDLE_ANALYZER_PORT || 8081,
  },

  // You can also add your custom variables here to pass them to your webpack configurations and to your website index
});
