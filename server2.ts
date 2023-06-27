import * as http from 'http';
import * as fs from 'fs/promises'

import { parseTasFileList, FileInfo, levelIdInList } from './tas.js';

const hostname = '127.0.0.1';
const port = 7878;

const server = http.createServer(requestHandler);

server.listen(port, hostname, function () {
    console.log(`Server running at http://${hostname}:${port}/`);
});

async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
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

function getStoragePath(): string {
    let base_url = new URL('..', import.meta.url);
    return base_url.pathname + "storage/";
}

async function handleGet(req: http.IncomingMessage, res: http.ServerResponse) {
    let req_url: URL;
    if (req.url) {
        req_url = new URL(req.url, `http://${req.headers.host}`);
    } else {
        req_url = new URL("/", `http://${req.headers.host}`);
    }
    switch (req_url.pathname) {
        case '/file':
            let params: URLSearchParams = req_url.searchParams;
            let game: string | null = params.get("game");
            let category: string | null = params.get("category");
            let level: string | null = params.get("level");
            if (!game || !category) {
                req.statusCode = 404;
                res.end(JSON.stringify({ error: "game and category must be specified" }));
                return;
            }
            let files_info_buffer: Buffer;
            try {
                files_info_buffer = await fs.readFile(getStoragePath() + `${game}/${category}/${game}-${category}.txt`)
            } catch (e) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Error while reading informations (file probably missing): " + e }));
                return;
            }
            let files_info: FileInfo[];
            try {
                files_info = parseTasFileList(files_info_buffer.toString());
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Couldn't parse informations: " + e }));
                return;
            }
            if (!level) {
                res.statusCode = 200;
                res.end(JSON.stringify({ files: files_info }));
                return;
            }
            // query specific level
            let level_id = levelIdInList(files_info, level);
            if (level_id !== null) {
                res.statusCode = 200;
                res.end(JSON.stringify(files_info[level_id]));
                return;
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Level not found: " + level }));
                return;
            }
            return;
        default:
            res.statusCode = 418;
            res.end(JSON.stringify({ error: req_url.pathname + " isn't a valid request" }));
            return;
    }
}
