import pytest
from tests.conftest import auth_headers

def test_update_user_role_requires_permission(client, db_session, test_user, second_user):
    """Test that a non-admin cannot update a user's role."""
    headers = auth_headers(client, test_user.email, "Password123!")
    resp = client.patch(
        f"/api/v1/admin/management/users/{second_user.id}/role",
        headers=headers,
        json={"role": "admin", "can_manage_users": True, "can_moderate_complaints": True, "can_resolve_damage_claims": True}
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Admin privileges required"

def test_update_user_role_success(client, db_session, admin_user, second_user):
    """Test that an admin with correct permissions can update a user's role."""
    # First ensure admin has can_manage_users permission
    admin_user.can_manage_users = True
    db_session.commit()
    
    headers = auth_headers(client, admin_user.email, "AdminPass123!")
    resp = client.patch(
        f"/api/v1/admin/management/users/{second_user.id}/role",
        headers=headers,
        json={"role": "admin", "can_manage_users": False, "can_moderate_complaints": True, "can_resolve_damage_claims": True}
    )
    assert resp.status_code == 200
    
    db_session.refresh(second_user)
    assert second_user.role.value == "admin"
    assert second_user.can_manage_users is False
    assert second_user.can_moderate_complaints is True
