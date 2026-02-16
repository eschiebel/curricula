const showScreenreaderAlert = (message: string) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const liveRegion = document.getElementById('screenreader-alert')
  if (!liveRegion) return

  // Clear existing content to force a DOM change
  while (liveRegion.firstChild) {
    liveRegion.removeChild(liveRegion.firstChild)
  }

  // Defer setting the message to the next tick so AT sees a new node
  window.setTimeout(() => {
    if (typeof document === 'undefined') return
    const msgNode = document.createElement('div')
    msgNode.textContent = message
    liveRegion.appendChild(msgNode)
  }, 10)
}

export { showScreenreaderAlert }
