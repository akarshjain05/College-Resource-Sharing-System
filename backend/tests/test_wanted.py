from tests.conftest import auth_headers

def create_resource(client, headers, category_id):
    payload = {
        "title": "Camera",
        "description": "A very nice DSLR camera.",
        "condition": "good",
        "quantity": 1,
        "category_id": category_id,
        "max_borrow_days": 7,
        "deposit_amount": 0,
    }
    return client.post("/api/v1/resources", json=payload, headers=headers).json()

def test_wanted_offer_lifecycle(client, test_user, second_user, test_category):
    requester_headers = auth_headers(client, test_user.email, "Password123!")
    offerer_headers = auth_headers(client, second_user.email, "Password123!")

    # 1. Requester creates wanted request
    req_resp = client.post("/api/v1/wanted", headers=requester_headers, json={
        "title": "Need a camera",
        "description": "For a weekend trip",
        "category_id": str(test_category.id)
    })
    assert req_resp.status_code == 201
    wanted_id = req_resp.json()["id"]

    # 2. Offerer creates resource
    resource = create_resource(client, offerer_headers, str(test_category.id))

    # 3. Offerer offers resource
    offer_resp = client.post(f"/api/v1/wanted/{wanted_id}/offer", headers=offerer_headers, json={
        "resource_id": resource["id"]
    })
    assert offer_resp.status_code == 201
    offer_id = offer_resp.json()["id"]

    # Verify resource is in public listings before offer is accepted
    res_list_1 = client.get("/api/v1/resources").json()
    assert any(r["id"] == resource["id"] for r in res_list_1["items"])

    # 4. Requester accepts offer
    accept_resp = client.post(f"/api/v1/wanted/offers/{offer_id}/accept", headers=requester_headers)
    assert accept_resp.status_code == 200

    # 5. Verify resource is removed from public listings (status changed to borrowed)
    res_list_2 = client.get("/api/v1/resources").json()
    assert not any(r["id"] == resource["id"] for r in res_list_2["items"])

    # 6. Verify BorrowRequest was auto-created
    borrow_reqs = client.get("/api/v1/borrow-requests/my-requests", headers=requester_headers).json()
    assert len(borrow_reqs) == 1
    assert borrow_reqs[0]["resource"]["id"] == resource["id"]
    assert borrow_reqs[0]["status"] == "approved"

    # 7. Verify double-accept is rejected
    # First, let's create a new offer on the same fulfilled request (should fail)
    resource2 = create_resource(client, offerer_headers, str(test_category.id))
    offer2_resp = client.post(f"/api/v1/wanted/{wanted_id}/offer", headers=offerer_headers, json={
        "resource_id": resource2["id"]
    })
    assert offer2_resp.status_code == 403

def test_accept_after_fulfilled(client, test_user, second_user, test_category, db_session):
    from app.models.user import User
    from app.core.security import hash_password
    import uuid as uuid_module

    second_offerer = User(
        id=uuid_module.uuid4(),
        email="second_offerer@svnit.ac.in",
        full_name="Second Offerer",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
    )
    db_session.add(second_offerer)
    db_session.commit()

    requester_headers = auth_headers(client, test_user.email, "Password123!")
    offerer_headers = auth_headers(client, second_user.email, "Password123!")
    second_offerer_headers = auth_headers(client, second_offerer.email, "Password123!")

    # 1. Requester creates wanted request
    req_resp = client.post("/api/v1/wanted", headers=requester_headers, json={
        "title": "Need a camera",
        "description": "For a weekend trip",
        "category_id": str(test_category.id)
    })
    wanted_id = req_resp.json()["id"]

    # 2. Two different offerers create one resource each
    resource1 = create_resource(client, offerer_headers, str(test_category.id))
    resource2 = create_resource(client, second_offerer_headers, str(test_category.id))

    # 3. Each offers their own resource (one offer per user per request is enforced elsewhere)
    offer1_resp = client.post(f"/api/v1/wanted/{wanted_id}/offer", headers=offerer_headers, json={
        "resource_id": resource1["id"]
    })
    offer2_resp = client.post(f"/api/v1/wanted/{wanted_id}/offer", headers=second_offerer_headers, json={
        "resource_id": resource2["id"]
    })
    offer1_id = offer1_resp.json()["id"]
    offer2_id = offer2_resp.json()["id"]

    # 4. Accept first
    accept1 = client.post(f"/api/v1/wanted/offers/{offer1_id}/accept", headers=requester_headers)
    assert accept1.status_code == 200

    # 5. Try to accept second -- request is already fulfilled
    accept2 = client.post(f"/api/v1/wanted/offers/{offer2_id}/accept", headers=requester_headers)
    assert accept2.status_code == 403


def test_delete_fulfilled_wanted_request(client, test_user, second_user, test_category):
    requester_headers = auth_headers(client, test_user.email, "Password123!")
    offerer_headers = auth_headers(client, second_user.email, "Password123!")

    # 1. Requester creates wanted request
    req_resp = client.post("/api/v1/wanted", headers=requester_headers, json={
        "title": "Need a laptop",
        "description": "dedo laptop",
        "category_id": str(test_category.id)
    })
    assert req_resp.status_code == 201
    wanted_id = req_resp.json()["id"]

    # 2. Offerer creates resource and offers it
    resource = create_resource(client, offerer_headers, str(test_category.id))
    offer_resp = client.post(f"/api/v1/wanted/{wanted_id}/offer", headers=offerer_headers, json={
        "resource_id": resource["id"]
    })
    assert offer_resp.status_code == 201
    offer_id = offer_resp.json()["id"]

    # 3. Requester accepts offer (creates borrow request linked to wanted_id)
    accept_resp = client.post(f"/api/v1/wanted/offers/{offer_id}/accept", headers=requester_headers)
    assert accept_resp.status_code == 200

    # 4. Requester deletes the fulfilled wanted request -> must NOT throw DB integrity error (409/500)
    del_resp = client.delete(f"/api/v1/wanted/{wanted_id}", headers=requester_headers)
    assert del_resp.status_code == 204

