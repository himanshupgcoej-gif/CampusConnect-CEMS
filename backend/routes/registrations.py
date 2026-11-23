
from flask import Blueprint, request, jsonify, g
from database import get_connection
from routes.auth import role_required
import psycopg2

registrations_bp = Blueprint(
    "registrations",
    __name__,
    url_prefix="/api/registrations"
)


# =====================================================
# STUDENT: REGISTER FOR AN EVENT
# =====================================================

@registrations_bp.route("/events/<int:event_id>", methods=["POST"])
@role_required("Student")
def register_for_event(event_id):
    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        # Lock event row while checking available seats.
        cursor.execute("""
            SELECT
                event_id,
                status,
                registration_deadline,
                capacity,
                start_at
            FROM public.events
            WHERE event_id = %s
            FOR UPDATE
        """, (event_id,))

        event = cursor.fetchone()

        if not event:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Event not found."
            }), 404

        event_status = event[1]
        registration_deadline = event[2]
        capacity = event[3]
        event_start = event[4]

        # Event must be published.
        if event_status != "Published":
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "This event is not open for registration."
            }), 400

        # Prevent registration after the event has started.
        cursor.execute("""
            SELECT NOW() >= %s
        """, (event_start,))

        if cursor.fetchone()[0]:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Registration is closed because this event has already started."
            }), 400

        # Check registration deadline.
        if registration_deadline is not None:
            cursor.execute("""
                SELECT NOW() <= %s
            """, (registration_deadline,))

            if not cursor.fetchone()[0]:
                conn.rollback()
                return jsonify({
                    "success": False,
                    "message": "Registration deadline has passed."
                }), 400

        student_id = g.current_user["user_id"]

        # Check whether this student already registered.
        cursor.execute("""
            SELECT registration_id
            FROM public.registrations
            WHERE event_id = %s AND student_id = %s
        """, (event_id, student_id))

        if cursor.fetchone():
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "You have already registered for this event."
            }), 409

        # Check available capacity.
        cursor.execute("""
            SELECT COUNT(*)
            FROM public.registrations
            WHERE event_id = %s
              AND approval_status IN ('Pending', 'Approved')
        """, (event_id,))

        registered_count = cursor.fetchone()[0]

        if registered_count >= capacity:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Sorry, this event is full."
            }), 400

        # Create registration.
        cursor.execute("""
            INSERT INTO public.registrations
                (event_id, student_id, approval_status, attendance_status)
            VALUES (%s, %s, 'Pending', 'Not Marked')
            RETURNING registration_id, registration_date, approval_status
        """, (event_id, student_id))

        registration = cursor.fetchone()
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Event registration successful.",
            "registration": {
                "registration_id": registration[0],
                "event_id": event_id,
                "student_id": student_id,
                "registration_date": registration[1].isoformat(),
                "approval_status": registration[2]
            }
        }), 201

    except psycopg2.Error as e:
        conn.rollback()
        print("Registration API Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to register for this event."
        }), 500

    finally:
        conn.close()


# =====================================================
# STUDENT: VIEW MY REGISTRATIONS
# =====================================================

@registrations_bp.route("/my", methods=["GET"])
@role_required("Student")
def get_my_registrations():
    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        student_id = g.current_user["user_id"]

        cursor.execute("""
            SELECT
                r.registration_id,
                r.registration_date,
                r.approval_status,
                r.attendance_status,
                e.event_id,
                e.event_title,
                e.venue,
                e.start_at,
                e.end_at,
                c.category_name
            FROM public.registrations r
            JOIN public.events e
                ON r.event_id = e.event_id
            LEFT JOIN public.categories c
                ON e.category_id = c.category_id
            WHERE r.student_id = %s
            ORDER BY r.registration_date DESC
        """, (student_id,))

        rows = cursor.fetchall()

        registrations = []

        for row in rows:
            registrations.append({
                "registration_id": row[0],
                "registration_date": row[1].isoformat(),
                "approval_status": row[2],
                "attendance_status": row[3],
                "event": {
                    "event_id": row[4],
                    "event_title": row[5],
                    "venue": row[6],
                    "start_at": row[7].isoformat() if row[7] else None,
                    "end_at": row[8].isoformat() if row[8] else None,
                    "category_name": row[9]
                }
            })

        return jsonify({
            "success": True,
            "count": len(registrations),
            "registrations": registrations
        }), 200

    except psycopg2.Error as e:
        print("My Registrations API Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch registrations."
        }), 500

    finally:
        conn.close()


# =====================================================
# ORGANIZER / ADMIN: VIEW EVENT REGISTRATIONS
# =====================================================

@registrations_bp.route("/events/<int:event_id>", methods=["GET"])
@role_required("Organizer", "Admin")
def get_event_registrations(event_id):
    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()
        current_user = g.current_user

        cursor.execute("""
            SELECT organizer_id
            FROM public.events
            WHERE event_id = %s
        """, (event_id,))

        event = cursor.fetchone()

        if not event:
            return jsonify({
                "success": False,
                "message": "Event not found."
            }), 404

        # Admin can view all events.
        # Organizer can view only their own events.
        if (
            current_user["role"] != "Admin"
            and event[0] != current_user["user_id"]
        ):
            return jsonify({
                "success": False,
                "message": "You are not authorized to view these registrations."
            }), 403

        cursor.execute("""
            SELECT
                r.registration_id,
                r.registration_date,
                r.approval_status,
                r.attendance_status,
                u.user_id,
                u.full_name,
                u.email,
                u.phone
            FROM public.registrations r
            JOIN public.users u
                ON r.student_id = u.user_id
            WHERE r.event_id = %s
            ORDER BY r.registration_date DESC
        """, (event_id,))

        rows = cursor.fetchall()

        registrations = []

        for row in rows:
            registrations.append({
                "registration_id": row[0],
                "registration_date": row[1].isoformat(),
                "approval_status": row[2],
                "attendance_status": row[3],
                "student": {
                    "user_id": row[4],
                    "full_name": row[5],
                    "email": row[6],
                    "phone": row[7]
                }
            })

        return jsonify({
            "success": True,
            "event_id": event_id,
            "count": len(registrations),
            "registrations": registrations
        }), 200

    except psycopg2.Error as e:
        print("Event Registrations Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch event registrations."
        }), 500

    finally:
        conn.close()


# =====================================================
# ORGANIZER / ADMIN: APPROVE OR REJECT REGISTRATION
# =====================================================

@registrations_bp.route(
    "/<int:registration_id>/status",
    methods=["PATCH"]
)
@role_required("Organizer", "Admin")
def update_registration_status(registration_id):

    # Validate JSON input.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    new_status = data.get("approval_status")

    if new_status not in ("Approved", "Rejected"):
        return jsonify({
            "success": False,
            "message": "approval_status must be Approved or Rejected."
        }), 400

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()
        current_user = g.current_user

        cursor.execute("""
            SELECT
                r.registration_id,
                r.approval_status,
                e.organizer_id
            FROM public.registrations r
            JOIN public.events e
                ON r.event_id = e.event_id
            WHERE r.registration_id = %s
            FOR UPDATE OF r
        """, (registration_id,))

        registration = cursor.fetchone()

        if not registration:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Registration not found."
            }), 404

        current_status = registration[1]
        organizer_id = registration[2]

        # Check event ownership.
        if (
            current_user["role"] != "Admin"
            and organizer_id != current_user["user_id"]
        ):
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "You are not authorized to manage this registration."
            }), 403

        # Only Pending registrations can be updated.
        if current_status != "Pending":
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Only Pending registrations can be updated."
            }), 400

        cursor.execute("""
            UPDATE public.registrations
            SET approval_status = %s
            WHERE registration_id = %s
            RETURNING registration_id, approval_status
        """, (new_status, registration_id))

        updated = cursor.fetchone()
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Registration {new_status.lower()} successfully.",
            "registration": {
                "registration_id": updated[0],
                "approval_status": updated[1]
            }
        }), 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Update Registration Status Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update registration status."
        }), 500

    finally:
        conn.close()


# =====================================================
# ORGANIZER / ADMIN: MARK STUDENT ATTENDANCE
# =====================================================

@registrations_bp.route(
    "/<int:registration_id>/attendance",
    methods=["PATCH"]
)
@role_required("Organizer", "Admin")
def mark_attendance(registration_id):

    # Validate JSON input.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    attendance_status = data.get("attendance_status")

    if attendance_status not in ("Present", "Absent"):
        return jsonify({
            "success": False,
            "message": "attendance_status must be Present or Absent."
        }), 400

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()
        current_user = g.current_user

        cursor.execute("""
            SELECT
                r.registration_id,
                r.approval_status,
                e.organizer_id
            FROM public.registrations r
            JOIN public.events e
                ON r.event_id = e.event_id
            WHERE r.registration_id = %s
            FOR UPDATE OF r
        """, (registration_id,))

        registration = cursor.fetchone()

        if not registration:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Registration not found."
            }), 404

        approval_status = registration[1]
        organizer_id = registration[2]

        # Check event ownership.
        if (
            current_user["role"] != "Admin"
            and organizer_id != current_user["user_id"]
        ):
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "You are not authorized to mark this attendance."
            }), 403

        # Attendance is allowed only for approved students.
        if approval_status != "Approved":
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Attendance can only be marked for Approved registrations."
            }), 400

        # Update attendance.
        cursor.execute("""
            UPDATE public.registrations
            SET attendance_status = %s
            WHERE registration_id = %s
            RETURNING registration_id, attendance_status
        """, (attendance_status, registration_id))

        updated = cursor.fetchone()

        # If marked Absent, flag any existing Active certificate.
        if attendance_status == "Absent":
            cursor.execute("""
                UPDATE public.certificates
                SET certificate_status = 'Under Review'
                WHERE registration_id = %s
                  AND certificate_status = 'Active'
            """, (registration_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Attendance marked successfully.",
            "registration": {
                "registration_id": updated[0],
                "attendance_status": updated[1]
            }
        }), 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Attendance API Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to mark attendance."
        }), 500

    finally:
        conn.close()
