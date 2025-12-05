from flask import Flask, request, jsonify, send_file, after_this_request,send_from_directory
from flask import send_file, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager,jwt_required,get_jwt_identity
from pymongo import MongoClient
import os
from gdsHandler import gds_bp
from cirHandler import cir_bp
from cellListHandler import cell_list_bp
from lvs_handler import lvs_bp

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

app.register_blueprint(gds_bp, url_prefix='/gds')
app.register_blueprint(cir_bp, url_prefix='/cir')   
app.register_blueprint(cell_list_bp, url_prefix='/cell_list')
app.register_blueprint(lvs_bp, url_prefix='/lvs')


@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_file(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# MongoDB configuration
MONGO_URI = "mongodb+srv://innoveotech:LPVlwcASp0OoQ8Dg@azeem.af86m.mongodb.net/drcDB"
DB_NAME = "drcDB"

# Initialize MongoDB client
client = MongoClient(MONGO_URI)
db = client[DB_NAME]


@app.before_request
def attach_db():
    app.db = db


if __name__ == '__main__':
	app.run(host='0.0.0.0',port=6200,debug=True)   
