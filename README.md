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
* `/file?game=<game>&category=<category>&level=<level name>`: returns the stats and content of the file specified by game, category and level name.
If the level name isn't specified an array with all the levels in the category is returned.

The possible `POST` requests are:


## Structure

The files are stored in `storage/<game>/<category>/`.
Each category folder contains a file `<game>-<category>.txt` listing the levels for the category.

This file has one line per TAS file and has the following format:

```
file_name, name1, name2 = attrib1, attrib2, attrib3
```

After the `=` is a list of attributes, each having the following format:
```
key: value
```

