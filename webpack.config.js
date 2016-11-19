var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')

const isProd = process.env.NODE_ENV === 'production'

const entries = []
if (!isProd) {
  entries.push('webpack-dev-server/client?http://localhost:3000')
  entries.push('webpack/hot/only-dev-server')
}
entries.push('./src/index')

const devtool = isProd ? 'source-map' : 'cheap-eval-source-map'

const htmlPage = new HtmlWebpackPlugin({template: 'index.html'})

const plugins = isProd ? [htmlPage] : [htmlPage, new webpack.HotModuleReplacementPlugin()]

const jsLoader = isProd ? ['babel'] : ['react-hot', 'babel']

module.exports = {
  devtool,
  entry: entries,
  output: {
    path: path.join(__dirname, 'docs'),
    filename: 'bundle.js'
  },
  plugins,
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: jsLoader,
      include: path.join(__dirname, 'src')
    }, {
      test: /\.json$/,
      loader: 'json-loader'
    },
    {
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    },
    { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&minetype=application/font-woff' },
    { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader' }
    ]
  },
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
}
