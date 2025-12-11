const path = require('path');
const webpack = require('webpack');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = {
  eslint: {
    enable: false
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      );

      webpackConfig.resolve.symlinks = false;

      // Custom source directory resolution
      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'src/application'),
        path.resolve(__dirname, 'src/core'),
        path.resolve(__dirname, 'src'),
        'node_modules'
      ];

      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js'
        })
      );

      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer']
        })
      );

      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      });

      // Essential Node.js polyfills for browser
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        util: require.resolve('util/'),
        vm: require.resolve('vm-browserify'),
      };

      webpackConfig.ignoreWarnings = [
        (warning) =>
          warning.message.includes('Failed to parse source map') &&
          warning.module &&
          warning.module.resource &&
          (warning.module.resource.includes('@fast-csv/parse') ||
            warning.module.resource.includes('react-datasheet-grid') ||
            warning.module.resource.includes('ace-builds/src-noconflict/worker-coffee.js'))
      ];

      webpackConfig.output = {
        ...webpackConfig.output,
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].js'
      };

      webpackConfig.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'static/js/[name].[contenthash].worker.js'
          }
        }
      });

      const appOrSrcLoader = webpackConfig.module.rules
        .find((rule) => Array.isArray(rule.oneOf))
        ?.oneOf.find(
          (rule) =>
            rule.loader && rule.loader.includes('babel-loader') && rule.include === paths.appSrc
        );

      if (appOrSrcLoader) {
        appOrSrcLoader.test = /\.(js|mjs|jsx|ts|tsx)$/;
        console.log('Found and set test for app babel-loader rule.');
      } else {
        console.error(
          "CRITICAL ERROR: Could not find app babel-loader rule to set 'test' property."
        );
      }

      const dependencyLoader = webpackConfig.module.rules
        .find((rule) => Array.isArray(rule.oneOf))
        ?.oneOf.find(
          (rule) =>
            rule.loader &&
            rule.loader.includes('babel-loader') &&
            rule.exclude &&
            typeof rule.exclude === 'object' &&
            Object.keys(rule.exclude).length === 0
        );

      if (dependencyLoader) {
        dependencyLoader.test = /\.(js|mjs|jsx|ts|tsx)$/;
        console.log('Found and set test for dependency babel-loader rule.');
      } else {
        console.warn(
          "WARNING: Could not find dependency babel-loader rule to set 'test' property. This might be fine if only appSrc is problematic."
        );
      }

      return webpackConfig;
    }
  },
  babel: {
    presets: [
      ['@babel/preset-env', {
        modules: false,
        useBuiltIns: 'entry',
        corejs: 3
      }],
      ['@babel/preset-react', { runtime: 'automatic' }]
    ],
    plugins: [
      ['@babel/plugin-proposal-nullish-coalescing-operator', { loose: true }],
      ['@babel/plugin-proposal-optional-chaining', { loose: true }],
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      ['@babel/plugin-proposal-private-methods', { loose: true }]
    ],
  }
};
