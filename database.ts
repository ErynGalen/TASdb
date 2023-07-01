import fs from 'fs/promises';
import { ConfigLine, parseConfigFile, idFromName, makeConfigFile } from './config_file.js';

export function getBaseDir(): string {
    let base_url = new URL('..', import.meta.url);
    return base_url.pathname;
}
export function getStoragePath(): string {
    return getBaseDir() + "storage/";
}


export async function getConfigInDir(path: string[], create_if_needed: boolean = false): Promise<ConfigLine[]> {
    let path_str: string = path.join('/') + '/';
    let config_file_name: string = path.join('-') + '.txt';
    if (path.length == 0) {
        config_file_name = "root.txt";
    }

    let info_buffer;
    try {
        info_buffer = await fs.readFile(getStoragePath() + path_str + config_file_name);
    } catch (e) {
        try {
            if (create_if_needed) {
                await fs.mkdir(getStoragePath() + path_str, { recursive: true });
                await fs.writeFile(getStoragePath() + path_str + config_file_name, "\n");
                return [];
            }
        } catch (e) {
            console.error("Error while creating new directory with config: " + path_str + " (" + e + ")");
            throw {
                status: 500,
                error: "Error while creating new directory with config: " + path_str,
            }
        }
        throw {
            status: 404,
            error: "Error while reading config (file probably missing): " + config_file_name,
        };
    }

    return parseConfigFile(info_buffer.toString());
}

export async function writeConfigInDir(path: string[], config: ConfigLine[]) {
    let path_str: string = path.join('/') + '/';
    let config_file_name: string = path.join('-') + '.txt';
    if (path.length == 0) {
        config_file_name = "root.txt";
    }

    try {
        await fs.writeFile(getStoragePath() + path_str + config_file_name, makeConfigFile(config));
    } catch (e) {
        console.error("Error while writing config file: " + e)
        throw {
            status: 500,
            error: "Error while writing config file",
        };
    }
}

export async function realPath(virtual_path: string[]): Promise<string[]> {
    let real_path: string[] = [];
    let last_was_file = false;
    for (let virtual_elem of virtual_path) {
        if (last_was_file) {
            // copy raw elements after a file name is found
            real_path.push(virtual_elem);
            continue;
        }
        let current_config = await getConfigInDir(real_path);
        let next_id = idFromName(current_config, virtual_elem);
        if (next_id != null) {
            real_path.push(current_config[next_id].id);
            if (!current_config[next_id].is_directory) {
                last_was_file = true;
            }
        } else {
            throw { status: 404, error: "Not found: " + virtual_elem };
        }
    }
    return real_path;
}
