<script setup>
import {computed, ref, watch} from "vue";
import {useFlowStore} from "@/stores/FlowStore";
import {useAlgsetStore} from "@/stores/AlgsetStore";
import {msToClock} from "@/helpers/time_formatter";

const props = defineProps({
  clockMs: {type: Number, default: 0},
  wrongFeedback: {type: Boolean, default: false},
})
defineEmits(['finish'])

const flow = useFlowStore()
const algset = useAlgsetStore()

const label = (key) => algset.caseLabel(key)
const progressPct = computed(() => Math.round(flow.progress * 100))
const clock = computed(() => msToClock(props.clockMs))
const caseList = ref(null)
watch(() => [flow.pageIndex, flow.caseIndex], () => {
  caseList.value?.querySelector('.is-current')?.scrollIntoView({block: 'nearest'})
}, {flush: 'post'})
</script>

<template>
  <div class="flow-page">
    <div class="flow-head d-flex align-items-center gap-3 flex-wrap mb-2">
      <span class="badge text-bg-secondary">
        {{ $t('flow.page_of', {page: flow.pageIndex + 1, total: flow.pageCount}) }}
      </span>
      <span class="flow-clock">{{ clock }}</span>
      <button class="btn btn-outline-danger btn-sm ms-auto"
              type="button" tabindex="-1"
              @keydown.space.prevent=""
              @click="$emit('finish')">
        {{ $t('flow.finish') }}
      </button>
    </div>

    <div class="d-flex align-items-center gap-2 mb-3">
      <div class="flow-progress" role="progressbar"
           :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100">
        <div class="flow-progress-bar" :style="{width: progressPct + '%'}"></div>
      </div>
      <span class="text-muted small text-nowrap">
        {{ flow.completedCases }} / {{ flow.totalCases }}
      </span>
    </div>

    <div class="flow-body" :class="{'has-hint': $slots.hint}">
      <div class="flow-cases" ref="caseList">
        <div
            v-for="(item, i) in flow.currentPage"
            :key="`${i}-${flow.caseStates[i] === 'wrong' ? flow.wrongFlash : 0}`"
            class="flow-case"
            :class="'is-' + flow.caseStates[i]">
          {{ label(item.key) }}
        </div>
      </div>
      <aside v-if="$slots.hint" class="flow-help">
        <slot name="hint"/>
      </aside>
    </div>

    <p class="flow-feedback mt-3 mb-0" :class="{invisible: !wrongFeedback}">
      {{ $t('flow.wrong_execution') }}
    </p>

    <p class="text-muted small flow-hint mb-0">
      {{ flow.tracked ? $t('flow.hint_cube') : $t('flow.hint_manual') }}
    </p>
  </div>
</template>

<style scoped>
.flow-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  text-align: center;
  width: min(900px, 100%);
  margin: 0 auto;
  padding-top: 0.5rem;
}
.flow-head {
  text-align: left;
}
.flow-clock {
  font-variant-numeric: tabular-nums;
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1;
}
.flow-progress {
  height: 4px;
  flex: 1 1 auto;
  background-color: rgba(128, 128, 128, 0.25);
  border-radius: 2px;
  overflow: hidden;
}
.flow-progress-bar {
  height: 100%;
  background-color: var(--bs-primary);
  transition: width 0.2s ease-in-out;
}
.flow-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
}
.flow-body.has-hint {
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: clamp(0.5rem, 2vw, 1rem);
}
.flow-help {
  position: fixed;
  top: 50%;
  right: max(var(--app-gutter, 12px), calc((100% - 1500px) / 2 + var(--app-gutter, 12px)));
  transform: translateY(-50%);
  width: min(520px, calc((100% - 2 * var(--app-gutter, 12px)) * 0.58));
  max-height: 65dvh;
  overflow-y: auto;
  padding: 0.25rem;
}
.flow-cases {
  display: flex;
  flex-direction: column;
  gap: clamp(0.4rem, 1.5vh, 1.25rem);
  min-height: 0;
  justify-content: safe center;
  overflow-y: auto;
  align-items: center;
}
.flow-case {
  flex-shrink: 0;
  font-size: clamp(1.75rem, min(10vw, 9vh), 5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.1em;
  opacity: 0.35;
  transition: opacity 0.15s ease-in-out, color 0.15s ease-in-out;
}
.flow-case.is-current {
  opacity: 1;
}
.flow-case.is-done {
  opacity: 0.85;
  color: var(--bs-success);
}
.flow-case.is-wrong {
  opacity: 1;
  color: var(--bs-danger);
  animation: flow-case-shake 0.45s ease-in-out;
}
@keyframes flow-case-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-16px); }
  30% { transform: translateX(14px); }
  45% { transform: translateX(-10px); }
  60% { transform: translateX(7px); }
  75% { transform: translateX(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .flow-case.is-wrong { animation: none; }
}
.flow-feedback {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bs-danger);
  min-height: 1.6rem;
}
.flow-hint {
  margin-top: auto;
  padding-top: 0.75rem;
}
</style>
