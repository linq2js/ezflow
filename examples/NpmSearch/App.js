import React from "react";
import fetch from "node-fetch";
import {
  useSelector,
  createDefaultStore,
  Loading,
  Failure,
  useDispatchers
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

function reducer(state = initialState, { action, target, payload, result }) {
  if (action === Loading && target === Search) {
    return {
      ...state,
      fetchStatus: `fetching for ${payload}...`,
      list: []
    };
  } else if (action === Failure && target === Search) {
    return {
      ...state,
      fetchStatus: `errored: ${payload}`
    };
  } else if (action === Search) {
    return {
      ...state,
      list: result,
      fetchStatus: `Results from ${new Date().toLocaleString()}`
    };
  }
  return state;
}

createDefaultStore(reducer).flow(RootFlow);

export default function App() {
  const [list, fetchStatus] = useSelector(["list", "fetchStatus"]);
  const search = useDispatchers(StartSearch);

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
}
