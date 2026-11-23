
from flask import Blueprint, jsonify, g, send_file, request
from io import BytesIO

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

from database import get_connection
from routes.auth import role_required

import psycopg2
import uuid


certificates_bp = Blueprint(
    "certificates",
    __name__,
    url_prefix="/api/certificates"
)


# =====================================================
# ORGANIZER / ADMIN: ISSUE CERTIFICATE
# =====================================================

@certificates_bp.route(
    "/registrations/<int:registration_id>/issue",
    methods=["POST"]
)
@role_required("Organizer", "Admin")
def issue_certificate(registration_id):

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
                r.student_id,
                r.approval_status,
                r.attendance_status,
                e.event_id,
                e.organizer_id,
                e.event_title
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

        student_id = registration[1]
        approval_status = registration[2]
        attendance_status = registration[3]
        event_id = registration[4]
        organizer_id = registration[5]
        event_title = registration[6]

        if (
            current_user["role"] != "Admin"
            and organizer_id != current_user["user_id"]
        ):
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "You are not authorized to issue this certificate."
            }), 403

        if approval_status != "Approved":
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Only Approved registrations are eligible."
            }), 400

        if attendance_status != "Present":
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Only students marked Present can receive certificates."
            }), 400

        certificate_number = (
            "CEMS-" + uuid.uuid4().hex[:12].upper()
        )

        cursor.execute("""
            INSERT INTO public.certificates
                (registration_id, certificate_number)
            VALUES (%s, %s)
            ON CONFLICT (registration_id) DO NOTHING
            RETURNING certificate_id, certificate_number, issued_at
        """, (registration_id, certificate_number))

        certificate = cursor.fetchone()

        if certificate:
            newly_issued = True
        else:
            cursor.execute("""
                SELECT
                    certificate_id,
                    certificate_number,
                    issued_at
                FROM public.certificates
                WHERE registration_id = %s
            """, (registration_id,))

            certificate = cursor.fetchone()
            newly_issued = False

        conn.commit()

        return jsonify({
            "success": True,
            "message": (
                "Certificate issued successfully."
                if newly_issued
                else "Certificate already exists."
            ),
            "newly_issued": newly_issued,
            "certificate": {
                "certificate_id": certificate[0],
                "certificate_number": certificate[1],
                "issued_at": certificate[2].isoformat(),
                "registration_id": registration_id,
                "student_id": student_id,
                "event_id": event_id,
                "event_title": event_title
            }
        }), 201 if newly_issued else 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Certificate Issue Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to issue certificate."
        }), 500

    finally:
        conn.close()


# =====================================================
# ORGANIZER / ADMIN: VIEW EVENT CERTIFICATES
# =====================================================

@certificates_bp.route(
    "/events/<int:event_id>",
    methods=["GET"]
)
@role_required("Organizer", "Admin")
def get_event_certificates(event_id):

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

        if (
            current_user["role"] != "Admin"
            and event[0] != current_user["user_id"]
        ):
            return jsonify({
                "success": False,
                "message": "You are not authorized to view these certificates."
            }), 403

        cursor.execute("""
            SELECT
                r.registration_id,
                r.student_id,
                u.full_name,
                u.email,
                r.approval_status,
                r.attendance_status,
                c.certificate_id,
                c.certificate_number,
                c.issued_at,
                c.certificate_status,
                c.revoked_at,
                c.revocation_reason
            FROM public.registrations r
            JOIN public.users u
                ON r.student_id = u.user_id
            LEFT JOIN public.certificates c
                ON r.registration_id = c.registration_id
            WHERE r.event_id = %s
            ORDER BY u.full_name ASC
        """, (event_id,))

        rows = cursor.fetchall()

        certificates = []

        for row in rows:
            certificates.append({
                "registration_id": row[0],
                "student_id": row[1],
                "student_name": row[2],
                "email": row[3],
                "approval_status": row[4],
                "attendance_status": row[5],
                "certificate_id": row[6],
                "certificate_number": row[7],
                "issued_at": row[8].isoformat() if row[8] else None,
                "certificate_status": row[9],
                "revoked_at": row[10].isoformat() if row[10] else None,
                "revocation_reason": row[11],
                "certificate_issued": row[6] is not None
            })

        return jsonify({
            "success": True,
            "event_id": event_id,
            "count": len(certificates),
            "certificates": certificates
        }), 200

    except psycopg2.Error as e:
        print("Event Certificates Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve event certificates."
        }), 500

    finally:
        conn.close()


# =====================================================
# PUBLIC: VERIFY CERTIFICATE WITHOUT LOGIN
# =====================================================

@certificates_bp.route(
    "/verify/<string:certificate_number>",
    methods=["GET"]
)
def verify_certificate(certificate_number):

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
                c.certificate_number,
                c.certificate_status,
                c.issued_at,
                u.full_name,
                e.event_title,
                e.venue,
                e.start_at
            FROM public.certificates c
            JOIN public.registrations r
                ON c.registration_id = r.registration_id
            JOIN public.users u
                ON r.student_id = u.user_id
            JOIN public.events e
                ON r.event_id = e.event_id
            WHERE c.certificate_number = %s
        """, (certificate_number,))

        certificate = cursor.fetchone()

        if not certificate:
            return jsonify({
                "success": True,
                "verified": False,
                "message": "Certificate not found."
            }), 200

        (
            cert_number,
            cert_status,
            issued_at,
            student_name,
            event_title,
            venue,
            start_at
        ) = certificate

        return jsonify({
            "success": True,
            "verified": True,
            "certificate": {
                "certificate_number": cert_number,
                "status": cert_status,
                "student_name": student_name,
                "event_title": event_title,
                "venue": venue,
                "event_date": (
                    start_at.isoformat() if start_at else None
                ),
                "issued_at": (
                    issued_at.isoformat() if issued_at else None
                )
            }
        }), 200

    except psycopg2.Error as e:
        print("Public Certificate Verification Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to verify certificate."
        }), 500

    finally:
        conn.close()


# =====================================================
# STUDENT: VIEW MY CERTIFICATES
# =====================================================

@certificates_bp.route(
    "/my",
    methods=["GET"]
)
@role_required("Student")
def get_my_certificates():

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
                c.certificate_id,
                c.certificate_number,
                c.issued_at,
                c.certificate_status,
                e.event_id,
                e.event_title,
                e.venue,
                e.start_at
            FROM public.certificates c
            JOIN public.registrations r
                ON c.registration_id = r.registration_id
            JOIN public.events e
                ON r.event_id = e.event_id
            WHERE r.student_id = %s
            ORDER BY c.issued_at DESC
        """, (student_id,))

        rows = cursor.fetchall()

        certificates = []

        for row in rows:
            certificates.append({
                "certificate_id": row[0],
                "certificate_number": row[1],
                "issued_at": row[2].isoformat() if row[2] else None,
                "certificate_status": row[3],
                "event": {
                    "event_id": row[4],
                    "event_title": row[5],
                    "venue": row[6],
                    "start_at": (
                        row[7].isoformat() if row[7] else None
                    )
                }
            })

        return jsonify({
            "success": True,
            "count": len(certificates),
            "certificates": certificates
        }), 200

    except psycopg2.Error as e:
        print("My Certificates Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch certificates."
        }), 500

    finally:
        conn.close()


# =====================================================
# PDF DESIGN HELPER FUNCTIONS
# =====================================================

def draw_centered_fitted_text(
    pdf,
    text,
    center_x,
    y,
    font_name,
    font_size,
    max_width,
    color
):
    """
    Draw centered text and reduce its font size if necessary.
    """

    text = str(text or "")

    while (
        font_size > 7
        and stringWidth(text, font_name, font_size) > max_width
    ):
        font_size -= 1

    pdf.setFillColor(color)
    pdf.setFont(font_name, font_size)
    pdf.drawCentredString(center_x, y, text)


def draw_certificate_ribbon(pdf, page_height):
    """
    Draw the decorative navy and gold ribbon on the left.
    """

    ribbon = pdf.beginPath()

    ribbon.moveTo(0, 0)
    ribbon.lineTo(42 * mm, 0)
    ribbon.lineTo(42 * mm, page_height)
    ribbon.lineTo(0, page_height)
    ribbon.close()

    pdf.setFillColor(colors.HexColor("#111735"))
    pdf.drawPath(ribbon, fill=1, stroke=0)

    gold_ribbon = pdf.beginPath()

    gold_ribbon.moveTo(34 * mm, 0)
    gold_ribbon.lineTo(43 * mm, 0)
    gold_ribbon.lineTo(43 * mm, page_height)
    gold_ribbon.lineTo(34 * mm, page_height)
    gold_ribbon.close()

    pdf.setFillColor(colors.HexColor("#C5A044"))
    pdf.drawPath(gold_ribbon, fill=1, stroke=0)

    # Small decorative emblem.
    pdf.setStrokeColor(colors.HexColor("#C5A044"))
    pdf.setLineWidth(2)

    pdf.circle(
        21 * mm,
        page_height / 2,
        12 * mm,
        fill=0,
        stroke=1
    )

    pdf.setFillColor(colors.HexColor("#D8B65C"))
    pdf.setFont("Helvetica-Bold", 9)

    pdf.drawCentredString(
        21 * mm,
        page_height / 2 - 2 * mm,
        "CEMS"
    )


# =====================================================
# STUDENT / ORGANIZER / ADMIN: DOWNLOAD PDF
# =====================================================

@certificates_bp.route(
    "/<int:certificate_id>/download",
    methods=["GET"]
)
@role_required("Student", "Organizer", "Admin")
def download_certificate(certificate_id):

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
                c.certificate_id,
                c.certificate_number,
                c.issued_at,
                c.certificate_status,
                r.student_id,
                u.full_name,
                e.event_title,
                e.venue,
                e.start_at,
                e.organizer_id
            FROM public.certificates c
            JOIN public.registrations r
                ON c.registration_id = r.registration_id
            JOIN public.users u
                ON r.student_id = u.user_id
            JOIN public.events e
                ON r.event_id = e.event_id
            WHERE c.certificate_id = %s
        """, (certificate_id,))

        certificate = cursor.fetchone()

        if not certificate:
            return jsonify({
                "success": False,
                "message": "Certificate not found."
            }), 404

        (
            cert_id,
            certificate_number,
            issued_at,
            certificate_status,
            student_id,
            student_name,
            event_title,
            venue,
            start_at,
            organizer_id
        ) = certificate

        # Student can download only their own certificate.
        if (
            current_user["role"] == "Student"
            and current_user["user_id"] != student_id
        ):
            return jsonify({
                "success": False,
                "message": "You cannot download another student's certificate."
            }), 403

        # Only Active certificates can be downloaded.
        if certificate_status != "Active":
            return jsonify({
                "success": False,
                "message": (
                    "This certificate is currently under review."
                    if certificate_status == "Under Review"
                    else "This certificate has been revoked."
                    if certificate_status == "Revoked"
                    else "This certificate is not available for download."
                )
            }), 403

        # Organizer can download only certificates for their own events.
        if (
            current_user["role"] == "Organizer"
            and current_user["user_id"] != organizer_id
        ):
            return jsonify({
                "success": False,
                "message": "You are not authorized to download this certificate."
            }), 403

        # =================================================
        # CREATE PDF
        # =================================================

        buffer = BytesIO()

        page_width, page_height = landscape(A4)

        pdf = canvas.Canvas(
            buffer,
            pagesize=landscape(A4)
        )

        navy = colors.HexColor("#171A3B")
        gold = colors.HexColor("#C5A044")
        dark_text = colors.HexColor("#333333")
        grey = colors.HexColor("#64748B")

        # Background.
        pdf.setFillColor(colors.HexColor("#FFFEFA"))

        pdf.rect(
            0,
            0,
            page_width,
            page_height,
            fill=1,
            stroke=0
        )

        # Left decorative ribbon.
        draw_certificate_ribbon(pdf, page_height)

        # Outer border.
        pdf.setStrokeColor(navy)
        pdf.setLineWidth(3)

        pdf.rect(
            46 * mm,
            10 * mm,
            page_width - 56 * mm,
            page_height - 20 * mm,
            fill=0,
            stroke=1
        )

        # Inner gold border.
        pdf.setStrokeColor(gold)
        pdf.setLineWidth(1)

        pdf.rect(
            49 * mm,
            13 * mm,
            page_width - 62 * mm,
            page_height - 26 * mm,
            fill=0,
            stroke=1
        )

        center_x = (page_width + 42 * mm) / 2

        content_width = page_width - 100 * mm

        # =================================================
        # COLLEGE HEADING
        # =================================================

        pdf.setFillColor(navy)
        pdf.setFont("Helvetica-Bold", 15)

        pdf.drawCentredString(
            center_x,
            page_height - 23 * mm,
            "Government College of Engineering, Jalgaon"
        )

        pdf.setFillColor(grey)
        pdf.setFont("Helvetica", 8)

        pdf.drawCentredString(
            center_x,
            page_height - 29 * mm,
            "An Autonomous Institute of Government of Maharashtra"
        )

        pdf.setFillColor(gold)
        pdf.setFont("Helvetica-Bold", 9)

        pdf.drawCentredString(
            center_x,
            page_height - 35 * mm,
            "COLLEGE EVENTS MANAGEMENT SYSTEM"
        )

        # Decorative divider.
        pdf.setStrokeColor(gold)
        pdf.setLineWidth(1.2)

        pdf.line(
            85 * mm,
            page_height - 39 * mm,
            page_width - 25 * mm,
            page_height - 39 * mm
        )

        # =================================================
        # EVENT HEADING
        # =================================================

        draw_centered_fitted_text(
            pdf,
            event_title,
            center_x,
            page_height - 51 * mm,
            "Helvetica-Bold",
            20,
            content_width,
            navy
        )

        # =================================================
        # CERTIFICATE TITLE
        # =================================================

        pdf.setFillColor(navy)
        pdf.setFont("Helvetica-Bold", 27)

        pdf.drawCentredString(
            center_x,
            page_height - 68 * mm,
            "CERTIFICATE"
        )

        # Gold underline.
        pdf.setStrokeColor(gold)
        pdf.setLineWidth(2)

        pdf.line(
            center_x - 42 * mm,
            page_height - 72 * mm,
            center_x + 42 * mm,
            page_height - 72 * mm
        )

        # =================================================
        # CERTIFICATE CONTENT
        # =================================================

        pdf.setFillColor(dark_text)
        pdf.setFont("Helvetica", 12)

        pdf.drawCentredString(
            center_x,
            page_height - 88 * mm,
            "This is to certify that"
        )

        # Student name.
        draw_centered_fitted_text(
            pdf,
            student_name,
            center_x,
            page_height - 103 * mm,
            "Helvetica-Bold",
            24,
            content_width,
            navy
        )

        # Student underline.
        pdf.setStrokeColor(gold)
        pdf.setLineWidth(1)

        pdf.line(
            center_x - 55 * mm,
            page_height - 107 * mm,
            center_x + 55 * mm,
            page_height - 107 * mm
        )

        pdf.setFillColor(dark_text)
        pdf.setFont("Helvetica", 11)

        pdf.drawCentredString(
            center_x,
            page_height - 118 * mm,
            "has successfully participated in the event"
        )

        # Event title in participation statement.
        draw_centered_fitted_text(
            pdf,
            event_title,
            center_x,
            page_height - 130 * mm,
            "Helvetica-Bold",
            16,
            content_width,
            navy
        )

        event_date = (
            start_at.strftime("%d %B %Y")
            if start_at
            else "Not specified"
        )

        pdf.setFillColor(grey)
        pdf.setFont("Helvetica", 10)

        pdf.drawCentredString(
            center_x,
            page_height - 141 * mm,
            f"Venue: {venue or 'Not specified'}"
        )

        pdf.drawCentredString(
            center_x,
            page_height - 148 * mm,
            f"Event Date: {event_date}"
        )

        # =================================================
        # SIGNATURE AREAS
        # =================================================

        signature_y = 25 * mm

        pdf.setStrokeColor(grey)
        pdf.setLineWidth(0.7)

        signature_positions = [
            center_x - 45 * mm,
            center_x + 5 * mm
        ]

        for position in signature_positions:
            pdf.line(
                position - 18 * mm,
                signature_y + 5 * mm,
                position + 18 * mm,
                signature_y + 5 * mm
            )

        pdf.setFillColor(dark_text)
        pdf.setFont("Helvetica-Bold", 8)

        pdf.drawCentredString(
            signature_positions[0],
            signature_y,
            "Authorized Signatory"
        )

        pdf.drawCentredString(
            signature_positions[1],
            signature_y,
            "Event Coordinator"
        )

        # =================================================
        # CERTIFICATE DETAILS
        # =================================================

        pdf.setFillColor(dark_text)
        pdf.setFont("Helvetica", 8)

        pdf.drawString(
            55 * mm,
            17 * mm,
            f"Certificate No: {certificate_number}"
        )

        pdf.drawString(
            55 * mm,
            12 * mm,
            f"Issued On: {issued_at.strftime('%d %B %Y')}"
        )

        # =================================================
        # QR CODE FOR PUBLIC VERIFICATION
        # =================================================

        verification_url = (
            "http://127.0.0.1:3000/frontend/verify-certificate.html"
            f"?certificate={certificate_number}"
        )

        qr_code = QrCodeWidget(verification_url)

        qr_bounds = qr_code.getBounds()

        qr_width = qr_bounds[2] - qr_bounds[0]
        qr_height = qr_bounds[3] - qr_bounds[1]

        qr_size = 23 * mm

        drawing = Drawing(
            qr_size,
            qr_size,
            transform=[
                qr_size / qr_width,
                0,
                0,
                qr_size / qr_height,
                0,
                0
            ]
        )

        drawing.add(qr_code)

        renderPDF.draw(
            drawing,
            pdf,
            page_width - 42 * mm,
            18 * mm
        )

        pdf.setFillColor(navy)
        pdf.setFont("Helvetica-Bold", 6.5)

        pdf.drawCentredString(
            page_width - 30.5 * mm,
            15 * mm,
            "SCAN TO VERIFY"
        )

        # Finish PDF.
        pdf.showPage()
        pdf.save()

        buffer.seek(0)

        filename = f"{certificate_number}.pdf"

        return send_file(
            buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )

    except psycopg2.Error as e:
        print("Certificate Download Database Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to generate certificate."
        }), 500

    except Exception as e:
        print("Certificate PDF Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to generate certificate PDF."
        }), 500

    finally:
        conn.close()


# =====================================================
# ADMIN: REVOKE CERTIFICATE
# =====================================================

@certificates_bp.route(
    "/<int:certificate_id>/revoke",
    methods=["PATCH"]
)
@role_required("Admin")
def revoke_certificate(certificate_id):

    conn = get_connection()

    if conn is None:
        return jsonify({
            "success": False,
            "message": "Database connection failed."
        }), 500

    try:
        cursor = conn.cursor()

        data = request.get_json(silent=True) or {}

        reason = data.get("reason")

        if not isinstance(reason, str) or not reason.strip():
            return jsonify({
                "success": False,
                "message": "Revocation reason is required."
            }), 400

        reason = reason.strip()

        cursor.execute("""
            SELECT
                certificate_id,
                certificate_status
            FROM public.certificates
            WHERE certificate_id = %s
            FOR UPDATE
        """, (certificate_id,))

        certificate = cursor.fetchone()

        if not certificate:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Certificate not found."
            }), 404

        if certificate[1] == "Revoked":
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Certificate is already revoked."
            }), 400

        cursor.execute("""
            UPDATE public.certificates
            SET
                certificate_status = 'Revoked',
                revoked_at = NOW(),
                revocation_reason = %s
            WHERE certificate_id = %s
            RETURNING
                certificate_id,
                certificate_status,
                revoked_at,
                revocation_reason
        """, (reason, certificate_id))

        updated_certificate = cursor.fetchone()

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Certificate revoked successfully.",
            "certificate": {
                "certificate_id": updated_certificate[0],
                "certificate_status": updated_certificate[1],
                "revoked_at": (
                    updated_certificate[2].isoformat()
                    if updated_certificate[2] else None
                ),
                "revocation_reason": updated_certificate[3]
            }
        }), 200

    except psycopg2.Error as e:
        conn.rollback()
        print("Certificate Revocation Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to revoke certificate."
        }), 500

    finally:
        conn.close()
