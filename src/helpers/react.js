import { v4 as uuidv4 } from "uuid";

export function generateKey(obj) {
  var hash = require("object-hash");
  return hash(obj);
}

// URL FRIENDLY STRING ID
export function getUID() {
  return uuidv4();
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    console.log("debounce", func, args);

    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
