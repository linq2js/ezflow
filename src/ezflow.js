import {
  createContext,
  createElement,
  Fragment,
  lazy as reactLazy,
  memo,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

const storeContext = createContext();
const InitAction = () => {};
const defaultSubscriptionKey = () => {};
const effectHook = useEffect;
const callbackHook = useCallback;
const memoHook = useMemo;
let defaultStore;
let lastStore;

export class CancelError extends Error {}

export const Loading = () => {};

export const Failure = () => {};

export const UpdateBranch = () => {};

export function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

export function createDefaultStore(reducer) {
  if (defaultStore) {
    defaultStore.dispose();
  }
  return (defaultStore = createStore(reducer));
}

export function Provider({ store, children }) {
  return createElement(storeContext.Provider, {
    value: store,
    children
  });
}

export function useStore(customizer) {
  const localStore = useContext(storeContext);
  const store = localStore || defaultStore || lastStore;

  effectHook(() => {
    if (typeof customizer === "function") {
      customizer(store);
    } else if (customizer) {
      if (customizer.flow) {
        store.flow(
          ...(Array.isArray(customizer.flow)
            ? customizer.flow
            : [customizer.flow])
        );
      }

      if (customizer.reducer) {
        store.reducer(
          ...(Array.isArray(customizer.reducer)
            ? customizer.reducer
            : [customizer.reducer])
        );
      }
    }
  }, [store]);
  return store;
}

export function useStateUpdater(branchName) {
  const store = useStore();
  return store.updater(branchName);
}

export function useSelector(selectors) {
  const isMultiple = Array.isArray(selectors);
  if (!isMultiple) {
    selectors = [selectors];
  }
  const store = useStore();
  const [, forceRerender] = useState();
  const unmountRef = useRef(false);
  const prevValuesRef = useRef([]);
  const getValues = callbackHook(() => {
    const state = store.getState();
    return selectors.map(selector => getValue(state, selector));
  }, selectors.concat(store));
  effectHook(() => {
    function handleChange() {
      const currentValues = getValues();
      if (
        prevValuesRef.current.length !== currentValues.length ||
        prevValuesRef.current.some(
          (value, index) => value !== currentValues[index]
        )
      ) {
        forceRerender({});
      }
    }

    const unubscribe = store.subscribe(handleChange);

    return () => {
      unmountRef.current = true;
      unubscribe();
    };
  }, selectors.concat(store));
  prevValuesRef.current = getValues();
  return isMultiple ? prevValuesRef.current : prevValuesRef.current[0];
}

export function useDispatch() {
  const store = useStore();

  return store.dispatch;
}

export function useDispatcher(actions) {
  const isMultiple = typeof actions !== "function";
  const store = useStore();
  if (!isMultiple) {
    actions = [actions];
  }
  const dispatchers = memoHook(() => {
    if (Array.isArray(actions)) {
      return actions.map(action => payload => store.dispatch(action, payload));
    }
    const entries = Object.entries(actions);
    const actionMap = {};
    entries.forEach(([prop, action]) => {
      actionMap[prop] = payload => store.dispatch(action, payload);
    });
    return actionMap;
  }, actions);

  return isMultiple ? dispatchers : dispatchers[0];
}

export function useFlow(...flows) {
  const store = useStore();

  effectHook(() => {
    store.flow(...flows);
  }, flows);
}

export const delay = (inMilliseconds, value) =>
  new Promise(resolve => setTimeout(resolve, inMilliseconds, value));

export function createStore(rootReducer) {
  const allSubscriptions = new WeakMap();
  const mergedReducers = new WeakSet();
  const stateUpdaters = new Map();
  let propsReducer = undefined;
  const props = {};
  const mainReducer = (state, input) => {
    if (rootReducer) {
      state = rootReducer(state, input);
    }

    if (propsReducer) {
      state = propsReducer(state, input);
    }
    return state;
  };

  let currentState = mainReducer(undefined, { action: InitAction });

  function getUpdater(branch) {
    let updater = stateUpdaters.get(branch);
    if (!updater) {
      stateUpdaters.set(branch, (updater = createUpdater(store, branch)));
      addReducer(branch, updater.reducer);
    }
    return updater;
  }

  function addReducer() {
    let reducerChanged = false;
    // reducer(prop, reducer)
    // reducer(combinedReducers)
    if (typeof arguments[0] !== "function") {
      // reducer(prop, reducer)
      if (arguments.length > 1) {
        const [prop, reducer] = arguments;
        if (!(prop in props) && props[prop] !== reducer) {
          props[prop] = reducer;
          reducerChanged = true;
        }
      } else {
        // reducer(combinedReducers)
        Object.entries(arguments[0]).forEach(([prop, reducer]) => {
          if (!(prop in props) && props[prop] !== reducer) {
            props[prop] = reducer;
            reducerChanged = true;
          }
        });
      }

      if (reducerChanged) {
        propsReducer = combineReducers(props);
      }
    } else {
      // reducer(...reducers);
      for (let i = 0; i < arguments.length; i++) {
        if (mergedReducers.has(arguments[i])) {
          continue;
        }
        mergedReducers.add(arguments[i]);
        rootReducer = mergeReducer(rootReducer, arguments[i]);
        reducerChanged = true;
      }
    }

    if (reducerChanged) {
      const nextState = mainReducer(undefined, { action: InitAction });
      if (nextState !== currentState) {
        currentState = nextState;
        notify(defaultSubscriptionKey, {});
      }
    }
  }

  function mergeReducer(prev, next) {
    return (state, input) => next(prev(state, input), input);
  }

  function flow(...flows) {
    flows.forEach(f => {
      if (!f.__tasks) {
        f.__tasks = new WeakMap();
      }

      if (!f.__tasks.has(store)) {
        f.__tasks.set(store, dispatch(f));
      }
    });

    if (flows.length === 1) {
      return flows[0].__tasks.get(store);
    }

    let isCancelled = false;
    let promise;

    function createPromise() {
      if (promise) {
        return promise;
      }
      return (promise = Promise.all(flows.map(f => f.__tasks.get(store))));
    }
    const multipleTaskWrapper = {
      get then() {
        return createPromise().then;
      },
      get catch() {
        return createPromise().catch;
      },
      get finally() {
        return createPromise().finally;
      },
      cancel() {
        if (isCancelled) {
          return;
        }
        isCancelled = true;
        flows.forEach(f => f.__tasks.get(store).cancel());
      }
    };

    flows.forEach((f, i) => (multipleTaskWrapper[i] = f.__tasks.get(store)));

    return multipleTaskWrapper;
  }

  function getSubscriptions(key) {
    let subscriptions = allSubscriptions.get(key);
    if (!subscriptions) {
      subscriptions = new Set();
      allSubscriptions.set(key, subscriptions);
    }
    return subscriptions;
  }

  function subscribe() {
    let key, subscription;
    if (arguments.length > 1) {
      key = arguments[0];
      subscription = arguments[1];
    } else {
      key = defaultSubscriptionKey;
      subscription = arguments[0];
    }
    const subscriptions = getSubscriptions(key);
    subscriptions.add(subscription);
    return function() {
      subscriptions.delete(key);
    };
  }

  function select(selector) {
    return typeof selector === "function"
      ? selector(currentState)
      : currentState[selector];
  }

  function getState(selector) {
    if (!selector) {
      return currentState;
    }

    if (Array.isArray(selector)) {
      return selector.map(select);
    }

    return select(selector);
  }

  function notify(key, event) {
    const subscriptions = getSubscriptions(key);
    subscriptions.dispatched = true;
    Object.assign(subscriptions, event);
    for (const subscription of subscriptions) {
      subscription({ state: currentState, ...event });
    }
    return subscriptions;
  }

  function dispatch(action, payload, { cancellationToken, props } = {}) {
    function handleAction(result, error, overwriteAction) {
      const event = {
        action: overwriteAction || action,
        target: overwriteAction ? action : undefined,
        payload,
        result,
        error
      };
      const nextState = mainReducer(currentState, event);
      if (nextState !== currentState) {
        currentState = nextState;
        // notify to default subscription
        notify(defaultSubscriptionKey, event);
      }
      if (!overwriteAction) {
        notify(action, event);
      }
    }

    return startTask(
      action,
      store,
      handleAction,
      payload,
      props,
      cancellationToken
    );
  }

  function dispatchOnce(action, payload, options) {
    if (action.__dispatchedResult) {
      return action.__dispatchedResult;
    }
    return (action.__dispatchedResult = dispatch(action, payload, options));
  }

  const store = (lastStore = {
    flow,
    reducer: addReducer,
    dispatch,
    dispatchOnce,
    subscribe,
    getState,
    updater: getUpdater
  });

  return store;
}

export function combineReducers(reducers) {
  const entries = Object.entries(reducers);

  return (state, input) => {
    let next = state;
    for (const [prop, reducer] of entries) {
      const prevValue =
        typeof next === "undefined" || next === null ? undefined : next[prop];
      const nextValue = reducer(prevValue, input);
      if (nextValue !== prevValue) {
        if (next === state) {
          next = { ...state };
        }
        next[prop] = nextValue;
      }
    }

    return next;
  };
}

export function getDefaultStore() {
  return defaultStore;
}

export function connect(specs) {
  const { select = {}, dispatch = {}, flow, reducer } = specs || {};
  const isCustomizableSelect = typeof select === "function";
  const isCustomizableDispatch = typeof select === "function";
  return comp => {
    const memoizedComp = memo(comp);
    return props => {
      const selectEntries = Object.entries(
        isCustomizableSelect ? select(props) : select
      );
      const store = useStore({ flow, reducer });

      const dispatchers = memoHook(
        () => {
          if (isCustomizableDispatch) {
            return dispatch(props, store.dispatch);
          }
          const result = {};
          Object.entries(dispatch).forEach(([prop, action]) => {
            result[prop] = payload => store.dispatch(action, payload);
          });
          return result;
        },
        isCustomizableDispatch ? [props] : []
      );
      const selectEntriesCacheKey = flat(selectEntries);
      const selectedValues = useSelector(selectEntries.map(x => x[1]));

      const newProps = memoHook(
        () => {
          const result = isCustomizableSelect
            ? {
                ...dispatchers
              }
            : { ...props, ...dispatchers };
          selectedValues.forEach(
            (value, index) => (result[selectEntries[index][0]] = value)
          );
          return result;
        },
        isCustomizableSelect
          ? // props should add to dependency list
            selectEntriesCacheKey.concat(props).concat(dispatchers)
          : selectEntriesCacheKey.concat(dispatchers)
      );
      return createElement(memoizedComp, newProps);
    };
  };
}

export function useCallbacks(inputs, ...callbacks) {
  return memoHook(() => callbacks, inputs || []);
}

export function dispatchOnMount(action, payload, inputs = []) {
  const dispatch = useDispatch();

  effectHook(() => {
    dispatch(action, payload);
  }, inputs);
}

export function dispatchOnMountIf(condition, action, payload, inputs = []) {
  const dispatch = useDispatch();

  effectHook(() => {
    if (typeof condition === "function") {
      if (!condition()) return;
    } else if (!condition) {
      return;
    }
    dispatch(action, payload);
  }, inputs);
}

export function createSelector(...args) {
  const selector = args.pop();
  const inputSelectors = args;
  let lastInputValues;
  let lastResult;
  return function(...inputs) {
    const inputValues = inputSelectors.map(inputSelector =>
      inputSelector(...inputs)
    );
    if (
      !lastInputValues ||
      lastInputValues.some((value, index) => value !== inputValues[index])
    ) {
      lastInputValues = inputValues;
      lastResult = selector(...inputValues);
    }
    return lastResult;
  };
}

export function dispatchOnUnmount(action, payload, inputs = []) {
  const dispatch = useDispatch();

  effectHook(
    () => () => {
      dispatch(action, payload);
    },
    inputs
  );
}

export function dispatchOnUnmountIf(condition, action, payload, inputs = []) {
  const dispatch = useDispatch();

  effectHook(
    () => () => {
      if (typeof condition === "function") {
        if (!condition()) return;
      } else if (!condition) {
        return;
      }
      dispatch(action, payload);
    },
    inputs
  );
}

export function lazy(...lazyActions) {
  let resolvedActions;
  let loading = false;
  const queue = [];
  const invoke = (action, context, payload) => action(context, payload);

  function loadLazyActions() {
    if (loading) return;
    loading = true;
    Promise.all(lazyActions.map(lazyAction => lazyAction())).then(result => {
      resolvedActions = result.map(x => x.default || x);
      while (queue.length) {
        const [context, payload] = queue.shift();
        resolvedActions.forEach(action => invoke(action, context, payload));
      }
    });
  }

  return (context, payload) => {
    if (resolvedActions) {
      resolvedActions.forEach(action => invoke(action, context, payload));
    } else {
      queue.push([context, payload]);
      loadLazyActions();
    }
  };
}

export function loadableComponent(
  componentImport,
  { onLoading, onLoaded, ...options } = {}
) {
  const lazyComponent = reactLazy(componentImport);
  const loadingAction = () => ({ dispatch }) => dispatch(onLoading);
  const loadedAction = () => ({ dispatch }) => dispatch(onLoaded);
  const loadedComponent = () => {
    const store = useStore();
    store.dispatchOnce(loadedAction);
    return createElement(Fragment);
  };
  return function(props) {
    const store = useStore();
    onLoading && store.dispatchOnce(loadingAction);

    return createElement(
      Suspense,
      {
        fallback: "",
        ...options
      },
      createElement(lazyComponent, props),
      ...(onLoaded ? [createElement(loadedComponent)] : [])
    );
  };
}

function flat(array) {
  return array.reduce((seed, item) => {
    seed.concat(item);
    return seed;
  }, []);
}

function getValue(state, selector) {
  return typeof selector === "function" ? selector(state) : state[selector];
}

function startTask(
  action,
  store,
  handleAction,
  payload,
  props = {},
  parentCancellationToken
) {
  const cancellationToken = createCancellationToken(parentCancellationToken);
  const context = createActionContext(store, cancellationToken, props);
  let promise;

  try {
    const result = action(context, payload);

    // is async
    if (result && typeof result.then === "function") {
      // dispatch loading action
      handleAction && handleAction(undefined, undefined, Loading);
      promise = new Promise((resolve, reject) => {
        result.then(
          result => {
            promise.result = result;
            if (!cancellationToken.isCancelled()) {
              handleAction && handleAction(result);
              resolve(result);
            }
          },
          error => {
            if (error instanceof CancelError) {
              return;
            }
            // dispatch failure action
            handleAction && handleAction(undefined, error, Failure);
            reject(error);
          }
        );
      });
      promise.async = true;
    } else {
      promise = Promise.resolve(result);
      promise.async = false;
      promise.result = result;
      if (!cancellationToken.isCancelled()) {
        handleAction && handleAction(result);
      }
    }

    Object.assign(promise, {
      cancel: cancellationToken.cancel
    });
  } catch (error) {
    if (!(error instanceof CancelError)) {
      handleAction && handleAction(undefined, error, Failure);
      throw error;
    }
  }

  return promise;
}

function createUpdater(store, branch) {
  const reducer = (state = {}, { action, payload: changes }) => {
    let next = state;
    if (action === UpdateBranch) {
      changes.forEach(({ method, prop, value }) => {
        if (method === "merge") {
          Object.keys(value).forEach(key => {
            if (next[key] !== value[key]) {
              if (next === state) {
                next = { ...state };
              }
              next[key] = value[key];
            }
          });
        } else if (method === "set") {
          // change all
          if (!prop) {
            if (next !== value) {
              next = value;
            }
          }
          // prop changed
          else if (next[prop] !== value) {
            if (next === state) {
              next = {
                ...state
              };
            }
            next[prop] = value;
          }
        }
      });
    }
    return next;
  };
  let changes = undefined;

  function dispatch(changes) {
    store.dispatch(UpdateBranch, changes);
  }

  const updater = function() {
    if (!arguments.length) {
      return store.getState(branch);
    }
    let change;
    // batch update
    if (typeof arguments[0] === "function") {
      try {
        changes = [];
        arguments[0](updater);
      } finally {
        const copiedChanges = changes;
        changes = undefined;
        dispatch(copiedChanges);
      }
    }
    // update(prop, value)
    else if (arguments.length > 1) {
      change = { method: "set", prop: arguments[0], value: arguments[1] };
    } else {
      change = { method: "merge", value: arguments[0] };
    }

    if (change) {
      if (changes) {
        changes.push(change);
      } else {
        dispatch([change]);
      }
    }
    return updater;
  };
  return Object.assign(updater, {
    reducer
  });
}

function createActionContext(store, cancellationToken, props) {
  const { dispatch, dispatchOnce, subscribe, getState, flow, reducer } = store;

  function addActionHandler(actions, handler, payload, processTask) {
    (Array.isArray(actions) ? actions : [actions]).forEach(action => {
      const data = {
        lastRun: Number.MIN_VALUE
      };
      subscribe(action, event => {
        processTask(data, () => {
          data.lastRun = new Date().getTime();

          data.prev = context.dispatch(
            handler,
            // is dynamic payload
            typeof payload === "function" ? payload(event) : payload,
            {
              props: {
                event
              }
            }
          );
        });
      });
    });
  }

  function throttle(actions, ms, handler, payload) {
    return addActionHandler(actions, handler, payload, (data, next) => {
      if (new Date().getTime() - data.lastRun >= ms) {
        next();
      }
    });
  }

  function debounce(actions, ms, handler, payload) {
    return addActionHandler(actions, handler, payload, (data, next) => {
      if (data.prev) {
        data.prev.cancel();
      }
      clearTimeout(data.timerId);
      data.timerId = setTimeout(next, ms);
    });
  }

  function latest(actions, handler, payload) {
    return addActionHandler(actions, handler, payload, (data, next) => {
      if (data.prev) {
        data.prev.cancel();
      }
      next();
    });
  }

  function every(actions, handler, payload) {
    addActionHandler(actions, handler, payload, (data, next) => next());
  }

  function action(actions) {
    return Promise.race(
      (Array.isArray(actions) ? actions : [actions]).map(action => {
        return new Promise(resolve => {
          const unsubscribe = subscribe(action, ({ result, payload }) => {
            unsubscribe();
            resolve({ action, payload, result });
          });
        });
      })
    );
  }

  async function race(map) {
    const entries = Object.entries(map);
    const result = {};
    let lastKey;
    await Promise.race(
      entries.map(([key, value]) =>
        Promise.resolve(value).then(value => {
          lastKey = key;
          result[key] = value;
        })
      )
    );
    result.$key = lastKey;
    return result;
  }

  async function all(map) {
    const entries = Object.entries(map);
    const result = {};
    await Promise.all(
      entries.map(([key, value]) =>
        Promise.resolve(value).then(value => {
          result[key] = value;
        })
      )
    );
    return result;
  }

  const context = Object.assign(
    wrapContextMethods(
      {
        dispatch(action, payload, options) {
          return dispatch(action, payload, {
            cancellationToken,
            ...options
          });
        },
        dispatchOnce(action, payload, options) {
          return dispatchOnce(action, payload, {
            cancellationToken,
            ...options
          });
        },
        select: getState,
        lazy,
        flow,
        throttle,
        latest,
        debounce,
        every,
        action,
        race,
        all,
        delay,
        reducer
      },
      cancellationToken
    ),
    props
  );

  return context;
}

function wrapMethod(method, cancellationToken) {
  return (...args) => {
    if (cancellationToken.isCancelled()) {
      throw new CancelError();
    }
    return method(...args);
  };
}

function wrapContextMethods(context, cancellationToken) {
  Object.entries(context).forEach(([prop, method]) => {
    if (typeof method === "function") {
      context[prop] = wrapMethod(method, cancellationToken);
    }
  });

  return context;
}

function createCancellationToken(parentCancellationToken) {
  let isCancelled = false;
  return {
    isCancelled() {
      return (
        isCancelled ||
        (parentCancellationToken && parentCancellationToken.isCancelled())
      );
    },
    cancel() {
      isCancelled = true;
    }
  };
}
