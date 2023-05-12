import React, { useEffect, useState } from "react";
import * as helpers from "../helpers/helpers";

const Attachments = (props) => {
  const [attachments, setAttachments] = useState([]);
  useEffect(() => {
    helpers.getJSONWithParams(props.attachmentUrl, {}, (attachments) => {
      if (attachments.attachmentGroups && attachments.attachmentGroups.length > 0) {
        setAttachments(attachments.attachmentGroups[0].attachmentInfos);
        //console.log(attachments.attachmentGroups[0].attachmentInfos);
      }
    });
  }, [props.attachmentUrl]);

  return (
    <div className={attachments.length === 0 ? "sc-hidden" : undefined}>
      {attachments.map((attachment) => (
        <Attachment key={helpers.getUID()} url={attachment.url} title={attachment.name} contentType={attachment.contentType} />
      ))}
    </div>
  );
};

const Attachment = (props) => {
  const onAttachmentClick = (url, contentType) => {
    if (contentType.includes("image")) {
      helpers.showURLWindow(url, false);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <span className={"sc-fakeLink sc-info-window-row"} onClick={() => onAttachmentClick(props.url, props.contentType)}>
      {props.title}
    </span>
  );
};
export default Attachments;
