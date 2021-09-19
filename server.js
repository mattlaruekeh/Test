const express = require('express'); 
const server = express();
const app = require('./app');

server.get('/', async (req, res) => {
    try {
        return res.end('Go to one of the scraping routes to initate scraping manually')

    } catch (err) {
        return res.status(500).json({
            err: err.toString(),
        })
    }
})

server.get('/test', async (req, res) => {
    try {
        const scrapedData = await app.run() 
        return res.status(200).json(scrapedData) 

    } catch (err) {
        return res.status(500).json({
            err: err.toString(),
        })
    }
})


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(
        `The container started successfully and is listening for HTTP requests on ${PORT}`
    );
});