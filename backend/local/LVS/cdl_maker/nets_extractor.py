import itertools
from .geometry_utils import overlap



def find_layer_index(stack, target):
	for i, item in enumerate(stack):
		if isinstance(item, list):		# case like [(1,0), (2,0)]
			if target in item:
				return i
		else:							# case like (3,0)
			if item == target:
				return i
	return -1   						# not found

#----------------------------------------------------------------				
		
def make_combinations(lower, upper):
	"""
	Generate all pairwise combinations and convert each pair to a list
	e.g. lower = [(1,0), (2,0)]
		 upper = (3,0)
		 output = [[(1,0),(3,0)], [(2,0),(3,0)]] 
	"""
	lower_list = lower if isinstance(lower, list) else [lower]
	upper_list = upper if isinstance(upper, list) else [upper]

	return [list(pair) for pair in itertools.product(lower_list, upper_list)]
	
#----------------------------------------------------------------		

def merge(lower, upper):
	"""Merge lower and upper into a single list"""
	lower_list = lower if isinstance(lower, list) else [lower]
	upper_list = upper if isinstance(upper, list) else [upper]

	return lower_list + upper_list

#----------------------------------------------------------------		

def validate_pairs(lay1, lay2, checked):
	"""Checks if lay1 and lay2 are already connected via recursive_connect function"""
	
	if lay1 in checked.keys() and lay2 in checked[lay1]:
		return False
	elif lay2 in checked.keys() and lay1 in checked[lay2]:
		return False
	else:
		return True
		
#----------------------------------------------------------------		

def recursive_connect(uf, stack, polygons, netmap, current_layer, ports, checked = {}):
	"""
	Recursively explore layer connectivity across adjacent layers.

	Args:
		uf = UnionFind object
		polygons: Dictionary consisting of all the shapes present in a cell
		stack: List of layers that are considered for connectivity.
		netmap: dict: {gdspy.Polygon: label.text}
		current_layer: Starting layer for connectivity
		checked: Pairs for which connectivity is checked

	Returns:
		dict: {gdspy.Polygon: label.text}
	"""
	current_polys = polygons[current_layer]
	if current_layer not in checked.keys():
		checked[current_layer] = []

	idx = find_layer_index(stack, current_layer)
	lower = stack[idx - 1] if idx > 0 else None
	upper = stack[idx + 1] if idx < len(stack) - 1 else None

	layers = merge(lower, upper)
	
	for layer in layers:
		if layer is not None and validate_pairs(current_layer, layer, checked) and layer in polygons:
			stack_polys = polygons[layer]
			for each1 in current_polys:
				for each2 in stack_polys:
					if overlap(each1, each2):
						root1 = uf.find(netmap[each1])
						root2 = uf.find(netmap[each2])
						if root1 == root2:
							continue

						# --- Decide canonical root ---
						if root1 in ports:
							winner, loser = root1, root2
						elif root2 in ports:
							winner, loser = root2, root1
						else:
							# tie-breaker: keep lexicographically smaller root
							winner, loser = sorted([root1, root2])[0], sorted([root1, root2])[1]

						# --- Union: loser -> winner ---
						uf.union(loser, winner)

			checked[current_layer].append(layer)
			if layer not in checked.keys():
				checked[layer] = [current_layer]
			else:
				checked[layer].append(current_layer)
				
			recursive_connect(uf, stack, polygons, netmap, layer, ports, checked)
			
	return netmap
	
