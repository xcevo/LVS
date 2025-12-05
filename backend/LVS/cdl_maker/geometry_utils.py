import gdspy
import numpy
from shapely.geometry import Polygon

# ===============================================================
# GDSPY Common Polygon Functions
# ===============================================================

def overlap(poly1: gdspy.Polygon, poly2: gdspy.Polygon) -> bool:
	"""Check if two polygons overlap."""
	return gdspy.boolean(poly1, poly2, "and") is not None

#----------------------------------------------------------------		
	
def boolean_or(poly1, poly2, precision, layer):
	""" Performs boolean OR operation on two layers
	and generates the output in a new layer"""
	return gdspy.boolean(poly1, 
						 poly2, 
						 "or", 
						 precision, 
						 layer = layer[0], 
						 datatype = layer[1])

#----------------------------------------------------------------		
						 
def boolean_not(poly1, poly2, precision, layer):
	""" Performs boolean NOT operation on two layers
	and generates the output in a new layer"""
	return gdspy.boolean(poly1, 
						 poly2, 
						 "not", 
						 precision, 
						 layer = layer[0], 
						 datatype = layer[1])

#----------------------------------------------------------------	

def boolean_and(poly1, poly2, precision, layer):
	""" Performs boolean NOT operation on two layers
	and generates the output in a new layer"""
	return gdspy.boolean(poly1, 
						 poly2, 
						 "and", 
						 precision, 
						 layer = layer[0], 
						 datatype = layer[1])

#----------------------------------------------------------------	

def delete(cell, polygons):
	"""Deletes the polygon from the cell"""
	for poly in polygons:
		layer = poly.layers[0]
		dtype = poly.datatypes[0]
		cell.remove_polygons(lambda pts, l, d: len(poly.polygons)!=0 and numpy.array_equal(pts,poly.polygons[0]) and l == layer and d == dtype )	

		
# ===============================================================
# GDSPY to Shapely objects
# ===============================================================	

def round_coords(pts, precision=0.001):
	factor = 1 / precision
	return numpy.round(pts * factor) / factor
	
def gdspy_to_shapely(gdspy_polygon, dbu):
	"""Convert gdspy.Polygon to shapely.Polygon."""
	pts = round_coords(gdspy_polygon.polygons[0], dbu)
	return Polygon(pts)
	 

