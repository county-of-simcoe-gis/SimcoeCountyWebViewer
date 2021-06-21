import React, { Component } from "react";
import "./ShowTerms.css";
class ShowTerms extends Component {
	constructor(props) {
		super(props);

		this.myRef = React.createRef();

		this.state = {
			hide: false,
			color: this.props.color ? this.props.color : "green",
		};
	}

	onAcceptClick = () => {
		this.setState({ hide: true }, () => {
			if (this.props.onAcceptClick !== undefined) this.props.onAcceptClick();
			if (this.props.onClose !== undefined) this.props.onClose(this.myRef);
		});
	};

	onDeclineClick = () => {
		this.setState({ hide: true }, () => {
			if (this.props.onDeclineClick !== undefined) this.props.onDeclineClick();
			if (this.props.onClose !== undefined) this.props.onClose(this.myRef);
		});
	};

	getClassName = () => {
		if (this.state.hide) return "sc-hidden";
		else if (window.sidebarOpen)
			return "sc-show-terms-container " + this.state.color;
		else return "sc-show-terms-container closed " + this.state.color;
	};

	render() {
		const style = this.getClassName();
		return (
			<div ref={this.myRef} id="sc-show-terms-root">
				<div id="sc-show-terms-container" className={style}>
					<div className="sc-show-terms-title">{this.props.title}</div>
					<div className="sc-show-terms-content">{this.props.message}</div>
					<div
						className={
							this.props.url !== "" ? "sc-show-terms-url" : "sc-hidden"
						}
					>
						<a href={this.props.url} rel="noopener noreferrer" target="_blank">
							{this.props.title}
						</a>
					</div>
					<button
						className="sc-button sc-show-terms-accept-button"
						onClick={this.onAcceptClick}
					>
						Accept
					</button>
					<button
						className="sc-button sc-show-terms-decline-button"
						onClick={this.onDeclineClick}
					>
						Decline
					</button>
				</div>
			</div>
		);
	}
}

export default ShowTerms;
