import express from "express";
import v1 from "./api/v1";
const app = express()

app.use('/', express.static('../client'))
app.use('/api/v1', v1);

/**
 * INITIALIZATION DATA BEFORE HERE
 */
app.listen(8080);
console.log('Listening on port 8080');