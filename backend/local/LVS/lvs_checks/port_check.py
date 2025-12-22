def port_check_fun(cellname, source_netlist, layout_netlist, skip_cell=[]):
	final={}
	if cellname not in skip_cell and cellname in source_netlist and cellname in layout_netlist:
		if sorted(source_netlist[cellname]["ports"]) == sorted(layout_netlist[cellname]["ports"]):
			final[cellname] = {}
		else:
			missing_in_2 = list(set(layout_netlist[cellname]["ports"]) - set(source_netlist[cellname]["ports"]))
			missing_in_1 = list(set(source_netlist[cellname]["ports"]) - set(layout_netlist[cellname]["ports"]))

			if missing_in_1 or missing_in_2:
				final[cellname] = {
					"Present in layout only": missing_in_2,
					"Present in netlist only": missing_in_1
				}
			else:
				final[cellname] = {}

	return final
	
