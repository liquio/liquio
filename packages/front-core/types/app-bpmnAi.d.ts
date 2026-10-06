declare module 'application/actions/bpmnAi' {
  type Dispatch = (action: unknown) => unknown;
  export function generateTechSpecBySchema(body: unknown): (dispatch: Dispatch) => Promise<unknown>;
}
