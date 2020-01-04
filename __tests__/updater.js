import { createStore } from "../src/ezflow";

let store;
let branch = "test";

beforeEach(() => {
  store = createStore();
});

test("updater(prop, value)", () => {
  const updater = store.updater(branch);

  updater("name", "Peter");
  updater("age", 20);

  expect(store.getState()).toEqual({ [branch]: { name: "Peter", age: 20 } });
});

test("updater(props)", () => {
  const updater = store.updater(branch);

  updater({
    name: "Peter",
    age: 20
  });

  expect(store.getState()).toEqual({ [branch]: { name: "Peter", age: 20 } });
});

test("updater(batch)", () => {
  const updater = store.updater(branch);

  updater(() => {
    updater("name", "Peter");
    expect(store.getState()).toEqual({ [branch]: {} });
    updater("age", 20);
    expect(store.getState()).toEqual({ [branch]: {} });
  });

  expect(store.getState()).toEqual({ [branch]: { name: "Peter", age: 20 } });
});
