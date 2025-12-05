import React from "react";
import { Filter as FilterIcon } from "lucide-react";
import Tooltip from "../tools/tooltip";

export default class Filter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      rules: ["Port Check","Device Mismatch","Device Size errors","Net mismatch","Open Circuit","Short Circuit","Latchup Error","Well Shorts"],
      selected: new Set(),   // user multi-select
      allOn: false, 
      z: 50,         // independent toggle; not auto-synced to selection
    };
  }

  componentDidMount() {
    // compatibility: expose current selections
    window.__selectedRuleExplanations = Array.from(this.state.selected);

    window.__filterRules = Array.from(this.state.rules);
  }

  // small toggle (emerald theme)
  RenderToggle({ on, setOn, label }) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => setOn(!on)}
        className={`relative inline-flex h-[22px] w-10 items-center rounded-full transition ${
          on ? "bg-emerald-500" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] transform rounded-full bg-black transition ${
            on ? "translate-x-[20px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    );
  }

  handleAll = (v) => {
    this.setState(
      (prev) => ({
        allOn: v,
        selected: v ? new Set(prev.rules) : new Set(),
      }),
      () => {
        window.__selectedRuleExplanations = Array.from(this.state.selected);
        window.__filterRules = Array.from(this.state.rules);
      }
    );
  };

  toggleRule = (r) => {
    this.setState(
      (prev) => {
        const next = new Set(prev.selected);
        next.has(r) ? next.delete(r) : next.add(r);
        return { selected: next }; // allOn remains independent
      },
      () => {
        window.__selectedRuleExplanations = Array.from(this.state.selected);
        window.__filterRules = Array.from(this.state.rules);
      }
    );
  };

  render() {
    const { open, rules, selected, allOn } = this.state;
    const Toggle = this.RenderToggle.bind(this);

    return (
      <div className="relative">
        <Tooltip text="Rules">
             <button
            onClick={() =>
              this.setState((prev) => {
                const opening = !prev.open;
                const next = { open: opening };
                if (opening) {
                  window.__floatingZ = (window.__floatingZ || 50) + 1;
                  next.z = window.__floatingZ;
                }
                return next;
              })
            }
            className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-95
                       flex items-center justify-center transition"
            aria-label="Filter"
            aria-expanded={open}
          >
            <FilterIcon className="h-5 w-5 fill-white text-black" />
          </button>
        </Tooltip>

        {open && (
   <div
     className="fixed left-2 top-[51px] w-[360px] group"
     style={{ zIndex: this.state.z || 50 }}
     onMouseDown={() => {
       window.__floatingZ = (window.__floatingZ || 50) + 1;
       this.setState({ z: window.__floatingZ });
     }}
   >
     {/* gradient border wrapper — matches Toggle */}
     <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent">
       {/* card */}
       <div className="relative rounded-[11px] border border-white/10 bg-[#1e1e1e]/90 backdrop-blur-sm
                       shadow-[0_8px_28px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.06)] p-3 text-sm text-white/90">
         {/* glossy top highlight */}
         <span className="pointer-events-none absolute inset-x-1 top-1 h-6 rounded-t-[10px]
                          bg-gradient-to-b from-white/10 to-transparent opacity-35"></span>

         {/* existing content starts here */}
         <div className="px-3 py-2 text-xs font-semibold text-center bg-white/[.03] border border-white/10 rounded-md">
           Rules
         </div>
          <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-white/[.02] border border-white/10 rounded-md">
    <Toggle on={allOn} setOn={this.handleAll} label="Select all / Deselect all" />
    <span className="text-sm">{allOn ? "Select all" : "Deselect all"}</span>
  </div>

         {/* ...rest of your existing inner content stays the same... */}
          {/* multi-select list of 5 rules */}
              <div className="mt-3 rounded-md border border-white/10 overflow-hidden divide-y divide-white/5">
                {rules.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-white/[.04]"
                  >
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={selected.has(r)}
                      onChange={() => this.toggleRule(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
       </div>
     </div>
   </div>
 )}

      </div>
    );
  }
}



