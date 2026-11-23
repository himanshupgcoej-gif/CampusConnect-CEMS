
from flask import Blueprint, request, jsonify, g
from database import get_connection
from routes.auth import role_required
import psycopg2


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


# ==========================================
# ADMIN: VIEW ALL USERS
# ==========================================

@admin_bp.route("/users", methods=["GET"])
@role_required("Admin")
def get_all_users():

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        # Pagination
        try:
            page = int(request.args.get("page", 1))
            per_page = int(request.args.get("per_page", 10))
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Page and per_page must be integers."
            }), 400

        if page < 1 or per_page < 1 or per_page > 100:
            return jsonify({
                "success": False,
                "message": "Invalid pagination values."
            }), 400

        offset = (page - 1) * per_page

        role = request.args.get("role")
        search = request.args.get("search", "").strip()

        allowed_roles = ("Student", "Organizer", "Admin")

        if role and role not in allowed_roles:
            return jsonify({
                "success": False,
                "message": "Invalid user role."
            }), 400

        conditions = []
        params = []

        if role:
            conditions.append("role = %s")
            params.append(role)

        if search:
            conditions.append(
                "(full_name ILIKE %s OR email ILIKE %s)"
            )
            params.extend([f"%{search}%", f"%{search}%"])

        where_clause = ""

        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        cursor.execute(f"""
            SELECT COUNT(*)
            FROM public.users
            {where_clause}
        """, tuple(params))

        total_users = cursor.fetchone()[0]

        cursor.execute(f"""
            SELECT
                user_id,
                full_name,
                email,
                phone,
                role,
                is_active,
                created_at,
                approval_status
            FROM public.users
            {where_clause}
            ORDER BY user_id DESC
            LIMIT %s OFFSET %s
        """, tuple(params + [per_page, offset]))

        rows = cursor.fetchall()

        users = []

        for row in rows:
            users.append({
                "user_id": row[0],
                "full_name": row[1],
                "email": row[2],
                "phone": row[3],
                "role": row[4],
                "is_active": row[5],
                "created_at": (
                    row[6].isoformat() if row[6] else None
                ),
                "approval_status": row[7]
            })

        return jsonify({
            "success": True,
            "total_users": total_users,
            "page": page,
            "per_page": per_page,
            "users": users
        }), 200

    except psycopg2.Error as e:
        print("Admin Get Users Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch users."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: VIEW SINGLE USER
# ==========================================

@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@role_required("Admin")
def get_user_details(user_id):

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
                phone,
                role,
                is_active,
                created_at,
                prn,
                department,
                organization_name,
                designation,
                approval_status,
                rejection_reason
            FROM public.users
            WHERE user_id = %s
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        return jsonify({
            "success": True,
            "user": {
                "user_id": user[0],
                "full_name": user[1],
                "email": user[2],
                "phone": user[3],
                "role": user[4],
                "is_active": user[5],
                "created_at": (
                    user[6].isoformat() if user[6] else None
                ),
                "prn": user[7],
                "department": user[8],
                "organization_name": user[9],
                "designation": user[10],
                "approval_status": user[11],
                "rejection_reason": user[12]
            }
        }), 200

    except psycopg2.Error as e:
        print("Admin Get User Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch user details."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: ACTIVATE / DEACTIVATE USER
# ==========================================

@admin_bp.route(
    "/users/<int:user_id>/status",
    methods=["PATCH"]
)
@role_required("Admin")
def update_user_status(user_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        return jsonify({
            "success": False,
            "message": "is_active must be true or false."
        }), 400

    current_user_id = g.current_user["user_id"]

    if user_id == current_user_id and is_active is False:
        return jsonify({
            "success": False,
            "message": "You cannot deactivate your own account."
        }), 400

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        if is_active is False:

            cursor.execute("""
                SELECT user_id
                FROM public.users
                WHERE role = 'Admin'
                  AND is_active = TRUE
                ORDER BY user_id
                FOR UPDATE
            """)

            active_admins = cursor.fetchall()

        cursor.execute("""
            SELECT user_id, role, is_active
            FROM public.users
            WHERE user_id = %s
            FOR UPDATE
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        if (
            user[1] == "Admin"
            and user[2] is True
            and is_active is False
            and len(active_admins) <= 1
        ):
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Cannot deactivate the last active Admin."
            }), 400

        cursor.execute("""
            UPDATE public.users
            SET is_active = %s
            WHERE user_id = %s
            RETURNING user_id, full_name, role, is_active
        """, (is_active, user_id))

        updated = cursor.fetchone()

        conn.commit()

        return jsonify({
            "success": True,
            "message": (
                "User activated successfully."
                if is_active
                else "User deactivated successfully."
            ),
            "user": {
                "user_id": updated[0],
                "full_name": updated[1],
                "role": updated[2],
                "is_active": updated[3]
            }
        }), 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Admin Update User Status Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update user status."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: VIEW PENDING ORGANIZERS
# ==========================================

@admin_bp.route("/organizers/pending", methods=["GET"])
@role_required("Admin")
def get_pending_organizers():

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
                phone,
                organization_name,
                designation,
                approval_status,
                created_at
            FROM public.users
            WHERE role = 'Organizer'
              AND approval_status = 'Pending'
            ORDER BY created_at ASC
        """)

        rows = cursor.fetchall()

        organizers = []

        for row in rows:
            organizers.append({
                "user_id": row[0],
                "full_name": row[1],
                "email": row[2],
                "phone": row[3],
                "organization_name": row[4],
                "designation": row[5],
                "approval_status": row[6],
                "created_at": (
                    row[7].isoformat() if row[7] else None
                )
            })

        return jsonify({
            "success": True,
            "count": len(organizers),
            "organizers": organizers
        }), 200

    except psycopg2.Error as e:
        print("Pending Organizers Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch pending organizers."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: APPROVE / REJECT ORGANIZER
# ==========================================

@admin_bp.route(
    "/organizers/<int:user_id>/approval",
    methods=["PATCH"]
)
@role_required("Admin")
def update_organizer_approval(user_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    action = data.get("action")

    if action not in ("Approve", "Reject"):
        return jsonify({
            "success": False,
            "message": "Action must be Approve or Reject."
        }), 400

    rejection_reason = data.get("rejection_reason", "")

    if not isinstance(rejection_reason, str):
        return jsonify({
            "success": False,
            "message": "Rejection reason must be text."
        }), 400

    rejection_reason = rejection_reason.strip()

    if action == "Reject" and not rejection_reason:
        return jsonify({
            "success": False,
            "message": "Please provide a reason for rejection."
        }), 400

    if len(rejection_reason) > 2000:
        return jsonify({
            "success": False,
            "message": "Rejection reason is too long."
        }), 400

    new_status = (
        "Approved" if action == "Approve" else "Rejected"
    )

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
                organization_name,
                designation,
                approval_status
            FROM public.users
            WHERE user_id = %s
              AND role = 'Organizer'
            FOR UPDATE
        """, (user_id,))

        organizer = cursor.fetchone()

        if not organizer:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Organizer account not found."
            }), 404

        if organizer[5] != "Pending":
            conn.rollback()

            return jsonify({
                "success": False,
                "message": (
                    "This Organizer application has already been processed."
                )
            }), 409

        cursor.execute("""
            UPDATE public.users
            SET
                approval_status = %s,
                rejection_reason = %s
            WHERE user_id = %s
            RETURNING
                user_id,
                full_name,
                email,
                organization_name,
                designation,
                approval_status,
                rejection_reason
        """, (
            new_status,
            rejection_reason if action == "Reject" else None,
            user_id
        ))

        updated = cursor.fetchone()

        conn.commit()

        return jsonify({
            "success": True,
            "message": (
                "Organizer approved successfully."
                if action == "Approve"
                else "Organizer application rejected successfully."
            ),
            "organizer": {
                "user_id": updated[0],
                "full_name": updated[1],
                "email": updated[2],
                "organization_name": updated[3],
                "designation": updated[4],
                "approval_status": updated[5],
                "rejection_reason": updated[6]
            }
        }), 200

    except psycopg2.Error as e:
        conn.rollback()

        print("Organizer Approval Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to process Organizer application."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: VIEW ALL EVENTS
# ==========================================

@admin_bp.route("/events", methods=["GET"])
@role_required("Admin")
def get_all_events():

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
                e.event_id,
                e.event_title,
                e.venue,
                e.start_at,
                e.end_at,
                e.capacity,
                e.status,
                c.category_name,
                u.full_name AS organizer_name,
                COUNT(r.registration_id) AS total_registrations
            FROM public.events e
            LEFT JOIN public.categories c
                ON e.category_id = c.category_id
            JOIN public.users u
                ON e.organizer_id = u.user_id
            LEFT JOIN public.registrations r
                ON e.event_id = r.event_id
            GROUP BY
                e.event_id,
                c.category_name,
                u.full_name
            ORDER BY e.created_at DESC
        """)

        rows = cursor.fetchall()

        events = []

        for row in rows:
            events.append({
                "event_id": row[0],
                "event_title": row[1],
                "venue": row[2],
                "start_at": row[3].isoformat() if row[3] else None,
                "end_at": row[4].isoformat() if row[4] else None,
                "capacity": row[5],
                "status": row[6],
                "category_name": row[7],
                "organizer_name": row[8],
                "total_registrations": row[9]
            })

        return jsonify({
            "success": True,
            "count": len(events),
            "events": events
        }), 200

    except psycopg2.Error as e:
        print("Admin Get Events Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch events."
        }), 500

    finally:
        conn.close()


# ==========================================
# ADMIN: DASHBOARD STATISTICS
# ==========================================

@admin_bp.route("/dashboard", methods=["GET"])
@role_required("Admin")
def get_admin_dashboard():

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
                (SELECT COUNT(*) FROM public.users),
                (SELECT COUNT(*) FROM public.users
                    WHERE is_active = TRUE),
                (SELECT COUNT(*) FROM public.users
                    WHERE role = 'Student'),
                (SELECT COUNT(*) FROM public.users
                    WHERE role = 'Organizer'),
                (SELECT COUNT(*) FROM public.users
                    WHERE role = 'Admin'),
                (SELECT COUNT(*) FROM public.events),
                (SELECT COUNT(*) FROM public.events
                    WHERE status = 'Published'),
                (SELECT COUNT(*) FROM public.registrations),
                (SELECT COUNT(*) FROM public.registrations
                    WHERE approval_status = 'Approved'),
                (SELECT COUNT(*) FROM public.registrations
                    WHERE attendance_status = 'Present')
        """)

        row = cursor.fetchone()

        return jsonify({
            "success": True,
            "dashboard": {
                "total_users": row[0],
                "active_users": row[1],
                "students": row[2],
                "organizers": row[3],
                "admins": row[4],
                "total_events": row[5],
                "published_events": row[6],
                "total_registrations": row[7],
                "approved_registrations": row[8],
                "present_students": row[9]
            }
        }), 200

    except psycopg2.Error as e:
        print("Admin Dashboard Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch dashboard statistics."
        }), 500

    finally:
        conn.close()
