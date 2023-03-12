import store from './store.js';
import reducer from './reducer.js';

const { dispatch, selector } = store(reducer);

export { dispatch, selector };
