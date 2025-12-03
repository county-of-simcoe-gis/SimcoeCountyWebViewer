import config from "./config.json";
export const fetchExtensions = (props, callback = undefined) => {
  let allPromises = [];
  config.extensions.forEach((ext) => {
    const promise = new Promise((resolve, reject) => {
      import(/* @vite-ignore */ `./${ext.file}`)
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
