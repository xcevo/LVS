// E:\LVS tool\vite-tailwind-starter\src\infotabs\results.jsx
import React from "react";
import { Download, CheckCircle2, XCircle } from "lucide-react";

const sampleRows = [
  { rule: "Rule 1", cell: "top", status: "OK" },
  { rule: "Rule 2", cell: "CPU_core", status: "Fail" },
  { rule: "Rule 3", cell: "PLL", status: "OK" },
  { rule: "Rule 4", cell: "SRAM_32K", status: "OK" },
  { rule: "Rule 5", cell: "IO_ring", status: "Fail" },
];

export default function Results({ items = sampleRows }) {
  return (
    <div className="space-y-3">
      {/* header actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Result (Sample)</div>
        <button
          type="button"
          className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-95 transition"
          onClick={() => {
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "result-sample.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" />
          <span className="text-xs">Export</span>
        </button>
      </div>

      {/* table */}
      <div className="rounded-md border border-white/10 overflow-hidden">
        <div className="grid grid-cols-3 text-xs bg-white/[.03] border-b border-white/10">
          <div className="px-3 py-2 font-semibold">Rule</div>
          <div className="px-3 py-2 font-semibold">Cell</div>
          <div className="px-3 py-2 font-semibold">Status</div>
        </div>

        <div className="divide-y divide-white/5">
          {items.map((r, i) => (
            <div key={i} className="grid grid-cols-3 items-center text-sm">
              <div className="px-3 py-2">{r.rule}</div>
              <div className="px-3 py-2 text-white/70">{r.cell}</div>
              <div className="px-3 py-2">
                {r.status === "OK" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400">
                    <XCircle className="h-4 w-4" />
                    Fail
                  </span>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="px-3 py-6 text-sm text-white/60">No data.</div>
          )}
        </div>
      </div>
    </div>
  );
}
