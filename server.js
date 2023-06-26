const http = require('http');
const fs = require('fs');
const toml = require('toml');

const hostname = '127.0.0.1';
const port = 7878;

const server = http.createServer(requestHandler);

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

async function requestHandler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    fs.readFile(__dirname + "/storage/db.toml", 'utf-8', (err, content) => {
        if (err) {
            console.error(err);

            res.statusCode = 500;
            res.end(JSON.stringify({ error: err }));
            return;
        }
        dbRequest(req, res, content);
    });


}

async function dbRequest(req, res, db_file) {
    let database;
    try {
        database = toml.parse(db_file);
    } catch (e) {
        let message = "Error parsing database";
        console.error(message + " at (" + e.line + ":" + e.column + "): " + e.message);

        res.statusCode = 500;
        res.end(JSON.stringify({ error: message }));
        return;
    }

    res.statusCode = 200;
    let req_url = new URL(req.url, `http://${req.headers.host}`);

    switch (req_url.pathname) {
        case "/all":
            res.end(JSON.stringify(database));
            return;

        case "/file":
            let params = req_url.searchParams;
            let game = params.get("game");
            let category = params.get("category");
            let level = params.get("level");
            if (!game || !category || !level) {
                req.statusCode = 404;
                res.end(JSON.stringify({ error: "game, category and level must be specified" }));
                return;
            }

            let file_info = await dbGetFileInfo(database, game, category, level);
            if (file_info.error) {
                res.statusCode = 404;
                res.end(JSON.stringify(file_info));
                return;
            }

            let file_path = "/" + game + "/" + category + "/" + file_info.file

            fs.readFile(__dirname + "/storage" + file_path, (err, content) => {
                if (err) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: "Error when opening input file (the file is probably missing" }));
                    return;
                }
                res.end(JSON.stringify({
                    stats: file_info.stats,
                    content: content.toString(),
                }));
            })
            return;

        default:
            req.statusCode = 404;
            res.end(JSON.stringify({ error: "Invalid request: " + req_url.pathname }));
            return;
    }
}

async function dbGetFileInfo(db, game, category, level) {
    let game_data = db[game];
    if (!game_data) {
        return { error: "Game not found: " + game };
    }
    let category_data = game_data[category];
    if (!category_data) {
        return { error: "Category not found: " + category };
    }

    for (let level_id in category_data) {
        if (level_id == level) {
            return category_data[level_id];
        }
        let names = category_data[level_id].names;
        for (let nth_name in names) {
            if (names[nth_name] == level) {
                return category_data[level_id];
            }
        }
    }
    return { error: "Level not found: " + level };
}


