const URL = '/audio/airpods.mp3'
const FADE = 0.6
const VOLUME = 0.8
// Calibrado contra la distancia real cámara→mesa, no contra el tamaño del case:
// el rig limita el zoom a [radius*0.15, radius*2.2] ≈ [2.5, 37] unidades, con
// ~10.3 en la vista por defecto. Un refDistance menor al mínimo alcanzable deja
// la música siempre en la zona de caída abrupta, o sea inaudible.
// Volumen efectivo resultante: 0.80 pegado a la mesa, 0.28 en la vista por
// defecto, 0.09 con el zoom afuera del todo.
const REF_DISTANCE = 2.5
const ROLLOFF = 0.6

/**
 * Música en loop que sale del objeto de los AirPods, con atenuación por
 * distancia de cámara. El buffer se descarga en la primera apertura: quien
 * nunca clickea los auriculares no paga el MB y medio.
 */
export function createAirpodsMusic ({ THREE, listener, object }) {
  const sound = new THREE.PositionalAudio(listener)
  sound.setRefDistance(REF_DISTANCE)
  sound.setRolloffFactor(ROLLOFF)
  sound.setDistanceModel('inverse')
  sound.setLoop(true)
  sound.setVolume(0)
  object.add(sound)

  let wanted = false // último estado pedido por el usuario (abierto/cerrado)
  let loading = null
  let disposed = false
  let muted = false
  let pauseTimer = null

  const gainOf = () => sound.gain.gain
  const now = () => listener.context.currentTime

  function rampTo (target) {
    const g = gainOf()
    // Anclar la rampa al valor actual: si venía a mitad de un fade, invierte
    // desde donde está en vez de saltar.
    g.cancelScheduledValues(now())
    g.setValueAtTime(g.value, now())
    g.linearRampToValueAtTime(target, now() + FADE)
  }

  function applyGain () {
    rampTo(wanted && !muted ? VOLUME : 0)
  }

  function load () {
    loading ??= new Promise((resolve, reject) => {
      new THREE.AudioLoader().load(URL, resolve, undefined, reject)
    }).then((buffer) => {
      if (disposed) return null
      sound.setBuffer(buffer)
      return buffer
    })
    return loading
  }

  return {
    async open () {
      wanted = true
      clearTimeout(pauseTimer)
      pauseTimer = null
      try {
        await load()
      } catch (err) {
        console.warn('No se pudo cargar la música de los airpods', err)
        return
      }
      // Entre el await y acá pudo llegar un close(): el estado manda, no el orden.
      if (disposed || !wanted) return
      if (!sound.isPlaying) sound.play()
      applyGain()
    },
    close () {
      wanted = false
      if (!sound.buffer) return
      applyGain()
      // Pausar recién terminado el fade; THREE.Audio conserva el offset, así que
      // la próxima apertura retoma donde iba.
      clearTimeout(pauseTimer)
      pauseTimer = setTimeout(() => {
        pauseTimer = null
        if (!wanted && sound.isPlaying) sound.pause()
      }, FADE * 1000)
    },
    setMuted (value) {
      muted = value
      if (sound.buffer) applyGain()
    },
    dispose () {
      disposed = true
      clearTimeout(pauseTimer)
      if (sound.isPlaying) sound.stop()
      sound.disconnect()
      sound.removeFromParent()
    }
  }
}
