import fs from 'fs/promises';
import { ConfigLine, parseConfigFile, idFromName } from './config_file.js';

export function getBaseDir(): string {
    let base_url = new URL('..', import.meta.url);
    return base_url.pathname;
}
export function getStoragePath(): string {
    return getBaseDir() + "storage/";
}

export async function getFileNameFromPath(path: string[]): Promise<string> {
    let game: string | null = path[0];
    let category: string | null = path[1];
    let level: string | null = path[2];
    let nth_string: string | null = path[3];
    if (!game || !category || !level) {
        throw { status: 400, error: "game, category and level must be specified" };
    }
    let files_info_buffer: Buffer;
    try {
        files_info_buffer = await fs.readFile(getStoragePath() + `${game}/${category}/${game}-${category}.txt`)
    } catch (e) {
        throw { status: 404, error: "Error while reading category informations (file probably missing)" }
    }
    let levels_info: ConfigLine[] = parseConfigFile(files_info_buffer.toString());

    let nth = 0;
    if (nth_string) {
        nth = Number(nth_string);
        if (Number.isNaN(nth)) {
            throw { status: 400, error: "Invalid level index: " + nth_string };
        }
    }
    let suffix: string = "";
    if (nth > 0) {
        suffix = '#' + nth.toString();
    }
    let level_id = idFromName(levels_info, level);
    if (level_id != null) {
        return `${game}/${category}/${levels_info[level_id].id}${suffix}`;
    } else {
        throw { status: 404, error: "Level not found: " + level };
    }
}

export async function getConfigInDir(path: string[]): Promise<ConfigLine[]> {
    let list: string[] = [];
    let path_str: string = "";
    let config_file_name: string = "";
    for (let path_elem of path) {
        path_str += path_elem + "/";
        config_file_name += path_elem + ".";
    }
    if (config_file_name !== '') {
        config_file_name += "txt";
    } else {
        config_file_name = "root.txt";
    }

    let info_buffer;
    try {
        info_buffer = await fs.readFile(getStoragePath() + path_str + config_file_name);
    } catch (e) {
        throw {
            status: 404,
            error: "Error while reading config (file probably missing): " + config_file_name,
        };
    }

    return parseConfigFile(info_buffer.toString());
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
