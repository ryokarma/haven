export type ItemType = 'resource' | 'tool' | 'equipment' | 'consumable' | 'other' | 'seed';
export type ToolType = 'axe' | 'pickaxe' | 'knife' | 'shovel' | 'none';
export type SlotType = 'head' | 'body' | 'mainHand' | 'accessory';

export interface ItemData {
    id: string;
    name: string; // Nom affiché (FR)
    type: ItemType;
    toolType?: ToolType;
    slotType?: SlotType;
    description?: string;
    icon?: string; // Placeholder for sprite path
}

export const ITEM_REGISTRY: Record<string, ItemData> = {
    // --- EXISTANT (Maintien de la compatibilité) ---
    'Bois': {
        id: 'Bois',
        name: 'Bois',
        type: 'resource',
        description: 'Une bûche de bois brute.'
    },
    'Pierre': {
        id: 'Pierre',
        name: 'Pierre',
        type: 'resource',
        description: 'Une pierre solide.'
    },
    'Hache en pierre': {
        id: 'Hache en pierre',
        name: 'Hache en pierre',
        type: 'tool',
        toolType: 'axe',
        slotType: 'mainHand',
        description: 'Indispensable pour couper du bois.'
    },
    'Chapeau de paille': { id: 'Chapeau de paille', name: 'Chapeau de paille', type: 'equipment', slotType: 'head' },
    'Tunique': { id: 'Tunique', name: 'Tunique', type: 'equipment', slotType: 'body' },
    'Anneau': { id: 'Anneau', name: 'Anneau', type: 'equipment', slotType: 'accessory' },
    'Flasque d\'eau': { id: 'Flasque d\'eau', name: 'Flasque d\'eau', type: 'consumable' },
    'Pomme': { id: 'Pomme', name: 'Pomme', type: 'consumable' },
    'Kit de Feu de Camp': { id: 'Kit de Feu de Camp', name: 'Kit de Feu de Camp', type: 'other' },

    // --- NOUVEAUX ITEMS ---
    'cotton_plant': {
        id: 'cotton_plant',
        name: 'Fleur de Coton',
        type: 'resource',
        description: 'Du coton doux et soyeux.'
    },
    'raw_clay': {
        id: 'raw_clay',
        name: 'Argile brute',
        type: 'resource',
        description: 'Terre malléable, utile pour la poterie.'
    },
    'tool_knife': {
        id: 'tool_knife',
        name: 'Couteau en silex',
        type: 'tool',
        toolType: 'knife',
        slotType: 'mainHand',
        description: 'Tranchant, idéal pour les plantes.'
    },
    'tool_pickaxe': {
        id: 'tool_pickaxe',
        name: 'Pioche en pierre',
        type: 'tool',
        toolType: 'pickaxe',
        slotType: 'mainHand',
        description: 'Permet de briser la roche.'
    },
    'tool_shovel': {
        id: 'tool_shovel',
        name: 'Pelle rudimentaire',
        type: 'tool',
        toolType: 'shovel',
        slotType: 'mainHand',
        description: 'Pour creuser la terre.'
    },
    'gloves': {
        id: 'gloves',
        name: 'Gants de travail',
        type: 'equipment',
        slotType: 'accessory', // Slot accessoire faute de slot mains dédié
        description: 'Protège les mains.'
    },
    'furnace': {
        id: 'furnace',
        name: 'Four en pierre',
        type: 'other', // placeable handled manually for now
        description: 'Pour cuire l\'argile.'
    },
    'clay_pot': {
        id: 'clay_pot',
        name: 'Pot en argile',
        type: 'other', // misc
        description: 'Un pot pour les semis.'
    },
    'watering_can': {
        id: 'watering_can',
        name: 'Arrosoir',
        type: 'tool',
        slotType: 'mainHand',
        description: 'Pour arroser les plantes.'
    },
    'cotton_seeds': {
        id: 'cotton_seeds',
        name: 'Graines de coton',
        type: 'seed',
        slotType: 'mainHand',
        description: 'Graines de coton. À planter dans un pot.'
    }
};

/**
 * Helper pur récupérer les infos d'un item par son ID (ou Name pour legacy)
 */
export function getItemData(idOrName: string): ItemData | undefined {
    return ITEM_REGISTRY[idOrName];
}
