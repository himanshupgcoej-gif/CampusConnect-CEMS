
from flask import Blueprint, request, jsonify, g
from database import get_connection
from routes.auth import auth_required, role_required
import psycopg2


events_bp = Blueprint("events", __name__, url_prefix="/api/events")


# --------------------------------
# HELPER: FORMAT EVENT RESPONSE
# --------------------------------

def format_event(event):
    return {
        "event_id": event[0],
        "event_title": event[1],
        "description": event[2],
        "venue": event[3],
        "start_at": event[4].isoformat() if event[4] else None,
        "end_at": event[5].isoformat() if event[5] else None,
        "registration_deadline": (
            event[6].isoformat() if event[6] else None
        ),
        "capacity": event[7],
        "status": event[8],
        "image_url": event[9],
        "category_id": event[10],
        "category_name": event[11],
        "organizer_id": event[12],
        "organizer_name": event[13]
    }


# --------------------------------
# GET ORGANIZER'S OWN EVENTS
# ORGANIZER ONLY
# --------------------------------

@events_bp.route("/my", methods=["GET"])
@role_required("Organizer")
def get_my_events():

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
                e.description,
                e.venue,
                e.start_at,
                e.end_at,
                e.registration_deadline,
                e.capacity,
                e.status,
                e.image_url,
                e.category_id,
                c.category_name,
                e.organizer_id,
                u.full_name
            FROM public.events e
            LEFT JOIN public.categories c
                ON e.category_id = c.category_id
            JOIN public.users u
                ON e.organizer_id = u.user_id
            WHERE e.organizer_id = %s
            ORDER BY e.start_at DESC
        """, (g.current_user["user_id"],))

        events = cursor.fetchall()

        return jsonify({
            "success": True,
            "count": len(events),
            "events": [format_event(event) for event in events]
        }), 200

    except psycopg2.Error as e:
        print("Get organizer events error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve your events."
        }), 500

    finally:
        conn.close()


# --------------------------------
# GET EVENT CATEGORIES
# --------------------------------

@events_bp.route("/categories", methods=["GET"])
def get_event_categories():

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT category_id, category_name
            FROM public.categories
            ORDER BY category_name ASC
        """)

        categories = cursor.fetchall()

        return jsonify({
            "success": True,
            "count": len(categories),
            "categories": [
                {
                    "category_id": category[0],
                    "category_name": category[1]
                }
                for category in categories
            ]
        }), 200

    except psycopg2.Error as e:
        print("Get categories error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve event categories."
        }), 500

    finally:
        conn.close()

# --------------------------------
# GET ALL PUBLISHED EVENTS
# --------------------------------

@events_bp.route("", methods=["GET"])
def get_events():

    category_id = request.args.get("category_id")

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        query = """
            SELECT
                e.event_id,
                e.event_title,
                e.description,
                e.venue,
                e.start_at,
                e.end_at,
                e.registration_deadline,
                e.capacity,
                e.status,
                e.image_url,
                e.category_id,
                c.category_name,
                e.organizer_id,
                u.full_name
            FROM public.events e
            LEFT JOIN public.categories c
                ON e.category_id = c.category_id
            JOIN public.users u
                ON e.organizer_id = u.user_id
            WHERE e.status = 'Published'
        """

        params = []

        if category_id:
            try:
                category_id = int(category_id)
                if category_id <= 0:
                    raise ValueError()
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Invalid category_id."
                }), 400

            query += " AND e.category_id = %s"
            params.append(category_id)

        query += " ORDER BY e.start_at ASC"

        cursor.execute(query, tuple(params))
        events = cursor.fetchall()

        return jsonify({
            "success": True,
            "count": len(events),
            "events": [format_event(event) for event in events]
        }), 200

    except psycopg2.Error as e:
        print("Get events error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve events."
        }), 500

    finally:
        conn.close()


# --------------------------------
# GET SINGLE EVENT
# --------------------------------

@events_bp.route("/<int:event_id>", methods=["GET"])
def get_event(event_id):

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
                e.description,
                e.venue,
                e.start_at,
                e.end_at,
                e.registration_deadline,
                e.capacity,
                e.status,
                e.image_url,
                e.category_id,
                c.category_name,
                e.organizer_id,
                u.full_name
            FROM public.events e
            LEFT JOIN public.categories c
                ON e.category_id = c.category_id
            JOIN public.users u
                ON e.organizer_id = u.user_id
            WHERE e.event_id = %s
              AND e.status = 'Published'
        """, (event_id,))

        event = cursor.fetchone()

        if not event:
            return jsonify({
                "success": False,
                "message": "Event not found."
            }), 404

        return jsonify({
            "success": True,
            "event": format_event(event)
        }), 200

    except psycopg2.Error as e:
        print("Get event error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve event."
        }), 500

    finally:
        conn.close()


# --------------------------------
# CREATE EVENT
# ORGANIZER / ADMIN ONLY
# --------------------------------

@events_bp.route("", methods=["POST"])
@role_required("Organizer", "Admin")
def create_event():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Please provide valid JSON data."
        }), 400

    event_title = data.get("event_title")
    description = data.get("description")
    venue = data.get("venue")
    start_at = data.get("start_at")
    end_at = data.get("end_at")
    registration_deadline = data.get("registration_deadline")
    capacity = data.get("capacity")
    category_id = data.get("category_id")
    image_url = data.get("image_url")

    if not all(
        isinstance(value, str) and value.strip()
        for value in (event_title, venue, start_at, end_at)
    ):
        return jsonify({
            "success": False,
            "message": "Event title, venue, start time and end time are required."
        }), 400

    event_title = event_title.strip()
    venue = venue.strip()

    if len(event_title) > 200 or len(venue) > 200:
        return jsonify({
            "success": False,
            "message": "Event title or venue is too long."
        }), 400

    if description is not None and not isinstance(description, str):
        return jsonify({
            "success": False,
            "message": "Description must be text."
        }), 400

    if image_url is not None and not isinstance(image_url, str):
        return jsonify({
            "success": False,
            "message": "Image URL must be text."
        }), 400

    if (
        isinstance(capacity, bool)
        or not isinstance(capacity, int)
        or capacity <= 0
    ):
        return jsonify({
            "success": False,
            "message": "Capacity must be a positive integer."
        }), 400

    if category_id is not None:
        if isinstance(category_id, bool):
            return jsonify({
                "success": False,
                "message": "Invalid category ID."
            }), 400

        try:
            category_id = int(category_id)
            if category_id <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Invalid category ID."
            }), 400

    if registration_deadline == "":
        registration_deadline = None

    if registration_deadline is not None and not isinstance(
        registration_deadline, str
    ):
        return jsonify({
            "success": False,
            "message": "Registration deadline must be a date/time string."
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
            INSERT INTO public.events (
                event_title,
                description,
                venue,
                start_at,
                end_at,
                registration_deadline,
                capacity,
                category_id,
                organizer_id,
                image_url,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Draft')
            RETURNING event_id
        """, (
            event_title,
            description,
            venue,
            start_at,
            end_at,
            registration_deadline,
            capacity,
            category_id,
            g.current_user["user_id"],
            image_url
        ))

        event_id = cursor.fetchone()[0]
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Event created successfully. It is currently a draft.",
            "event_id": event_id,
            "status": "Draft"
        }), 201

    except psycopg2.Error as e:
        conn.rollback()
        print("Create event error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to create event. Check category and date values."
        }), 400

    finally:
        conn.close()


# --------------------------------
# PUBLISH EVENT
# ORGANIZER / ADMIN ONLY
# --------------------------------

@events_bp.route("/<int:event_id>/publish", methods=["PATCH"])
@role_required("Organizer", "Admin")
def publish_event(event_id):

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT organizer_id, status
            FROM public.events
            WHERE event_id = %s
        """, (event_id,))

        event = cursor.fetchone()

        if not event:
            return jsonify({
                "success": False,
                "message": "Event not found."
            }), 404

        if (
            g.current_user["role"] != "Admin"
            and event[0] != g.current_user["user_id"]
        ):
            return jsonify({
                "success": False,
                "message": "You can only publish your own events."
            }), 403

        if event[1] == "Cancelled" or event[1] == "Completed":
            return jsonify({
                "success": False,
                "message": "Cancelled or completed events cannot be published."
            }), 400

        cursor.execute("""
            UPDATE public.events
            SET status = 'Published'
            WHERE event_id = %s
        """, (event_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Event published successfully."
        }), 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Publish event error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to publish event."
        }), 500

    finally:
        conn.close()
