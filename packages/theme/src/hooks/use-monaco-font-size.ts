import { useEffect } from 'react'

const PAYLOAD_FONT_SIZE = 11

type Disposable = { dispose: () => void }

type MonacoEditor = {
  getRawOptions: () => { fontSize?: number }
  onDidChangeConfiguration: (listener: () => void) => Disposable
  updateOptions: (options: { fontSize: number }) => void
}

type Monaco = {
  editor: {
    getEditors: () => MonacoEditor[]
    onDidCreateEditor: (listener: (editor: MonacoEditor) => void) => Disposable
  }
}

const getMonaco = () => (window as Window & { monaco?: Monaco }).monaco

export function useMonacoFontSize(fontSize: false | number) {
  useEffect(() => {
    if (!fontSize) {
      return
    }

    const disposables: Disposable[] = []
    const enlarged = new WeakSet<MonacoEditor>()

    const enlarge = (editor: MonacoEditor) => {
      if (editor.getRawOptions().fontSize !== PAYLOAD_FONT_SIZE) {
        return
      }
      enlarged.add(editor)
      editor.updateOptions({ fontSize })
    }

    const watch = (editor: MonacoEditor) => {
      enlarge(editor)
      disposables.push(editor.onDidChangeConfiguration(() => enlarge(editor)))
    }

    const start = (monaco: Monaco) => {
      monaco.editor.getEditors().forEach(watch)
      disposables.push(monaco.editor.onDidCreateEditor(watch))
    }

    const observer = new MutationObserver(() => {
      const monaco = getMonaco()
      if (!monaco?.editor) {
        return
      }
      observer.disconnect()
      start(monaco)
    })

    const monaco = getMonaco()
    if (monaco?.editor) {
      start(monaco)
    } else {
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer.disconnect()
      disposables.forEach((disposable) => disposable.dispose())
      getMonaco()
        ?.editor.getEditors()
        .filter((editor) => enlarged.has(editor))
        .forEach((editor) => editor.updateOptions({ fontSize: PAYLOAD_FONT_SIZE }))
    }
  }, [fontSize])
}
