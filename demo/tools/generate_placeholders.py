"""Neutral schematic JPEG placeholders, deliberately not photographic. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
root = Path(__file__).resolve().parents[1] / 'assets'
for state in ['full', 'leftover']:
    image = Image.new('RGB', (1600,1000), '#24282a')
    draw = ImageDraw.Draw(image)
    for y in range(1000):
        shade = int(32 + 13 * (1-y/1000))
        draw.line((0,y,1600,y), fill=(shade,shade+3,shade+4))
    shadow=Image.new('RGBA',image.size)
    ImageDraw.Draw(shadow).ellipse((405,142,1225,922),fill=(0,0,0,160))
    shadow=shadow.filter(ImageFilter.GaussianBlur(30))
    image=image.convert('RGBA');image.alpha_composite(shadow);draw=ImageDraw.Draw(image)
    draw.ellipse((400,100,1200,900),fill='#ddddda',outline='#eeeeeb',width=8)
    draw.ellipse((475,175,1125,825),fill='#cdceca',outline='#bebfbb',width=3)
    if state=='full':
        draw.ellipse((580,325,1080,710),fill='#9e7860')
        for y in [280,370,460,550]:
            draw.rounded_rectangle((510,y,730,y+104),radius=48,fill='#ece0bd',outline='#c5b58e',width=3)
    else:
        draw.ellipse((760,475,965,660),fill='#9e7860')
        for y in [360,465]:
            draw.rounded_rectangle((550,y,745,y+100),radius=45,fill='#ece0bd',outline='#c5b58e',width=3)
    image.convert('RGB').save(root/f'plate-{state}.jpg',quality=93)
