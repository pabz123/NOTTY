#!/usr/bin/env python3
"""
Create application icon from text using PIL
"""
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing Pillow...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', 'Pillow'])
    from PIL import Image, ImageDraw, ImageFont

import sys

def create_icon(size=512):
    """Create a modern, gradient icon with checkmark"""
    # Create image with gradient background
    img = Image.new('RGBA', (size, size), color=(255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (blue)
    for i in range(size):
        alpha = i / size
        color = (
            int(59 + (37 - 59) * alpha),       # R: 59 -> 37 (darker blue)
            int(130 + (99 - 130) * alpha),     # G: 130 -> 99
            int(246 + (235 - 246) * alpha),    # B: 246 -> 235
            255                                 # A: fully opaque
        )
        draw.rectangle([(0, i), (size, i+1)], fill=color)
    
    # Draw white circle background for checkmark
    margin = size // 6
    draw.ellipse([margin, margin, size-margin, size-margin], 
                 fill=(255, 255, 255, 255))
    
    # Draw checkmark/tick symbol
    check_width = max(size // 20, 4)
    center = size // 2
    
    # Checkmark path coordinates
    x1 = center - size // 5
    y1 = center
    x2 = center - size // 20
    y2 = center + size // 5
    x3 = center + size // 4
    y3 = center - size // 5
    
    # Draw thick checkmark with multiple lines for thickness
    for offset in range(-check_width, check_width + 1):
        # First part of check
        draw.line([(x1 + offset, y1), (x2 + offset, y2)], 
                 fill=(59, 130, 246), width=check_width)
        # Second part of check
        draw.line([(x2 + offset, y2), (x3 + offset, y3)], 
                 fill=(59, 130, 246), width=check_width)
    
    return img

def create_all_icons():
    """Create icons in multiple sizes"""
    print("Creating application icons...")
    print()
    
    sizes = {
        'icon.png': 512,
        'icon-256.png': 256,
        'icon-128.png': 128,
        'icon-64.png': 64,
        'icon-32.png': 32,
        'icon-16.png': 16
    }
    
    icons_for_ico = []
    
    for filename, size in sizes.items():
        img = create_icon(size)
        img.save(filename, 'PNG')
        print(f'✅ Created {filename} ({size}x{size})')
        
        # Collect for ICO
        if size in [16, 32, 48, 64, 128, 256]:
            icons_for_ico.append(img)
    
    # Create ICO file (Windows) with multiple sizes
    try:
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        icon_512 = create_icon(512)
        icon_512.save('icon.ico', format='ICO', sizes=icon_sizes)
        print('✅ Created icon.ico (multi-size Windows icon)')
    except Exception as e:
        print(f'⚠️  Warning: Could not create icon.ico: {e}')
        # Try alternative method
        try:
            icon_256 = create_icon(256)
            icon_256.save('icon.ico', format='ICO')
            print('✅ Created icon.ico (single size fallback)')
        except Exception as e2:
            print(f'❌ Error: Could not create icon.ico: {e2}')

if __name__ == '__main__':
    try:
        create_all_icons()
        print()
        print('=' * 50)
        print('✅ All icons created successfully!')
        print('=' * 50)
        print()
        print('You can now run: Accountability.bat')
    except Exception as e:
        print(f'❌ Error creating icons: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
