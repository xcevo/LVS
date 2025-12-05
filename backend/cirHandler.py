# cirHandler.py
from flask import Blueprint, request, jsonify
import os
from io import BytesIO
import cirScan

cir_bp = Blueprint("cir", __name__)

# ============================================
# Extract tree cellnames (recursive)
# ============================================
def extract_tree_cells(tree, collected):
    for parent, children in tree.items():
        collected.append(parent)
        for child in children:
            for inst_name, subtree in child.items():
                collected.append(inst_name)
                extract_tree_cells(subtree, collected)
    return collected


# ============================================
# 1) Upload CIR file and scan metadata
# ============================================
@cir_bp.route('/get_circells', methods=['POST'])
def get_circells():
    if 'cir_file' not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded"}), 400

    file = request.files['cir_file']

    if file.filename == '':
        return jsonify({"status": "error", "message": "Empty filename"}), 400

    filename = file.filename

    print("CIR file uploaded:", filename)

    # For testing, keeping static username 
    username = "sahil"
    user_dir = os.path.join(os.path.dirname(__file__), "users", username)
    os.makedirs(user_dir, exist_ok=True)

    save_path = os.path.join(user_dir, filename)
    file.save(save_path)

    try:
        # ====== Extract Metadata ======
        top, pins, instances = cirScan.extract_metadata(save_path)

        # ====== Build Hierarchy Tree ======
        tree = cirScan.build_tree(instances, top)

        # ====== Get All Cell Names (recursive) ======
        cell_names = extract_tree_cells(tree, [])

        return jsonify({
            "status": "success",
            "topCell": top,
            "totalCells": len(set(cell_names)),
            "pins": pins,
            "instances": instances,
            "cellList": list(set(cell_names)),
            "hierarchyTree": tree,
            "savedPath": f"users/{username}/{filename}"
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



# ============================================
# 2) Scan saved CIR netlist again (similar to /scan_gds)
# ============================================
@cir_bp.route('/scan_cir', methods=['POST'])
def scan_cir():
    try:
        data = request.get_json()

        inpCir = data.get('inpCir')
        if not inpCir:
            return jsonify({"error": "Missing 'inpCir' parameter"}), 400

        username = "sahil"
        user_dir = os.path.join(os.path.dirname(__file__), "users", username)
        inpCir_path = os.path.join(user_dir, inpCir)

        # ====== Extract Again ======
        top, pins, instances = cirScan.extract_metadata(inpCir_path)
        tree = cirScan.build_tree(instances, top)
        cell_names = extract_tree_cells(tree, [])

        return jsonify({
            "topCell": top,
            "totalCells": len(set(cell_names)),
            "pins": pins,
            "instances": instances,
            "cellList": list(set(cell_names)),
            "hierarchyTree": tree
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
