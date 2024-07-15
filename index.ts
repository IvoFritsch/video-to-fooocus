import axios from 'axios';
import fs, { mkdir, mkdirSync } from 'fs';
import path, { join } from 'path';
import { extractAudio, extractFramesAsBase64 } from './video-process';
import { downloadImage } from './download-images';
import { generateFinalVideo } from './video-generation';

// python main.py --preset anime

const host = "http://127.0.0.1:8888";

interface ImagePrompt {
  cn_img: string;               // Base64 image or URL
  cn_stop?: number;            // Value between 0-1, default to 0.5
  cn_weight?: number;          // Weight between 0-2, default to 1.0
  cn_type: ControlNetType;     // ControlNetType Enum
}

type ControlNetType = "ImagePrompt" | "FaceSwap" | "PyraCanny" | "CPDS";

interface ImageInputParams {
  prompt: string;
  async_process: boolean;
  image_number?: number
  aspect_ratios_selection: string;
  save_name: string
  image_seed?: number
  image_prompts: Array<ImagePrompt>;       // List of image prompts
}

interface TextToImageParams {
  prompt: string;
  async_process: boolean;
  image_number?: number
}

interface ResponseData {
  [key: string]: any;
}

async function imgInput(params: ImageInputParams): Promise<ResponseData> {
  try {
    const response = await axios.post<ResponseData>(
      `${host}/v2/generation/text-to-image-with-ip`,
      params,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

async function text2img(params: TextToImageParams): Promise<ResponseData> {
  try {
    const response = await axios.post<ResponseData>(
      `${host}/v1/generation/text-to-image`,
      params,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

async function fileToBase64(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFileSync(filePath);
    const base64String = fileBuffer.toString('base64');

    const ext = path.extname(filePath).toLowerCase();
    let mimeType: string;

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.bmp':
        mimeType = 'image/bmp';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      default:
        throw new Error('Unsupported file type');
    }

    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    const errorAny = error as any
    throw new Error(`Error reading file: ${errorAny.message}`);
  }
}


// Example usage
(async () => {
  const now = Date.now()
  const frames = await extractFramesAsBase64('input/Download.mov', 30)
  // //console.log(frames)
  // // return 
  await extractAudio('input/Download.mov')
  console.log(`Extraidos ${frames.length} frames...`)
  console.log('Iniciando processamento...')
  for (let i = 0; i < frames.length; i++) {
    const frameStart = Date.now()
    try {
      const base64 = frames[i] //await fileToBase64(`input/${i}.png`)
      // console.log(base64.substring(0, 30))
      const result = await imgInput({
        "prompt": "a blonde girl wearing a black chess skirt, white shirt, black chess tie, white shoes, pink background",
        async_process: false,
        save_name: `${now}-${i+1}`,
        image_seed: 12345,
        aspect_ratios_selection: '576*1024', // 288*512 576*1024
        "image_prompts": [
          {
            "cn_img": base64,
            "cn_stop": 0.8,
            "cn_weight": 0.85,
            "cn_type": "ImagePrompt"
          },
          {
            "cn_img": base64,
            "cn_stop": 1,
            "cn_weight": 1,
            "cn_type": "PyraCanny"
          },
          {
            "cn_img": base64,
            "cn_stop": 0.85,
            "cn_weight": 0.7,
            "cn_type": "FaceSwap"
          }
        ]
      });
      // console.log(result);
      downloadImage(result[0].url, `output-frame-${String(i).padStart(5, '0')}.png`)
    } catch (error) {
      console.error('Error:', error);
    }
    const framesLeft = frames.length - i - 1
    console.log(`Restante: ${framesLeft} frames / ~${((Math.ceil(Date.now() - frameStart) * framesLeft) / 1000)} segundos`)
  }
  await generateFinalVideo();
})();