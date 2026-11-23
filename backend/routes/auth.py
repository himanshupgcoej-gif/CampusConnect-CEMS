
from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from functools import wraps

import psycopg2
import re

from database import get_connection


# =====================================================
# BLUEPRINT AND CONFIGURATION
# =====================================================

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

TOKEN_SALT = "cems-auth-token"
TOKEN_MAX_AGE = 86400  # 24 hours

ALLOWED_ROLES = ("Student", "Organizer", "Admin")


# =====================================================
# COMMON VALIDATION HELPERS
# =====================================================

def validate_name(value, field_name="Full name", maximum=100):

    if not isinstance(value, str):
        return f"{field_name} is required."

    value = value.strip()

    if not value or len(value) > maximum:
        return f"{field_name} must contain 1 to {maximum} characters."

    return None


def validate_email(email):

    if not isinstance(email, str):
        return "A valid email address is required."

    email = email.strip().lower()

    if len(email) > 150 or not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):
        return "Please enter a valid email address."

    return None


def validate_password(password):

    if not isinstance(password, str):
        return "Password is required."

    if len(password) < 8 or len(password) > 128:
        return "Password must contain 8 to 128 characters."

    return None


def validate_optional_phone(phone):

    if phone is None:
        return None, None

    if not isinstance(phone, str):
        return None, "Phone must be text."

    phone = phone.strip()

    if not phone:
        return None, None

    if len(phone) > 15:
        return None, "Phone number cannot exceed 15 characters."

    return phone, None


# =====================================================
# TOKEN GENERATION
# =====================================================

def create_token(user_id):

    serializer = URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"],
        salt=TOKEN_SALT
    )

    return serializer.dumps({
        "user_id": user_id
    })


# =====================================================
# AUTHENTICATION DECORATOR
# =====================================================

def auth_required(func):

    @wraps(func)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "success": False,
                "message": "Authentication token is required."
            }), 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "success": False,
                "message": "Invalid authentication token."
            }), 401

        try:

            serializer = URLSafeTimedSerializer(
                current_app.config["SECRET_KEY"],
                salt=TOKEN_SALT
            )

            data = serializer.loads(
                token,
                max_age=TOKEN_MAX_AGE
            )

            user_id = data.get("user_id")

        except SignatureExpired:

            return jsonify({
                "success": False,
                "message": "Token expired. Please login again."
            }), 401

        except (BadSignature, AttributeError):

            return jsonify({
                "success": False,
                "message": "Invalid authentication token."
            }), 401

        if user_id is None:
            return jsonify({
                "success": False,
                "message": "Invalid authentication token."
            }), 401

        conn = get_connection()

        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500

        try:

            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    user_id,
                    full_name,
                    email,
                    role,
                    is_active,
                    approval_status,
                    prn,
                    department,
                    organization_name,
                    designation
                FROM public.users
                WHERE user_id = %s
            """, (user_id,))

            user = cursor.fetchone()

            if not user or not user[4]:

                return jsonify({
                    "success": False,
                    "message": "Account not found or inactive."
                }), 401

            role = user[3]
            approval_status = user[5] or "Approved"

            # Block unapproved Organizers.
            if role == "Organizer" and approval_status != "Approved":

                return jsonify({
                    "success": False,
                    "message": (
                        "Your Organizer account is not approved. "
                        "Please contact the administrator."
                    )
                }), 403

            g.current_user = {
                "user_id": user[0],
                "full_name": user[1],
                "email": user[2],
                "role": role,
                "prn": user[6],
                "department": user[7],
                "organization_name": user[8],
                "designation": user[9],
                "approval_status": approval_status
            }

        except psycopg2.Error as e:

            current_app.logger.error(
                "Authentication database error: %s", e
            )

            return jsonify({
                "success": False,
                "message": "Unable to verify account."
            }), 500

        finally:
            conn.close()

        return func(*args, **kwargs)

    return decorated


# =====================================================
# ROLE-BASED AUTHORIZATION DECORATOR
# =====================================================

def role_required(*roles):

    def decorator(func):

        @wraps(func)
        @auth_required
        def decorated(*args, **kwargs):

            current_role = g.current_user["role"]

            if current_role not in roles:

                return jsonify({
                    "success": False,
                    "message": "You do not have permission to access this resource."
                }), 403

            return func(*args, **kwargs)

        return decorated

    return decorator


# =====================================================
# STUDENT REGISTRATION
# POST /api/auth/register
# =====================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    prn = data.get("prn")
    department = data.get("department")
    phone = data.get("phone")

    # Validate full name.
    error = validate_name(full_name)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate email.
    error = validate_email(email)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate password.
    error = validate_password(password)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate PRN.
    if not isinstance(prn, str):
        return jsonify({
            "success": False,
            "message": "Student PRN is required."
        }), 400

    prn = prn.strip()

    if not re.fullmatch(r"[A-Za-z0-9/-]{1,30}", prn):
        return jsonify({
            "success": False,
            "message": "Please enter a valid PRN."
        }), 400

    # Validate department.
    error = validate_name(
        department,
        "Department",
        100
    )

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    department = department.strip()
    full_name = full_name.strip()
    email = email.strip().lower()

    phone, error = validate_optional_phone(phone)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    password_hash = generate_password_hash(password)

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO public.users
                (
                    full_name,
                    email,
                    password_hash,
                    phone,
                    prn,
                    department,
                    role,
                    approval_status
                )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING user_id
        """, (
            full_name,
            email,
            password_hash,
            phone,
            prn,
            department,
            "Student",
            "Approved"
        ))

        user_id = cursor.fetchone()[0]

        conn.commit()

        token = create_token(user_id)

        return jsonify({

            "success": True,

            "message": "Student registered successfully.",

            "user": {
                "user_id": user_id,
                "full_name": full_name,
                "email": email,
                "phone": phone,
                "prn": prn,
                "department": department,
                "role": "Student",
                "approval_status": "Approved"
            },

            "token": token

        }), 201

    except psycopg2.IntegrityError:

        conn.rollback()

        return jsonify({
            "success": False,
            "message": "This email or PRN is already registered."
        }), 409

    except psycopg2.Error as e:

        conn.rollback()

        current_app.logger.error(
            "Student registration database error: %s", e
        )

        return jsonify({
            "success": False,
            "message": "Student registration failed due to a database error."
        }), 500

    finally:
        conn.close()


# =====================================================
# ORGANIZER SELF-REGISTRATION
# POST /api/auth/organizer-register
# =====================================================

@auth_bp.route("/organizer-register", methods=["POST"])
def organizer_register():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    organization_name = data.get("organization_name")
    designation = data.get("designation")
    phone = data.get("phone")

    # Validate full name.
    error = validate_name(full_name)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate email.
    error = validate_email(email)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate password.
    error = validate_password(password)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate organization name.
    error = validate_name(
        organization_name,
        "Organization name",
        150
    )

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    # Validate designation.
    error = validate_name(
        designation,
        "Designation",
        100
    )

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    full_name = full_name.strip()
    email = email.strip().lower()
    organization_name = organization_name.strip()
    designation = designation.strip()

    phone, error = validate_optional_phone(phone)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    password_hash = generate_password_hash(password)

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO public.users
                (
                    full_name,
                    email,
                    password_hash,
                    phone,
                    organization_name,
                    designation,
                    role,
                    approval_status,
                    is_active
                )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING user_id
        """, (
            full_name,
            email,
            password_hash,
            phone,
            organization_name,
            designation,
            "Organizer",
            "Pending",
            True
        ))

        user_id = cursor.fetchone()[0]

        conn.commit()

        # Do not issue a login token.
        # Organizer must wait for Admin approval.

        return jsonify({

            "success": True,

            "message": (
                "Organizer registration submitted successfully. "
                "Your account is awaiting administrator approval."
            ),

            "user": {
                "user_id": user_id,
                "full_name": full_name,
                "email": email,
                "role": "Organizer",
                "approval_status": "Pending"
            }

        }), 201

    except psycopg2.IntegrityError:

        conn.rollback()

        return jsonify({
            "success": False,
            "message": "This email is already registered."
        }), 409

    except psycopg2.Error as e:

        conn.rollback()

        current_app.logger.error(
            "Organizer registration database error: %s", e
        )

        return jsonify({
            "success": False,
            "message": "Organizer registration failed due to a database error."
        }), 500

    finally:
        conn.close()


# =====================================================
# USER LOGIN
# POST /api/auth/login
# =====================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    email = email.strip().lower()

    if not email or len(email) > 150 or not password:
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 400

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                user_id,
                full_name,
                email,
                password_hash,
                role,
                is_active,
                approval_status,
                prn,
                department,
                organization_name,
                designation
            FROM public.users
            WHERE email = %s
        """, (email,))

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        if not user[5]:
            return jsonify({
                "success": False,
                "message": "Your account is inactive. Contact administrator."
            }), 403

        if user[4] not in ALLOWED_ROLES:
            return jsonify({
                "success": False,
                "message": "Invalid account role."
            }), 403

        if not check_password_hash(user[3], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        approval_status = user[6] or "Approved"

        # Enforce Organizer approval.
        if user[4] == "Organizer" and approval_status != "Approved":

            if approval_status == "Pending":
                message = (
                    "Your Organizer registration is pending Admin approval."
                )

            else:
                message = (
                    "Your Organizer registration was rejected. "
                    "Please contact the administrator."
                )

            return jsonify({
                "success": False,
                "message": message,
                "approval_status": approval_status
            }), 403

        token = create_token(user[0])

        return jsonify({

            "success": True,

            "message": "Login successful.",

            "user": {
                "user_id": user[0],
                "full_name": user[1],
                "email": user[2],
                "role": user[4],
                "prn": user[7],
                "department": user[8],
                "organization_name": user[9],
                "designation": user[10],
                "approval_status": approval_status
            },

            "token": token

        }), 200

    except psycopg2.Error as e:

        current_app.logger.error(
            "Login database error: %s", e
        )

        return jsonify({
            "success": False,
            "message": "Login failed due to a database error."
        }), 500

    finally:
        conn.close()


# =====================================================
# CURRENT USER PROFILE
# GET /api/auth/me
# =====================================================

@auth_bp.route("/me", methods=["GET"])
@auth_required
def get_profile():

    return jsonify({

        "success": True,

        "user": g.current_user

    }), 200
