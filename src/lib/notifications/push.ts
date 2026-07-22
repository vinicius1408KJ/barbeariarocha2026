import { adminRepository } from "@/lib/repository/adminRepository"

// Public VAPID key (safe to ship). The private key lives only in the DB /
// edge function. Keep in sync with public.push_config.vapid_public.
const VAPID_PUBLIC =
  "BA26T6mcpOou2E8OuPzaqci5E6D8WNokqZcAWtIpJTT8Ne_jqoRedUjmOB0OZqqIRsRIlPRP_80fU2WMfzh09YQ"

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on"

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent)
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js")
  } catch {
    return null
  }
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    // On iOS, push only works once installed to the Home Screen.
    if (isIOS() && !isStandalone()) return "needs-install"
    return "unsupported"
  }
  if (isIOS() && !isStandalone()) return "needs-install"
  if (Notification.permission === "denied") return "denied"
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? "on" : "off"
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function keyToB64(sub: PushSubscription, name: "p256dh" | "auth"): string {
  const key = sub.getKey(name)
  if (!key) return ""
  return btoa(String.fromCharCode(...new Uint8Array(key)))
}

export async function enablePush(barberId: string): Promise<PushState> {
  if (!pushSupported()) return "unsupported"

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "off"

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker())
  if (!reg) return "off"
  await navigator.serviceWorker.ready

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  })

  await adminRepository.savePushSubscription(barberId, {
    endpoint: sub.endpoint,
    p256dh: keyToB64(sub, "p256dh"),
    auth: keyToB64(sub, "auth"),
  })
  return "on"
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await adminRepository.removePushSubscription(sub.endpoint).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }
  return "off"
}
