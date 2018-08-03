const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
    entry: {
        polyfill: 'babel-polyfill',
        app: './src/index.js',
        login: './src/login.js',
        'function-file': './function-file/function-file.js'
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    devServer: {
     // contentBase: path.join(__dirname, "static")
     // proxy: {
     //    '/api': {
     //        target: "https://zhiquan.hongjianguo.com",
     //        secure: false
     //    }
     // }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                use: 'html-loader'
            },
            {
                test: /\.(png|jpg|jpeg|gif)$/,
                use: 'file-loader'
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            chunks: ['polyfill', 'app']
        }),
        new HtmlWebpackPlugin({
            template: './login.html',
            filename: 'login.html',
            chunks: ['polyfill', 'login']
        }),
        new webpack.HotModuleReplacementPlugin()
    ]
};