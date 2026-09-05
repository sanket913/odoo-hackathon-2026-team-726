from types import SimpleNamespace
from unittest.mock import Mock, patch
import pytest
from app.api.v1.payroll import download_payslip_pdf
from app.core.exceptions import ConflictError

@pytest.mark.parametrize("status", ["Draft", "Computed", "Validated"])
def test_unpaid_pdf_is_blocked(status):
    user = SimpleNamespace(has_permission=lambda permission: True)
    with patch("app.api.v1.payroll.payroll_service.get_payslip", return_value=SimpleNamespace(id=1, status=status)), patch("app.api.v1.payroll.generate_payslip_pdf") as generate:
        with pytest.raises(ConflictError):
            download_payslip_pdf(1, Mock(), user)
        generate.assert_not_called()

def test_paid_pdf_is_allowed():
    user = SimpleNamespace(has_permission=lambda permission: True)
    with patch("app.api.v1.payroll.payroll_service.get_payslip", return_value=SimpleNamespace(id=1, status="Paid")), patch("app.api.v1.payroll.generate_payslip_pdf", return_value=b"%PDF-paid"):
        response = download_payslip_pdf(1, Mock(), user)
        assert response.body == b"%PDF-paid"
        assert response.media_type == "application/pdf"
