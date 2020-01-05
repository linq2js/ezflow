# ezflow

Powerful React state management

## Features

1. Support async action, no third party lib needed
1. Support action flow
1. Support cancellable action dispatching
1. Support dynamic importing reducers and flows (useful for large project)
1. Support debouncing and throttling for action dispatching
1. Support future actions handling

## Examples

1. [Counter App (verbose version)](#counter-app-verbose-version)
1. [Counter App (compact version)](#counter-app-compact-version)
1. [Counter App (using connect() function)](#counter-app-using-connect)
1. [Handling async action](#handling-async-action)
1. [Handling multiple actions using flow concept](#handling-multiple-actions-using-flow-concept)

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

[https://codesandbox.io/s/ezflow-example-async-action-k4xc6](https://codesandbox.io/s/ezflow-example-async-action-k4xc6)

```jsx harmony
import React, { useRef } from "react";
import ReactDOM from "react-dom";
import {
  createDefaultStore,
  Loading,
  delay,
  useDispatch,
  useSelector
} from "ezflow";

const LoadData = async (context, searchTerm) => {
  await delay(1000);
  return `Results of ${searchTerm}`;
};

const initialState = {
  loading: "",
  data: "There is no data"
};

const reducer = (state = initialState, params) => {
  const { action, target, result, payload } = params;

  // Loading action will be triggered automatically whenever async action is dispatched
  if (action === Loading && target === LoadData) {
    return {
      loading: `Fetching for ${payload}...`
    };
  } else if (action === LoadData) {
    return {
      ...state,
      loading: undefined,
      data: result
    };
  }

  return state;
};

createDefaultStore(reducer);

function App() {
  const [loading, data] = useSelector(["loading", "data"]);
  const dispatch = useDispatch();
  const inputRef = useRef();

  function handleLoad() {
    dispatch(LoadData, inputRef.current.value);
    inputRef.current.value = "";
  }

  return (
    <div className="App">
      <p>
        <input type="text" ref={inputRef} placeholder="Type something" />
        <button onClick={handleLoad}>Load</button>
      </p>
      <div>{loading ? loading : data}</div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```

## Handling multiple actions using flow concept

[https://codesandbox.io/s/ezflow-example-flow-17tzt](https://codesandbox.io/s/ezflow-example-flow-17tzt)

```jsx harmony
import React from "react";
import ReactDOM from "react-dom";
import {
  createDefaultStore,
  useStore,
  Loading,
  Cancel,
  useDispatch,
  useSelector
} from "ezflow";

const Login = () => {};
const Logout = () => {};
const UpdateProfile = () => {};
const LoadProfile = async ({ delay }, { username, password }) => {
  await delay(1000);

  return {
    username,
    token: `${username}:${password}`
  };
};

const RootFlow = async ({ action, race, dispatch, select }) => {
  while (true) {
    const {
      payload: { username, password }
    } = await action(Login);
    const { $key, profile } = await race({
      profile: dispatch(LoadProfile, { username, password }),
      logout: action(Logout)
    });

    // LoadProfile dispatched
    if ($key === "profile") {
      dispatch(UpdateProfile, {
        ...profile,
        lastLoggedIn: new Date()
      });
      // wait logout action dispatched
      await action(Logout);
    } else {
      // Logout dispatched
      // that means LoadProfile action is cancelled
    }

    const currentProfile = select("profile");

    dispatch(UpdateProfile, {
      username: "anonymous",
      lastLoggedIn: currentProfile.lastLoggedIn
    });
  }
};

const initialState = {
  status: "",
  profile: {
    username: "anonymous",
    lastLoggedIn: "never"
  }
};

const RootReducer = (
  state = initialState,
  { action, payload, result, target }
) => {
  if (action === Loading && target === LoadProfile) {
    const { username } = payload;
    return {
      ...state,
      status: `Loading profile for ${username}`
    };
  } else if (action === Cancel && target === LoadProfile) {
    return {
      ...state,
      status: "Profile loading cancelled"
    };
  }
  // profile loaded
  else if (action === LoadProfile) {
    return {
      ...state,
      status: "Profile loaded"
    };
  } else if (action === UpdateProfile) {
    return {
      ...state,
      profile: payload
    };
  }
  return state;
};

createDefaultStore(RootReducer);

function App() {
  // dynamic import flow to current store
  useStore({
    flow: RootFlow
  });
  const dispatch = useDispatch();
  const [profile, status] = useSelector(["profile", "status"]);
  function handleLogin() {
    dispatch(Login, { username: "admin", password: "admin" });
  }

  function handleLogout() {
    dispatch(Logout);
  }

  return (
    <>
      <button onClick={handleLogin}>Login as admin</button>
      <button onClick={handleLogout}>Logout</button>
      <p>{status}</p>
      <p>{JSON.stringify(profile)}</p>
    </>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```
