import config from "./config.json";
export const fetchExtensions = (props, callback = undefined) => {
  let allPromises = [];
  config.extensions.forEach((ext) => {
    const promise = new Promise((resolve, reject) => {
      import(`./${ext.file}`)
        .then((item) => {
          const { fetchData, dataRows, content, arnExtension, actions } = item;
          props.addExtension(fetchData, dataRows, content, arnExtension, actions, config.extensions.indexOf(ext), ext.type);
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
