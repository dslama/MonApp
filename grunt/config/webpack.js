const path = require('path');
const FilterBox = require('@warp-works/warpjs-filter-box');
const warpjsUtils = require('@warp-works/warpjs-utils');
const webpack = require('webpack');
const WebpackVisualizer = require('webpack-visualizer-plugin');

const constants = require('./../../server/edition/constants');
const rootDir = path.dirname(require.resolve('./../../package.json'));

module.exports = {
    build: {
        target: 'web',
        devtool: 'source-map',
        entry: {
            [constants.entryPoints.domains]: './client/edition/domains/index.js',
            [constants.entryPoints.domain]: './client/edition/domain/index.js',
            [constants.entryPoints.domainTypes]: './client/edition/domain-types/index.js',
            [constants.entryPoints.instances]: './client/edition/instances/index.js',
            [constants.entryPoints.instance]: './client/edition/instance/index.js',
            [constants.entryPoints.orphans]: './client/edition/orphans/index.js',
            [constants.entryPoints.portal]: './client/portal/instance/index.js'
        },
        externals: {
            'jquery': 'jQuery',
            'tinymce': 'tinyMCE',
            'react': 'React',
            'react-dom': 'ReactDOM',
            'react-bootstrap': 'ReactBootstrap',
            'react-redux': 'ReactRedux'
        },
        node: {
            fs: 'empty'
        },
        output: {
            path: `${rootDir}/public/app`,
            filename: '[name].min.js'
        },
        resolve: {
            extensions: [ '.jsx', '.js' ]
        },
        plugins: [
            new webpack.EnvironmentPlugin({
                NODE_ENV: 'production',
                DEBUG: false
            }),

            new WebpackVisualizer({
                filename: './../../reports/webpack-visualizer.html'
            }),

            new webpack.optimize.CommonsChunkPlugin({
                names: 'vendor',
                minChunks: (module) => module.context && module.context.indexOf('node_modules') !== -1
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: false,
                sourceMap: true,
                output: {
                    ascii_only: true
                }
            })
        ],
        module: {
            loaders: [
                {
                    test: /\.jsx?$/,
                    loader: 'babel-loader'
                },
                {
                    test: /\.hbs$/,
                    loader: 'handlebars-loader',
                    query: {
                        helperDirs: [
                            warpjsUtils.getHandlebarsHelpersDir()
                        ],
                        partialDirs: [
                            path.join(rootDir, 'client', 'partials'),
                            warpjsUtils.getHandlebarsPartialsDir(),
                            FilterBox.templatesDir
                        ]
                    }
                }
            ]
        }
    }
};
