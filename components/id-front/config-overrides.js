/* eslint-disable import/no-commonjs */
const paths = require('react-scripts/config/paths');
const path = require('path');

paths.appSrc = path.resolve(__dirname, 'src');
paths.appIndexJs = path.resolve(__dirname, 'src/index.js');

const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
                "crypto": require.resolve("crypto-browserify"),
                "os": require.resolve("os-browserify/browser"),
                "https": require.resolve("https-browserify"),
                "buffer": require.resolve("buffer"),
                "stream": require.resolve("stream-browserify"),
                "util": require.resolve("util"),
                "process": require.resolve("process/browser"),
                "events": require.resolve("events/")
            };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  );

  return config;
}