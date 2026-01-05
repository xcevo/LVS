import { useRef } from "react";
import { UploadIcon } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function UploadCIR() {
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.click();
  // ✅ clear old LVS/Filter selections so new upload never sends old JSON
  const resetLvsClientState = () => {
    try { localStorage.removeItem("selected_lvs_cells"); } catch {}
    try { window.__selectedLvsCells = []; } catch {}
    try { window.__selectedRuleExplanations = []; } catch {}
    window.dispatchEvent(
      new CustomEvent("lvs:reset", { detail: { reason: "cirChanged" } })
    );
  };

  const handleFile = async (file) => {
    if (!file) return;

    const token = localStorage.getItem("access_token") || null;
    const auth =
      window.location.hostname !== "localhost" && token
        ? { Authorization: `Bearer ${token}` }
        : {};

    try {
      // 1) Upload CIR → /cir/get_circells
       resetLvsClientState();
      const fd = new FormData();
      fd.append("cir_file", file);

      const upRes = await fetch(`${API_BASE_URL}/cir/get_circells`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { ...auth },
      });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up?.message || up?.error || "Upload failed");
      console.log("cir data", up)
      const nameOnly = (up.savedPath || "").split(/[\\/]/).pop();
      localStorage.setItem("cir_file_name", nameOnly);
      window.__lastCirPath = up.savedPath || "";
      // 🔔 notify LVS CellList that CIR/GDS pair may have changed (future-proof refetch trigger)
      // (does NOT replace existing events; just adds a new one)
      const gdsName = localStorage.getItem("gds_file_name") || "";
      window.dispatchEvent(
        new CustomEvent("lvs:pairChanged", {
          detail: { cirName: nameOnly, gdsName },
        })
      );
      // (optional) cells list event
      window.dispatchEvent(
        new CustomEvent("cir:cells", {
          detail: { ...up, cirName: nameOnly },
        })
      );

      // 2) Rescan (consistent with GDS flow) → /cir/scan_cir
      const scanRes = await fetch(`${API_BASE_URL}/cir/scan_cir`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ inpCir: nameOnly }),
      });
      const scan = await scanRes.json();
      if (!scanRes.ok) throw new Error(scan?.error || "Scan failed");

      // 3) InfoPanel ko push karo → CIR tab
      window.dispatchEvent(new CustomEvent("cir:scanned", { detail: scan }));
    } catch (err) {
      console.error("CIR upload/scan error:", err);
      window.dispatchEvent(new CustomEvent("cir:scanned", { detail: { error: String(err) } }));
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
        accept=".cir,.cdl,.sp,.spi,.spice"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
      />
    </>
  );
}
