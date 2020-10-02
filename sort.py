#!/usr/bin/python3

providers_filename = "emails.txt"
with open(providers_filename, 'r') as providers_file:
    lines = providers_file.readlines()

for i in range(len(lines)):
    lines[i] = lines[i].lower().strip()

lines = sorted(list(set(lines)))
content = "\n".join(lines).strip()

with open(providers_filename, "w") as providers_file:
    providers_file.write(content)