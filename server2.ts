import http from 'http';
import fs from 'fs/promises';
import mime from 'mime';

import { getStoragePath, getBaseDir, realPath, getConfigInDir, writeConfigInDir } from './database.js'
import { ConfigLine, idFromName } from './config_file.js';

const hostname = '0.0.0.0';
const port = Number(process.env.PORT);

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
            handlePost(req, res);
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
        case 'info':
            getInfo(res, path_parts.slice(1));
            return;
        default:
            serveWebFile(res, req_url);
            return;
    }
}

async function serveWebFile(res: http.ServerResponse, req_url: URL) {
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
        return;
    }

    let mime_type: string | null = mime.getType(file_name);
    if (!mime_type) {
        mime_type = 'application/octet-stream';
    }
    res.setHeader('Content-Type', mime_type);
    res.end(file);
    return;
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

async function getInfo(res: http.ServerResponse, path: string[]) {
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
    let config: ConfigLine[];
    try {
        config = await getConfigInDir(file_path);
    } catch (e: any) {
        if (e.status) {
            res.statusCode = e.status;
        } else {
            res.statusCode = 418;
        }
        res.end(JSON.stringify({ error: e.error }));
        return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(config));
}

async function handlePost(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.headers['Content-Type'] && req.headers['Content-Type'] != "text/plain") {
        res.statusCode = 415;
        res.end(JSON.stringify({ error: "Only plain text data is accepted, got " + req.headers['Content-Type'] }));
        return;
    }

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

    let body = "";
    req.on('data', data => { body += data; });
    req.on('end', () => {
        if (path_parts.length == 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "A target URL must be specified" }));
            return;
        }
        switch (path_parts[0]) {
            case 'file':
                postFile(path_parts.slice(1), res, body);
                return;
            default:
                res.statusCode = 405;
                res.end(JSON.stringify({ error: "Only /file/* can be POSTed to" }));
                return;
        }
    });
}

// push the file in the queue
async function postFile(virtual_path: string[], res: http.ServerResponse, data: string) {
    if (virtual_path.length != 3) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "A game, category and level name must be specified" }));
        return;
    }
    virtual_path[2] += '.d'; // queue directory assiciated with the level
    let real_path: string[];
    let queue_config: ConfigLine[];
    try {
        real_path = await realPath(virtual_path);
    } catch (e: any) {
        if (e.status) {
            res.statusCode = e.status;
        } else {
            res.statusCode = 418;
        }
        res.end(JSON.stringify({ error: e.error }));
        return;
    }
    try {
        // also creates the queue directory if it doesn't exist
        queue_config = await getConfigInDir(real_path, true);
    } catch (e: any) {
        if (e.status) {
            res.statusCode = e.status;
        } else {
            res.statusCode = 418;
        }
        res.end(JSON.stringify({ error: e.error }));
        return;
    }

    let first_free: number = 0;
    while (idFromName(queue_config, first_free.toString()) !== null) {
        first_free += 1;
    }

    queue_config.push({ id: first_free.toString(), is_directory: false, names: [] });
    writeConfigInDir(real_path, queue_config);

    real_path.push(first_free.toString());
    try {
        await fs.writeFile(getStoragePath() + real_path.join('/'), data);
    } catch (e) {
        console.error("Error while writing level file (" + real_path.join('/') + "): " + e);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Error while writing level file (" + real_path.join('/') + ")" }));
        return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ info: "Wrote " + real_path.join('/') }));
}
