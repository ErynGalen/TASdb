import * as http from 'http';
import * as fs from 'fs/promises'

import { parseTasFileList, makeTasFileList } from './parser.mjs';
import { join } from 'path';

const hostname = '127.0.0.1';
const port = 7878;

const server = http.createServer(requestHandler);

server.listen(port, hostname, function () {
    console.log(`Server running at http://${hostname}:${port}/`);
});

async function requestHandler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    switch (req.method) {
        case 'GET':
            handleGet(req, res);
            break;
        case 'POST':
            break;
        default:
            res.statusCode = 501;
            res.end(JSON.stringify({ error: "Only GET and POST methods are handled" }));
    }

    return;
}

function getStoragePath() {
    let base_url = new URL('.', import.meta.url);
    console.log(base_url.pathname + "storage/");
    return base_url.pathname + "storage/";
}

async function handleGet(req, res) {
    let req_url = new URL(req.url, `http://${req.headers.host}`);
    switch (req_url.pathname) {
        case '/file':
            let params = req_url.searchParams;
            let game = params.get("game");
            let category = params.get("category");
            let level = params.get("level");
            if (!game || !category || !level) {
                req.statusCode = 404;
                res.end(JSON.stringify({ error: "game, category and level must be specified" }));
                return;
            }
            let files_info;
            try {
                files_info = await fs.readFile(getStoragePath() + `${game}/${category}/${game}-${category}.txt`)
            } catch (e) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Error while reading informations (file probably missing): " + e }));
                return;
            }
            try {
                files_info = parseTasFileList(files_info.toString());
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Couldn't parse informations: " + e }));
                return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ files_temp: files_info }));
            return;
        default:
            res.statusCode = 404;
            res.end(JSON.stringify({ error: req_url.pathname + " isn't a valid request" }));
            return;
    }
}
