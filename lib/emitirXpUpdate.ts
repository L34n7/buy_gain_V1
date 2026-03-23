export function emitirXpUpdate(payload: any) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("xp:updated", {
      detail: payload,
    })
  );
}