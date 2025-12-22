from shapely.geometry import Point
from .geometry_utils import gdspy_to_shapely


def map_labels_to_polygons(uf, labels, polygons, netmap, dbu):
	"""
	Checks if a pin lies inside a polygon
	and maps polygon to label name
	
	Args:
		labels (list): list of gdspy.Label
		polygons (list): list of gdspy.Polygon
	
	Returns:
		dict: {gdspy.Polygon: label.text}
	"""

	for poly in polygons:
		shapely_poly = gdspy_to_shapely(poly, dbu)

		for label in labels:
			point = Point(label.position)
			
			if shapely_poly.covers(point):
				netmap[poly] = label.text 
				uf.find(label.text)
				break  # assuming one label per polygon

	return netmap

#----------------------------------------------------------------	
	
def get_ports(pin_info, labels):
	ports = []
	for lay in pin_info.keys():
		if lay in labels:
			ports.append(labels[lay])
	
	return ports
	
	
