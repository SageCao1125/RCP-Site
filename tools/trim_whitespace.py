#!/usr/bin/env python3
"""Trim near-white borders from an image, in place, with a small padding.
Usage: trim_whitespace.py <image.png> [pad_px]
"""
import sys
from PIL import Image, ImageChops


def trim(path, pad=16):
    im = Image.open(path).convert("RGB")
    # Background = the image's corner color (assumed white-ish); diff against it.
    bg = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg)
    # Amplify so faint anti-aliased edges still count, then get bounding box.
    diff = ImageChops.add(diff, diff, 2.0, -12)
    bbox = diff.getbbox()
    if not bbox:
        return  # fully blank; leave as-is
    left, upper, right, lower = bbox
    left = max(0, left - pad)
    upper = max(0, upper - pad)
    right = min(im.width, right + pad)
    lower = min(im.height, lower + pad)
    im.crop((left, upper, right, lower)).save(path)


if __name__ == "__main__":
    img = sys.argv[1]
    pad = int(sys.argv[2]) if len(sys.argv) > 2 else 16
    trim(img, pad)
    print(f"  trimmed: {img}")
