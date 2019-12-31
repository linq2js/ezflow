import { createStore, delay } from "../src/ezflow";
//
// test("login", async () => {
//   const store = createStore(
//     (state = { username: "admin", password: "admin" }, action, payload) => {
//       switch (action) {
//         case "saveToken":
//           return {
//             ...state,
//             token: payload
//           };
//         case "saveCredentials":
//           return {
//             ...state,
//             credentials: payload
//           };
//         default:
//           return state;
//       }
//     }
//   );
//   const loginEffect = async (context, { username, password }) => {
//     await delay(100);
//     return `${username}:${password}`;
//   };
//   const rootFlow = async ({ action, dispatch, select }) => {
//     const payload = await action("submit");
//     dispatch("saveCredentials", payload);
//
//     const [username, password] = select(["username", "password"]);
//     const token = await dispatch(loginEffect, { username, password });
//     dispatch("saveToken", token);
//   };
//
//   store.flow(rootFlow);
//   await delay(100);
//   store.dispatch("submit", { username: "test", password: "test" });
//   await delay(200);
//   expect(store.getState()).toEqual({
//     token: "admin:admin",
//     username: "admin",
//     password: "admin",
//     credentials: { username: "test", password: "test" }
//   });
// });
//
// test("every() first() latest()", async () => {
//   const store = createStore();
//   const clickFirst = jest.fn();
//   const clickEvery = jest.fn();
//   const clickLatest = jest.fn();
//   const onClickFirstFlow = async ({ cancelled, $payload }) => {
//     await delay(100);
//     !cancelled() && clickFirst($payload);
//   };
//   const onClickLatestFlow = async ({ cancelled, $payload }) => {
//     await delay(100);
//     !cancelled() && clickLatest($payload);
//   };
//   const onClickEveryFlow = async ({ cancelled, $payload }) => {
//     await delay(100);
//     !cancelled() && clickEvery($payload);
//   };
//   store.flow(({ every, first, latest }) => {
//     every("click", onClickEveryFlow);
//     first("click", onClickFirstFlow);
//     latest("click", onClickLatestFlow);
//   });
//
//   store.dispatch("click", 1);
//   await delay(60);
//   store.dispatch("click", 2);
//   await delay(60);
//   store.dispatch("click", 3);
//   await delay(300);
//
//   expect(clickEvery.mock.calls).toEqual([[1], [2], [3]]);
//   // expect(clickFirst.mock.calls).toEqual([[1], [3]]);
//   // expect(clickLatest.mock.calls).toEqual([[3]]);
// });

test("hello world", async () => {
  const log = jest.fn();
  const HelloFlow = async ({ action }) => {
    const payload = await action("greeting");
    log("Hello", payload);
  };

  const store = createStore().flow(HelloFlow);

  store.dispatch("greeting", "World");

  await delay(100);

  expect(log.mock.calls[0]).toEqual(["Hello", "World"]);
});
//
// test("geeting", async () => {
//   const HelloFlow = async ({ race, action }) => {
//     const { $key, $payload, greeting, say, hi } = await race({
//       greeting: action("greeting"),
//       say: action("say"),
//       hi: action("hi")
//     });
//     if ($key === "greeting") {
//       expect(greeting).toBe($payload);
//     }
//
//     if ($key === "say") {
//       expect(say).toBe($payload);
//     }
//
//     if ($key === "hi") {
//       expect(hi).toBe($payload);
//     }
//   };
//   const store = createStore().flow(HelloFlow);
//   await delay(100);
//   store.dispatch("greeting", "one");
//   store.dispatch("say", "two");
//   store.dispatch("hi", "three");
//   await delay(100);
// });
