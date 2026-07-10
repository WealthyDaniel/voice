import os
from PIL import Image

def resize_icon():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base_dir, 'public', 'logo.jpg')
    
    if not os.path.exists(logo_path):
        print(f"Error: logo.jpg not found at {logo_path}")
        return
        
    img = Image.open(logo_path)
    
    # Generate 192x192 PNG
    icon_192_path = os.path.join(base_dir, 'public', 'icon-192.png')
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(icon_192_path, 'PNG')
    print(f"Generated 192x192 icon at {icon_192_path}")
    
    # Generate 512x512 PNG
    icon_512_path = os.path.join(base_dir, 'public', 'icon-512.png')
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(icon_512_path, 'PNG')
    print(f"Generated 512x512 icon at {icon_512_path}")

if __name__ == '__main__':
    resize_icon()
