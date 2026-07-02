from tests.conftest import auth_headers


def create_resource(client, headers, category_id, **overrides):
    payload = {
        "title": "Canon DSLR Camera",
        "description": "18-55mm kit lens included, barely used.",
        "condition": "good",
        "quantity": 1,
        "category_id": category_id,
        "max_borrow_days": 7,
        "deposit_amount": 0,
    }
    payload.update(overrides)
    return client.post("/api/v1/resources", json=payload, headers=headers)


def test_create_resource(client, test_user, test_category):
    headers = auth_headers(client, test_user.email, "Password123!")
    resp = create_resource(client, headers, str(test_category.id))
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Canon DSLR Camera"
    assert body["quantity_available"] == 1
    assert body["status"] == "available"


def test_create_resource_requires_auth(client, test_category):
    resp = create_resource(client, {}, str(test_category.id))
    assert resp.status_code == 401


def test_list_resources(client, test_user, test_category):
    headers = auth_headers(client, test_user.email, "Password123!")
    create_resource(client, headers, str(test_category.id))
    create_resource(client, headers, str(test_category.id), title="Soldering Kit")

    resp = client.get("/api/v1/resources")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_search_resources_by_title(client, test_user, test_category):
    headers = auth_headers(client, test_user.email, "Password123!")
    create_resource(client, headers, str(test_category.id), title="Canon DSLR Camera")
    create_resource(client, headers, str(test_category.id), title="Scientific Calculator")

    resp = client.get("/api/v1/resources", params={"search": "calculator"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Scientific Calculator"


def test_update_resource_by_non_owner_forbidden(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    create_resp = create_resource(client, owner_headers, str(test_category.id))
    resource_id = create_resp.json()["id"]

    other_headers = auth_headers(client, second_user.email, "Password123!")
    resp = client.put(
        f"/api/v1/resources/{resource_id}",
        json={"title": "Hijacked title"},
        headers=other_headers,
    )
    assert resp.status_code == 403


def test_delete_resource_by_owner(client, test_user, test_category):
    headers = auth_headers(client, test_user.email, "Password123!")
    create_resp = create_resource(client, headers, str(test_category.id))
    resource_id = create_resp.json()["id"]

    resp = client.delete(f"/api/v1/resources/{resource_id}", headers=headers)
    assert resp.status_code == 204

    get_resp = client.get(f"/api/v1/resources/{resource_id}")
    assert get_resp.status_code == 404
