import React from "react";
import fetch from "node-fetch";
import imj from "imj";
import {
  createDefaultStore,
  Loading,
  Failure,
  connect
} from "../../src/ezflow";

const initialState = {
  list: [],
  fetchStatus: ""
};

const StartSearch = () => {};

const SearchApi = (context, term) =>
  fetch(
    `https://npmsearch.com/query?q=${term}&fields=name,description`
  ).then(resp => resp.json());

const Search = async ({ dispatch }, payload) => {
  const { results } = await dispatch(SearchApi, payload);
  return results;
};

const RootFlow = ({ debounce }) => {
  debounce(
    StartSearch,
    300,
    Search,
    // pass StartSearch payload to Search
    ({ payload }) => payload
  );
};

const reducer = imj({
  $default: initialState,
  $when: [
    ({ $1: { action, target } }) =>
      action === Loading && target === Search
        ? "fetching"
        : action === Failure && target === Search
        ? "error"
        : action === Search
        ? "result"
        : "default",
    {
      fetching: {
        fetchStatus: ({ $1 }) => `fetching for ${$1.payload}...`,
        list: () => []
      },
      error: {
        fetchStatus: ({ $1 }) => `errored: ${$1.payload}...`
      },
      result: {
        list: ({ $1 }) => $1.result,
        fetchStatus: () => `Results from ${new Date().toLocaleString()}`
      }
    }
  ]
});

createDefaultStore(reducer);

export default connect({
  flow: RootFlow,
  select: {
    list: "list",
    fetchStatus: "fetchStatus"
  },
  dispatch: {
    search: StartSearch
  }
})(({ list, fetchStatus, search }) => {
  function handleChange(e) {
    search(e.target.value);
  }

  return (
    <div>
      <div>Search npmsearch.com for packages</div>
      <div>Status: {fetchStatus}</div>
      <input
        data-testid="search-input"
        autoFocus={true}
        onChange={handleChange}
        placeholder="package keywords"
      />
      <ul>
        {list.map(result => (
          <li key={result.name[0]}>
            {result.name[0]} - {result.description[0]}
          </li>
        ))}
      </ul>
    </div>
  );
});
