// `bpmn-js` ships no types and there is no @types package installed.
// Scoped to what BPMNEditor.tsx/BPMNViewer.tsx actually use.
interface BpmnJsInstance {
  get(service: string): unknown;
  on(event: string, callback: (payload: never) => void): void;
  off(event: string, callback?: (payload: never) => void): void;
  importXML(xml: string, callback?: (error?: Error) => void): Promise<unknown> | void;
  saveXML(
    options: { format?: boolean },
    callback: (error: Error | null, xml?: string) => void,
  ): void;
  destroy(): void;
}

declare module 'bpmn-js/lib/Modeler' {
  export default class BpmnModeler implements BpmnJsInstance {
    constructor(options: { container?: HTMLElement | null; additionalModules?: unknown[] | null });
    get(service: string): unknown;
    on(event: string, callback: (payload: never) => void): void;
    off(event: string, callback?: (payload: never) => void): void;
    importXML(xml: string, callback?: (error?: Error) => void): Promise<unknown> | void;
    saveXML(
      options: { format?: boolean },
      callback: (error: Error | null, xml?: string) => void,
    ): void;
    destroy(): void;
  }
}

declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class BpmnNavigatedViewer implements BpmnJsInstance {
    constructor(options: { container?: HTMLElement | null; additionalModules?: unknown[] | null });
    get(service: string): unknown;
    on(event: string, callback: (payload: never) => void): void;
    off(event: string, callback?: (payload: never) => void): void;
    importXML(xml: string, callback?: (error?: Error) => void): Promise<unknown> | void;
    saveXML(
      options: { format?: boolean },
      callback: (error: Error | null, xml?: string) => void,
    ): void;
    destroy(): void;
  }
}

// `.css` imports are already covered by vite/client's ambient `*.css` module.
