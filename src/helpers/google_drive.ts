import {parseBackup, type Backup} from './backup'

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'algfolded-backup-v1.json'
export interface DriveFile { id: string; name: string; createdTime: string; size?: string }
interface TokenResponse { access_token?: string; expires_in?: number; scope?: string; error?: string }
interface Identity {
  initTokenClient(config: {client_id: string; scope: string; include_granted_scopes: boolean;
    callback: (r: TokenResponse) => void; error_callback: () => void}): {requestAccessToken(options: {prompt: string}): void}
}
const identity = () => (window as unknown as {google?: {accounts?: {oauth2?: Identity}}}).google?.accounts?.oauth2
let loading: Promise<void> | undefined

export function loadGoogleIdentity(): Promise<void> {
  if (identity()) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => fail(), 20000)
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('google_load')) }
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => { clearTimeout(timer); identity() ? resolve() : fail() }
    script.onerror = fail
    document.head.appendChild(script)
  }).catch(error => { loading = undefined; throw error })
  return loading
}

/** Memory-only token; a reload or disconnect requires another user gesture. */
export class GoogleDrive {
  private token = ''
  private expires = 0
  disconnect() { this.token = ''; this.expires = 0 }
  connect(clientId: string): Promise<void> {
    this.disconnect()
    return new Promise((resolve, reject) => {
      const api = identity()
      if (!api) { reject(new Error('google_load')); return }
      api.initTokenClient({client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
        callback: response => {
          if (response.error || !response.access_token || !response.scope?.split(' ').includes(DRIVE_SCOPE)) {
            reject(new Error('google_auth')); return
          }
          this.token = response.access_token
          this.expires = Date.now() + Number(response.expires_in || 0) * 1000 - 30000
          resolve()
        }, error_callback: () => reject(new Error('google_auth')),
      }).requestAccessToken({prompt: 'select_account'})
    })
  }
  private async request(path: string, init: RequestInit = {}, upload = false): Promise<Response> {
    if (!this.token || Date.now() >= this.expires) { this.disconnect(); throw new Error('google_expired') }
    let response: Response
    try {
      response = await fetch(`https://www.googleapis.com/${upload ? 'upload/' : ''}drive/v3/${path}`, {
        ...init, headers: {...init.headers, Authorization: `Bearer ${this.token}`},
        signal: AbortSignal.timeout(60000),
      })
    } catch { throw new Error('google_network') }
    if (response.status === 401) { this.disconnect(); throw new Error('google_expired') }
    if (!response.ok) throw new Error(response.status === 403 ? 'google_forbidden' : 'google_request')
    return response
  }
  async list(): Promise<DriveFile[]> {
    const files: DriveFile[] = []
    let pageToken = ''
    do {
      const params = new URLSearchParams({spaces: 'appDataFolder',
        q: `trashed = false and name = '${FILE_NAME}'`,
        fields: 'nextPageToken,files(id,name,createdTime,size)', orderBy: 'createdTime desc', pageSize: '100'})
      if (pageToken) params.set('pageToken', pageToken)
      const data = await (await this.request(`files?${params}`)).json()
      files.push(...(data.files || []))
      pageToken = data.nextPageToken || ''
    } while (pageToken)
    return files
  }
  async upload(backup: Backup): Promise<void> {
    const payload = JSON.stringify(parseBackup(JSON.stringify(backup)))
    const boundary = `algfolded_${crypto.randomUUID()}`
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({name: FILE_NAME, parents: ['appDataFolder']}) +
      `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${payload}\r\n--${boundary}--`
    await this.request('files?uploadType=multipart&fields=id', {
      method: 'POST', headers: {'Content-Type': `multipart/related; boundary=${boundary}`}, body,
    }, true)
  }
  async download(id: string): Promise<Backup> {
    const response = await this.request(`files/${encodeURIComponent(id)}?alt=media`)
    if (Number(response.headers.get('Content-Length')) > 20 * 1024 * 1024) throw new Error('invalid_backup')
    return parseBackup(await response.text())
  }
}
