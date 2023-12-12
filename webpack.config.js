const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        path: path.join(__dirname, "/dist"),
        filename: 'spl-token-metadata.js',
        library: 'SplTokenMetadata',
        libraryTarget: 'umd',
        globalObject: 'this',
        umdNamedDefine: true,
    },
};