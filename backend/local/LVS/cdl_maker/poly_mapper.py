class UnionFind:
	def __init__(self):
		self.parent = {}

	def find(self, x):
		if x not in self.parent:
			self.parent[x] = x
		if self.parent[x] != x:
			self.parent[x] = self.find(self.parent[x])
		return self.parent[x]

	def union(self, x, y):
		self.parent[self.find(x)] = self.find(y)

#----------------------------------------------------------------				

def assign_ids(uf, polygons, netmap, counter):
	"""Assigns a unique net name to the polygons"""
	for layer in polygons.keys():
		for poly in polygons[layer]:
			if poly not in netmap:
				net_name = f"net{counter}"
				netmap[poly] = net_name
				uf.find(net_name)
				counter += 1
			
	return netmap
	
#----------------------------------------------------------------					
	
def resolve_net(net, uf_mapper):
	"""Follow mapping until net stabilizes (key == value)."""
	seen = set()
	while net in uf_mapper and net not in seen:
		seen.add(net)
		next_net = uf_mapper[net]
		if next_net == net:
			break
		net = next_net
	return net

#----------------------------------------------------------------					

def update_nets(netmap, uf_mapper):
	updated = {}
	for k, v in netmap.items():
		resolved = resolve_net(v, uf_mapper)
		updated[k] = resolved
	return updated


