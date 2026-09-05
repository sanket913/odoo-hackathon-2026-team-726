"""
Payslip PDF generation using ReportLab (pure-Python, no system dependencies).
Includes an optional QR code (payslip id / employee / net amount / hash) as
a lightweight enhancement - never blocks core PDF generation if it fails.
"""
import io
import hashlib
import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


# Payslip QR Verification
def verification_payload(payslip):
    import hmac
    from decimal import Decimal
    from app.core.config import settings
    amount = Decimal(payslip.net_amount).quantize(Decimal("0.01"))
    payload = f"PAYSLIP:{payslip.id}|EMP:{payslip.employee_id}|NET:{amount}|DATE:{payslip.period_start}/{payslip.period_end}"
    digest = hmac.new(settings.JWT_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + "|HASH:" + digest


def _draw_verification(canvas, doc, payslip):
    import os
    import tempfile
    import logging
    import qrcode
    path = None
    canvas.saveState()
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            path = tmp.name
        qrcode.make(verification_payload(payslip)).save(path)
        canvas.drawImage(path, A4[0] - 51*mm, 12*mm, width=33*mm, height=33*mm)
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(A4[0] - 34.5*mm, 9*mm, "Scan to Verify")
    except Exception:
        logging.getLogger(__name__).error("Payslip QR generation failed")
    finally:
        canvas.restoreState()
        if path and os.path.exists(path):
            os.unlink(path)


def generate_payslip_pdf(payslip) -> bytes:
    employee = payslip.employee
    contract = payslip.contract

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=18 * mm, bottomMargin=50 * mm,
                             leftMargin=18 * mm, rightMargin=18 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("PP360Title", parent=styles["Title"], textColor=colors.HexColor("#1E3A8A"))
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    elements = []
    elements.append(Paragraph("PeoplePay360", title_style))
    elements.append(Paragraph("Integrated HR &amp; Payroll Operations Platform", styles["Normal"]))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Payslip - {payslip.period_start} to {payslip.period_end}", styles["Heading2"]))
    elements.append(Spacer(1, 6))

    info_data = [
        ["Employee", employee.name if employee else "-", "Employee Code", employee.employee_code if employee else "-"],
        ["Department", employee.department.name if employee and employee.department else "-",
         "Job Position", employee.job_position.name if employee and employee.job_position else "-"],
        ["Contract Reference", contract.reference if contract else "-",
         "Worked Days", str(payslip.worked_days)],
        ["Status", payslip.status.value if hasattr(payslip.status, "value") else payslip.status,
         "Bank Account", employee.bank_account if employee and employee.bank_account else "Not on file"],
    ]
    info_table = Table(info_data, colWidths=[38 * mm, 52 * mm, 38 * mm, 52 * mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D0D0")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    line_data = [["Seq", "Rule", "Code", "Category", "Amount (INR)"]]
    for line in sorted(payslip.lines, key=lambda l: l.sequence):
        line_data.append([str(line.sequence), line.name, line.code, line.category, f"{line.amount:,.2f}"])

    line_table = Table(line_data, colWidths=[15 * mm, 55 * mm, 25 * mm, 35 * mm, 38 * mm])
    line_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D0D0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F7FA")]),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 10))

    totals_data = [
        ["Basic", f"INR {payslip.basic_amount:,.2f}"],
        ["Gross", f"INR {payslip.gross_amount:,.2f}"],
        ["Net Pay", f"INR {payslip.net_amount:,.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[130 * mm, 38 * mm])
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.black),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph(
        f"Generated on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | "
        f"Payslip reference PP360-{payslip.id:06d} | This is a system-generated document.",
        small,
    ))

    doc.build(elements, onFirstPage=lambda c, d: _draw_verification(c, d, payslip),
              onLaterPages=lambda c, d: _draw_verification(c, d, payslip))
    return buffer.getvalue()
