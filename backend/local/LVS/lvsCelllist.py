import gdsScan
import cirScan

def lvs_celllist(cir, gds):
	cir_cells = cirScan.extract_cells(cir)
	hier_cells = gdsScan.scanGds(gds)
	
	gds_cells = []
	for arr in hier_cells:
		gds_cells.append(arr["cellname"])
		
	lvs_cells = list(set(cir_cells) & set(gds_cells))

	return lvs_cells
	

#lvs_celllist("../10t_cells_original.cdl", "/home/linuxmint/Desktop_content/LVS_tool/10t_5cells.gds")
