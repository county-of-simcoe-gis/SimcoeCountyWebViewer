// import React from 'react';
// import ReactDOM from 'react-dom';
// import ReactModal from 'react-modal';

// ReactModal.setAppElement('#root')

// const customStyles = {
//   content : {
//     top                   : '50%',
//     left                  : '50%',
//     right                 : 'auto',
//     bottom                : 'auto',
//     marginRight           : '-50%',
//     transform             : 'translate(-50%, -50%)',
//     zIndex           : '10000',
//   }
// };

// class ModalWindow extends React.Component {
//     constructor(props){
//         super(props);

//         this.state = {
//             showModal: false
//         };

//         this.handleOpenModal = this.handleOpenModal.bind(this);
//         this.handleCloseModal = this.handleCloseModal.bind(this);
//     }
//     componentWillMount(){
//         if (this.props.show){
//             this.setState({showModal: true})
//         }

//         if (this.props.appElement != undefined){
//             ReactModal.setAppElement(this.props.appElement);
//         }
//     }
//     handleOpenModal () {
//         this.setState({ showModal: true });
//     }

//     handleCloseModal () {
//         this.setState({ showModal: false });
//     }

//     render () {
//     return (
//         <div>
//         {/* <button onClick={this.handleOpenModal}>Trigger Modal</button> */}
//         <ReactModal
//             isOpen={this.state.showModal}
//             contentLabel="Minimal Modal Example"
//         >
//             <button onClick={this.handleCloseModal}>Close Modal</button>
//         </ReactModal>
//         </div>
//     );
//     }
// }

// export default ModalWindow;
