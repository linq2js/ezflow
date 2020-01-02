import React from "react";
import {
  createDefaultStore,
  useDispatchers,
  useSelector
} from "../../src/ezflow";

createDefaultStore((state = { count: 0 }, { action }) => {
  if (action === Increase) {
    return {
      ...state,
      count: state.count + 1
    };
  }
  return state;
});

const Increase = () => {};

export default function App() {
  const count = useSelector(state => state.count);
  const increase = useDispatchers(Increase);

  return (
    <>
      <h1>{count}</h1>
      <button data-testid="increase-button" onClick={increase}>
        Increase
      </button>
    </>
  );
}
