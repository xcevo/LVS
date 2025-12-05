from flask import Blueprint, request, jsonify ,send_file
import os
from LVS.lvs_runner import lvs_runner
from flask_jwt_extended import jwt_required, get_jwt_identity

lvs_bp = Blueprint('lvs', __name__)

from flask import Blueprint, request, jsonify, send_file
import os
from LVS.lvs_runner import lvs_runner

lvs_bp = Blueprint('lvs', __name__)

@lvs_bp.route('/lvs_runner', methods=['POST'])
# @jwt_required()
def lvs_runner_api():

    try:
        data = request.get_json()

        print("LVS API called with data:", data)        

        # Static username for now
        username = "sahil"
        user_dir = os.path.join("users", username)

        netlist_path = os.path.join(user_dir, data.get("netlist"))
        layout_path  = os.path.join(user_dir, data.get("layout"))

        print("Netlist path:", netlist_path)
        print("Layout path:", layout_path)  

        selected_cells = data.get("selected_cells", [])
        checks = data.get("checks", [])

        inputs = {
            "username": username,
            "netlist": netlist_path,
            "layout": layout_path,
            "selected_cells": selected_cells,
            "checks": checks,
            "config_path": "LVS/config.json",
            "layermap": "LVS/layermap_SCL.json"
        }

        # Run LVS
        lvs_runner(inputs)

        # Path where report SHOULD be saved
        report_file = os.path.join(user_dir, "lvs_report.txt")

        # Move report from current directory to user_dir if not already there
        if os.path.exists("lvs_report") and not os.path.exists(report_file):
            os.rename("lvs_report", report_file)

        # Check if report exists
        if os.path.exists(report_file):
            # Send the file as response
            return send_file(report_file, as_attachment=True, download_name="lvs_report.txt")
        else:
            return jsonify({"status": "error", "message": "Report not generated."}), 404

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
