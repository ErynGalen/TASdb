# TAS database

A database for tas files.

## Usage
### Running
The server is built by `npm run build`.

The server is run with `npm run start`.
It exposes an HTTP interface at `http://localhost:80/`.

### Requests
The database respond to requests with JSON data.

The possible `GET` requests are:
* `/file/<game>/<category>/<level>`: returns the file specified by game, category and level name.
* `/file/<game>/<category>/<level>.d/<n>`: returns the n-th file in the queue for the specified level.

The possible `POST` requests are:


## Structure

The files are stored in `storage/<game>/<category>/`.
Each folder contains a file `<path>.<to>.<folder>.txt` listing the levels for the category. For example the Any% folder for Celeste, located in `storage/classic/any/` contains the file `classic.any.txt` listing the levels in this category.

This file has one line per TAS file and has the following format:

```
file_name, name1, name2
```
