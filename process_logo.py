from PIL import Image
import os

def add_black_background(input_path, output_path):
    try:
        # Open the original image
        img = Image.open(input_path).convert("RGBA")
        
        # Create a new black image with the same size
        background = Image.new("RGBA", img.size, (0, 0, 0, 255))
        
        # Paste the original image on top of the black background
        # Use the original image as a mask for transparency if needed, 
        # but since we want a black box behind it, we just paste it.
        # If the logo has transparency, the black will show through.
        background.paste(img, (0, 0), img)
        
        # Save the result
        background.save(output_path)
        print(f"Successfully created {output_path}")
        
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    input_file = "static/logo.png"
    output_file = "static/icon-bg-black.png"
    
    if os.path.exists(input_file):
        add_black_background(input_file, output_file)
    else:
        print(f"Input file not found: {input_file}")
