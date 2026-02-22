"""
Perlin Noise — Port Python du Perlin.ts côté client.

Utilisé par GameState pour déterminer quelles cases sont de l'eau
et ainsi éviter de placer des ressources sur des tuiles inondées.

La table de permutation doit être initialisée avec le MÊME algorithme
(Fisher-Yates shuffle) et le MÊME seed que le client, pour que les
zones d'eau correspondent exactement.

Session 9.4 : Première implémentation.
"""

import math
import random
from typing import List


class Perlin:
    """Bruit de Perlin 2D — Identique à l'implémentation TypeScript client."""

    def __init__(self, seed: int):
        """
        Initialise la table de permutation avec un seed dÃ©terministe.
        Utilise un LCG simple pour garantir exactement la mÃªme sÃ©quence
        que l'algorithme TypeScript sur le client.
        """
        state = seed
        p: List[int] = list(range(256))

        for i in range(255, 0, -1):
            state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
            rand_val = state / 0x100000000
            j = int(math.floor(rand_val * (i + 1)))

            p[i], p[j] = p[j], p[i]

        self.perm: List[int] = [p[i & 255] for i in range(512)]

    def noise(self, x: float, y: float) -> float:
        """Calcule le bruit de Perlin 2D pour les coordonnées (x, y)."""
        X = int(math.floor(x)) & 255
        Y = int(math.floor(y)) & 255

        x -= math.floor(x)
        y -= math.floor(y)

        u = self._fade(x)
        v = self._fade(y)

        A = self.perm[X] + Y
        B = self.perm[X + 1] + Y

        return self._lerp(
            v,
            self._lerp(u, self._grad(self.perm[A], x, y), self._grad(self.perm[B], x - 1, y)),
            self._lerp(u, self._grad(self.perm[A + 1], x, y - 1), self._grad(self.perm[B + 1], x - 1, y - 1))
        )

    def _fade(self, t: float) -> float:
        return t * t * t * (t * (t * 6 - 15) + 10)

    def _lerp(self, t: float, a: float, b: float) -> float:
        return a + t * (b - a)

    def _grad(self, hash_val: int, x: float, y: float) -> float:
        h = hash_val & 15
        u = x if h < 8 else y
        if h < 4:
            v = y
        elif h == 12 or h == 14:
            v = x
        else:
            v = 0.0
        return (u if (h & 1) == 0 else -u) + (v if (h & 2) == 0 else -v)
