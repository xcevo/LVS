import { useEffect, useMemo, useState } from "react";

export default function HeirarchyScan({ initialData }) {
  const [gdsCells, setGdsCells] = useState([]);   // cells from uploaded GDS (unique)
  const [txtNames, setTxtNames] = useState([]);   // raw names from .txt (unique, trimmed)

  // make unique list from flat + tree
  const uniqueNames = (list = [], tree = []) => {
    const s = new Set(Array.isArray(list) ? list : []);
    const walk = (arr) =>
      Array.isArray(arr) &&
      arr.forEach((n) => {
        if (n?.cellname) s.add(n.cellname);
        walk(n?.dependencies || []);
      });
    walk(tree);
    return [...s];
  };

  // hydrate when panel opens with data
  useEffect(() => {
    if (!initialData) return;
    const { cellList = [], cellTree = [] } = initialData;
    setGdsCells(uniqueNames(cellList, cellTree));
  }, [initialData]);

  // listen to global events (Upload GDS / TXT in Cells tab)
  useEffect(() => {
    const onGds = (e) => {
      const { cellList = [], cellTree = [] } = e.detail || {};
      setGdsCells(uniqueNames(cellList, cellTree));
    };
    const onTxt = (e) => {
      const raw = Array.isArray(e.detail?.names) ? e.detail.names : [];
      const cleaned = [...new Set(raw.map((n) => String(n).trim()).filter(Boolean))];
      setTxtNames(cleaned);
    };
    window.addEventListener("gds:cells", onGds);
    window.addEventListener("cells:txtUploaded", onTxt);
     // 🔽 NEW: pick up TXT that may have been uploaded before mount
  if (Array.isArray(window.__lastTxtNames)) {
    const cleaned = [...new Set(window.__lastTxtNames.map(n => String(n).trim()).filter(Boolean))];
    setTxtNames(cleaned);
  }

    return () => {
      window.removeEventListener("gds:cells", onGds);
      window.removeEventListener("cells:txtUploaded", onTxt);
    };
  }, []);

  // === SUMMARY LOGIC (as per your spec) ===
  const gdsSet = useMemo(() => new Set(gdsCells), [gdsCells]);

  // list-of-names shown:
  // - Present => **all** GDS cells
  // - Not Present => TXT-only cells (not in GDS)
  const presentList = gdsCells;
  const notPresentList = useMemo(
    () => (txtNames.length ? txtNames.filter((n) => !gdsSet.has(n)) : []),
    [txtNames, gdsSet]
  );

  // counts:
  const totalPresent = presentList.length;                              // GDS total
  const totalNot = notPresentList.length;                               // TXT-only
  const total = totalPresent + totalNot; 
  console.log(`humara console =${totalPresent}, ${totalNot}, ${total}`)                               // GDS + TXT-only

  return (
    <div className="space-y-4">
      {/* Cells Overview */}
      <div className="rounded-md overflow-hidden border border-white/10">
        <div className="px-3 py-2 text-sm font-semibold text-center bg-white/[.03] border-b border-white/10">
  Cells Overview
</div>


        <div className="grid grid-cols-[200px_1fr] border-b border-white/10">
          <div className="px-3 py-2 font-semibold bg-white/[.03]">Cells Present in GDS:</div>
          <div className="px-3 py-2 text-white/80 break-words">
            {presentList.length ? presentList.join(", ") : "—"}
          </div>
        </div>

        <div className="grid grid-cols-[200px_1fr]">
          <div className="px-3 py-2 font-semibold bg-white/[.03]">Cells Not Present in GDS:</div>
          <div className="px-3 py-2 text-white/80 break-words">
            {notPresentList.length ? notPresentList.join(", ") : "—"}
          </div>
        </div>
      </div>

      {/* Cells Summary Count */}
      <div className="rounded-md overflow-hidden border border-white/10">
        <div className="px-3 py-2 text-sm font-semibold text-center bg-white/[.03] border-b border-white/10">
  Cells Summary Count
</div>


        <div className="grid grid-cols-[260px_1fr] border-b border-white/10">
          <div className="px-3 py-2 font-semibold bg-white/[.03]">Total Cells Present in GDS:</div>
          <div className="px-3 py-2">{totalPresent}</div>
        </div>
        <div className="grid grid-cols-[260px_1fr] border-b border-white/10">
          <div className="px-3 py-2 font-semibold bg-white/[.03]">Total Cells Not Present in GDS:</div>
          <div className="px-3 py-2">{totalNot}</div>
        </div>
        <div className="grid grid-cols-[260px_1fr]">
          <div className="px-3 py-2 font-semibold bg-white/[.03]">Total Cells:</div>
          <div className="px-3 py-2">{total}</div>
        </div>
      </div>
    </div>
  );
}
