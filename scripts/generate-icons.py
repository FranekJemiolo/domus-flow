#!/usr/bin/env python3
"""
Generate PWA icons and OpenGraph preview images for DomusFlow
"""

import os
from PIL import Image, ImageDraw, ImageFont

public_dir = os.path.join(os.path.dirname(__file__), "../apps/frontend/public")
os.makedirs(public_dir, exist_ok=True)

def create_domusflow_icon(size: int) -> Image.Image:
    # 512 base canvas
    scale = size / 512.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded squircle with subtle border
    pad = int(16 * scale)
    corner = int(110 * scale)
    
    # Outer squircle
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=corner,
        fill=(15, 23, 42, 255), # slate-900
        outline=(99, 102, 241, 180), # indigo-500
        width=max(1, int(6 * scale))
    )

    # Inner subtle glow
    inner_pad = int(24 * scale)
    inner_corner = int(96 * scale)
    draw.rounded_rectangle(
        [inner_pad, inner_pad, size - inner_pad, size - inner_pad],
        radius=inner_corner,
        fill=(30, 27, 75, 200), # indigo-950
        outline=(129, 140, 248, 60),
        width=max(1, int(2 * scale))
    )

    # Roof chevron / House peak
    center_x = size // 2
    top_y = int(130 * scale)
    roof_left = int(120 * scale)
    roof_right = int(392 * scale)
    roof_peak_y = int(140 * scale)
    roof_base_y = int(250 * scale)

    # Roof outline
    roof_points = [
        (center_x, roof_peak_y),
        (roof_right, roof_base_y),
        (roof_right - int(45 * scale), roof_base_y),
        (center_x, roof_peak_y + int(45 * scale)),
        (roof_left + int(45 * scale), roof_base_y),
        (roof_left, roof_base_y)
    ]
    draw.polygon(roof_points, fill=(99, 102, 241, 255)) # Indigo-500

    # Modern dynamic flow / maintenance wrench lightning spark
    spark_points = [
        (center_x - int(25 * scale), int(220 * scale)),
        (center_x + int(50 * scale), int(220 * scale)),
        (center_x - int(10 * scale), int(310 * scale)),
        (center_x + int(40 * scale), int(310 * scale)),
        (center_x - int(45 * scale), int(400 * scale)),
        (center_x - int(15 * scale), int(330 * scale)),
        (center_x - int(55 * scale), int(330 * scale)),
    ]
    draw.polygon(spark_points, fill=(56, 189, 248, 255)) # Sky-400

    return img

def create_og_image() -> Image.Image:
    width, height = 1200, 630
    img = Image.new("RGBA", (width, height), (248, 250, 252, 255)) # slate-50 light
    draw = ImageDraw.Draw(img)

    # Background ambient grid & lighting
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(241, 245, 249, 180), width=1)
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(241, 245, 249, 180), width=1)

    # Central crisp white card with soft border & subtle shadow
    card_margin_x, card_margin_y = 120, 80
    draw.rounded_rectangle(
        [card_margin_x + 4, card_margin_y + 4, width - card_margin_x + 4, height - card_margin_y + 4],
        radius=32,
        fill=(226, 232, 240, 150),
    )
    draw.rounded_rectangle(
        [card_margin_x, card_margin_y, width - card_margin_x, height - card_margin_y],
        radius=32,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255),
        width=2
    )

    # Embed App Icon
    icon = create_domusflow_icon(180)
    img.paste(icon, (card_margin_x + 60, card_margin_y + 80), icon)

    # Text headers
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 62)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
        font_tag = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 19)
    except Exception:
        font_large = font_sub = font_tag = ImageFont.load_default()

    draw.text((card_margin_x + 280, card_margin_y + 85), "DomusFlow", font=font_large, fill=(15, 23, 42, 255))
    draw.text(
        (card_margin_x + 280, card_margin_y + 165),
        "Maintenance Management Platform",
        font=font_sub,
        fill=(79, 70, 229, 255)
    )
    draw.text(
        (card_margin_x + 280, card_margin_y + 205),
        "Landlords • Tenants • Contractors",
        font=font_sub,
        fill=(100, 116, 139, 255)
    )

    # Feature tags at bottom (Pastel Pills)
    tags = [
        ("Offline Demo (Dexie.js)", (238, 242, 255), (67, 56, 202), (199, 210, 254)),
        ("Kanban Workflows", (240, 249, 255), (3, 105, 161), (186, 230, 253)),
        ("Dual-Channel Chat", (254, 243, 199), (180, 83, 9), (253, 230, 138)),
        ("PWA & Mobile Ready", (236, 253, 245), (6, 95, 70), (167, 243, 208)),
    ]
    tag_x = card_margin_x + 60
    for tag, bg, fg, border in tags:
        tag_w = len(tag) * 11 + 24
        draw.rounded_rectangle(
            [tag_x, card_margin_y + 300, tag_x + tag_w, card_margin_y + 342],
            radius=12,
            fill=bg,
            outline=border,
            width=1
        )
        draw.text((tag_x + 12, card_margin_y + 312), tag, font=font_tag, fill=fg)
        tag_x += tag_w + 14

    return img

# Generate icons
create_domusflow_icon(512).save(os.path.join(public_dir, "pwa-512x512.png"))
create_domusflow_icon(192).save(os.path.join(public_dir, "pwa-192x192.png"))
create_domusflow_icon(180).save(os.path.join(public_dir, "apple-touch-icon.png"))
create_domusflow_icon(64).save(os.path.join(public_dir, "favicon.ico"))
create_og_image().save(os.path.join(public_dir, "og-image.png"))

print("Successfully generated all PWA icons & OG preview image.")
