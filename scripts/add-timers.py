import re

with open('life-planner.html', 'r', encoding='utf-8') as f:
    html = f.read()

adjust_fn = """    function adjustGameTime(game, amount) {
      if(!isFocusGameActive) return;
      if (game === 'stroop') { stroopTimeLeft += amount; if(stroopTimeLeft<0) stroopTimeLeft=0; document.getElementById('stroop-time').textContent = stroopTimeLeft; }
      else if (game === 'slide') { slideTimeLeft += amount; if(slideTimeLeft<0) slideTimeLeft=0; document.getElementById('slide-time').textContent = formatGameTime(slideTimeLeft); }
      else if (game === 'sm') { smTime += amount; if(smTime<0) smTime=0; document.getElementById('sm-time').textContent = formatGameTime(smTime); }
      else if (game === 'sc') { scTime += amount; if(scTime<0) scTime=0; document.getElementById('sc-time').textContent = formatGameTime(scTime); }
      else if (game === 'ws') { wsTime += amount; if(wsTime<0) wsTime=0; document.getElementById('ws-time').textContent = formatGameTime(wsTime); }
      else if (game === 'inf') { infTime += amount; if(infTime<0) infTime=0; document.getElementById('inf-time').textContent = formatGameTime(infTime); }
      else if (game === 'dir') { dirTime += amount; if(dirTime<0) dirTime=0; document.getElementById('direction-time').textContent = dirTime; }
    }"""

if 'function adjustGameTime(' not in html:
    html = html.replace('function recordGameScore', adjust_fn + '\n    function recordGameScore')

def add_timer(code, prefix, initial_val, is_dir=False):
    global html
    style = "width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:var(--surface2); color:var(--text); border:1px solid var(--border-darker); font-weight:bold;"
    if is_dir:
        style = "width:24px; height:24px; font-size:12px; padding:0; min-height:0; line-height:1; background:rgba(255,255,255,0.2); color:white; border:none; font-weight:bold;"
    
    # regex to find the timer div
    pattern = r'<div[^>]*>الوقت:\s*<span id="' + prefix + r'-time"[^>]*>[^<]+</span></div>'
    replacement = f'<div style="font-weight: bold; color: var(--text2); display:flex; align-items:center; gap:8px; direction:ltr;">الوقت: <button class="circle-btn" onclick="adjustGameTime(\'{code}\', -10)" style="{style}">-10</button> <span id="{prefix}-time" style="color:var(--black);">{initial_val}</span> <button class="circle-btn" onclick="adjustGameTime(\'{code}\', 10)" style="{style}">+10</button></div>'
    html = re.sub(pattern, replacement, html)

add_timer('stroop', 'stroop', '60')
add_timer('sm', 'sm', '00:00')
add_timer('sc', 'sc', '00:00')
add_timer('ws', 'ws', '00:00')
add_timer('inf', 'inf', '00:00')
add_timer('dir', 'direction', '60', True)

add_timer('slide', 'slide', '02:00')

html = html.replace('let slideTime = 0;', 'let slideTimeLeft = 120;')
html = html.replace('slideTime = 0; document.getElementById(\'slide-time\').textContent = "00:00";', 'slideTimeLeft = 120; document.getElementById("slide-time").textContent = "02:00";')
html = html.replace('slideTime++;', 'slideTimeLeft--;')

slide_end = """document.getElementById('slide-time').textContent = formatGameTime(slideTimeLeft);
        if (slideTimeLeft <= 0) {
          clearInterval(slideInterval);
          isFocusGameActive = false;
          alert('انتهى الوقت للغز الانزلاق!');
          startSlideGame();
        }"""
html = html.replace("document.getElementById('slide-time').textContent = formatGameTime(slideTime);", slide_end)

with open('life-planner.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
