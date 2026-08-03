let audioCtx = null
let ambientEl = null
let initialized = false

export function useAudio () {
  const { muted } = useSceneState()

  function ensureCtx () {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  }

  function playFocusSfx () {
    if (muted.value) return
    ensureCtx()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.25)
  }

  async function startAmbient () {
    if (ambientEl) return
    // El loop ambiente es opcional: solo si el archivo existe en public/audio/.
    const res = await fetch('/audio/ambient.mp3', { method: 'HEAD' }).catch(() => null)
    if (!res?.ok) return
    ambientEl = new Audio('/audio/ambient.mp3')
    ambientEl.loop = true
    ambientEl.volume = 0.25
    if (!muted.value) ambientEl.play().catch(() => {})
  }

  function initOnFirstGesture () {
    if (initialized) return
    initialized = true
    muted.value = localStorage.getItem('loft-muted') === '1'
    const onGesture = () => {
      ensureCtx()
      startAmbient()
      window.removeEventListener('pointerdown', onGesture)
    }
    window.addEventListener('pointerdown', onGesture)
    watch(muted, (v) => {
      localStorage.setItem('loft-muted', v ? '1' : '0')
      if (ambientEl) v ? ambientEl.pause() : ambientEl.play().catch(() => {})
    })
  }

  return { playFocusSfx, toggleMute: () => { muted.value = !muted.value }, initOnFirstGesture }
}
