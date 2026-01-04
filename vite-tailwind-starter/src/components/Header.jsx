import {
  MessageSquare, Save, BookOpen,
  Play,
} from "lucide-react";
import { useState } from "react";
import Toggle from "../dropdowns/toggle";
import InfoPanel from "../dropdowns/info";
import UploadGDS from "../infotabs/uploadgds";
import Filter from "../dropdowns/filter";
import Tooltip from "../tools/tooltip";
import EyePanel from "../dropdowns/eye";
import UploadCIR from "../infotabs/UploadCIR";

import RunGuardPopup from "./RunGuardPopup";

function IconBtn({ title, children, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-95 transition"
    >
      {children}
    </button>
  );
}

export default function Header() {
const [guard, setGuard] = useState({ open: false, mode: "both" });

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const handleRun = async () => {
    const username = localStorage.getItem("username") || "user1";


    // from Filter.jsx
    const rules = Array.isArray(window.__filterRules) ? window.__filterRules : [];
    const selectedRuleNames = new Set(window.__selectedRuleExplanations || []);
    // always length 8; pad with false if fewer rules are defined
    const checks = Array.from({ length: 8 }, (_, i) =>
      rules[i] ? selectedRuleNames.has(rules[i]) : false
    );

    // from Celllist.jsx
    const selected_cells = Array.isArray(window.__selectedLvsCells)
      ? window.__selectedLvsCells
      : Array.from(window.__selectedLvsCells || []);

    const missingRules = selectedRuleNames.size === 0;
const missingCells = !selected_cells || selected_cells.length === 0;

if (missingRules || missingCells) {
  const mode = missingRules && missingCells ? "both" : missingRules ? "rules" : "cells";
  setGuard({ open: true, mode });
  return; // ⛔ stop run
}
    // API ko sirf ye 2 fields bhejni hain
    const cirName = localStorage.getItem("cir_file_name") || "";
    const gdsName = localStorage.getItem("gds_file_name") || "";
    const body = {
      selected_cells,
      checks,
      netlist: cirName,   // ⬅️ CIR name
      layout: gdsName     // ⬅️ GDS name
    };

    console.log("▶ POST /lvs/lvs_runner body", body);

    try {
      const token = localStorage.getItem("access_token") || null;
       const headers =
      window.location.hostname !== "localhost" && token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
      const res = await fetch(`${API_BASE_URL}/lvs/lvs_runner`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        // error JSON to show message if backend sent it
        if (ct.includes("application/json")) {
          const err = await res.json();
          throw new Error(err?.message || "LVS run failed");
        }
        throw new Error(`HTTP ${res.status}`);
      }

      // success → file download
      const blob = await res.blob();
      // try to parse filename from Content-Disposition
      const dispo = res.headers.get("content-disposition") || "";
      const match = dispo.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename = decodeURIComponent(match?.[1] || match?.[2] || "lvs_report.txt");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("LVS run error:", e);
      alert(e.message || "Failed to run LVS");
    }

  };
  return (
    <>
    <header className="fixed top-0 z-50 w-full h-[50px] pt-[4px] border-b border-white/10 bg-[#1e1e1e]/95 backdrop-blur">
      <div className="h-11 px-3 flex items-center justify-between">

        {/* Left section: Brand + 6 icons */}
        <div className="flex items-center gap-8">
          <span className="font-bold text-2xl tracking-wide">
            <span className="text-emerald-400">IC</span>heck-LVS
          </span>

          <nav className="flex items-center gap-1">

            <Tooltip text="Upload CIR/CDL">
              <UploadCIR />
            </Tooltip>
            <span className="mx-1 w-px h-6 bg-white/10 rounded" />

            <Tooltip text="Upload GDS">
              <UploadGDS />
            </Tooltip>

            <span className="mx-1 w-px h-6 bg-white/10 rounded" />

            <Filter />

            <span className="mx-1 w-px h-6 bg-white/10 rounded" />

            <Tooltip text="Run">
              <button
                onClick={handleRun}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-95 transition shine-anim">
                <Play className="h-5 w-5 text-black fill-green-500" />
              </button>
            </Tooltip>

            <span className="mx-1 w-px h-6 bg-white/10 rounded" />

            <EyePanel />
          </nav>
        </div>

        {/* Right section: Save, Copy, Settings, Info */}
        <div className="flex items-center gap-1">
          <Tooltip text="Open PDF">
            <IconBtn><BookOpen className="h-5 w-5 text-white" /></IconBtn>
          </Tooltip>

          <span className="mx-1 w-px h-6 bg-white/10 rounded" />

          <Tooltip text="AI">
            <IconBtn><MessageSquare className="h-5 w-5 text-white fill-white" /></IconBtn>
          </Tooltip>

          <span className="mx-1 w-px h-6 bg-white/10 rounded" />

          <InfoPanel />
        </div>

        {/* premium blue underline */}
        {/* underline — Emerald Jade */}
        <div className="pointer-events-none absolute left-0 bottom-0 w-full">
          <div className="h-[1.5px] rounded bg-gradient-to-r from-emerald-300 via-green-400 to-teal-500" />
          <div className="-mt-[6px] h-[6px] rounded bg-gradient-to-r from-emerald-300/12 via-green-400/12 to-teal-500/12 blur-md" />
        </div>

      </div>
    </header>


    <RunGuardPopup
      open={guard.open}
      mode={guard.mode}
      onClose={() => setGuard({ open: false, mode: "both" })}
    />
  </>
    
  );
}
