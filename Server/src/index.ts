import express from "express";
import { v1 } from "./api/v1";
import cors from 'cors';


const app = express()
app.use('/', express.static('../client'));

/**
 * INITIALIZATION DATA BEFORE HERE
 */
console.log("setting up api")
let apiv1: v1 = new v1(() => {
    //avoid setting up middleware and starting server until it's ready
    console.log('Setting up api middleware');
    app.use('/api/v1', cors<cors.CorsRequest>(), express.json(), apiv1.middleware);
    app.listen(8080);
    console.log('Listening on port 8080');
});