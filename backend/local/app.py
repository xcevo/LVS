from datetime import timedelta
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os

from pymongo import MongoClient
from gdsHandler import gds_bp
from cirHandler import cir_bp
from cellListHandler import cell_list_bp
from lvs_handler import lvs_bp
from auth import auth_bp

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

app.register_blueprint(gds_bp, url_prefix='/gds')
app.register_blueprint(cir_bp, url_prefix='/cir')   
app.register_blueprint(cell_list_bp, url_prefix='/cell_list')
app.register_blueprint(lvs_bp, url_prefix='/lvs')
app.register_blueprint(auth_bp, url_prefix='/auth')


app.secret_key = 'your_secret_key'
app.config["JWT_SECRET_KEY"] = "meraSuperSecretKey123" 
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Strict"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=30)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=3)
jwt = JWTManager(app)


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
