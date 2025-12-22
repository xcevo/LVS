import re
from collections import defaultdict
import json


def extract_cells(cir):
	with open(cir, 'r') as f:
		netlist = f.read()
		
	cellnames = re.findall(r"\.SUBCKT\s+(\w+)", netlist, flags=re.IGNORECASE)
	return cellnames

#===========================================================================
	
def total_cells(cir):
	cells = extract_cells(cir)
	return len(cells)

#===========================================================================	

def extract_metadata(cir):
    with open(cir) as f:
        netlist = f.read()

    # Extract all subcircuits
    subckt_pattern = re.compile(
        r"\.SUBCKT\s+(\w+)\s+([^\n]+?)\n(.*?)\.ENDS(?:\s+\1)?",
        re.IGNORECASE | re.DOTALL
    )
    
    subckts = {}
    pins = {}
    instances = defaultdict(list)   # parent → list of (inst_name, child_cell)

    for name, pinlist, body in subckt_pattern.findall(netlist):
        pins[name] = pinlist.split()
        subckts[name] = body
        
        # Extract instances inside this subckt
        inst_pattern = re.compile(r"^(X\w*)\s+(.*?)\s+(\w+)$", re.MULTILINE)
        for inst_name, nodes, cell in inst_pattern.findall(body):
            instances[name].append((inst_name, cell))

    # Determine top cell: the one never instantiated
    all_cells = set(subckts.keys())
    instantiated = {cell for insts in instances.values() for _, cell in insts}
    top_cells = list(all_cells - instantiated)
    top = top_cells[0] if top_cells else None

    return top, pins, instances

# Build a hierarchical tree (recursively)
def build_tree(instances, top):
    tree = {top: []}
    for inst_name, cell in instances[top]:
        tree[top].append({inst_name: build_tree(instances, cell)})
    return tree


# --------- Usage ----------
if __name__ == "__main__":
	top, pins, instances = extract_metadata("../10t_5cells.cdl")
	tree = json.dumps(build_tree(instances, top), indent=4)
	print("Top Cell:", top)
	print("\nPins:", pins)
	print("\nHierarchy Tree:", tree)
