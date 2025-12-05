import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import CellList from "../infotabs/Celllist";
import Tooltip from "../tools/tooltip";
import Results from "../infotabs/results";

export default function InfoPanel() {
  const [open, setOpen] = useState(false);
  const [ruledeckData, setRuledeckData] = useState(null);
  const [gdsData, setGdsData] = useState(null);
  const [tab, setTab] = useState(0);
  const [cellsData, setCellsData] = useState(null);

  // CIR: two sources → /cir/scan_cir (cirData) & /cir/get_circells (cirCells = Postman shape)
  const [cirData, setCirData] = useState(null);
  const [cirCells, setCirCells] = useState(null);

  // sliding indicator
  const tabsWrapRef = useRef(null);
  const tabRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // from Toggle.jsx (ruledeck scan)
  useEffect(() => {
    const onScanned = (e) => {
      setRuledeckData(e.detail || null);
      setTab(0);
      setOpen(true);
    };
    window.addEventListener("ruledeck:scanned", onScanned);
    return () => window.removeEventListener("ruledeck:scanned", onScanned);
  }, []);

  // from UploadGDS.jsx (gds scan)
  useEffect(() => {
    const onGds = (e) => {
      setGdsData(e.detail || null);
      setTab(0); // switch to GDS scan tab
      setOpen(true);
    };
    window.addEventListener("gds:scanned", onGds);
    return () => window.removeEventListener("gds:scanned", onGds);
  }, []);

  // from UploadCIR.jsx (cir scan, high-level)
  useEffect(() => {
    const onCir = (e) => {
      setCirData(e.detail || null);
      setTab(1); // switch to CIR tab
      setOpen(true);
    };
    window.addEventListener("cir:scanned", onCir);
    return () => window.removeEventListener("cir:scanned", onCir);
  }, []);

  // from UploadCIR.jsx (exact Postman response: /cir/get_circells)
  useEffect(() => {
    const onCirCells = (e) => {
      setCirCells(e.detail || null);
      setTab(1); // switch to CIR tab
      setOpen(true);
    };
    window.addEventListener("cir:cells", onCirCells);
    return () => window.removeEventListener("cir:cells", onCirCells);
  }, []);

  // indicator recalc
  const recalc = () => {
    const el = tabRefs.current[tab];
    const wrap = tabsWrapRef.current;
    if (el && wrap) {
      const eb = el.getBoundingClientRect();
      const wb = wrap.getBoundingClientRect();
      setIndicator({ left: eb.left - wb.left, width: eb.width });
    }
  };
  useEffect(() => {
    recalc();
  }, [tab, open]);
  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // LVS Cell list event
  useEffect(() => {
    const onCells = (e) => {
      setCellsData(e.detail || null);
      setTab(2);
      setOpen(true);
    };
    window.addEventListener("gds:cells", onCells);
    return () => window.removeEventListener("gds:cells", onCells);
  }, []);

  const tabs = ["GDS", "CIR", "LVS Cell List", "Result"];

  // helpers
  const fmtPairs = (arr) =>
    Array.isArray(arr)
      ? arr
          .map((p) => (Array.isArray(p) ? `(${p[0]}/${p[1]})` : ""))
          .filter(Boolean)
          .join(", ")
      : "";

  // CIR view model (prefer cirCells → fallback cirData)
  const cirView = (() => {
    const src = cirCells || cirData || null;
    if (!src) return null;
    return {
      topCell: src.topCell ?? "-",
      totalCells: src.totalCells ?? (src.cellList?.length ?? "-"),
      savedPath: src.savedPath ?? "",
      cellList: src.cellList ?? [],
      pins: src.pins ?? {}, // {cell: [pins]}
      instances: src.instances ?? {}, // {cell: [string | {name/of/nets}]}
      hierarchyTree: src.hierarchyTree ?? {},
      status: src.status ?? "",
    };
  })();

  return (
    <>
      <Tooltip text="Info Bar">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10
                   bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500/40 active:scale-95 transition"
        >
          <Info className="h-5 w-5 text-white" />
        </button>
      </Tooltip>

      {open && (
        <div
          className="fixed top-[51px] right-0 z-40 h-[calc(100vh-51px)] w-[340px] sm:w-[600px]
                        animate-[slideIn_.25s_ease-out_forwards] rounded-l-2xl border-l border-white/10
                        bg-[#111214] shadow-[0_15px_45px_rgba(0,0,0,.55)]"
        >
          <div className="flex h-12 items-center justify-between px-4 border-b border-white/10">
            <h3 className="text-sm font-semibold ">Information</h3>
          </div>

          {/* Tabs + green sliding underline */}
          <div className="px-3 py-2 border-b border-white/10">
            <div ref={tabsWrapRef} className="relative">
              <div className="grid grid-cols-4 gap-2">
                {tabs.map((t, i) => (
                  <button
                    key={t}
                    ref={(el) => (tabRefs.current[i] = el)}
                    onClick={() => setTab(i)}
                    className={`h-8 px-2 min-w-0 truncate rounded-md text-[11px] font-medium border transition
                      ${tab === i ? "bg-white/10 border-white/10" : "bg-white/5 hover:bg-white/10 border-white/10"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <span
                className="pointer-events-none absolute bottom-0 h-[2px] bg-emerald-500 transition-all duration-300 ease-out"
                style={{ left: `${indicator.left}px`, width: `${indicator.width}px` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-48px-44px)] overflow-y-auto p-4">
            {/* Tab 1: GDS Scan */}
            {tab === 0 && (
              <>
                {!gdsData && (
                  <p className="text-white/60 text-sm">Upload a GDS to see details here.</p>
                )}
                {!!gdsData?.error && (
                  <p className="text-red-400 text-sm">Error: {String(gdsData.error)}</p>
                )}

                {!!gdsData && !gdsData.error && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold">GDS Scan Details</h4>

                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Unit:</div>
                        <div className="px-3 py-2">{gdsData.unit}</div>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Precision:</div>
                        <div className="px-3 py-2">{gdsData.precision}</div>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Layers:</div>
                        <div className="px-3 py-2">{fmtPairs(gdsData.layers)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Text Layers:</div>
                        <div className="px-3 py-2">{fmtPairs(gdsData.text_layers)}</div>
                      </div>

                      {/* Labels (scrollable table) */}
                      <div className="grid grid-cols-[160px_1fr]">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Labels:</div>
                        <div className="px-0 py-0">
                          <div className="m-2 max-h-64 overflow-auto rounded border border-white/10">
                            <div className="grid grid-cols-[160px_1fr] bg-white/[.03] text-sm font-medium">
                              <div className="px-3 py-2 border-r border-white/10">Cell Name</div>
                              <div className="px-3 py-2">Labels</div>
                            </div>
                            <div className="divide-y divide-white/10">
                              {gdsData.labels &&
                                Object.keys(gdsData.labels).map((cell) => (
                                  <div
                                    key={cell}
                                    className="grid grid-cols-[160px_1fr] text-sm"
                                  >
                                    <div className="px-3 py-2 border-r border-white/10">
                                      {cell}
                                    </div>
                                    <div className="px-3 py-2">
                                      {gdsData.labels[cell].join(", ")}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tab 2: CIR Scan */}
            {tab === 1 && (
              <>
                {!cirView && (
                  <p className="text-white/60 text-sm">
                    Upload a CIR/CDL to see details here.
                  </p>
                )}
                {!!(cirData?.error || cirCells?.error) && (
                  <p className="text-red-400 text-sm">
                    Error: {String(cirData?.error || cirCells?.error)}
                  </p>
                )}

                {!!cirView && (
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold">CIR Netlist Details</h4>

                    {/* Summary */}
                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Top Cell:</div>
                        <div className="px-3 py-2">{cirView.topCell}</div>
                      </div>
                      <div className="grid grid-cols-[160px_1fr] border-b border-white/10">
                        <div className="px-3 py-2 bg-white/[.03] font-semibold">Total Cells:</div>
                        <div className="px-3 py-2">{cirView.totalCells}</div>
                      </div>
                      </div>

                    {/* Cell List */}
                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="px-3 py-2 bg-white/[.03] font-semibold">Cell List</div>
                      <div className="max-h-44 overflow-auto divide-y divide-white/10 text-sm">
                        {cirView.cellList?.length ? (
                          cirView.cellList.map((c, i) => (
                            <div key={i} className="px-3 py-2">
                              {c}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2">—</div>
                        )}
                      </div>
                    </div>

                    {/* Pins table */}
                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="px-3 py-2 bg-white/[.03] font-semibold">Pins</div>
                      <div className="max-h-56 overflow-auto">
                        <div className="grid grid-cols-[220px_1fr] bg-white/[.03] text-sm font-medium">
                          <div className="px-3 py-2 border-r border-white/10">Cell</div>
                          <div className="px-3 py-2">Pins</div>
                        </div>
                        <div className="divide-y divide-white/10 text-sm">
                          {Object.keys(cirView.pins || {}).length ? (
                            Object.entries(cirView.pins).map(([cell, pins], idx) => (
                              <div key={cell + idx} className="grid grid-cols-[220px_1fr]">
                                <div className="px-3 py-2 border-r border-white/10">{cell}</div>
                                <div className="px-3 py-2">
                                  {Array.isArray(pins) ? pins.join(", ") : String(pins)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2">—</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Instances table */}
                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="px-3 py-2 bg-white/[.03] font-semibold">Instances</div>
                      <div className="max-h-64 overflow-auto">
                        <div className="grid grid-cols-[220px_1fr] bg-white/[.03] text-sm font-medium">
                          <div className="px-3 py-2 border-r border-white/10">Cell</div>
                          <div className="px-3 py-2">Instances</div>
                        </div>
                        <div className="divide-y divide-white/10 text-sm">
                          {Object.keys(cirView.instances || {}).length ? (
                            Object.entries(cirView.instances).map(([cell, instArr], idx) => (
                              <div key={cell + idx} className="grid grid-cols-[220px_1fr]">
                                <div className="px-3 py-2 border-r border-white/10">{cell}</div>
                                <div className="px-3 py-2">
                                  {!instArr?.length ? (
                                    "—"
                                  ) : (
                                    <ul className="list-disc list-inside space-y-1">
                                      {instArr.map((it, i2) => {
                                        if (typeof it === "string") return <li key={i2}>{it}</li>;
                                        const n = it?.name || it?.inst || "-";
                                        const of = it?.cell || it?.of || "-";
                                        const nets = it?.nets
                                          ? Object.entries(it.nets)
                                              .map(([k, v]) => `${k}:${v}`)
                                              .join(", ")
                                          : it?.connections || "";
                                        return (
                                          <li key={i2}>
                                            {n} (of {of})
                                            {nets ? ` — ${nets}` : ""}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2">—</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hierarchy */}
                    <div className="rounded-md overflow-hidden border border-white/10">
                      <div className="px-3 py-2 bg-white/[.03] font-semibold">Hierarchy</div>
                      <div className="max-h-44 overflow-auto divide-y divide-white/10 text-sm">
                        {Object.keys(cirView.hierarchyTree || {}).length ? (
                          Object.entries(cirView.hierarchyTree).map(([cell, children], i) => (
                            <div key={cell + i} className="px-3 py-2">
                              <span className="font-medium">{cell}</span>
                              <span className="text-white/60">
                                {" "}
                                → {children?.length ? children.join(", ") : "—"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2">—</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* other tabs (as before)… */}
            {tab === 2 && <CellList initialData={cellsData} />}
            {tab === 3 && <Results />}
          </div>

          <style>{`
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0%); } }
          `}</style>
        </div>
      )}
    </>
  );
}
