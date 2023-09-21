import { v4 as uuidv4 } from "uuid";

export function generateKey(obj) {
  var hash = require("object-hash");
  return hash(obj);
}

// URL FRIENDLY STRING ID
export function getUID() {
  return uuidv4();
}
