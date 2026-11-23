
import os

from flask import Flask, jsonify
from flask_cors import CORS

from database import get_connection
from routes.auth import auth_bp
from routes.events import events_bp
from routes.registrations import registrations_bp
from routes.certificates import certificates_bp
from routes.admin import admin_bp
from routes.feedback import feedback_bp


# =====================================================
# INITIALIZE FLASK APPLICATION
# =====================================================

app = Flask(__name__)

APP_ENV = os.environ.get("CEMS_ENV", "development").lower()

# =====================================================
# SECRET KEY CONFIGURATION
# =====================================================

secret_key = os.environ.get("CEMS_SECRET_KEY")

if APP_ENV == "production" and not secret_key:
    raise RuntimeError(
        "CEMS_SECRET_KEY must be configured in production."
    )

app.config["SECRET_KEY"] = (
    secret_key
    or "development-only-change-this-secret-key"
)


# =====================================================
# CORS CONFIGURATION
# =====================================================

default_origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

configured_origins = os.environ.get(
    "CEMS_FRONTEND_ORIGINS"
)

if configured_origins:
    allowed_origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = default_origins

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": allowed_origins
        }
    }
)


# =====================================================
# REGISTER BLUEPRINTS
# =====================================================

app.register_blueprint(auth_bp)
app.register_blueprint(events_bp)
app.register_blueprint(registrations_bp)
app.register_blueprint(certificates_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(feedback_bp)


# =====================================================
# HOME ROUTE
# =====================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "CEMS Backend is Running Successfully!"
    })


# =====================================================
# API HEALTH CHECK
# =====================================================

@app.route("/api/health", methods=["GET"])
def health_check():

    return jsonify({
        "success": True,
        "message": "CEMS API is Working!"
    })


# =====================================================
# DATABASE HEALTH CHECK
# =====================================================

@app.route("/api/health/db", methods=["GET"])
def database_health():

    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            return jsonify({
                "success": False,
                "message": "Supabase Database Connection Failed!"
            }), 500

        cursor = conn.cursor()
        cursor.execute("SELECT current_database()")

        database_name = cursor.fetchone()[0]

        return jsonify({
            "success": True,
            "message": "Supabase PostgreSQL Connected Successfully!",
            "database": database_name
        })

    except Exception as e:

        app.logger.exception(
            "Database Health Check Error"
        )

        return jsonify({
            "success": False,
            "message": "Database Connection or Query Failed!"
        }), 500

    finally:

        if cursor is not None:
            cursor.close()

        if conn is not None:
            conn.close()


# =====================================================
# RUN FLASK APPLICATION LOCALLY
# =====================================================

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=(APP_ENV != "production")
    )
