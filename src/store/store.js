const store = (reducer) => {
  let state = reducer();
  return {
    dispatch({ type, payload }) {
      state = reducer(state, { type, payload });
    },
    selector(select = (state) => state) {
      return select(state);
    },
  };
};

export default store;
