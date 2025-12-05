import { useEffect, useMemo, useRef, useState } from "react";
import { List, GitBranch, ChevronRight, ChevronDown, Upload } from "lucide-react";
if (!window.__checkedCells) window.__checkedCells = {};

export default function CellsSubtab({ initialData }) {
  const [mode, setMode] = useState("hier"); // 'hier' | 'list'
  const [query, setQuery] = useState("");
  const [gdsName, setGdsName] = useState("");
  const [cells, setCells] = useState([]);   // flat list of names
  const [tree, setTree] = useState([]);     // dependencies tree [{cellname, dependencies:[]}]
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState({});

   // ✅ add this effect right here
  useEffect(() => {
    const map = {};
    selected.forEach((name) => { map[name] = true; });
    window.__checkedCells = map;                          // global for Run DRC
    window.__checkedCellArray = Array.from(selected);     // (optional) array
    window.dispatchEvent(new CustomEvent("cells:changed", { detail: { checked: map }}));
  }, [selected]);

  // hydrate from prop (when Info panel open hotey hi data mila ho)
  useEffect(() => {
    if (!initialData) return;
    const { cellList = [], cellTree = [], gdsName: gName = "" } = initialData || {};
    setCells(Array.isArray(cellList) ? Array.from(new Set(cellList)) : []);
    setTree(Array.isArray(cellTree) ? cellTree : []);
    setGdsName(gName || "");
    const top = {};
    (cellTree || []).forEach((n) => (top[n.cellname] = true));
    setExpanded(top);
  }, [initialData]);

  // also listen directly (agar upload event mount se baad aaye)
  useEffect(() => {
    const onCells = (e) => {
      const { cellList = [], cellTree = [], gdsName: gName = "" } = e.detail || {};
      setCells(Array.isArray(cellList) ? Array.from(new Set(cellList)) : []);
      setTree(Array.isArray(cellTree) ? cellTree : []);
      setGdsName(gName || "");
      const top = {};
      (cellTree || []).forEach((n) => (top[n.cellname] = true));
      setExpanded(top);
    };
    window.addEventListener("gds:cells", onCells);
    return () => window.removeEventListener("gds:cells", onCells);
  }, []);

  const allNames = useMemo(() => {
    const out = new Set(cells);
    const walk = (arr) => arr?.forEach((n) => { out.add(n.cellname); walk(n.dependencies || []); });
    walk(tree || []);
    return out;
  }, [cells, tree]);

  const toggleTick = (name) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

 const handleTxtUpload = async (file) => {
  let names = [];
  try {
    // no file => clear + broadcast empty
    if (!file) {
      setSelected(new Set());
      window.__lastTxtNames = [];
      window.dispatchEvent(new CustomEvent("cells:txtUploaded", { detail: { names: [] } }));
      return;
    }

    // read file
    const text = await file.text();

    // de-dup + strip comments/blanks
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
      const n = line.replace(/#.*/, "").trim();
      if (n && !seen.has(n)) { seen.add(n); names.push(n); }
    }

    // select only those present in GDS hierarchy
    const want = new Set(names.filter((n) => allNames.has(n)));
    setSelected(want);
  } catch (err) {
    console.error("txt upload parse failed:", err);
  }

  // ✅ always cache for late listeners + broadcast for live ones
  window.__lastTxtNames = names;
  window.dispatchEvent(new CustomEvent("cells:txtUploaded", { detail: { names } }));
};



  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cells;
    return cells.filter((n) => n.toLowerCase().includes(q));
  }, [cells, query]);

  // hierarchy filter => keep node if self or any child matches
  const filterTree = (nodes, q) => {
    if (!Array.isArray(nodes)) return [];
    return nodes
      .map((n) => {
        const kids = filterTree(n.dependencies || [], q);
        const selfHit = n.cellname.toLowerCase().includes(q);
        if (selfHit || kids.length) return { ...n, dependencies: kids };
        return null;
      })
      .filter(Boolean);
  };
  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? filterTree(tree, q) : tree;
  }, [tree, query]);

  // UI helpers
  const FileBtn = ({ onPick }) => {
    const ref = useRef(null);
    return (
      <>
        <button
          onClick={() => ref.current?.click()}
          className="h-8 rounded-md text-xs font-medium border bg-white/5 hover:bg-white/10 border-white/10 px-3 inline-flex items-center gap-2"
          title="Select a .txt file"
        >
          <Upload className="h-4 w-4" /> Select a .txt file
        </button>
        <input
          ref={ref}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
      </>
    );
  };

  const Row = ({ name, depth = 0, hasKids = false, open = false, onToggle }) => (
    <div
      className="flex items-center h-8 px-3 border-b border-white/5 hover:bg-white/5"
      style={{ paddingLeft: Math.max(12, 12 + depth * 16) }}
    >
      {hasKids ? (
        <button onClick={onToggle} className="mr-2 inline-flex items-center justify-center h-5 w-5 rounded bg-white/5 border border-white/10">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <span className="mr-2 inline-block h-5 w-5" />
      )}
      <input
        type="checkbox"
        checked={selected.has(name)}
        onChange={() => toggleTick(name)}
        className="mr-2"
      />
      <span className="truncate">{name}</span>
    </div>
  );

  const Node = ({ node, depth = 0 }) => {
    const kids = node.dependencies || [];
    const open = !!expanded[node.cellname];
    return (
      <>
        <Row
          name={node.cellname}
          depth={depth}
          hasKids={kids.length > 0}
          open={open}
          onToggle={() => setExpanded((p) => ({ ...p, [node.cellname]: !open }))}
        />
        {open &&
          kids.map((k) => <Node key={`${node.cellname}->${k.cellname}`} node={k} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="space-y-3">
      {/* controls bar: filter + txt + mode toggle */}
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to Filter..."
          className="h-8 flex-1 rounded-md bg-[#26282b] text-sm px-3 border border-white/10 outline-none focus:ring-2 focus:ring-green-500/30"
        />
        <FileBtn onPick={handleTxtUpload} />
        <div className="ml-1 inline-flex rounded-md overflow-hidden border border-white/10">
          <button
            title="Hierarchy"
            onClick={() => setMode("hier")}
            className={`h-8 w-8 grid place-items-center ${mode === "hier" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"}`}
          >
            <GitBranch className="h-4 w-4" />
          </button>
          <button
            title="List"
            onClick={() => setMode("list")}
            className={`h-8 w-8 grid place-items-center border-l border-white/10 ${mode === "list" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* panel title */}
      <div className="rounded-md border border-white/10 bg-white/[0.03]">
        <div className="h-8 flex items-center px-3 text-sm font-medium border-b border-white/10">
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) setSelected(new Set(allNames));
              else setSelected(new Set());
            }}
            className="mr-2"
            checked={selected.size && selected.size === allNames.size}
          />
          <span className="mr-2">Select All</span>
          {gdsName ? <span className="ml-auto text-white/50 text-xs truncate">GDS: {gdsName}</span> : null}
        </div>

        {/* content */}
        {mode === "list" ? (
          <div className="max-h-[54vh] overflow-auto">
            {filteredList.length === 0 && (
              <div className="px-3 py-3 text-sm text-white/60">No cells.</div>
            )}
            {filteredList.map((name) => (
              <Row key={name} name={name} />
            ))}
          </div>
        ) : (
          <div className="max-h-[54vh] overflow-auto">
            {(!filteredTree || filteredTree.length === 0) ? (
              <div className="px-3 py-3 text-sm text-white/60">No hierarchy.</div>
            ) : (
              filteredTree.map((n) => <Node key={n.cellname} node={n} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
