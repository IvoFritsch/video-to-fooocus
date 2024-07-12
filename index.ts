import axios from 'axios';

const host = "http://192.168.15.5:8888";

interface Params {
  prompt: string;
  async_process: boolean;
}

interface ResponseData {
  // Define the structure of the expected response here.
  // For example:
  // id: string;
  // status: string;
  // image_url?: string;
  [key: string]: any;
}

async function text2img(params: Params): Promise<ResponseData> {
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

// Example usage
(async () => {
  try {
    const result = await text2img({
      prompt: "1girl sitting on the ground",
      async_process: true
    });
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
})();