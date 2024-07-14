import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export async function downloadImage(url: string, name: string): Promise<void> {
    const localDirectory = './temp'; // Change this to your desired directory

    // Ensure the directory exists
    if (!fs.existsSync(localDirectory)) {
        fs.mkdirSync(localDirectory);
    }

    const filePath = path.join(localDirectory, name);

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}