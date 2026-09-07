#!/usr/bin/env python3
"""
Generate professional UI screenshot artifacts for DomusFlow documentation
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
    # Window chrome
    draw.rounded_rectangle([0, 0, width, 40], radius=8, fill=(15, 23, 42, 255))
    draw.ellipse([12, 14, 24, 26], fill=(239, 68, 68, 255)) # Red
    draw.ellipse([32, 14, 44, 26], fill=(245, 158, 11, 255)) # Yellow
    draw.ellipse([52, 14, 64, 26], fill=(16, 185, 129, 255)) # Green
    draw.text((76, 12), f"domusflow.app — {title}", font=font_sm, fill=(148, 163, 184, 255))

# 1. Landlord Dashboard
def create_dashboard_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Executive Dashboard")

    # Header Bar
    draw.text((24, 60), "Portfolio Overview & Maintenance Pulse", font=font_title, fill=(248, 250, 252))
    draw.text((24, 90), "Real-time metrics, emergency dispatch, and property health", font=font_sm, fill=(148, 163, 184))

    # Metric Cards
    metrics = [
        ("TOTAL PROPERTIES", "3", (99, 102, 241)),
        ("ACTIVE TICKETS", "4", (56, 189, 248)),
        ("CRITICAL ALERTS", "1", (239, 68, 68)),
        ("RESOLVED THIS MO.", "12", (16, 185, 129)),
    ]
    x = 24
    for label, val, col in metrics:
        draw.rounded_rectangle([x, 120, x + 175, 195], radius=12, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
        draw.text((x + 14, 134), label, font=font_sm, fill=(148, 163, 184))
        draw.text((x + 14, 152), val, font=font_title, fill=col)
        x += 190

    # Critical Alert Banner
    draw.rounded_rectangle([24, 215, 776, 265], radius=10, fill=(69, 10, 10, 200), outline=(220, 38, 38, 180), width=1)
    draw.text((40, 228), "⚠️ 1 CRITICAL TICKET REQUIRES ATTENTION: Unit 4B - Water pipe burst in lower cabinet", font=font_bold, fill=(254, 202, 202))

    # Activity Table / Kanban Preview
    draw.rounded_rectangle([24, 285, 776, 495], radius=12, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
    draw.text((40, 305), "Recent Maintenance Tickets", font=font_bold, fill=(226, 232, 240))
    
    rows = [
        ("Water pipe leaking under kitchen sink", "742 Evergreen Terrace (Unit 4B)", "CRITICAL", "SCHEDULED", "Tomorrow 10:00 AM"),
        ("HVAC making buzzing sound in master bedroom", "1042 Elm Street (Unit 101)", "MEDIUM", "REPORTED", "Unscheduled"),
        ("Deadbolt lock sticks upon entry", "742 Evergreen Terrace (Unit 1A)", "LOW", "IN_PROGRESS", "Today 4:00 PM"),
        ("Garbage disposal replacement completed", "1042 Elm Street (Unit 2B)", "HIGH", "RESOLVED", "Completed"),
    ]
    y = 345
    for title, addr, urg, status, eta in rows:
        draw.line([(40, y - 8), (760, y - 8)], fill=(30, 41, 59), width=1)
        draw.text((40, y), title[:36], font=font_sm, fill=(241, 245, 249))
        draw.text((320, y), addr[:28], font=font_sm, fill=(148, 163, 184))
        
        # Urgency tag
        u_col = (239, 68, 68) if urg == "CRITICAL" else (245, 158, 11) if urg == "HIGH" else (99, 102, 241)
        draw.rounded_rectangle([540, y - 2, 605, y + 16], radius=6, fill=(u_col[0], u_col[1], u_col[2], 50), outline=u_col, width=1)
        draw.text((546, y), urg, font=font_sm, fill=u_col)

        draw.text((625, y), eta, font=font_sm, fill=(148, 163, 184))
        y += 36

    img.save(os.path.join(docs_dir, "dashboard-landlord.png"))

# 2. Kanban Board
def create_kanban_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Work Orders & Kanban Board")

    draw.text((24, 60), "Maintenance Ticket Pipeline", font=font_title, fill=(248, 250, 252))
    draw.text((24, 90), "Drag, advance status, and coordinate contractor dispatch", font=font_sm, fill=(148, 163, 184))

    cols = [
        ("📬 REPORTED (1)", 24, (99, 102, 241)),
        ("📅 SCHEDULED (1)", 214, (56, 189, 248)),
        ("🔧 IN PROGRESS (1)", 404, (245, 158, 11)),
        ("✅ RESOLVED (1)", 594, (16, 185, 129)),
    ]

    card_data = [
        (24, "HVAC buzzing sound", "Unit 101 • Elm St", "MEDIUM", "Unscheduled", "📷 1"),
        (214, "Water pipe leaking", "Unit 4B • Evergreen", "CRITICAL", "ETA: Tomorrow", "📷 2"),
        (404, "Deadbolt lock stuck", "Unit 1A • Evergreen", "LOW", "ETA: Today 4PM", "📷 1"),
        (594, "Garbage disposal unit", "Unit 2B • Elm St", "HIGH", "Completed", "📷 3"),
    ]

    for title, col_x, color in cols:
        draw.rounded_rectangle([col_x, 120, col_x + 180, 490], radius=12, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
        draw.text((col_x + 14, 134), title, font=font_bold, fill=color)

    for col_x, title, unit, urg, eta, photo in card_data:
        draw.rounded_rectangle([col_x + 10, 170, col_x + 170, 310], radius=10, fill=(2, 6, 23), outline=(99, 102, 241, 100), width=1)
        draw.text((col_x + 18, 182), photo, font=font_sm, fill=(148, 163, 184))
        draw.text((col_x + 18, 202), title[:20], font=font_bold, fill=(241, 245, 249))
        draw.text((col_x + 18, 224), unit, font=font_sm, fill=(148, 163, 184))
        draw.text((col_x + 18, 252), eta, font=font_sm, fill=(56, 189, 248))
        
        # Advance button
        draw.rounded_rectangle([col_x + 18, 275, col_x + 162, 298], radius=6, fill=(99, 102, 241, 40), outline=(99, 102, 241), width=1)
        draw.text((col_x + 36, 280), "Advance Status →", font=font_sm, fill=(199, 210, 254))

    img.save(os.path.join(docs_dir, "kanban-board.png"))

# 3. Dual-Channel Chat
def create_chat_screenshot():
    w, h = 800, 520
    img = Image.new("RGBA", (w, h), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)
    draw_window_header(draw, w, "Direct Communications — Contractor Channel")

    draw.text((24, 60), "💬 Landlord ↔ Contractor Channel", font=font_title, fill=(248, 250, 252))
    draw.text((24, 90), "Participant: Apex Plumbing & HVAC (contractor@apexrepairs.com)", font=font_sm, fill=(148, 163, 184))

    # Chat Container
    draw.rounded_rectangle([24, 120, 776, 490], radius=12, fill=(15, 23, 42), outline=(30, 41, 59), width=1)

    # Incoming bubble from Contractor
    draw.rounded_rectangle([44, 140, 440, 185], radius=12, fill=(30, 41, 59))
    draw.text((56, 150), "Apex Plumbing: I've reviewed the leak photos. On my way now.", font=font_reg, fill=(241, 245, 249))
    draw.text((56, 168), "ETA is approximately 20 minutes.", font=font_sm, fill=(148, 163, 184))

    # Outgoing bubble from Landlord with Ticket Card
    draw.rounded_rectangle([340, 205, 756, 360], radius=12, fill=(79, 70, 229))
    draw.text((354, 216), "You: Thanks for prioritizing this. Here is the ticket reference:", font=font_reg, fill=(255, 255, 255))

    # Nested Ticket Card
    draw.rounded_rectangle([354, 240, 742, 345], radius=8, fill=(30, 27, 75, 220), outline=(129, 140, 248), width=1)
    draw.text((366, 250), "🎫 LINKED TICKET #ticket-12 • CRITICAL", font=font_sm, fill=(248, 113, 113))
    draw.text((366, 270), "Water pipe leaking under kitchen sink", font=font_bold, fill=(255, 255, 255))
    draw.text((366, 292), "Unit 4B • Cost Acknowledged • Click to inspect details", font=font_sm, fill=(199, 210, 254))
    draw.text((366, 314), "Status: SCHEDULED • ETA: Tomorrow 10:00 AM", font=font_sm, fill=(56, 189, 248))

    # Canned quick replies
    canned = ["⚡ On my way, ETA 20 mins", "📦 Parts ordered", "🛠️ Work completed", "🔑 Access code sent"]
    cx = 44
    for c in canned:
        cw = len(c) * 8 + 16
        draw.rounded_rectangle([cx, 400, cx + cw, 424], radius=12, fill=(2, 6, 23), outline=(99, 102, 241, 100), width=1)
        draw.text((cx + 8, 406), c, font=font_sm, fill=(226, 232, 240))
        cx += cw + 10

    # Input Box
    draw.rounded_rectangle([44, 436, 756, 474], radius=10, fill=(2, 6, 23), outline=(51, 65, 85), width=1)
    draw.text((58, 448), "Type a message or select a quick reply...", font=font_sm, fill=(100, 116, 139))
    draw.rounded_rectangle([680, 442, 748, 468], radius=8, fill=(99, 102, 241))
    draw.text((698, 448), "Send ➤", font=font_sm, fill=(255, 255, 255))

    img.save(os.path.join(docs_dir, "chat-contractor.png"))

# 4. Mobile iOS View
def create_mobile_screenshot():
    w, h = 360, 640
    img = Image.new("RGBA", (w, h), (2, 6, 23, 255))
    draw = ImageDraw.Draw(img)

    # Dynamic island
    draw.rounded_rectangle([130, 10, 230, 30], radius=10, fill=(0, 0, 0))

    # Header
    draw.text((20, 48), "DomusFlow", font=font_title, fill=(248, 250, 252))
    draw.rounded_rectangle([260, 48, 340, 72], radius=8, fill=(99, 102, 241, 40), outline=(99, 102, 241), width=1)
    draw.text((272, 54), "Demo Mode", font=font_sm, fill=(199, 210, 254))

    # Mobile Cards
    draw.text((20, 95), "Active Repairs (3)", font=font_bold, fill=(226, 232, 240))

    cards = [
        ("Water pipe leaking", "Unit 4B • Evergreen", "CRITICAL", (239, 68, 68), "SCHEDULED"),
        ("HVAC buzzing sound", "Unit 101 • Elm St", "MEDIUM", (99, 102, 241), "REPORTED"),
        ("Deadbolt lock stuck", "Unit 1A • Evergreen", "LOW", (56, 189, 248), "IN PROGRESS"),
    ]

    y = 125
    for title, unit, urg, col, status in cards:
        draw.rounded_rectangle([20, y, 340, y + 105], radius=12, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
        draw.rounded_rectangle([32, y + 12, 100, y + 30], radius=6, fill=(col[0], col[1], col[2], 40), outline=col, width=1)
        draw.text((38, y + 15), urg, font=font_sm, fill=col)
        draw.text((115, y + 15), status, font=font_sm, fill=(148, 163, 184))

        draw.text((32, y + 42), title, font=font_bold, fill=(241, 245, 249))
        draw.text((32, y + 66), unit, font=font_sm, fill=(148, 163, 184))
        draw.text((260, y + 66), "Details →", font=font_sm, fill=(99, 102, 241))
        y += 120

    # Mobile Bottom Navigation
    draw.rounded_rectangle([0, 570, 360, 640], radius=16, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
    navs = [("📊", "Overview", 30), ("🎫", "Tickets", 115), ("💬", "Messages", 200), ("⚙️", "Settings", 290)]
    for icon, lbl, nx in navs:
        draw.text((nx + 6, 580), icon, font=font_reg, fill=(255, 255, 255))
        draw.text((nx, 606), lbl, font=font_sm, fill=(148, 163, 184))

    img.save(os.path.join(docs_dir, "mobile-ios.png"))

create_dashboard_screenshot()
create_kanban_screenshot()
create_chat_screenshot()
create_mobile_screenshot()

print("Successfully generated all documentation screenshot previews.")
