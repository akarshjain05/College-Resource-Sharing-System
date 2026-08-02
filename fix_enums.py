import os
import re

directory = 'backend/app/models'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Replace SAEnum(EnumName) with SAEnum(EnumName, values_callable=lambda obj: [e.value for e in obj])
            # but only if it doesn't already have values_callable
            new_content = re.sub(
                r'SAEnum\(([A-Za-z0-9_]+)\)(?!, values_callable)', 
                r'SAEnum(\1, values_callable=lambda obj: [e.value for e in obj])', 
                content
            )
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
