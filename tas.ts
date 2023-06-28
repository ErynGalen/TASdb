export type LevelInfo = {
    file: string,
    names: string[],
}

export function parseTasFileList(content: string): LevelInfo[] {
    let level_list: LevelInfo[] = [];
    for (let line of content.split('\n')) {
        let parsed_line = parseLine(line);
        if (parsed_line) {
            level_list.push(parsed_line);
        }
    }

    return level_list;
}
function parseLine(line: string): LevelInfo | null {
    let level_file: string = "";
    let level_names: string[] = [];

    let parser_in_names: boolean = false;
    let prev_name: string | null = null;

    for (let char of line.split('')) {
        if (char == ',') {
            if (!prev_name) {
                console.error("comma must be preceded with a string, got nothing (" + line + ")");
                return null;
            }
            if (parser_in_names) {
                level_names.push(prev_name);
            } else {
                level_file = prev_name;
                parser_in_names = true;
            }
            prev_name = null;
        } else if (char == ' ' || char == '\t') {
            // ignore whitespaces
        } else {
            if (prev_name) {
                prev_name += char;
            } else {
                prev_name = char;
            }
        }
    }
    if (prev_name) {
        if (parser_in_names) {
            level_names.push(prev_name);
        } else {
            level_file = prev_name;
            parser_in_names = true;
        }
    }
    if (level_file == "") {
        return null; // line was empty
    }
    level_names.push(level_file); // allow refering level by their file names;
    return { file: level_file, names: level_names };
}

export function makeTasFileList(levels_info: LevelInfo[]) {
    let list_str = "";
    for (let file of levels_info) {
        let file_name = file.file;
        let level_names = file.names;
        list_str += makeFileStr(file_name, level_names) + '\n';
    }
    return list_str;
}
function makeFileStr(file: string, names: string[]) {
    let ret = `${file}`;
    for (let name of names) {
        ret += ", " + name;
    }
    return ret;
}

export function levelIdInList(levels_info: LevelInfo[], level_name: string): number | null {
    let nth: number = 0;
    for (let file of levels_info) {
        for (let name of file.names) {
            if (name == level_name) {
                return nth;
            }
        }
        nth += 1;
    }
    return null;
}
