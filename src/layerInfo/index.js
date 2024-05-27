import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

const uniqueId = `root-${"layerInfo"}}`;
const element = document.createElement("div");
element.setAttribute("id", uniqueId);
document.getElementById("root").appendChild(element);
const root = createRoot(document.getElementById(uniqueId));
root.render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
