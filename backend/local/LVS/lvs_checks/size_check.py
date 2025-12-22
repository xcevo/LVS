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
	
def match_with_tolerance(t1, t2, tol=0.02):
	t1[0] = read_dimension(t1[0])
	t1[1] = read_dimension(t1[1])
	t2[0] = read_dimension(t2[0])
	t2[1] = read_dimension(t2[1])
	return (
		abs(t1[0] - t2[0]) <= tol * abs(t1[0]) and
		abs(t1[1] - t2[1]) <= tol * abs(t1[1])
	)
	
#==========================================================================

def canonicalize_devices(ports, devlist):
	"""
	Canonicalize MOSFET devices in a topology-based,
	order-independent way.
	"""
	port_set = set(ports)

	# 1. Build connectivity signature for each internal net
	net_connections = defaultdict(list)

	for d in devlist:
		for num, role in enumerate(["d", "g", "s", "b"]):
			net = d["nets"][num]
			if net not in port_set:
				# Store type + role (D/G/S/B) for grouping
				net_connections[net].append((normalize_model(d["model"]), role))

	# 2. Assign deterministic IDs based on sorted connectivity signatures
	internal_map = {}
	for idx, (net, conn) in enumerate(
		sorted(net_connections.items(), key=lambda x: sorted(x[1]))
	):
		internal_map[net] = f"INT_{idx+1}"

	# 3. Convert each device into canonical signature
	def map_net(n):
		if n in port_set:
			return f"PORT_{n}"
		return internal_map[n]
		
	canonical = []
	for d in devlist:
		D = map_net(d["nets"][0])
		G = map_net(d["nets"][1])
		S = map_net(d["nets"][2])
		B = map_net(d["nets"][3])

		# Device signature is order-independent by sorting nets
		params = normalize_param(d["params"])
		signature = (
			normalize_model(d["model"]),
			tuple(sorted([D, G, S, B])),
			d["inst"],
			params["l"],
			params["w"]
		)
		canonical.append(signature)

	# Sort entire device list for final canonical form
	canonical.sort()
	return canonical

#==========================================================================	
	
#def canonicalize_devices(devlist):
#	#print(devlist)
#	dev_sizes = []
#	for d in devlist:
#		params = normalize_param(d["params"])
#		dev_sizes.append((normalize_model(d["model"]), params["l"], params["w"]))
#
#	# Sort entire device list for final canonical form
#	dev_sizes.sort()
#	return dev_sizes
#
#==========================================================================


# -------------------------------------------------
# Compare two subcircuits for device size mismatch
# -------------------------------------------------

def compare_size(sub1, sub2):
	sig1 = canonicalize_devices(sub1["ports"], sub1["devices"])
	sig2 = canonicalize_devices(sub2["ports"], sub2["devices"])
	
	#--------------------matches nets-------------------
	diff = []
	sig1_remaining = []
	sig2_copy = []
	for s1 in sig1:
		flag = 0
		for s2 in sig2:
			if s1[:2] == s2[:2]:
				if not match_with_tolerance(list(s1[3:]), list(s2[3:])):
					diff.append(("Schematic", s1[2:], "Layout", s2[2:]))
				flag = 1
				sig2_copy.append(s2)
				break
				
		if flag == 0:
			sig1_remaining.append(s1)
	
	#-----------matches device types, W and L-----------
	sig1_matched = []
	sig2_matched = []
	sig2_remaining = set(sig2) - set(sig2_copy)
	for s1 in sig1_remaining:
		for s2 in sig2_remaining:
			if s1[0] == s2[0]:
				if match_with_tolerance(list(s1[3:]), list(s2[3:])):
					sig1_matched.append(s1)
					sig2_matched.append(s2)
	
	sig1_remaining = set(sig1_remaining) - set(sig1_matched)	
	sig2_remaining = set(sig2_remaining) - set(sig2_matched)
	
	for s1 in sig1_remaining:
		diff.append(("Schematic", s1[2:], "Layout", (None, None, None)))
	for s2 in sig2_remaining:
		diff.append(("Schematic", (None, None, None), "Layout", s2[2:]))
	
	return diff
		

# -------------------------------------------------
# Main compare function
# -------------------------------------------------
def size_check_fun(cellname, source_netlist, layout_netlist, skip_cell=[]):
	final = {}
	
	if cellname not in skip_cell and cellname in source_netlist and cellname in layout_netlist:

		final[cellname] = compare_size(source_netlist[cellname], layout_netlist[cellname])

	return final


