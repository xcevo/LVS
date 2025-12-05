from flask import Blueprint, request, jsonify
import os
import cirScan
from io import BytesIO
import gdsScan

cell_list_bp = Blueprint('cell_list', __name__)

def lvs_celllist(cir, gds):
	cir_cells = cirScan.extract_cells(cir)
	hier_cells = gdsScan.scanGds(gds)
	
	gds_cells = []
	for arr in hier_cells:
		gds_cells.append(arr["cellname"])
		
	lvs_cells = list(set(cir_cells) & set(gds_cells))
	print("LVS Cells:", lvs_cells)
	return lvs_cells


@cell_list_bp.route('/lvs_celllist', methods=['POST'])
def get_lvs_celllist():
    data = request.get_json()
    # Static username for now
    username = "sahil"
    user_dir = os.path.join(os.path.dirname(__file__), 'users', username)

    # Expected filenames
    cir_filename = data.get("cir_File")
    gds_filename = data.get("gds_File")

    print("Requested CIR file:", cir_filename)
    print("Requested GDS file:", gds_filename)

    cir_path = os.path.join(user_dir, cir_filename)
    gds_path = os.path.join(user_dir, gds_filename)

    # ===========================
    # ❌ CHECK: missing file?
    # ===========================
    missing_files = []
    if not os.path.exists(cir_path):
        missing_files.append(cir_filename)

    if not os.path.exists(gds_path):
        missing_files.append(gds_filename)

    if missing_files:
        return jsonify({
            "status": "error",
            "message": "Missing required files",
            "missingFiles": missing_files
        }), 400

    # ===========================
    # PROCESS FILES
    # ===========================
    try:
        lvs_cells = lvs_celllist(cir_path, gds_path)

        return jsonify({
            "status": "success",
            "totalLVSCells": len(lvs_cells),
            "lvsCells": lvs_cells,
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500