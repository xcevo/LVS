from flask import Blueprint, request, jsonify, current_app,make_response
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity,set_refresh_cookies
from datetime import timedelta
import jwt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/generate', methods=['POST'])
@jwt_required()     
def generatenew():
    data = request.get_json()
    username = data.get('candidateId')
    print("Incoming candidateId:", username)

    if not username:
        return jsonify({"error": "candidateId is required"}), 400

    # Fresh check in DB (does not rely on old token identity)
    db = current_app.db
    user = db.users.find_one({'username': username})

    if user:
        access_token = create_access_token(identity=username, expires_delta=timedelta(seconds=7))
        print("Fresh token generated:", access_token)
        return jsonify(
            access_token=access_token,
            message="Login successful with fresh token"
        ), 200

    # Register new user
    print("new user")
    new_user = { "username": username }
    db.users.insert_one(new_user)

    access_token = create_access_token(identity=username, expires_delta=timedelta(seconds=7))

    return jsonify(
        access_token=access_token,
        message="Registration successful"
    ), 201


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"msg": "Token missing"}), 400

    try:
        payload = jwt.decode(token, "meraSuperSecretKey123", algorithms=["HS256"])
        identity = payload.get("sub")  # Corrected key

        access_token = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)

        resp = make_response(jsonify({"access_token": access_token}))
        set_refresh_cookies(resp, refresh_token)
        resp.set_cookie(
            'refresh_token',
            value=refresh_token,
            httponly=True,         # 🔐 Prevent JS access
            secure=True,           # 🔐 Send over HTTPS only (not in dev)
            samesite='Strict',     # 🔐 Or 'Lax' if you need cross-site login
            path='/auth/refresh'
        )
        return resp
    except jwt.ExpiredSignatureError:
        return jsonify({"msg": "Token expired"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"msg": f"Invalid token: {str(e)}"}), 401
    

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True, locations=["cookies"])
def refresh():
    current_user = get_jwt_identity()
    access_token = create_access_token(identity=current_user)
    response = jsonify({
        'access_token': access_token,
        'message': 'Access token refreshed successfully'
    })
    return response


@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out'})
    response.delete_cookie('refresh_token', path='/auth/refresh')
    return response