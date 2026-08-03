// Canal mínimo UI -> escena. Solo cliente; los handlers los registra Scene.vue.
const handlers = new Map()

export function onSceneAction (name, fn) {
  handlers.set(name, fn)
  return () => handlers.delete(name)
}

export function emitSceneAction (name, ...args) {
  handlers.get(name)?.(...args)
}
