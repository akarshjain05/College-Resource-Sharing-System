import re

with open("backend/app/schemas/user.py", "r") as f:
    code = f.read()

new_update_fields = """
    phone_number: Optional[SafeStr] = Field(None, max_length=20)
    profile_picture_url: Optional[str] = Field(None, max_length=500)
    push_notifications: Optional[bool] = None
    email_notifications: Optional[bool] = None
    notif_resource_listing: Optional[bool] = None
    notif_campus_needs: Optional[bool] = None
"""

code = re.sub(
    r"    phone_number: Optional\[SafeStr\] = Field\(None, max_length=20\)\n    profile_picture_url: Optional\[str\] = Field\(None, max_length=500\)\n    notif_resource_listing: Optional\[bool\] = None\n    notif_campus_needs: Optional\[bool\] = None",
    new_update_fields.strip(),
    code
)

new_response_fields = """
    avg_response_seconds: Optional[int] = None
    push_notifications: bool = True
    email_notifications: bool = True
    notif_resource_listing: bool = True
    notif_campus_needs: bool = True
"""

code = re.sub(
    r"    avg_response_seconds: Optional\[int\] = None\n    notif_resource_listing: bool = True\n    notif_campus_needs: bool = True",
    new_response_fields.strip(),
    code
)

with open("backend/app/schemas/user.py", "w") as f:
    f.write(code)
print("Patched user.py schema")
