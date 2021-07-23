import React, { Component } from "react";
import "./ShowTerms.css";
class ShowTerms extends Component {
	constructor(props) {
		super(props);

		this.myRef = React.createRef();

		this.state = {
			hide: false,
			color: this.props.color ? this.props.color : "green",
			acceptLabel: "Accept",
			showAccept: true,
			declineLabel: "Decline",
			showDecline: true,
		};
	}
	componentDidMount = () => {
		this.getOptions();
	};
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
		else if (window.sidebarOpen) return "sc-show-terms-container " + this.state.color;
		else return "sc-show-terms-container closed " + this.state.color;
	};

	getOptions = () => {
		let stateOptions = {};
		let { options } = this.props;
		if (options) {
			if (options.accept) {
				if (options.accept.label) stateOptions["acceptLabel"] = options.accept.label;
				if (options.accept.show !== undefined) stateOptions["showAccept"] = options.accept.show;
			}
			if (options.decline) {
				if (options.decline.label) stateOptions["declineLabel"] = options.decline.label;
				if (options.decline.show !== undefined) stateOptions["showDecline"] = options.decline.show;
			}
		}
		if (stateOptions) this.setState(stateOptions);
	};

	render() {
		const style = this.getClassName();
		return (
			<div ref={this.myRef} id="sc-show-terms-root">
				<div id="sc-show-terms-container" className={style}>
					<div className="sc-show-terms-title">{this.props.title}</div>
					<div className="sc-show-terms-content">{this.props.message}</div>
					<div className={this.props.url !== "" ? "sc-show-terms-url" : "sc-hidden"}>
						<a href={this.props.url} rel="noopener noreferrer" target="_blank">
							{this.props.title}
						</a>
					</div>
					<button className={this.state.showAccept ? "sc-button sc-show-terms-accept-button" : "sc-hidden"} onClick={this.onAcceptClick}>
						{this.state.acceptLabel}
					</button>
					<button className={this.state.showDecline ? "sc-button sc-show-terms-decline-button" : "sc-hidden"} onClick={this.onDeclineClick}>
						{this.state.declineLabel}
					</button>
				</div>
			</div>
		);
	}
}

export default ShowTerms;
