"""Generate the TickerTrace Whop app icon at 512x512.

Brand:
- Background navy: #0a0f1e
- Cyan accent:    #00d4ff
- Off-white:      #f5f7fa
- Wordmark style: "TICKER" cyan + "TRACE" white. We echo that with "TT".
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SIZE = 512
BG = (10, 15, 30)           # #0a0f1e
CYAN = (0, 212, 255)        # #00d4ff
WHITE = (245, 247, 250)     # near-white
GRID = (24, 32, 56)         # subtle grid line

img = Image.new("RGB", (SIZE, SIZE), BG)
draw = ImageDraw.Draw(img, "RGBA")

# Soft cyan radial glow behind the monogram — focused upper-left like a light source.
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
for r in range(260, 80, -8):
    a = int(6 + (260 - r) * 0.22)
    glow_draw.ellipse(
        (SIZE//2 - r, SIZE//2 - r, SIZE//2 + r, SIZE//2 + r),
        fill=(0, 212, 255, a),
    )
glow = glow.filter(ImageFilter.GaussianBlur(36))
img.paste(glow, (0, 0), glow)

# Monogram "TT" — first T cyan, second T white, both heavy.
# Wordmark on the marketing site is "TICKER" cyan + "TRACE" white,
# so the cyan T reads as "Ticker" and the white T reads as "Trace".
font_path = r"C:\Windows\Fonts\arialbd.ttf"
font = ImageFont.truetype(font_path, 320)


def text_bbox(s, f):
    bbox = f.getbbox(s)
    return bbox[2] - bbox[0], bbox[3] - bbox[1], bbox[0], bbox[1]


w1, h1, ox1, oy1 = text_bbox("T", font)
w2, h2, ox2, oy2 = text_bbox("T", font)
# Looser pair-kerning so the two T's are clearly distinct letters.
gap = 10
total_w = w1 + gap + w2
start_x = (SIZE - total_w) // 2
# Vertical centering using the cap height, lifted slightly so the
# underline tick has room below.
y_anchor = (SIZE - h1) // 2 - oy1 - 30

# Drop a subtle shadow for depth.
shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow_layer)
shadow_draw.text(
    (start_x - ox1 + 5, y_anchor + 5),
    "T",
    font=font,
    fill=(0, 0, 0, 180),
)
shadow_draw.text(
    (start_x + w1 + gap - ox2 + 5, y_anchor + 5),
    "T",
    font=font,
    fill=(0, 0, 0, 180),
)
shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(10))
img.paste(shadow_layer, (0, 0), shadow_layer)

draw.text((start_x - ox1, y_anchor), "T", font=font, fill=CYAN)
draw.text((start_x + w1 + gap - ox2, y_anchor), "T", font=font, fill=WHITE)

# Sparkline below the monogram — three ascending segments in cyan, echoing
# the "track institutional flow" idea. The single decorative accent.
spark_left = start_x
spark_right = start_x + total_w
spark_y = y_anchor + h1 + 100
spark_pts = [
    (spark_left, spark_y + 26),
    (spark_left + 60, spark_y + 14),
    (spark_left + 130, spark_y + 22),
    (spark_left + 200, spark_y - 4),
    (spark_left + 270, spark_y + 6),
    (spark_right, spark_y - 22),
]
for i in range(len(spark_pts) - 1):
    draw.line(
        [spark_pts[i], spark_pts[i + 1]],
        fill=(*CYAN, 230),
        width=6,
    )
end_x, end_y = spark_pts[-1]
draw.ellipse(
    (end_x - 9, end_y - 9, end_x + 9, end_y + 9),
    fill=CYAN,
)

out_path = "whop-app/public/app-icon.png"
img.save(out_path, "PNG", optimize=True)
print(f"wrote {out_path}")
