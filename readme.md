# ezflow

Powerful React state management

## Counter App (verbose version)

```jsx harmony
import React from "react";
import { render } from "react-dom";
import { createStore, Provider, useDispatch, useSelector } from "ezflow";

const initialState = { count: 0 };
// define root reducer for store
const reducer = (state = initialState, params) => {
  const { action } = params;
  if (action === Increase) {
    return {
      ...state,
      count: state.count + 1
    };
  }
  return state;
};
// define Increase action
const Increase = () => {};
const CountSelector = state => state.count;
const store = createStore(reducer);

const Counter = () => {
  // extract count value from store
  const count = useSelector(CountSelector);
  // access store dispatch method
  const dispatch = useDispatch();
  const handleIncrease = () => dispatch(Increase);
  return (
    <>
      <h1>{count}</h1>
      <button onClick={handleIncrease}>Increase</button>
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
};

render(<App />, document.getElementById("root"));
```

## Counter App (compact version)

```jsx harmony
import React from "react";
import { render } from "react-dom";
import { createDefaultStore, useDispatcher, useSelector } from "ezflow";

const initialState = { count: 0 };
// define root reducer for store
const reducer = (state = initialState, params) => {
  const { action } = params;
  if (action === Increase) {
    return {
      ...state,
      count: state.count + 1
    };
  }
  return state;
};
// define Increase action
const Increase = () => {};
const CountSelector = state => state.count;

// no Provide needed if using default store
createDefaultStore(reducer);

const App = () => {
  // extract count value from store
  const count = useSelector(CountSelector);
  const increase = useDispatcher(Increase);
  return (
    <>
      <h1>{count}</h1>
      <button onClick={increase}>Increase</button>
    </>
  );
};

render(<App />, document.getElementById("root"));
```

## Counter App (using connect)

```jsx harmony
import React from "react";
import { render } from "react-dom";
import { createDefaultStore, connect } from "ezflow";

const initialState = { count: 0 };
// define root reducer for store
const reducer = (state = initialState, params) => {
  const { action } = params;
  if (action === Increase) {
    return {
      ...state,
      count: state.count + 1
    };
  }
  return state;
};
// define Increase action
const Increase = () => {};
const CountSelector = state => state.count;

// no Provide needed if using default store
createDefaultStore(reducer);
// create container
const AppContainer = connect({
  select: { count: CountSelector },
  dispatch: { increase: Increase }
});
// bind container to component
const App = AppContainer(({ count, increase }) => {
  return (
    <>
      <h1>{count}</h1>
      <button onClick={increase}>Increase</button>
    </>
  );
});
render(<App />, document.getElementById("root"));
```

## Handling async action
```jsx harmony
import React from "react";
import { render } from "react-dom";
import { createDefaultStore, connect } from "ezflow";

```
