/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification as any)?.data?.url || "/chat";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            // @ts-expect-error navigate exists on WindowClient
            if (typeof (client as any).navigate === "function") {
              // @ts-expect-error navigate exists on WindowClient
              void (client as any).navigate(url);
            }
            return (client as WindowClient).focus();
          }
        }

        return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("push", (event: PushEvent) => {
  // Opcional: permite push real no futuro (backend/VAPID)
  let data: any = null;
  try {
    data = event.data?.json?.() ?? null;
  } catch {
    data = null;
  }

  const title = data?.title || "MV4 Financeiro";
  const body = data?.body;
  const url = data?.url || "/chat";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
      // Para solicitação de pagamento, o backend pode mandar requireInteraction=true
      requireInteraction: Boolean(data?.requireInteraction),
    } as any),
  );
});
