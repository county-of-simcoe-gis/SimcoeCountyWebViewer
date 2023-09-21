import React, { useEffect, useRef } from "react";
import { FaGithub } from "react-icons/fa";
import "./sc-github-btn.css";
const GitHubButton = (props) => {
  const $ = useRef(null);
  const _ = useRef(null);

  useEffect(() => {
    const paint = async () => {
      const _ = $.current.appendChild(document.createElement("span"));
      const { render } = await import(/* webpackMode: "eager" */ "github-buttons");

      if (_.current != null) {
        render(_.appendChild(_.current), function (el) {
          try {
            _.parentNode.replaceChild(el, _);
          } catch (_) {}
        });
      }
    };

    const reset = () => {
      $.current.replaceChild(_.current, $.current.lastChild);
    };

    paint();

    return () => {
      reset();
    };
  }, []);

  return (
    <div className="widget widget-lg">
      <a {...props} ref={_} className="btn" target="_blank">
        <FaGithub size={16} className="octicon octicon-mark-github" />
        <span ref={$}>{props.children}</span>
      </a>
    </div>
  );
};

export default GitHubButton;
