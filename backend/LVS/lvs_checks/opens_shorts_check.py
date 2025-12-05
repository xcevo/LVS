import re
import json
from collections import defaultdict

def normalize_model(model):
	m = model.lower()
	if m in ["p", "pmos"]: return "PMOS"
	if m in ["n", "nmos"]: return "NMOS"
	return model.upper()

#==========================================================================

def canonicalize_nets(ports, devlist):
	
	port_set = set(ports)

	# 1. Build connectivity signature for each internal net
	net_connections = defaultdict(list)

	for d in devlist:
		for num, role in enumerate(["d", "g", "s", "b"]):
			net = d["nets"][num]
			if net not in port_set:
				# Store type + role (D/G/S/B) for grouping
				net_connections[net].append(str(d["inst"])+"."+str(role))

	# 2. Assign deterministic IDs based on sorted connectivity signatures
	internal_map = {}
	for idx, (net, conn) in enumerate(
		sorted(net_connections.items(), key=lambda x: sorted(x[1]))
	):
		internal_map[net] = f"INT_{idx+1}"

	# 3. Convert each net into canonical signature
	
	def map_net(n):
		if n in port_set:
			return f"PORT_{n}"
		return internal_map[n]
			
	connectivity = {}
	for (net, conn) in sorted(net_connections.items(), key=lambda x: sorted(x[1])):
		connectivity[map_net(net)] = conn

	canonical = []
	for d in devlist:

		D = map_net(d["nets"][0])
		G = map_net(d["nets"][1])
		S = map_net(d["nets"][2])
		B = map_net(d["nets"][3])

		# Device signature is order-independent by sorting nets
		signature = (
			d["inst"],
			normalize_model(d["model"]),
			tuple(sorted([D, G, S, B]))
		)
		canonical.append(signature)

	# Sort entire device list for final canonical form
	canonical.sort()
	return connectivity, canonical

#==========================================================================

def normalize_connections(subckt1, subckt2, net1, net2):
	map_dev = {}
	for dev2 in subckt2:
		flag=0
		for dev1 in subckt1:
			if dev2[2] == dev1[2]:
				map_dev[dev2[0]] = dev1[0]
				flag=1
				break
		if flag == 0:
			map_dev[dev2[0]] = "layout_"+str(dev2[0])
			
	for net, conn in net2.items():
		new_conn = []
		for p in conn:
			new_conn.append(map_dev[p.split(".")[0]])
			
		net2[net] = new_conn
			
	return net1, net2

#==========================================================================

# -------------------------------------------------
# Compare two subcircuits for Opens
# -------------------------------------------------

def find_opens(source, layout):
	dgsb = {}
	for net, conn in layout.items():
		for p in conn:
			dgsb[p] = net

	opens = {}
	for net_name, conn in source.items():
		mapped_nets = set()
		for p in conn:
			if p in dgsb:
				mapped_nets.add(dgsb[p])

		if len(mapped_nets) > 1:
			opens[net_name] = mapped_nets
		
	return opens

		
# -------------------------------------------------
# Compare two subcircuits for Shorts
# -------------------------------------------------

def find_shorts(source, layout):
	dgsb = {}
	for net, conn in source.items():
		for p in conn:
			dgsb[p] = net

	shorts = {}
	for net_name, conn in layout.items():
		mapped_nets = set()
		for p in conn:
			if p in dgsb:
				mapped_nets.add(dgsb[p])

		if len(mapped_nets) > 1:
			shorts[net_name] = mapped_nets

	return shorts


# -------------------------------------------------
# Main compare function
# -------------------------------------------------
def opens_shorts_checker(cellname, source_netlist, layout_netlist, skip_cell=[], lvs_check=None):
	final = {}
	
	if cellname not in skip_cell and cellname in source_netlist and cellname in layout_netlist:
		
		net1, subckt1 = canonicalize_nets(source_netlist[cellname]["ports"], source_netlist[cellname]["devices"])
		net2, subckt2 = canonicalize_nets(layout_netlist[cellname]["ports"], layout_netlist[cellname]["devices"])
		
		net1, net2 = normalize_connections(subckt1, subckt2, net1, net2)
		if lvs_check == "opens":
			final[cellname] = find_opens(net1, net2)
		elif lvs_check == "shorts":
			final[cellname] = find_shorts(net1, net2)

	return final


