const store = require('./store');
const reducer = require('./reducer');

const { dispatch, selector } = store(reducer);

module.exports = {
  dispatch,
  selector,
};
