import config from "./config.json";

// Pre-load all extension modules using import.meta.glob for Vite compatibility
const extensionModules = import.meta.glob("./*.extension.jsx");

export const fetchExtensions = (props, callback = undefined) => {
  let allPromises = [];
  config.extensions.forEach((ext) => {
    const modulePath = `./${ext.file}`;
    const moduleLoader = extensionModules[modulePath];

    if (!moduleLoader) {
      console.error(`Extension not found: ${modulePath}`);
      return;
    }

    const promise = new Promise((resolve, reject) => {
      moduleLoader()
        .then((item) => {
          const { component, action } = item;
          props.addExtension(component, action, config.extensions.indexOf(ext), ext.type);
          resolve();
        })
        .catch((error) => {
          console.log(error);
        });
    });
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(() => {
    if (callback) callback();
  });
};
