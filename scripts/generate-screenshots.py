#!/usr/bin/env python3
"""
Generate professional UI screenshot artifacts for DomusFlow documentation
Tailored to modern light pastel aesthetic
"""

import os
from PIL import Image, ImageDraw, ImageFont

docs_dir = os.path.join(os.path.dirname(__file__), "../docs/screenshots")
os.makedirs(docs_dir, exist_ok=True)

try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    font_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
    font_reg = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    font_sm = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
except Exception:
    font_title = font_bold = font_reg = font_sm = ImageFont.load_default()

def draw_window_header(draw, width, title="DomusFlow"):
    # Window chrome - light pastel clean bar
    draw.rounded_rectangle([0, 0, width, 40], radius=10, fill=(255, 255, 255, 255))
    draw.line([(0, 40), (width, 40)], fill=(226, 232, 240, 255), width=1)
    draw.ellipse([14, 14, 26, 26], fill=(239, 68, 68, 255)) # Red
    draw.ellipse([34, 14, 46, 26], fill=(245, 158, 11, 255)) # Yellow
    draw.ellipse([54, 14, 66, 26], fill=(16, 185, 129, 255)) # Green
    draw.text((78, 12), f"domusflow.app — {title}", font=font_sm, fill=(100, 116, 139, 255))

# 1. Landlord Dashboard
def create_dashboard_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (248, 250, 252, 255)) # Light slate-50
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Executive Overview")

    # Header Bar
    draw.text((24, 60), "Executive Overview & Maintenance Pulse", font=font_title, fill=(15, 23, 42))
    draw.text((24, 90), "Real-time monitoring across all rental portfolios", font=font_sm, fill=(100, 116, 139))

    # Metric Cards (Crisp White + Pastel Tint Accents)
    metrics = [
        ("MANAGED PROPERTIES", "3", (79, 70, 229), (238, 242, 255)),
        ("ACTIVE TENANTS", "4", (13, 148, 136), (240, 253, 250)),
        ("OPEN TICKETS", "4", (217, 119, 6), (254, 243, 199)),
        ("CRITICAL ISSUES", "1", (225, 29, 72), (255, 241, 242)),
    ]
    x = 24
    for label, val, text_col, bg_col in metrics:
        draw.rounded_rectangle([x, 120, x + 175, 195], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
        draw.rounded_rectangle([x + 120, 130, x + 160, 165], radius=8, fill=bg_col)
        draw.text((x + 14, 134), label, font=font_sm, fill=(100, 116, 139))
        draw.text((x + 14, 154), val, font=font_title, fill=text_col)
        x += 190

    # Critical Alert Banner (Soft Pastel Rose)
    draw.rounded_rectangle([24, 215, 776, 265], radius=12, fill=(255, 241, 242), outline=(254, 205, 211), width=1)
    draw.text((40, 228), "🚨 1 CRITICAL TICKET REQUIRES ATTENTION: Unit 4B — Water pipe burst in lower cabinet", font=font_bold, fill=(159, 18, 57))

    # Activity Table / Kanban Preview
    draw.rounded_rectangle([24, 285, 776, 495], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    draw.text((40, 305), "Recent Maintenance Requests", font=font_bold, fill=(15, 23, 42))
    
    rows = [
        ("Water pipe leaking under kitchen sink", "742 Evergreen Terrace (Unit 4B)", "CRITICAL", (255, 241, 242), (190, 18, 60), "SCHEDULED", "Tomorrow 10:00 AM"),
        ("HVAC making buzzing sound in master bedroom", "1042 Elm Street (Unit 101)", "MEDIUM", (254, 243, 199), (180, 83, 9), "REPORTED", "Unscheduled"),
        ("Deadbolt lock sticks upon entry", "742 Evergreen Terrace (Unit 1A)", "LOW", (240, 249, 255), (3, 105, 161), "IN PROGRESS", "Today 4:00 PM"),
        ("Garbage disposal replacement completed", "1042 Elm Street (Unit 2B)", "HIGH", (254, 243, 199), (180, 83, 9), "RESOLVED", "Completed"),
    ]
    y = 345
    for title, addr, urg, urg_bg, urg_fg, status, eta in rows:
        draw.line([(40, y - 8), (760, y - 8)], fill=(241, 245, 249), width=1)
        draw.text((40, y), title[:36], font=font_sm, fill=(15, 23, 42))
        draw.text((320, y), addr[:28], font=font_sm, fill=(100, 116, 139))
        
        # Pastel Urgency pill
        draw.rounded_rectangle([535, y - 2, 605, y + 16], radius=6, fill=urg_bg, outline=urg_fg, width=1)
        draw.text((542, y), urg, font=font_sm, fill=urg_fg)

        draw.text((625, y), eta, font=font_sm, fill=(100, 116, 139))
        y += 36

    img.save(os.path.join(docs_dir, "dashboard-landlord.png"))

# 2. Kanban Board
def create_kanban_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (248, 250, 252, 255))
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Work Orders & Kanban Pipeline")

    draw.text((24, 60), "Maintenance Ticket Pipeline", font=font_title, fill=(15, 23, 42))
    draw.text((24, 90), "4-column workflow with instant status progression and assignments", font=font_sm, fill=(100, 116, 139))

    cols = [
        ("📬 REPORTED (1)", 24, (67, 56, 202)),
        ("📅 SCHEDULED (1)", 214, (3, 105, 161)),
        ("🔧 IN PROGRESS (1)", 404, (180, 83, 9)),
        ("✅ RESOLVED (1)", 594, (6, 95, 70)),
    ]

    card_data = [
        (24, "HVAC buzzing sound", "Unit 101 • Elm St", "MEDIUM", "Unscheduled", "📷 1", (254, 243, 199), (180, 83, 9)),
        (214, "Water pipe leaking", "Unit 4B • Evergreen", "CRITICAL", "ETA: Tomorrow", "📷 2", (255, 241, 242), (190, 18, 60)),
        (404, "Deadbolt lock stuck", "Unit 1A • Evergreen", "LOW", "ETA: Today 4PM", "📷 1", (240, 249, 255), (3, 105, 161)),
        (594, "Garbage disposal unit", "Unit 2B • Elm St", "HIGH", "Completed", "📷 3", (254, 243, 199), (180, 83, 9)),
    ]

    for title, col_x, color in cols:
        draw.rounded_rectangle([col_x, 120, col_x + 180, 490], radius=14, fill=(241, 245, 249, 180), outline=(226, 232, 240), width=1)
        draw.text((col_x + 14, 134), title, font=font_bold, fill=color)

    for col_x, title, unit, urg, eta, photo, urg_bg, urg_fg in card_data:
        draw.rounded_rectangle([col_x + 10, 170, col_x + 170, 320], radius=12, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
        
        # Urgency tag & Photo pill
        draw.rounded_rectangle([col_x + 18, 180, col_x + 80, 196], radius=5, fill=urg_bg, outline=urg_fg, width=1)
        draw.text((col_x + 24, 182), urg, font=font_sm, fill=urg_fg)
        draw.text((col_x + 120, 182), photo, font=font_sm, fill=(100, 116, 139))
        
        draw.text((col_x + 18, 206), title[:19], font=font_bold, fill=(15, 23, 42))
        draw.text((col_x + 18, 228), unit, font=font_sm, fill=(100, 116, 139))
        draw.text((col_x + 18, 254), eta, font=font_sm, fill=(79, 70, 229))
        
        # Advance button
        draw.rounded_rectangle([col_x + 18, 280, col_x + 162, 305], radius=8, fill=(238, 242, 255), outline=(199, 210, 254), width=1)
        draw.text((col_x + 36, 286), "Advance Status →", font=font_sm, fill=(67, 56, 202))

    img.save(os.path.join(docs_dir, "kanban-board.png"))

# 3. Dual-Channel Chat
def create_chat_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (248, 250, 252, 255))
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Direct Communications — Contractor Channel")

    draw.text((24, 60), "💬 Landlord ↔ Contractor Channel", font=font_title, fill=(15, 23, 42))
    draw.text((24, 90), "Participant: Apex Plumbing & HVAC (contractor@apexrepairs.com)", font=font_sm, fill=(100, 116, 139))

    # Chat Container
    draw.rounded_rectangle([24, 120, 776, 490], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)

    # Incoming bubble from Contractor (Soft Slate / White)
    draw.rounded_rectangle([44, 140, 460, 190], radius=14, fill=(241, 245, 249), outline=(226, 232, 240), width=1)
    draw.text((56, 150), "Apex Plumbing: I've reviewed the leak photos. On my way now.", font=font_reg, fill=(15, 23, 42))
    draw.text((56, 170), "ETA is approximately 20 minutes.", font=font_sm, fill=(100, 116, 139))

    # Outgoing bubble from Landlord with Ticket Card (Indigo)
    draw.rounded_rectangle([320, 210, 756, 365], radius=14, fill=(79, 70, 229))
    draw.text((336, 222), "You: Thanks for prioritizing this. Here is the ticket reference:", font=font_reg, fill=(255, 255, 255))

    # Nested Ticket Card
    draw.rounded_rectangle([336, 248, 740, 350], radius=10, fill=(67, 56, 202), outline=(165, 180, 252), width=1)
    draw.text((350, 258), "🎫 LINKED TICKET #ticket-12 • CRITICAL", font=font_sm, fill=(254, 205, 211))
    draw.text((350, 278), "Water pipe leaking under kitchen sink", font=font_bold, fill=(255, 255, 255))
    draw.text((350, 300), "Unit 4B • Cost Acknowledged • Click to view details", font=font_sm, fill=(224, 231, 255))
    draw.text((350, 322), "Status: SCHEDULED • ETA: Tomorrow 10:00 AM", font=font_sm, fill=(186, 230, 253))

    # Canned quick replies (Pastel Pills)
    canned = ["⚡ On my way, ETA 20 mins", "📦 Parts ordered", "🛠️ Work completed", "🔑 Access code sent"]
    cx = 44
    for c in canned:
        cw = len(c) * 8 + 20
        draw.rounded_rectangle([cx, 400, cx + cw, 426], radius=12, fill=(248, 250, 252), outline=(199, 210, 254), width=1)
        draw.text((cx + 10, 407), c, font=font_sm, fill=(67, 56, 202))
        cx += cw + 10

    # Input Box
    draw.rounded_rectangle([44, 438, 756, 476], radius=10, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
    draw.text((58, 450), "Type a message or select a quick reply...", font=font_sm, fill=(148, 163, 184))
    draw.rounded_rectangle([680, 444, 748, 470], radius=8, fill=(79, 70, 229))
    draw.text((698, 450), "Send ➤", font=font_sm, fill=(255, 255, 255))

    img.save(os.path.join(docs_dir, "chat-contractor.png"))

# 4. Mobile iOS View
def create_mobile_screenshot():
    w, h = 360, 640
    img = Image.new("RGBA", (w, h), (248, 250, 252, 255))
    draw = ImageDraw.Draw(img)

    # Dynamic island
    draw.rounded_rectangle([130, 10, 230, 30], radius=10, fill=(15, 23, 42))

    # Header
    draw.text((20, 48), "DomusFlow", font=font_title, fill=(15, 23, 42))
    draw.rounded_rectangle([250, 48, 340, 74], radius=10, fill=(238, 242, 255), outline=(199, 210, 254), width=1)
    draw.text((264, 55), "Demo Mode", font=font_sm, fill=(67, 56, 202))

    # Mobile Cards
    draw.text((20, 95), "Active Repairs (3)", font=font_bold, fill=(15, 23, 42))

    cards = [
        ("Water pipe leaking", "Unit 4B • Evergreen", "CRITICAL", (255, 241, 242), (190, 18, 60), "SCHEDULED"),
        ("HVAC buzzing sound", "Unit 101 • Elm St", "MEDIUM", (254, 243, 199), (180, 83, 9), "REPORTED"),
        ("Deadbolt lock stuck", "Unit 1A • Evergreen", "LOW", (240, 249, 255), (3, 105, 161), "IN PROGRESS"),
    ]

    y = 125
    for title, unit, urg, bg_col, fg_col, status in cards:
        draw.rounded_rectangle([20, y, 340, y + 105], radius=14, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
        draw.rounded_rectangle([32, y + 12, 100, y + 30], radius=6, fill=bg_col, outline=fg_col, width=1)
        draw.text((38, y + 15), urg, font=font_sm, fill=fg_col)
        draw.text((115, y + 15), status, font=font_sm, fill=(100, 116, 139))

        draw.text((32, y + 42), title, font=font_bold, fill=(15, 23, 42))
        draw.text((32, y + 66), unit, font=font_sm, fill=(100, 116, 139))
        draw.text((260, y + 66), "Details →", font=font_sm, fill=(79, 70, 229))
        y += 120

    # Mobile Bottom Navigation (Crisp White + Pastel Icons)
    draw.rounded_rectangle([0, 570, 360, 640], radius=16, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    navs = [("📊", "Overview", 30), ("🎫", "Tickets", 115), ("💬", "Messages", 200), ("⚙️", "Settings", 290)]
    for icon, lbl, nx in navs:
        draw.text((nx + 6, 580), icon, font=font_reg, fill=(15, 23, 42))
        draw.text((nx, 606), lbl, font=font_sm, fill=(100, 116, 139))

    img.save(os.path.join(docs_dir, "mobile-ios.png"))

create_dashboard_screenshot()
create_kanban_screenshot()
create_chat_screenshot()
create_mobile_screenshot()

print("Successfully regenerated all light pastel documentation screenshot previews.")
