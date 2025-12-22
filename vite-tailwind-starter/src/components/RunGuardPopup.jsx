import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const COPY = {
  rules: {
    title: "Select Rules",
    msg: "Before running, select at least one rule. Open Rules in the left panel and tick a checkbox.",
  },
  cells: {
    title: "Select LVS Cells",
    msg: "Before running, select at least one LVS cell. Go to the right panel → LVS Cell List tab and select cells.",
  },
  both: {
    title: "Missing Selections",
    msg: "Before running, select both Rules and LVS Cells. Make your selections in Rules (left) and LVS Cell List (right).",
  },
};


export default function RunGuardPopup({ open, mode = "both", onClose }) {
  const data = COPY[mode] || COPY.both;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />

      {/* Card */}
      <div className="relative w-[520px] max-w-[92vw] rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/30 via-white/10 to-transparent shadow-[0_20px_80px_rgba(0,0,0,.75)]">
        <div className="relative rounded-2xl border border-white/10 bg-[#121316]/95 backdrop-blur-md overflow-hidden">
          {/* glossy top */}
          <div className="pointer-events-none absolute inset-x-2 top-2 h-10 rounded-xl bg-gradient-to-b from-white/10 to-transparent opacity-40" />

          {/* header */}
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/20">
                <AlertTriangle className="h-5 w-5 text-emerald-300" />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-white/90">
                  {data.title}
                </div>
                <div className="text-[12px] text-white/50">
                  Action required before Run
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition inline-flex items-center justify-center"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4 text-white/70" />
            </button>
          </div>

          {/* body */}
          <div className="px-5 pb-5 pt-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-white/80">
              {data.msg}
            </div>

            {/* footer */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg border border-emerald-400/20 bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-200 text-sm font-medium transition"
              >
                OK
              </button>
            </div>
          </div>

          {/* bottom glow */}
          <div className="pointer-events-none h-[2px] bg-gradient-to-r from-emerald-300 via-green-400 to-teal-500" />
        </div>
      </div>
    </div>
  );
}
