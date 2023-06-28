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
        serveWebFile(res, req_url);
        return;
    }

    switch (path_parts[0]) {
        case 'file':
            getFile(res, path_parts.slice(1));
            return;
        case 'stats':
            getStats(res, path_parts.slice(1));
            return;
        default:
            serveWebFile(res, req_url);
            return;
    }
}

// true on success
async function serveWebFile(res: http.ServerResponse, req_url: URL): Promise<boolean> {
    let file_name = req_url.pathname;
    if (file_name === '/' || file_name === '') {
        file_name = "/index.html";
    }

    let file;
    try {
        file = await fs.readFile(getBaseDir() + "/public" + file_name);
    }
    catch (e) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end("not found");
        return false;
    }

    if (file_name.endsWith(".html")) {
        res.setHeader('Content-Type', 'text/html');
    } else if (file_name.endsWith(".css")) {
        res.setHeader('Content-Type', 'text/css');
    } else {
        console.error("Unsupported file type: " + file_name);
        res.setHeader('Content-Type', 'text/plain');
    }
    res.end(file.toString());
    return true;
}

async function getFile(res: http.ServerResponse, path: string[]) {
    let game: string | null = path[0];
    let category: string | null = path[1];
    let level: string | null = path[2];
    if (!game || !category || !level) {
        res.statusCode = 400;
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

async function getStats(res: http.ServerResponse, path: string[]) {
    let game: string | null = path[0];
    let category: string | null = path[1];
    let level: string | null = path[2];
    if (!game || !category) {
        res.statusCode = 400;
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
