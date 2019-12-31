# ezflow

Powerful React state management

## Hello world flow

We are going to create our first flow. Following the tradition, we will write our 'Hello, world' version for ezflow.

```js
function HelloWorldFlow() {
  console.log("Hello World");
}
```

Nothing special here, just create a simple function and print greeting message into the console

In order to run HelloWorldFlow, we need to:
. Create ezflow store
. Bond HelloWorldFlow to that store

```jsx harmony
import { createStore } from "ezflow";
import HelloWorldFlow from "./flows/HelloWorld";

const store = createStore();
// HelloWorldFlow will run immediately once it has been bonded to the store
store.flow(HelloWorldFlow);

// console.log => Hello World
```

## Handle future action

Let's take a basic example that watches specified actions dispatched to the store

```jsx harmony
const HelloFlow = async ({ race, action }) => {
  const { $key, $payload, geeting, say, hi } = await race({
    greeting: action("greeting"),
    say: action("say"),
    hi: action("hi")
  });
  console.log("Hello ", $payload, $key);
};

store.dispatch("greeting", "World");
```

## Samples

1. Reddit fetching [https://codesandbox.io/s/ezflow-reddit-lmwh3](https://codesandbox.io/s/ezflow-reddit-lmwh3)
