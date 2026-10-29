import path from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function localFFmpeg(name){
 if(!['ffmpeg','ffprobe'].includes(name))throw new Error('Unknown FFmpeg executable.');
 const file=path.join(root,'tools','ffmpeg',`${process.platform}-${process.arch}`,'bin',name+(process.platform==='win32'?'.exe':''));
 if(!existsSync(file))throw new Error('Project FFmpeg is missing. Run npm run ffmpeg:setup.');
 return file;
}
