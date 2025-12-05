import re
import json
from collections import defaultdict

def normalize_model(model):
	m = model.lower()
	if m in ["p", "pmos"]: return "PMOS"
	if m in ["n", "nmos"]: return "NMOS"
	return model.upper()

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
		signature = (
			normalize_model(d["model"]),
			tuple(sorted([D, G, S, B])),
			d["inst"]
		)
		canonical.append(signature)

	# Sort entire device list for final canonical form
	canonical.sort()
	return canonical

#==========================================================================


# -------------------------------------------------
# Compare two subcircuits for nets mismatch
# -------------------------------------------------

def nets_check_fun(sub1, sub2):
	sig1 = canonicalize_devices(sub1["ports"], sub1["devices"])
	sig2 = canonicalize_devices(sub2["ports"], sub2["devices"])

	#print("sig1", sig1)
	#print("\nsig2", sig2)
	
	if sig1 == sig2:
		return {}
	else:
		all_nets = set()
		all_nets.add(p for s in sig1 for p in s[1])
		all_nets.add(p for s in sig2 for p in s[1])
				
		diff = {
			"Schematic": [s for s in sig1 if s not in sig2],
			"Layout":   [s for s in sig2 if s not in sig1]
		}
		diff["Schematic"].sort()
		diff["Layout"].sort()
		
		max_dev = max(len(diff["Schematic"]), len(diff["Layout"]))
		
		mismatch = []
		for idx in range(max_dev):
			dev1 = diff["Schematic"][idx] if idx < len(diff["Schematic"]) else []
			dev2 = diff["Layout"][idx] if idx < len(diff["Layout"]) else []
			
			if dev1!=[] and dev2!=[]:
				for p1, p2 in zip(dev1[1], dev2[1]):
					if p1 != p2:
						mismatch.append((p1, p2))
							
			elif dev2 == [] and dev1!=[]:
				for p in dev1[1]:
					if p not in all_nets:
						mismatch.append((p, None)) 
				
			elif dev1 == [] and dev2!=[]:			
				for p in dev2[1]:
					if p not in all_nets:
						mismatch.append((None, p)) 
				
		return mismatch
		
# -------------------------------------------------
# Compare two subcircuits for device mismatch
# -------------------------------------------------

def device_check_fun(sub1, sub2):
	sig1 = canonicalize_devices(sub1["ports"], sub1["devices"])
	sig2 = canonicalize_devices(sub2["ports"], sub2["devices"])

	if [s1[:2] for s1 in sig1] == [s2[:2] for s2 in sig2]:
		return {}
	else:
		diff = {
			"Schematic": [(s[0],s[2]) for s in sig1 if s[:2] not in sig2],
			"Layout":   [(s[0], s[2]) for s in sig2 if s[:2] not in sig1]
		}
		if [d1[0] for d1 in diff["Schematic"]].sort() == [d2[0] for d2 in diff["Layout"]].sort():
			return {}
		else:
			return diff

# -------------------------------------------------
# Main compare function
# -------------------------------------------------
def dev_nets_checker(cellname, source_netlist, layout_netlist, skip_cell=[], lvs_check=None):
	final = {}
	
	if cellname not in skip_cell and cellname in source_netlist and cellname in layout_netlist:
		if lvs_check == "nets":
			final[cellname] = nets_check_fun(source_netlist[cellname], layout_netlist[cellname])
		elif lvs_check == "devices":
			final[cellname] = device_check_fun(source_netlist[cellname], layout_netlist[cellname])

	return final


