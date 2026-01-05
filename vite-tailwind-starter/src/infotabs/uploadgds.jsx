import { useRef } from "react";
import { UploadIcon } from "lucide-react";


const API_BASE_URL = import.meta.env.VITE_API_URL; 

export default function UploadGDS() {
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();
  // ✅ clear old LVS/Filter selections so new upload never sends old JSON
  const resetLvsClientState = () => {
    try { localStorage.removeItem("selected_lvs_cells"); } catch {}
    try { window.__selectedLvsCells = []; } catch {}

    // Filter.jsx uses this for selected rules (Header reads it)
    try { window.__selectedRuleExplanations = []; } catch {}

    // optional "hard reset" signal (CellList listens and clears UI)
    window.dispatchEvent(
      new CustomEvent("lvs:reset", { detail: { reason: "gdsChanged" } })
    );
  };

  const handleFile = async (file) => {
  if (!file) return;


  const token = localStorage.getItem("access_token") || null;

  try {
    // 1) upload file → /get_cellnames  (returns savedPath, unit, precision)
    resetLvsClientState();
    const fd = new FormData();
    fd.append("gds_file", file);

   const headers =
        window.location.hostname !== "localhost" && token
          ? { Authorization: `Bearer ${token}` }
          : {};

      const uploadRes = await fetch(`${API_BASE_URL}/gds/get_cellnames`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers,
      });
    const up = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(up?.message || up?.error || "Upload failed");
    // 🔔 send cell list/tree to Cell List tab
const nameOnly = (up.savedPath || "").split(/[\\/]/).pop();
localStorage.setItem("gds_file_name", nameOnly);
window.__lastGdsName = nameOnly; // ✅ Run DRC payload ke liye
window.__lastGdsPath = up.savedPath || "";

window.dispatchEvent(
  new CustomEvent("gds:cells", {
    detail: { cellList: up.cellList, cellTree: up.cellTree, gdsName: nameOnly },
  })
);

 // 🔔 notify LVS CellList that CIR/GDS pair may have changed (future-proof refetch trigger)
 // (does NOT replace existing events; just adds a new one)
 const cirName = localStorage.getItem("cir_file_name") || "";
 window.dispatchEvent(
   new CustomEvent("lvs:pairChanged", { detail: { cirName, gdsName: nameOnly } })
 );

    // savedPath may be like "users/<username>/<file>.gds"
    // backend /scan_gds expects only the filename; it will prefix users/<username> itself
   

    // 2) scan gds → /scan_gds (layers, text_layers, labels, unit, precision)
    const scanRes = await fetch(`${API_BASE_URL}/gds/scan_gds`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(window.location.hostname !== "localhost" && token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          inpGds: nameOnly, // 👈 only the file name
          precision: up.precision ?? 1e-9,
          unit: up.unit ?? 1e-6,
          type: "both",
        }),
      });
    const scan = await scanRes.json();
    if (!scanRes.ok) throw new Error(scan?.error || "Scan failed");

    // 3) send data to Info panel + switch to Tab 2 (GDS scan)
    window.dispatchEvent(new CustomEvent("gds:scanned", { detail: scan }));
  } catch (err) {
    console.error("GDS upload/scan error:", err);
    window.dispatchEvent(new CustomEvent("gds:scanned", { detail: { error: String(err) } }));
  }
};


  return (
    <>
      <button
        onClick={openPicker}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                   focus:outline-none focus:ring-2 focus:ring-green-500/40 active:scale-95 transition"
      >
        <UploadIcon className="h-5 w-5 text-white" />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".gds,.gdsii"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
      />
    </>
  );
}
