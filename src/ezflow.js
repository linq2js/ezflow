import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

const CancellationToken = {};
const initAction = "@@init";
const effectHook = useEffect;
const callbackHook = useCallback;
const storeContext = createContext();

let uniqueId = 1;
let defaultStore;

function getFuncId(func) {
  if (!func.__id) {
    func.__id = uniqueId++;
  }
  return func.__id;
}

export function createStore(reducer = (state = {}) => state) {
  let state = reducer(undefined, initAction);
  const dispatchedObjects = new Map();
  const subscriptions = new Set();
  const store = {
    dispose() {
      subscriptions.clear();
      dispatchedObjects.clear();
      return store;
    },
    flow(...flows) {
      flows.forEach(flow => {
        if (dispatchedObjects.has(flow)) return;
        const task = createTask(flow, store, { autoStart: false });
        dispatchedObjects.set(flow, task);
        task.start();
      });
      return store;
    },
    subscribe(subscription) {
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    getState() {
      return state;
    },
    dispatch(action, payload) {
      let listeners = dispatchedObjects.get(action);
      if (!listeners) {
        listeners = new Set();
        dispatchedObjects.set(action, listeners);
      }
      listeners.dispatched = true;
      listeners.payload = payload;

      const nextState = reducer(state, action, payload);
      if (nextState !== state) {
        state = nextState;
        // notify
        for (const subscription of subscriptions) {
          subscription({ state, action, payload });
        }
      }

      for (const listener of listeners) {
        listener(payload);
      }
      return store;
    },
    dispatched(action) {
      const dispatchedObject = dispatchedObjects.get(action);
      return dispatchedObject && dispatchedObject.dispatched === true;
    },
    listen(action, callback) {
      let dispatchedObject = dispatchedObjects.get(action);
      if (!dispatchedObject) {
        dispatchedObject = new Set();
        dispatchedObjects.set(action, dispatchedObject);
      }

      dispatchedObject.add(callback);

      return () => dispatchedObject.delete(callback);
    }
  };
  return store;
}

export function createTask(flow, store, options) {
  const cancelSubscriptions = new Set();
  const { autoStart = true, props } = options || {};
  let runningTasks = new Map();
  let isCancelled = false;
  let promiseResolve;

  const context = {
    ...props,
    flow: store.flow,
    safe,
    cancelled,
    latest,
    first,
    every,
    race,
    all,
    action,
    delay,
    dispatch,
    select
  };

  Object.keys(context).forEach(key => {
    if (typeof context[key] === "function") {
      context[key] = wrap(context[key]);
    }
  });

  const promise = new Promise(async resolve => {
    promiseResolve = resolve;
  });

  function wrap(method) {
    return (...args) => {
      if (isCancelled) {
        throw CancellationToken;
      }
      return method(...args);
    };
  }

  function dispatch(effectOrAction, ...args) {
    if (typeof effectOrAction === "function") {
      return dispatchEffect(effectOrAction, ...args);
    }
    return store.dispatch(effectOrAction, ...args);
  }

  function dispatchEffect(effect, ...args) {
    return effect(context, ...args);
  }

  function findRunningTask(action, flow, notFound, found) {
    const flowId = getFuncId(flow);
    const key = `${action}_${flowId}`;
    const existingTask = runningTasks.get(key);
    if (existingTask) {
      const replaceTask = found && found(existingTask);
      if (replaceTask) {
        runningTasks.set(key, replaceTask);
      }
    } else if (notFound) {
      const newTask = notFound();
      if (newTask) {
        runningTasks.set(key, newTask);
      }
    }
  }

  function select(selectors) {
    const state = store.getState();
    if (!selectors) return state;
    if (Array.isArray(selectors)) {
      return selectors.map(selector => getValue(state, selector));
    }
    return getValue(state, selectors);
  }

  function safe(f, defaultValue) {
    if (isCancelled) return defaultValue;
    return f();
  }

  function cancelled() {
    return isCancelled;
  }

  function every(action, flow) {
    store.listen(action, payload => {
      createTask(flow, store, {
        props: { $action: action, $payload: payload }
      });
    });
  }

  function first(action, flow) {
    store.listen(action, payload => {
      const props = { $action: action, $payload: payload };
      findRunningTask(
        action,
        flow,
        () => createTask(flow, store, {props}),
        existing => {
          if (existing.__started) return;
          existing.cancel();
          return createTask(flow, store, {props});
        }
      );
    })
  }

  function latest(action, flow) {
    store.listen(action, payload => {
      const props = { $action: action, $payload: payload };
      findRunningTask(
        action,
        flow,
        () => createTask(flow, store, {props}),
        existing => {
          existing.cancel();
          return createTask(flow, store, {props});
        }
      );
    })
  }

  function getPromise(value) {
    if (value instanceof Promise) return value;
    if (typeof value === "function") {
      return createTask(value, store);
    }
    return Promise.resolve(value);
  }

  function cancelPromises(promises) {
    promises.forEach(
      promise => typeof promise.cancel === "function" && promise.cancel()
    );
  }

  async function race(map) {
    const entries = Object.entries(map);
    const result = {};
    let resolved = false;
    const promises = entries.map(([prop, value], index) =>
      getPromise(value).then(payload => {
        if (!resolved) {
          resolved = true;
          result.$key = entries[index][0];
          result.$payload = payload;
        }
        result[entries[index][0]] = payload;

        return payload;
      })
    );

    try {
      await Promise.race(promises);
    } catch (error) {
      cancelPromises(promises);
      throw error;
    }

    return result;
  }

  async function all(map) {
    const entries = Object.entries(map);
    const promises = entries.map(([prop, value], index) => getPromise(value));
    try {
      const payloads = await Promise.all(promises);
      const result = {};
      payloads.forEach(
        (payload, index) => (result[entries[index][0]] = payload)
      );
    } catch (error) {
      cancelPromises(promises);
      throw error;
    }
  }

  function dispose() {
    for (const cancelSubscription of cancelSubscriptions) {
      cancelSubscription();
    }
    runningTasks.clear();
  }

  function action(a) {
    let cancelSubscription;
    return Object.assign(
      new Promise(resolve => {
        cancelSubscription = store.listen(a, resolve);
        cancelSubscriptions.add(cancelSubscription);
      }),
      {
        cancel() {
          cancelSubscription();
          cancelSubscriptions.delete(cancelSubscription);
        }
      }
    );
  }

  async function start() {
    try {
      const result = await flow(context);
      safe(() => promiseResolve(result));
    } catch (e) {
      if (e === CancellationToken) {
        return;
      }
      throw e;
    } finally {
      dispose();
    }
  }

  Object.assign(promise, {
    cancel() {
      isCancelled = true;
      dispose();
    },
    start() {
      promise.__started = true;
      return start();
    }
  });

  if (autoStart) {
    promise.start();
  }

  return promise;
}

export function getDefaultStore() {
  return defaultStore;
}

export function combineReducers(reducers) {
  const entries = Object.entries(reducers);

  return (state, action, payload) => {
    let next = state;
    for (const [prop, reducer] of entries) {
      const prevValue =
        typeof next === "undefined" || next === null ? undefined : next[prop];
      const nextValue = reducer(prevValue, action, payload);
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

export default function compose(...funcs) {
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

export function useStore() {
  const localStore = useContext(storeContext);
  return localStore || defaultStore;
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

export function useFlow(...flows) {
  const store = useStore();

  effectHook(() => {
    flows.forEach(flow => store.flow(flow));
  }, flows);
}

export function delay(inMilliseconds, value) {
  return new Promise(resolve => setTimeout(resolve, inMilliseconds, value));
}

function getValue(state, selector) {
  return typeof selector === "function" ? selector(state) : state[selector];
}
