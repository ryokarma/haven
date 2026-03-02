import struct

with open('public/assets/grass-1.png', 'rb') as f:
    data = f.read(24)
    w, h = struct.unpack('>LL', data[16:24])
    print(f'grass-1: {w}x{h}')

with open('public/assets/tree-1.png', 'rb') as f:
    data = f.read(24)
    w, h = struct.unpack('>LL', data[16:24])
    print(f'tree-1: {w}x{h}')
