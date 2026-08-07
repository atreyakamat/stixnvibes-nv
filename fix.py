import re

with open('prisma/schema.prisma', 'r') as f:
    lines = f.readlines()

new_lines = []
inside_block = False

for line in lines:
    stripped = line.strip()
    
    if stripped.startswith('model ') or stripped.startswith('enum '):
        inside_block = True
    
    if stripped == '}' and inside_block:
        new_lines.append('  @@schema("public")\n')
        inside_block = False
        
    new_lines.append(line)

with open('prisma/schema.prisma', 'w') as f:
    f.writelines(new_lines)

print("Schema fixed")
