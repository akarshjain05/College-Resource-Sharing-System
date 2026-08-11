import re

with open("backend/app/models/user.py", "r") as f:
    code = f.read()

new_fields = """
    fcm_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_resource_listing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_campus_needs: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
"""

code = re.sub(
    r"    fcm_token: Mapped\[Optional\[str\]\] = mapped_column\(String\(500\), nullable=True\)\n    notif_resource_listing: Mapped\[bool\] = mapped_column\(Boolean, default=True, nullable=False\)\n    notif_campus_needs: Mapped\[bool\] = mapped_column\(Boolean, default=True, nullable=False\)",
    new_fields.strip(),
    code
)

with open("backend/app/models/user.py", "w") as f:
    f.write(code)
print("Patched user.py model")
