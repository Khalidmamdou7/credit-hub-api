const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');


const getScheduleText = async (file, imageUrl) => {
    const data = new FormData();
    if (file) {
        data.append('file', fs.createReadStream(file.path));
    } else if (imageUrl) {
        data.append('urls', imageUrl);
    }
    const config = {
        method: 'post',
        url: 'https://app.nanonets.com/api/v2/OCR/FullText',
        headers: { 
                'Authorization': 'Basic ' + Buffer.from(process.env.NANONETS_API_KEY + ":").toString('base64'), 
                ...data.getHeaders()
            },
        data : data
    };
    try {
        const response = await axios(config);
        // if response status code is 400, then the request is invalid
        if (response.status === 400) {
            throw new Error('Invalid request to Nanonets');
        } else if (response.status === 401) {
            throw new Error('Invalid API key');
        }
        const raw_text = response.data.results[0].page_data[0].raw_text;
        if (file) {
            fs.unlink(file.path, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
        return raw_text;
    } catch (error) {
        throw error;
    }
}


module.exports = {
    getScheduleText
}