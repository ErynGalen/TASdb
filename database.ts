import fs from 'fs/promises';
import { LevelInfo, parseTasFileList, levelIdInList } from './tas.js';

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
    let levels_info: LevelInfo[] = parseTasFileList(files_info_buffer.toString());

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
    let level_id = levelIdInList(levels_info, level);
    if (level_id != null) {
        return `${game}/${category}/${levels_info[level_id].file}${suffix}`;
    } else {
        throw { status: 404, error: "Level not found: " + level };
    }
}
