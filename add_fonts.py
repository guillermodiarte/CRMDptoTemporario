import os

font_links = """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700&display=swap" rel="stylesheet">
"""

directory = '.'

for filename in os.listdir(directory):
    if filename.startswith("proyecto-") and filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()
        
        if "fonts.googleapis.com" not in content:
            # Insert before css/style.css
            target = '<link rel="stylesheet" href="css/style.css">'
            if target in content:
                new_content = content.replace(target, font_links + target)
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated fonts in {filename}")
            else:
                print(f"Target CSS link not found in {filename}")
        else:
            print(f"Fonts already present in {filename}")

