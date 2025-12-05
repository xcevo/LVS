import { useEffect, useRef, useState, useMemo } from "react";
import HeirarchyScan from "../subtabs/heirarchyScan";

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * LVS Cell List panel with two sub-tabs:
 * - Tab 0: Heirarchy View  -> now shows LVS cells from /cell_list/lvs_celllist with checkboxes
 * - Tab 1: Heirarchy Scan  -> existing functionality unchanged
 */
export default function CellList({ initialData }) {
  const [subTab, setSubTab] = useState(0);

  // underline indicator infra (unchanged)
  const subTabRef = useRef(0);
  useEffect(() => {
    subTabRef.current = subTab;
  }, [subTab]);

  const wrapRef = useRef(null);
  const btnRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const recalc = () => {
    const el = btnRefs.current[subTabRef.current];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const eb = el.getBoundingClientRect();
    const wb = wrap.getBoundingClientRect();
    setIndicator({ left: eb.left - wb.left, width: eb.width });
  };

  useEffect(() => {
    recalc();
  }, [subTab]);
  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ------------------ NEW: LVS cells via API ------------------
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [cirFile, setCirFile] = useState("");
  const [gdsFile, setGdsFile] = useState("");
  const [lvsCells, setLvsCells] = useState([]); // array of strings

  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(new Set()); // selected cell names

  // Fetch once when component mounts OR when user switches to tab 0 first time
  useEffect(() => {
    // if we already fetched, don't refetch
    if (lvsCells.length || loading || subTab !== 0) return;

    const fetchCells = async () => {
      try {
        setLoading(true);
        setApiErr("");

        const token = localStorage.getItem("access_token") || null;
        const headers =
          window.location.hostname !== "localhost" && token
            ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" };

        const cirName = localStorage.getItem("cir_file_name") || "";
        const gdsName = localStorage.getItem("gds_file_name") || "";

        const res = await fetch(`${API_BASE_URL}/cell_list/lvs_celllist`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            cir_File: cirName,
            gds_File: gdsName,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || data?.error || "Fetch failed");

        setCirFile(data?.cirFile || "");
        setGdsFile(data?.gdsFile || "");
        setLvsCells(Array.isArray(data?.lvsCells) ? data.lvsCells : []);
      } catch (err) {
        setApiErr(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchCells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  // expose current selection globally for Header Play
  useEffect(() => {
    window.__selectedLvsCells = Array.from(selected || []);
  }, [selected]);

  // derived filtered view
  const filteredCells = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return lvsCells;
    return lvsCells.filter((c) => c.toLowerCase().includes(q));
  }, [lvsCells, filter]);

  const allVisibleSelected =
    filteredCells.length > 0 &&
    filteredCells.every((c) => selected.has(c));
  const toggleSelectAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      // unselect visible
      filteredCells.forEach((c) => next.delete(c));
    } else {
      // select visible
      filteredCells.forEach((c) => next.add(c));
    }
    setSelected(next);
  };
  const toggleOne = (cell) => {
    const next = new Set(selected);
    if (next.has(cell)) next.delete(cell);
    else next.add(cell);
    setSelected(next);
  };

  // ------------------ UI ------------------
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div ref={wrapRef} className="relative">
        <div className="grid grid-cols-2 gap-2">
          {["Heirarchy View", "Heirarchy Scan"].map((t, i) => (
            <button
              key={t}
              ref={(el) => (btnRefs.current[i] = el)}
              onClick={() => setSubTab(i)}
              className={`h-8 rounded-md text-xs font-medium border transition
                ${subTab === i
                  ? "bg-white/10 border-white/10"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* sliding green underline */}
        <span
          className="pointer-events-none absolute bottom-0 h-[2px] bg-emerald-500 transition-all duration-300 ease-out"
          style={{ left: `${indicator.left}px`, width: `${indicator.width}px` }}
        />
      </div>

      {/* Sub-tab content */}
      {subTab === 0 && (
        <div className="space-y-3">
          {/* Header row: filter + meta + actions */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Type to Filter..."
              className="h-8 px-3 rounded-md bg-white/5 text-sm outline-none border border-white/10 focus:ring-2 focus:ring-emerald-500/30"
            />
            <div className="h-8 px-3 rounded-md bg-white/5 text-xs flex items-center border border-white/10">
              {gdsFile ? `GDS: ${gdsFile}` : ""}
            </div>
            <div className="h-8 px-3 rounded-md bg-white/5 text-xs flex items-center border border-white/10">
              {cirFile ? `CIR: ${cirFile}` : ""}
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                disabled={loading || filteredCells.length === 0}
              />
              <span>Select All</span>
            </label>
            {loading && <span className="text-white/60 text-sm">Loading…</span>}
            {apiErr && (
              <span className="text-red-400 text-sm truncate">Error: {apiErr}</span>
            )}
          </div>

          {/* Cells list */}
          <div className="rounded-md overflow-hidden border border-white/10">
            <div className="grid grid-cols-1 bg-white/[.03] text-sm font-semibold px-3 py-2">
              LVS Cells
            </div>
            <div className="max-h-72 overflow-auto divide-y divide-white/10 text-sm">
              {filteredCells.length ? (
                filteredCells.map((cell) => (
                  <label
                    key={cell}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={selected.has(cell)}
                      onChange={() => toggleOne(cell)}
                    />
                    <span className="select-none">{cell}</span>
                  </label>
                ))
              ) : (
                <div className="px-3 py-2 text-white/60">—</div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 1 && <HeirarchyScan initialData={initialData} />}
    </div>
  );
}
