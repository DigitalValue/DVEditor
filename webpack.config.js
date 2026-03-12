const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname),
        filename: 'test-bundle.js',
        library: {
            name: 'DVEditor',
            type: 'umd'
        },
        globalObject: 'this'
    },
    resolve: {
        modules: ['node_modules']
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    externals: {
        mithril: 'm'
    },
    mode: 'production'
};
