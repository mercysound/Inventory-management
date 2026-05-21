from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from moviepy.video.VideoClip import ImageClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip, concatenate_videoclips

base = Path('D:/Inventory-management/marketing-assets')
imgs = [base / 'admin-dashboard-full.png', base / 'stock-health-card.png', base / 'top-selling-card.png']
labels = ['Live KPI Dashboard', 'Stock Health Insights', 'Top Selling Product']


def make_text_clip(text, width, height=120):
    font = None
    try:
        font = ImageFont.truetype('arial.ttf', 38)
    except Exception:
        font = ImageFont.load_default()
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = max((width - text_width) // 2, 0)
    y = max((height - text_height) // 2, 0)
    draw.rectangle([(0, 0), (width, height)], fill=(0, 0, 0, 128))
    draw.text((x, y), text, font=font, fill='white')
    return ImageClip(np.array(image)).with_duration(3).with_position(('center', 'bottom'))

clips = []
for img, label in zip(imgs, labels):
    if not img.exists():
        raise FileNotFoundError(f'Missing screenshot: {img}')
    clip = ImageClip(str(img)).with_duration(3)
    clip = clip.resized(width=1280)
    text_clip = make_text_clip(label, clip.w)
    video = CompositeVideoClip([clip, text_clip])
    clips.append(video)

final = concatenate_videoclips(clips, method='compose')
output = base / 'melech-sh-promo.mp4'
final.write_videofile(str(output), fps=24, codec='libx264', audio=False, preset='medium')
print('created', output)
