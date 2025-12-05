// Tooltip.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const Tooltip = ({ text, children }) => {
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // compute position (just below the icon)
  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,               // 8px gap below
      left: rect.left + rect.width / 2,   // center align
    });
  };

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [visible]);

  return (
    <div
      ref={triggerRef}
      className="relative flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
            className="
              px-3 py-1.5 text-xs font-medium text-white
              bg-[#222]/90 backdrop-blur-sm border border-white/15
              rounded-lg shadow-lg whitespace-nowrap
              transition-all duration-200 ease-out
            "
          >
            {text}
            {/* Arrow (pointing up) */}
            <div
              className="
                absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2
                bg-[#222]/90 border-t border-l border-white/15 rotate-45
              "
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default Tooltip;
