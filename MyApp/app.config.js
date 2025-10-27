module.exports = {
  expo: {
    ...require('./app.json').expo,
    web: {
      bundler: 'metro',
      output: 'static'
    }
  }
};