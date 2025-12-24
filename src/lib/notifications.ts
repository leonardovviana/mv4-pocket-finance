export async function showNotificationSafely(payload: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const options: any = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag,
    requireInteraction: payload.requireInteraction,
    data: { url: payload.url ?? "/" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(payload.title, options);
      return;
    }
  } catch {
    // fallback abaixo
  }

  try {
    const n = new Notification(payload.title, options);
    n.onclick = () => {
      const target = payload.url ?? "/";
      window.focus();
      window.location.assign(target);
    };
  } catch {
    // ignore
  }
}

export function requestNotificationPermissionOnce(storageKey: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  const asked = localStorage.getItem(storageKey) === "1";
  if (asked) return;
  localStorage.setItem(storageKey, "1");

  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}
