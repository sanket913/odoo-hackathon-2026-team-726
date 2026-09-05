from typing import Any


def ok(data: Any = None):
    return {"success": True, "data": data}


def paginated(items: list, page: int, limit: int, total: int):
    total_pages = (total + limit - 1) // limit if limit else 1
    return {
        "success": True,
        "data": items,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": max(total_pages, 1)},
    }
