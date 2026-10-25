import type { VideoProject } from "./schema";
export type RenderState="queued"|"preparing"|"rendering"|"validating"|"completed"|"failed"|"cancelled";
export type RenderRequest={renderId:string;project:VideoProject;webhookUrl?:string};
export type RenderResult={providerJobId:string;state:RenderState;outputUrl?:string;progress?:number;raw?:unknown};
export interface Renderer { readonly name:string; validateConfiguration():void; createRender(r:RenderRequest):Promise<RenderResult>; getRenderStatus(id:string):Promise<RenderResult>; cancelRender(id:string):Promise<void>; normalizeWebhook(payload:unknown):RenderResult; estimateCost(project:VideoProject):Promise<number|null>; }
