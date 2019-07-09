
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Menu, { SubMenu, Item as MenuItem, Divider } from 'rc-menu';
import 'rc-menu/assets/index.css';
import "./FloatingMenu.css";

// PROPER USE OF THIS COMPONENT IS TO USE A PORTAL.  HAVE A LOOK AT MyMapsItem FOR AN EXAMPLE.
class FloatingMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isVisible: true,
      styleMode: this.props.styleMode === undefined ? "right" : this.props.styleMode,
      style: {
        position: "absolute",
        zIndex: 1000,
        top: this.props.buttonEvent.pageY,
        left: this.props.buttonEvent.pageX,
        backgroundColor: "white",
        width: "180px"
      },
    }
  }

  componentDidMount() {


    this.getStyle((style) => {
      this.setState({ style: style });
    });


    //console.log(ReactDOM.findDOMNode(this).offsetHeight);
    //console.log(this.isElementInViewport(ReactDOM.findDOMNode(this)))
    //console.log(this.isElementInViewport(document.getElementById("portal-root")));

    // if (this.container !== undefined)
    //   console.log(this.container.offsetHeight)

    // CHECK IF IN VIEWPORT
    //console.log(this.isElementInViewport(this.container))
    // if (!this.isElementInViewport(this.container)){
    //   console.log("reset")
    //   this.setState({styleMode: "left"});
    //   this.forceUpdate();
    // }

    // CLICK ANYWHERE ELSE WILL CLOSE MENU
    this.clickEvent = document.body.addEventListener(
      "click",
      evt => {
        if (typeof evt.target.className === "string" && (evt.target.className.indexOf("rc-menu") > -1 || evt.target.className.indexOf("sc-floating-menu-") > -1))
          return;

        if (this.container !== null && !this.container.contains(evt.target)) {
          this.setState({ isVisible: false });
        }
      },
      true
    );
  }

  // isElementInViewport(container) {
  //   const top = container.getBoundingClientRect().bottom;
  //   const offset = 0;
  //   return (top + offset) >= 0 && (top - offset) <= window.innerHeight;
  // }

  isElementInViewport(el) {

    var rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
  }

  getStyle = (callback) => {

    if (this.state === undefined || !this.state.isVisible)
      callback({ display: "none" });


    let yOffset = 0;
    let style = null;
    window.requestAnimationFrame(() => {
      if (this.props.autoY) {
        if (this.container !== undefined && this.container !== null) {
          const isInViewport = this.isElementInViewport(this.container);
          if (!isInViewport) {
            yOffset = this.container.offsetHeight;
          }

        }
      }

      if (this.props.yOffset !== undefined) yOffset = this.props.yOffset;

      style = {
        position: "absolute",
        zIndex: 1000,
        top: this.props.buttonEvent.pageY - yOffset,
        left: this.state.styleMode === "right" ? this.props.buttonEvent.pageX : this.props.buttonEvent.pageX - 180,
        backgroundColor: "white",
        width: "180px"
      };


      if (this.state.isVisible)
        callback(style);

    });

  }

  handleSelect = () => {
    this.setState({ isVisible: false });
  }

  handleClick = (info) => {
    this.props.onMenuItemClick(info.key)
    this.setState({ isVisible: false });
  }

  render() {
    if (!this.state.isVisible) {
      return null;
    }

    return (
      <div className="sc-floating-menu-toolbox-menu-container" style={this.state.style} ref={container => this.container = container}>
        <Menu
          onSelect={this.handleSelect}
          defaultActiveFirst
          onClick={this.handleClick}
          onTitleClick={this.editMove}
          className="sc-floating-menu-toolbox-menu"
        >
          {this.props.children}
        </Menu>
      </div>
    );
  }
}

export default FloatingMenu;

// IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
  return images;
}

export function FloatingMenuItem(props) {
  return <div className="sc-floating-menu-toolbox-menu-icon-label-container"><img className="sc-floating-menu-toolbox-menu-icon" src={images[props.imageName]}></img><label className="sc-floating-menu-toolbox-menu-label">{props.label}</label></div>;
}

