import glob, re
for f in glob.glob('frontend/dist/assets/index-*.js'):
    with open(f, 'r') as file:
        data = file.read()
        matches = re.finditer(r'.{0,30}\.toLowerCase\(\).{0,30}', data)
        for i, m in enumerate(matches):
            if i > 20: break
            print(f"{f}: {m.group(0)}")
