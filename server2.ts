import * as http from 'http';
import * as fs from 'fs/promises'

import { getStoragePath, getBaseDir, realPath } from './database.js'

const hostname = '127.0.0.1';
const port = 7878;

const server = http.createServer(requestHandler);

server.listen(port, function () {
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
        res.end("not found: " + file_name);
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
    let file_path: string[];
    try {
        file_path = await realPath(path);
    } catch (e: any) {
        if (e.status) {
            res.statusCode = e.status;
        } else {
            res.statusCode = 418;
        }
        res.end(JSON.stringify({ error: e.error }));
        return;
    }

    let file_content: string;
    try {
        file_content = (await fs.readFile(getStoragePath() + file_path.join('/'))).toString();
    } catch (e) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Error while reading level file (file probably missing): " + file_path.join('/') }));
        return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline; filename="' + file_path + '"');
    res.end(file_content);
    return;
}

async function getStats(res: http.ServerResponse, path: string[]) {
    res.statusCode = 200;
    res.end(JSON.stringify({ info: "No stats" }));
    return;
}
