import {reactive, watch} from 'vue'
import {defineStore} from 'pinia'
import {migrateLocalStorageKey} from '@/helpers/helpers'
import {readJson, writeJson} from '@/helpers/namespaced_storage'

export const fontsList = ["Roboto Mono", "Courier New", "Ubuntu Mono", "Arial", "Helvetica",
    "sans-serif", "Times", "serif",]

const defaultSettings = {
    timerUpdate: "seconds",
    timerPrecision: 2,
    timerFont: fontsList[0],
    scrambleFontSize: 28,
    timerFontSize: 64,
    showHowTo: true,
    timerStartDelayMs: 0,
    cubeOrientation: "",
    letterPairMode: false,
    smartSelection: true,
    // start practice with the timer ("timed") or just step through cases
    timedMode: true,
    // flow mode: how many pages of five cases one run drills
    flowPages: 4,
    // how algorithms are displayed: "commutator" notation or "expanded" moves
    algNotation: "commutator",
    slownessPower: 2,
    recencyDecay: 0.5,
    // buffer order for the 3-twists and corner-commutator algsets (shared)
    bufferOrder: ["UFR", "UFL", "UBR", "UBL", "DFR", "DFL"],
    // buffer order for the edge-commutator algset
    edgeBufferOrder: ["UF", "UB", "UR", "UL", "FR", "FL", "DF", "DB", "DR", "DL"],
}

const localStorageKey = "ltctTrainerSettings"
migrateLocalStorageKey("zbllTrainerSettings", localStorageKey)

export const useSettingsStore = defineStore('settings', () => {
    // merge defaults so settings saved before a new key existed still get it
    const store = reactive(
        {...defaultSettings, ...readJson(localStorageKey, {})}
    )

    // Move the two D-layer buffers to their D-face stickers, preserving the
    // user's priority order. Case IDs and the full sticker scheme stay intact.
    const oldBuffers = {RDF: 'DFR', FDL: 'DFL'}
    if (Array.isArray(store.bufferOrder) && store.bufferOrder.some(b => b in oldBuffers)) {
        store.bufferOrder = [...new Set(store.bufferOrder.map(b => oldBuffers[b] ?? b))]
        writeJson(localStorageKey, store)
    }

    const resetDefaults = () => {
        for (let key in defaultSettings) {
            store[key] = defaultSettings[key]
        }
    }

    watch(() => store, () => {
        writeJson(localStorageKey, store)
    }, {deep: true})

    return { resetDefaults, store }
});
