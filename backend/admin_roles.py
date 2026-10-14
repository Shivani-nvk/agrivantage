"""
Change a user's role from the admin Users page (admin-only).

PUT /admin/users/<id>/role      Body: { "role": "admin" | "farmer" }

Rules:
  - only an admin can call it
  - an admin cannot change their OWN role (so the platform can never end up
    with no admin by accident)
  - role must be exactly "admin" or "farmer"

The role is stored inside each user's login token, so the change takes effect
the next time that user logs in (or when their current token expires).
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from auth import role_required
from models import db, User

admin_roles_bp = Blueprint("admin_roles", __name__)

VALID_ROLES = {"admin", "farmer"}


@admin_roles_bp.route("/admin/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
@role_required("admin")
def change_user_role(user_id):
    me = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    new_role = data.get("role")

    if new_role not in VALID_ROLES:
        return jsonify({"error": "role must be 'admin' or 'farmer'"}), 400
    if user_id == me:
        return jsonify({"error": "You can't change your own role."}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.role = new_role
    db.session.commit()
    return jsonify({"message": "Role updated", "user": user.to_dict()}), 200