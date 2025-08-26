"use client";

import React from "react";
import "./FooterButtons.css";

interface FooterButtonsProps {
  onTools?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

const FooterButtons: React.FC<FooterButtonsProps> = ({ onTools, onDelete, onClose }) => {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  return (
    <div className="sc-mymaps-footer-buttons-container">
      <button className="sc-button sc-mymaps-popup-footer-button" id={generateId()} onClick={onTools}>
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAZdJREFUeNqkU71OAkEQnpUjMYcEMISfxgcgVhJptZaCBqSyprOg8zHoxEoaDULiC1x8AAUj8acghIZQwIVAQIh6cOfM3h0eBw0yybezMzt/u7PDNE2DTUgoMTYX0n/7NOLUZnuHKNKmaEm6ZbVI6SyIOEPUEWUDdUMXTNkrsApJjPzOWPgDQETDi6SRqczYbQngIQIQRl3HHiCPiJqKiKap5/n8oZTJPJoV4jupl7ruylZ1ld0AVJLZbFRRFF3T73NEfT4OeuTnwYDrDrxeDp5ZEOA+l6sKUxQmkwkM0Ihoj+B2A0ynIMvyom42g16vx3WiKAL5CpTX4/FwrEuKGaDZbEK73V4yCBcKnL/G4+D3+xfOqAIe4AcXSZJWZujWatBoNABarfl1rES+wjcux7EYyN3ukoEzEIAAohMKwa7xeCY5HA54qlT0CoThEHbG46UAL4kE5yGXa+U59/2k+2AXnNguTVUBEMSpfUfoyGeF5NGIPsRCAPJlJwDX+Hf3/zNI+CXfaHqof9t0rTX9Z4gvtuk4/wowABBVpMWVwh3oAAAAAElFTkSuQmCC"
          className="sc-mymaps-footer-buttons-img"
          alt="Tools"
        />
        Tools
      </button>
      <button className="sc-button sc-mymaps-popup-footer-button" id={generateId()} onClick={onDelete}>
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAkpJREFUeNp0kk+IElEcx39vFBc9+OfQRTAwzFt4CaYOKStj6MoeculStzoIQSB4kCVckmDx4iGCXWYJIqjoVOzO1l4qT1F7WfBWHvxzDPyTB3XUmXn93suRybUffHmP997n9/cRsFgwGARJkiAcDsPlwgEIeEZQAhCRAkgAlOD6SQP4rgMFDWVnYCAQgFgsBqFQCBwOByzZNQOotPHx1RNCCCipu6bfb+zSnslkeOQVILPrBkAirbws9btdTEWAzZPXpfepOzaeGMBXwe/3w3+MwTc3Dl+UeghTiskbBvR6Pbh18mZHB0jjmxvCKhIfR37s3r+Sevf8ca/T4TBF2HTSODuDxP7uNjrZFFbBk8lEzOVyspa4ykGYw2zfbTb/7ilvok1YhlVVFfP5vDydTkHXdXDdlhZOOnPY4/HA0YPtp3h6LFjh8XgsFgoFGTPgsKm1zDr8ajTQh8Fh5eGjZzjGI8yjKlgjF4tFeTQanWtou93G6Qngdrth6+1+9h6hTULJZ/PeziJXKhV5OByeg1ut1gJOp9NZTdNOcQ419ot+ggp1qoLdBFmqVmNpm3A8Huewy+Wq1RH8QH9zmBlJJpMRdCIqiiIPBgN+2MCGsW/r8/kgGo1m0fmpzWarseayHlmNeL1eFiWC0cRqtSr3+/3FpSiKHMZtjU1glbFyfKgLTqfzEka9OJvNeDnzz1JnCaFmqOl8ZdJY1SiDOXCiXKg1NtG5DIt0y6ov3dE/AgwAENFWYYLj4mYAAAAASUVORK5CYII="
          className="sc-mymaps-footer-buttons-img"
          alt="Delete"
        />
        Delete
      </button>
      <button className="sc-button sc-mymaps-popup-footer-button" id={generateId()} onClick={onClose}>
        <img
          src="data:image/gif;base64,R0lGODlhEAAQALMLAMXGycDBw6mqrubn6Kqrr7m6vc7O0M3O0PT09Nvb3aWmqv///wAAAAAAAAAAAAAAACH5BAEAAAsALAAAAAAQABAAAARZcMk1TiGknDEnMoIijoKBeMCojsC5GGusGFSoBImaBKJQjYlFThEcKiw6YVF1WQWFK4xTYhRlkonlSAOEEr3HgQ2n4yl8L9mKtkCk1IqWBxQruTqVS2bTiQAAOw=="
          className="sc-mymaps-footer-buttons-img"
          alt="Close"
        />
        Close
      </button>
    </div>
  );
};

export default FooterButtons;
