const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);
import { createReadStream, unlink, mkdir, readdir, rmdir } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);
const mkdirAsync = promisify(mkdir);
const readdirAsync = promisify(readdir);
const rmdirAsync = promisify(rmdir);

export async function extractAudio(videoPath: string, startMillis: number, finishMillis: number): Promise<void> {
    console.log(`Extraindo audio...`)
    const outPath = join(__dirname, 'temp', 'audio.mp4');
    
    const command = ffmpeg(videoPath);

    if (startMillis !== undefined) {
        command.setStartTime(startMillis / 1000); // Convert to seconds
    }

    if (finishMillis !== undefined) {
        command.setDuration((finishMillis - (startMillis || 0)) / 1000); // Convert to seconds
    }
    return new Promise((resolve, reject) => {
        command
            .output(outPath)
            .noVideo()
            .format('mp4')
            .on('end', () => {
                console.log('Audio extraido com sucesso');
                resolve();
            })
            .on('error', (err) => {
                console.error('Erro ao extrair audio:', err);
                reject(err);
            })
            .run();
    });
}

export async function extractFramesAsBase64(
    videoPath: string,
    framesPerSecond: number,
    startMillis?: number,
    finishMillis?: number
): Promise<string[]> {
    console.log(`Extraindo frames...`)
    const tempDir = join(__dirname, 'temp');
    await mkdirAsync(tempDir, { recursive: true }); // Create temp directory
    const outputPath = join(tempDir, 'input-frame-%05d.jpg');

    const command = ffmpeg(videoPath);

    if (startMillis !== undefined) {
        command.setStartTime(startMillis / 1000); // Convert to seconds
    }

    if (finishMillis !== undefined) {
        command.setDuration((finishMillis - (startMillis || 0)) / 1000); // Convert to seconds
    }

    return new Promise((resolve, reject) => {
        command
            .outputOptions('-vf', `fps=${framesPerSecond}`)
            .on('end', async () => {
                try {
                    const frameFiles = await readdirAsync(tempDir);
                    const base64Frames = await Promise.all(frameFiles.filter(ff => ff.includes('input-frame')).sort().map(ff => {
                        return convertToBase64(join(tempDir, ff))
                    }));
                    
                    // // Clean up temporary files
                    // await Promise.all(frameFiles.map(frame => unlinkAsync(join(tempDir, frame))));
                    // await rmdirAsync(tempDir); // Remove the temporary directory

                    resolve(base64Frames);
                } catch (err) {
                    reject(`Error processing frames: ${(err as any).message}`);
                }
            })
            .on('error', (err: any) => {
                reject(`Error: ${err.message}`);
            })
            .output(outputPath)
            .run();
    });
}

const convertToBase64 = (framePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const readStream = createReadStream(framePath);

        readStream.on('data', chunk => chunks.push(chunk as Buffer));
        readStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            resolve(base64);
        });
        readStream.on('error', reject);
    });
};