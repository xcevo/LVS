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
			tuple([D, G, S, B]),
			d["inst"],
			tuple(d["nets"])
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

#	print("sig1", sig1)
#	print("\nsig2", sig2)
	
	if [s1[:2] for s1 in sig1] == [s2[:2] for s2 in sig2]:
		return {}
	else:
		diff = { "Schematic" : [], "Layout" : []}
		s2_matched = []
		for s1 in sig1:
			flag = 0
			for s2 in sig2:
				if s1[:2] == s2[:2]:
					flag = 1
					s2_matched.append(s2)
				elif s1[0] == s2[0]:
					if s1[1][1] == s2[1][1] and s1[1][3] == s2[1][3]:
						if s1[1][0] == s2[1][2] and s1[1][2] == s2[1][0]:
							flag = 1
							s2_matched.append(s2)
			if flag == 0:
				diff["Schematic"].append(s1)
			
		diff["Layout"] = [s for s in sig2 if s not in s2_matched]
		#print("diff", diff)
		
		count = {}
		for dev1 in diff["Schematic"]:
			for dev2 in diff["Layout"]:
				if dev1[0] ==  dev2[0]:
					count[(dev1, dev2)] = 0
					for i in range(len(dev1[1])):
						if dev1[1][i] == dev2[1][i]:
							count[(dev1, dev2)]+=1
						else:
							j = 2 if i == 0 else (0 if i == 2 else i)
							if dev1[1][i] == dev2[1][j]:
								count[(dev1, dev2)]+=1
		
		count = dict(sorted(count.items(), key = lambda x: x[1], reverse=True))
		
		mismatch = []
		dev_matched = []
		error_nets = []
		for key in count.keys():
			if key[0] not in dev_matched and key[1] not in dev_matched:
				if count[key] > 0:
					dev1 = key[0]
					dev2 = key[1]
					dev_matched.append(key[0])
					dev_matched.append(key[1])
					for i in range(len(dev1[1])):
						#print("i", i, dev1[1][i], dev2[1][i])
						if dev1[1][i] != dev2[1][i]:
							j = 2 if i == 0 else (0 if i == 2 else i)
							#print("j", j, dev1[1][i], dev2[1][j], dev1[1][j], dev2[1][j])
							if dev1[1][i] != dev2[1][j] and dev1[1][j] != dev2[1][j]:
								mismatch.append((dev1[3][i], dev2[3][j]))
								error_nets.extend([dev1[3][i], dev2[3][j]])
							elif dev1[1][i] != dev2[1][j]:
								mismatch.append((dev1[3][i], dev2[3][i]))
								error_nets.extend([dev1[3][i], dev2[3][i]])
							
							
				else:
					for p in dev1[1]:
						if p not in error_nets:
							mismatch.append((p, None)) 
					
					for p in dev2[1]:
						if p not in error_nets:
							mismatch.append((None, p)) 
				
		return list(set(mismatch))
		
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
		diff["Schematic"].sort()
		diff["Layout"].sort()
		
		if [d1[0] for d1 in diff["Schematic"]] == [d2[0] for d2 in diff["Layout"]]:
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


