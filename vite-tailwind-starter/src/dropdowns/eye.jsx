import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ChevronDown, Check,  FolderOpen } from "lucide-react"; // +Check for selected tick
import Tooltip from "../tools/tooltip";

export default function EyePanel() {
  const NO_FILE = "__NOFILE__";

  const [open, setOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false); // themed menu open/close

  // Folder files from Setup
  const [files, setFiles] = useState([]);        // File[]
  const [fileName, setFileName] = useState(NO_FILE); // selected file name

  const [rowsFromFile, setRowsFromFile] = useState(null);
  const [q, setQ] = useState("");

  // Folder picker (in-panel)
  const folderInputRef = useRef(null);
  const triggerFolder = () => folderInputRef.current?.click();
  const onFolder = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
   setFiles(picked);
    setFileName(NO_FILE);
    setRowsFromFile(null);
    setFileMenuOpen(false);
    // inform other panels (e.g., Results) that a new folder arrived
    window.dispatchEvent(new CustomEvent("eye:folderPicked", { detail: { files: picked }}));
    // allow re-selecting same folder
    e.target.value = "";
  };

  // Load + parse helper
  async function loadAndParse(file) {
    try {
      const text = await file.text();
      const parsed = parseErrText(text);
      if (parsed.length) {
        setRowsFromFile(parsed);
      } else {
        setRowsFromFile(null);
      }
    } catch {
      setRowsFromFile(null);
    }
  }

  // Parser (unchanged)
  function parseErrText(text) {
    try {
      const root = JSON.parse(text);
      if (root && Array.isArray(root.rules)) {
        const map = new Map();
        for (const r of root.rules) {
          const rule = ((r && (r.explanation || r.rule || r.message)) || "")
            .toString()
            .trim();
          if (!rule) continue;
          const count =
            Number(
              r.total_violations ??
                (Array.isArray(r.violations) ? r.violations.length : 0)
            ) || 0;
          map.set(rule, (map.get(rule) || 0) + count);
        }
        return Array.from(map, ([rule, count]) => ({ rule, count })).sort(
          (a, b) => b.count - a.count
        );
      }
    } catch {}

    const jsonMap = new Map();
    let sawJson = false;
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      let matched = false;
      try {
        const obj = JSON.parse(s);
        const exp = obj?.explanation ?? obj?.message ?? obj?.rule;
        if (typeof exp === "string" && exp.trim()) {
          const rule = exp.trim();
          jsonMap.set(rule, (jsonMap.get(rule) || 0) + 1);
          sawJson = matched = true;
        }
      } catch {}
      if (!matched) {
        const m = s.match(
          /["']?explanation["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i
        );
        if (m) {
          let rule = m[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
          if (rule) {
            jsonMap.set(rule, (jsonMap.get(rule) || 0) + 1);
            sawJson = true;
          }
        }
      }
    }
    if (sawJson && jsonMap.size) {
      return Array.from(jsonMap, ([rule, count]) => ({ rule, count })).sort(
        (a, b) => b.count - a.count
      );
    }

    const pairs = [];
    for (const s of text.split(/\r?\n/)) {
      const m = s.trim().match(/^(.*?)[,;:|\t]\s*(\d+)\s*$/);
      if (m) {
        const rule = m[1].trim().replace(/^["']|["']$/g, "");
        const count = parseInt(m[2], 10);
        if (rule && Number.isFinite(count)) pairs.push({ rule, count });
      }
    }
    if (pairs.length) {
      const map = new Map();
      for (const { rule, count } of pairs) {
        map.set(rule, (map.get(rule) || 0) + count);
      }
      return Array.from(map, ([rule, count]) => ({ rule, count })).sort(
        (a, b) => b.count - a.count
      );
    }

    const map = new Map();
    for (let s of text.split(/\r?\n/)) {
      s = s.trim();
      if (!s) continue;
      s = s
        .replace(/^[\s"']*explanation["']?\s*:\s*/i, "")
        .replace(/^["']|["']$/g, "")
        .replace(/[,\}]$/g, "")
        .replace(/\([^)]*\)/g, " ")
        .replace(/\b-?\d+(\.\d+)?\b/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!s) continue;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map, ([rule, count]) => ({ rule, count })).sort(
      (a, b) => b.count - a.count
    );
  }

  // Current rows (filtered)
  const rows = useMemo(() => {
    const base = rowsFromFile ?? [];
    if (!q) return base;
    const qq = q.toLowerCase();
    return base.filter((r) => r.rule.toLowerCase().includes(qq));
  }, [rowsFromFile, q]);

  const total = useMemo(
    () =>
      (rowsFromFile ?? []).reduce(
        (s, r) => s + (Number(r.count) || 0),
        0
      ),
    [rowsFromFile]
  );
  const showPlaceholder = fileName === NO_FILE;  // hide table/footer until a file is chosen

  // Handle file change from dropdown
  async function onSelectFile(e) {
    const name = e.target.value;
    if (name === NO_FILE) return;
    setFileName(name);
    const f = files.find((x) => x.name === name);

    if (f) {
      window.dispatchEvent(
        new CustomEvent("eye:fileSelected", {
          detail: { file: f, name: f.name },
        })
      );
      await loadAndParse(f);
    }
  }

  return (
    <div className="relative">
      <Tooltip text="DRC Error Window">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                     focus:outline-none focus:ring-2 focus:ring-green-500/40 active:scale-95 transition"
        >
          <Eye className="h-6 w-6 text-black fill-white" />
        </button>
      </Tooltip>

      {open && (
      <div  className={`fixed left-2 mt-2 w-[1300px] ${showPlaceholder ? "h-[200px]" : "h-[800px]"} rounded-xl border border-white/10 bg-[#111214] backdrop-blur-lg shadow-2xl p-3 text-[13px] text-white/90 z-50 flex flex-col`}>
          {/* Top controls: filter + file select (populated from Setup) */}
          <div className="flex gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to filter..."
              className="flex-1 h-8 rounded-md border border-white/10 bg-white/5 px-3 text-white/90 placeholder-white/50 outline-none focus:ring-2 focus:ring-green-500/30"
            />

             {/* Folder select (moved from Header->Setup into Eye) */}
            <div className="flex items-center">
              <Tooltip text="Upload folder">
              <button
                type="button"
               onClick={triggerFolder}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10
                           bg-white/5 hover:bg-white/10 active:scale-95 transition"
                
              >
                <FolderOpen className="h-4 w-4 text-white" />
              </button>
              </Tooltip>
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={onFolder}
                className="hidden"
              />
            </div>

            {/* Themed custom dropdown + hidden native select */}
            <div
              className="relative"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setFileMenuOpen(false);
                }
              }}
            >
              {/* Visible trigger */}
              <button
                type="button"
                onClick={() => setFileMenuOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={fileMenuOpen}
                className="inline-flex items-center justify-between h-8 min-w-[220px]
                           rounded-md border border-white/10 bg-white/5 px-3
                           text-white/90 outline-none transition
                           hover:bg-white/10 focus:ring-2 focus:ring-green-500/30"
              >
                <span
                  className={`truncate ${
                    fileName === NO_FILE ? "text-white/60" : ""
                  }`}
                >
                  {fileName === NO_FILE ? "Select an error file…" : fileName}
                </span>
                <ChevronDown
                  className={`ml-2 h-4 w-4 text-white/70 transition-transform ${
                    fileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Themed menu */}
              {fileMenuOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-50 mt-1 w-[220px] max-h-64 overflow-auto 
                             rounded-lg border border-white/10 bg-[#1b1c1f]/95 backdrop-blur
                             shadow-2xl"
                >
                  {files.length === 0 ? (
                    <li className="px-3 py-2 text-white/60">No files found</li>
                  ) : (
                    files.map((f) => {
                      const selected = f.name === fileName;
                      return (
                        <li key={f.name}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              onSelectFile({ target: { value: f.name } });
                              setFileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md
                                        hover:bg-white/10 focus:bg-white/10 outline-none
                                        ${selected ? "bg-white/10" : ""}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{f.name}</span>
                              {selected && (
                                <Check className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}

              {/* Keep original native select (not removed) */}
              <select
                value={fileName}
                onChange={onSelectFile}
                className="absolute inset-0 h-8 w-full opacity-0 pointer-events-none"
              >
                <option value={NO_FILE} disabled hidden>
                  Select an error file…
                </option>
                {files.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

         {showPlaceholder ? (
            <div className="mt-3 rounded-lg border border-white/10 px-3 py-6 text-white/70">
              Please upload a folder and select a file first.
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="mt-3 rounded-lg border border-white/10 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr,110px] bg-[#111214] text-white font-semibold">
                  <div className="px-3 py-2">Rule</div>
                  <div className="px-3 py-2 text-right">Total Count</div>
                </div>
                <div className="max-h-[700px] overflow-y-auto">
                  {rows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr,110px] border-t border-white/10 hover:bg-white/5"
                    >
                      <div className="px-3 py-2">{r.rule}</div>
                      <div className="px-3 py-2 text-right font-semibold text-green-500">
                        {r.count}
                      </div>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <div className="px-3 py-6 text-white/60">
                      No matching rules.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer total */}
              <div className="mt-[24px] w-full max-w-[1270px] rounded-lg bg-[#111214]/70 border border-white/10 px-3 py-2 
                              font-semibold text-green-500 flex justify-between">
                <div className="text-sm">Total number of DRC errors</div>
                <div className="tabular-nums">{total}</div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
