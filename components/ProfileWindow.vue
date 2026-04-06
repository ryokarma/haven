<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRuntimeConfig } from '#imports';

const props = defineProps({
    playerId: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['close']);
const config = useRuntimeConfig();

const isReadOnly = computed(() => {
    const localId = localStorage.getItem('haven_player_id');
    // Si un playerId est fourni ET qu'il est différent de soi-même
    return props.playerId !== null && props.playerId !== localId;
});

const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);

const profile = ref({
    username: '',
    created_at: '',
    job: '',
    description: ''
});

onMounted(async () => {
    try {
        const token = localStorage.getItem('haven_token');
        const targetId = props.playerId || localStorage.getItem('haven_player_id');
        const apiUrl = config.public.apiUrl || 'http://localhost:8000';
        
        const response = await $fetch(`${apiUrl}/api/profile/${targetId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        profile.value = response as any;
    } catch (err) {
        error.value = "Erreur de chargement du profil.";
    } finally {
        isLoading.value = false;
    }
});

const saveProfile = async () => {
    isSaving.value = true;
    error.value = null;
    try {
        const token = localStorage.getItem('haven_token');
        const apiUrl = config.public.apiUrl || 'http://localhost:8000';
        
        await $fetch(`${apiUrl}/api/profile`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                job: profile.value.job,
                description: profile.value.description
            }
        });
        emit('close');
    } catch (err) {
        error.value = "Erreur lors de la sauvegarde.";
    } finally {
        isSaving.value = false;
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Inconnue';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
</script>

<template>
  <div class="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50" @click.self="$emit('close')" @pointerdown.self.stop @mousedown.self.stop @touchstart.self.stop>
    <div class="relative w-[400px] rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20" @click.stop @pointerdown.stop @mousedown.stop @touchstart.stop>
        
        <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 class="text-xl font-bold text-amber-100 flex items-center gap-2">
                <span>{{ isReadOnly ? '👁️' : '📜' }}</span> {{ isReadOnly ? 'Inspection du Profil' : 'Profil Roleplay' }}
            </h2>
            <button @click="$emit('close')" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors">
                ✕
            </button>
        </div>

        <div v-if="isLoading" class="py-8 text-center text-slate-400">
            Chargement de l'histoire...
        </div>
        
        <div v-else class="flex flex-col gap-4">
            <div v-if="error" class="rounded bg-red-900/50 p-2 text-sm text-red-200 border border-red-500/50">
                {{ error }}
            </div>
            
            <div class="flex items-center justify-between px-2">
                <div>
                    <div class="text-sm text-slate-400">Identité</div>
                    <div class="text-lg font-bold text-white">{{ profile.username }}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-slate-400">Arrivée en Haven</div>
                    <div class="text-sm text-amber-200">{{ formatDate(profile.created_at) }}</div>
                </div>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-300">Profession / Métier</label>
                <input 
                    v-model="profile.job" 
                    type="text" 
                    :readonly="isReadOnly"
                    :class="['rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white outline-none', isReadOnly ? 'opacity-80 focus:ring-0 cursor-default' : 'focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50']"
                    placeholder="Ex: Forgeron, Cueilleur errant..."
                    maxlength="50"
                />
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-300">Description (Histoire, Allure)</label>
                <textarea 
                    v-model="profile.description" 
                    rows="4" 
                    :readonly="isReadOnly"
                    :class="['resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white outline-none', isReadOnly ? 'opacity-80 focus:ring-0 cursor-default' : 'focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50']"
                    placeholder="Dites-en plus sur votre personnage..."
                    maxlength="300"
                ></textarea>
            </div>

            <button 
                v-if="!isReadOnly"
                @click="saveProfile"
                :disabled="isSaving"
                class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
                {{ isSaving ? 'Gravure en cours...' : 'Graver mon profil' }}
            </button>
        </div>

    </div>
  </div>
</template>
