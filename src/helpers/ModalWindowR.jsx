import React from 'react';
import ReactDOM from 'react-dom';
import Modal from 'react-responsive-modal';

export default class ModalWindowR extends React.Component {
  state = {
    open: this.props.open ? true : false,
  };

  onOpenModal = () => {
    this.setState({ open: true });
  };

  onCloseModal = () => {
    this.setState({ open: false });
  };

  render() {
    const { open } = this.state;
    return (
        <Modal open={open} onClose={this.onCloseModal} center container={this.props.container}>
          <h2>Simple centered modal</h2>
        </Modal>
    );
  }
}

//ReactDOM.render(<ModalWindowR />, document.getElementById('root'));