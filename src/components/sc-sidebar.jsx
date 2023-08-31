import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

const CANCEL_DISTANCE_ON_SCROLL = 20;

const defaultStyles = {
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  sidebar: {
    zIndex: 2,
    position: "absolute",
    top: 0,
    bottom: 0,
    transition: "transform .3s ease-out",
    WebkitTransition: "-webkit-transform .3s ease-out",
    willChange: "transform",
    overflowY: "auto",
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    transition: "left .3s ease-out, right .3s ease-out",
  },
  overlay: {
    zIndex: 1,
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    visibility: "hidden",
    transition: "opacity .3s ease-out, visibility .3s ease-out",
    backgroundColor: "rgba(0,0,0,.3)",
  },
  dragHandle: {
    zIndex: 1,
    position: "fixed",
    top: 0,
    bottom: 0,
  },
};

const Sidebar = ({
  children,
  styles,
  rootClassName,
  sidebarClassName,
  contentClassName,
  overlayClassName,
  sidebar,
  docked,
  open,
  transitions,
  touch,
  touchHandleWidth,
  pullRight,
  shadow,
  dragToggleDistance,
  onSetOpen,
  defaultSidebarWidth,
  rootId,
  sidebarId,
  contentId,
  overlayId,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [touchIdentifier, setTouchIdentifier] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchCurrentX, setTouchCurrentX] = useState(null);
  const [dragSupported, setDragSupported] = useState(false);

  const sidebarRef = useRef(null);

  const isTouching = () => touchIdentifier !== null;

  const overlayClicked = () => {
    if (open) {
      onSetOpen(false);
    }
  };

  const onTouchStart = (ev) => {
    if (!isTouching()) {
      const touch = ev.targetTouches[0];
      setTouchIdentifier(touch.identifier);
      setTouchStartX(touch.clientX);
      setTouchCurrentX(touch.clientX);
    }
  };

  const onTouchMove = (ev) => {
    if (isTouching()) {
      for (let ind = 0; ind < ev.targetTouches.length; ind++) {
        if (ev.targetTouches[ind].identifier === touchIdentifier) {
          setTouchCurrentX(ev.targetTouches[ind].clientX);
          break;
        }
      }
    }
  };

  const onTouchEnd = () => {
    if (isTouching()) {
      const touchWidth = touchSidebarWidth();

      if ((open && touchWidth < sidebarWidth - dragToggleDistance) || (!open && touchWidth > dragToggleDistance)) {
        onSetOpen(!open);
      }

      setTouchIdentifier(null);
      setTouchStartX(null);
      setTouchCurrentX(null);
    }
  };

  const onScroll = () => {
    if (isTouching() && inCancelDistanceOnScroll()) {
      setTouchIdentifier(null);
      setTouchStartX(null);
      setTouchCurrentX(null);
    }
  };

  const inCancelDistanceOnScroll = () => {
    let cancelDistanceOnScroll;

    if (pullRight) {
      cancelDistanceOnScroll = Math.abs(touchCurrentX - touchStartX) < CANCEL_DISTANCE_ON_SCROLL;
    } else {
      cancelDistanceOnScroll = Math.abs(touchStartX - touchCurrentX) < CANCEL_DISTANCE_ON_SCROLL;
    }
    return cancelDistanceOnScroll;
  };

  const saveSidebarWidth = () => {
    const width = sidebarRef.current.offsetWidth;

    if (width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  };

  const saveSidebarRef = (node) => {
    sidebarRef.current = node;
  };

  const touchSidebarWidth = () => {
    if (pullRight) {
      if (open && window.innerWidth - touchStartX < sidebarWidth) {
        if (touchCurrentX > touchStartX) {
          return sidebarWidth + touchStartX - touchCurrentX;
        }
        return sidebarWidth;
      }
      return Math.min(window.innerWidth - touchCurrentX, sidebarWidth);
    }

    if (open && touchStartX < sidebarWidth) {
      if (touchCurrentX > touchStartX) {
        return sidebarWidth;
      }
      return sidebarWidth - touchStartX + touchCurrentX;
    }
    return Math.min(touchCurrentX, sidebarWidth);
  };

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator ? navigator.userAgent : "");
    setDragSupported(typeof window === "object" && "ontouchstart" in window && !isIos);
    saveSidebarWidth();
  }, []);

  useEffect(() => {
    if (!isTouching()) {
      saveSidebarWidth();
    }
  }, [open]);

  const sidebarStyle = {
    ...defaultStyles.sidebar,
    ...styles.sidebar,
  };

  const contentStyle = {
    ...defaultStyles.content,
    ...styles.content,
  };

  const overlayStyle = {
    ...defaultStyles.overlay,
    ...styles.overlay,
  };

  const useTouch = dragSupported && touch;

  const hasBoxShadow = shadow && (isTouching || open || docked);

  if (pullRight) {
    sidebarStyle.right = 0;
    sidebarStyle.transform = "translateX(100%)";
    sidebarStyle.WebkitTransform = "translateX(100%)";
    if (hasBoxShadow) {
      sidebarStyle.boxShadow = "-2px 2px 4px rgba(0, 0, 0, 0.15)";
    }
  } else {
    sidebarStyle.left = 0;
    sidebarStyle.transform = "translateX(-100%)";
    sidebarStyle.WebkitTransform = "translateX(-100%)";
    if (hasBoxShadow) {
      sidebarStyle.boxShadow = "2px 2px 4px rgba(0, 0, 0, 0.15)";
    }
  }

  if (isTouching()) {
    const percentage = touchSidebarWidth() / sidebarWidth;

    if (pullRight) {
      sidebarStyle.transform = `translateX(${(1 - percentage) * 100}%)`;
      sidebarStyle.WebkitTransform = `translateX(${(1 - percentage) * 100}%)`;
    } else {
      sidebarStyle.transform = `translateX(-${(1 - percentage) * 100}%)`;
      sidebarStyle.WebkitTransform = `translateX(-${(1 - percentage) * 100}%)`;
    }

    overlayStyle.opacity = percentage;
    overlayStyle.visibility = "visible";
  } else if (docked) {
    if (sidebarWidth !== 0) {
      sidebarStyle.transform = `translateX(0%)`;
      sidebarStyle.WebkitTransform = `translateX(0%)`;
    }

    if (pullRight) {
      contentStyle.right = `${sidebarWidth}px`;
    } else {
      contentStyle.left = `${sidebarWidth}px`;
    }
  } else if (open) {
    sidebarStyle.transform = `translateX(0%)`;
    sidebarStyle.WebkitTransform = `translateX(0%)`;

    overlayStyle.opacity = 1;
    overlayStyle.visibility = "visible";
  }

  if (isTouching() || !transitions) {
    sidebarStyle.transition = "none";
    sidebarStyle.WebkitTransition = "none";
    contentStyle.transition = "none";
    overlayStyle.transition = "none";
  }

  let dragHandle;

  if (useTouch) {
    if (open) {
      dragHandle = <div style={{ ...defaultStyles.dragHandle, ...styles.dragHandle }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} />;
    } else {
      const dragHandleStyle = {
        ...defaultStyles.dragHandle,
        ...styles.dragHandle,
      };
      dragHandleStyle.width = touchHandleWidth;

      if (pullRight) {
        dragHandleStyle.right = 0;
      } else {
        dragHandleStyle.left = 0;
      }

      dragHandle = <div style={dragHandleStyle} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} />;
    }
  }

  return (
    <div className={rootClassName} style={{ ...defaultStyles.root, ...styles.root }} role="navigation" id={rootId}>
      <div className={sidebarClassName} style={sidebarStyle} ref={saveSidebarRef} id={sidebarId}>
        {sidebar}
      </div>
      <div className={overlayClassName} style={overlayStyle} onClick={overlayClicked} id={overlayId} />
      <div className={contentClassName} style={contentStyle} id={contentId}>
        {dragHandle}
        {children}
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  children: PropTypes.node.isRequired,
  styles: PropTypes.shape({
    root: PropTypes.object,
    sidebar: PropTypes.object,
    content: PropTypes.object,
    overlay: PropTypes.object,
    dragHandle: PropTypes.object,
  }),
  rootClassName: PropTypes.string,
  sidebarClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  overlayClassName: PropTypes.string,
  sidebar: PropTypes.node.isRequired,
  docked: PropTypes.bool,
  open: PropTypes.bool,
  transitions: PropTypes.bool,
  touch: PropTypes.bool,
  touchHandleWidth: PropTypes.number,
  pullRight: PropTypes.bool,
  shadow: PropTypes.bool,
  dragToggleDistance: PropTypes.number,
  onSetOpen: PropTypes.func,
  defaultSidebarWidth: PropTypes.number,
  rootId: PropTypes.string,
  sidebarId: PropTypes.string,
  contentId: PropTypes.string,
  overlayId: PropTypes.string,
};

Sidebar.defaultProps = {
  docked: false,
  open: false,
  transitions: true,
  touch: true,
  touchHandleWidth: 20,
  pullRight: false,
  shadow: true,
  dragToggleDistance: 30,
  onSetOpen: () => {},
  styles: {},
  defaultSidebarWidth: 0,
};

export default Sidebar;
