import { createStore } from "../src/ezflow";

test("counter reducer", () => {
  const store = createStore((state = 0, action) => {
    switch (action) {
      case "increase":
        return state + 1;
      case "decrease":
        return state - 1;
      default:
        return state;
    }
  });

  store.dispatch("increase");
  expect(store.getState()).toBe(1);
  store.dispatch("decrease");
  expect(store.getState()).toBe(0);
});
