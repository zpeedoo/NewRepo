import re

# Read v39 html (UTF-16 LE because of PowerShell)
with open('temp_v39.html', 'r', encoding='utf-16') as f:
    v39 = f.read()

# Read current html
with open('life-planner.html', 'r', encoding='utf-8') as f:
    current = f.read()

# The first Game Area is actually "Direction Game Area"
match = re.search(r'(<div id="focus-menu">.*?)<!-- Direction Game Area -->', v39, re.DOTALL)
if match:
    v39_menu = match.group(1)
    
    # Remove Visual Search
    v39_menu = re.sub(r'<div class="card-box"[^>]+onclick="startVisualSearchGame\(\)".*?</p>\s*</div>\s*', '', v39_menu, flags=re.DOTALL)
    # Remove Pattern Copy
    v39_menu = re.sub(r'<div class="card-box"[^>]+onclick="startPatternCopyGame\(\)".*?</p>\s*</div>\s*', '', v39_menu, flags=re.DOTALL)
    # Remove Size Sorter
    v39_menu = re.sub(r'<div class="card-box"[^>]+onclick="startSizeSorterGame\(\)".*?</p>\s*</div>\s*', '', v39_menu, flags=re.DOTALL)
    
    # Let's get the Memory Matrix card.
    mm_card_match = re.search(r'(<div class="card-box"[^>]+onclick="startMemoryMatrixGame\(\)".*?</p>\s*<div[^>]+>🏆 0</div>\s*</div>)', current, re.DOTALL)
    if not mm_card_match:
        mm_card_match = re.search(r'(<div class="card-box"[^>]+onclick="startMemoryMatrixGame\(\)".*?</p>\s*</div>)', current, re.DOTALL)
    mm_card = mm_card_match.group(1) if mm_card_match else ""
    
    # Append Memory Matrix card to the end of the cleaned menu
    v39_menu += mm_card + '\n'
    
    # Now replace the broken menu in current HTML
    first_area_match = re.search(r'<!-- Direction Game Area -->', current)
    if first_area_match:
        first_area = first_area_match.group(0)
        current = re.sub(r'<div id="focus-menu">.*?<!-- Direction Game Area -->', v39_menu + "<!-- Direction Game Area -->", current, flags=re.DOTALL)
        
        with open('life-planner.html', 'w', encoding='utf-8') as f:
            f.write(current)
        print("Menu restored successfully!")
    else:
        print("Could not find first Game Area in current HTML.")
else:
    print("Could not extract menu from v39.")
