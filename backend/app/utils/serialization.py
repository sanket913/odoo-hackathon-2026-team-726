import datetime
from decimal import Decimal


def to_jsonable(value):
    """Recursively convert dates/datetimes/Decimals into JSON-safe primitives."""
    if value is None:
        return None
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v) for v in value]
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    if hasattr(value, "value") and not isinstance(value, (str, int, float, bool)):
        # Enum-like
        try:
            return value.value
        except Exception:
            return str(value)
    return value
