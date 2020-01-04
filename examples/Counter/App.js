import imj from "imj";
import React from "react";
import { createDefaultStore, connect } from "../../src/ezflow";

const reducer = imj({
  $default: { count: 0 },
  count: ({ value, $1 }) => ($1.action === Increase ? value + 1 : value)
});

createDefaultStore(reducer);

const Increase = () => {};

export default connect({
  select: {
    count: state => state.count
  },
  dispatch: {
    increase: Increase
  }
})(({ count, increase }) => (
  <>
    <h1>{count}</h1>
    <button data-testid="increase-button" onClick={increase}>
      Increase
    </button>
  </>
));
