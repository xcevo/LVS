from flask import Blueprint, request, jsonify
import os
from io import BytesIO

from flask_jwt_extended import get_jwt_identity, jwt_required
import gdsScan

gds_bp = Blueprint('gds', __name__)



def extract_cell_names(tree, cell_names):
	for item in tree:
		cell_names.append(item['cellname'])
		if 'dependencies' in item:
			cell_names = extract_cell_names(item['dependencies'], cell_names)
	return cell_names

@gds_bp.route('/get_cellnames', methods=['POST'])
@jwt_required()
def get_cellnames():
	if 'gds_file' not in request.files:
		return jsonify({'status': 'error', 'message': 'No file part'}), 400

	file = request.files['gds_file']
	if file.filename == '':
		return jsonify({'status': 'error', 'message': 'No selected file'}), 400

	filename = file.filename

	# ✅ Get username from JWT
	username = get_jwt_identity()
	# username = "sahil" 
	user_dir = os.path.join(os.path.dirname(__file__), 'users', username)
	os.makedirs(user_dir, exist_ok=True)

	# ✅ Save file in user-specific directory
	save_path = os.path.join(user_dir, filename)
	file.save(save_path)

	try:
		with open(save_path, 'rb') as f:
			data = f.read()

		data_stream = BytesIO(data)

		unit, precision = gdsScan.getGdsUnits(data_stream)
		data_stream.seek(0)
		cell_tree = gdsScan.scanGds(data_stream)		
		
		cell_names = []
		cell_names = extract_cell_names(cell_tree, cell_names)

		return jsonify({
			"status": "success",
			"totalCells": len(cell_names),
			"unit": unit,
			"precision": precision,
			"cellList": cell_names,
			"cellTree": cell_tree,
			"savedPath": f"users/{username}/{filename}"
		})
	except Exception as e:
		return jsonify({"status": "error", "message": str(e)}), 500

#===========================================================================


@gds_bp.route('/scan_gds', methods=['POST'])
@jwt_required()
def scan_gds():
	try:
		data = request.get_json()

		inpGds = data.get('inpGds')
		precision = data.get('precision', 1e-09)
		unit = data.get('unit', 1e-06)
		layer_type = data.get('type', 'both')  # 'layers', 'text_layers', or 'both'

		if not inpGds:
			return jsonify({"error": "Missing 'inpGds' parameter"}), 400

		response_data = {}

		username = get_jwt_identity()
		# username = "sahil"
		user_dir = os.path.join(os.path.dirname(__file__), 'users', username)
		inpGds_path = os.path.join(user_dir,inpGds)
		
		if layer_type in ['layers', 'both']:
			layers = gdsScan.getLayer_fromGds(inpGds_path, [], precision, unit)
			response_data['layers'] = layers

		if layer_type in ['text_layers', 'both']:
			text_layers = gdsScan.getTextLayer_fromGds(inpGds_path, [], precision, unit)
			response_data['text_layers'] = text_layers

		labels = gdsScan.getLabels_fromGds(inpGds_path, [], precision, unit)
		response_data['labels'] = labels

		response_data['unit'] = unit
		response_data['precision'] = precision

		return jsonify(response_data)

	except Exception as e:
		return jsonify({"error": str(e)}), 500 

#===========================================================================
