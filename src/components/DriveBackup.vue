<script setup lang="ts">
import {ref, nextTick, onBeforeUnmount} from 'vue'
// @ts-expect-error vue-i18n 9's exports omit its declaration entry under bundler resolution.
import {useI18n} from 'vue-i18n'
import {useAuthStore} from '@/stores/AuthStore'
import {captureBackup, parseBackup, restoreBackup, RECOVERY_KEY, type Backup} from '@/helpers/backup'
import {GoogleDrive, loadGoogleIdentity, type DriveFile} from '@/helpers/google_drive'

const {t, locale} = useI18n()
const auth = useAuthStore()
const configured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim())
const drive = new GoogleDrive()
const ready = ref(false)
const connected = ref(false)
const busy = ref(false)
const message = ref('')
const error = ref('')
const files = ref<DriveFile[]>([])
const selected = ref('')
const recoveryAvailable = ref(false)
try { recoveryAvailable.value = localStorage.getItem(RECOVERY_KEY) !== null } catch { /* blocked storage */ }

async function run(action: () => Promise<void>) {
  busy.value = true; error.value = ''; message.value = ''
  try { await action() }
  catch (e) {
    const key = e instanceof Error ? e.message : ''
    const known = ['invalid_backup', 'recovery_space', 'recovery_required', 'restore_failed',
      'google_load', 'google_auth', 'google_expired', 'google_network', 'google_forbidden', 'google_request']
    error.value = t(`drive.errors.${known.includes(key) ? key : 'google_request'}`)
    if (key === 'google_expired') disconnect()
  } finally {
    busy.value = false
    try { recoveryAvailable.value = localStorage.getItem(RECOVERY_KEY) !== null } catch { /* blocked storage */ }
  }
}
const prepare = () => run(async () => { await loadGoogleIdentity(); ready.value = true })
async function refresh() {
  files.value = await drive.list()
  selected.value = files.value[0]?.id || ''
}
const connect = () => run(async () => {
  // Called directly by the click so the Google popup retains user activation.
  await drive.connect(import.meta.env.VITE_GOOGLE_CLIENT_ID.trim())
  connected.value = true
  await refresh()
})
function disconnect() { drive.disconnect(); connected.value = false; files.value = []; selected.value = '' }
onBeforeUnmount(disconnect)
const upload = () => run(async () => {
  await nextTick()
  const snapshot = captureBackup()
  // The initial language can come from the browser rather than persisted settings.
  snapshot.data.ltct_locale = locale.value
  await drive.upload(snapshot)
  message.value = t('drive.saved')
  await refresh()
})
function apply(backup: Backup) {
  if (!window.confirm(t('drive.confirm', {date: new Date(backup.createdAt).toLocaleString(), count: Object.keys(backup.data).length}))) return
  restoreBackup(backup)
  window.location.reload()
}
const restore = () => run(async () => { const backup = await drive.download(selected.value); await nextTick(); apply(backup) })
const recover = () => run(async () => { apply(parseBackup(localStorage.getItem(RECOVERY_KEY) || '')) })
</script>

<template>
  <section class="settings-section" aria-labelledby="drive-heading">
    <h5 id="drive-heading" class="settings-heading">{{ t('drive.title') }}</h5>
    <p>{{ t('drive.description') }}</p>
    <p class="small text-muted">{{ t('drive.privacy') }}</p>
    <p v-if="!configured" class="alert alert-info">{{ t('drive.unconfigured') }}</p>
    <div v-else class="d-flex flex-wrap gap-2 mb-3">
      <button v-if="!ready" type="button" class="btn btn-outline-primary" :disabled="busy" @click="prepare">{{ t('drive.prepare') }}</button>
      <button v-else-if="!connected" type="button" class="btn btn-primary" :disabled="busy" @click="connect">{{ t('drive.connect') }}</button>
      <template v-else>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="upload">{{ t('drive.upload') }}</button>
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="run(refresh)">{{ t('drive.refresh') }}</button>
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="disconnect">{{ t('drive.disconnect') }}</button>
      </template>
    </div>
    <div v-if="connected" class="mb-3">
      <label for="drive-version" class="form-label">{{ t('drive.version') }}</label>
      <select id="drive-version" v-model="selected" class="form-select mb-2" :disabled="busy || !files.length">
        <option v-if="!files.length" value="">{{ t('drive.empty') }}</option>
        <option v-for="file in files" :key="file.id" :value="file.id">
          {{ new Date(file.createdTime).toLocaleString() }} · {{ Math.ceil(Number(file.size || 0) / 1024) }} KB · {{ file.id.slice(-6) }}
        </option>
      </select>
      <button type="button" class="btn btn-outline-warning" :disabled="busy || !selected || auth.loggedIn" @click="restore">{{ t('drive.restore') }}</button>
    </div>
    <p v-if="auth.loggedIn" class="alert alert-warning">{{ t('drive.wca') }}</p>
    <button v-if="recoveryAvailable" type="button" class="btn btn-outline-secondary mb-2" :disabled="busy || auth.loggedIn" @click="recover">{{ t('drive.recover') }}</button>
    <p v-if="busy" role="status">{{ t('drive.working') }}</p>
    <p v-if="message" role="status" class="text-success">{{ message }}</p>
    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
  </section>
</template>
