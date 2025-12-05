import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Toggle() {
  const [open, setOpen] = useState(false);
  const [z, setZ] = useState(50);
  const [selected, setSelected] = useState("Select");
  const [selectOpen, setSelectOpen] = useState(false); // custom select open/close
  const ref = useRef(null);

  // close on outside click + Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSelectOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const options = [
    "Ruledeck 1",
    "Ruledeck 2",
    "Ruledeck 3",
  ];

 

  return (
    <div ref={ref} className="relative">
      {/* Toggle icon */}
         <button
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (next) {
              window.__floatingZ = (window.__floatingZ || 50) + 1;
              setZ(window.__floatingZ);
            }
            return next;
          })
        }
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 
                   bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 
                   focus:ring-emerald-500/40 active:scale-95 transition"
      >
        {open ? (
          <ChevronUp className="h-5 w-5 text-white" />
        ) : (
          <ChevronDown className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Dropdown */}
       {open && (
        <div
          className="fixed left-2 top-[51px] w-[320px] group"
         style={{ zIndex: z }}
          onMouseDown={() => {
            window.__floatingZ = (window.__floatingZ || 50) + 1;
            setZ(window.__floatingZ);
          }}
        >
          {/* gradient border wrapper */}
          <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent">
            {/* card */}
            <div className="relative rounded-[11px] border border-white/10 bg-[#1e1e1e]/90 backdrop-blur-sm shadow-[0_8px_28px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.06)] p-4 text-sm text-white/90">
              {/* glossy top highlight */}
              <span className="pointer-events-none absolute inset-x-1 top-1 h-6 rounded-t-[10px] bg-gradient-to-b from-white/10 to-transparent opacity-35"></span>

              <label className="block text-xs px-1 font-semibold text-white/110 mb-2">
                Select <span className="text-emerald-400">DRC</span> rule deck
              </label>

              {/* Custom select (no OS blue) */}
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setSelectOpen((v) => !v)}
                  className="relative w-full rounded-md border border-white/10 bg-[#2a2a2a] px-2 py-1.5 text-left text-white
                             focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between
                             shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_4px_12px_rgba(0,0,0,.35)]"
                >
                  <span className="truncate">{selected}</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>

                {selectOpen && (
                  <ul
                    className="absolute left-0 mt-1 w-full max-h-56 overflow-auto rounded-md border border-white/10
                               bg-[#131313] shadow-[0_10px_30px_rgba(0,0,0,.55)] z-50"
                  >
                    {options.map((opt) => (
                      <li
                        key={opt}
                        onClick={() => {
                          setSelected(opt);
                          setSelectOpen(false);
                          scanRuledeck(opt); // 👈 select hote hi scan
                        }}
                        className={`px-2 py-1.5 cursor-pointer hover:bg-[#2f2f2f] transition-colors
                                   ${selected === opt ? "bg-[#202020] ring-1 ring-inset ring-emerald-500/60" : ""}`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* NOTE: Scan icon permanently removed as requested */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

