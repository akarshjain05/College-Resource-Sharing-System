import re

with open("backend/app/routers/complaints.py", "r") as f:
    code = f.read()

new_logic = """
    # If structured resolution payload provided, build JSON resolution_data
    dump = payload.model_dump(exclude_unset=True)
    if "resolution_action" in dump:
        if payload.resolution_action:
            res_obj = {
                "action_taken": payload.resolution_action,
                "amount": payload.resolution_amount or 0.0,
                "notes": payload.resolution_notes or payload.admin_response or "",
                "resolved_at": datetime.utcnow().isoformat(),
            }
            complaint.resolution_data = json.dumps(res_obj)
            complaint.status = ComplaintStatus.RESOLVED
        else:
            complaint.resolution_data = None
"""

code = re.sub(
    r"    # If structured resolution payload provided, build JSON resolution_data\s+if payload\.resolution_action:\s+res_obj = {[\s\S]+?complaint\.status = ComplaintStatus\.RESOLVED",
    new_logic.strip(),
    code
)

with open("backend/app/routers/complaints.py", "w") as f:
    f.write(code)
print("Patched complaints.py again")
