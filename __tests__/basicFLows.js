import { createStore, delay, Failure, Loading } from "../src/ezflow";

const CounterReducer = (state = { count: 0 }, { action, payload = 1 }) => {
  if (action === Increase) {
    return {
      ...state,
      count: state.count + payload
    };
  }
  return state;
};
const Increase = () => {};
const Click = () => {};

let store;

beforeEach(() => {
  store = createStore(CounterReducer);
});

test("Should dispatch sync flow properly", () => {
  const RootFlow = ({ dispatch }) => {
    dispatch(Increase, 2);
  };

  store.flow(RootFlow);

  expect(store.getState()).toEqual({ count: 2 });
});

test("handle future actions", async () => {
  const IncreaseAsync = () => {};
  const RootFlow = async ({ dispatch, action, delay }) => {
    await action(IncreaseAsync);
    await delay(100);
    dispatch(Increase);
  };

  store.flow(RootFlow);
  expect(store.getState()).toEqual({ count: 0 });
  store.dispatch(IncreaseAsync);
  expect(store.getState()).toEqual({ count: 0 });
  await delay(150);
  expect(store.getState()).toEqual({ count: 1 });
});

test("Should dispatch async flow properly", async () => {
  const AsyncIncrease = async ({ delay, dispatch }, payload) => {
    await delay(100);
    dispatch(Increase, payload);
  };
  const RootFlow = ({ dispatch }) => {
    return dispatch(AsyncIncrease, 2);
  };

  const task = store.flow(RootFlow);

  expect(store.getState()).toEqual({ count: 0 });
  await task;
  expect(store.getState()).toEqual({ count: 2 });
});

test("Should cancel child task if its parent task is cancelled", async () => {
  const AsyncIncrease = async ({ delay, dispatch }, payload) => {
    await delay(100);
    dispatch(Increase, payload);
  };
  const RootFlow = ({ dispatch }) => {
    return dispatch(AsyncIncrease, 2);
  };

  const task = store.flow(RootFlow);
  expect(store.getState()).toEqual({ count: 0 });
  task.cancel();
  await delay(200);
  expect(store.getState()).toEqual({ count: 0 });
});

test("throttle()", async () => {
  const RootFlow = ({ throttle }) => {
    throttle(Click, 100, Increase);
  };
  store.flow(RootFlow);
  expect(store.getState()).toEqual({ count: 0 });
  store.dispatch(Click);
  expect(store.getState()).toEqual({ count: 1 });
  store.dispatch(Click);
  expect(store.getState()).toEqual({ count: 1 });
  await delay(200);
  store.dispatch(Click);
  expect(store.getState()).toEqual({ count: 2 });
});

test("lazy()", async () => {
  const fn = jest.fn();
  const RootFlow = ({ every, lazy }) => {
    every(
      Click,
      lazy(() => import("../temp/lazyAction")),
      { callback: fn }
    );
  };
  store.flow(RootFlow);
  store.dispatch(Click);
  store.dispatch(Click);
  await delay(0);
  expect(fn.mock.calls.length).toBe(2);
});

test("reducer(prop, reducer)", () => {
  expect(store.getState()).toEqual({ count: 0 });
  store.reducer("other", (state = 1) => state);
  expect(store.getState()).toEqual({ count: 0, other: 1 });
});

test("reducer(reducers)", () => {
  expect(store.getState()).toEqual({ count: 0 });
  store.reducer({
    one(state = 1) {
      return state;
    },
    two(state = 2) {
      return state;
    }
  });
  expect(store.getState()).toEqual({ count: 0, one: 1, two: 2 });
});

test("action dispatching statuses", async () => {
  const LoadData1 = async ({ delay }, throwError) => {
    await delay(50);
    if (throwError) {
      throw new Error("cannot load data1");
    } else {
      return 1;
    }
  };
  const LoadData2 = async ({ delay }, throwError) => {
    await delay(50);
    if (throwError) {
      throw new Error("cannot load data2");
    } else {
      return 2;
    }
  };
  store.reducer((state, { action, target, result, error }) => {
    if (action === LoadData1) {
      return {
        ...state,
        data1: result
      };
    }
    if (action === LoadData2) {
      return {
        ...state,
        data2: result
      };
    }
    if (action === Loading) {
      return {
        ...state,
        [target === LoadData1 ? "data1" : "data2"]: "loading"
      };
    }

    if (action === Failure) {
      return {
        ...state,
        [target === LoadData1 ? "data1" : "data2"]: "error:" + error.message
      };
    }
    return state;
  });

  store.dispatch(LoadData1, false);
  expect(store.getState().data1).toBe("loading");
  await delay(60);
  expect(store.getState().data1).toBe(1);
  try {
    await store.dispatch(LoadData1, true);
  } catch (e) {}
  await delay(60);
  expect(store.getState().data1).toBe("error:cannot load data1");
});
