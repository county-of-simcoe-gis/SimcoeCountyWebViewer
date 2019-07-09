import React, { Component} from 'react';

class MyMapsSymbolizer extends Component {
  state = { 
  }

  render() { 
    return ( 
      <div>
        <div className="sc-fieldset">
          <legend>
              <img src={images['symbolizer.png']} /> 
                  Symbolizer
          </legend>
        </div>
        
      </div>
     );
  }
}

export default MyMapsSymbolizer;

// IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
    return images;
  }