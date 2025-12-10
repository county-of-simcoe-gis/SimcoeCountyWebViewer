import config from "./config.json";

// Pre-load all extension modules using import.meta.glob for Vite compatibility
// Include both .js and .jsx files
const extensionModules = import.meta.glob("./*.extension.{js,jsx}");

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
          const { fetchData, dataRows, content, arnExtension, actions } = item;
          props.addExtension(fetchData, dataRows, content, arnExtension, actions, config.extensions.indexOf(ext), ext.type);
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(() => {
    if (callback) callback();
  });
};
