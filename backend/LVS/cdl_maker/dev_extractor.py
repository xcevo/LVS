from collections import defaultdict
from .geometry_utils import *
from shapely.geometry import LineString, MultiLineString

#----------------------------------------------------------------
		
def add_to_cell(cell, shapes, layer, dbu):
	new_shapes = boolean_or(shapes, shapes, dbu, (layer[0], layer[1]))
	delete(cell, shapes)
	for p in new_shapes.polygons:
		cell.add(gdspy.Polygon(p, layer = layer[0], datatype = layer[1]))
	
	return cell
	
#----------------------------------------------------------------	
	
def polygon_oring(cell, polygons, stack, dbu):
	for layer in stack:
		if type(layer) == list:
			for sublay in layer:
				shapes = polygons.get(sublay, [])
				if len(shapes) > 0:
					cell = add_to_cell(cell, shapes, sublay, dbu)
		else:
			shapes = polygons.get(layer, [])
			if len(shapes) > 0:
				cell = add_to_cell(cell, shapes, layer, dbu)
			
	return cell
	
#----------------------------------------------------------------			

def base_layer_ops(cell, polygons, layermap, dbu):
	poly_shapes = polygons.get(layermap[("poly", "drawing")], [])
	diff_shapes = polygons.get(layermap[("diff", "drawing")], [])
	pp_shapes = polygons.get(layermap[("pp", "drawing")], [])
	np_shapes = polygons.get(layermap[("np", "drawing")], [])
	nw_shapes = polygons.get(layermap[("nwell", "drawing")], [])
	
	
	diff_not_poly = boolean_not(diff_shapes, poly_shapes, dbu, layermap[("diff", "drawing")])
	layer = layermap[("diff", "drawing")]
	for p in diff_not_poly.polygons:
		cell.add(gdspy.Polygon(p, layer = layer[0], datatype = layer[1]))
	
	gate = boolean_and(diff_shapes, poly_shapes, dbu, (1001,0))
	pmos = boolean_and(gate, pp_shapes, dbu, (1002,0))
	nmos = boolean_and(gate, np_shapes, dbu, (1003,0))
	
	for p in pmos.polygons:
		cell.add(gdspy.Polygon(p, layer = 1002, datatype = 0))
	for p in nmos.polygons:
		cell.add(gdspy.Polygon(p, layer = 1003, datatype = 0))

	pdiff = boolean_and(diff_shapes, pp_shapes, dbu , (1004,0))
	ndiff = boolean_and(diff_shapes, np_shapes, dbu, (1005,0))
	pbody = boolean_and(ndiff, nw_shapes, dbu, (1006,0))
	nbody = boolean_not(pdiff, nw_shapes, dbu, (1007,0))
	
	delete(cell, diff_shapes)
	for p in nbody.polygons:
		cell.add(gdspy.Polygon(p, layer = 1006, datatype = 0))
	for p in pbody.polygons:
		cell.add(gdspy.Polygon(p, layer = 1007, datatype = 0))
	
	return cell
	
#----------------------------------------------------------------			

def find_edge_sharing(l1, l2, dbu):
	"""
	Find polygons from l1 that share an edge with polygons in l2.
	
	Returns:
		dict where key = gdspy.Polygon (poly layer), 
			 value = list of polygons from l2 sharing an edge (diff layer)
	"""
	devmap = {}
	for poly1 in l1:
		shapely_poly1 = gdspy_to_shapely(poly1, dbu)
		
		neighbors = []
		for poly2 in l2:
			shapely_poly2 = gdspy_to_shapely(poly2, dbu)
			
			inter = shapely_poly1.boundary.intersection(shapely_poly2.boundary)

			# Check if intersection is a line (shared edge)
			if ((isinstance(inter, LineString) or isinstance(inter, MultiLineString)) and inter.length > 0):
				neighbors.append(poly2)

		if neighbors:
			devmap[poly1] = neighbors

	return devmap

#----------------------------------------------------------------			
def get_supply(polygons, layermap, netmap):
	supply = {}
	for diff in polygons.get(layermap[("diff", "drawing")], []):
		for bulk in polygons.get((1006,0), []) + polygons.get((1007,0), []):
			if overlap(diff, bulk):
				supply[diff] = netmap[diff]
				
	return supply

#----------------------------------------------------------------			

def find_properties(netmap, devmap, model, supply, dbu):
	nfinger = defaultdict(int) 
	width = defaultdict(float)
	length = defaultdict(float)
	
	for gate, terminals in devmap.items():
		if not isinstance(terminals, (list, tuple)) or len(terminals) != 2:
			continue  # skip invalid entries

		source, drain = terminals

		# Lookup netnames
		gate_net = netmap.get(gate, "UNCONNECTED")
		src_net = netmap.get(source, "UNCONNECTED")
		drn_net = netmap.get(drain, "UNCONNECTED")
		
		if drn_net in supply:
			bulk_net = drn_net  
			key = (src_net, gate_net, drn_net, bulk_net, model)
		elif src_net in supply:
			bulk_net = src_net 
			key = (drn_net, gate_net, src_net, bulk_net, model)
		elif src_net < drn_net:
			bulk_net = drn_net  
			key = (src_net, gate_net, drn_net, bulk_net, model)
		else:
			bulk_net = src_net 
			key = (drn_net, gate_net, src_net, bulk_net, model)
		
		nfinger[key] += 1
		length[key] = cal_length(source, drain, dbu, length[key])
		w = cal_area(gate, dbu)/length[key]
		width[key] += round_coords(w, dbu)
		
	return nfinger, width, length

#----------------------------------------------------------------	

def cal_length(source, drain, dbu, prev_len):
	s = gdspy_to_shapely(source, dbu)
	d = gdspy_to_shapely(drain, dbu)
	length = s.distance(d)
	length = round_coords(length, dbu)
	if prev_len!=0:
		return min(prev_len, length)
	else:
		return length
	
#----------------------------------------------------------------

def cal_area(gate, dbu):
	g = gdspy_to_shapely(gate, dbu)
	return round_coords(g.area, dbu)
	
