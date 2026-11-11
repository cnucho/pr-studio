import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path'; import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,'../../..');
const data=JSON.parse(await readFile(path.join(here,'storyboard.json'),'utf8'));
const out=path.join(root,'out',data.slug); const screens=path.join(out,'screens');
for(const d of ['frames','audio','segments']) await mkdir(path.join(out,d),{recursive:true});
function run(c,args,opts={}) {const r=spawnSync(c,args,{cwd:root,encoding:'utf8',shell:false,...opts});if(r.status!==0)throw Error(`${c} failed: ${r.stderr||r.stdout}`);return (r.stdout||'').trim();}
function dur(f){return Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f]));}
function tc(n){let m=Math.round(n*1000);let h=Math.floor(m/3600000);m%=3600000;let min=Math.floor(m/60000);m%=60000;let s=Math.floor(m/1000);return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(m%1000).padStart(3,'0')}`;}
const concat=[],srt=[],transcript=[];let t=0;
for(let i=0;i<data.scenes.length;i++){
 const s=data.scenes[i],stem=`${String(i+1).padStart(2,'0')}-${s.id}`;
 const frame=path.join(out,'frames',stem+'.png'),wav=path.join(out,'audio',stem+'.wav'),txt=path.join(out,'audio',stem+'.txt'),hashfile=path.join(out,'audio',stem+'.hash'),clip=path.join(out,'segments',stem+'.mp4');
 run('python',[path.join(here,'render_tutorial.py'),'--storyboard',path.join(here,'storyboard.json'),'--scene',s.id,'--screens',screens,'--output',frame]);
 await writeFile(txt,s.narration,'utf8');const hash=createHash('sha256').update(s.narration+'|google|ko-KR-Chirp3-HD-Kore|0.94').digest('hex');
 if(!existsSync(wav)||!existsSync(hashfile)||(await readFile(hashfile,'utf8')).trim()!==hash){run('node',[path.join(root,'scripts','synthesize-speech.mjs'),'--input',txt,'--output',wav],{env:{...process.env,PR_STUDIO_TTS_PROVIDER_KO:'google',GOOGLE_TTS_VOICE_KO:'ko-KR-Chirp3-HD-Kore',GOOGLE_TTS_SPEAKING_RATE:'0.94'}});await writeFile(hashfile,hash);}
 const length=dur(wav)+1.4;
 run('ffmpeg',['-y','-loglevel','error','-loop','1','-framerate','24','-i',frame,'-i',wav,'-af','apad=pad_dur=1.4','-t',length.toFixed(3),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k',clip]);
 concat.push(`file '${clip.replaceAll('\\','/')}'`);srt.push(`${i+1}\n${tc(t)} --> ${tc(t+length)}\n${s.caption}\n`);transcript.push(`[${i+1}] ${s.narration}`);t+=length;console.log(`Rendered ${i+1}/${data.scenes.length}: ${s.title}`);
}
await writeFile(path.join(out,'concat.txt'),concat.join('\n')+'\n');await writeFile(path.join(out,data.slug+'.srt'),srt.join('\n'));await writeFile(path.join(out,data.slug+'-transcript.txt'),transcript.join('\n\n'));
const video=path.join(out,data.slug+'.mp4');run('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(out,'concat.txt'),'-c','copy','-movflags','+faststart',video]);run('ffmpeg',['-v','error','-i',video,'-f','null','-']);
const probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height:format=duration,size','-of','json',video]));
for(const ratio of [0.15,0.5,0.85])run('ffmpeg',['-y','-loglevel','error','-ss',String(Number(probe.format.duration)*ratio),'-i',video,'-frames:v','1',path.join(out,`sample-${Math.round(ratio*100)}.png`)]);
await writeFile(path.join(out,'verification.json'),JSON.stringify({video,sha256:createHash('sha256').update(await readFile(video)).digest('hex'),probe,fullDecode:'passed',tts:'Google ko-KR-Chirp3-HD-Kore at 0.94',scenes:data.scenes.length},null,2));console.log(video);
