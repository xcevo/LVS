import re
import json
from collections import defaultdict

def normalize_model(model):
	m = model.lower()
	if m in ["p", "pmos"]: return "PMOS"
	if m in ["n", "nmos"]: return "NMOS"
	return model.upper()
	
#==========================================================================

def normalize_param(param):
	new_param = {}
	for key, val in param.items():
		new_param[key.lower()] = val
	return new_param

#==========================================================================
def read_dimension(val):
	if isinstance(val, (int, float)):
		return float(val)

	val = val.strip().lower()

	if val.endswith('u'):
		return float(val[:-1])		  # μm
	if val.endswith('n'):
		return float(val[:-1]) * 1e-3   # nm → μm
	if val.endswith('m'):
		return float(val[:-1]) * 1e3	# mm → μm

	return float(val)				   # already in μm

#==========================================================================
	
def match_with_tolerance(t1, t2, tol=0.01):
	t1[0] = read_dimension(t1[0])
	t1[1] = read_dimension(t1[1])
	t2[0] = read_dimension(t2[0])
	t2[1] = read_dimension(t2[1])
	return (
		abs(t1[0] - t2[0]) <= tol * abs(t1[0]) and
		abs(t1[1] - t2[1]) <= tol * abs(t1[1])
	)
	
#==========================================================================

def canonicalize_devices(devlist):
	#print(devlist)
	dev_sizes = []
	for d in devlist:
		params = normalize_param(d["params"])
		dev_sizes.append((normalize_model(d["model"]), params["l"], params["w"]))

	# Sort entire device list for final canonical form
	dev_sizes.sort()
	return dev_sizes

#==========================================================================


# -------------------------------------------------
# Compare two subcircuits for device size mismatch
# -------------------------------------------------

def compare_size(sub1, sub2):
	sig1 = canonicalize_devices(sub1["devices"])
	sig2 = canonicalize_devices(sub2["devices"])

	diff = []
	for s1, s2 in zip(sig1, sig2):
		if not match_with_tolerance(list(s1[1:]), list(s2[1:])):
			diff.append(("Schematic", s1, "Layout", s2))
		
	min_len = min(len(sig1), len(sig2))	
	
	if len(sig1) > min_len:
		for s1 in sig1[len(sig1)-1:]:
			diff.append(("Schematic", s1, "Layout", (None, None, None)))
			
	if len(sig2) > min_len:
		for s2 in sig2[len(sig2)-1:]:
			diff.append(("Schematic", (None, None, None), "Layout", s2))
	
	return diff
		

# -------------------------------------------------
# Main compare function
# -------------------------------------------------
def size_check_fun(cellname, source_netlist, layout_netlist, skip_cell=[]):
	final = {}
	
	if cellname not in skip_cell and cellname in source_netlist and cellname in layout_netlist:

		final[cellname] = compare_size(source_netlist[cellname], layout_netlist[cellname])

	return final


