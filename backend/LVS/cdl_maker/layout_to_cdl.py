import gdspy
import json
from typing import Dict, List, Tuple, Optional
from .poly_mapper import *
from .nets_extractor import recursive_connect
from .dev_extractor import * 
from .pin_handler import *

# ===============================================================
# CDL writer
# ===============================================================

def write_cdl(device, W, L, ports, cellname, outfile="output.cdl"):
	with open(outfile, "w") as f:
		ports = list(dict.fromkeys([label.text for label in ports]))
		ports = " ".join(ports)
		f.write(f".SUBCKT {cellname} {ports}\n")
		for i, ((drn_net, gate_net, src_net, bulk_net, model), nfinger) in enumerate(device.items(), 1):
			key = (drn_net, gate_net, src_net, bulk_net, model)
			name = f"M{i}"
			line = f"{name} {drn_net} {gate_net} {src_net} {bulk_net} {model} W={W[key]}u L={L[key]}u nf={nfinger}\n"
			f.write(line)
		f.write(f".ends {cellname}")
			
# ===============================================================
# File Readers
# ===============================================================

def read_layermap(file_path: str) -> Dict[Tuple[str, str], Tuple[int, int]]:
	with open(file_path, "r") as layermap_file:
		layermap = json.load(layermap_file)
	
	lay_keys = {}	
	for lay in layermap["layers"]:
		key = (lay["layer_name"], lay["datatype_name"])
		val = (int(lay["layer_number"]), int(lay["datatype_number"]))
		lay_keys[key] = val
		
	return lay_keys
	
#----------------------------------------------------------------	

def read_config(file_path: str, layermap):
	with open(file_path, "r") as config_file:
		config = json.load(config_file)
		
	layermap[("poly", "drawing")] = tuple(config["layer_map"]["poly"])
	layermap[("diff", "drawing")] = tuple(config["layer_map"]["diff"])
	layermap[("pp", "drawing")] = tuple(config["layer_map"]["pp"])
	layermap[("np", "drawing")] = tuple(config["layer_map"]["np"])
	layermap[("nwell", "drawing")] = tuple(config["layer_map"]["nwell"])
	
	stack = []
	for item in config["layer_stack"]:
		if isinstance(item[0], list):  # nested list (like [["OD",...], ["PO",...]])
			converted = [layermap[tuple(x)] for x in item]
		else:  
			converted = layermap[tuple(item)]
		stack.append(converted)

	pin_info = {}
	for item in config["pin_info"]:
		pin_info[tuple(item["pin"])] = tuple(item["metal"])
		
	return layermap,stack,pin_info
	
#----------------------------------------------------------------	

def get_polygons(cell):
	polygons = {}
	for p in cell.polygons:
		key = (p.layers[0], p.datatypes[0])
		if key not in polygons:
			polygons[key] = []
		polygons[key].append(p)
	return polygons	


def get_labels(cell):
	labels = {}
	for l in cell.labels:
		key = (l.layer, l.texttype)
		if key not in labels:
			labels[key] = []
		labels[key].append(l)
	return labels
		
		
def read_layout(layout, cellname):
	"""
	Reads the layout and returns a dictionary with 
	key as (lay, dtype) and value as a list of gdspy.Polygon ids
	"""
	lib = gdspy.GdsLibrary(infile=layout)

	dbu = lib.precision/lib.unit
	
	#cell = lib.top_level()[0]
	cell = lib.cells[cellname]
	cell.flatten()

	for path in cell.paths:
		cell.add(path.to_polygonset())
	cell.remove_paths(lambda _: True)
	
	polygons = get_polygons(cell)
	labels = get_labels(cell)
	
	return cell, polygons, labels, dbu, lib
	
# ===============================================================
# Main Function
# ===============================================================	

def layout_to_cdl(gds_file, cellname, out_cdl, layermap, config_file):
	"""
	Entry point: extract devices from layout and generate CDL.
	"""
	
	top_cell, polygons, labels, dbu, lib = read_layout(gds_file, cellname) 
	#print(top_cell.name)
	layer_keys = read_layermap(layermap)
	layer_keys, stack, pin_info = read_config(config_file, layer_keys)
	
	top_cell = polygon_oring(top_cell, polygons, stack, dbu)
	polygons = get_polygons(top_cell)
	flag, top_cell, error = base_layer_ops(top_cell, polygons, layer_keys, dbu)

	if flag == True: 
		polygons = get_polygons(top_cell)
		# lib.write_gds("temp.gds")
		
		uf = UnionFind()
		netmap = {}
		for pin, metal in pin_info.items():
			if pin in labels.keys() and metal in polygons.keys():
				netmap = map_labels_to_polygons(uf, labels[pin], polygons[metal], netmap, dbu)
		
		ports = get_ports(pin_info, labels)
		netmap = assign_ids(uf, polygons, netmap, 1)
		netmap = recursive_connect(uf, stack, polygons, netmap, layer_keys[("poly", "drawing")], ports)
			
		poly_stack = [[(1002,0),(1003,0)], layer_keys[("poly", "drawing")]]
		netmap = recursive_connect(uf, poly_stack, polygons, netmap, layer_keys[("poly", "drawing")], ports)
		
		final_netmap = update_nets(netmap, uf.parent)
		
		devmap1 = find_edge_sharing(polygons[(1002, 0)], polygons[layer_keys[("diff", "drawing")]], dbu)
		devmap2 = find_edge_sharing(polygons[(1003, 0)], polygons[layer_keys[("diff", "drawing")]], dbu)
		
		supply = get_supply(polygons, layer_keys, final_netmap)
		
		pmos, wp, lp = find_properties(final_netmap, devmap1, "PMOS", supply, dbu)
		nmos, wn, ln = find_properties(final_netmap, devmap2, "NMOS", supply, dbu)
		
		for k, v in pmos.items():
			nmos[k] = v
		for k, v in wp.items():
			wn[k] = v
		for k, v in lp.items():
			ln[k] = v
			
		write_cdl(nmos, wn, ln, ports[0], top_cell.name, out_cdl)
		
		return flag, error, list(supply.values())
	
	else:
		return flag, error, []

#layout_to_cdl("/home/linuxmint/Desktop_content/LVS_tool/10t_5cells.gds", "./dummy_cdl", "./layermap_SCL.json", "./config.json")
