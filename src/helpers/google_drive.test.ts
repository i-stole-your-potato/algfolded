import {afterEach, describe, it, expect, vi} from 'vitest'
import {GoogleDrive, DRIVE_SCOPE} from './google_drive'
import {captureBackup} from './backup'

function setup(response = {access_token: 'private-token', expires_in: 3600, scope: DRIVE_SCOPE}) {
  const requestAccessToken = vi.fn()
  const init = vi.fn(config => {
    requestAccessToken.mockImplementation(() => config.callback(response))
    return {requestAccessToken}
  })
  vi.stubGlobal('google', {accounts: {oauth2: {initTokenClient: init}}})
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  return {drive: new GoogleDrive(), fetch, init, requestAccessToken}
}
afterEach(() => { vi.unstubAllGlobals() })

describe('Google Drive backups', () => {
  it('requests only app data access, keeps tokens out of storage, and reads all pages', async () => {
    const {drive, fetch, init, requestAccessToken} = setup()
    await drive.connect('client-id')
    expect(init.mock.calls[0][0]).toMatchObject({scope: DRIVE_SCOPE, include_granted_scopes: false})
    expect(requestAccessToken).toHaveBeenCalledWith({prompt: 'select_account'})
    expect(localStorage.length).toBe(0)
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({files: [{id: 'one'}], nextPageToken: 'page2'})))
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({files: [{id: 'two'}]})))
    expect(await drive.list()).toEqual([{id: 'one'}, {id: 'two'}])
    expect(fetch.mock.calls[0][0]).toContain('spaces=appDataFolder')
    expect(fetch.mock.calls[1][0]).toContain('pageToken=page2')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer private-token')
    drive.disconnect()
    await expect(drive.list()).rejects.toThrow('google_expired')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('creates a new immutable multipart snapshot on every upload', async () => {
    const {drive, fetch} = setup()
    await drive.connect('client-id')
    fetch.mockImplementation(async () => new Response('{}'))
    localStorage.setItem('ltctTrainerNotes:ltct', '{"a":"筆記"}')
    const snapshot = captureBackup()
    await drive.upload(snapshot)
    await drive.upload(snapshot)
    for (const [url, init] of fetch.mock.calls) {
      expect(url).toBe('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id')
      expect(init.method).toBe('POST')
      expect(init.body).toContain('"parents":["appDataFolder"]')
      expect(init.body).toContain(JSON.stringify(snapshot))
      expect(init.body).not.toContain('private-token')
    }
  })

  it('rejects corrupt downloads without changing local data', async () => {
    const {drive, fetch} = setup()
    await drive.connect('client-id')
    fetch.mockResolvedValue(new Response('{"app":"wrong"}'))
    await expect(drive.download('file/id')).rejects.toThrow('invalid_backup')
    expect(fetch.mock.calls[0][0]).toContain('file%2Fid?alt=media')
    expect(localStorage.length).toBe(0)
  })

  it('requires reconnection after expiry or a 401', async () => {
    const {drive, fetch} = setup()
    await drive.connect('client-id')
    fetch.mockResolvedValue(new Response('', {status: 401}))
    await expect(drive.list()).rejects.toThrow('google_expired')
    await expect(drive.list()).rejects.toThrow('google_expired')
    expect(fetch).toHaveBeenCalledTimes(1)
    await drive.connect('client-id')
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3600000)
    await expect(drive.list()).rejects.toThrow('google_expired')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects missing scope grants', async () => {
    const {drive, fetch} = setup({access_token: 'token', expires_in: 3600, scope: 'openid'})
    await expect(drive.connect('client-id')).rejects.toThrow('google_auth')
    await expect(drive.list()).rejects.toThrow('google_expired')
    expect(fetch).not.toHaveBeenCalled()
  })
})
