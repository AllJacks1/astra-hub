"use client";

import { useEffect, useState } from "react";
import { publicEnv } from "@/lib/env";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/(hub)/settings/actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(b64: string) {
  const padded = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "checking" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

export function PushToggle() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (ios && !standalone) return setState("needs-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey()) as unknown as BufferSource,
      });
      const j = sub.toJSON();
      const res = await savePushSubscriptionAction({
        endpoint: j.endpoint ?? "", p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "",
      });
      if (!res.ok) { await sub.unsubscribe(); setMsg("Couldn't save the subscription. Try again."); return; }
      setState("on");
    } catch {
      setMsg("Couldn't enable notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      {state === "checking" && <p className="text-muted-foreground">Checking this device…</p>}
      {state === "unsupported" && <p className="text-muted-foreground">This browser doesn&rsquo;t support push notifications.</p>}
      {state === "needs-install" && (
        <p className="text-muted-foreground">On iPhone, first add Astra Team Hub to your Home Screen (Share → Add to Home Screen), open it from there, then enable notifications here.</p>
      )}
      {state === "blocked" && <p className="text-muted-foreground">Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.</p>}
      {state === "off" && <Button onClick={enable} disabled={busy}>Enable push notifications on this device</Button>}
      {state === "on" && (
        <div className="flex items-center gap-3">
          <span>Push notifications are on for this device.</span>
          <Button variant="outline" size="sm" onClick={disable} disabled={busy}>Turn off</Button>
        </div>
      )}
      {msg && <p role="alert" className="text-destructive">{msg}</p>}
    </div>
  );
}
