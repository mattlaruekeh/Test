/* 
    Test the deployment on Cloud Run by scraping a simple website and saving the results
 */

require('dotenv').config()
const axios = require('axios')
const cheerio = require("cheerio");
const excel = require('exceljs');


const SCRAPINGBEE = process.env.SCRAPINGBEE


/* 
    Connect to BigQuery in Google Cloud
    This will be in the same project that the
    code is hosted at
    Note: make sure the table exists with the correct
    schema in GCP before adding data to it
*/
const { BigQuery } = require('@google-cloud/bigquery')
const bigquery = new BigQuery({})
const BIGQUERY_DATASET = 'crawl_data'
const BIGQUERY_TABLE = 'test'

/* 
    Connect to Google Cloud storage in the provided
    bucket
*/
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({})
const BUCKET = 'test-cloud-run-data-storage-bucket'
const STORAGE_PATH = 'priceScraping/test'


/* 
    Fetch HTML contetnt using proxy
*/
async function fetch(url) {
    const { data } = await axios.get('https://app.scrapingbee.com/api/v1', {
        params: {
            'api_key': SCRAPINGBEE,
            'url': url
        }
    })
    return cheerio.load(data)
}

/* 
    Save results in an excel file stored in GCP
*/
async function exportResults(data) {
    // new excel doc
    let day = new Date().getDate()
    let month = new Date().getMonth()
    let year = new Date().getFullYear()
    let hour = new Date().getHours()
    let minutes = new Date().getMinutes();
    let date = `${month + 1}-${day}-${year}_${hour}-${minutes}`
    let outputExcel = `${date}_Test Data.xlsx`
    let workbook = new excel.Workbook()
    let worksheet = workbook.addWorksheet('Test Data')
    worksheet.columns = [
        { header: 'URLS', key: 'url' },
    ]

    // force the columns to be at least as long as their header row.
    worksheet.columns.forEach(function (column, i) {
        var maxLength = 0;
        column["eachCell"]({ includeEmpty: true }, function (cell) {
            var columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
        column.font = {
            name: 'Arial', size: 14
        }
        worksheet.getRow(1).font = { name: 'Arial', bold: true, size: 14 }
    });

    worksheet.addRows(data)
    const buffer = await workbook.xlsx.writeBuffer();
    await saveToGCP(BUCKET, outputExcel, buffer)
}

/* 
    Save file to GCP bucket
*/
async function saveToGCP(bucketName, fileName, data) {

    let fullPath = `${STORAGE_PATH}/${fileName}`

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fullPath)

    try {
        await file.save(data).then(() =>
            console.log(`⬆️  Uploaded file ${fileName} to ${bucketName} ⬆️`))
    } catch (error) {
        console.log(`Error saving file ${fileName} to ${bucketName}: ${error}`)
    }

}

async function scrape() {
    let url = 'https://books.toscrape.com/'
    let scrapedData = []
    let $ = await fetch(url)

    const as = $('a')

    const allLinks = as.map((i, link) => {
        return $(link).attr('href')
    }).get()

    for (var i = 0; i < allLinks.length; i++) {
        scrapedData.push({
            url: allLinks[i]
        })
    }

    await exportResults(scrapedData)

    return scrapedData
}

const app = {

    run: async () => {
        let results = await scrape()
        return results
    },


}

module.exports = app