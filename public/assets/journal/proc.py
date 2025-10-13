import os

def rename_images_with_dash(directory):
  for filename in os.listdir(directory):
    name_part = filename[0:-4][0].split(' - ', 1)[0]
    src = os.path.join(directory, filename)
    dst = os.path.join(directory, f"{name_part.replace(' ', '_')}.png")
    if not os.path.exists(dst):
      os.rename(src, dst)

if __name__ == "__main__":
  image_dir = os.path.dirname(os.path.abspath(__file__))
  rename_images_with_dash(image_dir)