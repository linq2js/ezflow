import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { getDefaultStore } from "../src/ezflow";
import App from "../examples/Counter/App";

afterEach(cleanup);

test("should increase properly", () => {
  const { getByTestId } = render(<App />);
  const $button = getByTestId("increase-button");
  fireEvent.click($button);
  fireEvent.click($button);
  expect(getDefaultStore().getState("count")).toBe(2);
});
