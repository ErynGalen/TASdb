import * as http from 'http';
import * as fs from 'fs/promises'

import { parseTasFileList, LevelInfo, levelIdInList } from './tas.js';

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

function getBaseDir(): string {
    let base_url = new URL('..', import.meta.url);
    return base_url.pathname;
}
function getStoragePath(): string {
    return getBaseDir() + "storage/";
}

async function handleGet(req: http.IncomingMessage, res: http.ServerResponse) {
    let req_url: URL;
    try {
        if (req.url) {
            req_url = new URL(req.url, `http://${req.headers.host}`);
        } else {
            req_url = new URL("/", `http://${req.headers.host}`);
        }
    } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid URL: " + req.url }));
        return;
    }
    let raw_path_parts: string[] = req_url.pathname.split('/');
    let path_parts: string[] = [];
    for (let part of raw_path_parts) {
        if (part != '') {
            path_parts.push(part);
        }
    }
    if (path_parts.length == 0) {
        let index_html;
        try {
            index_html = await fs.readFile(getBaseDir() + "/public/index.html");
        }
        catch (e) {
            req.statusCode = 500;
            res.end(JSON.stringify({ error: "cannot open index file" }));
            return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.end(index_html.toString());
        return;
    }

    switch (path_parts[0]) {
        case 'file':
            getFile(req, res, path_parts.slice(1));
            return;
        case 'stats':
            getStats(req, res, path_parts.slice(1));
            return;
        default:
            res.statusCode = 418;
            res.end(JSON.stringify({ error: req_url.pathname + " isn't a valid request" }));
            return;
    }
}
async function getFile(req: http.IncomingMessage, res: http.ServerResponse, path: string[]) {
    let game: string | null = path[0];
    let category: string | null = path[1];
    let level: string | null = path[2];
    if (!game || !category || !level) {
        req.statusCode = 400;
        res.end(JSON.stringify({ error: "game, category and level must be specified" }));
        return;
    }
    let files_info_buffer: Buffer;
    try {
        files_info_buffer = await fs.readFile(getStoragePath() + `${game}/${category}/${game}-${category}.txt`)
    } catch (e) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Error while reading category informations (file probably missing)" }));
        return;
    }
    let levels_info: LevelInfo[] = parseTasFileList(files_info_buffer.toString());

    let level_id = levelIdInList(levels_info, level);
    if (level_id !== null) {
        let file_content: string;
        try {
            file_content = (await fs.readFile(getStoragePath() + `${game}/${category}/${levels_info[level_id].file}`)).toString();
        } catch (e) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Error while reading level file (file probably missing)" }));
            return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'inline; filename="' + levels_info[level_id].file + '"');
        res.end(file_content);
        return;
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Level not found: " + level }));
        return;
    }
}

async function getStats(req: http.IncomingMessage, res: http.ServerResponse, path: string[]) {
    let game: string | null = path[0];
    let category: string | null = path[1];
    let level: string | null = path[2];
    if (!game || !category) {
        req.statusCode = 400;
        res.end(JSON.stringify({ error: "game and category must be specified" }));
        return;
    }
    let files_info_buffer: Buffer;
    try {
        files_info_buffer = await fs.readFile(getStoragePath() + `${game}/${category}/${game}-${category}.txt`)
    } catch (e) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Error while reading category informations (file probably missing)" }));
        return;
    }
    let levels_info: LevelInfo[] = parseTasFileList(files_info_buffer.toString());

    if (level) {
        let level_id = levelIdInList(levels_info, level);
        if (level_id !== null) {
            res.statusCode = 200;
            res.end(JSON.stringify(levels_info[level_id]));
            return;
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Level not found: " + level }));
            return;
        }
    } else {
        res.statusCode = 200;
        res.end(JSON.stringify(levels_info));
        return;
    }
}
