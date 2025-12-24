from .lvs_checks.parser import parse_netlist
from .lvs_checks.port_check import port_check_fun
from .lvs_checks.dev_nets_check import dev_nets_checker
from .lvs_checks.size_check import size_check_fun
from .lvs_checks.opens_shorts_check import opens_shorts_checker
from .cdl_maker import layout_to_cdl as l2c
from .report_maker import make_report

import os

#==========================================================================

def lvs_runner(inputs):

	# print("LVS Runner called with inputs:", inputs)	

	for cell in inputs["selected_cells"]:
		print("Cell", cell)
		layout_netlist_path = inputs["layout"].split(".")[0] + f"_{cell}.cdl"
		flag, error, supply = l2c.layout_to_cdl(inputs["layout"], cell, layout_netlist_path, inputs["layermap"], inputs["config_path"])

		if flag == True:
			source_netlist = parse_netlist(inputs["netlist"])
			layout_netlist = parse_netlist(layout_netlist_path)
			
			#print("source_netlist", source_netlist)
			#print("\nlayout_netlist", layout_netlist)
			
			port_var = {cell : {}}
			dev_var = {cell : {}}
			size_var = {cell : []}
			nets_var = {cell : []}
			opens_var = {cell : {}}
			shorts_var = {cell : {}}
			
			print(source_netlist)
			print(layout_netlist)
			print(cell)
			if inputs["checks"][0] == 1:
				port_var = port_check_fun(cell, source_netlist, layout_netlist)
			if inputs["checks"][1] == 1:
				dev_var = dev_nets_checker(cell, source_netlist, layout_netlist, lvs_check = "devices")
			if inputs["checks"][2] == 1:
				size_var = size_check_fun(cell, source_netlist, layout_netlist)
			if inputs["checks"][3] == 1:
				nets_var = dev_nets_checker(cell, source_netlist, layout_netlist, lvs_check = "nets")
			if inputs["checks"][4] == 1:
				opens_var = opens_shorts_checker(cell, source_netlist, layout_netlist, lvs_check = "opens")
			if inputs["checks"][5] == 1:
				shorts_var = opens_shorts_checker(cell, source_netlist, layout_netlist, lvs_check = "shorts")
			if inputs["checks"][6] == 1 or inputs["checks"][7] == 1:
				pass

			source = inputs["netlist"].split("/")[-1]
			layout = inputs["layout"].split("/")[-1]
			
			var = [port_var, dev_var, size_var, nets_var, opens_var, shorts_var]
			print("var", var)
			
			devices = (len(source_netlist[cell]["devices"]), len(layout_netlist[cell]["devices"]))
			ports = (len(source_netlist[cell]["ports"]), len(layout_netlist[cell]["ports"]))
			source_nets = set()
			layout_nets = set()
			for d in source_netlist[cell]["devices"]:
				source_nets.update(d['nets'])
			for d in layout_netlist[cell]["devices"]:
				layout_nets.update(d['nets'])
				
			source_nets = source_nets - set(source_netlist[cell]["ports"])
			layout_nets = layout_nets - set(layout_netlist[cell]["ports"])
			nets = (len(source_nets), len(layout_nets))
			
			string = make_report(inputs["username"], cell, source, layout, supply, devices, ports, nets, inputs["checks"], var)
			
			user_dir = os.path.join("users", inputs["username"])
			os.makedirs(user_dir, exist_ok=True)

			report_path = os.path.join(user_dir, "lvs_report.txt")

			with open(report_path, "w+") as f:
				f.write(string)
				f.close()
		else:
			print("Error: ", error)
			
#==========================================================================


# lvs_runner(
# {
# 	"username" : "user1",
# 	"netlist" : "/media/sahil/New Volume/LVS/backend/users/sahil/10t_5cells.cdl",
# 	"layout" : "/media/sahil/New Volume/LVS/backend/users/sahil/10t_5cells.gds",
# 	"selected_cells" : ["nr02d7"],
# 	"checks" : [True, True, True, True, True, True, False, False],
# 	"config_path": "./config.json",
# 	"layermap": "./layermap_SCL.json"
# }
# )
