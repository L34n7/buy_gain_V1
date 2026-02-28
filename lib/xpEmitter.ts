export function emitirXpUpdate(data: any) {
  window.dispatchEvent(
    new CustomEvent("xp:updated", {
      detail: data,
    })
  );
}