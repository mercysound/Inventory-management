import os
import moviepy
import glob
root = os.path.dirname(moviepy.__file__)
results = []
for path in glob.glob(os.path.join(root, '**', '*.py'), recursive=True):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        if 'concatenate_videoclips' in f.read():
            results.append(path)
print(results)
