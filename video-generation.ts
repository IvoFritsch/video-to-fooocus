const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);
import { createReadStream, unlink, mkdir, readdir, rmdir, mkdirSync } from 'fs';
import path, { join } from 'path';
import { promisify } from 'util';

const outputDir = './output';
const videoOutputPath = path.join(outputDir, 'output.mp4');

export async function generateFinalVideo() {
    
    const outputDir = './output';
    const videoOutputPath = path.join(outputDir, 'output.mp4');
    const audioFilePath = path.join(__dirname, 'temp', 'audio.mp4'); // Path to your audio file
    
    const outDir = join(__dirname, outputDir);
    mkdirSync(outDir, { recursive: true }); // Create temp directory
    

    const ret = new Promise<void>((res, rej) => {
        ffmpeg()
            .addInput(`temp/output-frame-%05d.png`)  // frame1.png, frame2.png, ...
            .inputFPS(30) // set the frame rate (1 frame per second)
            .addInput(audioFilePath) // specify the audio file
            .outputOptions('-c:v', 'libx264') // video codec
            .outputOptions('-c:a', 'aac') // audio codec
            .outputOptions('-pix_fmt', 'yuv420p')
            .outputOptions(['-map 0:v', '-map 1:a'])
            .outputOptions('-strict', 'experimental') // required for aac codec
            .output(videoOutputPath)
            .on('end', () => {
                console.log('Video criado com sucesso');
                res();
            })
            .on('error', (err) => {
                console.error('Error ao criar video final:', err);
                rej(err)
            })
            .run();
    })
    return ret
}