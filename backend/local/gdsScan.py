import gdspy
import os
import re

def iterateOverCell(cellId):
	dependence_tree = []
	for ref in cellId.get_dependencies(recursive=False):
		dependency_dict = {"cellname": ref.name}
		dependencies = iterateOverCell(ref)
		dependency_dict["dependencies"] = dependencies
		dependence_tree.append(dependency_dict)
	return dependence_tree

#===========================================================================

		
def scanGds(inGds,cellName=None,precision=1e-09,unit=1e-06):
	gdsii = gdspy.GdsLibrary(infile=inGds,precision=precision,unit=unit)
	if cellName==None:
		topcell=gdsii.top_level()
	else:
		topcell=gdsii.cells[cellName]
	
	cellname_tree = []
	if type(topcell)==list:
		for cell in topcell:
			cell_dict = {"cellname": cell.name}
			dependencies = iterateOverCell(cell)
			cell_dict["dependencies"] = dependencies
			cellname_tree.append(cell_dict)
			
	else:
		cell_dict = iterateOverCell(cell)
		cellname_tree.append(cell_dict)
	
	return cellname_tree


#===========================================================================


def getLayer_fromGds(inpGds,selectCells,precision=1e-09,unit=1e-06):
	layerList = set()
	gds=gdspy.GdsLibrary(infile=inpGds,precision=precision,unit=unit)
	
	if len(selectCells)!=0:
		for cell in selectCells:
			if cell in gds.cells.keys():
				topcell=gds.cells[cell]
				for element in topcell.polygons + topcell.paths:
					layerList.add((int(element.layers[0]), int(element.datatype[0])))
	else:
		for cell in gds.cells:
			topcell=gds.cells[cell]
			for element in topcell.polygons + topcell.paths:
				layerList.add((int(element.layers[0]), int(element.datatypes[0])))
			
	return sorted(layerList)
	

#===========================================================================

def getTextLayer_fromGds(inpGds,selectCells,precision=1e-09,unit=1e-06):
	textLayer = set()
	gds=gdspy.GdsLibrary(infile=inpGds,precision=precision,unit=unit)
	
	if len(selectCells)!=0:
		for cell in selectCells:
			if cell in gds.cells.keys():
				topcell=gds.cells[cell]
				for lbl in topcell.get_labels():
					textLayer.add((int(lbl.layer), int(lbl.texttype)))
	else:
		for cell in gds.cells:
			topcell=gds.cells[cell]
			for lbl in topcell.get_labels():
				textLayer.add((int(lbl.layer), int(lbl.texttype)))
			
	return sorted(textLayer)	


#===========================================================================

def getLabels_fromGds(inpGds,selectCells,precision=1e-09,unit=1e-06):
	labels={}
	gds=gdspy.GdsLibrary(infile=inpGds,precision=precision,unit=unit)
	
	if len(selectCells)!=0:
		for cell in selectCells:
			if cell in gds.cells.keys():
				topcell=gds.cells[cell]
				labels[cell]=[]
				for lbl in topcell.get_labels():
					labels[cell].append(lbl.text)
	else:
		for cell in gds.cells:
			topcell=gds.cells[cell]
			labels[cell]=[]
			for lbl in topcell.get_labels():
				if re.search("^[0-9a-z_]+$",lbl.text,re.I):
					labels[cell].append(lbl.text)
			
	return labels	

#===========================================================================

def getInstance_fromGds(inpGds,precision=1e-09,unit=1e-06):
	gds=gdspy.GdsLibrary(infile=inpGds,precision=precision,unit=unit)
	
	instList=[]
	for cell in gds.cells:
		topcell=gds.cells[cell]
			
		for subcell in topcell.get_dependencies(recursive=True):
			instList.append(subcell.name)
	
	instList=list(set(instList))
	return instList	
	
#===========================================================================
	
def getGdsUnits(inpGds):
	unit, precision = gdspy.get_gds_units(infile=inpGds)
	return [unit,precision]

	
