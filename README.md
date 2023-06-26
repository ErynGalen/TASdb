# TAS database

A database for tas files.

## Usage
### Running
The database is run with `node server.js`.
It exposes an HTTP interface at `http://localhost:7878/`.

### Requests
The database respond to requests with JSON data.

The possible `GET` requests are:
* `/all`: returns a representation of all files in the database.
* `/file?game=<game>&category=<category>&file=<file name>`: returns the stats and content of the file specified by game, category and file name.

The possible `POST` requests are:
* `/file?game=<game>&category=<category>&file=<file name>`: sets the content of the specified TAS file. The game, category and level must already exist.

## Structure
The metadata are stored in `storage/db.toml`.

The files are stored in `storage/<game>/<category>/`.
