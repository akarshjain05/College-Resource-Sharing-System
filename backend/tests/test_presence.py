from app.services.presence_service import set_user_presence, get_user_presence, get_all_presences

def test_user_presence_service():
    user_id = "test-user-12345"
    
    # Initially offline
    assert get_user_presence(user_id) == "offline"

    # Set online
    set_user_presence(user_id, "online")
    assert get_user_presence(user_id) == "online"

    # Check all presences
    all_p = get_all_presences()
    assert all_p.get(user_id) == "online"

    # Set offline
    set_user_presence(user_id, "offline")
    assert get_user_presence(user_id) == "offline"
