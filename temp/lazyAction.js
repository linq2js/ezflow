export default function lazyAction(context, { callback }) {
  callback();
  console.log("lazyAction dispatched");
}
