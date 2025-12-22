# -----------------------------
# Parse SPICE Subcircuits
# -----------------------------

def read_logical_lines(path):
	"""
	Read file and join continuation lines that start with '+' into previous line.
	Returns list of logical (full) lines.
	"""
	lines = []
	with open(path) as f:
		prev = None
		for raw in f:
			line = raw.rstrip("\n")
			s = line.strip()
			# skip full-line comments
			if not s or s.startswith('*') or s.startswith(';'):
				continue

			if s.startswith('+'):  # continuation
				if prev is None:
					# stray continuation — ignore
					continue
				# append continuation part (without the leading +)
				cont = s[1:].lstrip()
				prev += " " + cont
			else:
				# start a new logical line
				if prev is not None:
					lines.append(prev)
				prev = s
		# append last
		if prev is not None:
			lines.append(prev)
	return lines

#==========================================================================

def parse_netlist(path):
	"""
	Returns dict:
	  { subckt_name: { 'name': name, 'ports': [...], 'devices': [ {inst, type, nets, model, params}, ... ] } }
	"""
	logical = read_logical_lines(path)
	subckts = {}
	in_subckt = None

	for line in logical:
		lw = line.lower()
		if lw.startswith('.subckt'):
			parts = line.split()
			name = parts[1]
			ports = parts[2:]
			in_subckt = name
			subckts[name] = {'name': name, 'ports': ports, 'devices': []}
			continue

		if lw.startswith('.ends'):
			# optionally .ends <name> or just .ends
			in_subckt = None
			continue

		if in_subckt is None:
			continue

		# inside subckt: parse device/instance line
		tokens = line.split()
		if not tokens:
			continue

		inst = tokens[0]
		prefix = inst[0].upper()
		rest = tokens[1:]  # everything after instance token

		# Skip malformed or comment-like lines
		if prefix == '+':
			continue

		dev = {'inst': inst, 'type': prefix, 'nets': [], 'model': None, 'params': {}}

		if prefix == 'M':
			# MOSFET: expect at least 5 tokens after inst: D G S B MODEL
			if len(rest) < 5:
				# malformed; store raw for debugging
				dev['nets'] = rest
				subckts[in_subckt]['devices'].append(dev)
				continue

			dev['nets'] = rest[:4]
			dev['model'] = rest[4]
			# remaining tokens are params like W=1.86U L=0.184U or standalone tokens
			for tok in rest[5:]:
				if '=' in tok:
					k, v = tok.split('=', 1)
					dev['params'][k] = v
				else:
					# some tools output params without '=' (rare) — store as flag
					dev['params'].setdefault(tok, True)

		elif prefix == 'X':
			# subckt inst: last token is subckt name, preceding are nets
			if len(rest) >= 1:
				dev['nets'] = rest[:-1]
				dev['model'] = rest[-1]  # the subckt name
			else:
				dev['nets'] = []
				dev['model'] = None

			# optional named params after subckt name aren't handled here, but could be parsed

		else:
			# General passive / other device: R, C, L, D, Q, etc.
			# typical: inst n1 n2 VALUE [params...]
			if len(rest) >= 3:
				dev['nets'] = rest[:2]
				dev['model'] = rest[2]  # value or model name
				for tok in rest[3:]:
					if '=' in tok:
						k, v = tok.split('=', 1)
						dev['params'][k] = v
					else:
						dev['params'].setdefault(tok, True)
			else:
				# fewer tokens than expected: put everything into nets for debugging
				dev['nets'] = rest

		subckts[in_subckt]['devices'].append(dev)

	return subckts

