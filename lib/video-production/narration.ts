export type NarrationRequest={text:string;voiceId:string;language:string;locale:string;speed:number;pronunciation:Record<string,string>;outputPath:string};
export type NarrationResult={provider:string;audioAssetUri:string;duration?:number;timing?:Array<{start:number;end:number;text:string}>;estimatedCost:number|null;actualCost:number|null;requestId?:string};
export interface NarrationProvider{readonly name:string;generate(r:NarrationRequest):Promise<NarrationResult>;getStatus?(id:string):Promise<NarrationResult>;estimateCost(r:NarrationRequest):Promise<number|null>;}
export const narrationProviderNames=["google","openai","elevenlabs","windows"] as const;
