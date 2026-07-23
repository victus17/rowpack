import { render } from "preact";

import { App } from "./App";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Rowpack could not find its app root.");
}

render(<App />, root);
