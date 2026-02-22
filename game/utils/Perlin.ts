export class Perlin {
    private perm: number[] = [];

    constructor(rnd: Phaser.Math.RandomDataGenerator) {
        this.init(rnd);
    }

    public init(rnd: Phaser.Math.RandomDataGenerator): void {
        // Enforce deterministic seed to match backend WORLD_SEED (42) exactly
        let state = 42;
        const p: number[] = new Array(256).fill(0).map((_, i) => i);

        // Fisher-Yates avec LCG basique identique au serveur Python
        for (let i = 255; i > 0; i--) {
            state = (state * 1664525 + 1013904223) >>> 0;
            const randVal = state / 0x100000000;
            const j = Math.floor(randVal * (i + 1));

            const temp = p[i] as number;
            p[i] = p[j] as number;
            p[j] = temp;
        }

        // Double la table pour éviter les débordements
        this.perm = [];
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255] as number;
        }
    }

    public noise(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        // Récupération sécurisée des valeurs de permutation
        const term1 = this.perm[X];
        const term2 = this.perm[X + 1];

        // Safety fallback (ne devrait pas arriver avec les masques & 255)
        if (term1 === undefined || term2 === undefined) return 0;

        const A = term1 + Y;
        const B = term2 + Y;

        const permA = this.perm[A];
        const permB = this.perm[B];
        const permAA = this.perm[A + 1];
        const permBB = this.perm[B + 1];

        // Vérification explicite pour TypeScript
        if (permA === undefined || permB === undefined || permAA === undefined || permBB === undefined) {
            return 0;
        }

        return this.lerp(v,
            this.lerp(u, this.grad(permA, x, y), this.grad(permB, x - 1, y)),
            this.lerp(u, this.grad(permAA, x, y - 1), this.grad(permBB, x - 1, y - 1))
        );
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}
