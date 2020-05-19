import React, { Component } from "react";
import "./AddLayer.css";
import Collapsible from "react-collapsible";
import * as helpers from "../../../../helpers/helpers";
import AddLayerForm from "./AddLayerForm.jsx";


class AddLayer extends Component {
  constructor(props) {
    super(props);

    this.inputId = "sc-toc-add-layer-input";
    this.state = {
      open: false
    };
  }


    onContentClose = () => {
        this.setState({open:false});
    }

  render() {
    return (
      <div id="sc-toc-add-layer" className={this.props.className} title="Add Layer">
        <Collapsible key={helpers.getUID()} trigger="&nbsp;" open={this.state.open}>
          <div className="sc-toc-add-layer-content">
            <AddLayerForm onClose={this.onContentClose} isOpen={this.state.open} />
          </div>
        </Collapsible>
      </div>
    );
  }
}

export default AddLayer;
