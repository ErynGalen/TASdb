# TAS database

A database for tas files.

## Usage
### Running
The server is built by `npm run build`.

The server is run with `npm run start`.
It exposes an HTTP interface at `http://localhost:7878/`.

### Requests
The database respond to requests with JSON data.

The possible `GET` requests are:
* `/file/<game>/<category>/<level>`: returns the file specified by game, category and level name.
`<level>` can be either a level name or a TAS file name.
* `/stats/<game>/<category>/<level?>` : if a level is specified, returns the stats of this level, otherwise returns an array with the stats for all levels in the specified category.

The possible `POST` requests are:


## Structure

The files are stored in `storage/<game>/<category>/`.
Each category folder contains a file `<game>-<category>.txt` listing the levels for the category.

This file has one line per TAS file and has the following format:

```
file_name, name1, name2
```
