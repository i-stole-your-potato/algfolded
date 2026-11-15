import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises, type VueWrapper} from '@vue/test-utils'
import DriveBackup from './DriveBackup.vue'

const mocks = vi.hoisted(() => ({
  load: vi.fn(), connect: vi.fn(), list: vi.fn(), upload: vi.fn(), download: vi.fn(),
  disconnect: vi.fn(), auth: {loggedIn: false},
}))
vi.mock('vue-i18n', () => ({useI18n: () => ({t: (k: string) => k, locale: {value: 'en'}})}))
vi.mock('@/stores/AuthStore', () => ({useAuthStore: () => mocks.auth}))
vi.mock('@/helpers/google_drive', () => ({
  loadGoogleIdentity: mocks.load,
  GoogleDrive: class {
    connect = mocks.connect; list = mocks.list; upload = mocks.upload
    download = mocks.download; disconnect = mocks.disconnect
  },
}))
let wrapper: VueWrapper
const button = (key: string) => wrapper.findAll('button').find(b => b.text() === `drive.${key}`)!
beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client')
  vi.clearAllMocks()
  mocks.auth.loggedIn = false
  mocks.list.mockResolvedValue([{id: 'backup1', createdTime: '2026-11-15T00:00:00Z', size: '100'}])
  mocks.download.mockResolvedValue({app: 'algfolded', version: 1, createdAt: '2026-11-15T00:00:00Z', data: {ltct_locale: 'de'}})
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllEnvs() })
async function connected() {
  wrapper = mount(DriveBackup)
  await button('prepare').trigger('click'); await flushPromises()
  await button('connect').trigger('click'); await flushPromises()
}

describe('Drive backup settings', () => {
  it('stays local without configuration and never loads Google automatically', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    wrapper = mount(DriveBackup)
    expect(wrapper.text()).toContain('drive.unconfigured')
    expect(mocks.load).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
  })
  it('enables Google only on request and uploads current local data', async () => {
    wrapper = mount(DriveBackup)
    expect(mocks.load).not.toHaveBeenCalled()
    await button('prepare').trigger('click'); await flushPromises()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    await button('connect').trigger('click'); await flushPromises()
    localStorage.setItem('ltctTrainerNotes:ltct', '{"a":"note"}')
    await button('upload').trigger('click'); await flushPromises()
    expect(mocks.upload.mock.calls[0][0].data).toEqual({ltct_locale: 'en', 'ltctTrainerNotes:ltct': '{"a":"note"}'})
    expect(wrapper.text()).toContain('drive.saved')
  })
  it('never replaces local data when restore confirmation is cancelled', async () => {
    await connected()
    localStorage.setItem('ltct_locale', 'fr')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await button('restore').trigger('click'); await flushPromises()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('ltct_locale')).toBe('fr')
  })
  it('does not offer a destructive confirmation for an invalid download', async () => {
    await connected()
    mocks.download.mockRejectedValueOnce(new Error('invalid_backup'))
    const confirm = vi.spyOn(window, 'confirm')
    await button('restore').trigger('click'); await flushPromises()
    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toBe('drive.errors.invalid_backup')
  })
  it('blocks restore while the separate WCA sync is signed in', async () => {
    mocks.auth.loggedIn = true
    await connected()
    expect(button('restore').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('drive.wca')
  })
})
