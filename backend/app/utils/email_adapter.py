"""
Minimal SMTP email adapter. Only used when SMTP is fully configured
(app.core.config.settings.smtp_configured). Never invents delivery success.
"""
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.utils.pdf_generator import generate_payslip_pdf


def send_payslip_email(to_email: str, employee_name: str, payslip) -> bool:
    try:
        pdf_bytes = generate_payslip_pdf(payslip)
        msg = EmailMessage()
        msg["Subject"] = f"Your Payslip - {payslip.period_start} to {payslip.period_end}"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg.set_content(
            f"Hi {employee_name},\n\nPlease find attached your payslip for the period "
            f"{payslip.period_start} to {payslip.period_end}.\n\nRegards,\nPeoplePay360"
        )
        msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename="payslip.pdf")

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        return False
