import React from "react";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { delay, getDefaultStore } from "../src/ezflow";
import App from "../examples/NpmSearch/App";

afterEach(cleanup);

test("should fetching properly", async () => {

  const packageName = "ezflow";
  const { getByTestId } = render(<App />);
  const $searchInput = getByTestId("search-input");

  fireEvent.change($searchInput, { target: { value: packageName } });

  await delay(300);

  expect(getDefaultStore().getState().fetchStatus).toBe(
    `fetching for ${packageName}...`
  );

  await delay(2000);

  expect(getDefaultStore().getState()).toEqual({
    list: [
      { name: ["ezflow"], description: ["Powerful React state management"] }
    ],
    fetchStatus: expect.anything()
  });
});
