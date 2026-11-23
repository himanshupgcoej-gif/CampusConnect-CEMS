
from flask import Blueprint, request, jsonify, g
from database import get_connection
from routes.auth import role_required


feedback_bp = Blueprint(
    "feedback",
    __name__,
    url_prefix="/api/feedback"
)


# =====================================================
# STUDENT: SUBMIT FEEDBACK
# =====================================================

@feedback_bp.route("/", methods=["POST"])
@role_required("Student")
def submit_feedback():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    rating = data.get("rating")
    experience = data.get("experience")

    if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
        return jsonify({
            "success": False,
            "message": "Rating must be between 1 and 5."
        }), 400

    if not isinstance(experience, str):
        return jsonify({
            "success": False,
            "message": "Please enter your experience."
        }), 400

    experience = experience.strip()

    if len(experience) < 10:
        return jsonify({
            "success": False,
            "message": "Experience must contain at least 10 characters."
        }), 400

    if len(experience) > 2000:
        return jsonify({
            "success": False,
            "message": "Experience cannot exceed 2000 characters."
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
            INSERT INTO feedback (
                student_id,
                rating,
                experience
            )
            VALUES (%s, %s, %s)
            RETURNING feedback_id, status, created_at
        """, (
            g.current_user["user_id"],
            rating,
            experience
        ))

        result = cursor.fetchone()
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Your feedback has been submitted successfully.",
            "feedback": {
                "feedback_id": result[0],
                "status": result[1],
                "created_at": result[2].isoformat() if result[2] else None
            }
        }), 201

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to submit feedback."
        }), 500

    finally:
        cursor.close()
        conn.close()



# =====================================================
# ADMIN: VIEW ALL FEEDBACK
# =====================================================

@feedback_bp.route("/", methods=["GET"])
@role_required("Admin")
def get_all_feedback():

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
                f.feedback_id,
                f.student_id,
                u.full_name,
                u.email,
                f.rating,
                f.experience,
                f.status,
                f.created_at
            FROM feedback f
            JOIN users u
                ON f.student_id = u.user_id
            ORDER BY f.created_at DESC
        """)

        rows = cursor.fetchall()

        feedback_list = []

        for row in rows:
            feedback_list.append({
                "feedback_id": row[0],
                "student_id": row[1],
                "student_name": row[2],
                "email": row[3],
                "rating": row[4],
                "experience": row[5],
                "status": row[6],
                "created_at": row[7].isoformat() if row[7] else None
            })

        return jsonify({
            "success": True,
            "total": len(feedback_list),
            "feedback": feedback_list
        }), 200

    except Exception:
        return jsonify({
            "success": False,
            "message": "Unable to retrieve feedback."
        }), 500

    finally:
        cursor.close()
        conn.close()



# =====================================================
# ADMIN: UPDATE FEEDBACK STATUS
# =====================================================

@feedback_bp.route(
    "/<int:feedback_id>/status",
    methods=["PATCH"]
)
@role_required("Admin")
def update_feedback_status(feedback_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    status = data.get("status")

    if status not in ["Approved", "Rejected"]:
        return jsonify({
            "success": False,
            "message": "Status must be Approved or Rejected."
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
            UPDATE feedback
            SET status = %s
            WHERE feedback_id = %s
            RETURNING feedback_id, status
        """, (status, feedback_id))

        result = cursor.fetchone()

        if result is None:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Feedback not found."
            }), 404

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Feedback {status.lower()} successfully.",
            "feedback": {
                "feedback_id": result[0],
                "status": result[1]
            }
        }), 200

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update feedback status."
        }), 500

    finally:
        cursor.close()
        conn.close()



# =====================================================
# PUBLIC: GET APPROVED TESTIMONIALS
# =====================================================

@feedback_bp.route("/approved", methods=["GET"])
def get_approved_feedback():

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
                f.feedback_id,
                u.full_name,
                f.rating,
                f.experience,
                f.created_at
            FROM feedback f
            JOIN users u
                ON f.student_id = u.user_id
            WHERE f.status = 'Approved'
            ORDER BY f.created_at DESC
        """)

        rows = cursor.fetchall()

        testimonials = []

        for row in rows:
            testimonials.append({
                "feedback_id": row[0],
                "student_name": row[1],
                "rating": row[2],
                "experience": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            })

        return jsonify({
            "success": True,
            "total": len(testimonials),
            "testimonials": testimonials
        }), 200

    except Exception:
        return jsonify({
            "success": False,
            "message": "Unable to retrieve testimonials."
        }), 500

    finally:
        cursor.close()
        conn.close()
